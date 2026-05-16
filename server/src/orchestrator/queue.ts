// Job queue abstraction. Tries BullMQ (Redis) first; on connection failure
// falls back to a small in-memory queue so the orchestrator still runs.
//
// SQLite (taskStore) is the durable source of truth for task state.
// The queue only carries the task ID — workers re-load from DB.

import type { Queue as BullQueue, Worker as BullWorker } from 'bullmq';

export type JobHandler = (taskId: string) => Promise<void>;

export interface OrchestratorQueue {
  add(taskId: string, opts?: { delayMs?: number }): Promise<void>;
  startWorker(handler: JobHandler): Promise<void>;
  close(): Promise<void>;
  readonly mode: 'bullmq' | 'memory';
}

const QUEUE_NAME = 'agent-tasks';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// ── In-memory fallback ───────────────────────────────────────────
class MemoryQueue implements OrchestratorQueue {
  readonly mode = 'memory' as const;
  private pending: { taskId: string; runAt: number }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private handler: JobHandler | null = null;
  private running = new Set<string>();

  async add(taskId: string, opts: { delayMs?: number } = {}): Promise<void> {
    const runAt = Date.now() + (opts.delayMs ?? 0);
    this.pending.push({ taskId, runAt });
  }

  async startWorker(handler: JobHandler): Promise<void> {
    this.handler = handler;
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(() => {}), 1000);
  }

  private async tick(): Promise<void> {
    if (!this.handler) return;
    const now = Date.now();
    const due = this.pending.filter((j) => j.runAt <= now);
    this.pending = this.pending.filter((j) => j.runAt > now);
    for (const job of due) {
      if (this.running.has(job.taskId)) continue;
      this.running.add(job.taskId);
      // Fire & forget; handler updates DB
      this.handler(job.taskId).catch(() => {}).finally(() => {
        this.running.delete(job.taskId);
      });
    }
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.pending = [];
  }
}

// ── BullMQ implementation ────────────────────────────────────────
class BullMqQueue implements OrchestratorQueue {
  readonly mode = 'bullmq' as const;
  private queue: BullQueue | null = null;
  private worker: BullWorker | null = null;
  // Disable @typescript-eslint/no-explicit-any for the dynamic import shim
  private bullmq: typeof import('bullmq') | null = null;
  private ioredis: typeof import('ioredis') | null = null;

  async init(): Promise<void> {
    this.bullmq = await import('bullmq');
    this.ioredis = await import('ioredis');
    // Probe connection with strict no-retry settings so we can fail fast and
    // fall back to the in-memory queue instead of spamming reconnect errors.
    const probe = new this.ioredis.default(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });
    probe.on('error', () => { /* swallow during probe */ });
    try {
      await probe.connect();
      await probe.ping();
    } finally {
      await probe.quit().catch(() => {});
      probe.disconnect();
    }

    // Real connection for BullMQ — BullMQ requires maxRetriesPerRequest: null.
    const connection = new this.ioredis.default(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.queue = new this.bullmq.Queue(QUEUE_NAME, { connection });
  }

  async add(taskId: string, opts: { delayMs?: number } = {}): Promise<void> {
    if (!this.queue) throw new Error('BullMQ queue not initialized');
    await this.queue.add(
      'run',
      { taskId },
      {
        jobId: taskId, // dedupe
        delay: opts.delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 200,
      },
    );
  }

  async startWorker(handler: JobHandler): Promise<void> {
    if (!this.bullmq || !this.ioredis) throw new Error('BullMQ not initialized');
    const connection = new this.ioredis.default(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.worker = new this.bullmq.Worker(
      QUEUE_NAME,
      async (job) => {
        const { taskId } = job.data as { taskId: string };
        await handler(taskId);
      },
      { connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => {
      console.error('[ORCH] BullMQ job failed', job?.id, err?.message);
    });
  }

  async close(): Promise<void> {
    await this.worker?.close().catch(() => {});
    await this.queue?.close().catch(() => {});
  }
}

// ── Factory with auto-detect ─────────────────────────────────────
let _instance: OrchestratorQueue | null = null;

export async function getQueue(): Promise<OrchestratorQueue> {
  if (_instance) return _instance;

  // If user explicitly disables BullMQ via env, skip the probe.
  if (process.env.ORCH_QUEUE === 'memory') {
    _instance = new MemoryQueue();
    console.log('[ORCH] Queue mode: memory (forced via ORCH_QUEUE=memory)');
    return _instance;
  }

  try {
    const bull = new BullMqQueue();
    await bull.init();
    _instance = bull;
    console.log(`[ORCH] Queue mode: bullmq (redis @ ${REDIS_URL})`);
    return _instance;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ORCH] BullMQ unavailable (${msg}) — falling back to in-memory queue.`);
    _instance = new MemoryQueue();
    console.log('[ORCH] Queue mode: memory');
    return _instance;
  }
}

export async function closeQueue(): Promise<void> {
  await _instance?.close();
  _instance = null;
}
