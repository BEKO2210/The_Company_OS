// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Core Types
// ═══════════════════════════════════════════════════════════════

// ─── Step State ───
export type StepState =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'skipped'
  | 'failed';

// ─── Workflow Instance State ───
export type InstanceState =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

// ─── Gate Types ───
export type GateType = 'approval' | 'safety' | 'budget' | 'time' | 'human';

// ─── Gate Status ───
export type GateStatus = 'open' | 'closed' | 'pending' | 'overridden';

// ─── Execution Mode ───
export type ExecutionMode = 'auto' | 'manual' | 'hybrid';

// ─── Trigger Type ───
export type TriggerType = 'schedule' | 'event' | 'manual' | 'webhook';

// ─── Gate Configuration ───
export interface GateConfig {
  type: GateType;
  required: boolean;
  condition?: string;
  threshold?: number;
  approvers?: string[];
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

// ─── Step Definition (parsed from workflow.steps JSON) ───
export interface StepDefinition {
  id: string;
  name: string;
  description?: string;
  agent: string;
  status: string;
  blockingGate: boolean;
  gate?: GateConfig;
  input: string;
  output: string;
  timeout?: number;
  retryCount?: number;
  dependencies?: string[];
  executionMode?: ExecutionMode;
}

// ─── Step Context (runtime) ───
export interface StepContext {
  instanceId: string;
  workflowId: string;
  stepIndex: number;
  step: StepDefinition;
  context: WorkflowContext;
  previousResults: StepResult[];
}

// ─── Step Execution Result ───
export interface StepResult {
  stepIndex: number;
  stepId: string;
  state: StepState;
  startedAt: Date;
  completedAt?: Date;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
}

// ─── Gate Check Result ───
export interface GateResult {
  gateType: GateType;
  status: GateStatus;
  blocking: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

// ─── Workflow Context (passed at start) ───
export interface WorkflowContext {
  [key: string]: unknown;
  customerId?: string;
  studioName?: string;
  budget?: number;
  features?: string[];
}

// ─── Runtime Step State ───
export interface RuntimeStepState {
  stepIndex: number;
  stepId: string;
  state: StepState;
  startedAt?: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  gateResults?: GateResult[];
}

// ─── Workflow Instance (runtime, extended from DB model) ───
export interface RuntimeWorkflowInstance {
  id: string;
  workflowId: string;
  status: InstanceState;
  currentStep: number;
  context: WorkflowContext;
  result?: Record<string, unknown>;
  stepStates: RuntimeStepState[];
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  auditLog: InstanceAuditEntry[];
}

// ─── Instance Audit Entry ───
export interface InstanceAuditEntry {
  timestamp: Date;
  action: string;
  stepIndex?: number;
  details?: Record<string, unknown>;
}

// ─── Instance Status (for API responses) ───
export interface InstanceStatus {
  id: string;
  workflowId: string;
  workflowName: string;
  status: InstanceState;
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  currentStepState: StepState;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  stepStates: RuntimeStepState[];
}

// ─── State Transition ───
export interface StateTransition {
  from: StepState;
  to: StepState;
  guard?: (context: StepContext) => boolean | Promise<boolean>;
}

// ─── Workflow Event ───
export interface WorkflowEvent {
  type:
    | 'step_started'
    | 'step_completed'
    | 'step_blocked'
    | 'step_failed'
    | 'step_skipped'
    | 'gate_opened'
    | 'gate_closed'
    | 'gate_check'
    | 'workflow_started'
    | 'workflow_completed'
    | 'workflow_cancelled'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'workflow_failed'
    | 'timeout_escalation';
  instanceId: string;
  workflowId: string;
  stepIndex?: number;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ─── Event Handler ───
export type EventHandler = (event: WorkflowEvent) => void | Promise<void>;

// ─── Trigger Configuration ───
export interface TriggerConfig {
  id: string;
  type: TriggerType;
  workflowId: string;
  enabled: boolean;
  // Schedule trigger
  schedule?: {
    cron?: string;
    intervalMs?: number;
    runOnceAt?: string;
    timezone?: string;
  };
  // Event trigger
  event?: {
    eventName: string;
    condition?: (payload: Record<string, unknown>) => boolean;
  };
  // Webhook trigger
  webhook?: {
    path: string;
    secret?: string;
    method?: string;
  };
  // Manual trigger
  manual?: {
    allowedRoles?: string[];
  };
  context?: WorkflowContext;
}

// ─── Execution Options ───
export interface ExecutionOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  skipGates?: boolean;
  dryRun?: boolean;
}

// ─── Workflow Runner Config ───
export interface RunnerConfig {
  pollIntervalMs: number;
  maxConcurrentInstances: number;
  defaultTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  enableAutoRetry: boolean;
  enableTimeoutEscalation: boolean;
  timeoutEscalationThresholdMs: number;
}

// ─── Engine Config ───
export interface EngineConfig {
  runner: RunnerConfig;
  auditEveryAction: boolean;
  defaultExecutionOptions: ExecutionOptions;
}
