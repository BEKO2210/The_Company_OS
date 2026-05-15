// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Engine - Barrel Export
// ═══════════════════════════════════════════════════════════════

// ─── Types ───
export type {
  StepState,
  InstanceState,
  GateType,
  GateStatus,
  GateConfig,
  GateResult,
  StepDefinition,
  StepContext,
  StepResult,
  WorkflowContext,
  RuntimeStepState,
  RuntimeWorkflowInstance,
  InstanceStatus,
  InstanceAuditEntry,
  StateTransition,
  WorkflowEvent,
  EventHandler,
  TriggerConfig,
  TriggerType,
  ExecutionOptions,
  RunnerConfig,
  EngineConfig,
} from './types.js';

// ─── State Machine ───
export {
  StateMachine,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATES,
  getStateMachine,
  StateTransitionError,
  StateGuardError,
} from './stateMachine.js';

// ─── Events ───
export {
  EventBus,
  getEventBus,
  resetEventBus,
  createStepStartedEvent,
  createStepCompletedEvent,
  createStepBlockedEvent,
  createStepFailedEvent,
  createStepSkippedEvent,
  createGateOpenedEvent,
  createGateClosedEvent,
  createWorkflowStartedEvent,
  createWorkflowCompletedEvent,
  createWorkflowCancelledEvent,
  createWorkflowPausedEvent,
  createWorkflowResumedEvent,
  createTimeoutEscalationEvent,
} from './events.js';

// ─── Gates ───
export {
  GateRegistry,
  GateEvaluator,
  getGateRegistry,
  getGateEvaluator,
  resetGates,
  canSkipGate,
} from './gates.js';

// ─── Triggers ───
export {
  TriggerRegistry,
  getTriggerRegistry,
  resetTriggers,
  createScheduleTrigger,
  createCronTrigger,
  createEventTrigger,
  createWebhookTrigger,
  createManualTrigger,
  createDailyCEOReportTrigger,
  createLeadIntakeTrigger,
} from './triggers.js';

// ─── Engine ───
export {
  WorkflowEngine,
  getWorkflowEngine,
  resetEngine,
  EngineError,
} from './engine.js';

// ─── Runner ───
export {
  WorkflowRunner,
  createRunner,
  startRunner,
  stopRunner,
  getRunnerStats,
  isRunnerActive,
} from './runner.js';
