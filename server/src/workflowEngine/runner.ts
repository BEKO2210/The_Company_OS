// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Runner
// ═══════════════════════════════════════════════════════════════

import type {
  RuntimeWorkflowInstance,
  RunnerConfig,
  StepResult,
  WorkflowEvent,
} from './types.js';
import { WorkflowEngine, getWorkflowEngine } from './engine.js';
import { getEventBus } from './events.js';

// ═══════════════════════════════════════════════════════════════
// Default Runner Config
// ═══════════════════════════════════════════════════════════════

const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  pollIntervalMs: 2000,
  maxConcurrentInstances: 10,
  defaultTimeoutMs: 300000,
  maxRetries: 3,
  retryDelayMs: 5000,
  enableAutoRetry: true,
  enableTimeoutEscalation: true,
  timeoutEscalationThresholdMs: 60000,
};

// ═══════════════════════════════════════════════════════════════
// Workflow Runner
// ═══════════════════════════════════════════════════════════════

/**
 * WorkflowRunner - Automatically executes workflow steps.
 * Monitors all running workflows and advances them step by step.
 */
export class WorkflowRunner {
  private engine: WorkflowEngine;
  private config: RunnerConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private stepTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly eventBus = getEventBus();
  private eventHandlers: Array<() => void> = [];

  constructor(config: Partial<RunnerConfig> = {}) {
    this.config = { ...DEFAULT_RUNNER_CONFIG, ...config };
    this.engine = getWorkflowEngine({ runner: this.config });
    this.setupEventListeners();
  }

