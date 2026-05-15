import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

function getAuthToken(role: string = 'founder') {
  const email = role === 'founder' ? 'founder@thecompany.de' : role === 'admin' ? 'admin@thecompany.de' : 'viewer@thecompany.de';
  const id = role === 'founder' ? 'user-founder' : role === 'admin' ? 'user-admin' : 'user-viewer';
  return generateToken({ userId: id, email, role }, process.env.JWT_SECRET!);
}

describe('Agents API', () => {
  beforeEach(() => {
    const db = testDb;
    // Insert founder user
    const founderHash = hashPasswordSync('TheCompany2025!', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    
    // Insert test agents
    const insertAgent = db.prepare(`
      INSERT INTO agents (id, role, name, department, description, allowed_tools, budget_limit, budget_spent, risk_ceiling, autonomy_level, human_approval_rules, kpis, status, version, owner_human)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertAgent.run('agent-1', 'CEO-Agent', 'CEO-Agent', 'Executive Council', 'Strategic planning', JSON.stringify(['report-generator']), 50000, 12000, 'high', 'supervised', JSON.stringify(['Budget > 5k']), JSON.stringify([{ name: 'Accuracy', value: '98%' }]), 'active', '2.1', 'Founder');
    insertAgent.run('agent-2', 'CTO-Agent', 'CTO-Agent', 'Engineering', 'Technical architecture', JSON.stringify(['github']), 30000, 15000, 'high', 'supervised', JSON.stringify(['Deployments']), JSON.stringify([{ name: 'Deploy', value: '96%' }]), 'active', '3.2', 'Founder');
    insertAgent.run('agent-3', 'CFO-Agent', 'CFO-Agent', 'Finance', 'Financial planning', JSON.stringify(['budget-tool']), 20000, 8000, 'critical', 'approval-required', JSON.stringify(['Payments']), JSON.stringify([{ name: 'Accuracy', value: '99%' }]), 'paused', '2.0', 'Founder');
  });

  describe('GET /api/agents', () => {
    it('should list all agents', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter by department', async () => {
      const res = await request(app)
        .get('/api/agents?department=Engineering')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('CTO-Agent');
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/agents?status=paused')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('paused');
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should get agent detail', async () => {
      const res = await request(app)
        .get('/api/agents/agent-1')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('CEO-Agent');
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app)
        .get('/api/agents/nonexistent')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update agent', async () => {
      const res = await request(app)
        .put('/api/agents/agent-1')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ name: 'CEO-Agent-Updated', budget_limit: 60000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('CEO-Agent-Updated');
    });
  });
});
