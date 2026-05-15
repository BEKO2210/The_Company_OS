// ═══════════════════════════════════════════════════════════════
// The Company OS - Kill Switch Module Types
// RUN-005: Vollstaendige Kill Switch + Circuit Breaker Implementierung
// ═══════════════════════════════════════════════════════════════

import type { Database } from 'better-sqlite3';

// ─── Circuit Breaker ───

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
}

export interface BreakerMetrics {
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  halfOpenCallsRemaining: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
}

export interface BreakerState {
  agentId: string;
  state: CircuitBreakerState;
  metrics: BreakerMetrics;
  config: CircuitBreakerConfig;
  openedAt: Date | null;
  halfOpenedAt: Date | null;
}

export interface CircuitBreakerRecord {
  agent_id: string;
  state: string;
  failure_count: number;
  success_count: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  opened_at: string | null;
  half_open_at: string | null;
  config: string;
  updated_at: string;
}

// ─── Agent Quarantine ───

export type QuarantineStatus = 'active' | 'lifted' | 'expired';

export interface QuarantineRecord {
  id: string;
  agentId: string;
  reason: string;
  triggeredBy: string;
  triggeredAt: Date;
  liftedAt?: Date;
  liftedBy?: string;
  status: QuarantineStatus;
}

export interface QuarantineDbRecord {
  id: string;
  agent_id: string;
  reason: string;
  triggered_by: string;
  triggered_at: string;
  lifted_at: string | null;
  lifted_by: string | null;
  status: string;
}

// ─── Workflow Stop ───

export type WorkflowStopStatus = 'stopped' | 'resumed' | 'failed';

export interface StoppedWorkflow {
  id: string;
  instanceId: string;
  unitId: string | null;
  reason: string;
  triggeredBy: string;
  stoppedAt: Date;
  resumedAt?: Date;
  resumedBy?: string;
  status: WorkflowStopStatus;
}

export interface StoppedUnit {
  unitId: string;
  reason: string;
  triggeredBy: string;
  stoppedAt: Date;
  resumedAt?: Date;
  resumedBy?: string;
}

export interface StoppedWorkflowDbRecord {
  id: string;
  instance_id: string;
  unit_id: string | null;
  reason: string;
  triggered_by: string;
  stopped_at: string;
  resumed_at: string | null;
  resumed_by: string | null;
  status: string;
}

// ─── Global Kill Switch ───

export type KillSwitchStatus = 'armed' | 'triggered' | 'disabled';

export interface KillSwitchActivation {
  id: string;
  triggeredBy: string;
  reason: string;
  triggeredAt: Date;
  deactivatedAt?: Date;
  deactivatedBy?: string;
  confirmationCode: string;
  postMortemId?: string;
}

export interface KillSwitchDbRecord {
  id: string;
  triggered_by: string;
  reason: string;
  triggered_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
  confirmation_code: string;
  post_mortem_id: string | null;
}

// ─── Health Monitor ───

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface AgentMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage?: number;
  cpuUsage?: number;
  lastActivity: Date;
  consecutiveErrors: number;
  consecutiveTimeouts: number;
}

export interface HealthCheck {
  agentId: string;
  status: HealthStatus;
  lastPing: Date;
  metrics: AgentMetrics;
  checks: {
    pingCheck: boolean;
    errorRateCheck: boolean;
    responseTimeCheck: boolean;
    throughputCheck: boolean;
  };
  escalationLevel: number;
  recommendation: string;
}

export interface HealthCheckDbRecord {
  id: string;
  agent_id: string;
  status: string;
  response_time: number | null;
  error_rate: number | null;
  throughput: number | null;
  checked_at: string;
}

// ─── Anomaly Detector ───

export interface AnomalyReport {
  agentId: string;
  timestamp: Date;
  anomalies: Anomaly[];
  overallRiskScore: number;
  recommendedAction: AnomalyAction;
  shouldEscalate: boolean;
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  detectedValue: number;
  expectedRange: [number, number];
  evidence: string[];
}

