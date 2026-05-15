-- ╔═══════════════════════════════════════════════════════════════╗
-- ║   The Company OS - Tenant Database Schema                     ║
-- ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ───────────────────────────────────────────────
-- Core Tenant Table
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter', 'professional', 'enterprise')),
  branding        TEXT NOT NULL DEFAULT '{}',   -- JSON: TenantBranding
  config          TEXT NOT NULL DEFAULT '{}',   -- JSON: TenantConfig
  limits          TEXT NOT NULL DEFAULT '{}',   -- JSON: TenantLimits
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_created ON tenants(created_at);

-- Custom domain index (for white-label)
-- Note: We extract custom_domain via a generated/virtual column or query JSON
-- For SQLite, we can query JSON or add a separate column

-- ───────────────────────────────────────────────
-- Custom Domain Mapping
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_domains (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain          TEXT UNIQUE NOT NULL,
  is_primary      INTEGER DEFAULT 0,  -- Boolean: 0 or 1
  ssl_enabled     INTEGER DEFAULT 0,  -- Boolean: 0 or 1
  verified_at     DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains(tenant_id);

-- ───────────────────────────────────────────────
-- Tenant Users (Admin/Members)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_users (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  avatar_url      TEXT,
  last_login_at   DATETIME,
  is_active       INTEGER DEFAULT 1,  -- Boolean
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);

-- ───────────────────────────────────────────────
-- Add tenant_id to ALL existing tables
-- ───────────────────────────────────────────────

-- Agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);

-- Workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id);

-- Executions table
ALTER TABLE executions ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_executions_tenant ON executions(tenant_id);

-- Messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);

-- Files / Storage table
ALTER TABLE files ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_files_tenant ON files(tenant_id);

-- Integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- API Keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- ───────────────────────────────────────────────
-- Billing / Subscription Records
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_records (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                  TEXT NOT NULL,
  amount                INTEGER NOT NULL,        -- Amount in smallest currency unit (cents)
  currency              TEXT NOT NULL DEFAULT 'EUR',
  period                TEXT NOT NULL,           -- e.g., "2026-01"
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id     TEXT,
  paid_at               DATETIME,
  due_date              DATETIME,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant ON billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_period ON billing_records(period);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_records(status);

-- ───────────────────────────────────────────────
-- Usage Tracking (for limit enforcement)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_records (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL
                  CHECK (resource_type IN ('agents', 'users', 'workflows', 'storage', 'api_calls', 'budget')),
  amount_used     INTEGER NOT NULL DEFAULT 0,
  period          TEXT NOT NULL,     -- e.g., "2026-01" for monthly tracking
  recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, resource_type, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_records(period);

-- ───────────────────────────────────────────────
-- Audit Log (for compliance)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         TEXT,
  action          TEXT NOT NULL,     -- e.g., "tenant.created", "tenant.updated"
  entity_type     TEXT NOT NULL,     -- e.g., "tenant", "user", "workflow"
  entity_id       TEXT,
  old_values      TEXT,              -- JSON: previous state
  new_values      TEXT,              -- JSON: new state
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ───────────────────────────────────────────────
-- Onboarding Tracking
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id              TEXT PRIMARY KEY,
  session_token   TEXT UNIQUE NOT NULL,
  company_name    TEXT NOT NULL,
  slug            TEXT NOT NULL,
  email           TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'starter',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'expired', 'abandoned')),
  completed_at    DATETIME,
  expires_at      DATETIME NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_token ON onboarding_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_slug ON onboarding_sessions(slug);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions(status);

-- ───────────────────────────────────────────────
-- Plan Change History
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_history (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_plan        TEXT NOT NULL,
  new_plan        TEXT NOT NULL,
  changed_by      TEXT,              -- user_id who initiated
  reason          TEXT,
  effective_date  DATETIME NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_history_tenant ON plan_history(tenant_id);

-- ───────────────────────────────────────────────
-- Migration: Set tenant_id for existing data
-- ───────────────────────────────────────────────

-- If migrating from single-tenant, assign all existing data to a default tenant
-- UPDATE agents SET tenant_id = 'DEFAULT_TENANT_ID' WHERE tenant_id IS NULL;
-- UPDATE workflows SET tenant_id = 'DEFAULT_TENANT_ID' WHERE tenant_id IS NULL;
-- UPDATE executions SET tenant_id = 'DEFAULT_TENANT_ID' WHERE tenant_id IS NULL;

-- ───────────────────────────────────────────────
-- Views
-- ───────────────────────────────────────────────

-- Active tenants with their usage summary
CREATE VIEW IF NOT EXISTS v_tenant_overview AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.status,
  t.plan,
  t.expires_at,
  tu.user_count,
  COALESCE(ur_api.amount_used, 0) AS api_calls_this_period
FROM tenants t
LEFT JOIN (
  SELECT tenant_id, COUNT(*) AS user_count FROM tenant_users GROUP BY tenant_id
) tu ON t.id = tu.tenant_id
LEFT JOIN usage_records ur_api ON t.id = ur_api.tenant_id
  AND ur_api.resource_type = 'api_calls'
  AND ur_api.period = strftime('%Y-%m', 'now')
WHERE t.status IN ('active', 'trial');

-- ───────────────────────────────────────────────
-- Triggers for updated_at
-- ───────────────────────────────────────────────

CREATE TRIGGER IF NOT EXISTS tr_tenants_updated
AFTER UPDATE ON tenants
BEGIN
  UPDATE tenants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tr_tenant_users_updated
AFTER UPDATE ON tenant_users
BEGIN
  UPDATE tenant_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
