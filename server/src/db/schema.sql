-- ═══════════════════════════════════════════════════════════════
-- The Company OS - SQLite Database Schema
-- ═══════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Users (Auth) ───
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'founder',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Sessions ───
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Agents ───
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  allowed_tools TEXT,
  budget_limit INTEGER DEFAULT 0,
  budget_spent INTEGER DEFAULT 0,
  risk_ceiling TEXT DEFAULT 'low',
  autonomy_level TEXT DEFAULT 'approval-required',
  human_approval_rules TEXT,
  kpis TEXT,
  status TEXT DEFAULT 'active',
  version TEXT DEFAULT '1.0.0',
  owner_human TEXT NOT NULL,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Departments ───
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  lead_agent TEXT,
  agents TEXT,
  current_tasks TEXT,
  kpi_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Business Units ───
CREATE TABLE IF NOT EXISTS business_units (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'parked',
  phase INTEGER DEFAULT 0,
  products TEXT,
  revenue_model TEXT,
  required_agents TEXT,
  required_humans TEXT,
  risks TEXT,
  kpis TEXT,
  dependencies TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Product Studios ───
CREATE TABLE IF NOT EXISTS product_studios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_unit TEXT,
  status TEXT DEFAULT 'planning',
  budget_total INTEGER DEFAULT 0,
  budget_spent INTEGER DEFAULT 0,
  budget_remaining INTEGER DEFAULT 0,
  workflow_step TEXT,
  qa_status TEXT DEFAULT 'pending',
  deployment_status TEXT DEFAULT 'not-started',
  customer TEXT,
  start_date TEXT,
  target_date TEXT,
  completion INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Approvals ───
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requester TEXT NOT NULL,
  risk_level TEXT DEFAULT 'low',
  amount INTEGER,
  recommendation TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at DATETIME,
  red_line INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Audit Log (append-only!) ───
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  tool TEXT,
  input TEXT,
  output TEXT,
  risk_score INTEGER DEFAULT 0,
  project TEXT,
  approved_by TEXT,
  hash TEXT NOT NULL,
  previous_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Risks ───
CREATE TABLE IF NOT EXISTS risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cause TEXT,
  impact TEXT,
  early_warning TEXT,
  mitigation TEXT,
  owner TEXT,
  probability INTEGER DEFAULT 1,
  severity INTEGER DEFAULT 1,
  score INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Incidents ───
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  severity INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  affected_agents TEXT,
  mitigation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Workflows ───
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  responsible_agents TEXT,
  inputs TEXT,
  outputs TEXT,
  risk_score INTEGER DEFAULT 0,
  requires_approval INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  success_rate INTEGER DEFAULT 0,
  avg_duration TEXT,
  steps TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Workflow Instances ───
CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  status TEXT DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  context TEXT,
  result TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Human Experts ───
CREATE TABLE IF NOT EXISTS human_experts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'freelancer',
  skills TEXT,
  rating REAL DEFAULT 0,
  hourly_rate INTEGER DEFAULT 0,
  availability TEXT DEFAULT 'available',
  status TEXT DEFAULT 'active',
  onboarding_progress INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  contact_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Budgets ───
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  limit_amount INTEGER DEFAULT 0,
  spent INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  warning_at INTEGER DEFAULT 70,
  critical_at INTEGER DEFAULT 90,
  period TEXT DEFAULT 'monthly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Invoices ───
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  studio TEXT,
  customer TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',
  due_date TEXT,
  sent_at DATETIME,
  paid_at DATETIME,
  blocked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── System Settings ───
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Kill Switch Log ───
CREATE TABLE IF NOT EXISTS kill_switch_log (
  id TEXT PRIMARY KEY,
  level INTEGER NOT NULL,
  triggered_by TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'active',
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- ─── Tool Permissions ───
CREATE TABLE IF NOT EXISTS tool_permissions (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  risk_class TEXT DEFAULT 'green',
  allowed_roles TEXT,
  param_limits TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Model Policies ───
CREATE TABLE IF NOT EXISTS model_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- RUN-005: Kill Switch + Circuit Breaker Tables
-- ═══════════════════════════════════════════════════════════════

-- ─── Circuit Breakers ───
CREATE TABLE IF NOT EXISTS circuit_breakers (
  agent_id TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed',
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_at DATETIME,
  last_success_at DATETIME,
  opened_at DATETIME,
  half_open_at DATETIME,
  config TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Quarantine Log ───
CREATE TABLE IF NOT EXISTS quarantine_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  lifted_at DATETIME,
  lifted_by TEXT,
  status TEXT DEFAULT 'active'
);

-- ─── Stopped Workflows ───
CREATE TABLE IF NOT EXISTS stopped_workflows (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  unit_id TEXT,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  stopped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resumed_at DATETIME,
  resumed_by TEXT,
  status TEXT DEFAULT 'stopped'
);

-- ─── Health Checks ───
CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER,
  error_rate REAL,
  throughput INTEGER,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Post-Mortem Reports ───
CREATE TABLE IF NOT EXISTS post_mortem_reports (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  root_cause TEXT,
  affected_agents TEXT,
  affected_workflows TEXT,
  actions_taken TEXT,
  lessons_learned TEXT,
  recommendations TEXT,
  prevention_measures TEXT,
  recovery_duration_ms INTEGER
);

-- ═══════════════════════════════════════════════════════════════
-- Performance Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_risk_ceiling ON agents(risk_ceiling);

CREATE INDEX IF NOT EXISTS idx_risks_score ON risks(score);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
CREATE INDEX IF NOT EXISTS idx_approvals_requester ON approvals(requester);
CREATE INDEX IF NOT EXISTS idx_approvals_red_line ON approvals(red_line);

CREATE INDEX IF NOT EXISTS idx_audit_log_agent ON audit_log(agent);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_project ON audit_log(project);
CREATE INDEX IF NOT EXISTS idx_audit_log_risk_score ON audit_log(risk_score);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_business_units_status ON business_units(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_human_experts_status ON human_experts(status);
CREATE INDEX IF NOT EXISTS idx_human_experts_availability ON human_experts(availability);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_kill_switch_log_status ON kill_switch_log(status);
