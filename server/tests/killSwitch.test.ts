import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

function getAuthToken(role: string = 'founder', email?: string, id?: string) {
  const finalEmail = email || (role === 'founder' ? 'founder@thecompany.de' : role === 'admin' ? 'admin@thecompany.de' : 'viewer@thecompany.de');
  const finalId = id || (role === 'founder' ? 'user-founder' : role === 'admin' ? 'user-admin' : 'user-viewer');
  return generateToken({ userId: finalId, email: finalEmail, role }, process.env.JWT_SECRET!);
}

describe('Kill Switch API', () => {
  beforeEach(() => {
    const db = testDb;
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', founderHash, 'Admin', 'admin', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-viewer', 'viewer@thecompany.de', founderHash, 'Viewer', 'viewer', 1);
    
    // Insert system settings
    db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)')
      .run('kill_switch_status', 'armed', 'Kill switch status');
    db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)')
      .run('kill_switch_level', '0', 'Kill switch level');
  });

  describe('GET /api/kill-switch', () => {
    it('should return kill switch status', async () => {
      const res = await request(app)
        .get('/api/kill-switch')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(false);
      expect(res.body.data.level).toBe(0);
    });
  });

  describe('POST /api/kill-switch/activate', () => {
    it('should allow founder to activate', async () => {
      const res = await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ level: 2, reason: 'Security incident' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject activation by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ level: 2 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject activation by admin', async () => {
      const res = await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ level: 2 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/kill-switch/deactivate', () => {
    it('should allow founder to deactivate', async () => {
      // First activate
      await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ level: 2, reason: 'Security incident' });

      // Then deactivate
      const res = await request(app)
        .post('/api/kill-switch/deactivate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject deactivation by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/deactivate')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Circuit Breaker Tests (Level 1)
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/circuit-breaker', () => {
    it('should return all circuit breaker states', async () => {
      const res = await request(app)
        .get('/api/kill-switch/circuit-breaker')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('states');
      expect(res.body.data).toHaveProperty('stats');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/kill-switch/circuit-breaker');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/kill-switch/circuit-breaker/:agentId', () => {
    it('should return 404 for non-existent breaker', async () => {
      const res = await request(app)
        .get('/api/kill-switch/circuit-breaker/nonexistent-agent')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/kill-switch/circuit-breaker/:agentId/reset', () => {
    it('should allow admin to reset circuit breaker', async () => {
      const res = await request(app)
        .post('/api/kill-switch/circuit-breaker/test-agent/reset')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject reset by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/circuit-breaker/test-agent/reset')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/kill-switch/circuit-breaker/stats', () => {
    it('should return circuit breaker statistics', async () => {
      const res = await request(app)
        .get('/api/kill-switch/circuit-breaker/stats')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('closed');
      expect(res.body.data).toHaveProperty('open');
      expect(res.body.data).toHaveProperty('halfOpen');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Quarantine Tests (Level 2)
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/quarantine', () => {
    it('should return quarantined agents list', async () => {
      const res = await request(app)
        .get('/api/kill-switch/quarantine')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('quarantined');
      expect(res.body.data).toHaveProperty('stats');
    });
  });

  describe('POST /api/kill-switch/quarantine/:agentId', () => {
    it('should allow admin to quarantine an agent', async () => {
      const db = testDb;
      // Insert a test agent
      db.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@thecompany.de', '1.0.0')
      `).run('test-agent-1');

      const res = await request(app)
        .post('/api/kill-switch/quarantine/test-agent-1')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ reason: 'Test quarantine' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isQuarantined).toBe(true);
    });

    it('should require a reason', async () => {
      const res = await request(app)
        .post('/api/kill-switch/quarantine/test-agent-1')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject quarantine by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/quarantine/test-agent-1')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/kill-switch/quarantine/:agentId/lift', () => {
    it('should allow admin to lift quarantine', async () => {
      const db = testDb;
      // Insert a test agent
      db.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@thecompany.de', '1.0.0')
      `).run('test-agent-lift');

      // First quarantine
      await request(app)
        .post('/api/kill-switch/quarantine/test-agent-lift')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ reason: 'Test quarantine' });

      // Then lift
      const res = await request(app)
        .post('/api/kill-switch/quarantine/test-agent-lift/lift')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isQuarantined).toBe(false);
    });

    it('should return success false when agent not quarantined', async () => {
      const res = await request(app)
        .post('/api/kill-switch/quarantine/non-quarantined/lift')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      // Should still return 200 with success: false
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Workflow Stop Tests (Level 3)
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/workflow', () => {
    it('should return stopped workflows', async () => {
      const res = await request(app)
        .get('/api/kill-switch/workflow')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('stoppedWorkflows');
      expect(res.body.data).toHaveProperty('stoppedUnits');
    });
  });

  describe('POST /api/kill-switch/workflow/:instanceId/stop', () => {
    it('should require a reason', async () => {
      const res = await request(app)
        .post('/api/kill-switch/workflow/test-instance/stop')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject stop by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/workflow/test-instance/stop')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ reason: 'Test stop' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/kill-switch/workflow/:instanceId/resume', () => {
    it('should return success false when workflow not stopped', async () => {
      const res = await request(app)
        .post('/api/kill-switch/workflow/not-stopped/resume')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin to resume workflow', async () => {
      const db = testDb;
      // Insert a workflow and instance
      db.prepare(`
        INSERT INTO workflows (id, name, category, status, steps)
        VALUES (?, 'Test Workflow', 'test', 'active', '[]')
      `).run('test-wf-1');
      
      db.prepare(`
        INSERT INTO workflow_instances (id, workflow_id, status, current_step)
        VALUES (?, ?, 'running', 1)
      `).run('test-wi-1', 'test-wf-1');

      // Stop the workflow
      await request(app)
        .post('/api/kill-switch/workflow/test-wi-1/stop')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ reason: 'Test stop' });

      // Resume the workflow
      const res = await request(app)
        .post('/api/kill-switch/workflow/test-wi-1/resume')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Global Kill Switch Tests (Level 4)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/kill-switch/global/activate', () => {
    it('should require confirmation code', async () => {
      const res = await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ reason: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should activate with correct confirmation code', async () => {
      const res = await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ reason: 'Emergency test', confirmationCode: 'KILL-SWITCH-2025' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isActive', true);
    });

    it('should reject wrong confirmation code', async () => {
      const res = await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ reason: 'Test', confirmationCode: 'WRONG-CODE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-founder', async () => {
      const res = await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ reason: 'Test', confirmationCode: 'KILL-SWITCH-2025' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/kill-switch/global/status', () => {
    it('should return global kill switch status', async () => {
      const res = await request(app)
        .get('/api/kill-switch/global/status')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isActive');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('totalActivations');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Health Monitor Tests
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/health', () => {
    it('should return health checks for all agents', async () => {
      const res = await request(app)
        .get('/api/kill-switch/health')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('checks');
      expect(res.body.data).toHaveProperty('unhealthy');
      expect(res.body.data).toHaveProperty('stats');
    });
  });

  describe('GET /api/kill-switch/health/stats', () => {
    it('should return health statistics', async () => {
      const res = await request(app)
        .get('/api/kill-switch/health/stats')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('registeredAgents');
      expect(res.body.data).toHaveProperty('isMonitoring');
    });
  });

  describe('POST /api/kill-switch/health/start', () => {
    it('should start health monitoring', async () => {
      const res = await request(app)
        .post('/api/kill-switch/health/start')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ intervalMs: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/health/start')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/kill-switch/health/stop', () => {
    it('should stop health monitoring', async () => {
      // Start first
      await request(app)
        .post('/api/kill-switch/health/start')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      // Then stop
      const res = await request(app)
        .post('/api/kill-switch/health/stop')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Anomaly Detector Tests
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/kill-switch/anomaly/analyze', () => {
    it('should analyze agent for anomalies', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/analyze')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({
          agentId: 'test-agent',
          metrics: {
            responseTime: 500,
            errorRate: 0.05,
            throughput: 100,
            lastActivity: new Date(),
            consecutiveErrors: 0,
            consecutiveTimeouts: 0,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('anomalies');
      expect(res.body.data).toHaveProperty('overallRiskScore');
      expect(res.body.data).toHaveProperty('recommendedAction');
    });

    it('should require agentId', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/analyze')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ metrics: {} });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require metrics', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/analyze')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ agentId: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/analyze')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ agentId: 'test', metrics: {} });

      expect(res.status).toBe(403);
    });

    it('should detect high risk anomalies', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/analyze')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({
          agentId: 'test-agent',
          metrics: {
            responseTime: 20000,
            errorRate: 0.8,
            throughput: 2,
            lastActivity: new Date(),
            consecutiveErrors: 10,
            consecutiveTimeouts: 5,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallRiskScore).toBeGreaterThan(5);
      expect(res.body.data.shouldEscalate).toBe(true);
    });
  });

  describe('POST /api/kill-switch/anomaly/thresholds', () => {
    it('should update anomaly thresholds', async () => {
      const res = await request(app)
        .post('/api/kill-switch/anomaly/thresholds')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ errorRateThreshold: 0.5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Recovery Tests
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/kill-switch/recover/:type', () => {
    it('should recover circuit breaker', async () => {
      const res = await request(app)
        .post('/api/kill-switch/recover/circuit_breaker')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ targetId: 'test-agent' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('type', 'circuit_breaker');
      expect(res.body.data).toHaveProperty('stepsCompleted');
      expect(res.body.data).toHaveProperty('stepsFailed');
    });

    it('should recover quarantine', async () => {
      const res = await request(app)
        .post('/api/kill-switch/recover/quarantine')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ targetId: 'test-agent' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('type', 'quarantine');
    });

    it('should recover workflow', async () => {
      const res = await request(app)
        .post('/api/kill-switch/recover/workflow')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ targetId: 'test-instance' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('type', 'workflow');
    });

    it('should reject invalid recovery type', async () => {
      const res = await request(app)
        .post('/api/kill-switch/recover/invalid_type')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ targetId: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject recovery by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/recover/circuit_breaker')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ targetId: 'test' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/kill-switch/post-mortem', () => {
    it('should generate post-mortem report', async () => {
      // First activate kill switch to create an incident
      await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ reason: 'Test incident', confirmationCode: 'KILL-SWITCH-2025' });

      // Get the incident ID from history
      const historyRes = await request(app)
        .get('/api/kill-switch/history')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`);

      const incidentId = historyRes.body.data[0]?.id;
      expect(incidentId).toBeDefined();

      // Generate post-mortem
      const res = await request(app)
        .post('/api/kill-switch/post-mortem')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({ incidentId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('incidentId');
      expect(res.body.data).toHaveProperty('timeline');
      expect(res.body.data).toHaveProperty('rootCause');
      expect(res.body.data).toHaveProperty('recommendations');
      expect(res.body.data).toHaveProperty('lessonsLearned');
    });

    it('should require incidentId', async () => {
      const res = await request(app)
        .post('/api/kill-switch/post-mortem')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject by viewer', async () => {
      const res = await request(app)
        .post('/api/kill-switch/post-mortem')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`)
        .send({ incidentId: 'test' });

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: Unified Status
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/status/full', () => {
    it('should return full system status', async () => {
      const res = await request(app)
        .get('/api/kill-switch/status/full')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('killSwitch');
      expect(res.body.data).toHaveProperty('circuitBreakers');
      expect(res.body.data).toHaveProperty('quarantine');
      expect(res.body.data).toHaveProperty('workflowStop');
      expect(res.body.data).toHaveProperty('health');
      expect(res.body.data).toHaveProperty('overallStatus');
    });

    it('should show emergency when kill switch active', async () => {
      // Activate kill switch
      await request(app)
        .post('/api/kill-switch/global/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ reason: 'Emergency test', confirmationCode: 'KILL-SWITCH-2025' });

      const res = await request(app)
        .get('/api/kill-switch/status/full')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.overallStatus).toBe('emergency');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RUN-005: History
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/kill-switch/history', () => {
    it('should return kill switch activation history', async () => {
      // Activate first
      await request(app)
        .post('/api/kill-switch/activate')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`)
        .send({ level: 2, reason: 'Test history' });

      const res = await request(app)
        .get('/api/kill-switch/history')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
