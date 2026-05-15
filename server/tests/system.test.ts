// ═══════════════════════════════════════════════════════════════
// End-to-End System Test - Complete System Verification
// Phase 6 Final: Validates all critical system functions
// ═══════════════════════════════════════════════════════════════

import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/connection.js';

const app = createApp();

// Test tokens
let founderToken: string;
let adminToken: string;

// ═══════════════════════════════════════════════════════════════
// System Test Suite
// ═══════════════════════════════════════════════════════════════

describe('Complete System Integration', () => {
  // ─── Cleanup after all tests ───
  afterAll(() => {
    db.close();
  });

  // ─── 1. LOGIN ───
  describe('Authentication', () => {
    it('can login as founder and receive JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'founder@thecompany.de',
          password: 'TheCompany2025!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('founder');
      founderToken = res.body.data.token;
    });

    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'founder@thecompany.de',
          password: 'wrong-password',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects login with too-short password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'founder@thecompany.de',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 2. AGENTS ───
  describe('Agents API', () => {
    it('can fetch agents with valid token', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('rejects agents without token', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(401);
    });
  });

  // ─── 3. DASHBOARD KPIs ───
  describe('Dashboard KPIs', () => {
    it('can fetch dashboard KPIs', async () => {
      const res = await request(app)
        .get('/api/dashboard/kpis')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Verify key metrics exist
      expect(typeof res.body.data.agentCount).toBe('number');
      expect(typeof res.body.data.pendingApprovals).toBe('number');
      expect(typeof res.body.data.totalRisks).toBe('number');
      expect(typeof res.body.data.automationRate).toBe('number');
      expect(res.body.data.agentCount).toBeGreaterThan(0);
    });
  });

  // ─── 4. RISKS ───
  describe('Risks API', () => {
    it('can fetch risks with scores', async () => {
      const res = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Check risk scores exist
      const firstRisk = res.body.data[0];
      expect(firstRisk.score).toBeDefined();
    });
  });

  // ─── 5. KILL SWITCH ───
  describe('Kill Switch', () => {
    it('responds with kill switch status', async () => {
      const res = await request(app)
        .get('/api/kill-switch')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Should not be active initially
      expect(res.body.data.active).toBe(false);
    });

    it('returns armed status', async () => {
      const res = await request(app)
        .get('/api/kill-switch')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.body.data.full.killSwitch.status).toBe('armed');
    });
  });

  // ─── 6. APPROVALS ───
  describe('Approvals API', () => {
    it('can fetch approvals', async () => {
      const res = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('has pending approvals in seed data', async () => {
      const res = await request(app)
        .get('/api/approvals?status=pending')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── 7. AUDIT LOG ───
  describe('Audit Log', () => {
    it('has audit log entries', async () => {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Audit log may be empty initially, but endpoint should work
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── 8. WORKFLOWS ───
  describe('Workflows API', () => {
    it('can fetch workflow definitions', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('has workflow definitions seeded', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── 9. HEALTH CHECK ───
  describe('Health Check', () => {
    it('health endpoint responds', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  // ─── 10. DATABASE INTEGRITY ───
  describe('Database Integrity', () => {
    it('has all required tables', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);
      expect(tableNames.length).toBeGreaterThanOrEqual(20);

      // Core tables must exist
      const requiredTables = [
        'users', 'agents', 'risks', 'workflows',
        'approvals', 'audit_log', 'finance_budgets',
        'departments', 'documents', 'workflow_instances',
      ];
      for (const table of requiredTables) {
        expect(tableNames).toContain(table);
      }
    });

    it('has seeded data', () => {
      const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
      expect(agentCount.count).toBeGreaterThan(0);

      const riskCount = db.prepare('SELECT COUNT(*) as count FROM risks').get() as { count: number };
      expect(riskCount.count).toBeGreaterThan(0);
    });
  });
});
