// node-cron driver: every minute, sweeps for queued tasks and re-enqueues
// jobs that got stuck in 'running' (worker crash / restart).
// Also every 6 hours: purge done/failed tasks older than 14 days.

import { getDb } from '../db/connection.js';
import { pendingTasks, reEnqueueStuck } from './taskStore.js';
import type { OrchestratorQueue } from './queue.js';

type CronModule = typeof import('node-cron');
let cronLib: CronModule | null = null;
let started = false;
const scheduled: { stop: () => void }[] = [];

export async function startCron(queue: OrchestratorQueue): Promise<void> {
  if (started) return;
  try {
    cronLib = await import('node-cron');
  } catch (err) {
    console.warn('[ORCH] node-cron not installed — falling back to setInterval.', err);
    // Fallback: setInterval-based scheduler
    setInterval(() => sweep(queue).catch(console.error), 60_000);
    setInterval(() => purgeOld().catch(console.error), 6 * 3600_000);
    started = true;
    return;
  }

  // Every minute: re-queue stuck + dispatch pending
  scheduled.push(cronLib.schedule('* * * * *', () => {
    sweep(queue).catch(console.error);
  }));

  // Every 6 hours: housekeeping
  scheduled.push(cronLib.schedule('0 */6 * * *', () => {
    purgeOld().catch(console.error);
  }));

  started = true;
  console.log('[ORCH] Cron started (sweep every 1m, purge every 6h)');
}

export function stopCron(): void {
  for (const s of scheduled) {
    try { s.stop(); } catch { /* ignore */ }
  }
  scheduled.length = 0;
  started = false;
}

async function sweep(queue: OrchestratorQueue): Promise<void> {
  const requeued = reEnqueueStuck(15);
  if (requeued.length > 0) {
    console.log(`[ORCH] Cron: re-enqueued ${requeued.length} stuck task(s)`);
  }
  const pending = pendingTasks(50);
  for (const t of pending) {
    await queue.add(t.id);
  }
}

async function purgeOld(): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();
  const res = getDb().prepare(`
    DELETE FROM agent_tasks
     WHERE status IN ('done', 'failed', 'cancelled')
       AND finished_at < ?
  `).run(cutoff);
  if (res.changes > 0) {
    console.log(`[ORCH] Cron: purged ${res.changes} old task(s)`);
  }
}
