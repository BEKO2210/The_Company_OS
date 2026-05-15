// ═══════════════════════════════════════════════════════════════
// The Company OS - Kill Switch Service (RUN-005)
// Integrationsschicht: Verbindet Kill-Switch-Module mit API
// ═══════════════════════════════════════════════════════════════

import { ROLES } from '../utils/constants.js';
import type { KillSwitchEntry } from '../types/index.js';
import type {
  BreakerState,
  CircuitBreakerConfig,
  QuarantineRecord,
  StoppedWorkflow,
  HealthCheck,
  KillSwitchStatus,
  KillSwitchActivation,
  RecoveryResult,
  RecoveryType,
  PostMortemReport,
  AgentMetrics,
  AnomalyReport,
  AnomalyThresholds,
} from '../killSwitch/types.js';
import {
  getBreaker,
  resetBreaker,
  getAllBreakerStates,
  getBreakerStats,
} from '../killSwitch/circuitBreaker.js';
import {
  getQuarantine,
  AgentQuarantine,
} from '../killSwitch/agentQuarantine.js';
import {
  getWorkflowStop,
  WorkflowStop,
} from '../killSwitch/workflowStop.js';
import {
  getGlobalKillSwitch,
  GlobalKillSwitch,
} from '../killSwitch/globalKillSwitch.js';
import {
  getHealthMonitor,
  HealthMonitor,
} from '../killSwitch/healthMonitor.js';
import {
  getAnomalyDetector,
  AnomalyDetector,
} from '../killSwitch/anomalyDetector.js';
import {
  getRecoveryManager,
  runRecovery,
} from '../killSwitch/recovery.js';

// ═══════════════════════════════════════════════════════════════
// Legacy Compatibility
// ═══════════════════════════════════════════════════════════════

export function getStatus(): { active: boolean; level: number; triggeredBy: string | null; triggeredAt: string | null } {
  const gks = getGlobalKillSwitch();
  const stats = gks.getStats();

  return {
    active: stats.isActive,
    level: stats.isActive ? 4 : 0,
    triggeredBy: stats.lastTriggeredBy,
    triggeredAt: stats.lastTriggeredAt,
  };
}

export function canActivateKillSwitch(userRole: string): boolean {
  return userRole === ROLES.FOUNDER;
}

