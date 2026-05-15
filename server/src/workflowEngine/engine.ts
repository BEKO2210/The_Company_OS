// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Core Engine
// ═══════════════════════════════════════════════════════════════

import { dbRef } from '../db/connection.js';
import { getWorkflowById, getInstanceById } from '../services/workflowService.js';
import * as auditService from '../services/auditService.js';
import type {
  StepDefinition,
  StepResult,
  StepContext,
  GateResult,
  InstanceState,
  InstanceStatus,
  WorkflowContext,
  RuntimeWorkflowInstance,
  RuntimeStepState,
  ExecutionOptions,
  EngineConfig,
  StepState,
} from './types.js';
import { StateMachine, getStateMachine } from './stateMachine.js';
import { GateEvaluator, getGateRegistry, getGateEvaluator } from './gates.js';
import {
  getEventBus,
  createStepStartedEvent,
  createStepCompletedEvent,
  createStepBlockedEvent,
  createStepFailedEvent,
  createStepSkippedEvent,
  createWorkflowStartedEvent,
  createWorkflowCompletedEvent,
  createWorkflowCancelledEvent,
  createWorkflowPausedEvent,
  createWorkflowResumedEvent,
  createWorkflowFailedEvent,
} from './events.js';
import type { GateConfig, InstanceAuditEntry } from './types.js';

