// ═══════════════════════════════════════════════════════════════
// The Company OS - Kill Switch Routes (RUN-005)
// API Endpoints fuer alle 4 Kill-Switch-Level + Recovery
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireFounder, requireAdmin } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createEntry } from '../services/auditService.js';
import type { RecoveryType } from '../killSwitch/types.js';
import {
  getStatus,
  activate,
  deactivate,
  getHistory,
  // Circuit Breaker
  getCircuitBreakerState,
  getAllCircuitBreakerStates,
  resetCircuitBreaker,
  getCircuitBreakerStatistics,
  // Quarantine
  quarantineAgent,
  liftQuarantine,
  isAgentQuarantinedService,
  getQuarantinedAgentsList,
  getQuarantineHistory,
  getQuarantineStatistics,
  // Workflow Stop
  stopWorkflowService,
  stopUnitService,
  resumeWorkflowService,
    getStoppedWorkflowsList,
  getStoppedUnitsList,
  getWorkflowStopStatistics,
  // Global Kill Switch
  activateGlobalKillSwitch,
  deactivateGlobalKillSwitch,
        getGlobalKillSwitchStatistics,
  // Health Monitor
  startHealthMonitoring,
  stopHealthMonitoring,
  checkAgentHealth,
  checkAllAgentsHealth,
  getUnhealthyAgentsList,
  getHealthStatistics,
  isHealthMonitoringActive,
  // Anomaly Detector
  analyzeAnomalies,
  setAnomalyThresholds,
  // Recovery
          generatePostMortemService,
  runRecoveryService,
  // Unified
  getFullSystemStatus,
} from '../services/killSwitchService.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// Circuit Breaker Routes (Level 1)
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch/circuit-breaker - All breaker states
router.get('/circuit-breaker', authMiddleware, asyncHandler(async (req, res) => {
  const states = getAllCircuitBreakerStates();
  const stats = getCircuitBreakerStatistics();

  res.json({
    success: true,
    data: { states, stats },
  });
}));

// GET /api/kill-switch/circuit-breaker/stats - Breaker statistics
router.get('/circuit-breaker/stats', authMiddleware, asyncHandler(async (_req, res) => {
  const stats = getCircuitBreakerStatistics();
  res.json({ success: true, data: stats });
}));

// GET /api/kill-switch/circuit-breaker/:agentId - Single breaker state
router.get('/circuit-breaker/:agentId', authMiddleware, asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const state = getCircuitBreakerState(agentId as string);

  if (!state) {
    res.status(404).json({ success: false, error: `No circuit breaker found for agent "${agentId}"` });
    return;
  }

  res.json({ success: true, data: state });
}));

// POST /api/kill-switch/circuit-breaker/:agentId/reset - Reset breaker
router.post('/circuit-breaker/:agentId/reset', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const success = resetCircuitBreaker(agentId as string);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Circuit Breaker Reset',
      input: JSON.stringify({ agentId }),
      output: `Circuit breaker for "${agentId}" reset`,
      risk_score: 30,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `Circuit breaker for "${agentId}" reset successfully`
      : `Failed to reset circuit breaker for "${agentId}"`,
    data: getCircuitBreakerState(agentId as string),
  });
}));

// ═══════════════════════════════════════════════════════════════
// Quarantine Routes (Level 2)
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch/quarantine - All quarantined agents
router.get('/quarantine', authMiddleware, asyncHandler(async (_req, res) => {
  const quarantined = getQuarantinedAgentsList();
  const stats = getQuarantineStatistics();

  res.json({
    success: true,
    data: { quarantined, stats },
  });
}));

// GET /api/kill-switch/quarantine/history - Quarantine history
router.get('/quarantine/history', authMiddleware, requireAdmin, asyncHandler(async (_req, res) => {
  const history = getQuarantineHistory();
  res.json({ success: true, data: history });
}));

// GET /api/kill-switch/quarantine/:agentId - Check if agent is quarantined
router.get('/quarantine/:agentId', authMiddleware, asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const isQuarantined = isAgentQuarantinedService(agentId as string);

  res.json({
    success: true,
    data: { agentId, isQuarantined },
  });
}));