export function activate(level: number, userId: string, reason?: string): { success: boolean; error?: string } {
  try {
    const gks = getGlobalKillSwitch();
    // Level 4 always requires confirmation code
    const confirmationCode = 'KILL-SWITCH-2025';
    const success = gks.activate(reason || 'Manual activation', userId, confirmationCode);
    return { success };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function deactivate(userId: string, postMortemId?: string): { success: boolean; error?: string } {
  try {
    const gks = getGlobalKillSwitch();
    // SECURITY: Deactivation ALWAYS requires post-mortem documentation
    // If no postMortemId provided and one is required, the GlobalKillSwitch will throw
    gks.deactivate(userId, postMortemId);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function getHistory(): KillSwitchEntry[] {
  const gks = getGlobalKillSwitch();
  return gks.getActivationHistory().map(a => ({
    id: a.id,
    level: 4,
    triggered_by: a.triggeredBy,
    reason: a.reason,
    status: a.deactivatedAt ? 'resolved' : 'active',
    triggered_at: a.triggeredAt.toISOString(),
    resolved_at: a.deactivatedAt?.toISOString() ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// Circuit Breaker Service
// ═══════════════════════════════════════════════════════════════

export function getCircuitBreakerState(agentId: string): BreakerState | null {
  try {
    return getBreaker(agentId).getState();
  } catch {
    return null;
  }
}

export function getAllCircuitBreakerStates(): BreakerState[] {
  return getAllBreakerStates();
}

export function resetCircuitBreaker(agentId: string): boolean {
  return resetBreaker(agentId);
}

export function getCircuitBreakerStatistics(): ReturnType<typeof getBreakerStats> {
  return getBreakerStats();
}

export async function executeWithBreaker<T>(
  agentId: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = getBreaker(agentId, config);
  return breaker.execute(fn);
}

// ═══════════════════════════════════════════════════════════════
// Quarantine Service
// ═══════════════════════════════════════════════════════════════

export function quarantineAgent(agentId: string, reason: string, triggeredBy: string): boolean {
  return getQuarantine().quarantine(agentId, reason, triggeredBy);
}

export function liftQuarantine(agentId: string, liftedBy: string): boolean {
  return getQuarantine().lift(agentId, liftedBy);
}

export function isAgentQuarantinedService(agentId: string): boolean {
  return getQuarantine().isQuarantined(agentId);
}

export function getQuarantinedAgentsList(): QuarantineRecord[] {
  return getQuarantine().getQuarantinedAgents();
}

export function getQuarantineHistory(): QuarantineRecord[] {
  return getQuarantine().getHistory();
}

export function getQuarantineStatistics(): ReturnType<AgentQuarantine['getStats']> {
  return getQuarantine().getStats();
}

// ═══════════════════════════════════════════════════════════════
// Workflow Stop Service
// ═══════════════════════════════════════════════════════════════

export function stopWorkflowService(instanceId: string, reason: string, triggeredBy: string): boolean {
  return getWorkflowStop().stopWorkflow(instanceId, reason, triggeredBy);
}

export function stopUnitService(unitId: string, reason: string, triggeredBy: string): boolean {
  return getWorkflowStop().stopUnit(unitId, reason, triggeredBy);
}

export function resumeWorkflowService(instanceId: string, resumedBy: string): boolean {
  return getWorkflowStop().resumeWorkflow(instanceId, resumedBy);
}

export function resumeUnitService(unitId: string, resumedBy: string): boolean {
  return getWorkflowStop().resumeUnit(unitId, resumedBy);
}

export function getStoppedWorkflowsList(): StoppedWorkflow[] {
  return getWorkflowStop().getStoppedWorkflows();
}

export function getStoppedUnitsList(): ReturnType<WorkflowStop['getStoppedUnits']> {
  return getWorkflowStop().getStoppedUnits();
}

export function getWorkflowStopStatistics(): ReturnType<WorkflowStop['getStats']> {
  return getWorkflowStop().getStats();
}

// ═══════════════════════════════════════════════════════════════
// Global Kill Switch Service
// ═══════════════════════════════════════════════════════════════

export function activateGlobalKillSwitch(
  reason: string,
  triggeredBy: string,
  confirmationCode: string
): boolean {
  return getGlobalKillSwitch().activate(reason, triggeredBy, confirmationCode);
}

export function deactivateGlobalKillSwitch(deactivatedBy: string, postMortemId?: string): boolean {
  return getGlobalKillSwitch().deactivate(deactivatedBy, postMortemId);
}

export function isGlobalKillSwitchActive(): boolean {
  return getGlobalKillSwitch().isActive();
}

export function getGlobalKillSwitchStatus(): KillSwitchStatus {
  return getGlobalKillSwitch().getStatus();
}

export function getGlobalKillSwitchHistory(): KillSwitchActivation[] {
  return getGlobalKillSwitch().getActivationHistory();
}

export function getGlobalKillSwitchStatistics(): ReturnType<GlobalKillSwitch['getStats']> {
  return getGlobalKillSwitch().getStats();
}

export function enforceGlobalKillSwitch(): void {
  getGlobalKillSwitch().enforce();
}

// ═══════════════════════════════════════════════════════════════
// Health Monitor Service
// ═══════════════════════════════════════════════════════════════

export function startHealthMonitoring(intervalMs?: number): void {
  getHealthMonitor({
    onUnhealthy: (check: HealthCheck) => {
      console.warn(
        `[HealthMonitor] Agent "${check.agentId}" is UNHEALTHY: ${check.recommendation}`
      );
    },
    onEscalation: (check: HealthCheck) => {
      console.error(
        `[HealthMonitor] ESCALATION for "${check.agentId}" - considering auto-quarantine`
      );
    },
  }).startMonitoring(intervalMs);
}

export function stopHealthMonitoring(): void {
  getHealthMonitor().stopMonitoring();
}

export async function checkAgentHealth(agentId: string): Promise<HealthCheck> {
  return getHealthMonitor().checkAgent(agentId);
}

export async function checkAllAgentsHealth(): Promise<HealthCheck[]> {
  return getHealthMonitor().checkAllAgents();
}

export function getUnhealthyAgentsList(): HealthCheck[] {
  return getHealthMonitor().getUnhealthyAgents();
}

export function getHealthStatistics(): ReturnType<HealthMonitor['getStats']> {
  return getHealthMonitor().getStats();
}

export function isHealthMonitoringActive(): boolean {
  return getHealthMonitor().isMonitoring();
}

// ═══════════════════════════════════════════════════════════════
// Anomaly Detector Service
// ═══════════════════════════════════════════════════════════════

export function analyzeAnomalies(agentId: string, metrics: AgentMetrics): AnomalyReport {
  return getAnomalyDetector().analyze(agentId, metrics);
}

export function checkBudgetSpikeService(agentId: string, amount: number): boolean {
  return getAnomalyDetector().checkBudgetSpike(agentId, amount);
}

export function checkErrorPatternService(agentId: string, errors: Error[]): boolean {
  return getAnomalyDetector().checkErrorPattern(agentId, errors);
}

export function checkResponseTimeSpikeService(agentId: string, responseTime: number): boolean {
  return getAnomalyDetector().checkResponseTimeSpike(agentId, responseTime);
}

export function checkUnusualAccessService(agentId: string, accessPattern: Parameters<AnomalyDetector['checkUnusualAccess']>[1]): boolean {
  return getAnomalyDetector().checkUnusualAccess(agentId, accessPattern);
}

export function setAnomalyThresholds(thresholds: Partial<AnomalyThresholds>): void {
  getAnomalyDetector().setThresholds(thresholds);
}

// ═══════════════════════════════════════════════════════════════
// Recovery Service
// ═══════════════════════════════════════════════════════════════

export async function recoverCircuitBreaker(agentId: string): Promise<RecoveryResult> {
  return getRecoveryManager().recoverFromBreaker(agentId);
}

export async function recoverQuarantine(agentId: string): Promise<RecoveryResult> {
  return getRecoveryManager().recoverFromQuarantine(agentId);
}

export async function recoverWorkflowService(instanceId: string): Promise<RecoveryResult> {
  return getRecoveryManager().recoverWorkflow(instanceId);
}

export async function recoverFromGlobalKillSwitch(): Promise<RecoveryResult> {
  return getRecoveryManager().recoverFromKillSwitch();
}

export async function runRecoveryService(type: RecoveryType, targetId: string): Promise<RecoveryResult> {
  return runRecovery(type, targetId);
}

export function generatePostMortemService(incidentId: string, generatedBy?: string): PostMortemReport {
  return getRecoveryManager().generatePostMortem(incidentId, generatedBy);
}

export function getRecoveryLog(): RecoveryResult[] {
  return getRecoveryManager().getRecoveryLog();
}

// ═══════════════════════════════════════════════════════════════
// Unified Status
// ═══════════════════════════════════════════════════════════════

export function getFullSystemStatus(): {
  killSwitch: ReturnType<GlobalKillSwitch['getStats']>;
  circuitBreakers: ReturnType<typeof getBreakerStats>;
  quarantine: ReturnType<AgentQuarantine['getStats']>;
  workflowStop: ReturnType<WorkflowStop['getStats']>;
  health: ReturnType<HealthMonitor['getStats']>;
  overallStatus: 'nominal' | 'degraded' | 'critical' | 'emergency';
} {
  const killSwitch = getGlobalKillSwitchStatistics();
  const circuitBreakers = getCircuitBreakerStatistics();
  const quarantine = getQuarantineStatistics();
  const workflowStop = getWorkflowStopStatistics();
  const health = getHealthStatistics();

  let overallStatus: 'nominal' | 'degraded' | 'critical' | 'emergency' = 'nominal';

  if (killSwitch.isActive) {
    overallStatus = 'emergency';
  } else if (quarantine.activeQuarantines > 0 || circuitBreakers.open > 0) {
    overallStatus = 'critical';
  } else if (circuitBreakers.halfOpen > 0 || workflowStop.stoppedWorkflows > 0 || health.degraded > 0) {
    overallStatus = 'degraded';
  }

  return {
    killSwitch,
    circuitBreakers,
    quarantine,
    workflowStop,
    health,
    overallStatus,
  };
}

// ═══════════════════════════════════════════════════════════════
// Full Reset (for testing)
// ═══════════════════════════════════════════════════════════════

export async function resetAllKillSwitches(): Promise<void> {
  // Reset all module state
  const { clearBreakerCache, resetQuarantineInstance, resetWorkflowStopInstance } = await import('../killSwitch');
  const { resetGlobalKillSwitchInstance, resetHealthMonitor, resetAnomalyDetector, resetRecoveryManager } = await import('../killSwitch');

  clearBreakerCache();
  resetQuarantineInstance();
  resetWorkflowStopInstance();
  resetGlobalKillSwitchInstance();
  resetHealthMonitor();
  resetAnomalyDetector();
  resetRecoveryManager();
}
