import { db } from '../db/connection.js';
import type { Agent } from '../types/index.js';

export function getAllAgents(filters?: { role?: string; department?: string; status?: string; riskCeiling?: string }): Agent[] {
  let sql = 'SELECT * FROM agents WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.role) {
    sql += ' AND role = ?';
    params.push(filters.role);
  }
  if (filters?.department) {
    sql += ' AND department = ?';
    params.push(filters.department);
  }
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.riskCeiling) {
    sql += ' AND risk_ceiling = ?';
    params.push(filters.riskCeiling);
  }

  sql += ' ORDER BY name';
  return db.prepare(sql).all(...params) as Agent[];
}

export function getAgentById(id: string): Agent | undefined {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined;
}

export function updateAgent(id: string, data: Record<string, unknown>): Agent | undefined {
  const fields = Object.keys(data);
  if (fields.length === 0) return getAgentById(id);

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = Object.values(data);
  values.push(id);

  db.prepare(`UPDATE agents SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  return getAgentById(id);
}

export function getAgentCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  return result.count;
}

export function getActiveAgentCount(): number {
  const result = db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").get() as { count: number };
  return result.count;
}

export function getAgentsByDepartment(department: string): Agent[] {
  return db.prepare('SELECT * FROM agents WHERE department = ?').all(department) as Agent[];
}
