// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Trigger System
// ═══════════════════════════════════════════════════════════════

import type { TriggerConfig, WorkflowContext } from './types.js';

// ═══════════════════════════════════════════════════════════════
// Trigger Registry
// ═══════════════════════════════════════════════════════════════

export class TriggerRegistry {
  private triggers: Map<string, TriggerConfig> = new Map();
  private activeTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private activeTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private eventListeners: Map<string, Set<(payload: Record<string, unknown>) => void>> = new Map();
  private webhookPaths: Map<string, TriggerConfig> = new Map();

  /**
   * Register a trigger.
   */
  register(config: TriggerConfig): void {
    this.triggers.set(config.id, config);

    // Register webhook path if applicable
    if (config.webhook?.path) {
      this.webhookPaths.set(config.webhook.path, config);
    }
  }

  /**
   * Unregister a trigger and clean up resources.
   */
  unregister(triggerId: string): void {
    const config = this.triggers.get(triggerId);
    if (!config) return;

    // Clear timers
    const timer = this.activeTimers.get(triggerId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(triggerId);
    }

    const timeout = this.activeTimeouts.get(triggerId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(triggerId);
    }

    // Clear webhook
    if (config.webhook?.path) {
      this.webhookPaths.delete(config.webhook.path);
    }

    this.triggers.delete(triggerId);
  }

  /**
   * Get a trigger by ID.
   */
  get(triggerId: string): TriggerConfig | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Get all triggers.
   */
  getAll(): TriggerConfig[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get triggers for a workflow.
   */
  getForWorkflow(workflowId: string): TriggerConfig[] {
    return this.getAll().filter((t) => t.workflowId === workflowId);
  }

  /**
   * Get trigger by webhook path.
   */
  getByWebhookPath(path: string): TriggerConfig | undefined {
    return this.webhookPaths.get(path);
  }

  /**
   * Enable a trigger.
   */
  enable(triggerId: string): boolean {
    const config = this.triggers.get(triggerId);
    if (!config) return false;
    config.enabled = true;
    return true;
  }

  /**
   * Disable a trigger.
   */
  disable(triggerId: string): boolean {
    const config = this.triggers.get(triggerId);
    if (!config) return false;
    config.enabled = false;

    // Stop any running timers
    const timer = this.activeTimers.get(triggerId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(triggerId);
    }

    const timeout = this.activeTimeouts.get(triggerId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(triggerId);
    }

    return true;
  }

  /**
   * Check if a trigger is enabled.
   */
  isEnabled(triggerId: string): boolean {
    return this.triggers.get(triggerId)?.enabled ?? false;
  }

  /**
   * Activate a schedule trigger (start timer).
   */
  activateSchedule(triggerId: string, callback: () => void): boolean {
    const config = this.triggers.get(triggerId);
    if (!config || !config.enabled || config.type !== 'schedule') return false;

    // Clear existing timer
    const existing = this.activeTimers.get(triggerId);
    if (existing) {
      clearInterval(existing);
    }

    const schedule = config.schedule;
    if (!schedule) return false;

    // Run once at specific time
    if (schedule.runOnceAt) {
      const target = new Date(schedule.runOnceAt);
      const now = new Date();
      const delay = target.getTime() - now.getTime();

      if (delay > 0) {
        const timeout = setTimeout(() => {
          if (this.triggers.get(triggerId)?.enabled) {
            callback();
          }
        }, delay);
        this.activeTimeouts.set(triggerId, timeout);
        return true;
      }
      // Target time already passed - fire immediately
      callback();
      return true;
    }

    // Interval-based
    if (schedule.intervalMs && schedule.intervalMs > 0) {
      const timer = setInterval(() => {
        if (this.triggers.get(triggerId)?.enabled) {
          callback();
        }
      }, schedule.intervalMs);
      this.activeTimers.set(triggerId, timer);
      return true;
    }

    // Default: 60 second poll
    const timer = setInterval(() => {
      if (this.triggers.get(triggerId)?.enabled) {
        callback();
      }
    }, 60000);
    this.activeTimers.set(triggerId, timer);
    return true;
  }

  /**
   * Activate an event trigger (register listener).
   */
  activateEvent(triggerId: string, callback: (payload: Record<string, unknown>) => void): boolean {
    const config = this.triggers.get(triggerId);
    if (!config || !config.enabled || config.type !== 'event') return false;

    const eventName = config.event?.eventName;
    if (!eventName) return false;

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }

    this.eventListeners.get(eventName)!.add(callback);
    return true;
  }

