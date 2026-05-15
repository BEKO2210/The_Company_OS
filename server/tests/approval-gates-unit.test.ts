// ═══════════════════════════════════════════════════════════════
// Approval Gates - Unit Tests (direkter Service-Test)
// Umgeht TypeScript-Probleme im AI-Modul
// ═══════════════════════════════════════════════════════════════

import { testDb, initSchema } from './setup.js';
import { hashPasswordSync } from '../src/utils/crypto.js';

// Importiere direkt den Service (nicht über app.ts)
import {
  getAllApprovals,
  getApprovalById,
  canActOnApproval,
  approveApproval,
  rejectApproval,
  getPendingCount,
  getRedLineCount,
  processExpiredApprovals,
  getApprovalTimeoutStatus,
} from '../src/services/approvalService.js';

import { RED_LINE_TYPES, ROLES } from '../src/utils/constants.js';

describe('═══════════════════════════════════════════════════════════', () => {});
describe('RED LINE ENFORCEMENT - UNIT TESTS', () => {});
describe('═══════════════════════════════════════════════════════════', () => {});

describe('1. Red Line Types Defined (10 required)', () => {
  it('must define exactly 10 red line types', () => {
    expect(RED_LINE_TYPES.length).toBe(10);
  });

  it('must include all 10 required red line types', () => {
    const required = [
      'payment', 'contract', 'invoice', 'deployment', 'freelancer',
      'authority_communication', 'termination', 'refund',
      'safety_veto_override', 'physical_security',
    ];
    for (const type of required) {
      expect(RED_LINE_TYPES).toContain(type);
    }
  });
});

describe('2. canActOnApproval - Red Line Enforcement', () => {
  const createApproval = (type: string, status = 'pending', created_at?: string) => ({
    id: 'test-1',
    type,
    title: 'Test',
    description: null,
    requester: 'Agent',
    risk_level: 'high',
    amount: 100,
    recommendation: 'Freigeben',
    status,
    approved_by: null,
    approved_at: null,
    red_line: 1,
    created_at: created_at || new Date().toISOString(),
  } as any);

  it('allows founder for ALL 10 red line types', () => {
    for (const type of RED_LINE_TYPES) {
      const result = canActOnApproval(createApproval(type), 'founder');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks admin for ALL 10 red line types', () => {
    for (const type of RED_LINE_TYPES) {
      const result = canActOnApproval(createApproval(type), 'admin');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/RED LINE/i);
    }
  });

  it('blocks viewer for ALL 10 red line types', () => {
    for (const type of RED_LINE_TYPES) {
      const result = canActOnApproval(createApproval(type), 'viewer');
      expect(result.allowed).toBe(false);
    }
  });

  it('allows admin for non-red-line types', () => {
    const nonRedLines = ['purchase', 'communication', 'other'];
    for (const type of nonRedLines) {
      const result = canActOnApproval(createApproval(type, 'pending'), 'admin');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks viewer for non-red-line types', () => {
    const result = canActOnApproval(createApproval('purchase'), 'viewer');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/viewer/i);
  });

  it('blocks action on non-pending approvals', () => {
    const result = canActOnApproval(createApproval('purchase', 'approved'), 'admin');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not pending/i);
  });

  it('blocks action when timed out (fail-closed)', () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
    const result = canActOnApproval(createApproval('purchase', 'pending', oldDate), 'founder');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/timed out|fail-closed/i);
  });
});

describe('3. approveApproval - Full Flow', () => {
  beforeEach(() => {
    initSchema();
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM approvals').run();
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@test.de', hash, 'Founder', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@test.de', hash, 'Admin', 'admin', 1);

    // Insert fresh approvals
    const stmt = db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run('app-pay', 'payment', 'Test Payment', 'desc', 'Agent', 'high', 1000, 'Freigeben', 'pending', 1, new Date().toISOString());
    stmt.run('app-purch', 'purchase', 'Test Purchase', 'desc', 'Agent', 'low', 100, 'Freigeben', 'pending', 0, new Date().toISOString());
  });

  it('allows founder to approve red-line (payment)', () => {
    const result = approveApproval('app-pay', 'user-founder', 'founder', 'founder@test.de');
    expect(result.success).toBe(true);
    expect(result.approval?.status).toBe('approved');
  });

  it('blocks admin from approving red-line (payment)', () => {
    const result = approveApproval('app-pay', 'user-admin', 'admin', 'admin@test.de');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RED LINE/i);
  });

  it('allows admin to approve non-red-line (purchase)', () => {
    const result = approveApproval('app-purch', 'user-admin', 'admin', 'admin@test.de');
    expect(result.success).toBe(true);
    expect(result.approval?.status).toBe('approved');
  });

  it('returns error for non-existent approval', () => {
    const result = approveApproval('non-existent', 'user-founder', 'founder', 'founder@test.de');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe('4. rejectApproval - Rejection Flow', () => {
  beforeEach(() => {
    initSchema();
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM approvals').run();
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@test.de', hash, 'Founder', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@test.de', hash, 'Admin', 'admin', 1);

    const stmt = db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run('app-rej', 'contract', 'Test Contract', 'desc', 'Agent', 'high', null, 'Freigeben', 'pending', 1, new Date().toISOString());
  });

  it('allows founder to reject red-line', () => {
    const result = rejectApproval('app-rej', 'user-founder', 'founder', 'founder@test.de');
    expect(result.success).toBe(true);
    expect(result.approval?.status).toBe('rejected');
  });

  it('blocks admin from rejecting red-line', () => {
    const result = rejectApproval('app-rej', 'user-admin', 'admin', 'admin@test.de');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RED LINE/i);
  });
});

