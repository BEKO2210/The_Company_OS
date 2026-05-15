// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Gate Logic
// ═══════════════════════════════════════════════════════════════

import type {
  GateType,
  GateStatus,
  GateResult,
  GateConfig,
  StepContext,
} from './types.js';
import { getEventBus, createGateOpenedEvent, createGateClosedEvent } from './events.js';

// ═══════════════════════════════════════════════════════════════
// Gate Registry - Manages gate state per instance
// ═══════════════════════════════════════════════════════════════

interface GateEntry {
  instanceId: string;
  stepIndex: number;
  gateType: GateType;
  status: GateStatus;
  reason: string;
  openedBy?: string;
  openedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class GateRegistry {
  private gates: Map<string, GateEntry> = new Map();
  private readonly eventBus = getEventBus();

  private gateKey(instanceId: string, stepIndex: number, gateType: GateType): string {
    return `${instanceId}:${stepIndex}:${gateType}`;
  }

  /**
   * Register a gate for a specific step.
   */
  register(
    instanceId: string,
    stepIndex: number,
    gateType: GateType,
    reason: string = 'Gate registered',
    metadata?: Record<string, unknown>
  ): GateEntry {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    const entry: GateEntry = {
      instanceId,
      stepIndex,
      gateType,
      status: 'closed',
      reason,
      metadata,
    };
    this.gates.set(_key, entry);
    return entry;
  }

  /**
   * Open a gate (allow passage).
   */
  open(
    instanceId: string,
    stepIndex: number,
    gateType: GateType,
    openedBy: string = 'system'
  ): boolean {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    const entry = this.gates.get(_key);
    if (!entry) return false;

    entry.status = 'open';
    entry.openedBy = openedBy;
    entry.openedAt = new Date();
    entry.reason = `Gate opened by ${openedBy}`;

    this.eventBus.emit(createGateOpenedEvent(instanceId, entry.instanceId, stepIndex, gateType, openedBy));
    return true;
  }

  /**
   * Close a gate (block passage).
   */
  close(
    instanceId: string,
    stepIndex: number,
    gateType: GateType,
    reason: string
  ): boolean {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    const entry = this.gates.get(_key);
    if (!entry) return false;

    entry.status = 'closed';
    entry.openedBy = undefined;
    entry.openedAt = undefined;
    entry.reason = reason;

    this.eventBus.emit(createGateClosedEvent(instanceId, entry.instanceId, stepIndex, gateType, reason));
    return true;
  }

  /**
   * Set a gate to pending (waiting for external action).
   */
  setPending(
    instanceId: string,
    stepIndex: number,
    gateType: GateType,
    reason: string
  ): boolean {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    const entry = this.gates.get(_key);
    if (!entry) return false;

    entry.status = 'pending';
    entry.reason = reason;
    return true;
  }

  /**
   * Override a gate (force open - e.g., emergency bypass).
   */
  override(
    instanceId: string,
    stepIndex: number,
    gateType: GateType,
    overriddenBy: string
  ): boolean {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    const entry = this.gates.get(_key);
    if (!entry) return false;

    entry.status = 'overridden';
    entry.openedBy = overriddenBy;
    entry.openedAt = new Date();
    entry.reason = `Gate overridden by ${overriddenBy}`;

    this.eventBus.emit(
      createGateOpenedEvent(instanceId, entry.instanceId, stepIndex, gateType, overriddenBy)
    );
    return true;
  }

  /**
   * Get the current status of a gate.
   */
  getStatus(
    instanceId: string,
    stepIndex: number,
    gateType: GateType
): GateStatus | null {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    return this.gates.get(_key)?.status ?? null;
  }

  /**
   * Get a gate entry.
   */
  getEntry(
    instanceId: string,
    stepIndex: number,
    gateType: GateType
  ): GateEntry | undefined {
    const _key = this.gateKey(instanceId, stepIndex, gateType);
    return this.gates.get(_key);
  }

  /**
   * Check if a gate is open (allowing passage).
   */
  isOpen(instanceId: string, stepIndex: number, gateType: GateType): boolean {
    const status = this.getStatus(instanceId, stepIndex, gateType);
    return status === 'open' || status === 'overridden';
  }

  /**
   * Check if a gate is blocking.
   */
  isBlocking(instanceId: string, stepIndex: number, gateType: GateType): boolean {
    const status = this.getStatus(instanceId, stepIndex, gateType);
    return status === 'closed' || status === 'pending';
  }

  /**
   * Get all gates for an instance.
   */
  getInstanceGates(instanceId: string): GateEntry[] {
    return Array.from(this.gates.values()).filter(
      (g) => g.instanceId === instanceId
    );
  }

  /**
   * Get all gates for a specific step.
   */
  getStepGates(instanceId: string, stepIndex: number): GateEntry[] {
    return Array.from(this.gates.values()).filter(
      (g) => g.instanceId === instanceId && g.stepIndex === stepIndex
    );
  }

  /**
   * Remove all gates for an instance.
   */
  clearInstance(instanceId: string): void {
    for (const __key of this.gates.keys()) {
      if (__key.startsWith(`${instanceId}:`)) {
        this.gates.delete(__key);
      }
    }
  }

  /**
   * Check if all gates for a step are open.
   */
  allGatesOpen(instanceId: string, stepIndex: number): boolean {
    const stepGates = this.getStepGates(instanceId, stepIndex);
    if (stepGates.length === 0) return true;
    return stepGates.every((g) => g.status === 'open' || g.status === 'overridden');
  }

  /**
   * Get count of gates by status.
   */
  countByStatus(instanceId: string, status: GateStatus): number {
    return this.getInstanceGates(instanceId).filter((g) => g.status === status).length;
  }
}

// ═══════════════════════════════════════════════════════════════
// Gate Evaluator - Evaluates gate logic
// ═══════════════════════════════════════════════════════════════

export class GateEvaluator {
  private registry: GateRegistry;
  private readonly eventBus = getEventBus();

