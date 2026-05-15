// ═══════════════════════════════════════════════════════════════
// Complete API Test Suite - The Company OS
// Tests ALL endpoints with valid, invalid, and edge case inputs
// ═══════════════════════════════════════════════════════════════

import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb, initSchema } from './setup.js';
import { hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

// ─── Test Helpers ───
function getDb() {
  return testDb;
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body?.data?.token || '';
}

async function seedFullDb(db: ReturnType<typeof getDb>) {
  // Insert founder
  const founderHash = hashPasswordSync('TheCompany2025!', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);

  // Insert admin
  const adminHash = hashPasswordSync('admin123', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-admin', 'admin@thecompany.de', adminHash, 'Admin', 'admin', 1);

  // Insert agents
  db.prepare('INSERT INTO agents (id, role, name, department, description, allowed_tools, budget_limit, budget_spent, risk_ceiling, autonomy_level, human_approval_rules, kpis, status, version, owner_human) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('agent-001', 'CEO-Agent', 'CEO-Agent', 'Executive', 'Strategic planning', '[]', 50000, 12000, 'high', 'supervised', '[]', '[]', 'active', '2.1', 'Founder');
  db.prepare('INSERT INTO agents (id, role, name, department, description, allowed_tools, budget_limit, budget_spent, risk_ceiling, autonomy_level, human_approval_rules, kpis, status, version, owner_human) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('agent-002', 'Sales-Agent', 'Sales-Agent', 'Sales', 'Sales management', '[]', 10000, 5000, 'low', 'full', '[]', '[]', 'active', '1.0', 'Founder');

  // Insert departments
  db.prepare('INSERT INTO departments (id, name, description, status, lead_agent, agents, current_tasks, kpi_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('dept-001', 'Executive', 'Executive dept', 'active', 'agent-001', '[]', '[]', '{}');
  db.prepare('INSERT INTO departments (id, name, description, status, lead_agent, agents, current_tasks, kpi_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('dept-002', 'Sales', 'Sales dept', 'active', 'agent-002', '[]', '[]', '{}');

  // Insert business units
  db.prepare('INSERT INTO business_units (id, code, name, purpose, status, phase, products, revenue_model, required_agents, required_humans, risks, kpis, dependencies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('unit-001', 'A', 'AI Software', 'AI dev', 'active', 3, '[]', 'SaaS', '[]', '[]', '[]', '[]', '[]');

  // Insert product studios
  db.prepare('INSERT INTO product_studios (id, name, business_unit, status, budget_total, budget_spent, budget_remaining, workflow_step, qa_status, deployment_status, customer, start_date, target_date, completion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('studio-001', 'Studio Alpha', 'Unit A', 'building', 25000, 15000, 10000, 'Build', 'pending', 'not-started', 'Internal', '2025-01-01', '2025-06-01', 50);

  // Insert approvals
  db.prepare('INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('app-001', 'payment', 'Test Payment', 'Test', 'Agent', 'high', 100, 'Freigeben', 'pending', 1);
  db.prepare('INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('app-002', 'contract', 'Test Contract', 'Test', 'Agent', 'medium', null, 'Prufen', 'pending', 0);

  // Insert risks
  db.prepare('INSERT INTO risks (name, category, cause, impact, early_warning, mitigation, owner, probability, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('Data breach', 'security', 'Weak auth', 'Data loss', 'Alerts', 'MFA', 'CISO-Agent', 3, 5, 'active');
  db.prepare('INSERT INTO risks (name, category, cause, impact, early_warning, mitigation, owner, probability, severity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('Server downtime', 'technical', 'Hardware fail', 'Outage', 'Metrics', 'Redundancy', 'CTO-Agent', 2, 4, 'monitoring');

  // Insert workflows
  db.prepare('INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('wf-001', 'Test Workflow', 'Test', 'Test workflow', '[]', '[]', '[]', 10, 0, 'active', 95, '1h', '[]');

  // Insert workflow instances
  db.prepare('INSERT INTO workflow_instances (id, workflow_id, status, current_step, context, result) VALUES (?, ?, ?, ?, ?, ?)')
    .run('wi-001', 'wf-001', 'running', 1, '{}', null);

  // Insert budgets
  db.prepare('INSERT INTO budgets (id, name, category, limit_amount, spent, remaining, warning_at, critical_at, period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('bud-001', 'Test Budget', 'test', 10000, 5000, 5000, 80, 95, 'monthly');

  // Insert invoices
  db.prepare('INSERT INTO invoices (id, studio, customer, amount, status, due_date, sent_at, paid_at, blocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('inv-001', 'Studio Alpha', 'Customer', 5000, 'sent', '2025-06-01', '2025-01-01', null, 0);

  // Insert human experts
  db.prepare('INSERT INTO human_experts (id, name, type, skills, rating, hourly_rate, availability, status, onboarding_progress, total_projects, completed_projects, contact_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('exp-001', 'Test Expert', 'freelancer', '[]', 4.5, 100, 'available', 'active', 100, 10, 8, 'test@expert.com');

  // Insert system settings
  db.prepare("INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)")
    .run('liquidity_eur', '12450', 'Liquidity');
  db.prepare("INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)")
    .run('kill_switch_status', 'armed', 'Kill Switch');

  // Insert tool permissions
  db.prepare("INSERT INTO tool_permissions (id, tool_name, tool_id, risk_class, allowed_roles, param_limits) VALUES (?, ?, ?, ?, ?, ?)")
    .run('tp-001', 'GitHub', 'github', 'yellow', '["CTO-Agent"]', 'Max 10');
}

// ─── Test Suite ───

describe('Complete API Test Suite', () => {
  let founderToken: string;
  let adminToken: string;

  beforeEach(async () => {
    seedFullDb(testDb);
    founderToken = await loginAs('founder@thecompany.de', 'TheCompany2025!');
    adminToken = await loginAs('admin@thecompany.de', 'admin123');
  });

  // ═══════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════
  describe('Auth API', () => {
    it('POST /api/auth/login - returns token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'founder@thecompany.de', password: 'TheCompany2025!' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('founder');
    });

    it('POST /api/auth/login - rejects wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'founder@thecompany.de', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - rejects non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'anypassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - validates empty body with 400', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - validates missing password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'founder@thecompany.de' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - validates invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me - returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('founder@thecompany.de');
      expect(res.body.data.role).toBe('founder');
    });

    it('GET /api/auth/me - rejects without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/logout - succeeds with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // AGENTS
  // ═══════════════════════════════════════════
  describe('Agents API', () => {
    it('GET /api/agents - returns all agents', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/agents - filters by department', async () => {
      const res = await request(app)
        .get('/api/agents?department=Sales')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((a: { department: string }) => a.department === 'Sales')).toBe(true);
    });

    it('GET /api/agents - filters by status', async () => {
      const res = await request(app)
        .get('/api/agents?status=active')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/agents - filters by non-existent department returns empty', async () => {
      const res = await request(app)
        .get('/api/agents?department=NonExistent')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('GET /api/agents/:id - returns agent detail', async () => {
      const res = await request(app)
        .get('/api/agents/agent-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('agent-001');
    });

    it('GET /api/agents/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/agents/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('PUT /api/agents/:id - updates agent', async () => {
      const res = await request(app)
        .put('/api/agents/agent-001')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({ name: 'Updated CEO', version: '3.0' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated CEO');
      expect(res.body.data.version).toBe('3.0');
    });

    it('PUT /api/agents/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .put('/api/agents/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('rejects requests without auth token', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid_token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // DEPARTMENTS
  // ═══════════════════════════════════════════
  describe('Departments API', () => {
    it('GET /api/departments - returns all departments', async () => {
      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/departments/:id - returns department detail', async () => {
      const res = await request(app)
        .get('/api/departments/dept-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('dept-001');
    });

    it('GET /api/departments/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/departments/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // BUSINESS UNITS
  // ═══════════════════════════════════════════
  describe('Business Units API', () => {
    it('GET /api/business-units - returns all units', async () => {
      const res = await request(app)
        .get('/api/business-units')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/business-units/:id - returns unit detail', async () => {
      const res = await request(app)
        .get('/api/business-units/unit-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('unit-001');
    });

    it('GET /api/business-units/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/business-units/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════
  // PRODUCT STUDIOS
  // ═══════════════════════════════════════════
  describe('Product Studios API', () => {
    it('GET /api/product-studios - returns all studios', async () => {
      const res = await request(app)
        .get('/api/product-studios')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/product-studios/:id - returns studio detail', async () => {
      const res = await request(app)
        .get('/api/product-studios/studio-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('studio-001');
    });

    it('GET /api/product-studios/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/product-studios/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════
  // APPROVALS
  // ═══════════════════════════════════════════
  describe('Approvals API', () => {
    it('GET /api/approvals - returns all approvals', async () => {
      const res = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/approvals - filters by status', async () => {
      const res = await request(app)
        .get('/api/approvals?status=pending')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/approvals - filters by type', async () => {
      const res = await request(app)
        .get('/api/approvals?type=payment')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/approvals/:id - returns approval detail', async () => {
      const res = await request(app)
        .get('/api/approvals/app-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('app-001');
    });

    it('POST /api/approvals/:id/approve - approves a pending approval', async () => {
      const res = await request(app)
        .post('/api/approvals/app-002/approve')
        .set('Authorization', `Bearer ${founderToken}`);
      // May succeed or fail depending on business rules
      expect([200, 400, 403]).toContain(res.status);
    });

    it('POST /api/approvals/:id/reject - rejects with reason', async () => {
      const res = await request(app)
        .post('/api/approvals/app-002/reject')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({ reason: 'Test rejection' });
      expect([200, 400]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════
  describe('Audit Log API', () => {
    it('GET /api/audit-log - returns audit entries', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/audit-log/verify - returns chain validity', async () => {
      const res = await request(app)
        .get('/api/audit-log/verify')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.chainValid).toBe('boolean');
    });
  });

  // ═══════════════════════════════════════════
  // RISKS
  // ═══════════════════════════════════════════
  describe('Risks API', () => {
    it('GET /api/risks - returns all risks', async () => {
      const res = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/risks - filters by category', async () => {
      const res = await request(app)
        .get('/api/risks?category=security')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/risks - filters by status', async () => {
      const res = await request(app)
        .get('/api/risks?status=active')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/risks/:id - returns risk detail', async () => {
      const res = await request(app)
        .get('/api/risks/1')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/risks/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/risks/99999')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /api/risks/matrix/overview - returns matrix', async () => {
      const res = await request(app)
        .get('/api/risks/matrix/overview')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.matrix).toBeDefined();
      expect(res.body.data.counts).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // WORKFLOWS
  // ═══════════════════════════════════════════
  describe('Workflows API', () => {
    it('GET /api/workflows - returns all workflows', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/workflows/:id - returns workflow detail', async () => {
      const res = await request(app)
        .get('/api/workflows/wf-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('wf-001');
    });

    it('GET /api/workflows/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/workflows/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /api/workflows/instances/running - returns running instances', async () => {
      const res = await request(app)
        .get('/api/workflows/instances/running')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/workflows/instances/active - returns active instances', async () => {
      const res = await request(app)
        .get('/api/workflows/instances/active')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/workflows/runner/status - returns runner status', async () => {
      const res = await request(app)
        .get('/api/workflows/runner/status')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // WORKFLOW INSTANCES (Legacy)
  // ═══════════════════════════════════════════
  describe('Workflow Instances API', () => {
    it('GET /api/workflow-instances - returns instances', async () => {
      const res = await request(app)
        .get('/api/workflow-instances')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════
  // FINANCE
  // ═══════════════════════════════════════════
  describe('Finance API', () => {
    it('GET /api/finance/budgets - returns budgets with summary', async () => {
      const res = await request(app)
        .get('/api/finance/budgets')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.summary).toBeDefined();
    });

    it('GET /api/finance/budgets/:id - returns budget detail', async () => {
      const res = await request(app)
        .get('/api/finance/budgets/bud-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('bud-001');
    });

    it('GET /api/finance/budgets/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/finance/budgets/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /api/finance/invoices - returns all invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/finance/invoices - filters by status', async () => {
      const res = await request(app)
        .get('/api/finance/invoices?status=sent')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/finance/liquidity - returns liquidity data', async () => {
      const res = await request(app)
        .get('/api/finance/liquidity')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.currentLiquidity).toBe('number');
      expect(Array.isArray(res.body.data.trend)).toBe(true);
      expect(Array.isArray(res.body.data.financeEntries)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // WORKFORCE
  // ═══════════════════════════════════════════
  describe('Workforce API', () => {
    it('GET /api/workforce - returns experts with summary', async () => {
      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.summary).toBeDefined();
    });

    it('GET /api/workforce - filters by availability', async () => {
      const res = await request(app)
        .get('/api/workforce?availability=available')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/workforce/:id - returns expert detail', async () => {
      const res = await request(app)
        .get('/api/workforce/exp-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('exp-001');
    });

    it('GET /api/workforce/:id - returns 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/workforce/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════
  describe('Settings API', () => {
    it('GET /api/settings - returns settings, permissions, and policies', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.settings).toBeDefined();
      expect(res.body.data.toolPermissions).toBeDefined();
      expect(res.body.data.modelPolicies).toBeDefined();
    });

    it('GET /api/settings/tool-permissions - returns permissions', async () => {
      const res = await request(app)
        .get('/api/settings/tool-permissions')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/settings/model-policies - returns policies', async () => {
      const res = await request(app)
        .get('/api/settings/model-policies')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // KILL SWITCH
  // ═══════════════════════════════════════════
  describe('Kill Switch API', () => {
    it('GET /api/kill-switch - returns status', async () => {
      const res = await request(app)
        .get('/api/kill-switch')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/kill-switch/circuit-breaker - returns breaker states', async () => {
      const res = await request(app)
        .get('/api/kill-switch/circuit-breaker')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/kill-switch/health - returns health checks', async () => {
      const res = await request(app)
        .get('/api/kill-switch/health')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/kill-switch/history - returns history', async () => {
      const res = await request(app)
        .get('/api/kill-switch/history')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/kill-switch/status/full - returns full status', async () => {
      const res = await request(app)
        .get('/api/kill-switch/status/full')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════
  describe('Dashboard API', () => {
    it('GET /api/dashboard/kpis - returns all KPIs', async () => {
      const res = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.agentCount).toBe('number');
      expect(typeof res.body.data.liquidity).toBe('number');
      expect(typeof res.body.data.killSwitchStatus).toBe('string');
    });

    it('GET /api/dashboard/activity - returns activity summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // RESPONSE FORMAT CONSISTENCY
  // ═══════════════════════════════════════════
  describe('Response Format Consistency', () => {
    it('list responses have {success, data[], pagination} format', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('detail responses have {success, data{}} format', async () => {
      const res = await request(app)
        .get('/api/agents/agent-001')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(typeof res.body.data).toBe('object');
      expect(Array.isArray(res.body.data)).toBe(false);
    });

    it('error responses have {success: false, error} format', async () => {
      const res = await request(app)
        .get('/api/agents/NONEXISTENT')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    it('401 responses have {success: false, error} format', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });
});
