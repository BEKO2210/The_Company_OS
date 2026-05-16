import { db } from '../db/connection.js';
import type { Risk } from '../types/index.js';

export function calculateScore(probability: number, severity: number): number {
  return probability * severity;
}

export function getAllRisks(filters?: { category?: string; status?: string; minScore?: number }): Risk[] {
  // Use COALESCE(NULLIF(score, 1), probability*severity) so rows seeded without
  // an explicit score (score defaults to 1) still expose probability*severity.
  let sql = `SELECT *, COALESCE(NULLIF(score, 1), probability * severity) AS score FROM risks WHERE 1=1`;
  const params: (string | number)[] = [];

  if (filters?.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.minScore !== undefined) {
    sql += ' AND COALESCE(NULLIF(score, 1), probability * severity) >= ?';
    params.push(filters.minScore);
  }

  sql += ' ORDER BY COALESCE(NULLIF(score, 1), probability * severity) DESC, name';
  return db.prepare(sql).all(...params) as Risk[];
}

export function getRiskById(id: number): Risk | undefined {
  return db.prepare('SELECT * FROM risks WHERE id = ?').get(id) as Risk | undefined;
}

export function getHighRisks(threshold: number = 10): Risk[] {
  return db.prepare('SELECT * FROM risks WHERE score >= ? ORDER BY score DESC').all(threshold) as Risk[];
}

export function getRiskMatrix(): number[][] {
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  
  const risks = db.prepare('SELECT probability, severity, COUNT(*) as count FROM risks GROUP BY probability, severity').all() as Array<{
    probability: number;
    severity: number;
    count: number;
  }>;

  for (const r of risks) {
    const p = Math.max(1, Math.min(5, r.probability)) - 1;
    const s = Math.max(1, Math.min(5, r.severity)) - 1;
    matrix[p][s] = r.count;
  }

  return matrix;
}

export function getRiskCounts(): { total: number; high: number; critical: number; active: number; mitigated: number; monitoring: number } {
  const total = db.prepare('SELECT COUNT(*) as count FROM risks').get() as { count: number };
  const high = db.prepare('SELECT COUNT(*) as count FROM risks WHERE score >= 10').get() as { count: number };
  const critical = db.prepare('SELECT COUNT(*) as count FROM risks WHERE score >= 15').get() as { count: number };
  const active = db.prepare("SELECT COUNT(*) as count FROM risks WHERE status = 'active'").get() as { count: number };
  const mitigated = db.prepare("SELECT COUNT(*) as count FROM risks WHERE status = 'mitigated'").get() as { count: number };
  const monitoring = db.prepare("SELECT COUNT(*) as count FROM risks WHERE status = 'monitoring'").get() as { count: number };

  return {
    total: total.count,
    high: high.count,
    critical: critical.count,
    active: active.count,
    mitigated: mitigated.count,
    monitoring: monitoring.count,
  };
}
