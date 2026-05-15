import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

function getAuthToken(role: string = 'founder') {
  const email = role === 'founder' ? 'founder@thecompany.de' : 'viewer@thecompany.de';
  const id = role === 'founder' ? 'user-founder' : 'user-viewer';
  return generateToken({ userId: id, email, role }, process.env.JWT_SECRET!);
}

describe('Workflows API', () => {
  beforeEach(() => {
    const db = testDb;
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    
    // Insert test workflow with steps
    const steps = JSON.stringify([
      { id: 's1', name: 'Step 1', description: 'First step', agent: 'CEO-Agent', status: 'completed', blockingGate: false, input: 'data', output: 'result' },
      { id: 's2', name: 'Step 2', description: 'Second step', agent: 'CFO-Agent', status: 'in-progress', blockingGate: true, input: 'result', output: 'approval' },
      { id: 's3', name: 'Step 3', description: 'Third step', agent: 'CTO-Agent', status: 'pending', blockingGate: false, input: 'approval', output: 'done' },
    ]);

    db.prepare(`
      INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('wf-001', 'Test Workflow', 'Test', 'A test workflow', JSON.stringify(['CEO-Agent']), JSON.stringify(['input']), JSON.stringify(['output']), 25, 1, 'active', 90, '2h', steps);
  });

  describe('GET /api/workflows', () => {
    it('should list all workflows', async () => {
      const res = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Test Workflow');
    });

    it('should get single workflow', async () => {
      const res = await request(app)
        .get('/api/workflows/wf-001')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('wf-001');
    });
  });

  describe('POST /api/workflows/:id/start', () => {
    it('should start a workflow', async () => {
      const res = await request(app)
        .post('/api/workflows/wf-001/start')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ context: { key: 'value' } });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workflow_id).toBe('wf-001');
      expect(res.body.data.status).toBe('running');
    });
  });

  describe('POST /api/workflow-instances/:id/advance', () => {
    it('should advance workflow step and detect blocking gate', async () => {
      // Start workflow
      const startRes = await request(app)
        .post('/api/workflows/wf-001/start')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ context: {} });

      const instanceId = startRes.body.data.id;

      // Advance to step 1 (not blocking)
      const res1 = await request(app)
        .post(`/api/workflow-instances/${instanceId}/advance`)
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.current_step).toBe(1);
    });
  });

  describe('GET /api/workflow-instances/:id/gate', () => {
    it('should check if current step is a blocking gate', async () => {
      // Start workflow
      const startRes = await request(app)
        .post('/api/workflows/wf-001/start')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ context: {} });

      const instanceId = startRes.body.data.id;

      // Check gate at step 0 (not blocking)
      const res = await request(app)
        .get(`/api/workflow-instances/${instanceId}/gate`)
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.blocking).toBe(false);
    });
  });
});