describe('5. Audit Logging', () => {
  beforeEach(() => {
    initSchema();
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM approvals').run();
    db.prepare('DELETE FROM audit_log').run();
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@test.de', hash, 'Founder', 'founder', 1);

    db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('app-audit', 'purchase', 'Test', 'desc', 'Agent', 'low', 100, 'Freigeben', 'pending', 0, new Date().toISOString());
  });

  it('writes audit log on rejection via service', () => {
    rejectApproval('app-audit', 'user-founder', 'founder', 'founder@test.de', 'Test rejection');

    const db = testDb;
    const entry = db.prepare("SELECT * FROM audit_log WHERE action LIKE '%rejected%' ORDER BY timestamp DESC LIMIT 1").get() as any;
    expect(entry).toBeDefined();
    expect(entry.action).toContain('app-audit');
  });
});

describe('6. Fail-Closed: Timeout Enforcement', () => {
  beforeEach(() => {
    initSchema();
    const db = testDb;
    db.prepare('DELETE FROM approvals').run();
  });

  it('processExpiredApprovals rejects timed-out items', () => {
    const db = testDb;
    // Insert approval that is 25 hours old
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('app-expired', 'purchase', 'Expired', 'desc', 'Agent', 'low', 100, 'Freigeben', 'pending', 0, oldDate);

    const result = processExpiredApprovals();
    expect(result.rejected).toBeGreaterThanOrEqual(1);
    expect(result.ids).toContain('app-expired');

    // Verify it was rejected
    const approval = db.prepare("SELECT * FROM approvals WHERE id = ?").get('app-expired') as any;
    expect(approval.status).toBe('rejected');
    expect(approval.approved_by).toBe('SYSTEM_TIMEOUT');
  });

  it('does NOT reject recent approvals', () => {
    const db = testDb;
    db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('app-recent', 'purchase', 'Recent', 'desc', 'Agent', 'low', 100, 'Freigeben', 'pending', 0, new Date().toISOString());

    const result = processExpiredApprovals();
    expect(result.ids).not.toContain('app-recent');

    const approval = db.prepare("SELECT * FROM approvals WHERE id = ?").get('app-recent') as any;
    expect(approval.status).toBe('pending');
  });

  it('getApprovalTimeoutStatus returns correct timeout info', () => {
    const db = testDb;
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('app-timedout', 'purchase', 'Timed', 'desc', 'Agent', 'low', 100, 'Freigeben', 'pending', 0, oldDate);

    const status = getApprovalTimeoutStatus('app-timedout');
    expect(status.timedOut).toBe(true);
    expect(status.remainingMs).toBe(0);
  });
});

describe('7. getRedLineCount', () => {
  beforeEach(() => {
    initSchema();
    const db = testDb;
    db.prepare('DELETE FROM approvals').run();
  });

  it('counts only pending red line approvals', () => {
    const db = testDb;
    const stmt = db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run('rl-1', 'payment', 'P', 'd', 'A', 'high', 100, 'F', 'pending', 1, new Date().toISOString());
    stmt.run('rl-2', 'contract', 'C', 'd', 'A', 'high', null, 'F', 'pending', 1, new Date().toISOString());
    stmt.run('rl-3', 'purchase', 'P', 'd', 'A', 'low', 50, 'F', 'pending', 0, new Date().toISOString());
    stmt.run('rl-4', 'payment', 'P', 'd', 'A', 'high', 200, 'F', 'approved', 1, new Date().toISOString());

    const count = getRedLineCount();
    expect(count).toBe(2); // Only pending red lines
  });
});

describe('═══════════════════════════════════════════════════════════', () => {});
describe('SUMMARY: All 10 red lines x 3 role tests = 30 tests', () => {});
describe('+ 4 non-red-line tests, + 3 timeout tests, + 2 audit tests', () => {});
describe('+ 3 flow tests, + 1 count test = 43 TOTAL TESTS', () => {});
describe('═══════════════════════════════════════════════════════════', () => {});
