// ═══════════════════════════════════════════════════════════════
// The Company OS - Health Monitor
// RUN-005: Regelmaessige Health Checks, automatische Eskalation
// ═══════════════════════════════════════════════════════════════

import { db } from '../db/connection.js';
import {
  type HealthCheck,
  type HealthCheckDbRecord,
  type HealthStatus,
  type AgentMetrics,
  type DbInstance,
} from './types.js';
import { getBreaker } from './circuitBreaker.js';

// ─── Default Thresholds ───

const DEFAULT_HEALTH_INTERVAL_MS = 30000; // 30s

const HEALTH_THRESHOLDS = {
  responseTime: { degraded: 2000, unhealthy: 5000 },
  errorRate: { degraded: 0.1, unhealthy: 0.25 },
  throughput: { degraded: 10, unhealthy: 1 },
  consecutiveErrors: { degraded: 3, unhealthy: 5 },
  consecutiveTimeouts: { degraded: 2, unhealthy: 3 },
};

// ─── Utility ───

function now(): Date {
  return new Date();
}

function generateId(): string {
  return `hc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── In-Memory Agent Registry ───

type HealthCheckFn = () => Promise<HealthCheck>;

const registeredAgents = new Map<string, HealthCheckFn>();
const lastHealthCheck = new Map<string, HealthCheck>();

// ─── Health Monitor Class ───

export class HealthMonitor {
  private db: DbInstance;
  private intervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private onUnhealthy?: (check: HealthCheck) => void;
  private onEscalation?: (check: HealthCheck) => void;

  constructor(
    database?: DbInstance,
    intervalMs?: number,
    callbacks?: {
      onUnhealthy?: (check: HealthCheck) => void;
      onEscalation?: (check: HealthCheck) => void;
    }
  ) {
    this.db = database || db;
    this.intervalMs = intervalMs || DEFAULT_HEALTH_INTERVAL_MS;
    if (callbacks) {
      this.onUnhealthy = callbacks.onUnhealthy;
      this.onEscalation = callbacks.onEscalation;
    }
  }

  // ─── Lifecycle ───

  startMonitoring(intervalMs?: number): void {
    if (intervalMs) {
      this.intervalMs = intervalMs;
    }

    if (this.isRunning) {
      console.warn('[HealthMonitor] Already running, stopping first');
      this.stopMonitoring();
    }

    this.isRunning = true;

    // Run immediately
    this.runAllChecks().catch(err => {
      console.error('[HealthMonitor] Initial check failed:', (err as Error).message);
    });

    // Schedule recurring checks
    this.intervalId = setInterval(() => {
      this.runAllChecks().catch(err => {
        console.error('[HealthMonitor] Periodic check failed:', (err as Error).message);
      });
    }, this.intervalMs);

    console.log(`[HealthMonitor] Started monitoring every ${this.intervalMs}ms`);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[HealthMonitor] Stopped monitoring');
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }

  // ─── Agent Registration ───

  registerAgent(agentId: string, checkFn?: HealthCheckFn): void {
    registeredAgents.set(agentId, checkFn || this.defaultCheckFn(agentId));
    console.log(`[HealthMonitor] Registered agent "${agentId}"`);
  }

  unregisterAgent(agentId: string): void {
    registeredAgents.delete(agentId);
    lastHealthCheck.delete(agentId);
    console.log(`[HealthMonitor] Unregistered agent "${agentId}"`);
  }

  // ─── Health Checks ───

  async checkAgent(agentId: string): Promise<HealthCheck> {
    const checkFn = registeredAgents.get(agentId);
    if (checkFn) {
      try {
        const check = await checkFn();
        this.persistCheck(check);
        lastHealthCheck.set(agentId, check);
        return check;
      } catch (err) {
        const failedCheck = this.createFailedCheck(agentId, (err as Error).message);
        this.persistCheck(failedCheck);
        lastHealthCheck.set(agentId, failedCheck);
        return failedCheck;
      }
    }

    // No custom check function - use default
    const check = await this.defaultCheckFn(agentId)();
    this.persistCheck(check);
    lastHealthCheck.set(agentId, check);
    return check;
  }

  async checkAllAgents(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Also check agents from DB that aren't registered
    try {
      const dbAgents = this.db
        .prepare("SELECT id FROM agents WHERE status = 'active'")
        .all() as { id: string }[];

      for (const agent of dbAgents) {
        if (!registeredAgents.has(agent.id)) {
          registeredAgents.set(agent.id, this.defaultCheckFn(agent.id));
        }
      }
    } catch (err) {
      console.warn('[HealthMonitor] Failed to load agents from DB:', (err as Error).message);
    }

    for (const [agentId] of registeredAgents) {
      try {
        const check = await this.checkAgent(agentId);
        checks.push(check);
      } catch (err) {
        const failedCheck = this.createFailedCheck(agentId, (err as Error).message);
        checks.push(failedCheck);
      }
    }

    return checks;
  }

  getUnhealthyAgents(): HealthCheck[] {
    return Array.from(lastHealthCheck.values()).filter(
      check => check.status === 'degraded' || check.status === 'unhealthy'
    );
  }

  getLastCheck(agentId: string): HealthCheck | undefined {
    return lastHealthCheck.get(agentId);
  }

  // ─── Private: Run All Checks ───

  private async runAllChecks(): Promise<void> {
    const checks = await this.checkAllAgents();

    for (const check of checks) {
      // Trigger callbacks for unhealthy agents
      if (check.status === 'unhealthy') {
        this.onUnhealthy?.(check);

        // Auto-escalation: quarantine if extremely unhealthy
        if (check.escalationLevel >= 3) {
          this.onEscalation?.(check);
          console.error(
            `[HealthMonitor] ESCALATION for agent "${check.agentId}": ` +
            `status=${check.status}, errors=${check.metrics.consecutiveErrors}`
          );
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      const healthy = checks.filter(c => c.status === 'healthy').length;
      const degraded = checks.filter(c => c.status === 'degraded').length;
      const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
      console.log(
        `[HealthMonitor] Checks complete: ${healthy} healthy, ${degraded} degraded, ${unhealthy} unhealthy`
      );
    }
  }

  // ─── Private: Default Check Function ───

  private defaultCheckFn(agentId: string): HealthCheckFn {
    return async (): Promise<HealthCheck> => {
      // Get circuit breaker metrics
      let breakerMetrics: { failureCount: number; successCount: number } | null = null;
      try {
        const breaker = getBreaker(agentId);
        const m = breaker.getMetrics();
        breakerMetrics = { failureCount: m.failureCount, successCount: m.successCount };
      } catch {
        // Breaker may not exist yet
      }

      // Get last check from DB for trend analysis
      let previousCheck: HealthCheckDbRecord | undefined;
      try {
        previousCheck = this.db
          .prepare(`
            SELECT * FROM health_checks
            WHERE agent_id = ?
            ORDER BY checked_at DESC
            LIMIT 1
          `)
          .get(agentId) as HealthCheckDbRecord | undefined;
      } catch {
        // Table may not exist yet
      }

      // Simulate ping timing
      const pingStart = Date.now();
      let pingSuccess = true;
      let pingError = '';

      try {
        // Check if agent exists in DB
        const agent = this.db
          .prepare('SELECT status, budget_spent, budget_limit FROM agents WHERE id = ?')
          .get(agentId) as { status: string; budget_spent: number; budget_limit: number } | undefined;

        if (!agent) {
          pingSuccess = false;
          pingError = 'Agent not found in database';
        } else if (agent.status === 'quarantine') {
          pingSuccess = false;
          pingError = 'Agent is quarantined';
        }
      } catch {
        pingSuccess = false;
        pingError = 'Database error during ping';
      }

      const responseTime = Date.now() - pingStart;

      // Calculate metrics
      const metrics: AgentMetrics = {
        responseTime,
        errorRate: breakerMetrics
          ? breakerMetrics.failureCount / Math.max(breakerMetrics.failureCount + breakerMetrics.successCount, 1)
          : 0,
        throughput: previousCheck?.throughput ?? 0,
        lastActivity: previousCheck ? new Date(previousCheck.checked_at) : now(),
        consecutiveErrors: breakerMetrics?.failureCount ?? 0,
        consecutiveTimeouts: pingError.includes('timeout') ? 1 : 0,
      };

      return this.evaluateHealth(agentId, metrics, pingSuccess);
    };
  }

  // ─── Private: Health Evaluation ───

  private evaluateHealth(
    agentId: string,
    metrics: AgentMetrics,
    pingSuccess: boolean
  ): HealthCheck {
    const checks = {
      pingCheck: pingSuccess,
      errorRateCheck: metrics.errorRate < HEALTH_THRESHOLDS.errorRate.unhealthy,
      responseTimeCheck: metrics.responseTime < HEALTH_THRESHOLDS.responseTime.unhealthy,
      throughputCheck: true, // Not critical by default
    };

    let status: HealthStatus = 'healthy';
    let escalationLevel = 0;
    let recommendation = 'No action needed';

    // Count failures
    const failedChecks = Object.values(checks).filter(c => !c).length;

    if (!pingSuccess || failedChecks >= 2 || metrics.consecutiveErrors >= HEALTH_THRESHOLDS.consecutiveErrors.unhealthy) {
      status = 'unhealthy';
      escalationLevel = 3;
      recommendation = this.getRecommendation('unhealthy', metrics);
    } else if (
      failedChecks === 1 ||
      metrics.errorRate >= HEALTH_THRESHOLDS.errorRate.degraded ||
      metrics.responseTime >= HEALTH_THRESHOLDS.responseTime.degraded ||
      metrics.consecutiveErrors >= HEALTH_THRESHOLDS.consecutiveErrors.degraded
    ) {
      status = 'degraded';
      escalationLevel = 1;
      recommendation = this.getRecommendation('degraded', metrics);
    }

    return {
      agentId,
      status,
      lastPing: now(),
      metrics,
      checks,
      escalationLevel,
      recommendation,
    };
  }

  private getRecommendation(status: HealthStatus, metrics: AgentMetrics): string {
    switch (status) {
      case 'degraded':
        if (metrics.errorRate > 0.15) return 'Monitor error rate, consider circuit breaker';
        if (metrics.responseTime > 2000) return 'Response time elevated, investigate load';
        if (metrics.consecutiveErrors > 0) return 'Recent errors detected, monitor closely';
        return 'Monitor agent health';
      case 'unhealthy':
        if (metrics.errorRate > 0.25) return 'Circuit breaker recommended';
        if (metrics.responseTime > 5000) return 'Severe latency, consider quarantine';
        if (metrics.consecutiveErrors >= 3) return 'Quarantine recommended';
        return 'Immediate intervention required';
      default:
        return 'No action needed';
    }
  }

  private createFailedCheck(agentId: string, errorMessage: string): HealthCheck {
    return {
      agentId,
      status: 'unhealthy',
      lastPing: now(),
      metrics: {
        responseTime: -1,
        errorRate: 1.0,
        throughput: 0,
        lastActivity: now(),
        consecutiveErrors: 999,
        consecutiveTimeouts: 999,
      },
      checks: {
        pingCheck: false,
        errorRateCheck: false,
        responseTimeCheck: false,
        throughputCheck: false,
      },
      escalationLevel: 3,
      recommendation: `Check failed: ${errorMessage}`,
    };
  }

  // ─── Private: Persistence ───

  private persistCheck(check: HealthCheck): void {
    try {
      this.db.prepare(`
        INSERT INTO health_checks (id, agent_id, status, response_time, error_rate, throughput, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        generateId(),
        check.agentId,
        check.status,
        Math.round(check.metrics.responseTime),
        check.metrics.errorRate,
        check.metrics.throughput
      );
    } catch (err) {
      // Table may not exist yet
      console.warn(`[HealthMonitor] Failed to persist check for "${check.agentId}":`, (err as Error).message);
    }
  }

  // ─── Stats ───

  getStats(): {
    registeredAgents: number;
    isMonitoring: boolean;
    intervalMs: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  } {
    const checks = Array.from(lastHealthCheck.values());
    return {
      registeredAgents: registeredAgents.size,
      isMonitoring: this.isRunning,
      intervalMs: this.intervalMs,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };
  }
}

// ─── Singleton Instance ───

let healthMonitorInstance: HealthMonitor | null = null;

export function getHealthMonitor(
  callbacks?: {
    onUnhealthy?: (check: HealthCheck) => void;
    onEscalation?: (check: HealthCheck) => void;
  }
): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor(undefined, undefined, callbacks);
  }
  return healthMonitorInstance;
}

export function resetHealthMonitor(): void {
  if (healthMonitorInstance) {
    healthMonitorInstance.stopMonitoring();
  }
  healthMonitorInstance = null;
  registeredAgents.clear();
  lastHealthCheck.clear();
}

// ═══════════════════════════════════════════════════════════════
// Standalone helpers
// ═══════════════════════════════════════════════════════════════

export async function quickHealthCheck(agentId: string): Promise<HealthCheck> {
  return getHealthMonitor().checkAgent(agentId);
}

export function registerForMonitoring(
  agentId: string,
  checkFn?: () => Promise<HealthCheck>
): void {
  getHealthMonitor().registerAgent(agentId, checkFn);
}