export type AnomalyType =
  | 'budget_spike'
  | 'error_pattern'
  | 'response_time_spike'
  | 'unusual_access'
  | 'throughput_drop'
  | 'consecutive_timeout'
  | 'memory_spike'
  | 'error_burst';

export type AnomalyAction =
  | 'none'
  | 'monitor'
  | 'circuit_breaker'
  | 'quarantine'
  | 'workflow_stop'
  | 'kill_switch';

export interface AccessLog {
  timestamp: Date;
  resource: string;
  action: string;
  ip?: string;
  userAgent?: string;
  result: 'success' | 'failure';
}

export interface AnomalyThresholds {
  budgetSpikeMultiplier: number;
  errorRateThreshold: number;
  errorBurstWindowMs: number;
  errorBurstCount: number;
  responseTimeMultiplier: number;
  responseTimeBaselineMs: number;
  throughputDropMultiplier: number;
  consecutiveTimeoutThreshold: number;
  unusualAccessPatternThreshold: number;
}

// ─── Recovery ───

export type RecoveryType =
  | 'circuit_breaker'
  | 'quarantine'
  | 'workflow'
  | 'global_kill_switch';

export interface RecoveryResult {
  success: boolean;
  type: RecoveryType;
  targetId: string;
  stepsCompleted: string[];
  stepsFailed: string[];
  error?: string;
  recoveredAt: Date;
}

export interface PostMortemReport {
  incidentId: string;
  generatedAt: Date;
  generatedBy: string;
  summary: string;
  timeline: PostMortemEvent[];
  rootCause: string;
  affectedAgents: string[];
  affectedWorkflows: string[];
  actionsTaken: string[];
  lessonsLearned: string[];
  recommendations: string[];
  preventionMeasures: string[];
  recoveryDurationMs: number;
}

export interface PostMortemEvent {
  timestamp: Date;
  event: string;
  actor: string;
  level: 'info' | 'warning' | 'critical';
}

// ─── Kill Switch Service ───

// ─── Service Interface (implementations provide their own types)
//     to avoid circular dependencies.
export interface KillSwitchService {
  circuitBreaker: unknown;
  quarantine: unknown;
  workflowStop: unknown;
  globalKill: unknown;
  healthMonitor: unknown;
  anomalyDetector: unknown;
  recovery: unknown;
}

// ─── Database Reference ───

export type DbInstance = Database;

// ─── Default Configurations ───

export const DEFAULT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  halfOpenMaxCalls: 3,
};

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  budgetSpikeMultiplier: 3.0,
  errorRateThreshold: 0.25,
  errorBurstWindowMs: 60000,
  errorBurstCount: 5,
  responseTimeMultiplier: 3.0,
  responseTimeBaselineMs: 5000,
  throughputDropMultiplier: 0.5,
  consecutiveTimeoutThreshold: 3,
  unusualAccessPatternThreshold: 0.8,
};

export const KILL_SWITCH_CONFIRMATION_CODE = 'KILL-SWITCH-2025';

export const RECOVERY_STEPS: Record<RecoveryType, string[]> = {
  circuit_breaker: [
    'Validate agent configuration',
    'Reset failure counters',
    'Verify agent connectivity',
    'Run health check',
    'Gradual traffic restoration',
    'Monitor for 60s',
  ],
  quarantine: [
    'Review quarantine reason',
    'Run full diagnostic',
    'Verify agent integrity',
    'Check for security issues',
    'Restore agent permissions',
    'Gradual reactivation',
    'Monitor for 120s',
  ],
  workflow: [
    'Inspect workflow state',
    'Check data consistency',
    'Resume from last checkpoint',
    'Verify step prerequisites',
    'Gradual step execution',
    'Validate outputs',
  ],
  global_kill_switch: [
    'Verify system integrity',
    'Run full health scan',
    'Check all agent statuses',
    'Validate database consistency',
    'Require post-mortem documentation',
    'Founder code confirmation',
    'Reactivate agents one by one',
    'Run integration tests',
    'Monitor system for 300s',
  ],
};
