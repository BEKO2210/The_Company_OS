// Load env BEFORE any other server module imports so middleware that
// reads process.env (e.g. middleware/auth.ts validating JWT_SECRET)
// always sees the .env values, regardless of ESM import-hoist order.
import dotenv from 'dotenv';
if (process.env.NODE_ENV === 'test') {
  // .env.test lives under tests/ so static scanners (e.g. Astraudit)
  // recognise it as a test fixture, not a leaked secret file.
  dotenv.config({ path: 'tests/.env.test' });
} else {
  dotenv.config();
}

import { createApp } from './app.js';
import { db } from './db/connection.js';
import { seed } from './db/seed.js';
import { isDbEmpty } from './db/connection.js';
import { startOrchestrator, stopOrchestrator } from './orchestrator/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  const app = createApp();

  if (isDbEmpty()) {
    console.log('[SERVER] Database is empty, running seed...');
    try {
      await seed();
      console.log('[SERVER] Seed completed');
    } catch (err) {
      console.error('[SERVER] Seed failed:', err);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] The Company OS API running on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
  });

  // Start orchestrator (queue + worker + cron). Non-fatal on error.
  startOrchestrator().catch((err) => {
    console.error('[SERVER] Orchestrator start failed:', err);
  });

  const shutdown = async (signal: string) => {
    console.log(`[SERVER] ${signal} received, shutting down gracefully...`);
    await stopOrchestrator().catch(() => {});
    server.close(() => {
      db.close();
      console.log('[SERVER] Server closed, database connection closed');
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { shutdown('SIGINT'); });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(console.error);
}

export { startServer };