  constructor(registry: GateRegistry) {
    this.registry = registry;
  }

  /**
   * Evaluate all gates for a step.
   * Returns a combined GateResult.
   */
  async evaluateStepGates(
    context: StepContext
  ): Promise<GateResult> {
    const { instanceId, stepIndex, step } = context;

    // If step has no gate config and no blockingGate flag, it's open
    if (!step.gate && !step.blockingGate) {
      return {
        gateType: 'approval',
        status: 'open',
        blocking: false,
        reason: 'No gate configured',
      };
    }

    // If step has gate config, evaluate it
    if (step.gate) {
      return this.evaluateGate(context, step.gate);
    }

    // If step has blockingGate flag (legacy), check approval gate
    if (step.blockingGate) {
      // Auto-register the gate if not already registered
      if (!this.registry.getEntry(instanceId, stepIndex, 'approval')) {
        this.registry.register(instanceId, stepIndex, 'approval', 'Auto-registered blocking gate');
      }
      const isOpen = this.registry.isOpen(instanceId, stepIndex, 'approval');
      return {
        gateType: 'approval',
        status: isOpen ? 'open' : 'closed',
        blocking: !isOpen,
        reason: isOpen ? 'Approval granted' : 'Approval required',
      };
    }

    return {
      gateType: 'approval',
      status: 'open',
      blocking: false,
      reason: 'No gate configured',
    };
  }

  /**
   * Evaluate a specific gate configuration.
   */
  async evaluateGate(
    context: StepContext,
    gateConfig: GateConfig
  ): Promise<GateResult> {
    const { instanceId, stepIndex } = context;

    // Register the gate if not already registered
    const _key = `${instanceId}:${stepIndex}:${gateConfig.type}`;
    if (!this.registry.getEntry(instanceId, stepIndex, gateConfig.type)) {
      this.registry.register(instanceId, stepIndex, gateConfig.type, 'Gate auto-registered', gateConfig.metadata);
    }

    switch (gateConfig.type) {
      case 'approval':
        return this.evaluateApprovalGate(context, gateConfig);
      case 'safety':
        return this.evaluateSafetyGate(context, gateConfig);
      case 'budget':
        return this.evaluateBudgetGate(context, gateConfig);
      case 'time':
        return this.evaluateTimeGate(context, gateConfig);
      case 'human':
        return this.evaluateHumanGate(context, gateConfig);
      default:
        return {
          gateType: gateConfig.type,
          status: 'open',
          blocking: false,
          reason: 'Unknown gate type - allowing passage',
        };
    }
  }

