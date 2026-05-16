// Orchestrator routes — chat + task management.
// Unauth (like /api/ai/llm) so the AIQueryPanel works on first run without
// a login flow. Lock these down behind authMiddleware before exposing the
// server beyond localhost.

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { runCeo } from '../orchestrator/ceoAgent.js';
import {
  createTask, getTask, listTasks,
} from '../orchestrator/taskStore.js';
import { getQueue } from '../orchestrator/queue.js';
import type { TaskStatus } from '../orchestrator/types.js';

const router = Router();

// POST /api/orchestrator/chat
// Body: { message: string, history?: [{role, content}] }
// → runs CEO-Agent, creates tasks, enqueues them, returns reply + tasks.
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ success: false, error: 'message required' });
    return;
  }
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  const sourceUser = typeof req.body?.user === 'string' ? req.body.user : undefined;

  let plan;
  try {
    plan = await runCeo({
      userMessage: message,
      history,
      sourceUser,
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : 'CEO agent failed (Ollama unreachable?)',
    });
    return;
  }

  const created = [];
  const queue = await getQueue();
  for (const t of plan.tasks) {
    const row = createTask({ ...t, sourceUser });
    await queue.add(row.id);
    created.push(row);
  }

  res.json({
    success: true,
    data: {
      reply: plan.reply,
      tasks: created,
      queueMode: queue.mode,
    },
  });
}));

// GET /api/orchestrator/tasks?status=queued&limit=50
router.get('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? (req.query.status as TaskStatus) : undefined;
  const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const tasks = listTasks({ status, agentId, limit });
  res.json({ success: true, data: tasks });
}));

// GET /api/orchestrator/tasks/:id
router.get('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const t = getTask(req.params.id as string);
  if (!t) {
    res.status(404).json({ success: false, error: 'task not found' });
    return;
  }
  res.json({ success: true, data: t });
}));

// POST /api/orchestrator/tasks/:id/retry — re-queue a failed task
router.post('/tasks/:id/retry', asyncHandler(async (req: Request, res: Response) => {
  const t = getTask(req.params.id as string);
  if (!t) {
    res.status(404).json({ success: false, error: 'task not found' });
    return;
  }
  // Reset status to queued and re-add
  const queue = await getQueue();
  // Direct DB update would be cleaner, but we keep markRunning logic in taskStore.
  // For retry we just push to queue; worker checks status guard.
  // Quick reset via raw db update:
  const { getDb } = await import('../db/connection.js');
  getDb().prepare(`
    UPDATE agent_tasks SET status='queued', error=NULL, updated_at=? WHERE id=?
  `).run(new Date().toISOString(), t.id);
  await queue.add(t.id);
  res.json({ success: true, data: getTask(t.id) });
}));

// GET /api/orchestrator/status — quick health endpoint
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const queue = await getQueue();
  res.json({
    success: true,
    data: {
      queueMode: queue.mode,
      queued: listTasks({ status: 'queued', limit: 1 }).length > 0 ? 'has-pending' : 'empty',
    },
  });
}));

export default router;
