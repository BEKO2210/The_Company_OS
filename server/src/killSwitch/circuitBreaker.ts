// ═══════════════════════════════════════════════════════════════
// The Company OS - Circuit Breaker (Level 1)
// RUN-005: Automatischer, fein-granularer Schutz pro Agent
// ═══════════════════════════════════════════════════════════════

import { db } from '../db/connection.js';
import {
  type CircuitBreakerConfig,
  type CircuitBreakerState,
  type BreakerState,
  type BreakerMetrics,
  type CircuitBreakerRecord,
  type DbInstance,
  DEFAULT_BREAKER_CONFIG,
} from './types.js';

// ─── In-Memory Cache for Active Breakers ───

const breakerCache = new Map<string, CircuitBreaker>();

// ─── Utility ───

function now(): Date {
  return new Date();
}

function _generateId(): string {
  return `cb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Circuit Breaker Class ───

export class CircuitBreaker {
  public readonly agentId: string;
  public state: CircuitBreakerState = 'closed';

  private config: CircuitBreakerConfig;
  private metrics: BreakerMetrics;
  private openedAt: Date | null = null;
  private halfOpenedAt: Date | null = null;
  private halfOpenCallsRemaining: number;
  private db: DbInstance;
  private readonly createdAt: Date;

  constructor(agentId: string, config?: Partial<CircuitBreakerConfig>, database?: DbInstance) {
    this.agentId = agentId;
    this.db = database || db;
    this.config = { ...DEFAULT_BREAKER_CONFIG, ...config };
    this.metrics = this.initMetrics();
    this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
    this.createdAt = now();

    // Load persisted state from DB
    this.loadFromDb();
  }

  // ─── Initialization ───

  private initMetrics(): BreakerMetrics {
    return {
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
      halfOpenCallsRemaining: this.config?.halfOpenMaxCalls ?? DEFAULT_BREAKER_CONFIG.halfOpenMaxCalls,
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
    };
  }

  // ─── Database Persistence ───

  private loadFromDb(): void {
    try {
      const record = this.db
        .prepare('SELECT * FROM circuit_breakers WHERE agent_id = ?')
        .get(this.agentId) as CircuitBreakerRecord | undefined;

      if (record) {
        this.state = record.state as CircuitBreakerState;
        this.metrics.failureCount = record.failure_count;
        this.metrics.successCount = record.success_count;
        this.metrics.lastFailureTime = record.last_failure_at ? new Date(record.last_failure_at) : null;
        this.metrics.lastSuccessTime = record.last_success_at ? new Date(record.last_success_at) : null;
        this.openedAt = record.opened_at ? new Date(record.opened_at) : null;
        this.halfOpenedAt = record.half_open_at ? new Date(record.half_open_at) : null;

        if (record.config) {
          try {
            this.config = { ...this.config, ...JSON.parse(record.config) };
          } catch {
            // Keep defaults on parse error
          }
        }

        this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
      } else {
        // Create initial record
        this.persist();
      }
    } catch (err) {
      // If table doesn't exist yet, operate in memory-only mode
      console.warn(`[CircuitBreaker] DB load failed for ${this.agentId}:`, (err as Error).message);
    }
  }

  private persist(): void {
    try {
      const existing = this.db
        .prepare('SELECT 1 FROM circuit_breakers WHERE agent_id = ?')
        .get(this.agentId);

      if (existing) {
        this.db.prepare(`
          UPDATE circuit_breakers SET
            state = ?,
            failure_count = ?,
            success_count = ?,
            last_failure_at = ?,
            last_success_at = ?,
            opened_at = ?,
            half_open_at = ?,
            config = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE agent_id = ?
        `).run(
          this.state,
          this.metrics.failureCount,
          this.metrics.successCount,
          this.metrics.lastFailureTime?.toISOString() ?? null,
          this.metrics.lastSuccessTime?.toISOString() ?? null,
          this.openedAt?.toISOString() ?? null,
          this.halfOpenedAt?.toISOString() ?? null,
          JSON.stringify(this.config),
          this.agentId
        );
      } else {
        this.db.prepare(`
          INSERT INTO circuit_breakers
            (agent_id, state, failure_count, success_count, last_failure_at, last_success_at,
             opened_at, half_open_at, config, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          this.agentId,
          this.state,
          this.metrics.failureCount,
          this.metrics.successCount,
          this.metrics.lastFailureTime?.toISOString() ?? null,
          this.metrics.lastSuccessTime?.toISOString() ?? null,
          this.openedAt?.toISOString() ?? null,
          this.halfOpenedAt?.toISOString() ?? null,
          JSON.stringify(this.config)
        );
      }
    } catch (err) {
      console.warn(`[CircuitBreaker] DB persist failed for ${this.agentId}:`, (err as Error).message);
    }
  }

  // ─── Core Execution ───

  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    // Check if we can proceed
    if (this.state === 'open') {
      // Check if timeout elapsed → transition to half-open
      if (this.openedAt && now().getTime() - this.openedAt.getTime() >= this.config.timeout) {
        this.transitionTo('half-open');
      } else {
        const remaining = this.openedAt
          ? Math.ceil((this.config.timeout - (now().getTime() - this.openedAt.getTime())) / 1000)
          : this.config.timeout / 1000;
        throw new CircuitBreakerOpenError(
          `Circuit breaker OPEN for agent "${this.agentId}"${context ? ` (${context})` : ''}. ` +
          `Retry after ${remaining}s.`,
          this.agentId,
          remaining
        );
      }
    }

    if (this.state === 'half-open') {
      if (this.halfOpenCallsRemaining <= 0) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker HALF-OPEN limit reached for agent "${this.agentId}". ` +
          `Waiting for next cooldown cycle.`,
          this.agentId,
          Math.ceil(this.config.timeout / 1000)
        );
      }
      this.halfOpenCallsRemaining--;
    }

    // Execute the function
    const startTime = now().getTime();
    try {
      const result = await fn();
      const responseTime = now().getTime() - startTime;
      this.recordSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = now().getTime() - startTime;
      this.recordFailure(responseTime);
      throw error;
    }
  }

  // ─── State Recording ───

  recordSuccess(responseTimeMs?: number): void {
    this.metrics.successCount++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.totalCalls++;
    this.metrics.totalSuccesses++;
    this.metrics.lastSuccessTime = now();

    if (responseTimeMs !== undefined) {
      this.updateAverageResponseTime(responseTimeMs);
    }

    // Transition from half-open to closed after enough consecutive successes
    if (this.state === 'half-open' && this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
      this.transitionTo('closed');
    }

    this.persist();
  }

  recordFailure(responseTimeMs?: number): void {
    this.metrics.failureCount++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.totalCalls++;
    this.metrics.totalFailures++;
    this.metrics.lastFailureTime = now();

    if (responseTimeMs !== undefined) {
      this.updateAverageResponseTime(responseTimeMs);
    }

    // Transition to open if failure threshold reached
    if ((this.state === 'closed' && this.metrics.consecutiveFailures >= this.config.failureThreshold) ||
        (this.state === 'half-open')) {
      this.transitionTo('open');
    }

    this.persist();
  }

  // ─── State Transitions ───

  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;

    switch (newState) {
      case 'open':
        this.openedAt = now();
        this.halfOpenedAt = null;
        this.halfOpenCallsRemaining = 0;
        console.warn(
          `[CircuitBreaker] Agent "${this.agentId}": ${previousState} → OPEN ` +
          `(failures: ${this.metrics.consecutiveFailures})`
        );
        break;

      case 'half-open':
        this.halfOpenedAt = now();
        this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
        this.metrics.consecutiveSuccesses = 0;
        console.log(
          `[CircuitBreaker] Agent "${this.agentId}": ${previousState} → HALF-OPEN ` +
          `(testing with ${this.halfOpenCallsRemaining} calls)`
        );
        break;

      case 'closed':
        this.openedAt = null;
        this.halfOpenedAt = null;
        this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
        this.metrics.failureCount = 0;
        this.metrics.consecutiveFailures = 0;
        this.metrics.consecutiveSuccesses = 0;
        console.log(
          `[CircuitBreaker] Agent "${this.agentId}": ${previousState} → CLOSED ` +
          `(recovered)`
        );
        break;
    }

    this.persist();
  }

  // ─── Metrics ───

  private updateAverageResponseTime(responseTimeMs: number): void {
    const total = this.metrics.totalCalls;
    if (total === 1) {
      this.metrics.averageResponseTime = responseTimeMs;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (total - 1) + responseTimeMs) / total;
    }
  }

  getState(): BreakerState {
    return {
      agentId: this.agentId,
      state: this.state,
      metrics: { ...this.metrics },
      config: { ...this.config },
      openedAt: this.openedAt,
      halfOpenedAt: this.halfOpenedAt,
    };
  }

  getMetrics(): BreakerMetrics {
    return { ...this.metrics };
  }

  // ─── Reset ───

  reset(): void {
    this.state = 'closed';
    this.metrics = this.initMetrics();
    this.openedAt = null;
    this.halfOpenedAt = null;
    this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
    this.persist();
    console.log(`[CircuitBreaker] Agent "${this.agentId}": manually reset to CLOSED`);
  }

  // ─── Config ───

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    this.halfOpenCallsRemaining = this.config.halfOpenMaxCalls;
    this.persist();
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  // ─── Time helpers ───

  getCooldownRemainingMs(): number {
    if (this.state !== 'open' || !this.openedAt) return 0;
    const elapsed = now().getTime() - this.openedAt.getTime();
    return Math.max(0, this.config.timeout - elapsed);
  }
}

// ─── Custom Error ───

export class CircuitBreakerOpenError extends Error {
  public readonly agentId: string;
  public readonly cooldownSeconds: number;
  public readonly code = 'CIRCUIT_BREAKER_OPEN';

  constructor(message: string, agentId: string, cooldownSeconds: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.agentId = agentId;
    this.cooldownSeconds = cooldownSeconds;
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

// ─── Factory / Manager ───

export function getBreaker(agentId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!breakerCache.has(agentId)) {
    const breaker = new CircuitBreaker(agentId, config);
    breakerCache.set(agentId, breaker);
  }
  return breakerCache.get(agentId)!;
}

export function resetBreaker(agentId: string): boolean {
  const breaker = breakerCache.get(agentId);
  if (breaker) {
    breaker.reset();
    return true;
  }
  // Also try DB reset even if not in cache
  try {
    // Use INSERT OR REPLACE to create record if it doesn't exist
    db.prepare(`
      INSERT OR REPLACE INTO circuit_breakers
        (agent_id, state, failure_count, success_count, last_failure_at, last_success_at,
         opened_at, half_open_at, config, updated_at)
      VALUES (
        ?,
        'closed',
        0,
        0,
        NULL,
        NULL,
        NULL,
        NULL,
        ?,
        CURRENT_TIMESTAMP
      )
    `).run(agentId, JSON.stringify(DEFAULT_BREAKER_CONFIG));
    return true;
  } catch {
    return false;
  }
}

export function getAllBreakerStates(): BreakerState[] {
  try {
    const records = db.prepare('SELECT * FROM circuit_breakers').all() as CircuitBreakerRecord[];
    return records.map(record => ({
      agentId: record.agent_id,
      state: record.state as CircuitBreakerState,
      metrics: {
        failureCount: record.failure_count,
        successCount: record.success_count,
        lastFailureTime: record.last_failure_at ? new Date(record.last_failure_at) : null,
        lastSuccessTime: record.last_success_at ? new Date(record.last_success_at) : null,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        halfOpenCallsRemaining: 0,
        totalCalls: record.failure_count + record.success_count,
        totalFailures: record.failure_count,
        totalSuccesses: record.success_count,
        averageResponseTime: 0,
      },
      config: record.config ? JSON.parse(record.config) : DEFAULT_BREAKER_CONFIG,
      openedAt: record.opened_at ? new Date(record.opened_at) : null,
      halfOpenedAt: record.half_open_at ? new Date(record.half_open_at) : null,
    }));
  } catch {
    return [];
  }
}

export function clearBreakerCache(): void {
  breakerCache.clear();
}

// ═══════════════════════════════════════════════════════════════
// Stats & Diagnostics
// ═══════════════════════════════════════════════════════════════

export function getBreakerStats(): {
  total: number;
  closed: number;
  open: number;
  halfOpen: number;
  totalFailures: number;
  totalSuccesses: number;
} {
  const states = getAllBreakerStates();
  return {
    total: states.length,
    closed: states.filter(s => s.state === 'closed').length,
    open: states.filter(s => s.state === 'open').length,
    halfOpen: states.filter(s => s.state === 'half-open').length,
    totalFailures: states.reduce((sum, s) => sum + s.metrics.totalFailures, 0),
    totalSuccesses: states.reduce((sum, s) => sum + s.metrics.totalSuccesses, 0),
  };
}
