// CRUD over the agent_tasks table. SQLite is the source of truth;
// the queue (BullMQ or in-memory) only carries task IDs.

import { randomUUID } from 'crypto';
import { getDb } from '../db/connection.js';
import type {
  AgentTask, AgentTaskRow, DispatchInput, TaskStatus,
} from './types.js';

function rowToTask(row: AgentTaskRow): AgentTask {
  return {
    id: row.id,
    parentId: row.parent_id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description ?? '',
    priority: row.priority,
    status: row.status,
    source: row.source,
    sourceUser: row.source_user,
    tool: row.tool,
    input: row.input ? safeJson(row.input) : null,
    result: row.result ? safeJson(row.result) : null,
    error: row.error,
    attempts: row.attempts ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function safeJson<T = unknown>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

export function createTask(input: DispatchInput): AgentTask {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO agent_tasks
      (id, parent_id, agent_id, title, description, priority, status,
       source, source_user, tool, input, attempts, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    input.parentId ?? null,
    input.agentId,
    input.title,
    input.description ?? '',
    input.priority ?? 'medium',
    input.source ?? 'chat',
    input.sourceUser ?? null,
    input.tool ?? null,
    input.input ? JSON.stringify(input.input) : null,
    now,
    now,
  );
  return getTask(id)!;
}

export function getTask(id: string): AgentTask | null {
  const row = getDb()
    .prepare('SELECT * FROM agent_tasks WHERE id = ?')
    .get(id) as AgentTaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function listTasks(opts: { status?: TaskStatus; agentId?: string; limit?: number } = {}): AgentTask[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.status) { clauses.push('status = ?'); params.push(opts.status); }
  if (opts.agentId) { clauses.push('agent_id = ?'); params.push(opts.agentId); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(opts.limit ?? 100, 500);
  const rows = getDb()
    .prepare(`SELECT * FROM agent_tasks ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, limit) as AgentTaskRow[];
  return rows.map(rowToTask);
}

export function markRunning(id: string): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE agent_tasks
       SET status = 'running', started_at = COALESCE(started_at, ?), attempts = attempts + 1, updated_at = ?
     WHERE id = ?
  `).run(now, now, id);
}

export function markDone(id: string, result: unknown): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE agent_tasks
       SET status = 'done', result = ?, finished_at = ?, updated_at = ?, error = NULL
     WHERE id = ?
  `).run(JSON.stringify(result ?? null), now, now, id);
}

export function markFailed(id: string, err: string): void {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE agent_tasks
       SET status = 'failed', error = ?, finished_at = ?, updated_at = ?
     WHERE id = ?
  `).run(err.slice(0, 2000), now, now, id);
}

export function reEnqueueStuck(maxAgeMinutes = 15): AgentTask[] {
  // Tasks stuck in 'running' for too long → reset to queued so cron/worker retries.
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
  const rows = getDb().prepare(`
    SELECT * FROM agent_tasks
     WHERE status = 'running' AND started_at < ?
  `).all(cutoff) as AgentTaskRow[];
  if (rows.length === 0) return [];
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE agent_tasks
       SET status = 'queued', updated_at = ?
     WHERE status = 'running' AND started_at < ?
  `).run(now, cutoff);
  return rows.map(rowToTask);
}

export function pendingTasks(limit = 50): AgentTask[] {
  const rows = getDb().prepare(`
    SELECT * FROM agent_tasks
     WHERE status = 'queued'
     ORDER BY
       CASE priority
         WHEN 'urgent' THEN 0
         WHEN 'high'   THEN 1
         WHEN 'medium' THEN 2
         ELSE 3
       END,
       created_at ASC
     LIMIT ?
  `).all(limit) as AgentTaskRow[];
  return rows.map(rowToTask);
}