// POST /api/kill-switch/quarantine/:agentId - Quarantine an agent
router.post('/quarantine/:agentId', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, error: 'Reason is required' });
    return;
  }

  const success = quarantineAgent(agentId as string, reason, req.user!.email);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Agent Quarantined',
      input: JSON.stringify({ agentId, reason }),
      output: `Agent "${agentId}" quarantined`,
      risk_score: 50,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `Agent "${agentId}" quarantined`
      : `Failed to quarantine agent "${agentId}" (may already be quarantined)`,
    data: { agentId, isQuarantined: isAgentQuarantinedService(agentId as string) },
  });
}));

// POST /api/kill-switch/quarantine/:agentId/lift - Lift quarantine
router.post('/quarantine/:agentId/lift', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const success = liftQuarantine(agentId as string, req.user!.email);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Quarantine Lifted',
      input: JSON.stringify({ agentId }),
      output: `Quarantine lifted for agent "${agentId}"`,
      risk_score: 30,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `Quarantine lifted for agent "${agentId}"`
      : `Failed to lift quarantine for agent "${agentId}" (may not be quarantined)`,
    data: { agentId, isQuarantined: isAgentQuarantinedService(agentId as string) },
  });
}));

// ═══════════════════════════════════════════════════════════════
// Workflow Stop Routes (Level 3)
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch/workflow - List stopped workflows
router.get('/workflow', authMiddleware, asyncHandler(async (_req, res) => {
  const stoppedWorkflows = getStoppedWorkflowsList();
  const stoppedUnits = getStoppedUnitsList();
  const stats = getWorkflowStopStatistics();

  res.json({
    success: true,
    data: { stoppedWorkflows, stoppedUnits, stats },
  });
}));

// POST /api/kill-switch/workflow/:instanceId/stop - Stop workflow
router.post('/workflow/:instanceId/stop', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { instanceId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, error: 'Reason is required' });
    return;
  }

  const success = stopWorkflowService(instanceId as string, reason, req.user!.email);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Workflow Stopped',
      input: JSON.stringify({ instanceId, reason }),
      output: `Workflow "${instanceId}" stopped`,
      risk_score: 40,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `Workflow "${instanceId}" stopped`
      : `Failed to stop workflow "${instanceId}"`,
  });
}));

// POST /api/kill-switch/workflow/:instanceId/resume - Resume workflow
router.post('/workflow/:instanceId/resume', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { instanceId } = req.params;

  const success = resumeWorkflowService(instanceId as string, req.user!.email);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Workflow Resumed',
      input: JSON.stringify({ instanceId }),
      output: `Workflow "${instanceId}" resumed`,
      risk_score: 20,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `Workflow "${instanceId}" resumed`
      : `Failed to resume workflow "${instanceId}"`,
  });
}));

// POST /api/kill-switch/workflow/unit/:unitId/stop - Stop all workflows in unit
router.post('/workflow/unit/:unitId/stop', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, error: 'Reason is required' });
    return;
  }

  const success = stopUnitService(unitId as string, reason, req.user!.email);

  if (success) {
    createEntry({
      agent: req.user!.email,
      action: 'Unit Workflows Stopped',
      input: JSON.stringify({ unitId, reason }),
      output: `All workflows in unit "${unitId}" stopped`,
      risk_score: 45,
      approved_by: req.user!.email,
    });
  }

  res.json({
    success,
    message: success
      ? `All workflows in unit "${unitId}" stopped`
      : `Failed to stop workflows in unit "${unitId}"`,
  });
}));

// ═══════════════════════════════════════════════════════════════
// Global Kill Switch Routes (Level 4)
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch - Status (legacy + new)
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const status = getStatus();
  const fullStatus = getFullSystemStatus();

  res.json({
    success: true,
    data: { ...status, full: fullStatus },
  });
}));

// POST /api/kill-switch/activate - Activate (founder only, legacy)
router.post('/activate', authMiddleware, requireFounder, asyncHandler(async (req, res) => {
  const { level, reason, confirmationCode } = req.body;

  // Only the nuclear level (4) requires the explicit confirmation code.
  // Lower levels (1-3) are graduated responses and only need founder auth.
  const effectiveLevel = level || 4;
  if (effectiveLevel === 4 && !confirmationCode) {
    res.status(400).json({
      success: false,
      error: 'Confirmation code is required. Code: KILL-SWITCH-2025',
    });
    return;
  }

  const result = activate(effectiveLevel, req.user!.email, reason);

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  createEntry({
    agent: req.user!.email,
    action: `Kill Switch Level ${level || 4} ACTIVATED`,
    input: JSON.stringify({ level, reason, confirmationCode }),
    output: 'Kill switch activated',
    risk_score: 100,
    approved_by: req.user!.email,
  });

  res.json({
    success: true,
    message: `Kill switch activated at level ${level || 4}`,
    data: getStatus(),
  });
}));

