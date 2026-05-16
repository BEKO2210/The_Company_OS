// ═══════════════════════════════════════════════════════════════
// The Company OS - Comprehensive Security Tests
// ═══════════════════════════════════════════════════════════════

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { testDb, initSchema } from './setup.js';
import { hashPasswordSync, generateToken, verifyToken } from '../src/utils/crypto.js';

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// ═══════════════════════════════════════════════════════════════
// Helper: Create test users with different roles
// ═══════════════════════════════════════════════════════════════

function createTestUsers() {
  const db = testDb;

  const founderHash = hashPasswordSync('TheCompany2025!', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);

  const adminHash = hashPasswordSync('admin123', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-admin', 'admin@thecompany.de', adminHash, 'Admin', 'admin', 1);

  const viewerHash = hashPasswordSync('viewer123', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-viewer', 'viewer@thecompany.de', viewerHash, 'Viewer', 'viewer', 1);

  const inactiveHash = hashPasswordSync('inactive123', 4);
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user-inactive', 'inactive@thecompany.de', inactiveHash, 'Inactive', 'admin', 0);

  // Insert test approval (red-line)
  db.prepare(`
    INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, status, red_line, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run('approval-1', 'payment', 'Test Payment', 'Payment for test', 'test-agent', 'high', 10000, 'pending', 1);

  // Insert test approval (non-red-line)
  db.prepare(`
    INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, status, red_line, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run('approval-2', 'purchase', 'Test Purchase', 'Purchase for test', 'test-agent', 'low', 500, 'pending', 0);

  // Insert test workflow
  db.prepare(`
    INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run('wf-1', 'Test Workflow', 'test', 'Test workflow', '[]', '[]', '[]', 5, 0, 'active', 95, '1h', '[]');

  return {
    founderToken: generateToken({ userId: 'user-founder', email: 'founder@thecompany.de', role: 'founder' }, JWT_SECRET, '1d'),
    adminToken: generateToken({ userId: 'user-admin', email: 'admin@thecompany.de', role: 'admin' }, JWT_SECRET, '1d'),
    viewerToken: generateToken({ userId: 'user-viewer', email: 'viewer@thecompany.de', role: 'viewer' }, JWT_SECRET, '1d'),
    inactiveToken: generateToken({ userId: 'user-inactive', email: 'inactive@thecompany.de', role: 'admin' }, JWT_SECRET, '1d'),
  };
}

// ═══════════════════════════════════════════════════════════════
// Security Test Suite
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Authentication', () => {
  let tokens: ReturnType<typeof createTestUsers>;

  beforeEach(() => {
    tokens = createTestUsers();
  });

  // ───────────────────────────────────────────────
  // TEST: Reject requests without auth token
  // ───────────────────────────────────────────────
  describe('Unauthenticated Access Denied', () => {
    const protectedRoutes = [
      { method: 'get' as const, path: '/api/agents' },
      { method: 'get' as const, path: '/api/approvals' },
      { method: 'get' as const, path: '/api/dashboard/kpis' },
      { method: 'get' as const, path: '/api/audit-log' },
      { method: 'get' as const, path: '/api/workflows' },
      { method: 'get' as const, path: '/api/finance/budgets' },
      { method: 'get' as const, path: '/api/ai/query/history' },
      { method: 'get' as const, path: '/api/ai/summary/daily' },
      { method: 'post' as const, path: '/api/ai/query', body: { query: 'test' } },
      { method: 'get' as const, path: '/api/settings' },
      { method: 'get' as const, path: '/api/risks' },
      { method: 'get' as const, path: '/api/kill-switch/status/full' },
      { method: 'get' as const, path: '/api/auth/me' },
    ];

    it.each(protectedRoutes)('should return 401 for $method $path without token', async ({ method, path, body }) => {
      const res = body
        ? await request(app)[method](path).send(body)
        : await request(app)[method](path);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Reject invalid auth tokens
  // ───────────────────────────────────────────────
  describe('Invalid Token Rejected', () => {
    it('should return 401 for malformed token', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for tampered token signature', async () => {
      const tamperedToken = tokens.adminToken.slice(0, -5) + 'XXXXX';
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for wrong authorization format', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Basic ${tokens.adminToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when only "Bearer " prefix without token', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Reject expired tokens
  // ───────────────────────────────────────────────
  describe('Expired Token Rejected', () => {
    it('should return 401 for expired token', async () => {
      // Create a token that expired 1 hour ago
      const expiredToken = generateToken(
        { userId: 'user-admin', email: 'admin@thecompany.de', role: 'admin' },
        JWT_SECRET,
        '-1h'
      );

      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for token with far-future iat', async () => {
      // Token with issue time in the future (clock skew attack)
      const futureToken = jwt.sign(
        { userId: 'user-admin', email: 'admin@thecompany.de', role: 'admin', iat: Math.floor(Date.now() / 1000) + 3600 },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${futureToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Reject deactivated users
  // ───────────────────────────────────────────────
  describe('Deactivated User Rejected', () => {
    it('should return 401 for deactivated user token', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${tokens.inactiveToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('deactivated');
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Reject non-existent users
  // ───────────────────────────────────────────────
  describe('Non-existent User Rejected', () => {
    it('should return 401 for token of deleted user', async () => {
      const ghostToken = generateToken(
        { userId: 'user-ghost', email: 'ghost@thecompany.de', role: 'admin' },
        JWT_SECRET,
        '1d'
      );

      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${ghostToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('not found');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// RBAC Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - RBAC Enforcement', () => {
  let tokens: ReturnType<typeof createTestUsers>;

  beforeEach(() => {
    tokens = createTestUsers();
  });

  // ───────────────────────────────────────────────
  // TEST: Viewer cannot perform write operations
  // ───────────────────────────────────────────────
  describe('Viewer Write Access Denied', () => {
    it('should return 403 when viewer tries to update an agent', async () => {
      const res = await request(app)
        .put('/api/agents/agent-test-1')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ name: 'Hacked Agent' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to start a workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/wf-1/start')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to cancel a workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/wf-1/cancel')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ reason: 'Testing' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to open a workflow gate', async () => {
      const res = await request(app)
        .post('/api/workflows/instances/inst-1/gate/0/open')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ gateType: 'approval' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to skip a workflow step', async () => {
      const res = await request(app)
        .post('/api/workflows/instances/inst-1/skip/0')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ reason: 'Testing' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to approve an approval', async () => {
      const res = await request(app)
        .post('/api/approvals/approval-2/approve')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to reject an approval', async () => {
      const res = await request(app)
        .post('/api/approvals/approval-2/reject')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ reason: 'Testing' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to clear AI history', async () => {
      const res = await request(app)
        .delete('/api/ai/query/history')
        .set('Authorization', `Bearer ${tokens.viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to update settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ someSetting: 'value' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ email: 'new@user.de', password: 'password123', name: 'New User', role: 'viewer' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Admin CAN perform write operations
  // ───────────────────────────────────────────────
  describe('Admin Write Access Allowed', () => {
    it('should return 404 (not 403) when admin tries to update an agent (resource not found)', async () => {
      const res = await request(app)
        .put('/api/agents/non-existent-agent')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ name: 'Updated Agent' });

      // Admin passes RBAC but gets 404 because agent doesn't exist
      expect(res.status).not.toBe(403);
    });

    it('should return 400 (not 403) when admin tries to start non-existent workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/non-existent/start')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({});

      // Admin passes RBAC but gets error because workflow doesn't exist
      expect(res.status).not.toBe(403);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Only founder can access founder-only routes
  // ───────────────────────────────────────────────
  describe('Founder-only Access', () => {
    it('should return 403 when admin tries to activate kill-switch', async () => {
      const res = await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ level: 1, reason: 'Test' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when admin tries to update settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ someSetting: 'value' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when admin tries to register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ email: 'new@user.de', password: 'password123', name: 'New User', role: 'viewer' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when viewer tries to activate kill-switch', async () => {
      const res = await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${tokens.viewerToken}`)
        .send({ level: 1, reason: 'Test' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ───────────────────────────────────────────────
  // TEST: Red-line approvals require founder
  // ───────────────────────────────────────────────
  describe('Red-Line Approval Restrictions', () => {
    it('should return 403 when admin tries to approve red-line (payment) approval', async () => {
      const res = await request(app)
        .post('/api/approvals/approval-1/approve')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/red line|founder/i);
    });

    it('should return 403 when admin tries to reject red-line (payment) approval', async () => {
      const res = await request(app)
        .post('/api/approvals/approval-1/reject')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ reason: 'Testing' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/red line|founder/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Input Validation Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Input Validation', () => {
  let tokens: ReturnType<typeof createTestUsers>;

  beforeEach(() => {
    tokens = createTestUsers();
  });

  describe('Login Validation', () => {
    it('should reject login with password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.de', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.de' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with excessively long password (>128 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.de', password: 'a'.repeat(200) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with excessively long email (>255 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a'.repeat(300) + '@test.de', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Registration Validation', () => {
    it('should reject registration with founder role (not allowed)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${tokens.founderToken}`)
        .send({ email: 'new@user.de', password: 'password123', name: 'New User', role: 'founder' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${tokens.founderToken}`)
        .send({ email: 'new@user.de', password: '123', name: 'New User', role: 'viewer' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('AI Query Validation', () => {
    it('should reject empty query', async () => {
      const res = await request(app)
        .post('/api/ai/query')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ query: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject query exceeding max length', async () => {
      const res = await request(app)
        .post('/api/ai/query')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({ query: 'a'.repeat(3000) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing query field', async () => {
      const res = await request(app)
        .post('/api/ai/query')
        .set('Authorization', `Bearer ${tokens.adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Password Hashing Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Password Hashing', () => {
  describe('Bcrypt Hashing', () => {
    it('should hash password with bcrypt (not plaintext)', async () => {
      const { hashPassword } = await import('../src/utils/crypto.js');
      const password = 'TestPassword123!';
      const hash = await hashPassword(password, 10);

      // Hash should not equal plaintext
      expect(hash).not.toBe(password);
      // Should be bcrypt format ($2a$ or $2b$)
      expect(hash).toMatch(/^\$2[aby]\$/);
      // Should have proper cost factor
      expect(hash).toContain('$2a$10$');
    });

    it('should verify correct password', async () => {
      const { hashPassword, comparePassword } = await import('../src/utils/crypto.js');
      const password = 'TestPassword123!';
      const hash = await hashPassword(password, 10);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const { hashPassword, comparePassword } = await import('../src/utils/crypto.js');
      const hash = await hashPassword('CorrectPassword123!', 10);

      const isValid = await comparePassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should use default 12 rounds when not specified', async () => {
      const { hashPassword } = await import('../src/utils/crypto.js');
      const hash = await hashPassword('password123');

      expect(hash).toContain('$2a$12$');
    });

    it('should produce different hashes for same password (salt uniqueness)', async () => {
      const { hashPassword } = await import('../src/utils/crypto.js');
      const password = 'SamePassword123!';

      const hash1 = await hashPassword(password, 10);
      const hash2 = await hashPassword(password, 10);

      expect(hash1).not.toBe(hash2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// JWT Configuration Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - JWT Configuration', () => {
  it('should have JWT_SECRET from environment variable', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThan(10);
  });

  it('should not have hardcoded weak secret', () => {
    const commonSecrets = ['secret', '123456', 'password', 'jwt-secret', 'default'];
    const secret = process.env.JWT_SECRET || '';

    for (const weak of commonSecrets) {
      expect(secret.toLowerCase()).not.toBe(weak);
    }
  });

  it('should verify token with correct secret', () => {
    const payload = { userId: 'test', email: 'test@test.de', role: 'admin' };
    const token = generateToken(payload, JWT_SECRET, '1h');

    const decoded = verifyToken<{ userId: string; email: string; role: string }>(token, JWT_SECRET);
    expect(decoded.userId).toBe('test');
    expect(decoded.role).toBe('admin');
  });

  it('should reject token signed with wrong secret', async () => {
    const payload = { userId: 'test', email: 'test@test.de', role: 'admin' };
    const wrongToken = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// AI Routes Authentication Tests (was previously unprotected!)
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - AI Routes Auth (CRITICAL FIX)', () => {
  let tokens: ReturnType<typeof createTestUsers>;

  beforeEach(() => {
    tokens = createTestUsers();
  });

  const aiRoutes = [
    { method: 'get' as const, path: '/api/ai/query/history' },
    { method: 'get' as const, path: '/api/ai/summary/daily' },
    { method: 'get' as const, path: '/api/ai/summary/weekly' },
    { method: 'get' as const, path: '/api/ai/summary/audit' },
    { method: 'get' as const, path: '/api/ai/approvals/prioritized' },
    { method: 'get' as const, path: '/api/ai/predict/liquidity' },
    { method: 'get' as const, path: '/api/ai/predict/break-even' },
    { method: 'get' as const, path: '/api/ai/predict/risks' },
    { method: 'get' as const, path: '/api/ai/predict/overload' },
    { method: 'get' as const, path: '/api/ai/recommendations' },
  ];

  it.each(aiRoutes)('should return 401 for $method $path without auth (was UNPROTECTED)', async ({ method, path }) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for POST /api/ai/query without auth', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ query: 'How many agents?' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for POST /api/ai/approval/:id/analyze without auth', async () => {
    const res = await request(app)
      .post('/api/ai/approval/approval-1/analyze')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for DELETE /api/ai/query/history without auth', async () => {
    const res = await request(app)
      .delete('/api/ai/query/history');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 200 for GET /api/ai/query/history with valid token', async () => {
    const res = await request(app)
      .get('/api/ai/query/history')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 200 for POST /api/ai/query with valid token', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ query: 'How many agents?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Security Headers Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Security Headers', () => {
  it('should include X-Content-Type-Options header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should include X-Frame-Options header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('should include X-XSS-Protection header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
  });

  it('should include Referrer-Policy header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

// ═══════════════════════════════════════════════════════════════
// Error Handler Security Tests
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Error Handler', () => {
  it('should not leak stack traces in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    if (res.body.stack) {
      expect(res.body.stack).toBeUndefined();
    }

    process.env.NODE_ENV = originalEnv;
  });
});

// ═══════════════════════════════════════════════════════════════
// Viewer Read Access Tests (should succeed)
// ═══════════════════════════════════════════════════════════════

describe('Security Tests - Viewer Read Access Allowed', () => {
  let tokens: ReturnType<typeof createTestUsers>;

  beforeEach(() => {
    tokens = createTestUsers();
  });

  it('should allow viewer to list agents', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow viewer to list approvals', async () => {
    const res = await request(app)
      .get('/api/approvals')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow viewer to list workflows', async () => {
    const res = await request(app)
      .get('/api/workflows')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow viewer to access dashboard KPIs', async () => {
    const res = await request(app)
      .get('/api/dashboard/kpis')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow viewer to access finance data', async () => {
    const res = await request(app)
      .get('/api/finance/budgets')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow viewer to access AI read endpoints', async () => {
    const res = await request(app)
      .get('/api/ai/summary/daily')
      .set('Authorization', `Bearer ${tokens.viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
