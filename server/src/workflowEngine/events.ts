// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Event System
// ═══════════════════════════════════════════════════════════════

import type { WorkflowEvent, EventHandler } from './types.js';

/**
 * EventBus - Central pub/sub for workflow events.
 * All state changes emit events that can be subscribed to.
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private onceHandlers: Map<string, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();

  /**
   * Subscribe to a specific event type.
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Subscribe once - handler auto-removes after first call.
   */
  once(eventType: string, handler: EventHandler): void {
    if (!this.onceHandlers.has(eventType)) {
      this.onceHandlers.set(eventType, new Set());
    }
    this.onceHandlers.get(eventType)!.add(handler);
  }

  /**
   * Subscribe to all event types (wildcard).
   */
  onAny(handler: EventHandler): void {
    this.wildcardHandlers.add(handler);
  }

  /**
   * Remove a specific handler for an event type.
   */
  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
    this.onceHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Remove a wildcard handler.
   */
  offAny(handler: EventHandler): void {
    this.wildcardHandlers.delete(handler);
  }

  /**
   * Remove all handlers for an event type.
   */
  offAll(eventType: string): void {
    this.handlers.delete(eventType);
    this.onceHandlers.delete(eventType);
  }

  /**
   * Emit an event to all subscribers.
   * Handlers are called concurrently (fire-and-forget).
   */
  emit(event: WorkflowEvent): void {
    // Specific handlers
    const specific = this.handlers.get(event.type);
    if (specific) {
      for (const handler of specific) {
        this.safeInvoke(handler, event);
      }
    }

    // Once handlers
    const once = this.onceHandlers.get(event.type);
    if (once) {
      for (const handler of once) {
        this.safeInvoke(handler, event);
      }
      this.onceHandlers.delete(event.type);
    }

    // Wildcard handlers
    for (const handler of this.wildcardHandlers) {
      this.safeInvoke(handler, event);
    }
  }

  /**
   * Emit a new event with the given type and data.
   */
  emitNew(
    type: WorkflowEvent['type'],
    instanceId: string,
    workflowId: string,
    data?: Record<string, unknown>,
    stepIndex?: number
  ): void {
    this.emit({
      type,
      instanceId,
      workflowId,
      stepIndex,
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Get count of active handlers for an event type.
   */
  listenerCount(eventType: string): number {
    return (
      (this.handlers.get(eventType)?.size ?? 0) +
      (this.onceHandlers.get(eventType)?.size ?? 0)
    );
  }

  /**
   * Get total wildcard listener count.
   */
  wildcardListenerCount(): number {
    return this.wildcardHandlers.size;
  }

  /**
   * Remove all handlers (useful in tests).
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
    this.wildcardHandlers.clear();
  }

  private safeInvoke(handler: EventHandler, event: WorkflowEvent): void {
    try {
      const result = handler(event);
      if (result && typeof result.then === 'function') {
        result.catch((err: unknown) => {
          console.error(
            `[EventBus] Async handler error for ${event.type}:`,
            err instanceof Error ? err.message : String(err)
          );
        });
      }
    } catch (err: unknown) {
      console.error(
        `[EventBus] Handler error for ${event.type}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

// ─── Singleton EventBus ───
let globalEventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function resetEventBus(): void {
  globalEventBus?.clear();
  globalEventBus = new EventBus();
}

// ═══════════════════════════════════════════════════════════════
// Pre-built Event Factories
// ═══════════════════════════════════════════════════════════════

export function createStepStartedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  stepName: string
): WorkflowEvent {
  return {
    type: 'step_started',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { stepName },
  };
}

export function createStepCompletedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  stepName: string,
  output?: Record<string, unknown>
): WorkflowEvent {
  return {
    type: 'step_completed',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { stepName, output },
  };
}

export function createStepBlockedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  stepName: string,
  gateType: string,
  reason: string
): WorkflowEvent {
  return {
    type: 'step_blocked',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { stepName, gateType, reason },
  };
}

export function createStepFailedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  stepName: string,
  error: string,
  retryCount: number
): WorkflowEvent {
  return {
    type: 'step_failed',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { stepName, error, retryCount },
  };
}

export function createStepSkippedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  stepName: string,
  reason: string
): WorkflowEvent {
  return {
    type: 'step_skipped',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { stepName, reason },
  };
}

export function createGateOpenedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  gateType: string,
  openedBy: string
): WorkflowEvent {
  return {
    type: 'gate_opened',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { gateType, openedBy },
  };
}

export function createGateClosedEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  gateType: string,
  reason: string
): WorkflowEvent {
  return {
    type: 'gate_closed',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { gateType, reason },
  };
}

export function createWorkflowStartedEvent(
  instanceId: string,
  workflowId: string,
  context: Record<string, unknown>
): WorkflowEvent {
  return {
    type: 'workflow_started',
    instanceId,
    workflowId,
    timestamp: new Date(),
    data: { context },
  };
}

export function createWorkflowCompletedEvent(
  instanceId: string,
  workflowId: string,
  result?: Record<string, unknown>
): WorkflowEvent {
  return {
    type: 'workflow_completed',
    instanceId,
    workflowId,
    timestamp: new Date(),
    data: { result },
  };
}

export function createWorkflowCancelledEvent(
  instanceId: string,
  workflowId: string,
  reason: string
): WorkflowEvent {
  return {
    type: 'workflow_cancelled',
    instanceId,
    workflowId,
    timestamp: new Date(),
    data: { reason },
  };
}

export function createWorkflowFailedEvent(
  instanceId: string,
  workflowId: string,
  data?: Record<string, unknown>
): WorkflowEvent {
  return {
    type: 'workflow_failed',
    instanceId,
    workflowId,
    timestamp: new Date(),
    data,
  };
}

export function createWorkflowPausedEvent(
  instanceId: string,
  workflowId: string
): WorkflowEvent {
  return {
    type: 'workflow_paused',
    instanceId,
    workflowId,
    timestamp: new Date(),
  };
}

export function createWorkflowResumedEvent(
  instanceId: string,
  workflowId: string
): WorkflowEvent {
  return {
    type: 'workflow_resumed',
    instanceId,
    workflowId,
    timestamp: new Date(),
  };
}

export function createTimeoutEscalationEvent(
  instanceId: string,
  workflowId: string,
  stepIndex: number,
  elapsedMs: number
): WorkflowEvent {
  return {
    type: 'timeout_escalation',
    instanceId,
    workflowId,
    stepIndex,
    timestamp: new Date(),
    data: { elapsedMs },
  };
}