// POST /api/kill-switch/deactivate - Deactivate (founder only, legacy)
router.post('/deactivate', authMiddleware, requireFounder, asyncHandler(async (req, res) => {
  const result = deactivate(req.user!.email);

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  createEntry({
    agent: req.user!.email,
    action: 'Kill Switch DEACTIVATED',
    input: 'manual deactivation',
    output: 'Kill switch deactivated',
    risk_score: 50,
    approved_by: req.user!.email,
  });

  res.json({
    success: true,
    message: 'Kill switch deactivated',
    data: getStatus(),
  });
}));

// POST /api/kill-switch/global/activate - Activate with confirmation (new)
router.post('/global/activate', authMiddleware, requireFounder, asyncHandler(async (req, res) => {
  const { reason, confirmationCode } = req.body;

  if (!confirmationCode) {
    res.status(400).json({
      success: false,
      error: 'Confirmation code required. Use: KILL-SWITCH-2025',
    });
    return;
  }

  if (!reason) {
    res.status(400).json({ success: false, error: 'Reason is required' });
    return;
  }

  try {
    const success = activateGlobalKillSwitch(reason, req.user!.email, confirmationCode);

    createEntry({
      agent: req.user!.email,
      action: 'Global Kill Switch ACTIVATED (Level 4)',
      input: JSON.stringify({ reason, confirmationCode }),
      output: success ? 'Activated successfully' : 'Activation returned false',
      risk_score: 100,
      approved_by: req.user!.email,
    });

    res.json({
      success,
      message: success ? 'Global kill switch activated' : 'Activation failed',
      data: getGlobalKillSwitchStatistics(),
    });
  } catch (err) {
    const error = err as Error;
    res.status(403).json({
      success: false,
      error: error.message,
      code: (error as unknown as { code?: string }).code || 'KILL_SWITCH_ERROR',
    });
  }
}));

// POST /api/kill-switch/global/deactivate - Deactivate with post-mortem (new)
router.post('/global/deactivate', authMiddleware, requireFounder, asyncHandler(async (req, res) => {
  const { postMortemId } = req.body;

  try {
    const success = deactivateGlobalKillSwitch(req.user!.email, postMortemId);

    if (success) {
      createEntry({
        agent: req.user!.email,
        action: 'Global Kill Switch DEACTIVATED',
        input: JSON.stringify({ postMortemId }),
        output: 'Deactivated successfully',
        risk_score: 50,
        approved_by: req.user!.email,
      });
    }

    res.json({
      success,
      message: success ? 'Global kill switch deactivated' : 'Deactivation failed',
      data: getGlobalKillSwitchStatistics(),
    });
  } catch (err) {
    const error = err as Error;
    res.status(403).json({
      success: false,
      error: error.message,
      code: (error as unknown as { code?: string }).code || 'KILL_SWITCH_ERROR',
    });
  }
}));

// GET /api/kill-switch/global/status - Detailed status
router.get('/global/status', authMiddleware, asyncHandler(async (_req, res) => {
  const stats = getGlobalKillSwitchStatistics();
  res.json({ success: true, data: stats });
}));

// GET /api/kill-switch/history - Activation history
router.get('/history', authMiddleware, asyncHandler(async (_req, res) => {
  const history = getHistory();
  res.json({ success: true, data: history });
}));

// ═══════════════════════════════════════════════════════════════
// Health Monitor Routes
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch/health - Health checks for all agents
router.get('/health', authMiddleware, asyncHandler(async (_req, res) => {
  const checks = await checkAllAgentsHealth();
  const unhealthy = getUnhealthyAgentsList();
  const stats = getHealthStatistics();

  res.json({
    success: true,
    data: { checks, unhealthy, stats },
  });
}));

// GET /api/kill-switch/health/:agentId - Single agent health
router.get('/health/:agentId', authMiddleware, asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const check = await checkAgentHealth(agentId as string);

  res.json({ success: true, data: check });
}));

// POST /api/kill-switch/health/start - Start health monitoring
router.post('/health/start', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { intervalMs } = req.body;
  startHealthMonitoring(intervalMs);

  createEntry({
    agent: req.user!.email,
    action: 'Health Monitoring Started',
    input: JSON.stringify({ intervalMs }),
    output: 'Health monitoring started',
    risk_score: 10,
    approved_by: req.user!.email,
  });

  res.json({
    success: true,
    message: 'Health monitoring started',
    data: { isActive: isHealthMonitoringActive() },
  });
}));