  // ─── Approval Gate ───
  private evaluateApprovalGate(
    context: StepContext,
    config: GateConfig
  ): GateResult {
    const { instanceId, stepIndex } = context;
    const isOpen = this.registry.isOpen(instanceId, stepIndex, 'approval');

    if (isOpen) {
      return {
        gateType: 'approval',
        status: 'open',
        blocking: false,
        reason: 'Approval granted',
      };
    }

    // Check for red line (always blocking)
    if (config.metadata?.redLine === true) {
      return {
        gateType: 'approval',
        status: 'closed',
        blocking: true,
        reason: 'RED LINE: Cannot proceed without explicit approval',
        metadata: { redLine: true },
      };
    }

    return {
      gateType: 'approval',
      status: 'closed',
      blocking: config.required !== false,
      reason: 'Approval required before proceeding',
      metadata: { approvers: config.approvers },
    };
  }

  // ─── Safety Gate ───
  private evaluateSafetyGate(
    context: StepContext,
    config: GateConfig
  ): GateResult {
    const { instanceId, stepIndex } = context;
    const isOpen = this.registry.isOpen(instanceId, stepIndex, 'safety');

    if (isOpen) {
      return {
        gateType: 'safety',
        status: 'open',
        blocking: false,
        reason: 'Safety veto lifted',
      };
    }

    // Check if safety veto is active
    const entry = this.registry.getEntry(instanceId, stepIndex, 'safety');
    if (entry?.metadata?.vetoActive === true) {
      return {
        gateType: 'safety',
        status: 'closed',
        blocking: true,
        reason: 'Safety veto active - only Safety-Agent can lift',
        metadata: { vetoBy: entry.metadata.vetoBy },
      };
    }

    return {
      gateType: 'safety',
      status: 'closed',
      blocking: config.required !== false,
      reason: 'Safety check required',
    };
  }

  // ─── Budget Gate ───
  private evaluateBudgetGate(
    context: StepContext,
    config: GateConfig
  ): GateResult {
    const { instanceId, stepIndex, context: wfContext } = context;
    const isOpen = this.registry.isOpen(instanceId, stepIndex, 'budget');

    if (isOpen) {
      return {
        gateType: 'budget',
        status: 'open',
        blocking: false,
        reason: 'Budget approved',
      };
    }

    const budget = (wfContext.budget as number) ?? 0;
    const threshold = config.threshold ?? Infinity;
    const warningAt = config.metadata?.warningAt as number | undefined ?? 70;
    const criticalAt = config.metadata?.criticalAt as number | undefined ?? 90;

    // Check budget threshold (percentage of limit used)
    if (threshold !== Infinity && threshold > 0) {
      const usagePercent = Math.round((budget / threshold) * 100);

      if (usagePercent >= criticalAt) {
        return {
          gateType: 'budget',
          status: 'closed',
          blocking: true,
          reason: `CRITICAL: Budget at ${usagePercent}% of limit (${budget}/${threshold})`,
          metadata: { budget, threshold, usagePercent },
        };
      }

      if (usagePercent >= warningAt) {
        return {
          gateType: 'budget',
          status: 'pending',
          blocking: config.required !== false,
          reason: `WARNING: Budget at ${usagePercent}% of limit (${budget}/${threshold})`,
          metadata: { budget, threshold, usagePercent, warning: true },
        };
      }
    }

    return {
      gateType: 'budget',
      status: 'closed',
      blocking: config.required !== false,
      reason: 'Budget check required',
    };
  }

