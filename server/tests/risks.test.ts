import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';
import { calculateScore, getRiskMatrix, getHighRisks } from '../src/services/riskService.js';

const app = createApp();

function getAuthToken(role: string = 'founder') {
  const email = role === 'founder' ? 'founder@thecompany.de' : 'viewer@thecompany.de';
  const id = role === 'founder' ? 'user-founder' : 'user-viewer';
  return generateToken({ userId: id, email, role }, process.env.JWT_SECRET!);
}

describe('Risks API', () => {
  beforeEach(() => {
    const db = testDb;
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    
    // Insert test risks
    const insertRisk = db.prepare(`
      INSERT INTO risks (name, category, cause, impact, early_warning, mitigation, owner, probability, severity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertRisk.run('Technical debt', 'technical', 'Rapid dev', 'Slowed dev', 'Complexity rising', '20% refactoring', 'CTO-Agent', 4, 3, 'active'); // score: 12
    insertRisk.run('GDPR violation', 'legal', 'Inadequate measures', 'Fines', 'Audit findings', 'Hire DPO', 'CLO-Agent', 3, 5, 'active'); // score: 15
    insertRisk.run('Cash flow issue', 'financial', 'High burn', 'Cant pay vendors', 'Low liquidity', 'Reduce costs', 'CFO-Agent', 3, 4, 'active'); // score: 12
    insertRisk.run('Minor vendor issue', 'operational', 'Single vendor', 'Disruption', 'SLA breach', 'Multi-vendor', 'Procurement-Agent', 2, 2, 'monitoring'); // score: 4
  });

  describe('Risk Scoring', () => {
    it('should calculate risk score as probability * severity', () => {
      expect(calculateScore(4, 3)).toBe(12);
      expect(calculateScore(3, 5)).toBe(15);
      expect(calculateScore(1, 1)).toBe(1);
      expect(calculateScore(5, 5)).toBe(25);
    });
  });

  describe('GET /api/risks', () => {
    it('should list all risks sorted by score descending', async () => {
      const res = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);
      // Highest score first
      expect(res.body.data[0].score).toBeGreaterThanOrEqual(res.body.data[1].score);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/risks?category=technical')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].category).toBe('technical');
    });

    it('should filter by minimum score', async () => {
      const res = await request(app)
        .get('/api/risks?minScore=10')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data.every((r: { score: number }) => r.score >= 10)).toBe(true);
    });
  });

  describe('GET /api/risks/:id', () => {
    it('should get single risk', async () => {
      const res = await request(app)
        .get('/api/risks/1')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Technical debt');
    });
  });

  describe('GET /api/risks/matrix/overview', () => {
    it('should return 5x5 risk matrix', async () => {
      const res = await request(app)
        .get('/api/risks/matrix/overview')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.matrix).toBeDefined();
      expect(res.body.data.matrix.length).toBe(5);
      expect(res.body.data.matrix[0].length).toBe(5);
      expect(res.body.data.counts).toBeDefined();
    });
  });
});
