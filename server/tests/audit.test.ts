import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync, generateAuditHash } from '../src/utils/crypto.js';
import { createEntry, getEntries, verifyChain } from '../src/services/auditService.js';

const app = createApp();

function getAuthToken(role: string = 'founder') {
  const email = role === 'founder' ? 'founder@thecompany.de' : role === 'admin' ? 'admin@thecompany.de' : 'viewer@thecompany.de';
  const id = role === 'founder' ? 'user-founder' : role === 'admin' ? 'user-admin' : 'user-viewer';
  return generateToken({ userId: id, email, role }, process.env.JWT_SECRET!);
}

describe('Audit Log API', () => {
  beforeEach(() => {
    const db = testDb;
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
  });

  describe('GET /api/audit-log', () => {
    it('should return audit log entries', async () => {
      // Seed some audit entries
      createEntry({ agent: 'CEO-Agent', action: 'Report generated', risk_score: 5, approved_by: 'Founder' });
      createEntry({ agent: 'CFO-Agent', action: 'Budget review', risk_score: 10, approved_by: 'Founder' });

      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by agent', async () => {
      createEntry({ agent: 'CEO-Agent', action: 'Action 1', risk_score: 5 });
      createEntry({ agent: 'CFO-Agent', action: 'Action 2', risk_score: 10 });

      const res = await request(app)
        .get('/api/audit-log?agent=CEO-Agent')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((e: { agent: string }) => e.agent === 'CEO-Agent')).toBe(true);
    });

    it('should filter by minimum risk score', async () => {
      createEntry({ agent: 'Agent-A', action: 'Low risk', risk_score: 5 });
      createEntry({ agent: 'Agent-B', action: 'High risk', risk_score: 50 });

      const res = await request(app)
        .get('/api/audit-log?minRisk=20')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((e: { risk_score: number }) => e.risk_score >= 20)).toBe(true);
    });
  });

  describe('Audit Log Integrity', () => {
    it('should create entries with consistent hash chain', async () => {
      const entry1 = createEntry({ agent: 'Test-Agent', action: 'Action 1', risk_score: 5 });
      const entry2 = createEntry({ agent: 'Test-Agent', action: 'Action 2', risk_score: 10 });

      expect(entry1.hash).toBeDefined();
      expect(entry2.hash).toBeDefined();
      expect(entry2.previous_hash).toBe(entry1.hash);
    });

    it('should verify hash chain integrity', async () => {
      createEntry({ agent: 'A1', action: 'First', risk_score: 5 });
      createEntry({ agent: 'A1', action: 'Second', risk_score: 10 });
      createEntry({ agent: 'A1', action: 'Third', risk_score: 15 });

      const isValid = verifyChain();
      expect(isValid).toBe(true);
    });
  });

  describe('Audit Log Append-Only', () => {
    it('should not have update/delete endpoints accessible', async () => {
      // Audit log is append-only - no PUT/DELETE endpoints should exist
      const createRes = await request(app)
        .put('/api/audit-log/log-001')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ action: 'tampered' });

      expect(createRes.status).toBe(404);
    });
  });
});
