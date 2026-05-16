// ═══════════════════════════════════════════════════════════════
// RUN-004: Workflow Routes (erweitert mit Engine)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import {
  getAllWorkflows,
  getWorkflowById,
  getInstances,
  advanceStep,
} from '../services/workflowService.js';
import {
  getWorkflowEngine,
  getRunnerStats,
  isRunnerActive,
} from '../workflowEngine/index.js';
import {
  workflowStartSchema,
  workflowInstanceFilterSchema,
} from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireWriteAccess } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const engine = getWorkflowEngine();

// ═══════════════════════════════════════════════════════════════
// Workflow Definitions (read-only)
// ═══════════════════════════════════════════════════════════════

// GET /api/workflows - All workflows
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const workflows = getAllWorkflows();
  res.json({ success: true, data: workflows });
}));

// ═══════════════════════════════════════════════════════════════
// Running Instances (read-only)
// MUST be defined BEFORE /:id to avoid capture
// ═══════════════════════════════════════════════════════════════

// GET /api/workflows/instances/running - All running instances
router.get('/instances/running', authMiddleware, asyncHandler(async (_req, res) => {
  const instances = engine.getRunningInstances();
  res.json({ success: true, data: instances });
}));

// GET /api/workflows/instances/active - All active instances (running, paused, blocked)
router.get('/instances/active', authMiddleware, asyncHandler(async (_req, res) => {
  const instances = engine.getActiveInstances();
  res.json({ success: true, data: instances });
}));

// GET /api/workflows/instances/list - Legacy list endpoint
router.get('/instances/list', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = workflowInstanceFilterSchema.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};
  const instances = getInstances({
    workflowId: (filters as Record<string, unknown>).workflowId as string | undefined,
    status: (filters as Record<string, unknown>).status as string | undefined,
  });
  res.json({ success: true, data: instances });
}));

// POST /api/workflows/instances/:id/advance (legacy) - WRITE requires admin+
// Also mounted at /api/workflow-instances/:id/advance
const advanceHandler = asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
  const result = advanceStep(req.params.id as string);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }
  const instance = result.instance as unknown as Record<string, unknown> | undefined;
  res.json({
    success: true,
    data: instance ? { ...instance, current_step: instance.currentStep ?? instance.current_step } : instance,
    blocked: result.blocked,
  });
});
router.post('/instances/:id/advance', authMiddleware, requireWriteAccess, advanceHandler);
router.post('/:id/advance', authMiddleware, requireWriteAccess, advanceHandler);

// GET /api/workflow-instances/:id/gate - is current step a blocking gate?
router.get('/:id/gate', authMiddleware, asyncHandler(async (req, res) => {
  const instance = engine.getInstance(req.params.id as string);
  if (!instance) {
    res.status(404).json({ success: false, error: 'Instance not found' });
    return;
  }
  const stepState = instance.stepStates[instance.currentStep];
  const blocking = stepState?.state === 'blocked';
  res.json({ success: true, data: { blocking, currentStep: instance.currentStep, stepState } });
}));

// ═══════════════════════════════════════════════════════════════
// Runner Status (read-only)
// MUST be defined BEFORE /:id to avoid capture
// ═══════════════════════════════════════════════════════════════

// GET /api/workflows/runner/status
router.get('/runner/status', authMiddleware, asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      active: isRunnerActive(),
      stats: getRunnerStats(),
    },
  });
}));

// ═══════════════════════════════════════════════════════════════
// Workflow Detail (MUST be after all specific routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/workflows/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const workflow = getWorkflowById(req.params.id as string);
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  res.json({ success: true, data: workflow });
}));

// ═══════════════════════════════════════════════════════════════
// Workflow Lifecycle (Engine) - WRITE operations require admin+
// ═══════════════════════════════════════════════════════════════

