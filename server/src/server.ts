// Load env BEFORE any other server module imports so middleware that
// reads process.env (e.g. middleware/auth.ts validating JWT_SECRET)
// always sees the .env values, regardless of ESM import-hoist order.
import dotenv from 'dotenv';
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

import { createApp } from './app.js';
import { db } from './db/connection.js';
import { seed } from './db/seed.js';
import { isDbEmpty } from './db/connection.js';

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

  process.on('SIGTERM', () => {
    console.log('[SERVER] SIGTERM received, shutting down gracefully...');
    server.close(() => {
      db.close();
      console.log('[SERVER] Server closed, database connection closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[SERVER] SIGINT received, shutting down gracefully...');
    server.close(() => {
      db.close();
      console.log('[SERVER] Server closed, database connection closed');
      process.exit(0);
    });
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(console.error);
}

export { startServer };