  // ─── Time Gate ───
  private evaluateTimeGate(
    context: StepContext,
    config: GateConfig
  ): GateResult {
    const { instanceId, stepIndex } = context;
    const isOpen = this.registry.isOpen(instanceId, stepIndex, 'time');

    if (isOpen) {
      return {
        gateType: 'time',
        status: 'open',
        blocking: false,
        reason: 'Time gate opened',
      };
    }

    // Check if a specific time is configured
    const targetTime = config.metadata?.targetTime as string | undefined;
    if (targetTime) {
      const now = new Date();
      const target = new Date(targetTime);
      if (now < target) {
        return {
          gateType: 'time',
          status: 'closed',
          blocking: true,
          reason: `Time gate: waiting until ${target.toISOString()}`,
          metadata: { targetTime, now: now.toISOString() },
        };
      } else {
        // Time has passed - auto-open
        this.registry.open(instanceId, stepIndex, 'time', 'time-gate');
        return {
          gateType: 'time',
          status: 'open',
          blocking: false,
          reason: `Time gate: target time ${target.toISOString()} reached`,
        };
      }
    }

    return {
      gateType: 'time',
      status: 'closed',
      blocking: config.required !== false,
      reason: 'Time gate not yet reached',
    };
  }

  // ─── Human Gate ───
  private evaluateHumanGate(
    context: StepContext,
    config: GateConfig
  ): GateResult {
    const { instanceId, stepIndex } = context;
    const isOpen = this.registry.isOpen(instanceId, stepIndex, 'human');

    if (isOpen) {
      return {
        gateType: 'human',
        status: 'open',
        blocking: false,
        reason: 'Human approval granted',
      };
    }

    return {
      gateType: 'human',
      status: 'closed',
      blocking: config.required !== false,
      reason: 'Human review required',
      metadata: { approvers: config.approvers },
    };
  }

  /**
   * Activate a safety veto (emergency stop).
   */
  activateSafetyVeto(
    instanceId: string,
    stepIndex: number,
    vetoBy: string,
    reason: string
  ): void {
    this.registry.register(instanceId, stepIndex, 'safety', reason, {
      vetoActive: true,
      vetoBy,
      vetoAt: new Date().toISOString(),
    });
    this.registry.close(instanceId, stepIndex, 'safety', `Safety veto: ${reason} (by ${vetoBy})`);
  }

  /**
   * Lift a safety veto.
   */
  liftSafetyVeto(
    instanceId: string,
    stepIndex: number,
    liftedBy: string
  ): boolean {
    const entry = this.registry.getEntry(instanceId, stepIndex, 'safety');
    if (!entry) return false;

    entry.metadata = {
      ...entry.metadata,
      vetoActive: false,
      liftedBy,
      liftedAt: new Date().toISOString(),
    };

    return this.registry.open(instanceId, stepIndex, 'safety', liftedBy);
  }
}

// ═══════════════════════════════════════════════════════════════
// Gate Convenience Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a step can be skipped based on gate conditions.
 */
export function canSkipGate(context: StepContext): boolean {
  const { instanceId, stepIndex } = context;
  const registry = getGateRegistry();
  const stepGates = registry.getStepGates(instanceId, stepIndex);

  // Can skip if no required gates are blocking
  return stepGates.every(
    (g) => g.gateType === 'approval' || g.status === 'overridden'
  );
}

// ═══════════════════════════════════════════════════════════════
// Singletons
// ═══════════════════════════════════════════════════════════════

let globalGateRegistry: GateRegistry | null = null;
let globalGateEvaluator: GateEvaluator | null = null;

export function getGateRegistry(): GateRegistry {
  if (!globalGateRegistry) {
    globalGateRegistry = new GateRegistry();
  }
  return globalGateRegistry;
}

export function getGateEvaluator(registry?: GateRegistry): GateEvaluator {
  if (!globalGateEvaluator) {
    globalGateEvaluator = new GateEvaluator(registry || getGateRegistry());
  }
  return globalGateEvaluator;
}

export function resetGates(): void {
  globalGateRegistry = null;
  globalGateEvaluator = null;
}