// POST /api/workflows/:id/start - Start a workflow with context
router.post('/:id/start', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const workflowId = req.params.id as string;
  const parsed = workflowStartSchema.safeParse(req.body);
  const context = parsed.success ? (parsed.data.context ?? {}) : {};

  try {
    const instance = await engine.start(workflowId, context);
    res.status(201).json({
      success: true,
      data: {
        ...instance,
        workflow_id: instance.workflowId,
        current_step: instance.currentStep,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/:id/execute - Execute next step
router.post('/:id/execute', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;

  try {
    const instance = engine.getInstance(instanceId);
    if (!instance) {
      res.status(404).json({ success: false, error: 'Instance not found' });
      return;
    }

    const nextStep = await engine.getNextStep(instanceId);
    if (nextStep === null) {
      res.json({
        success: true,
        data: engine.getInstanceStatus(instanceId),
        message: 'No executable step found - workflow may be complete or blocked',
      });
      return;
    }

    const result = await engine.executeStep(instanceId, nextStep);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/:id/execute/:stepIndex - Execute specific step
router.post('/:id/execute/:stepIndex', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const result = await engine.executeStep(instanceId, stepIndex);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/:id/pause - Pause workflow
router.post('/:id/pause', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;

  try {
    await engine.pause(instanceId);
    res.json({ success: true, message: 'Workflow paused' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/:id/resume - Resume workflow
router.post('/:id/resume', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;

  try {
    await engine.resume(instanceId);
    res.json({ success: true, message: 'Workflow resumed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/:id/cancel - Cancel workflow
router.post('/:id/cancel', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const reason = (req.body.reason as string) || 'Cancelled by user';

  try {
    await engine.cancel(instanceId, reason);
    res.json({ success: true, message: 'Workflow cancelled' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// GET /api/workflows/:id/status - Detailed status (read-only)
router.get('/:id/status', authMiddleware, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;

  try {
    const status = engine.getInstanceStatus(instanceId);
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(404).json({ success: false, error: message });
  }
}));

// GET /api/workflows/:id/next - Get next executable step (read-only)
router.get('/:id/next', authMiddleware, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;

  try {
    const nextStep = await engine.getNextStep(instanceId);
    if (nextStep === null) {
      res.json({ success: true, data: null, message: 'No next step available' });
      return;
    }

    const instance = engine.getInstance(instanceId);
    const workflow = instance ? getWorkflowById(instance.workflowId) : null;
    const steps = workflow?.steps ? JSON.parse(workflow.steps) as Array<Record<string, unknown>> : [];
    const step = steps[nextStep] as Record<string, unknown> | undefined;

    res.json({
      success: true,
      data: {
        stepIndex: nextStep,
        stepName: step?.name,
        stepId: step?.id,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// ═══════════════════════════════════════════════════════════════
// Gate Management - WRITE operations require admin+
// ═══════════════════════════════════════════════════════════════

const gateTypeSchema = z.enum(['approval', 'safety', 'budget', 'time', 'human']);

// POST /api/workflows/instances/:id/gate/:stepIndex/open - Open a gate
router.post('/instances/:id/gate/:stepIndex/open', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);
  const gateType = gateTypeSchema.safeParse(req.body.gateType).data ?? 'approval';
  const openedBy = (req.body.openedBy as string) || 'human';

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const success = await engine.openGate(instanceId, stepIndex, gateType, openedBy);
    if (success) {
      res.json({ success: true, message: `Gate ${gateType} opened for step ${stepIndex}` });
    } else {
      res.status(400).json({ success: false, error: 'Failed to open gate' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/instances/:id/gate/:stepIndex/block - Block a gate
router.post('/instances/:id/gate/:stepIndex/block', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);
  const gateType = gateTypeSchema.safeParse(req.body.gateType).data ?? 'approval';
  const reason = (req.body.reason as string) || 'Manually blocked';

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const success = await engine.blockGate(instanceId, stepIndex, gateType, reason);
    if (success) {
      res.json({ success: true, message: `Gate ${gateType} blocked for step ${stepIndex}` });
    } else {
      res.status(400).json({ success: false, error: 'Failed to block gate' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// GET /api/workflows/instances/:id/gate/:stepIndex - Check gate status (read-only)
router.get('/instances/:id/gate/:stepIndex', authMiddleware, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const result = await engine.checkGate(instanceId, stepIndex);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// ═══════════════════════════════════════════════════════════════
// Step Management - WRITE operations require admin+
// ═══════════════════════════════════════════════════════════════

// POST /api/workflows/instances/:id/skip/:stepIndex - Skip a step
router.post('/instances/:id/skip/:stepIndex', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);
  const reason = (req.body.reason as string) || 'Skipped by user';

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const result = await engine.skipStep(instanceId, stepIndex, reason);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

// POST /api/workflows/instances/:id/retry/:stepIndex - Retry a failed step
router.post('/instances/:id/retry/:stepIndex', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const instanceId = req.params.id as string;
  const stepIndex = parseInt(req.params.stepIndex as string, 10);

  if (isNaN(stepIndex) || stepIndex < 0) {
    res.status(400).json({ success: false, error: 'Invalid step index' });
    return;
  }

  try {
    const result = await engine.retryStep(instanceId, stepIndex);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
}));

export default router;
