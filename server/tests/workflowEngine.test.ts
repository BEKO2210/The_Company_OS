// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine Tests
// ═══════════════════════════════════════════════════════════════

// Import setup first to get shared testDb and have schema initialized
import { testDb, initSchema } from './setup.js';

// ─── Now import engine modules ───
import {
  WorkflowEngine,
  StateMachine,
  EventBus,
  GateRegistry,
  GateEvaluator,
  TriggerRegistry,
  EngineError,
  getWorkflowEngine,
  getStateMachine,
  getEventBus,
  getGateRegistry,
  getGateEvaluator,
  getTriggerRegistry,
  createRunner,
  resetEngine,
  resetEventBus,
  resetGates,
  resetTriggers,
} from '../src/workflowEngine/index.js';

// ─── Test Helpers ───

function seedWorkflow(steps: Array<Record<string, unknown>> = []): void {
  // Clean up any leftover data from previous tests
  try { testDb.prepare("DELETE FROM workflow_instances WHERE workflow_id = 'test-workflow'").run(); } catch { /* ignore */ }
  try { testDb.prepare("DELETE FROM workflows WHERE id = 'test-workflow'").run(); } catch { /* ignore */ }

  testDb.prepare(`
    INSERT INTO workflows (id, name, category, description, responsible_agents, inputs, outputs, risk_score, requires_approval, status, success_rate, avg_duration, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'test-workflow',
    'Test Workflow',
    'test',
    'A test workflow',
    'test-agent',
    '{"budget": 1000}',
    '{"result": true}',
    1,
    0,
    'active',
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

// ─── Test Suite ───

describe('RUN-004: Workflow Engine', () => {
  beforeEach(() => {
    resetEngine();
    resetEventBus();
    resetGates();
    resetTriggers();
  });

  // ═══════════════════════════════════════════════════════════════
  // State Machine
  // ═══════════════════════════════════════════════════════════════

  describe('StateMachine', () => {
    let sm: StateMachine;

    beforeEach(() => {
      sm = getStateMachine();
    });

    it('allows pending -> in_progress transition', () => {
      expect(sm.canTransition('pending', 'in_progress')).toBe(true);
    });

    it('allows in_progress -> completed transition', () => {
      expect(sm.canTransition('in_progress', 'completed')).toBe(true);
    });

    it('allows in_progress -> blocked transition', () => {
      expect(sm.canTransition('in_progress', 'blocked')).toBe(true);
    });

    it('allows in_progress -> failed transition', () => {
      expect(sm.canTransition('in_progress', 'failed')).toBe(true);
    });

    it('allows blocked -> in_progress transition', () => {
      expect(sm.canTransition('blocked', 'in_progress')).toBe(true);
    });

    it('allows blocked -> skipped transition', () => {
      expect(sm.canTransition('blocked', 'skipped')).toBe(true);
    });

    it('allows failed -> in_progress transition', () => {
      expect(sm.canTransition('failed', 'in_progress')).toBe(true);
    });

    it('blocks invalid transitions', () => {
      expect(sm.canTransition('pending', 'completed')).toBe(false);
      expect(sm.canTransition('completed', 'in_progress')).toBe(false);
      expect(sm.canTransition('skipped', 'in_progress')).toBe(false);
    });

    it('detects terminal states', () => {
      expect(sm.isTerminal('completed')).toBe(true);
      expect(sm.isTerminal('skipped')).toBe(true);
      expect(sm.isTerminal('pending')).toBe(false);
      expect(sm.isTerminal('in_progress')).toBe(false);
      expect(sm.isTerminal('blocked')).toBe(false);
      expect(sm.isTerminal('failed')).toBe(false);
    });

    it('initializes step states correctly', () => {
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
      states[1]!.state = 'completed';
      expect(sm.getProgress(instance)).toBe(50);

      states[2]!.state = 'completed';
      states[3]!.state = 'completed';
      expect(sm.getProgress(instance)).toBe(100);
    });

    it('detects completion', () => {
      const states = sm.initializeStepStates(2);
      const instance: any = { stepStates: states };
      expect(sm.isComplete(instance)).toBe(false);

      states[0]!.state = 'completed';
      states[1]!.state = 'completed';
      expect(sm.isComplete(instance)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Event System
  // ═══════════════════════════════════════════════════════════════

  describe('EventBus', () => {
    let bus: EventBus;

    beforeEach(() => {
      bus = getEventBus();
    });

    it('emits events to subscribers', () => {
      const handler = jest.fn();
      bus.on('step_started', handler);

      bus.emit({
        type: 'step_started',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports once handlers', () => {
      const handler = jest.fn();
      bus.once('step_completed', handler);

      bus.emit({
        type: 'step_completed',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });
      bus.emit({
        type: 'step_completed',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports wildcard listeners', () => {
      const handler = jest.fn();
      bus.onAny(handler);

      bus.emit({
        type: 'step_started',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });
      bus.emit({
        type: 'step_completed',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('supports removing handlers', () => {
      const handler = jest.fn();
      bus.on('step_started', handler);
      bus.off('step_started', handler);

      bus.emit({
        type: 'step_started',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('tracks listener counts', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.on('step_started', handler1);
      bus.on('step_started', handler2);

      expect(bus.listenerCount('step_started')).toBe(2);
    });

    it('handles async handler errors gracefully', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Async error'));
      bus.on('step_started', handler as any);

      bus.emit({
        type: 'step_started',
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        timestamp: new Date(),
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Gate Registry
  // ═══════════════════════════════════════════════════════════════

  describe('GateRegistry', () => {
    let registry: GateRegistry;

    beforeEach(() => {
      registry = getGateRegistry();
    });

    it('registers gates', () => {
      const entry = registry.register('wi-1', 2, 'approval', 'Need approval');
      expect(entry.instanceId).toBe('wi-1');
      expect(entry.stepIndex).toBe(2);
      expect(entry.gateType).toBe('approval');
      expect(entry.status).toBe('closed');
    });

    it('opens gates', () => {
      registry.register('wi-1', 2, 'approval');
      const success = registry.open('wi-1', 2, 'approval', 'ceo');
      expect(success).toBe(true);
      expect(registry.isOpen('wi-1', 2, 'approval')).toBe(true);
    });

    it('closes gates', () => {
      registry.register('wi-1', 2, 'approval');
      registry.open('wi-1', 2, 'approval');
      const success = registry.close('wi-1', 2, 'approval', 'Re-blocked');
      expect(success).toBe(true);
      expect(registry.isOpen('wi-1', 2, 'approval')).toBe(false);
    });

    it('overrides gates', () => {
      registry.register('wi-1', 2, 'approval');
      const success = registry.override('wi-1', 2, 'approval', 'founder');
      expect(success).toBe(true);
      expect(registry.getStatus('wi-1', 2, 'approval')).toBe('overridden');
    });

    it('detects all gates open', () => {
      registry.register('wi-1', 2, 'approval');
      registry.register('wi-1', 2, 'safety');
      registry.open('wi-1', 2, 'approval');
      registry.open('wi-1', 2, 'safety');
      expect(registry.allGatesOpen('wi-1', 2)).toBe(true);
    });

    it('gets instance gates', () => {
      registry.register('wi-1', 0, 'approval');
      registry.register('wi-1', 1, 'safety');
      registry.register('wi-2', 0, 'budget');
      const gates = registry.getInstanceGates('wi-1');
      expect(gates).toHaveLength(2);
    });

    it('clears instance gates', () => {
      registry.register('wi-1', 0, 'approval');
      registry.register('wi-1', 1, 'safety');
      registry.clearInstance('wi-1');
      expect(registry.getInstanceGates('wi-1')).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Gate Evaluator
  // ═══════════════════════════════════════════════════════════════

  describe('GateEvaluator', () => {
    let evaluator: GateEvaluator;

    beforeEach(() => {
      evaluator = getGateEvaluator();
    });

    it('approves when no gate configured', async () => {
      const result = await evaluator.evaluateStepGates({
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        stepIndex: 0,
        step: { id: 's1', name: 'Step 1', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
        context: {},
        previousResults: [],
      });
      expect(result.blocking).toBe(false);
      expect(result.status).toBe('open');
    });

    it('blocks on approval gate when closed', async () => {
      const registry = getGateRegistry();
      registry.register('wi-1', 2, 'approval');

      const result = await evaluator.evaluateStepGates({
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        stepIndex: 2,
        step: { id: 's3', name: 'Step 3', agent: 'test', status: 'pending', blockingGate: true, input: '', output: '' },
        context: {},
        previousResults: [],
      });
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('approval');
    });

    it('passes when approval gate is open', async () => {
      const registry = getGateRegistry();
      registry.register('wi-1', 2, 'approval');
      registry.open('wi-1', 2, 'approval', 'ceo');

      const result = await evaluator.evaluateStepGates({
        instanceId: 'wi-1',
        workflowId: 'wf-1',
        stepIndex: 2,
        step: { id: 's3', name: 'Step 3', agent: 'test', status: 'pending', blockingGate: true, input: '', output: '' },
        context: {},
        previousResults: [],
      });
      expect(result.blocking).toBe(false);
      expect(result.status).toBe('open');
    });

    it('blocks on safety veto', async () => {
      const registry = getGateRegistry();
      registry.register('wi-1', 2, 'safety', 'Veto active', { vetoActive: true, vetoBy: 'safety-agent' });
      registry.close('wi-1', 2, 'safety', 'Safety veto active');

      const result = await evaluator.evaluateGate(
        {
          instanceId: 'wi-1',
          workflowId: 'wf-1',
          stepIndex: 2,
          step: { id: 's3', name: 'Step 3', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {},
          previousResults: [],
        },
        { type: 'safety', required: true }
      );
      expect(result.blocking).toBe(true);
      expect(result.gateType).toBe('safety');
    });

    it('blocks on budget exceeded', async () => {
      const result = await evaluator.evaluateGate(
        {
          instanceId: 'wi-1',
          workflowId: 'wf-1',
          stepIndex: 2,
          step: { id: 's3', name: 'Step 3', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: { budget: 1500 },
          previousResults: [],
        },
        { type: 'budget', required: true, threshold: 1000, metadata: { warningAt: 70, criticalAt: 90 } }
      );
      expect(result.gateType).toBe('budget');
    });

    it('activates and lifts safety veto', () => {
      const registry = getGateRegistry();
      evaluator.activateSafetyVeto('wi-1', 2, 'safety-agent', 'Critical risk detected');

      expect(registry.isBlocking('wi-1', 2, 'safety')).toBe(true);

      evaluator.liftSafetyVeto('wi-1', 2, 'founder');
      expect(registry.isOpen('wi-1', 2, 'safety')).toBe(true);
    });

    it('handles red line gates', async () => {
      const result = await evaluator.evaluateGate(
        {
          instanceId: 'wi-1',
          workflowId: 'wf-1',
          stepIndex: 2,
          step: { id: 's3', name: 'Step 3', agent: 'test', status: 'pending', blockingGate: false, input: '', output: '' },
          context: {},
          previousResults: [],
        },
        { type: 'approval', required: true, metadata: { redLine: true } }
      );
      expect(result.blocking).toBe(true);
      expect(result.reason).toContain('RED LINE');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Trigger Registry
  // ═══════════════════════════════════════════════════════════════

  describe('TriggerRegistry', () => {
    let registry: TriggerRegistry;

    beforeEach(() => {
      registry = getTriggerRegistry();
    });

    it('registers triggers', () => {
      registry.register({
        id: 'trg-1',
        type: 'schedule',
        workflowId: 'wf-1',
        enabled: true,
        schedule: { intervalMs: 1000 },
      });
      expect(registry.get('trg-1')).toBeDefined();
      expect(registry.getActiveCount()).toBe(1);
    });

    it('enables and disables triggers', () => {
      registry.register({
        id: 'trg-1',
        type: 'schedule',
        workflowId: 'wf-1',
        enabled: true,
        schedule: { intervalMs: 1000 },
      });

      registry.disable('trg-1');
      expect(registry.isEnabled('trg-1')).toBe(false);

      registry.enable('trg-1');
      expect(registry.isEnabled('trg-1')).toBe(true);
    });

    it('unregisters triggers', () => {
      registry.register({
        id: 'trg-1',
        type: 'schedule',
        workflowId: 'wf-1',
        enabled: true,
      });
      registry.unregister('trg-1');
      expect(registry.get('trg-1')).toBeUndefined();
    });

    it('filters triggers by workflow', () => {
      registry.register({
        id: 'trg-1',
        type: 'schedule',
        workflowId: 'wf-1',
        enabled: true,
      });
      registry.register({
        id: 'trg-2',
        type: 'schedule',
        workflowId: 'wf-2',
        enabled: true,
      });
      expect(registry.getForWorkflow('wf-1')).toHaveLength(1);
    });

    it('dispatches events to listeners', () => {
      const handler = jest.fn();
      registry.register({
        id: 'trg-1',
        type: 'event',
        workflowId: 'wf-1',
        enabled: true,
        event: { eventName: 'lead.created' },
      });
      registry.activateEvent('trg-1', handler);

      registry.dispatchEvent('lead.created', { leadId: 'L-1' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ leadId: 'L-1' });
    });

    it('registers webhook triggers', () => {
      registry.register({
        id: 'trg-1',
        type: 'webhook',
        workflowId: 'wf-1',
        enabled: true,
        webhook: { path: '/webhooks/lead', secret: 'secret123' },
      });
      expect(registry.getByWebhookPath('/webhooks/lead')).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Workflow Engine Integration
  // ═══════════════════════════════════════════════════════════════

  describe('WorkflowEngine', () => {
    beforeEach(() => {
      seedWorkflow();
    });

    it('starts a workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', {
        customerId: 'C-001',
        studioName: 'Studio Cedar',
        budget: 1500,
      });

      expect(instance).toBeDefined();
      expect(instance.workflowId).toBe('test-workflow');
      expect(instance.status).toBe('running');
      expect(instance.context.customerId).toBe('C-001');
      expect(instance.stepStates).toHaveLength(6);
      expect(instance.stepStates[0]?.state).toBe('in_progress');
    });

    it('throws for non-existent workflow', async () => {
      const engine = getWorkflowEngine();
      await expect(engine.start('non-existent')).rejects.toThrow(EngineError);
    });

    it('executes a step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      const result = await engine.executeStep(instance.id, 0);

      expect(result.state).toBe('completed');
      expect(result.stepIndex).toBe(0);
    });

    it('gets next step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      await engine.executeStep(instance.id, 0);

      const nextStep = await engine.getNextStep(instance.id);
      expect(nextStep).toBe(1);
    });

    it('blocks at gate steps', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.executeStep(instance.id, 2);

      const result = await engine.executeStep(instance.id, 3);
      expect(result.state).toBe('blocked');
    });

    it('completes when gate is opened', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });

      await engine.executeStep(instance.id, 0);
      await engine.executeStep(instance.id, 1);
      await engine.executeStep(instance.id, 2);

      await engine.openGate(instance.id, 3, 'approval', 'ceo');

      const result = await engine.executeStep(instance.id, 3);
      expect(result.state).toBe('completed');
    });

    it('pauses and resumes workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });

      await engine.pause(instance.id);
      let status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('paused');

      await engine.resume(instance.id);
      status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('running');
    });

    it('cancels workflow', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      await engine.cancel(instance.id, 'User cancelled');

      const status = engine.getInstanceStatus(instance.id);
      expect(status.status).toBe('cancelled');
    });

    it('gets instance status', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      const status = engine.getInstanceStatus(instance.id);

      expect(status.workflowId).toBe('test-workflow');
      expect(status.workflowName).toBe('Test Workflow');
      expect(status.totalSteps).toBe(6);
      expect(status.progressPercent).toBe(0);
    });

    it('skips a step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      const result = await engine.skipStep(instance.id, 1, 'Skip for testing');

      expect(result.state).toBe('skipped');
      expect(result.stepIndex).toBe(1);
    });

    it('retries a failed step', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });

      const stepState = instance.stepStates[0];
      if (stepState) {
        stepState.state = 'failed';
        stepState.retryCount = 1;
      }

      const result = await engine.retryStep(instance.id, 0);
      expect(result.state).toBe('completed');
    });

    it('checks gate status', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      const gateResult = await engine.checkGate(instance.id, 0);

      expect(gateResult.blocking).toBe(false);
    });

    it('gets running instances', async () => {
      const engine = getWorkflowEngine();
      await engine.start('test-workflow', { budget: 1500 });
      await engine.start('test-workflow', { budget: 2000 });

      const running = engine.getRunningInstances();
      expect(running.length).toBe(2);
    });

    it('tracks progress through status', async () => {
      const engine = getWorkflowEngine();
      const instance = await engine.start('test-workflow', { budget: 1500 });
      await engine.executeStep(instance.id, 0);

      const status = engine.getInstanceStatus(instance.id);
      expect(status.progressPercent).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Workflow Runner
  // ═══════════════════════════════════════════════════════════════

  describe('WorkflowRunner', () => {
    beforeEach(() => {
      seedWorkflow();
    });

    it('creates a runner', () => {
      const runner = createRunner({ pollIntervalMs: 500 });
      expect(runner).toBeDefined();
      expect(runner.isActive()).toBe(false);
    });

    it('gets runner stats', () => {
      const stats = createRunner({ pollIntervalMs: 500 }).getStats();
      expect(stats.isRunning).toBe(false);
      expect(stats.pendingTimeouts).toBe(0);
    });
  });
});