  /**
   * Start the runner.
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`[Runner] Started (pollInterval: ${this.config.pollIntervalMs}ms)`);

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop the runner.
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear all pending timeouts
    for (const timeout of this.stepTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.stepTimeouts.clear();

    // Remove event listeners
    for (const cleanup of this.eventHandlers) {
      cleanup();
    }
    this.eventHandlers = [];

    console.log('[Runner] Stopped');
  }

  /**
   * Check if runner is active.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Process a single tick - check all running workflows.
   */
  private async tick(): Promise<void> {
    try {
      const runningInstances = this.engine.getRunningInstances();

      if (runningInstances.length === 0) return;

      for (const instance of runningInstances) {
        await this.processInstance(instance);
      }
    } catch (err: unknown) {
      console.error('[Runner] Tick error:', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Process a single instance - find and execute next step.
   */
  private async processInstance(instance: RuntimeWorkflowInstance): Promise<void> {
    const instanceId = instance.id;

    try {
      // Check for step timeout
      const currentStepState = instance.stepStates[instance.currentStep];
      if (currentStepState?.startedAt && this.config.enableTimeoutEscalation) {
        const elapsed = Date.now() - new Date(currentStepState.startedAt).getTime();
        if (elapsed > this.config.timeoutEscalationThresholdMs) {
          this.eventBus.emit({
            type: 'timeout_escalation',
            instanceId,
            workflowId: instance.workflowId,
            stepIndex: instance.currentStep,
            timestamp: new Date(),
            data: { elapsedMs: elapsed },
          });
        }
      }

      // Find next executable step
      const nextStep = await this.engine.getNextStep(instanceId);
      if (nextStep === null) {
        // Workflow might be complete or blocked
        if (instance.stepStates.every((s) => s.state === 'completed' || s.state === 'skipped')) {
          // Workflow complete - nothing to do
        }
        return;
      }

      // Execute the step
      const stepState = instance.stepStates[nextStep];
      if (!stepState) return;

      // Skip if already in terminal state
      if (stepState.state === 'completed' || stepState.state === 'skipped') {
        return;
      }

      // Skip gates if auto-retry is on and step previously failed
      const skipGates = this.config.enableAutoRetry && stepState.state === 'failed';

      // Mark step as started
      stepState.startedAt = new Date().toISOString();

      // Execute with timeout
      const timeoutMs = this.config.defaultTimeoutMs;
      const timeoutId = setTimeout(() => {
        this.eventBus.emit({
          type: 'timeout_escalation',
          instanceId,
          workflowId: instance.workflowId,
          stepIndex: nextStep,
          timestamp: new Date(),
          data: { timeoutMs },
        });
      }, timeoutMs);

      this.stepTimeouts.set(`${instanceId}:${nextStep}`, timeoutId);

      const result = await this.engine.executeStep(instanceId, nextStep, {
        timeoutMs,
        maxRetries: this.config.maxRetries,
        retryDelayMs: this.config.retryDelayMs,
        skipGates,
      });

      // Clear timeout
      clearTimeout(timeoutId);
      this.stepTimeouts.delete(`${instanceId}:${nextStep}`);

      await this.handleStepResult(instanceId, result);
    } catch (err: unknown) {
      console.error(`[Runner] Error processing instance ${instanceId}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Handle the result of a step execution.
   */
  private async handleStepResult(
    instanceId: string,
    result: StepResult
  ): Promise<void> {
    const instance = this.engine.getInstance(instanceId);
    if (!instance) return;

    switch (result.state) {
      case 'completed':
        // Step completed successfully - find next step in next tick
        break;

      case 'blocked':
        // Gate is blocking - workflow is now blocked
        console.log(`[Runner] Instance ${instanceId} blocked at step ${result.stepIndex}: ${result.error}`);
        break;

      case 'failed':
        // Step failed
        if (result.retryCount < this.config.maxRetries && this.config.enableAutoRetry) {
          console.log(`[Runner] Instance ${instanceId} step ${result.stepIndex} failed, will retry (${result.retryCount}/${this.config.maxRetries})`);

          // Schedule retry after delay
          const retryTimeout = setTimeout(() => {
            this.engine.retryStep(instanceId, result.stepIndex).catch((err: unknown) => {
              console.error(`[Runner] Retry failed for ${instanceId}:${result.stepIndex}:`,
                err instanceof Error ? err.message : String(err)
              );
            });
          }, this.config.retryDelayMs);

          this.stepTimeouts.set(`retry-${instanceId}:${result.stepIndex}`, retryTimeout);
        } else {
          console.error(`[Runner] Instance ${instanceId} step ${result.stepIndex} failed after ${result.retryCount} retries`);
        }
        break;

      case 'skipped':
        // Step was skipped
        break;
    }
  }

  /**
   * Set up event listeners for monitoring.
   */
  private setupEventListeners(): void {
    // Listen for gate open events to resume blocked workflows
    const handler = (event: WorkflowEvent) => {
      if (event.type === 'gate_opened') {
        const instance = this.engine.getInstance(event.instanceId);
        if (instance?.status === 'blocked') {
          // The gate was opened, try to resume
          this.engine.openGate(
            event.instanceId,
            event.stepIndex ?? 0,
            'approval',
            'runner-auto'
          ).catch(() => {
            // Ignore errors
          });
        }
      }
    };

    this.eventBus.on('gate_opened', handler);
    this.eventHandlers.push(() => this.eventBus.off('gate_opened', handler));
  }

  /**
   * Get runner statistics.
   */
  getStats(): RunnerStats {
    const instances = this.engine.getActiveInstances();
    const running = this.engine.getRunningInstances();

    return {
      isRunning: this.isRunning,
      activeInstances: instances.length,
      runningInstances: running.length,
      pendingTimeouts: this.stepTimeouts.size,
      config: this.config,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Runner Stats
// ═══════════════════════════════════════════════════════════════

export interface RunnerStats {
  isRunning: boolean;
  activeInstances: number;
  runningInstances: number;
  pendingTimeouts: number;
  config: RunnerConfig;
}

// ═══════════════════════════════════════════════════════════════
// Convenience: Create and start runner in one call
// ═══════════════════════════════════════════════════════════════

let globalRunner: WorkflowRunner | null = null;

export function createRunner(config?: Partial<RunnerConfig>): WorkflowRunner {
  globalRunner = new WorkflowRunner(config);
  return globalRunner;
}

export function startRunner(config?: Partial<RunnerConfig>): WorkflowRunner {
  if (!globalRunner || !globalRunner.isActive()) {
    globalRunner = createRunner(config);
    globalRunner.start();
  }
  return globalRunner;
}

export function stopRunner(): void {
  globalRunner?.stop();
}

export function getRunnerStats(): RunnerStats | null {
  return globalRunner?.getStats() ?? null;
}

export function isRunnerActive(): boolean {
  return globalRunner?.isActive() ?? false;
}
