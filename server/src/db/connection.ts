import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type { DatabaseType };

// ═══════════════════════════════════════════════════════════════
// Mutable DB Instance - Tests can replace with shared :memory:
// ═══════════════════════════════════════════════════════════════

let _db: Database.Database | null = null;
let _initialized = false;

function getDbPath(): string {
  const isTestEnv = process.env.NODE_ENV === 'test';
  return isTestEnv ? ':memory:' : (process.env.DATABASE_PATH || path.resolve(process.cwd(), './data/company.db'));
}

function ensureDataDir(dbPath: string): void {
  if (dbPath !== ':memory:') {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
}

/** Create a new database connection */
export function createDb(dbPath?: string): Database.Database {
  const targetPath = dbPath || getDbPath();
  ensureDataDir(targetPath);

  const instance = new Database(targetPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  return instance;
}

/** Initialize the singleton DB */
export function initDb(dbPath?: string): Database.Database {
  if (!_db) {
    _db = createDb(dbPath);
  }
  return _db;
}

/** Replace the DB instance (used by tests only) */
export function setDb(newDb: Database.Database): void {
  _db = newDb;
  _initialized = false;
}

/** Get current DB instance */
export function getDb(): Database.Database {
  if (!_db) {
    _db = initDb();
  }
  return _db;
}

/** Convenience export - same as getDb() but for direct destructuring */
export const db: Database.Database = getDb();

/** Re-export mutable reference that always calls getDb() */
export function dbRef(): Database.Database {
  return getDb();
}

// Initialize schema
export function initSchema(): void {
  const instance = getDb();

  const schemaPath = path.resolve(
    process.cwd(),
    path.basename(process.cwd()) === 'server' ? './src/db/schema.sql' : './server/src/db/schema.sql'
  );
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const statements = schema
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));

  for (const stmt of statements) {
    try {
      instance.exec(stmt + ';');
    } catch (err) {
      if (!(err as Error).message.includes('already exists')) {
        console.error('Schema init error:', (err as Error).message);
      }
    }
  }

  _initialized = true;

  if (process.env.NODE_ENV !== 'test') {
    console.log('[DB] Schema initialized');
  }
}

// Check if database is empty
export function isDbEmpty(): boolean {
  try {
    const instance = getDb();
    const result = instance.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'").get() as { count: number };
    if (result.count === 0) return true;
    const userCount = instance.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return userCount.count === 0;
  } catch {
    return true;
  }
}

// Auto-init schema in non-test environments
if (process.env.NODE_ENV !== 'test') {
  initSchema();
}

export default db;