// POST /api/kill-switch/health/stop - Stop health monitoring
router.post('/health/stop', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  stopHealthMonitoring();

  createEntry({
    agent: req.user!.email,
    action: 'Health Monitoring Stopped',
    input: 'manual stop',
    output: 'Health monitoring stopped',
    risk_score: 10,
    approved_by: req.user!.email,
  });

  res.json({
    success: true,
    message: 'Health monitoring stopped',
  });
}));

// GET /api/kill-switch/health/stats - Health statistics
router.get('/health/stats', authMiddleware, asyncHandler(async (_req, res) => {
  const stats = getHealthStatistics();
  res.json({ success: true, data: stats });
}));

// ═══════════════════════════════════════════════════════════════
// Anomaly Detector Routes
// ═══════════════════════════════════════════════════════════════

// POST /api/kill-switch/anomaly/analyze - Analyze agent for anomalies
router.post('/anomaly/analyze', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { agentId, metrics } = req.body;

  if (!agentId || !metrics) {
    res.status(400).json({ success: false, error: 'agentId and metrics are required' });
    return;
  }

  const report = analyzeAnomalies(agentId, metrics);

  if (report.shouldEscalate) {
    createEntry({
      agent: req.user!.email,
      action: 'Anomaly Escalation Detected',
      input: JSON.stringify({ agentId, anomalies: report.anomalies }),
      output: `Risk score: ${report.overallRiskScore}`,
      risk_score: Math.min(report.overallRiskScore * 5, 100),
      approved_by: req.user!.email,
    });
  }

  res.json({ success: true, data: report });
}));

// POST /api/kill-switch/anomaly/thresholds - Set anomaly thresholds
router.post('/anomaly/thresholds', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const thresholds = req.body;
  setAnomalyThresholds(thresholds);

  createEntry({
    agent: req.user!.email,
    action: 'Anomaly Thresholds Updated',
    input: JSON.stringify(thresholds),
    output: 'Thresholds updated',
    risk_score: 15,
    approved_by: req.user!.email,
  });

  res.json({ success: true, message: 'Anomaly thresholds updated' });
}));

// ═══════════════════════════════════════════════════════════════
// Recovery Routes
// ═══════════════════════════════════════════════════════════════

// POST /api/kill-switch/recover/:type - Run recovery for a type
router.post('/recover/:type', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { targetId } = req.body;

  const validTypes: RecoveryType[] = ['circuit_breaker', 'quarantine', 'workflow', 'global_kill_switch'];
  if (!validTypes.includes(type as RecoveryType)) {
    res.status(400).json({
      success: false,
      error: `Invalid recovery type. Must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  if (type !== 'global_kill_switch' && !targetId) {
    res.status(400).json({ success: false, error: 'targetId is required for this recovery type' });
    return;
  }

  const result = await runRecoveryService(type as RecoveryType, targetId || 'system');

  createEntry({
    agent: req.user!.email,
    action: `Recovery: ${type}`,
    input: JSON.stringify({ type, targetId }),
    output: result.success ? 'Recovery successful' : `Recovery failed: ${result.error}`,
    risk_score: result.success ? 20 : 60,
    approved_by: req.user!.email,
  });

  res.json({
    success: result.success,
    message: result.success ? 'Recovery completed' : `Recovery failed: ${result.error}`,
    data: result,
  });
}));

// POST /api/kill-switch/post-mortem - Generate post-mortem report
router.post('/post-mortem', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { incidentId } = req.body;

  if (!incidentId) {
    res.status(400).json({ success: false, error: 'incidentId is required' });
    return;
  }

  const report = generatePostMortemService(incidentId, req.user!.email);

  createEntry({
    agent: req.user!.email,
    action: 'Post-Mortem Generated',
    input: JSON.stringify({ incidentId }),
    output: `Report generated with ${report.timeline.length} events`,
    risk_score: 10,
    approved_by: req.user!.email,
  });

  res.json({ success: true, data: report });
}));

// ═══════════════════════════════════════════════════════════════
// Unified Status Route
// ═══════════════════════════════════════════════════════════════

// GET /api/kill-switch/status/full - Full system status
router.get('/status/full', authMiddleware, asyncHandler(async (_req, res) => {
  const status = getFullSystemStatus();
  res.json({ success: true, data: status });
}));

export default router;