// ═══════════════════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: EngineConfig = {
  runner: {
    pollIntervalMs: 2000,
    maxConcurrentInstances: 10,
    defaultTimeoutMs: 300000, // 5 min
    maxRetries: 3,
    retryDelayMs: 5000,
    enableAutoRetry: true,
    enableTimeoutEscalation: true,
    timeoutEscalationThresholdMs: 60000, // 1 min
  },
  auditEveryAction: true,
  defaultExecutionOptions: {
    timeoutMs: 300000,
    maxRetries: 3,
    retryDelayMs: 5000,
    skipGates: false,
    dryRun: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// Workflow Engine
// ═══════════════════════════════════════════════════════════════

export class WorkflowEngine {
  private instances: Map<string, RuntimeWorkflowInstance> = new Map();
  private stateMachine: StateMachine;
  private gateEvaluator: GateEvaluator;
  private eventBus = getEventBus();
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      runner: { ...DEFAULT_CONFIG.runner, ...config.runner },
      defaultExecutionOptions: {
        ...DEFAULT_CONFIG.defaultExecutionOptions,
        ...config.defaultExecutionOptions,
      },
    };
    this.stateMachine = getStateMachine();
    this.gateEvaluator = getGateEvaluator();
  }

  // ═══════════════════════════════════════════════════════════════
  // Workflow Lifecycle
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start a new workflow instance.
   */
  async start(workflowId: string, context: WorkflowContext = {}): Promise<RuntimeWorkflowInstance> {
    const workflow = getWorkflowById(workflowId);
    if (!workflow) {
      throw new EngineError(`Workflow not found: ${workflowId}`, 'WORKFLOW_NOT_FOUND');
    }

    if (workflow.status !== 'active') {
      throw new EngineError(`Workflow is not active: ${workflow.status}`, 'WORKFLOW_INACTIVE');
    }

    // Parse steps
    const steps = this.parseSteps(workflow.steps);
    if (steps.length === 0) {
      throw new EngineError('Workflow has no steps', 'WORKFLOW_EMPTY');
    }

    // Create instance
    const instanceId = `wi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date();
    const stepStates = this.stateMachine.initializeStepStates(steps.length);

    // Enrich step states with actual step IDs
    stepStates.forEach((s, i) => {
      s.stepId = steps[i]?.id ?? `step-${i}`;
    });

    const instance: RuntimeWorkflowInstance = {
      id: instanceId,
      workflowId,
      status: 'running',
      currentStep: 0,
      context,
      stepStates,
      startedAt: now,
      auditLog: [{
        timestamp: now,
        action: 'WORKFLOW_STARTED',
        details: { context },
      }],
    };

    this.instances.set(instanceId, instance);

    // Persist to DB
    dbRef().prepare(`
      INSERT INTO workflow_instances (id, workflow_id, status, current_step, context, started_at)
      VALUES (?, ?, 'running', 0, ?, ?)
    `).run(instanceId, workflowId, JSON.stringify(context), now.toISOString());

    // Emit event
    this.eventBus.emit(createWorkflowStartedEvent(instanceId, workflowId, context as Record<string, unknown>));

    // Audit
    if (this.config.auditEveryAction) {
      auditService.createEntry({
        agent: 'workflow-engine',
        action: `workflow_start:${workflowId}`,
        input: JSON.stringify({ workflowId, context }),
        project: instanceId,
        risk_score: workflow.risk_score,
      });
    }

    return instance;
  }

  /**
   * Execute a specific step.
   */
  async executeStep(
    instanceId: string,
    stepIndex: number,
    options?: ExecutionOptions
  ): Promise<StepResult> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    if (instance.status === 'paused') {
      throw new EngineError('Workflow is paused', 'WORKFLOW_PAUSED');
    }

    if (instance.status === 'cancelled') {
      throw new EngineError('Workflow is cancelled', 'WORKFLOW_CANCELLED');
    }

    const workflow = getWorkflowById(instance.workflowId);
    if (!workflow) {
      throw new EngineError('Workflow definition not found', 'WORKFLOW_NOT_FOUND');
    }

    const steps = this.parseSteps(workflow.steps);
    const step = steps[stepIndex];
    if (!step) {
      throw new EngineError(`Step ${stepIndex} not found`, 'STEP_NOT_FOUND');
    }

    const stepState = this.stateMachine.getStepState(instance, stepIndex);
    if (!stepState) {
      throw new EngineError(`Step state ${stepIndex} not found`, 'STEP_STATE_NOT_FOUND');
    }

    const opts = { ...this.config.defaultExecutionOptions, ...options };

    // Build step context
    const stepContext: StepContext = {
      instanceId,
      workflowId: instance.workflowId,
      stepIndex,
      step,
      context: instance.context,
      previousResults: this.getCompletedResults(instance),
    };

    // Check gates unless skipped
    if (!opts.skipGates && step.blockingGate) {
      const gateResult = await this.gateEvaluator.evaluateStepGates(stepContext);

      if (gateResult.blocking) {
        // Transition to blocked
        await this.stateMachine.performTransition(stepState, 'blocked', stepContext);
        instance.status = 'blocked';
        instance.currentStep = stepIndex;

        this.persistInstance(instance);

        this.eventBus.emit(
          createStepBlockedEvent(instanceId, instance.workflowId, stepIndex, step.name, gateResult.gateType, gateResult.reason)
        );

        this.audit(instanceId, 'STEP_BLOCKED', stepIndex, { gateType: gateResult.gateType, reason: gateResult.reason });

        return {
          stepIndex,
          stepId: step.id,
          state: 'blocked',
          startedAt: new Date(),
          error: gateResult.reason,
          retryCount: stepState.retryCount,
        };
      }
    }

    // Check gates via gate config
    if (!opts.skipGates && step.gate) {
      const gateResult = await this.gateEvaluator.evaluateGate(stepContext, step.gate);

      if (gateResult.blocking) {
        await this.stateMachine.performTransition(stepState, 'blocked', stepContext);
        instance.status = 'blocked';

        this.persistInstance(instance);

        this.eventBus.emit(
          createStepBlockedEvent(instanceId, instance.workflowId, stepIndex, step.name, gateResult.gateType, gateResult.reason)
        );

        this.audit(instanceId, 'STEP_BLOCKED', stepIndex, { gateType: gateResult.gateType, reason: gateResult.reason });

        return {
          stepIndex,
          stepId: step.id,
          state: 'blocked',
          startedAt: new Date(),
          error: gateResult.reason,
          retryCount: stepState.retryCount,
        };
      }
    }

    // Execute step
    const startedAt = new Date();

    // Transition to in_progress if not already
    if (stepState.state === 'pending') {
      await this.stateMachine.performTransition(stepState, 'in_progress', stepContext);
    }

    this.eventBus.emit(
      createStepStartedEvent(instanceId, instance.workflowId, stepIndex, step.name)
    );

    this.audit(instanceId, 'STEP_STARTED', stepIndex, { stepName: step.name, agent: step.agent });

    // Update DB
    instance.currentStep = stepIndex;
    this.persistInstance(instance);

    try {
      // Simulate step execution (dry run just returns immediately)
      if (opts.dryRun) {
        const result: StepResult = {
          stepIndex,
          stepId: step.id,
          state: 'completed',
          startedAt,
          completedAt: new Date(),
          output: { dryRun: true, stepName: step.name },
          retryCount: stepState.retryCount,
        };

        await this.stateMachine.performTransition(stepState, 'completed', stepContext);
        stepState.completedAt = new Date().toISOString();
        stepState.output = result.output;

        this.eventBus.emit(
          createStepCompletedEvent(instanceId, instance.workflowId, stepIndex, step.name, result.output)
        );

        this.audit(instanceId, 'STEP_COMPLETED', stepIndex, { stepName: step.name, dryRun: true });

        return result;
      }

      // Real execution
      const output = await this.runStepLogic(stepContext, opts);

      const result: StepResult = {
        stepIndex,
        stepId: step.id,
        state: 'completed',
        startedAt,
        completedAt: new Date(),
        output,
        retryCount: stepState.retryCount,
      };

      await this.stateMachine.performTransition(stepState, 'completed', stepContext);
      stepState.completedAt = new Date().toISOString();
      stepState.output = output;

      this.eventBus.emit(
        createStepCompletedEvent(instanceId, instance.workflowId, stepIndex, step.name, output)
      );

      this.audit(instanceId, 'STEP_COMPLETED', stepIndex, { stepName: step.name, output });

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);

      stepState.retryCount++;

      if (stepState.retryCount < (opts.maxRetries ?? this.config.runner.maxRetries)) {
        // Retry
        const result: StepResult = {
          stepIndex,
          stepId: step.id,
          state: 'failed',
          startedAt,
          error: `${error} (will retry ${stepState.retryCount}/${opts.maxRetries ?? this.config.runner.maxRetries})`,
          retryCount: stepState.retryCount,
        };

        this.eventBus.emit(
          createStepFailedEvent(instanceId, instance.workflowId, stepIndex, step.name, error, stepState.retryCount)
        );

        this.audit(instanceId, 'STEP_FAILED_RETRY', stepIndex, { stepName: step.name, error, retryCount: stepState.retryCount });

        return result;
      }

      // Max retries exceeded - mark as failed
      await this.stateMachine.performTransition(stepState, 'failed', stepContext);
      stepState.error = error;
      instance.status = 'failed';

      this.persistInstance(instance);

      this.eventBus.emit(
        createStepFailedEvent(instanceId, instance.workflowId, stepIndex, step.name, error, stepState.retryCount)
      );
      this.eventBus.emit(
        createWorkflowFailedEvent(instanceId, instance.workflowId, { stepIndex, error })
      );

      this.audit(instanceId, 'STEP_FAILED', stepIndex, { stepName: step.name, error });

      return {
        stepIndex,
        stepId: step.id,
        state: 'failed',
        startedAt,
        error,
        retryCount: stepState.retryCount,
      };
    }
  }

  /**
   * Determine the next step to execute.
   */
  async getNextStep(instanceId: string): Promise<number | null> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) return null;

    if (instance.status !== 'running') return null;

    const workflow = getWorkflowById(instance.workflowId);
    if (!workflow?.steps) return null;

    const steps = this.parseSteps(workflow.steps);

    // Find first pending step that has all dependencies met
    const startable = this.stateMachine.getStartableSteps(instance, steps);
    if (startable.length > 0) {
      return startable[0]!;
    }

    // Check if all steps are terminal (workflow complete)
    if (this.stateMachine.isComplete(instance)) {
      await this.completeWorkflow(instanceId);
      return null;
    }

    return null;
  }

  /**
   * Check a gate for a specific step.
   */
  async checkGate(instanceId: string, stepIndex: number): Promise<GateResult> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    const workflow = getWorkflowById(instance.workflowId);
    if (!workflow?.steps) {
      throw new EngineError('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }

    const steps = this.parseSteps(workflow.steps);
    const step = steps[stepIndex];
    if (!step) {
      throw new EngineError(`Step ${stepIndex} not found`, 'STEP_NOT_FOUND');
    }

    const stepContext: StepContext = {
      instanceId,
      workflowId: instance.workflowId,
      stepIndex,
      step,
      context: instance.context,
      previousResults: this.getCompletedResults(instance),
    };

    if (step.gate) {
      return this.gateEvaluator.evaluateGate(stepContext, step.gate);
    }

    if (step.blockingGate) {
      return this.gateEvaluator.evaluateStepGates(stepContext);
    }

    return {
      gateType: 'approval',
      status: 'open',
      blocking: false,
      reason: 'No gate configured for this step',
    };
  }

  /**
   * Open a gate for a step.
   */
  async openGate(
    instanceId: string,
    stepIndex: number,
    gateType: 'approval' | 'safety' | 'budget' | 'time' | 'human' = 'approval',
    openedBy: string = 'system'
  ): Promise<boolean> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) return false;

    const registry = getGateRegistry();
    // Auto-register the gate if it doesn't exist yet
    if (!registry.getEntry(instanceId, stepIndex, gateType)) {
      registry.register(instanceId, stepIndex, gateType, 'Auto-registered via openGate');
    }
    const success = registry.open(instanceId, stepIndex, gateType, openedBy);

    if (success) {
      // If workflow is blocked, try to unblock
      if (instance.status === 'blocked') {
        const stepState = this.stateMachine.getStepState(instance, stepIndex);
        if (stepState?.state === 'blocked') {
          const workflow = getWorkflowById(instance.workflowId);
          const steps = workflow?.steps ? this.parseSteps(workflow.steps) : [];
          const step = steps[stepIndex];

          if (step) {
            const stepContext: StepContext = {
              instanceId,
              workflowId: instance.workflowId,
              stepIndex,
              step,
              context: instance.context,
              previousResults: this.getCompletedResults(instance),
            };

            try {
              await this.stateMachine.performTransition(stepState, 'in_progress', stepContext);
              instance.status = 'running';
              this.persistInstance(instance);
            } catch {
              // Transition failed - keep as is
            }
          }
        }
      }

      this.audit(instanceId, 'GATE_OPENED', stepIndex, { gateType, openedBy });
    }

    return success;
  }

  /**
   * Block a gate for a step.
   */
  async blockGate(
    instanceId: string,
    stepIndex: number,
    gateType: 'approval' | 'safety' | 'budget' | 'time' | 'human' = 'approval',
    reason: string = 'Manually blocked'
  ): Promise<boolean> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) return false;

    const registry = getGateRegistry();
    const success = registry.close(instanceId, stepIndex, gateType, reason);

    if (success) {
      this.audit(instanceId, 'GATE_BLOCKED', stepIndex, { gateType, reason });
    }

    return success;
  }

  /**
   * Pause a running workflow.
   */
  async pause(instanceId: string): Promise<void> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    if (instance.status !== 'running') {
      throw new EngineError(`Cannot pause workflow with status: ${instance.status}`, 'INVALID_STATE');
    }

    instance.status = 'paused';
    instance.pausedAt = new Date();

    this.persistInstance(instance);

    this.eventBus.emit(createWorkflowPausedEvent(instanceId, instance.workflowId));

    this.audit(instanceId, 'WORKFLOW_PAUSED');
  }

  /**
   * Resume a paused workflow.
   */
  async resume(instanceId: string): Promise<void> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    if (instance.status !== 'paused') {
      throw new EngineError(`Cannot resume workflow with status: ${instance.status}`, 'INVALID_STATE');
    }

    instance.status = 'running';
    instance.resumedAt = new Date();

    this.persistInstance(instance);

    this.eventBus.emit(createWorkflowResumedEvent(instanceId, instance.workflowId));

    this.audit(instanceId, 'WORKFLOW_RESUMED');
  }

  /**
   * Cancel a workflow.
   */
  async cancel(instanceId: string, reason: string = 'Cancelled by user'): Promise<void> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    if (instance.status === 'completed' || instance.status === 'cancelled') {
      throw new EngineError(`Cannot cancel workflow with status: ${instance.status}`, 'INVALID_STATE');
    }

    instance.status = 'cancelled';
    instance.cancelledAt = new Date();
    instance.cancelReason = reason;

    // Cancel all active gates
    getGateRegistry().clearInstance(instanceId);

    this.persistInstance(instance);

    this.eventBus.emit(createWorkflowCancelledEvent(instanceId, instance.workflowId, reason));

    this.audit(instanceId, 'WORKFLOW_CANCELLED', undefined, { reason });
  }

  /**
   * Get detailed instance status.
   */
  getInstanceStatus(instanceId: string): InstanceStatus {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    const workflow = getWorkflowById(instance.workflowId);
    const steps = this.parseSteps(workflow?.steps);
    const totalSteps = steps.length;
    const progress = this.stateMachine.getProgress(instance);

    const currentStepState = this.stateMachine.getStepState(instance, instance.currentStep);
    const currentStepName = steps[instance.currentStep]?.name ?? 'Unknown';

    return {
      id: instance.id,
      workflowId: instance.workflowId,
      workflowName: workflow?.name ?? 'Unknown',
      status: instance.status,
      currentStep: instance.currentStep,
      totalSteps,
      currentStepName,
      currentStepState: currentStepState?.state ?? 'pending',
      progressPercent: progress,
      startedAt: instance.startedAt.toISOString(),
      completedAt: instance.completedAt?.toISOString(),
      stepStates: instance.stepStates,
    };
  }

  /**
   * Get all running instances.
   */
  getRunningInstances(): RuntimeWorkflowInstance[] {
    return Array.from(this.instances.values()).filter(
      (i) => i.status === 'running'
    );
  }

  /**
   * Get all active instances (running, paused, blocked).
   */
  getActiveInstances(): RuntimeWorkflowInstance[] {
    return Array.from(this.instances.values()).filter(
      (i) => i.status === 'running' || i.status === 'paused' || i.status === 'blocked'
    );
  }

  /**
   * Get an instance by ID.
   */
  getInstance(instanceId: string): RuntimeWorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Skip a step (if allowed by gate conditions).
   */
  async skipStep(instanceId: string, stepIndex: number, reason: string = 'Skipped'): Promise<StepResult> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    const stepState = this.stateMachine.getStepState(instance, stepIndex);
    if (!stepState) {
      throw new EngineError('Step not found', 'STEP_NOT_FOUND');
    }

    const workflow = getWorkflowById(instance.workflowId);
    const steps = workflow?.steps ? this.parseSteps(workflow.steps) : [];
    const step = steps[stepIndex];

    const stepContext: StepContext = {
      instanceId,
      workflowId: instance.workflowId,
      stepIndex,
      step: step ?? { id: `step-${stepIndex}`, name: 'Unknown', agent: 'unknown', status: 'unknown', blockingGate: false, input: '', output: '' },
      context: instance.context,
      previousResults: this.getCompletedResults(instance),
    };

    await this.stateMachine.performTransition(stepState, 'skipped', stepContext);
    stepState.completedAt = new Date().toISOString();

    this.persistInstance(instance);

    this.eventBus.emit(
      createStepSkippedEvent(instanceId, instance.workflowId, stepIndex, step?.name ?? 'Unknown', reason)
    );

    this.audit(instanceId, 'STEP_SKIPPED', stepIndex, { reason });

    return {
      stepIndex,
      stepId: stepState.stepId,
      state: 'skipped',
      startedAt: new Date(),
      completedAt: new Date(),
      retryCount: stepState.retryCount,
    };
  }

  /**
   * Retry a failed step.
   */
  async retryStep(instanceId: string, stepIndex: number): Promise<StepResult> {
    const instance = this.getRuntimeInstance(instanceId);
    if (!instance) {
      throw new EngineError('Instance not found', 'INSTANCE_NOT_FOUND');
    }

    const stepState = this.stateMachine.getStepState(instance, stepIndex);
    if (!stepState) {
      throw new EngineError('Step not found', 'STEP_NOT_FOUND');
    }

    if (stepState.state !== 'failed') {
      throw new EngineError(`Cannot retry step in state: ${stepState.state}`, 'INVALID_STATE');
    }

    const workflow = getWorkflowById(instance.workflowId);
    const steps = workflow?.steps ? this.parseSteps(workflow.steps) : [];
    const step = steps[stepIndex];

    const stepContext: StepContext = {
      instanceId,
      workflowId: instance.workflowId,
      stepIndex,
      step: step ?? { id: `step-${stepIndex}`, name: 'Unknown', agent: 'unknown', status: 'unknown', blockingGate: false, input: '', output: '' },
      context: instance.context,
      previousResults: this.getCompletedResults(instance),
    };

    await this.stateMachine.performTransition(stepState, 'in_progress', stepContext);
    stepState.error = undefined;

    if (instance.status === 'failed') {
      instance.status = 'running';
    }

    this.persistInstance(instance);

    return this.executeStep(instanceId, stepIndex);
  }

  // ═══════════════════════════════════════════════════════════════
  // Internal Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Complete a workflow (mark as completed).
   */
  private async completeWorkflow(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.status = 'completed';
    instance.completedAt = new Date();

    // Collect results from all steps
    const result: Record<string, unknown> = {};
    for (const stepState of instance.stepStates) {
      if (stepState.output) {
        result[stepState.stepId] = stepState.output;
      }
    }
    instance.result = result;

    this.persistInstance(instance);

    this.eventBus.emit(createWorkflowCompletedEvent(instanceId, instance.workflowId, result));

    this.audit(instanceId, 'WORKFLOW_COMPLETED', undefined, { result });
  }

  /**
   * Parse workflow steps from JSON string.
   */
  private parseSteps(stepsJson: string | null | undefined): StepDefinition[] {
    if (!stepsJson) return [];
    try {
      const parsed = JSON.parse(stepsJson) as StepDefinition[] | Array<Record<string, unknown>>;
      if (!Array.isArray(parsed)) return [];

      return parsed.map((s, i) => ({
        id: (s.id as string) ?? `step-${i}`,
        name: (s.name as string) ?? `Step ${i}`,
        description: (s.description as string) ?? undefined,
        agent: (s.agent as string) ?? 'system',
        status: (s.status as string) ?? 'pending',
        blockingGate: (s.blockingGate as boolean) ?? false,
        gate: (s.gate as GateConfig) ?? undefined,
        input: (s.input as string) ?? '',
        output: (s.output as string) ?? '',
        timeout: (s.timeout as number) ?? undefined,
        retryCount: (s.retryCount as number) ?? undefined,
        dependencies: (s.dependencies as string[]) ?? undefined,
        executionMode: (s.executionMode as 'auto' | 'manual' | 'hybrid') ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get completed step results.
   */
  private getCompletedResults(instance: RuntimeWorkflowInstance): StepResult[] {
    return instance.stepStates
      .filter((s) => s.state === 'completed' && s.output)
      .map((s) => ({
        stepIndex: s.stepIndex,
        stepId: s.stepId,
        state: s.state,
        startedAt: s.startedAt ? new Date(s.startedAt) : new Date(),
        completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        output: s.output,
        retryCount: s.retryCount,
      }));
  }

  /**
   * Get or load a runtime instance.
   */
  private getRuntimeInstance(instanceId: string): RuntimeWorkflowInstance | undefined {
    // Check memory first
    let instance = this.instances.get(instanceId);
    if (instance) return instance;

    // Load from DB
    const dbInstance = getInstanceById(instanceId);
    if (!dbInstance) return undefined;

    // Parse and reconstruct
    const workflow = getWorkflowById(dbInstance.workflow_id);
    if (!workflow) return undefined;

    const steps = this.parseSteps(workflow.steps);
    const context = dbInstance.context ? JSON.parse(dbInstance.context) as WorkflowContext : {};

    const stepStates: RuntimeStepState[] = steps.map((s, i) => ({
      stepIndex: i,
      stepId: s.id,
      state: (i === dbInstance.current_step && dbInstance.status === 'running') ? 'in_progress' :
             (i < dbInstance.current_step) ? 'completed' : 'pending' as StepState,
      retryCount: 0,
    }));

    instance = {
      id: dbInstance.id,
      workflowId: dbInstance.workflow_id,
      status: dbInstance.status as InstanceState,
      currentStep: dbInstance.current_step,
      context,
      stepStates,
      startedAt: new Date(dbInstance.started_at),
      completedAt: dbInstance.completed_at ? new Date(dbInstance.completed_at) : undefined,
      auditLog: [],
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
   * Persist instance state to DB.
   */
  private persistInstance(instance: RuntimeWorkflowInstance): void {
    try {
      dbRef().prepare(`
        UPDATE workflow_instances
        SET status = ?, current_step = ?, result = ?
        WHERE id = ?
      `).run(
        instance.status,
        instance.currentStep,
        instance.result ? JSON.stringify(instance.result) : null,
        instance.id
      );
    } catch (err: unknown) {
      console.error(`[Engine] Failed to persist instance ${instance.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Write audit entry.
   */
  private audit(
    instanceId: string,
    action: string,
    stepIndex?: number,
    details?: Record<string, unknown>
  ): void {
    if (!this.config.auditEveryAction) return;

    try {
      const instance = this.instances.get(instanceId);
      const entry: InstanceAuditEntry = {
        timestamp: new Date(),
        action,
        stepIndex,
        details,
      };

      instance?.auditLog.push(entry);

      auditService.createEntry({
        agent: 'workflow-engine',
        action: `workflow:${action}`,
        input: JSON.stringify({ instanceId, stepIndex, ...details }),
        project: instanceId,
        risk_score: 0,
      });
    } catch (err: unknown) {
      console.error(`[Engine] Audit error:`, err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Execute step logic (simulated for now).
   * In production, this would call the actual agent system.
   */
  private async runStepLogic(
    stepContext: StepContext,
    options: ExecutionOptions
  ): Promise<Record<string, unknown>> {
    const { step, context } = stepContext;

    // Simulate processing time
    const processingTime = 100 + Math.random() * 200;
    await this.sleep(processingTime);

    // Return step output
    return {
      stepName: step.name,
      agent: step.agent,
      input: step.input,
      output: step.output,
      completed: true,
      contextKeys: Object.keys(context),
      executionMode: step.executionMode ?? 'auto',
      ...(options.dryRun ? { dryRun: true } : {}),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════
// Engine Error
// ═══════════════════════════════════════════════════════════════

export class EngineError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

let globalEngine: WorkflowEngine | null = null;

export function getWorkflowEngine(config?: Partial<EngineConfig>): WorkflowEngine {
  if (!globalEngine) {
    globalEngine = new WorkflowEngine(config);
  }
  return globalEngine;
}

export function resetEngine(): void {
  globalEngine = null;
}
