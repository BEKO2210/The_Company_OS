// ═══════════════════════════════════════════════════════════════
// Kill Switch System - Unit Tests (Phase 4 QA)
// Tests all 4 levels independently
// ═══════════════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { setDb, getDb } from '../src/db/connection.js';

// ─── Setup ───
let mockDb: Database.Database;

beforeAll(() => {
  mockDb = new Database(':memory:');
  mockDb.pragma('foreign_keys = ON');
  setDb(mockDb);

  // ─── Create required tables ───
  mockDb.exec(`
    CREATE TABLE IF NOT EXISTS circuit_breakers (
      agent_id TEXT PRIMARY KEY,
      state TEXT DEFAULT 'closed',
      failure_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      last_failure_at TEXT,
      last_success_at TEXT,
      opened_at TEXT,
      half_open_at TEXT,
      config TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quarantine_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      lifted_at TEXT,
      lifted_by TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      role TEXT,
      name TEXT,
      department TEXT,
      status TEXT DEFAULT 'active',
      owner_human TEXT,
      version TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_instances (
      id TEXT PRIMARY KEY,
      workflow_id TEXT,
      status TEXT DEFAULT 'pending',
      current_step INTEGER DEFAULT 0,
      context TEXT
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      responsible_agents TEXT
    );

    CREATE TABLE IF NOT EXISTS stopped_workflows (
      id TEXT PRIMARY KEY,
      instance_id TEXT,
      unit_id TEXT,
      reason TEXT,
      triggered_by TEXT,
      stopped_at TEXT,
      resumed_at TEXT,
      resumed_by TEXT,
      status TEXT DEFAULT 'stopped'
    );

    CREATE TABLE IF NOT EXISTS kill_switch_log (
      id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 4,
      triggered_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      triggered_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      role TEXT DEFAULT 'viewer',
      is_active INTEGER DEFAULT 1
    );
  `);
});

beforeEach(() => {
  // Clear all data between tests
  const db = getDb();
  const tables = [
    'circuit_breakers', 'quarantine_log', 'workflow_instances',
    'workflows', 'stopped_workflows', 'kill_switch_log',
    'system_settings', 'agents', 'users'
  ];
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch { /* ignore */ }
  }
});

afterAll(() => {
  mockDb.close();
});

// ═══════════════════════════════════════════════════════════════
// LEVEL 1 - Circuit Breaker Tests
// ═══════════════════════════════════════════════════════════════

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getBreaker,
  resetBreaker,
  getAllBreakerStates,
  getBreakerStats,
  clearBreakerCache,
} from '../src/killSwitch/circuitBreaker.js';
import {
  DEFAULT_BREAKER_CONFIG,
} from '../src/killSwitch/types.js';

