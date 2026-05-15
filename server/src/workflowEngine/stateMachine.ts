// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - State Machine
// ═══════════════════════════════════════════════════════════════

import type {
  StepState,
  StepContext,
  StateTransition,
  RuntimeStepState,
  RuntimeWorkflowInstance,
} from './types.js';

// ═══════════════════════════════════════════════════════════════
// Allowed State Transitions
// ═══════════════════════════════════════════════════════════════

export const ALLOWED_TRANSITIONS: StateTransition[] = [
  // From pending
  { from: 'pending', to: 'in_progress' },
  { from: 'pending', to: 'blocked' },    // Gate blocks before step starts
  { from: 'pending', to: 'skipped' },    // Skip before step starts

  // From in_progress
  { from: 'in_progress', to: 'completed' },
  { from: 'in_progress', to: 'blocked' },
  { from: 'in_progress', to: 'failed' },
  { from: 'in_progress', to: 'skipped' },

  // From blocked (gate interactions)
  { from: 'blocked', to: 'in_progress' },    // Gate opened / retry
  { from: 'blocked', to: 'skipped' },        // Gate bypassed with permission
  { from: 'blocked', to: 'failed' },         // Gate timeout / rejection

  // From failed (retry logic)
  { from: 'failed', to: 'in_progress' },    // Retry
  { from: 'failed', to: 'skipped' },         // Skip after max retries

  // From skipped (terminal)
  // No outgoing transitions - skipped is terminal
];

// ═══════════════════════════════════════════════════════════════
// Terminal States
// ═══════════════════════════════════════════════════════════════

export const TERMINAL_STATES: ReadonlySet<StepState> = new Set([
  'completed',
  'skipped',
]);

// ═══════════════════════════════════════════════════════════════
// StateMachine - Validates and performs state transitions
// ═══════════════════════════════════════════════════════════════

export class StateMachine {
  /**
   * Check if a transition is allowed.
   */
  canTransition(from: StepState, to: StepState): boolean {
    // Same state is always allowed (no-op)
    if (from === to) return true;

    return ALLOWED_TRANSITIONS.some(
      (t) => t.from === from && t.to === to
    );
  }

  /**
   * Get all possible next states from the given state.
   */
  getPossibleTransitions(from: StepState): StepState[] {
    return ALLOWED_TRANSITIONS
      .filter((t) => t.from === from)
      .map((t) => t.to);
  }

  /**
   * Check if a state is terminal (no outgoing transitions except self).
   */
  isTerminal(state: StepState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /**
   * Perform a state transition with optional guard check.
   * Returns true if the transition was successful.
   */
  async performTransition(
    stepState: RuntimeStepState,
    to: StepState,
    context?: StepContext
  ): Promise<boolean> {
    const from = stepState.state;

    if (!this.canTransition(from, to)) {
      throw new StateTransitionError(
        `Invalid transition: ${from} -> ${to}`,
        from,
        to
      );
    }

    // Find matching transition and check guard
    const transition = ALLOWED_TRANSITIONS.find(
      (t) => t.from === from && t.to === to
    );

    if (transition?.guard && context) {
      const guardResult = await transition.guard(context);
      if (!guardResult) {
        throw new StateGuardError(
          `Guard blocked transition: ${from} -> ${to}`,
          from,
          to
        );
      }
    }

    stepState.state = to;
    if (to === 'completed' || to === 'skipped' || to === 'failed') {
      stepState.completedAt = new Date().toISOString();
    }

    return true;
  }

  /**
   * Initialize step states for a new workflow instance.
   */
  initializeStepStates(stepCount: number): RuntimeStepState[] {
    return Array.from({ length: stepCount }, (_, i) => ({
      stepIndex: i,
      stepId: `step-${i}`,
      state: i === 0 ? 'in_progress' : 'pending',
      retryCount: 0,
    }));
  }

  /**
   * Get the current state of a step.
   */
  getStepState(
    instance: RuntimeWorkflowInstance,
    stepIndex: number
  ): RuntimeStepState | undefined {
    return instance.stepStates.find((s) => s.stepIndex === stepIndex);
  }

  /**
   * Get the current active step index (first non-terminal state).
   */
  getActiveStepIndex(instance: RuntimeWorkflowInstance): number | null {
    for (const step of instance.stepStates) {
      if (!this.isTerminal(step.state) && step.state !== 'pending') {
        return step.stepIndex;
      }
    }
    return null;
  }

  /**
   * Calculate progress percentage.
   */
  getProgress(instance: RuntimeWorkflowInstance): number {
    if (instance.stepStates.length === 0) return 0;
    const completed = instance.stepStates.filter((s) =>
      this.isTerminal(s.state)
    ).length;
    return Math.round((completed / instance.stepStates.length) * 100);
  }

  /**
   * Check if all steps are in a terminal state.
   */
  isComplete(instance: RuntimeWorkflowInstance): boolean {
    return instance.stepStates.every((s) => this.isTerminal(s.state));
  }

  /**
   * Check if any step failed and no retry is possible.
   */
  hasFailed(instance: RuntimeWorkflowInstance, maxRetries: number): boolean {
    return instance.stepStates.some(
      (s) => s.state === 'failed' && s.retryCount >= maxRetries
    );
  }

  /**
   * Get all steps that can be started (pending + dependencies met).
   */
  getStartableSteps(
    instance: RuntimeWorkflowInstance,
    steps: Array<{ dependencies?: string[] }>
  ): number[] {
    const startable: number[] = [];
    for (let i = 0; i < instance.stepStates.length; i++) {
      const stepState = instance.stepStates[i];
      if (stepState.state !== 'pending') continue;

      // Check dependencies
      const deps = steps[i]?.dependencies;
      if (deps && deps.length > 0) {
        const allDepsMet = deps.every((depIdx) => {
          const depState = instance.stepStates[Number(depIdx)];
          return depState?.state === 'completed';
        });
        if (!allDepsMet) continue;
      }

      startable.push(i);
    }
    return startable;
  }
}

// ═══════════════════════════════════════════════════════════════
// State Transition Error
// ═══════════════════════════════════════════════════════════════

export class StateTransitionError extends Error {
  readonly from: StepState;
  readonly to: StepState;

  constructor(message: string, from: StepState, to: StepState) {
    super(message);
    this.name = 'StateTransitionError';
    this.from = from;
    this.to = to;
  }
}

// ═══════════════════════════════════════════════════════════════
// State Guard Error
// ═══════════════════════════════════════════════════════════════

export class StateGuardError extends Error {
  readonly from: StepState;
  readonly to: StepState;

  constructor(message: string, from: StepState, to: StepState) {
    super(message);
    this.name = 'StateGuardError';
    this.from = from;
    this.to = to;
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

let globalStateMachine: StateMachine | null = null;

export function getStateMachine(): StateMachine {
  if (!globalStateMachine) {
    globalStateMachine = new StateMachine();
  }
  return globalStateMachine;
}
