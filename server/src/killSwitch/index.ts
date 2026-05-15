// ═══════════════════════════════════════════════════════════════
// The Company OS - Kill Switch Module
// RUN-005: Vollstaendige Kill Switch + Circuit Breaker Implementierung
// ═══════════════════════════════════════════════════════════════
//
// 4-Level Schutzarchitektur:
//   Level 1: Circuit Breaker    - Automatisch, fein-granular (circuitBreaker.ts)
//   Level 2: Agent Quarantine   - Gezielte Agent-Isolierung (agentQuarantine.ts)
//   Level 3: Workflow Stop      - Bereichsweiser Stopp (workflowStop.ts)
//   Level 4: Global Kill Switch - Nukleare Option (globalKillSwitch.ts)
//
// Unterstuetzungssysteme:
//   Health Monitor              - Regelmaessige Health Checks (healthMonitor.ts)
//   Anomaly Detector            - Automatische Anomalie-Erkennung (anomalyDetector.ts)
//   Recovery Manager            - Recovery-Prozeduren + Post-Mortem (recovery.ts)
// ═══════════════════════════════════════════════════════════════

// ─── Types & Config ───
export * from './types.js';

// ─── Circuit Breaker (Level 1) ───
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getBreaker,
  resetBreaker,
  getAllBreakerStates,
  getBreakerStats,
  clearBreakerCache,
} from './circuitBreaker.js';

// ─── Agent Quarantine (Level 2) ───
export {
  AgentQuarantine,
  AgentQuarantinedError,
  getQuarantine,
  resetQuarantineInstance,
  isAgentQuarantined,
  enforceQuarantine,
} from './agentQuarantine.js';

// ─── Workflow Stop (Level 3) ───
export {
  WorkflowStop,
  WorkflowStoppedError,
  getWorkflowStop,
  resetWorkflowStopInstance,
} from './workflowStop.js';

// ─── Global Kill Switch (Level 4) ───
export {
  GlobalKillSwitch,
  KillSwitchActiveError,
  KillSwitchAuthError,
  KillSwitchError,
  getGlobalKillSwitch,
  resetGlobalKillSwitchInstance,
  isKillSwitchActive,
  enforceKillSwitch,
  getKillSwitchStatus,
} from './globalKillSwitch.js';

// ─── Health Monitor ───
export {
  HealthMonitor,
  getHealthMonitor,
  resetHealthMonitor,
  quickHealthCheck,
  registerForMonitoring,
} from './healthMonitor.js';

// ─── Anomaly Detector ───
export {
  AnomalyDetector,
  getAnomalyDetector,
  resetAnomalyDetector,
  quickAnomalyCheck,
} from './anomalyDetector.js';

// ─── Recovery Manager ───
export {
  RecoveryManager,
  getRecoveryManager,
  resetRecoveryManager,
  runRecovery,
} from './recovery.js';
