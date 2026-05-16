// ═══════════════════════════════════════════════════════════════
// Test Setup - Shared in-memory DB
// ═══════════════════════════════════════════════════════════════

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-not-for-production';
process.env.JWT_EXPIRES_IN = '1d';
process.env.BCRYPT_ROUNDS = '4';

import Database from 'better-sqlite3';
import { setDb, initSchema, getDb } from '../src/db/connection.js';

// Create shared in-memory DB
const sharedDb = new Database(':memory:');
sharedDb.pragma('foreign_keys = ON');

// Inject into singleton
setDb(sharedDb);

// Initialize schema once
initSchema();

/** Export DB reference for tests */
export const testDb = getDb();
export { initSchema };

// ─── Lifecycle: clear data between tests ───
beforeEach(() => {
  const db = getDb();
  // Disable FKs during wipe so delete order doesn't matter
  db.pragma('foreign_keys = OFF');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
  for (const { name } of tables) {
    try {
      db.prepare(`DELETE FROM ${name}`).run();
    } catch {
      // ignore
    }
  }
  // Reset AUTOINCREMENT counters so seeded rows get stable IDs each test
  try {
    db.prepare("DELETE FROM sqlite_sequence").run();
  } catch {
    // table may not exist if no AUTOINCREMENT columns were used yet
  }
  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  sharedDb.close();
});
