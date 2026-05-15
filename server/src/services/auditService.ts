import { randomUUID } from 'crypto';
import { dbRef } from '../db/connection.js';
import { generateAuditHash } from '../utils/crypto.js';
import type { AuditLogEntry } from '../types/index.js';

/**
 * Get the hash of the most recent audit log entry.
 */
function getPreviousHash(): string | null {
  const lastEntry = dbRef().prepare('SELECT hash FROM audit_log ORDER BY timestamp DESC LIMIT 1').get() as { hash: string } | undefined;
  return lastEntry?.hash ?? null;
}

/**
 * Create a new audit log entry.
 * Append-only: calculates hash from entry data + previous hash.
 */
export function createEntry(data: {
  id?: string;
  agent: string;
  action: string;
  tool?: string | null;
  input?: string | null;
  output?: string | null;
  risk_score?: number;
  project?: string | null;
  approved_by?: string | null;
}): AuditLogEntry {
  const previousHash = getPreviousHash();
  const hash = generateAuditHash({ ...data, previous_hash: previousHash });

  const id = data.id || `log-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  dbRef().prepare(`
    INSERT INTO audit_log (id, timestamp, agent, action, tool, input, output, risk_score, project, approved_by, hash, previous_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    timestamp,
    data.agent,
    data.action,
    data.tool || null,
    data.input || null,
    data.output || null,
    data.risk_score || 0,
    data.project || null,
    data.approved_by || null,
    hash,
    previousHash
  );

  return {
    id,
    timestamp,
    agent: data.agent,
    action: data.action,
    tool: data.tool || null,
    input: data.input || null,
    output: data.output || null,
    risk_score: data.risk_score || 0,
    project: data.project || null,
    approved_by: data.approved_by || null,
    hash,
    previous_hash: previousHash,
    created_at: timestamp,
  };
}

/**
 * Get audit log entries with optional filters.
 */
export function getEntries(filters?: {
  agent?: string;
  action?: string;
  project?: string;
  minRisk?: number;
  page?: number;
  limit?: number;
}): { entries: AuditLogEntry[]; total: number } {
  let whereSql = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.agent) {
    whereSql += ' AND agent = ?';
    params.push(filters.agent);
  }
  if (filters?.action) {
    whereSql += ' AND action LIKE ?';
    params.push(`%${filters.action}%`);
  }
  if (filters?.project) {
    whereSql += ' AND project = ?';
    params.push(filters.project);
  }
  if (filters?.minRisk !== undefined) {
    whereSql += ' AND risk_score >= ?';
    params.push(filters.minRisk);
  }

  // Get total count
  const countResult = dbRef().prepare(`SELECT COUNT(*) as total FROM audit_log ${whereSql}`).get(...params) as { total: number };

  // Get paginated entries
  const page = filters?.page || 1;
  const limit = Math.min(filters?.limit || 50, 100);
  const offset = (page - 1) * limit;

  const entries = dbRef().prepare(`
    SELECT * FROM audit_log ${whereSql}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as AuditLogEntry[];

  return { entries, total: countResult.total };
}

/**
 * Verify the integrity of the audit log chain.
 * Returns true if all hashes are consistent.
 */
export function verifyChain(): boolean {
  const entries = dbRef().prepare('SELECT * FROM audit_log ORDER BY timestamp ASC').all() as AuditLogEntry[];
  
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].previous_hash !== entries[i - 1].hash) {
      return false;
    }
  }
  return true;
}

/**
 * Get the latest audit log entries.
 */
export function getLatest(limit: number = 10): AuditLogEntry[] {
  return dbRef().prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLogEntry[];
}
