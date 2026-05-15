import { db } from '../db/connection.js';
import { RED_LINE_TYPES, ROLES } from '../utils/constants.js';
import type { Approval } from '../types/index.js';

// ─── Configuration ───
const APPROVAL_TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '86400000', 10); // 24h default

// ─── Audit Log helper (ensures audit trail even for rejections) ───
import { createEntry as createAuditEntry } from './auditService.js';

/**
 * Check if an approval has timed out.
 * Used for fail-closed enforcement.
 */
function isTimedOut(approval: Approval): boolean {
  if (!approval.created_at) return false;
  const created = new Date(approval.created_at).getTime();
  const now = Date.now();
  return (now - created) > APPROVAL_TIMEOUT_MS;
}

export function getAllApprovals(filters?: { type?: string; status?: string; riskLevel?: string }): Approval[] {
  let sql = 'SELECT * FROM approvals WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.riskLevel) {
    sql += ' AND risk_level = ?';
    params.push(filters.riskLevel);
  }

  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params) as Approval[];
}

export function getApprovalById(id: string): Approval | undefined {
  return db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Approval | undefined;
}

/**
 * Check if user can approve/reject an approval item.
 * Red line types require 'founder' role.
 * Implements FAIL-CLOSED: timed-out approvals are auto-rejected.
 */
export function canActOnApproval(approval: Approval, userRole: string): { allowed: boolean; reason?: string } {
  // Check if approval is still pending
  if (approval.status !== 'pending') {
    return { allowed: false, reason: 'Approval is not pending' };
  }

  // ─── FAIL-CLOSED: Check timeout ───
  // If approval has timed out, it MUST be rejected (fail-closed principle)
  if (isTimedOut(approval)) {
    return { allowed: false, reason: 'Approval has timed out (fail-closed)' };
  }

  // ─── RED LINE ENFORCEMENT ───
  // The following 10 red line types require FOUNDER role:
  // payment, contract, invoice, deployment, freelancer,
  // authority_communication, termination, refund,
  // safety_veto_override, physical_security
  if (RED_LINE_TYPES.includes(approval.type as typeof RED_LINE_TYPES[number])) {
    if (userRole !== ROLES.FOUNDER) {
      return { allowed: false, reason: `RED LINE VIOLATION: ${approval.type} approvals require FOUNDER role` };
    }
  }

  // Admin and founder can approve anything else
  if (userRole === ROLES.VIEWER) {
    return { allowed: false, reason: 'Viewer role cannot approve' };
  }

  return { allowed: true };
}

export function approveApproval(approvalId: string, userId: string, userRole: string, userName: string): { success: boolean; approval?: Approval; error?: string } {
  const approval = getApprovalById(approvalId);
  if (!approval) {
    return { success: false, error: 'Approval not found' };
  }

  const check = canActOnApproval(approval, userRole);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  db.prepare(`
    UPDATE approvals
    SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userName, approvalId);

  return { success: true, approval: getApprovalById(approvalId) };
}

export function rejectApproval(approvalId: string, userId: string, userRole: string, userName: string, _reason?: string): { success: boolean; approval?: Approval; error?: string } {
  const approval = getApprovalById(approvalId);
  if (!approval) {
    return { success: false, error: 'Approval not found' };
  }

  const check = canActOnApproval(approval, userRole);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  db.prepare(`
    UPDATE approvals
    SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userName, approvalId);

  const updated = getApprovalById(approvalId);

  // ─── AUDIT LOG: Write audit entry for rejection ───
  // Every rejection MUST be auditable
  try {
    createAuditEntry({
      agent: userName,
      action: `Approval ${approvalId} rejected`,
      input: JSON.stringify({ approvalId, type: approval.type, reason: _reason }),
      output: 'rejected',
      risk_score: 20,
      approved_by: userName,
    });
  } catch {
    // Audit log failure must not block the rejection (defense in depth)
  }

  return { success: true, approval: updated };
}

export function getPendingCount(): number {
  const result = db.prepare("SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'").get() as { count: number };
  return result.count;
}

export function getRedLineCount(): number {
  const placeholders = RED_LINE_TYPES.map(() => '?').join(',');
  const result = db.prepare(
    `SELECT COUNT(*) as count FROM approvals WHERE status = 'pending' AND type IN (${placeholders}) AND red_line = 1`
  ).get(...RED_LINE_TYPES) as { count: number };
  return result.count;
}

// ─── FAIL-CLOSED: Timeout enforcement ───

/**
 * Process all expired pending approvals.
 * FAIL-CLOSED PRINCIPLE: Any approval that exceeds the timeout
 * is automatically rejected. This prevents stale approvals from
 * being approved later without re-review.
 *
 * Call this periodically (e.g., via cron job or middleware).
 */
export function processExpiredApprovals(): { rejected: number; ids: string[] } {
  const expired = db.prepare(
    `SELECT * FROM approvals WHERE status = 'pending' AND created_at < datetime('now', '-${APPROVAL_TIMEOUT_MS / 1000} seconds')`
  ).all() as Approval[];

  const rejectedIds: string[] = [];

  for (const approval of expired) {
    db.prepare(`
      UPDATE approvals
      SET status = 'rejected', approved_by = 'SYSTEM_TIMEOUT', approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(approval.id);

    rejectedIds.push(approval.id);

    // Audit log for timeout rejection
    try {
      createAuditEntry({
        agent: 'SYSTEM_TIMEOUT',
        action: `Approval ${approval.id} auto-rejected (timeout)`,
        input: JSON.stringify({ approvalId: approval.id, type: approval.type, reason: 'FAIL-CLOSED timeout' }),
        output: 'rejected',
        risk_score: 50,
        approved_by: 'SYSTEM',
      });
    } catch {
      // Defense in depth: audit log failure must not block
    }
  }

  return { rejected: rejectedIds.length, ids: rejectedIds };
}

/**
 * Check if an approval item has timed out.
 * Used by frontend to show timeout warnings.
 */
export function getApprovalTimeoutStatus(approvalId: string): { timedOut: boolean; remainingMs: number } {
  const approval = getApprovalById(approvalId);
  if (!approval || !approval.created_at) {
    return { timedOut: true, remainingMs: 0 };
  }

  const created = new Date(approval.created_at).getTime();
  const elapsed = Date.now() - created;
  const remaining = Math.max(0, APPROVAL_TIMEOUT_MS - elapsed);

  return {
    timedOut: remaining === 0,
    remainingMs: remaining,
  };
}
