// Orchestrator bootstrap: wires queue → worker → cron.
// Called once from server.ts on startup.

import { getQueue, closeQueue } from './queue.js';
import { runTask } from './worker.js';
import { startCron, stopCron } from './cron.js';

let booted = false;

export async function startOrchestrator(): Promise<void> {
  if (booted) return;
  const queue = await getQueue();
  await queue.startWorker(runTask);
  await startCron(queue);
  booted = true;
  console.log(`[ORCH] Orchestrator started (queue=${queue.mode})`);
}

export async function stopOrchestrator(): Promise<void> {
  stopCron();
  await closeQueue();
  booted = false;
}

export { getQueue } from './queue.js';
export * from './taskStore.js';
export * from './ceoAgent.js';
export * from './types.js';
