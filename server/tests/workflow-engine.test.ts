// ═══════════════════════════════════════════════════════════════
// Workflow Engine - Comprehensive Test Suite
// Tests: State Machine, Gates, Events, Runner, Engine, Landingpage Workflow
// ═══════════════════════════════════════════════════════════════

import { testDb } from './setup.js';

import {
  WorkflowEngine,
  StateMachine,
  EventBus,
  GateRegistry,
  GateEvaluator,
  EngineError,
  StateTransitionError,
  WorkflowRunner,
  getWorkflowEngine,
  getStateMachine,
  getEventBus,
  getGateRegistry,
  getGateEvaluator,
  createRunner,
  resetEngine,
  resetEventBus,
  resetGates,
} from '../src/workflowEngine/index.js';

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

function seedWorkflow(
  workflowId: string = 'test-workflow',
  steps: Array<Record<string, unknown>> = [],
  opts: { status?: string; category?: string; name?: string } = {}
): void {
  // Clean up
  try { testDb.prepare(`DELETE FROM workflow_instances WHERE workflow_id = '${workflowId}'`).run(); } catch { /* ignore */ }
  try { testDb.prepare(`DELETE FROM workflows WHERE id = '${workflowId}'`).run(); } catch { /* ignore */ }

  testDb.prepare(`
    INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workflowId,
    opts.name ?? 'Test Workflow',
    opts.category ?? 'test',
    'A test workflow',
    'test-agent',
    '{"budget": 1000}',
    '{"result": true}',
    1,
    0,
    opts.status ?? 'active',
    90,
    '1h',
    JSON.stringify(steps.length > 0 ? steps : [
      { id: 'step-1', name: 'Requirement Analysis', agent: 'cpo-agent', status: 'pending', blockingGate: false, input: 'requirements', output: 'analysis' },
      { id: 'step-2', name: 'Design Draft', agent: 'brand-agent', status: 'pending', blockingGate: false, input: 'analysis', output: 'design' },
      { id: 'step-3', name: 'Development', agent: 'cto-agent', status: 'pending', blockingGate: false, input: 'design', output: 'code' },
      { id: 'step-4', name: 'QA Review', agent: 'qa-agent', status: 'pending', blockingGate: true, input: 'code', output: 'review' },
      { id: 'step-5', name: 'Customer Review', agent: 'support-agent', status: 'pending', blockingGate: false, input: 'review', output: 'feedback' },
      { id: 'step-6', name: 'Deployment', agent: 'cto-agent', status: 'pending', blockingGate: true, input: 'feedback', output: 'deployed' },
    ])
  );
}

function seedLandingpageWorkflow(): void {
  const steps = [
    { id: 's1', name: 'Lead Intake', description: 'Qualify lead and requirements', agent: 'Sales-Agent', status: 'pending', blockingGate: false, input: 'Lead data', output: 'Qualified brief' },
    { id: 's2', name: 'Offer Creation', description: 'Create offer and proposal', agent: 'Sales-Agent', status: 'pending', blockingGate: false, input: 'Brief', output: 'Offer doc' },
    { id: 's3', name: 'Contract Approval', description: 'Legal review and approval', agent: 'CLO-Agent', status: 'pending', blockingGate: true, input: 'Offer doc', output: 'Approved contract' },
    { id: 's4', name: 'Landingpage Build', description: 'Build the landing page', agent: 'Marketing-Agent', status: 'pending', blockingGate: false, input: 'Contract', output: 'Landing page' },
    { id: 's5', name: 'QA Review', description: 'Quality check', agent: 'QA-Agent', status: 'pending', blockingGate: true, input: 'Landing page', output: 'QA approval' },
    { id: 's6', name: 'Deployment', description: 'Go live', agent: 'CTO-Agent', status: 'pending', blockingGate: true, input: 'QA approval', output: 'Live page' },
  ];
  seedWorkflow('wf-001', steps, { name: 'Landingpage in 48h', category: 'Sales' });
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

describe('Workflow Engine - Comprehensive', () => {
  beforeEach(() => {
    resetEngine();
    resetEventBus();
    resetGates();
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. State Machine Tests
  // ═══════════════════════════════════════════════════════════════

  describe('StateMachine', () => {
    let sm: StateMachine;

    beforeEach(() => {
      sm = getStateMachine();
    });

    it('defines all six states', () => {
      const states = ['pending', 'in_progress', 'completed', 'blocked', 'skipped', 'failed'];
      for (const s of states) {
        expect(sm.isTerminal(s as any)).toBeDefined();
      }
    });

    it('has correct allowed transitions from pending', () => {
      expect(sm.canTransition('pending', 'in_progress')).toBe(true);
      expect(sm.canTransition('pending', 'blocked')).toBe(true);
      expect(sm.canTransition('pending', 'skipped')).toBe(true);
      expect(sm.canTransition('pending', 'completed')).toBe(false);
      expect(sm.canTransition('pending', 'failed')).toBe(false);
    });

    it('has correct allowed transitions from in_progress', () => {
      expect(sm.canTransition('in_progress', 'completed')).toBe(true);
      expect(sm.canTransition('in_progress', 'blocked')).toBe(true);
      expect(sm.canTransition('in_progress', 'failed')).toBe(true);
      expect(sm.canTransition('in_progress', 'skipped')).toBe(true);
      expect(sm.canTransition('in_progress', 'pending')).toBe(false);
    });

    it('has correct allowed transitions from blocked', () => {
      expect(sm.canTransition('blocked', 'in_progress')).toBe(true);
      expect(sm.canTransition('blocked', 'skipped')).toBe(true);
      expect(sm.canTransition('blocked', 'failed')).toBe(true);
      expect(sm.canTransition('blocked', 'pending')).toBe(false);
      expect(sm.canTransition('blocked', 'completed')).toBe(false);
    });

    it('has correct allowed transitions from failed', () => {
      expect(sm.canTransition('failed', 'in_progress')).toBe(true);
      expect(sm.canTransition('failed', 'skipped')).toBe(true);
      expect(sm.canTransition('failed', 'pending')).toBe(false);
      expect(sm.canTransition('failed', 'completed')).toBe(false);
    });

    it('identifies terminal states correctly', () => {
      expect(sm.isTerminal('completed')).toBe(true);
      expect(sm.isTerminal('skipped')).toBe(true);
      expect(sm.isTerminal('pending')).toBe(false);
      expect(sm.isTerminal('in_progress')).toBe(false);
      expect(sm.isTerminal('blocked')).toBe(false);
      expect(sm.isTerminal('failed')).toBe(false);
    });

    it('blocks invalid transitions with error', async () => {
      const states = sm.initializeStepStates(2);
      // states[0] starts as 'in_progress' - try an invalid transition
      await sm.performTransition(states[0]!, 'completed');
      await expect(
        sm.performTransition(states[0]!, 'in_progress')
      ).rejects.toThrow(StateTransitionError);
    });

    it('allows same-state transitions as no-op', () => {
      expect(sm.canTransition('pending', 'pending')).toBe(true);
      expect(sm.canTransition('completed', 'completed')).toBe(true);
    });

    it('initializes first step as in_progress and rest as pending', () => {
      const states = sm.initializeStepStates(4);
      expect(states).toHaveLength(4);
      expect(states[0]?.state).toBe('in_progress');
      expect(states[1]?.state).toBe('pending');
      expect(states[2]?.state).toBe('pending');
      expect(states[3]?.state).toBe('pending');
    });

    it('calculates progress correctly', () => {
      const states = sm.initializeStepStates(4);
      const instance: any = { stepStates: states };
      expect(sm.getProgress(instance)).toBe(0);

      states[0]!.state = 'completed';
      expect(sm.getProgress(instance)).toBe(25);

      states[1]!.state = 'completed';
      states[2]!.state = 'skipped';
      expect(sm.getProgress(instance)).toBe(75);

      states[3]!.state = 'completed';
      expect(sm.getProgress(instance)).toBe(100);
    });

    it('detects completion when all steps are terminal', () => {
      const states = sm.initializeStepStates(3);
      const instance: any = { stepStates: states };
      expect(sm.isComplete(instance)).toBe(false);

      states[0]!.state = 'completed';
      states[1]!.state = 'skipped';
      states[2]!.state = 'completed';
      expect(sm.isComplete(instance)).toBe(true);
    });

    it('performTransition sets completedAt for terminal states', async () => {
      const states = sm.initializeStepStates(1);
      await sm.performTransition(states[0]!, 'completed');
      expect(states[0]?.completedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Gate Tests
  // ═══════════════════════════════════════════════════════════════

  describe('GateRegistry', () => {
    let registry: GateRegistry;

    beforeEach(() => {
      registry = getGateRegistry();
    });

    it('registers a gate with closed status by default', () => {
      const entry = registry.register('wi-1', 0, 'approval', 'Need approval');
      expect(entry.status).toBe('closed');
      expect(entry.instanceId).toBe('wi-1');
      expect(entry.stepIndex).toBe(0);
      expect(entry.gateType).toBe('approval');
    });

    it('opens a registered gate', () => {
      registry.register('wi-1', 0, 'approval');
      const success = registry.open('wi-1', 0, 'approval', 'ceo');
      expect(success).toBe(true);
      expect(registry.isOpen('wi-1', 0, 'approval')).toBe(true);
      expect(registry.getStatus('wi-1', 0, 'approval')).toBe('open');
    });

    it('returns false when opening non-existent gate', () => {
      const success = registry.open('wi-1', 0, 'approval', 'ceo');
      expect(success).toBe(false);
    });

    it('closes an open gate', () => {
      registry.register('wi-1', 0, 'approval');
      registry.open('wi-1', 0, 'approval');
      const success = registry.close('wi-1', 0, 'approval', 'Re-blocked');
      expect(success).toBe(true);
      expect(registry.isOpen('wi-1', 0, 'approval')).toBe(false);
      expect(registry.isBlocking('wi-1', 0, 'approval')).toBe(true);
    });

    it('overrides a gate to force open', () => {
      registry.register('wi-1', 0, 'approval');
      const success = registry.override('wi-1', 0, 'approval', 'founder');
      expect(success).toBe(true);
      expect(registry.getStatus('wi-1', 0, 'approval')).toBe('overridden');
      expect(registry.isOpen('wi-1', 0, 'approval')).toBe(true);
    });

    it('detects when all gates for a step are open', () => {
      registry.register('wi-1', 0, 'approval');
      registry.register('wi-1', 0, 'safety');
      expect(registry.allGatesOpen('wi-1', 0)).toBe(false);

      registry.open('wi-1', 0, 'approval');
      expect(registry.allGatesOpen('wi-1', 0)).toBe(false);

      registry.open('wi-1', 0, 'safety');
      expect(registry.allGatesOpen('wi-1', 0)).toBe(true);
    });

    it('returns true for allGatesOpen when no gates exist', () => {
      expect(registry.allGatesOpen('wi-1', 0)).toBe(true);
    });

    it('clears all gates for an instance', () => {
      registry.register('wi-1', 0, 'approval');
      registry.register('wi-1', 1, 'safety');
      registry.register('wi-2', 0, 'budget');
      registry.clearInstance('wi-1');
      expect(registry.getInstanceGates('wi-1')).toHaveLength(0);
      expect(registry.getInstanceGates('wi-2')).toHaveLength(1);
    });

    it('sets gate to pending status', () => {
      registry.register('wi-1', 0, 'approval');
      registry.setPending('wi-1', 0, 'approval', 'Waiting for external approval');
      expect(registry.getStatus('wi-1', 0, 'approval')).toBe('pending');
      expect(registry.isBlocking('wi-1', 0, 'approval')).toBe(true);
    });
  });

  describe('GateEvaluator', () => {
    let evaluator: GateEvaluator;
    let registry: GateRegistry;

    beforeEach(() => {
      evaluator = getGateEvaluator();
      registry = getGateRegistry();
    });

    it('allows passage when no gate is configured', async () => {
      const result = await evaluator.evaluateStepGates({
        instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
        step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
        context: {}, previousResults: [],
      });
      expect(result.blocking).toBe(false);
      expect(result.status).toBe('open');
    });

    it('Approval Gate: blocks when closed', async () => {
      registry.register('wi-1', 0, 'approval');
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'approval', required: true }
      );
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('approval');
    });

    it('Approval Gate: passes when open', async () => {
      registry.register('wi-1', 0, 'approval');
      registry.open('wi-1', 0, 'approval', 'ceo');
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'approval', required: true }
      );
      expect(result.blocking).toBe(false);
      expect(result.status).toBe('open');
    });

    it('Approval Gate: blocks on red line', async () => {
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'approval', required: true, metadata: { redLine: true } }
      );
      expect(result.blocking).toBe(true);
      expect(result.reason).toContain('RED LINE');
      expect(result.metadata).toEqual({ redLine: true });
    });

    it('Safety Gate: blocks when veto is active', async () => {
      registry.register('wi-1', 0, 'safety', 'Veto active', { vetoActive: true, vetoBy: 'safety-agent' });
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'safety', required: true }
      );
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('safety');
      expect(result.reason).toContain('Safety veto');
    });

    it('Safety Gate: passes when open', async () => {
      registry.register('wi-1', 0, 'safety');
      registry.open('wi-1', 0, 'safety', 'safety-agent');
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'safety', required: true }
      );
      expect(result.blocking).toBe(false);
      expect(result.reason).toBe('Safety veto lifted');
    });

    it('Budget Gate: blocks when budget exceeds critical threshold', async () => {
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: { budget: 1500 }, previousResults: [] },
        { type: 'budget', required: true, threshold: 1000, metadata: { warningAt: 70, criticalAt: 90 } }
      );
      expect(result.gateType).toBe('budget');
      expect(result.reason).toContain('CRITICAL');
      expect(result.metadata?.usagePercent).toBe(150);
    });

    it('Budget Gate: warns at warning threshold', async () => {
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: { budget: 800 }, previousResults: [] },
        { type: 'budget', required: true, threshold: 1000, metadata: { warningAt: 70, criticalAt: 90 } }
      );
      expect(result.status).toBe('pending');
      expect(result.reason).toContain('WARNING');
      expect(result.metadata?.usagePercent).toBe(80);
    });

    it('Budget Gate: passes when under threshold', async () => {
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: { budget: 500 }, previousResults: [] },
        { type: 'budget', required: true, threshold: 1000, metadata: { warningAt: 70, criticalAt: 90 } }
      );
      expect(result.status).toBe('closed');
      expect(result.blocking).toBe(true); // Still blocking because gate not explicitly opened
    });

    it('Time Gate: blocks when target time not reached', async () => {
      const futureTime = new Date(Date.now() + 86400000).toISOString(); // tomorrow
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'time', required: true, metadata: { targetTime: futureTime } }
      );
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('time');
      expect(result.reason).toContain('waiting until');
    });

    it('Time Gate: auto-opens when target time is reached', async () => {
      const pastTime = new Date(Date.now() - 86400000).toISOString(); // yesterday
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'time', required: true, metadata: { targetTime: pastTime } }
      );
      expect(result.blocking).toBe(false);
      expect(result.status).toBe('open');
    });

    it('Human Gate: blocks without human approval', async () => {
      const result = await evaluator.evaluateGate(
        { instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 0,
          step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {}, previousResults: [] },
        { type: 'human', required: true, approvers: ['founder'] }
      );
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('human');
      expect(result.reason).toBe('Human review required');
      expect(result.metadata?.approvers).toEqual(['founder']);
    });

    it('activates and lifts safety veto', () => {
      evaluator.activateSafetyVeto('wi-1', 0, 'safety-agent', 'Critical risk detected');
      expect(registry.isBlocking('wi-1', 0, 'safety')).toBe(true);

      evaluator.liftSafetyVeto('wi-1', 0, 'founder');
      expect(registry.isOpen('wi-1', 0, 'safety')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Event System Tests
  // ═══════════════════════════════════════════════════════════════

  describe('EventBus', () => {
    let bus: EventBus;

    beforeEach(() => {
      bus = getEventBus();
      bus.clear();
    });

    it('subscribes and receives events', () => {
      const handler = jest.fn();
      bus.on('step_started', handler);

      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1',
      }));
    });

    it('supports all 16 event types', () => {
      const eventTypes = [
        'step_started', 'step_completed', 'step_blocked', 'step_failed', 'step_skipped',
        'gate_opened', 'gate_closed', 'gate_check',
        'workflow_started', 'workflow_completed', 'workflow_cancelled',
        'workflow_paused', 'workflow_resumed', 'workflow_failed', 'timeout_escalation',
      ];

      for (const eventType of eventTypes) {
        const handler = jest.fn();
        bus.on(eventType, handler);
        bus.emit({ type: eventType as any, instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
        expect(handler).toHaveBeenCalledTimes(1);
        bus.offAll(eventType);
      }
    });

    it('supports once handlers (auto-remove after first call)', () => {
      const handler = jest.fn();
      bus.once('step_completed', handler);

      bus.emit({ type: 'step_completed', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      bus.emit({ type: 'step_completed', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports wildcard listeners', () => {
      const handler = jest.fn();
      bus.onAny(handler);

      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      bus.emit({ type: 'step_completed', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      bus.emit({ type: 'gate_opened', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('supports removing specific handlers', () => {
      const handler = jest.fn();
      bus.on('step_started', handler);
      bus.off('step_started', handler);

      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      expect(handler).not.toHaveBeenCalled();
    });

    it('supports removing wildcard handlers', () => {
      const handler = jest.fn();
      bus.onAny(handler);
      bus.offAny(handler);

      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      expect(handler).not.toHaveBeenCalled();
    });

    it('clears all handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.on('step_started', handler1);
      bus.onAny(handler2);

      bus.clear();

      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('tracks listener counts correctly', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      bus.on('step_started', h1);
      bus.on('step_started', h2);
      bus.once('step_completed', jest.fn());
      bus.onAny(jest.fn());

      expect(bus.listenerCount('step_started')).toBe(2);
      expect(bus.listenerCount('step_completed')).toBe(1);
      expect(bus.wildcardListenerCount()).toBe(1);
    });

    it('handles handler errors gracefully without crashing', async () => {
      const errorHandler = jest.fn().mockImplementation(() => { throw new Error('Handler crash'); });
      const goodHandler = jest.fn();
      bus.on('step_started', errorHandler);
      bus.on('step_started', goodHandler);

      // Should not throw
      bus.emit({ type: 'step_started', instanceId: 'wi-1', workflowId: 'wf-1', timestamp: new Date() });

      await new Promise((r) => setTimeout(r, 10));
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(goodHandler).toHaveBeenCalledTimes(1);
    });

    it('fires step_blocked events with correct data', () => {
      const handler = jest.fn();
      bus.on('step_blocked', handler);

      bus.emit({
        type: 'step_blocked', instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 3,
        timestamp: new Date(),
        data: { stepName: 'QA Review', gateType: 'approval', reason: 'Approval required' },
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'step_blocked', stepIndex: 3,
        data: expect.objectContaining({ stepName: 'QA Review', gateType: 'approval' }),
      }));
    });

    it('fires gate_opened events with opener info', () => {
      const handler = jest.fn();
      bus.on('gate_opened', handler);

      bus.emit({
        type: 'gate_opened', instanceId: 'wi-1', workflowId: 'wf-1', stepIndex: 3,
        timestamp: new Date(),
        data: { gateType: 'approval', openedBy: 'ceo' },
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ openedBy: 'ceo' }),
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Runner Tests
  // ═══════════════════════════════════════════════════════════════

  describe('WorkflowRunner', () => {
    beforeEach(() => {
      seedWorkflow();
    });

    it('creates runner with custom config', () => {
      const runner = createRunner({ pollIntervalMs: 500, maxRetries: 5 });
      const stats = runner.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.pendingTimeouts).toBe(0);
    });

    it('starts and stops the runner', () => {
      const runner = createRunner({ pollIntervalMs: 500 });
      runner.start();
      expect(runner.isActive()).toBe(true);

      runner.stop();
      expect(runner.isActive()).toBe(false);
    });

    it('tracks stats correctly', async () => {
      const runner = createRunner({ pollIntervalMs: 500 });
      const stats = runner.getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.pendingTimeouts).toBe(0);
      expect(stats.config.pollIntervalMs).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Engine Tests
  // ═══════════════════════════════════════════════════════════════

  describe('WorkflowEngine', () => {
    beforeEach(() => {
      seedWorkflow();
    });

    it('starts a workflow instance', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { customerId: 'C-001', studioName: 'Test Studio' });

      expect(instance).toBeDefined();
      expect(instance.id).toMatch(/^wi-\d+/);
      expect(instance.workflowId).toBe('test-workflow');
      expect(instance.status).toBe('running');
      expect(instance.context.customerId).toBe('C-001');
      expect(instance.stepStates).toHaveLength(6);
      expect(instance.stepStates[0]?.state).toBe('in_progress');
      expect(instance.auditLog).toHaveLength(1);
      expect(instance.auditLog[0]?.action).toBe('WORKFLOW_STARTED');
    });

    it('throws for non-existent workflow', async () => {
      const engine = getWorkflowEngine();
      await expect(engine.start('non-existent')).rejects.toThrow(EngineError);
      await expect(engine.start('non-existent')).rejects.toThrow('Workflow not found');
    });

    it('throws for inactive workflow', async () => {
      seedWorkflow('inactive-wf', [], { status: 'draft' });
      const engine = getWorkflowEngine();
      await expect(engine.start('inactive-wf')).rejects.toThrow('Workflow is not active');
    });

    it('executes steps in order', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      // Step 0
      const result0 = await engine.executeStep(instance.id, 0);
      expect(result0.state).toBe('completed');
      expect(result0.stepIndex).toBe(0);

      // Step 1
      const result1 = await engine.executeStep(instance.id, 1);
      expect(result1.state).toBe('completed');
      expect(result1.stepIndex).toBe(1);

      // Step 2
      const result2 = await engine.executeStep(instance.id, 2);
      expect(result2.state).toBe('completed');
      expect(result2.stepIndex).toBe(2);
    });

    it('blocks at approval gates', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      // Execute steps 0, 1, 2
      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.executeStep(instance.id, 2);

      // Step 3 has blockingGate - should block
      const result = await engine.executeStep(instance.id, 3);
      expect(result.state).toBe('blocked');

      const status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('blocked');
      expect(status.currentStepState).toBe('blocked');
    });

    it('completes step after gate is opened', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.executeStep(instance.id, 2);

      // Block first
      const blockedResult = await engine.executeStep(instance.id, 3);
      expect(blockedResult.state).toBe('blocked');

      // Open gate and retry
      await engine.openGate(instance.id, 3, 'approval', 'ceo');
      const result = await engine.executeStep(instance.id, 3);
      expect(result.state).toBe('completed');
    });

    it('fires events on state change', async () => {
      const engine = getWorkflowEngine();
      const bus = getEventBus();
      const events: any[] = [];

      bus.onAny((e) => { events.push(e); });

      const instance = await engine.start('test-workflow');
      await engine.executeStep(instance.id, 0);

      // Should have fired: workflow_started, step_started, step_completed
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.some((e) => e.type === 'workflow_started')).toBe(true);
      expect(events.some((e) => e.type === 'step_started')).toBe(true);
      expect(events.some((e) => e.type === 'step_completed')).toBe(true);
    });

    it('fires step_blocked event when gate blocks', async () => {
      const engine = getWorkflowEngine();
      const bus = getEventBus();
      const blockedEvents: any[] = [];

      bus.on('step_blocked', (e) => { blockedEvents.push(e); });

      const instance = await engine.start('test-workflow');
      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.executeStep(instance.id, 2);
      await engine.executeStep(instance.id, 3);

      expect(blockedEvents.length).toBe(1);
      expect(blockedEvents[0]?.stepIndex).toBe(3);
      expect(blockedEvents[0]?.data?.gateType).toBe('approval');
    });

    it('pauses and resumes workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      await engine.pause(instance.id);
      let status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('paused');

      // Should not be able to execute while paused
      await expect(engine.executeStep(instance.id, 0)).rejects.toThrow('Workflow is paused');

      await engine.resume(instance.id);
      status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('running');
    });

    it('fires pause/resume events', async () => {
      const engine = getWorkflowEngine();
      const bus = getEventBus();
      const pauseEvents: any[] = [];
      const resumeEvents: any[] = [];

      bus.on('workflow_paused', (e) => { pauseEvents.push(e); });
      bus.on('workflow_resumed', (e) => { resumeEvents.push(e); });

      const instance = await engine.start('test-workflow');
      await engine.pause(instance.id);
      await engine.resume(instance.id);

      expect(pauseEvents.length).toBe(1);
      expect(pauseEvents[0]?.instanceId).toBe(instance.id);
      expect(resumeEvents.length).toBe(1);
      expect(resumeEvents[0]?.instanceId).toBe(instance.id);
    });

    it('cancels workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      await engine.cancel(instance.id, 'Test cancellation');
      const status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('cancelled');

      // Should not be able to execute after cancel
      await expect(engine.executeStep(instance.id, 0)).rejects.toThrow('Workflow is cancelled');
    });

    it('fires cancel event', async () => {
      const engine = getWorkflowEngine();
      const bus = getEventBus();
      const cancelEvents: any[] = [];

      bus.on('workflow_cancelled', (e) => { cancelEvents.push(e); });

      const instance = await engine.start('test-workflow');
      await engine.cancel(instance.id, 'User cancelled');

      expect(cancelEvents.length).toBe(1);
      expect(cancelEvents[0]?.data?.reason).toBe('User cancelled');
    });

    it('writes audit log for each step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      // Has initial WORKFLOW_STARTED entry
      expect(instance.auditLog.length).toBeGreaterThanOrEqual(1);
      expect(instance.auditLog[0]?.action).toBe('WORKFLOW_STARTED');

      // Execute step adds entries
      const beforeCount = instance.auditLog.length;
      await engine.executeStep(instance.id, 0);
      expect(instance.auditLog.length).toBeGreaterThan(beforeCount);

      // Check for step-related audit entries
      const stepActions = instance.auditLog.filter((e) =>
        e.action.includes('STEP')
      );
      expect(stepActions.length).toBeGreaterThan(0);
    });

    it('skips a step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');
      const result = await engine.skipStep(instance.id, 1, 'Skip for testing');

      expect(result.state).toBe('skipped');
      expect(result.stepIndex).toBe(1);

      const status = engine.getInstanceStatus(instance.id);
      expect(status.stepStates[1]?.state).toBe('skipped');
    });

    it('retries a failed step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      // Manually set step to failed
      const stepState = instance.stepStates[0]!;
      stepState.state = 'failed';
      stepState.retryCount = 1;

      const result = await engine.retryStep(instance.id, 0);
      expect(result.state).toBe('completed');
    });

    it('gets correct instance status', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');
      const status = engine.getInstanceStatus(instance.id);

      expect(status.workflowId).toBe('test-workflow');
      expect(status.workflowName).toBe('Test Workflow');
      expect(status.totalSteps).toBe(6);
      expect(status.progressPercent).toBe(0);
      expect(status.currentStepName).toBeDefined();
    });

    it('tracks progress correctly', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      let status = engine.getInstanceStatus(instance.id);
      expect(status.progressPercent).toBe(0);

      await engine.executeStep(instance.id, 0);
      status = engine.getInstanceStatus(instance.id);
      expect(status.progressPercent).toBeGreaterThan(0);
    });

    it('checks gate status', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow');

      // Step 0 has no gate
      const gateResult0 = await engine.checkGate(instance.id, 0);
      expect(gateResult0.blocking).toBe(false);

      // Step 3 has blockingGate
      const gateResult3 = await engine.checkGate(instance.id, 3);
      expect(gateResult3.blocking).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Landingpage Workflow Tests (wf-001)
  // ═══════════════════════════════════════════════════════════════

  describe('Landingpage Workflow (wf-001)', () => {
    beforeEach(() => {
      seedLandingpageWorkflow();
    });

    it('starts the landingpage workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001', { leadId: 'lead-42', studio: 'Studio Cedar' });

      expect(instance.workflowId).toBe('wf-001');
      expect(instance.status).toBe('running');
      expect(instance.context.leadId).toBe('lead-42');
      expect(instance.stepStates).toHaveLength(6);
      expect(instance.stepStates[0]?.stepId).toBe('s1');
    });

    it('executes non-gated steps (Lead Intake, Offer Creation)', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      // Step 0: Lead Intake (no gate)
      const r0 = await engine.executeStep(instance.id, 0);
      expect(r0.state).toBe('completed');
      expect(r0.stepId).toBe('s1');

      // Step 1: Offer Creation (no gate)
      const r1 = await engine.executeStep(instance.id, 1);
      expect(r1.state).toBe('completed');
      expect(r1.stepId).toBe('s2');
    });

    it('blocks at Contract Approval gate (step 2)', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);

      // Step 2: Contract Approval (blockingGate)
      const r2 = await engine.executeStep(instance.id, 2);
      expect(r2.state).toBe('blocked');
      expect(r2.stepId).toBe('s3');
    });

    it('completes Contract Approval after gate opened', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);

      // Block first
      const blocked = await engine.executeStep(instance.id, 2);
      expect(blocked.state).toBe('blocked');

      // Open gate and complete
      await engine.openGate(instance.id, 2, 'approval', 'clo-agent');
      const result = await engine.executeStep(instance.id, 2);
      expect(result.state).toBe('completed');
      expect(result.stepId).toBe('s3');
    });

    it('blocks at QA Review gate (step 4) after Landingpage Build', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      // Execute steps 0-3 (with gate opened for step 2)
      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.openGate(instance.id, 2, 'approval', 'clo-agent');
      await engine.executeStep(instance.id, 2);
      await engine.executeStep(instance.id, 3);

      // Step 4: QA Review (blockingGate)
      const r4 = await engine.executeStep(instance.id, 4);
      expect(r4.state).toBe('blocked');
      expect(r4.stepId).toBe('s5');
    });

    it('blocks at Deployment gate (step 5) after QA', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      // Execute steps 0-3
      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.openGate(instance.id, 2, 'approval', 'clo-agent');
      await engine.executeStep(instance.id, 2);
      await engine.executeStep(instance.id, 3);

      // Open QA gate and execute QA
      await engine.openGate(instance.id, 4, 'approval', 'qa-agent');
      await engine.executeStep(instance.id, 4);

      // Step 5: Deployment (blockingGate)
      const r5 = await engine.executeStep(instance.id, 5);
      expect(r5.state).toBe('blocked');
      expect(r5.stepId).toBe('s6');
    });

    it('completes full landingpage workflow when all gates opened', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      // Execute all steps, opening gates as needed
      await engine.executeStep(instance.id, 0); // Lead Intake
      await engine.executeStep(instance.id, 1); // Offer Creation

      await engine.openGate(instance.id, 2, 'approval', 'clo-agent');
      await engine.executeStep(instance.id, 2); // Contract Approval

      await engine.executeStep(instance.id, 3); // Landingpage Build

      await engine.openGate(instance.id, 4, 'approval', 'qa-agent');
      await engine.executeStep(instance.id, 4); // QA Review

      await engine.openGate(instance.id, 5, 'approval', 'cto-agent');
      await engine.executeStep(instance.id, 5); // Deployment

      // Check completion
      const status = engine.getInstanceStatus(instance.id);
      expect(status.progressPercent).toBe(100);
      expect(status.stepStates.every((s) => s.state === 'completed')).toBe(true);
    });

    it('fires correct events throughout landingpage workflow', async () => {
      const engine = getWorkflowEngine();
      const bus = getEventBus();
      const events: any[] = [];
      bus.onAny((e) => { events.push({ type: e.type, stepIndex: e.stepIndex }); });


      const instance = await engine.start('wf-001');
      await engine.executeStep(instance.id, 0);

      // Check events
      expect(events.some((e) => e.type === 'workflow_started')).toBe(true);
      expect(events.some((e) => e.type === 'step_started' && e.stepIndex === 0)).toBe(true);
      expect(events.some((e) => e.type === 'step_completed' && e.stepIndex === 0)).toBe(true);
    });

    it('cancels landingpage workflow mid-process', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);

      await engine.cancel(instance.id, 'Lead lost interest');

      const status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('cancelled');
    });

    it('pauses and resumes landingpage workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      await engine.executeStep(instance.id, 0);
      await engine.pause(instance.id);

      let status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('paused');

      await engine.resume(instance.id);
      status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('running');
    });

    it('skips Contract Approval step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('wf-001');

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);

      const result = await engine.skipStep(instance.id, 2, 'Skip contract for internal project');
      expect(result.state).toBe('skipped');

      const status = engine.getInstanceStatus(instance.id);
      expect(status.stepStates[2]?.state).toBe('skipped');
    });
  });
});