  /**
   * Deactivate an event trigger.
   */
  deactivateEvent(triggerId: string, callback: (payload: Record<string, unknown>) => void): boolean {
    const config = this.triggers.get(triggerId);
    if (!config || config.type !== 'event') return false;

    const eventName = config.event?.eventName;
    if (!eventName) return false;

    this.eventListeners.get(eventName)?.delete(callback);
    return true;
  }

  /**
   * Dispatch an event to all listeners.
   */
  dispatchEvent(eventName: string, payload: Record<string, unknown>): void {
    const listeners = this.eventListeners.get(eventName);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(payload);
      } catch (err: unknown) {
        console.error(`[Trigger] Event listener error for ${eventName}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  /**
   * Clean up all resources.
   */
  clear(): void {
    for (const timer of this.activeTimers.values()) {
      clearInterval(timer);
    }
    this.activeTimers.clear();

    for (const timeout of this.activeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    this.eventListeners.clear();
    this.webhookPaths.clear();
    this.triggers.clear();
  }

  /**
   * Get count of active triggers.
   */
  getActiveCount(): number {
    return Array.from(this.triggers.values()).filter((t) => t.enabled).length;
  }
}

// ═══════════════════════════════════════════════════════════════
// Trigger Factory Functions
// ═══════════════════════════════════════════════════════════════

export function createScheduleTrigger(
  workflowId: string,
  intervalMs: number,
  context?: WorkflowContext
): TriggerConfig {
  return {
    id: `trg-schedule-${Date.now()}`,
    type: 'schedule',
    workflowId,
    enabled: true,
    schedule: { intervalMs },
    context,
  };
}

export function createCronTrigger(
  workflowId: string,
  cron: string,
  timezone?: string,
  context?: WorkflowContext
): TriggerConfig {
  return {
    id: `trg-cron-${Date.now()}`,
    type: 'schedule',
    workflowId,
    enabled: true,
    schedule: { cron, timezone },
    context,
  };
}

export function createEventTrigger(
  workflowId: string,
  eventName: string,
  condition?: (payload: Record<string, unknown>) => boolean,
  context?: WorkflowContext
): TriggerConfig {
  return {
    id: `trg-event-${Date.now()}`,
    type: 'event',
    workflowId,
    enabled: true,
    event: { eventName, condition },
    context,
  };
}

export function createWebhookTrigger(
  workflowId: string,
  path: string,
  secret?: string,
  context?: WorkflowContext
): TriggerConfig {
  return {
    id: `trg-webhook-${Date.now()}`,
    type: 'webhook',
    workflowId,
    enabled: true,
    webhook: { path, secret, method: 'POST' },
    context,
  };
}

export function createManualTrigger(
  workflowId: string,
  allowedRoles?: string[],
  context?: WorkflowContext
): TriggerConfig {
  return {
    id: `trg-manual-${Date.now()}`,
    type: 'manual',
    workflowId,
    enabled: true,
    manual: { allowedRoles },
    context,
  };
}

// ═══════════════════════════════════════════════════════════════
// Pre-built Triggers
// ═══════════════════════════════════════════════════════════════

/** Daily CEO Report at 08:00 */
export function createDailyCEOReportTrigger(context?: WorkflowContext): TriggerConfig {
  return {
    id: 'trg-ceo-daily',
    type: 'schedule',
    workflowId: 'ceo-daily-report',
    enabled: true,
    schedule: {
      runOnceAt: getNext0800(),
      timezone: 'Europe/Berlin',
    },
    context,
  };
}

/** Lead Intake Trigger - fires on new lead events */
export function createLeadIntakeTrigger(context?: WorkflowContext): TriggerConfig {
  return {
    id: 'trg-lead-intake',
    type: 'event',
    workflowId: 'lead-intake',
    enabled: true,
    event: { eventName: 'lead.created' },
    context,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getNext0800(): string {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    8, 0, 0
  );
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString();
}

// ═══════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════

let globalTriggerRegistry: TriggerRegistry | null = null;

export function getTriggerRegistry(): TriggerRegistry {
  if (!globalTriggerRegistry) {
    globalTriggerRegistry = new TriggerRegistry();
  }
  return globalTriggerRegistry;
}

export function resetTriggers(): void {
  globalTriggerRegistry?.clear();
  globalTriggerRegistry = new TriggerRegistry();
}