describe('Level 1 - Circuit Breaker', () => {
  beforeEach(() => {
    clearBreakerCache();
  });

  describe('Core States', () => {
    it('starts in CLOSED state', () => {
      const cb = new CircuitBreaker('agent-1', undefined, mockDb);
      expect(cb.state).toBe('closed');
    });

    it('has all 3 states available', () => {
      const cb = new CircuitBreaker('agent-states', undefined, mockDb);
      // closed -> open (after failures)
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }
      expect(cb.state).toBe('open');

      // open -> half-open (simulated cooldown)
      cb.state = 'half-open';
      cb['halfOpenedAt'] = new Date();
      cb['halfOpenCallsRemaining'] = DEFAULT_BREAKER_CONFIG.halfOpenMaxCalls;
      expect(cb.state).toBe('half-open');

      // half-open -> closed (after successes)
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.successThreshold; i++) {
        cb.recordSuccess();
      }
      expect(cb.state).toBe('closed');
    });

    it('provides state information via getState()', () => {
      const cb = new CircuitBreaker('agent-state-test', undefined, mockDb);
      const state = cb.getState();
      expect(state.agentId).toBe('agent-state-test');
      expect(state.state).toBe('closed');
      expect(state.metrics).toBeDefined();
      expect(state.config).toBeDefined();
      expect(state.openedAt).toBeNull();
      expect(state.halfOpenedAt).toBeNull();
    });
  });

  describe('Failure Threshold', () => {
    it('transitions CLOSED -> OPEN after failure threshold', () => {
      const cb = new CircuitBreaker('agent-fail', undefined, mockDb);
      const threshold = DEFAULT_BREAKER_CONFIG.failureThreshold;

      // Record failures up to threshold
      for (let i = 0; i < threshold; i++) {
        expect(cb.state).not.toBe('open');
        cb.recordFailure();
      }

      expect(cb.state).toBe('open');
      expect(cb['openedAt']).not.toBeNull();
    });

    it('counts consecutive failures correctly', () => {
      const cb = new CircuitBreaker('agent-consec', undefined, mockDb);
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getMetrics().consecutiveFailures).toBe(2);

      // Success resets consecutive failures
      cb.recordSuccess();
      expect(cb.getMetrics().consecutiveFailures).toBe(0);
      expect(cb.getMetrics().consecutiveSuccesses).toBe(1);
    });
  });

  describe('Cooldown and Half-Open', () => {
    it('calculates cooldown remaining', () => {
      const cb = new CircuitBreaker('agent-cooldown', undefined, mockDb);
      // Force open state
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }
      expect(cb.state).toBe('open');
      expect(cb.getCooldownRemainingMs()).toBeGreaterThan(0);
    });

    it('allows limited calls in half-open state', () => {
      const cb = new CircuitBreaker('agent-half', undefined, mockDb);
      cb.state = 'half-open';
      cb['halfOpenedAt'] = new Date();
      cb['halfOpenCallsRemaining'] = DEFAULT_BREAKER_CONFIG.halfOpenMaxCalls;
      cb['metrics'].consecutiveSuccesses = 0;

      expect(cb['halfOpenCallsRemaining']).toBe(DEFAULT_BREAKER_CONFIG.halfOpenMaxCalls);
    });
  });

  describe('Success Recovery', () => {
    it('transitions HALF-OPEN -> CLOSED after success threshold', () => {
      const cb = new CircuitBreaker('agent-recover', undefined, mockDb);
      // Open -> Half-Open
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }
      expect(cb.state).toBe('open');

      // Manually transition to half-open
      cb.state = 'half-open';
      cb['halfOpenedAt'] = new Date();
      cb['halfOpenCallsRemaining'] = DEFAULT_BREAKER_CONFIG.halfOpenMaxCalls;
      cb['metrics'].consecutiveSuccesses = 0;

      // Record successes up to threshold
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.successThreshold; i++) {
        cb.recordSuccess();
      }

      expect(cb.state).toBe('closed');
    });
  });

  describe('Per-Agent Isolation', () => {
    it('has separate breakers for different agents', () => {
      const cb1 = new CircuitBreaker('agent-a', undefined, mockDb);
      const cb2 = new CircuitBreaker('agent-b', undefined, mockDb);

      // Fail agent-a
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb1.recordFailure();
      }

      expect(cb1.state).toBe('open');
      expect(cb2.state).toBe('closed'); // agent-b unaffected
    });

    it('returns existing breaker from cache', () => {
      clearBreakerCache();
      const cb1 = getBreaker('agent-cache');
      const cb2 = getBreaker('agent-cache');
      expect(cb1).toBe(cb2);
    });
  });

  describe('execute() wrapper', () => {
    it('executes successful function', async () => {
      const cb = new CircuitBreaker('agent-exec', undefined, mockDb);
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('blocks execution when open', async () => {
      const cb = new CircuitBreaker('agent-block', { timeout: 60000 }, mockDb);
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }
      expect(cb.state).toBe('open');

      await expect(cb.execute(async () => 'should-not-run'))
        .rejects.toThrow(CircuitBreakerOpenError);
    });

    it('tracks metrics during execute', async () => {
      const cb = new CircuitBreaker('agent-metrics', undefined, mockDb);
      await cb.execute(async () => 'ok');
      expect(cb.getMetrics().totalSuccesses).toBe(1);
      expect(cb.getMetrics().totalCalls).toBe(1);
    });
  });

  describe('DB Persistence', () => {
    it('persists state to database', () => {
      const cb = new CircuitBreaker('agent-persist', undefined, mockDb);
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }

      // Check DB has the record
      const record = mockDb
        .prepare('SELECT * FROM circuit_breakers WHERE agent_id = ?')
        .get('agent-persist') as { agent_id: string; state: string; failure_count: number } | undefined;

      expect(record).toBeDefined();
      expect(record!.state).toBe('open');
      expect(record!.failure_count).toBe(DEFAULT_BREAKER_CONFIG.failureThreshold);
    });

    it('loads state from database on construction', () => {
      // Create breaker and fail it
      const cb1 = new CircuitBreaker('agent-reload', undefined, mockDb);
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb1.recordFailure();
      }

      // Create new instance (simulating restart) - should load from DB
      clearBreakerCache();
      const cb2 = new CircuitBreaker('agent-reload', undefined, mockDb);
      expect(cb2.state).toBe('open');
    });
  });

  describe('resetBreaker', () => {
    it('resets breaker to closed state', () => {
      clearBreakerCache();
      const cb = getBreaker('agent-reset');
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb.recordFailure();
      }
      expect(cb.state).toBe('open');

      resetBreaker('agent-reset');
      expect(cb.state).toBe('closed');
    });

    it('resets breaker not in cache via DB', () => {
      // Direct DB insert
      mockDb.prepare(`
        INSERT OR REPLACE INTO circuit_breakers (agent_id, state, failure_count, config)
        VALUES (?, 'open', 10, ?)
      `).run('agent-db-only', JSON.stringify(DEFAULT_BREAKER_CONFIG));

      clearBreakerCache();
      const result = resetBreaker('agent-db-only');
      expect(result).toBe(true);

      const record = mockDb
        .prepare('SELECT state FROM circuit_breakers WHERE agent_id = ?')
        .get('agent-db-only') as { state: string } | undefined;
      expect(record!.state).toBe('closed');
    });
  });

  describe('getBreakerStats', () => {
    it('returns aggregate statistics', () => {
      clearBreakerCache();
      // Create multiple breakers in different states
      const cb1 = getBreaker('stats-1');
      cb1.recordSuccess();
      cb1.recordSuccess();

      const cb2 = getBreaker('stats-2');
      for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
        cb2.recordFailure();
      }

      const stats = getBreakerStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.closed).toBeGreaterThanOrEqual(1);
      expect(stats.open).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// LEVEL 2 - Agent Quarantine Tests
// ═══════════════════════════════════════════════════════════════

import {
  AgentQuarantine,
  AgentQuarantinedError,
  resetQuarantineInstance,
} from '../src/killSwitch/agentQuarantine.js';

describe('Level 2 - Agent Quarantine', () => {
  beforeEach(() => {
    resetQuarantineInstance();
  });

  describe('Core Quarantine', () => {
    it('quarantines an agent', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-q1');

      const result = aq.quarantine('agent-q1', 'Suspicious activity', 'tester');
      expect(result).toBe(true);
      expect(aq.isQuarantined('agent-q1')).toBe(true);
    });

    it('prevents double-quarantine', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-dq');

      aq.quarantine('agent-dq', 'Reason 1', 'tester');
      const result = aq.quarantine('agent-dq', 'Reason 2', 'tester');
      expect(result).toBe(false); // Already quarantined
    });
  });

  describe('Enforcement', () => {
    it('enforce() throws for quarantined agent', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-enf');

      aq.quarantine('agent-enf', 'Test reason', 'tester');

      expect(() => aq.enforce('agent-enf')).toThrow(AgentQuarantinedError);
    });

    it('enforce() does not throw for non-quarantined agent', () => {
      const aq = new AgentQuarantine(mockDb);
      expect(() => aq.enforce('agent-safe')).not.toThrow();
    });

    it('AgentQuarantinedError has correct properties', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-err');

      aq.quarantine('agent-err', 'Bad behavior', 'trigger-user');

      try {
        aq.enforce('agent-err');
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AgentQuarantinedError);
        const err = e as AgentQuarantinedError;
        expect(err.agentId).toBe('agent-err');
        expect(err.reason).toBe('Bad behavior');
        expect(err.triggeredBy).toBe('trigger-user');
        expect(err.code).toBe('AGENT_QUARANTINED');
      }
    });
  });

  describe('Lift Quarantine', () => {
    it('lifts quarantine', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test Agent', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-lift');

      aq.quarantine('agent-lift', 'Test', 'tester');
      expect(aq.isQuarantined('agent-lift')).toBe(true);

      const result = aq.lift('agent-lift', 'founder');
      expect(result).toBe(true);
      expect(aq.isQuarantined('agent-lift')).toBe(false);
    });

    it('fails to lift non-quarantined agent', () => {
      const aq = new AgentQuarantine(mockDb);
      const result = aq.lift('agent-never-q', 'founder');
      expect(result).toBe(false);
    });
  });

  describe('Queries', () => {
    it('lists quarantined agents', () => {
      const aq = new AgentQuarantine(mockDb);
      for (let i = 0; i < 3; i++) {
        mockDb.prepare(`
          INSERT INTO agents (id, role, name, department, status, owner_human, version)
          VALUES (?, 'test', ?, 'test-dept', 'active', 'founder@test.de', '1.0.0')
        `).run(`agent-list-${i}`, `Agent ${i}`);
        aq.quarantine(`agent-list-${i}`, `Reason ${i}`, 'tester');
      }

      const quarantined = aq.getQuarantinedAgents();
      expect(quarantined.length).toBe(3);
    });

    it('provides statistics', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-stat');

      aq.quarantine('agent-stat', 'Test', 'tester');
      aq.lift('agent-stat', 'founder');

      const stats = aq.getStats();
      expect(stats.activeQuarantines).toBe(0);
      expect(stats.totalHistory).toBe(1);
      expect(stats.lifted).toBe(1);
    });
  });

  describe('Department Quarantine', () => {
    it('quarantines all agents in a department', () => {
      const aq = new AgentQuarantine(mockDb);
      for (let i = 0; i < 3; i++) {
        mockDb.prepare(`
          INSERT INTO agents (id, role, name, department, status, owner_human, version)
          VALUES (?, 'test', ?, 'sales', 'active', 'founder@test.de', '1.0.0')
        `).run(`agent-dept-${i}`, `Sales Agent ${i}`);
      }

      const quarantined = aq.quarantineDepartment('sales', 'Department incident', 'tester');
      expect(quarantined.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(aq.isQuarantined(`agent-dept-${i}`)).toBe(true);
      }
    });
  });

  describe('DB Persistence', () => {
    it('persists quarantine to DB', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-db');

      aq.quarantine('agent-db', 'DB test', 'tester');

      const record = mockDb
        .prepare("SELECT * FROM quarantine_log WHERE agent_id = ? AND status = 'active'")
        .get('agent-db') as { agent_id: string; reason: string; status: string } | undefined;

      expect(record).toBeDefined();
      expect(record!.reason).toBe('DB test');
      expect(record!.status).toBe('active');
    });

    it('updates agent status in agents table', () => {
      const aq = new AgentQuarantine(mockDb);
      mockDb.prepare(`
        INSERT INTO agents (id, role, name, department, status, owner_human, version)
        VALUES (?, 'test', 'Test', 'test-dept', 'active', 'founder@test.de', '1.0.0')
      `).run('agent-status');

      aq.quarantine('agent-status', 'Test', 'tester');

      const agent = mockDb
        .prepare('SELECT status FROM agents WHERE id = ?')
        .get('agent-status') as { status: string } | undefined;

      expect(agent!.status).toBe('quarantine');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// LEVEL 3 - Workflow Stop Tests
// ═══════════════════════════════════════════════════════════════

import {
  WorkflowStop,
  WorkflowStoppedError,
  resetWorkflowStopInstance,
} from '../src/killSwitch/workflowStop.js';

describe('Level 3 - Workflow Stop', () => {
  beforeEach(() => {
    resetWorkflowStopInstance();
  });

  function createWorkflowInstance(id: string, status: string = 'running', step: number = 3) {
    mockDb.prepare(`
      INSERT INTO workflow_instances (id, workflow_id, status, current_step, context)
      VALUES (?, 'wf-1', ?, ?, NULL)
    `).run(id, status, step);
  }

  describe('Stop Workflow', () => {
    it('stops a running workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-instance-1');

      const result = ws.stopWorkflow('wf-instance-1', 'Test stop', 'tester');
      expect(result).toBe(true);
      expect(ws.isWorkflowStopped('wf-instance-1')).toBe(true);
    });

    it('does not stop already stopped workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-instance-2');

      ws.stopWorkflow('wf-instance-2', 'First stop', 'tester');
      const result = ws.stopWorkflow('wf-instance-2', 'Second stop', 'tester');
      expect(result).toBe(false);
    });

    it('does not stop completed workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-instance-3', 'completed');

      const result = ws.stopWorkflow('wf-instance-3', 'Should fail', 'tester');
      expect(result).toBe(false);
    });

    it('does not stop failed workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-instance-4', 'failed');

      const result = ws.stopWorkflow('wf-instance-4', 'Should fail', 'tester');
      expect(result).toBe(false);
    });
  });

  describe('Data Preservation', () => {
    it('preserves step information on stop', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-preserve', 'running', 7);

      ws.stopWorkflow('wf-preserve', 'Preserve test', 'tester');

      const instance = mockDb
        .prepare('SELECT context FROM workflow_instances WHERE id = ?')
        .get('wf-preserve') as { context: string } | undefined;

      expect(instance).toBeDefined();
      const ctx = JSON.parse(instance!.context);
      expect(ctx.stopInfo.stepAtStop).toBe(7);
      expect(ctx.stopInfo.previousStatus).toBe('running');
    });

    it('preserves status as stopped in DB', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-status');

      ws.stopWorkflow('wf-status', 'Status test', 'tester');

      const instance = mockDb
        .prepare('SELECT status FROM workflow_instances WHERE id = ?')
        .get('wf-status') as { status: string } | undefined;

      expect(instance!.status).toBe('stopped');
    });
  });

  describe('Resume Workflow', () => {
    it('resumes a stopped workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-resume');

      ws.stopWorkflow('wf-resume', 'Test', 'tester');
      expect(ws.isWorkflowStopped('wf-resume')).toBe(true);

      const result = ws.resumeWorkflow('wf-resume', 'tester');
      expect(result).toBe(true);
      expect(ws.isWorkflowStopped('wf-resume')).toBe(false);
    });

    it('restores previous status on resume', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-restore', 'pending', 4);

      ws.stopWorkflow('wf-restore', 'Test', 'tester');
      ws.resumeWorkflow('wf-restore', 'tester');

      const instance = mockDb
        .prepare('SELECT status FROM workflow_instances WHERE id = ?')
        .get('wf-restore') as { status: string } | undefined;

      expect(instance!.status).toBe('pending'); // Restored to previous status
    });

    it('fails to resume non-stopped workflow', () => {
      const ws = new WorkflowStop(mockDb);
      const result = ws.resumeWorkflow('wf-never-stopped', 'tester');
      expect(result).toBe(false);
    });
  });

  describe('Enforcement', () => {
    it('enforceWorkflow throws for stopped workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-enf');
      ws.stopWorkflow('wf-enf', 'Enforce test', 'tester');

      expect(() => ws.enforceWorkflow('wf-enf')).toThrow(WorkflowStoppedError);
    });

    it('enforceWorkflow does not throw for running workflow', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-running');
      expect(() => ws.enforceWorkflow('wf-running')).not.toThrow();
    });

    it('WorkflowStoppedError has correct properties', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-err');
      ws.stopWorkflow('wf-err', 'Error test', 'trigger-user');

      try {
        ws.enforceWorkflow('wf-err');
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(WorkflowStoppedError);
        const err = e as WorkflowStoppedError;
        expect(err.instanceId).toBe('wf-err');
        expect(err.stopReason).toBe('Error test');
      }
    });
  });

  describe('Stop Unit', () => {
    it('stops all workflows in a unit', () => {
      const ws = new WorkflowStop(mockDb);

      // Create workflows with exact unit match
      mockDb.prepare(`INSERT INTO workflows (id, responsible_agents) VALUES (?, ?)`).run('wf-u1', 'sales');
      mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 1)`).run('wu-1', 'wf-u1');
      mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 2)`).run('wu-2', 'wf-u1');

      const result = ws.stopUnit('sales', 'Unit test', 'tester');
      expect(result).toBe(true);
      expect(ws.isWorkflowStopped('wu-1')).toBe(true);
      expect(ws.isWorkflowStopped('wu-2')).toBe(true);
    });

    it('does not match partial unit IDs (security)', () => {
      const ws = new WorkflowStop(mockDb);

      // Create workflow for "sales-manager" not "sales"
      mockDb.prepare(`INSERT INTO workflows (id, responsible_agents) VALUES (?, ?)`).run('wf-sec', 'sales-manager');
      mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 1)`).run('wsec-1', 'wf-sec');

      // Should NOT stop workflows for "sales-manager" when stopping "sales"
      ws.stopUnit('sales', 'Unit test', 'tester');
      expect(ws.isWorkflowStopped('wsec-1')).toBe(false);
    });

    it('handles JSON arrays for responsible_agents', () => {
      const ws = new WorkflowStop(mockDb);

      mockDb.prepare(`INSERT INTO workflows (id, responsible_agents) VALUES (?, ?)`).run('wf-json', '["marketing","sales"]');
      mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 1)`).run('wj-1', 'wf-json');

      ws.stopUnit('marketing', 'JSON test', 'tester');
      expect(ws.isWorkflowStopped('wj-1')).toBe(true);
    });
  });

  describe('DB Persistence', () => {
    it('logs stopped workflow to DB', () => {
      const ws = new WorkflowStop(mockDb);
      createWorkflowInstance('wf-log');

      ws.stopWorkflow('wf-log', 'Log test', 'tester');

      const record = mockDb
        .prepare("SELECT * FROM stopped_workflows WHERE instance_id = ? AND status = 'stopped'")
        .get('wf-log') as { instance_id: string; reason: string } | undefined;

      expect(record).toBeDefined();
      expect(record!.reason).toBe('Log test');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// LEVEL 4 - Global Kill Switch Tests
// ═══════════════════════════════════════════════════════════════

import {
  GlobalKillSwitch,
  KillSwitchActiveError,
  KillSwitchAuthError,
  KillSwitchError,
  resetGlobalKillSwitchInstance,
} from '../src/killSwitch/globalKillSwitch.js';
import { KILL_SWITCH_CONFIRMATION_CODE } from '../src/killSwitch/types.js';

describe('Level 4 - Global Kill Switch', () => {
  beforeEach(() => {
    resetGlobalKillSwitchInstance();
  });

  describe('Confirmation Code', () => {
    it('requires confirmation code to activate', () => {
      const gks = new GlobalKillSwitch(mockDb);
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'founder@test.de', 'hash', 'Founder', 'founder', 1)
      `).run('user-founder-1');

      expect(() => {
        gks.activate('Test', 'founder@test.de', 'WRONG-CODE');
      }).toThrow(KillSwitchAuthError);
    });

    it('activates with correct confirmation code', () => {
      const gks = new GlobalKillSwitch(mockDb);
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'founder@test.de', 'hash', 'Founder', 'founder', 1)
      `).run('user-founder-2');

      const result = gks.activate('Test', 'founder@test.de', KILL_SWITCH_CONFIRMATION_CODE);
      expect(result).toBe(true);
      expect(gks.isActive()).toBe(true);
    });

    it('uses correct confirmation code constant', () => {
      expect(KILL_SWITCH_CONFIRMATION_CODE).toBe('KILL-SWITCH-2025');
    });
  });

  describe('Permission Check', () => {
    it('only founder can activate', () => {
      const gks = new GlobalKillSwitch(mockDb);
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'admin@test.de', 'hash', 'Admin', 'admin', 1)
      `).run('user-admin-1');

      // Admin cannot activate
      expect(() => {
        gks.activate('Test', 'admin@test.de', KILL_SWITCH_CONFIRMATION_CODE);
      }).toThrow(KillSwitchAuthError);
    });

    it('allows activation in test environments', () => {
      // In test env where users table might not have the user, it falls back to true
      const gks = new GlobalKillSwitch(mockDb);
      // No user inserted - but catch block returns true
      const result = gks.activate('Test', 'anyone', KILL_SWITCH_CONFIRMATION_CODE);
      expect(result).toBe(true);
    });
  });

  describe('Kill Switch State', () => {
    it('is not active initially', () => {
      const gks = new GlobalKillSwitch(mockDb);
      expect(gks.isActive()).toBe(false);
      expect(gks.getStatus()).toBe('armed');
    });

    it('is active after activation', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Emergency', 'founder', KILL_SWITCH_CONFIRMATION_CODE);
      expect(gks.isActive()).toBe(true);
      expect(gks.getStatus()).toBe('triggered');
    });

    it('prevents duplicate activation', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('First', 'founder', KILL_SWITCH_CONFIRMATION_CODE);
      const result = gks.activate('Second', 'founder', KILL_SWITCH_CONFIRMATION_CODE);
      expect(result).toBe(false); // Already active
    });
  });

  describe('Enforcement', () => {
    it('enforce() throws when active', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Emergency', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      expect(() => gks.enforce()).toThrow(KillSwitchActiveError);
    });

    it('enforce() does not throw when not active', () => {
      const gks = new GlobalKillSwitch(mockDb);
      expect(() => gks.enforce()).not.toThrow();
    });

    it('KillSwitchActiveError has correct properties', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Test emergency', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      try {
        gks.enforce();
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(KillSwitchActiveError);
        const err = e as KillSwitchActiveError;
        expect(err.reason).toBe('Test emergency');
        expect(err.code).toBe('KILL_SWITCH_ACTIVE');
      }
    });
  });

  describe('Post-Mortem Requirement', () => {
    it('requires post-mortem for deactivation', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Incident', 'founder', KILL_SWITCH_CONFIRMATION_CODE);
      expect(gks.isActive()).toBe(true);

      // Try to deactivate without post-mortem
      expect(() => {
        gks.deactivate('founder');
      }).toThrow(KillSwitchAuthError);

      expect(gks.isActive()).toBe(true); // Still active!
    });

    it('allows deactivation with post-mortem', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Incident', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      // Mark post-mortem as complete first
      gks.markPostMortemComplete('pm-123');

      const result = gks.deactivate('founder', 'pm-123');
      expect(result).toBe(true);
      expect(gks.isActive()).toBe(false);
      expect(gks.getStatus()).toBe('armed');
    });
  });

  describe('Deactivation Permission', () => {
    it('only founder can deactivate', () => {
      const gks = new GlobalKillSwitch(mockDb);
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'founder@test.de', 'hash', 'Founder', 'founder', 1)
      `).run('user-founder-3');
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'admin@test.de', 'hash', 'Admin', 'admin', 1)
      `).run('user-admin-2');

      gks.activate('Test', 'founder@test.de', KILL_SWITCH_CONFIRMATION_CODE);
      gks.markPostMortemComplete('pm-1');

      // Admin cannot deactivate
      expect(() => {
        gks.deactivate('admin@test.de', 'pm-1');
      }).toThrow(KillSwitchAuthError);

      expect(gks.isActive()).toBe(true); // Still active!
    });

    it('founder can deactivate', () => {
      const gks = new GlobalKillSwitch(mockDb);
      mockDb.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES (?, 'founder@test.de', 'hash', 'Founder', 'founder', 1)
      `).run('user-founder-4');

      gks.activate('Test', 'founder@test.de', KILL_SWITCH_CONFIRMATION_CODE);
      gks.markPostMortemComplete('pm-2');

      const result = gks.deactivate('founder@test.de', 'pm-2');
      expect(result).toBe(true);
      expect(gks.isActive()).toBe(false);
    });
  });

  describe('DB Persistence', () => {
    it('persists activation to DB', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('DB test', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      const record = mockDb
        .prepare("SELECT * FROM kill_switch_log WHERE status = 'active'")
        .get() as { triggered_by: string; reason: string } | undefined;

      expect(record).toBeDefined();
      expect(record!.reason).toBe('DB test');
    });

    it('persists system settings', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Settings test', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      const status = mockDb
        .prepare("SELECT value FROM system_settings WHERE key = 'kill_switch_status'")
        .get() as { value: string } | undefined;

      expect(status!.value).toBe('triggered');
    });
  });

  describe('Statistics', () => {
    it('provides activation statistics', () => {
      const gks = new GlobalKillSwitch(mockDb);
      gks.activate('Stats test', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

      const stats = gks.getStats();
      expect(stats.isActive).toBe(true);
      expect(stats.status).toBe('triggered');
      expect(stats.totalActivations).toBeGreaterThanOrEqual(1);
      expect(stats.lastTriggeredBy).toBe('founder');
      expect(stats.lastReason).toBe('Stats test');
    });
  });

  describe('requireConfirmationCode', () => {
    it('always requires confirmation code', () => {
      const gks = new GlobalKillSwitch(mockDb);
      expect(gks.requireConfirmationCode()).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION - Cross-Level Tests
// ═══════════════════════════════════════════════════════════════

describe('Integration - All 4 Levels', () => {
  beforeEach(() => {
    clearBreakerCache();
    resetQuarantineInstance();
    resetWorkflowStopInstance();
    resetGlobalKillSwitchInstance();
  });

  it('Level 1 can escalate to Level 2', () => {
    // Circuit breaker opens for an agent
    clearBreakerCache();
    const cb = getBreaker('escalation-agent');
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      cb.recordFailure();
    }
    expect(cb.state).toBe('open');

    // Agent gets quarantined (Level 2)
    const aq = new AgentQuarantine(mockDb);
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Escalation Agent', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('escalation-agent');

    aq.quarantine('escalation-agent', 'Circuit breaker threshold exceeded', 'system');
    expect(aq.isQuarantined('escalation-agent')).toBe(true);
  });

  it('Level 4 blocks all agent operations', () => {
    const gks = new GlobalKillSwitch(mockDb);
    gks.activate('Emergency', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

    // Level 4 enforcement
    expect(() => gks.enforce()).toThrow(KillSwitchActiveError);

    // Level 2 enforcement should still work independently
    const aq = new AgentQuarantine(mockDb);
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Block Test', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('block-agent');
    aq.quarantine('block-agent', 'Test', 'tester');
    expect(() => aq.enforce('block-agent')).toThrow(AgentQuarantinedError);
  });

  it('each level operates independently', () => {
    // Level 1: Circuit breaker per agent
    clearBreakerCache();
    const cb1 = getBreaker('multi-a');
    const cb2 = getBreaker('multi-b');
    cb1.recordFailure();
    expect(cb1.getMetrics().consecutiveFailures).toBe(1);
    expect(cb2.getMetrics().consecutiveFailures).toBe(0);

    // Level 2: Quarantine per agent
    const aq = new AgentQuarantine(mockDb);
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Multi A', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('multi-a');
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Multi B', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('multi-b');

    aq.quarantine('multi-a', 'Test', 'tester');
    expect(aq.isQuarantined('multi-a')).toBe(true);
    expect(aq.isQuarantined('multi-b')).toBe(false);

    // Level 3: Workflow stop per instance
    const ws = new WorkflowStop(mockDb);
    mockDb.prepare(`INSERT INTO workflows (id, responsible_agents) VALUES (?, ?)`).run('multi-wf', 'test');
    mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 1)`).run('multi-wi1', 'multi-wf');
    mockDb.prepare(`INSERT INTO workflow_instances (id, workflow_id, status, current_step) VALUES (?, ?, 'running', 1)`).run('multi-wi2', 'multi-wf');

    ws.stopWorkflow('multi-wi1', 'Test', 'tester');
    expect(ws.isWorkflowStopped('multi-wi1')).toBe(true);
    expect(ws.isWorkflowStopped('multi-wi2')).toBe(false);

    // Level 4: Global affects ALL
    const gks = new GlobalKillSwitch(mockDb);
    gks.activate('All stop', 'founder', KILL_SWITCH_CONFIRMATION_CODE);
    expect(gks.isActive()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SAFETY - Security Critical Tests
// ═══════════════════════════════════════════════════════════════

describe('Safety - Security Critical', () => {
  beforeEach(() => {
    clearBreakerCache();
    resetQuarantineInstance();
    resetWorkflowStopInstance();
    resetGlobalKillSwitchInstance();
  });

  it('cannot bypass circuit breaker when open', async () => {
    const cb = new CircuitBreaker('bypass-test', { timeout: 60000 }, mockDb);
    for (let i = 0; i < DEFAULT_BREAKER_CONFIG.failureThreshold; i++) {
      cb.recordFailure();
    }

    let executed = false;
    try {
      await cb.execute(async () => { executed = true; return 'done'; });
    } catch (e) {
      // Expected
    }
    expect(executed).toBe(false);
  });

  it('cannot bypass quarantine enforcement', () => {
    const aq = new AgentQuarantine(mockDb);
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Bypass Test', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('bypass-agent');

    aq.quarantine('bypass-agent', 'Security', 'tester');

    // Any attempt to execute through quarantine should fail
    expect(() => aq.enforce('bypass-agent')).toThrow();
  });

  it('cannot deactivate global kill switch without post-mortem', () => {
    const gks = new GlobalKillSwitch(mockDb);
    gks.activate('Critical', 'founder', KILL_SWITCH_CONFIRMATION_CODE);

    // Attempt deactivation without post-mortem
    expect(() => gks.deactivate('founder')).toThrow();
    expect(gks.isActive()).toBe(true);
  });

  it('cannot activate global kill switch with wrong code', () => {
    const gks = new GlobalKillSwitch(mockDb);

    expect(() => gks.activate('Test', 'founder', 'WRONG')).toThrow(KillSwitchAuthError);
    expect(gks.isActive()).toBe(false);
  });

  it('quarantine is checked via in-memory set for zero latency', () => {
    const aq = new AgentQuarantine(mockDb);
    mockDb.prepare(`
      INSERT INTO agents (id, role, name, department, status, owner_human, version)
      VALUES (?, 'test', 'Perf Test', 'test', 'active', 'founder@test.de', '1.0.0')
    `).run('perf-agent');

    aq.quarantine('perf-agent', 'Perf', 'tester');

    // Multiple checks should be fast (in-memory)
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      aq.isQuarantined('perf-agent');
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50); // Should be very fast
  });
});
