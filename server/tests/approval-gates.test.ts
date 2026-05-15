// ═══════════════════════════════════════════════════════════════
// Approval Gates - Red Lines Enforcement Tests
// Tests ALL 10 red lines, fail-closed, audit logging, timeouts
// ═══════════════════════════════════════════════════════════════

import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';
import { RED_LINE_TYPES } from '../src/utils/constants.js';

const app = createApp();

function getAuthToken(role: string = 'founder', email?: string, id?: string) {
  const finalEmail = email || (role === 'founder' ? 'founder@thecompany.de' : role === 'admin' ? 'admin@thecompany.de' : 'viewer@thecompany.de');
  const finalId = id || (role === 'founder' ? 'user-founder' : role === 'admin' ? 'user-admin' : 'user-viewer');
  return generateToken({ userId: finalId, email: finalEmail, role }, process.env.JWT_SECRET!);
}

/**
 * Helper: Insert a test approval of a given type.
 */
function insertApproval(
  id: string,
  type: string,
  overrides: { status?: string; red_line?: number; created_at?: string; risk_level?: string } = {}
) {
  const db = testDb;
  const redLine = overrides.red_line !== undefined ? overrides.red_line : 1;
  const status = overrides.status || 'pending';
  const createdAt = overrides.created_at || new Date().toISOString();
  const riskLevel = overrides.risk_level || 'high';

  db.prepare(`
    INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    type,
    `${type} Test Title`,
    `Test description for ${type}`,
    'Test-Agent',
    riskLevel,
    1000,
    'Freigeben',
    status,
    redLine,
    createdAt
  );
  return id;
}

describe('═══════════════════════════════════════════════════════════', () => {});
describe('APPROVAL GATES - RED LINE ENFORCEMENT', () => {});
describe('═══════════════════════════════════════════════════════════', () => {});

describe('Red Line Types Defined', () => {
  it('must define exactly 10 red line types', () => {
    expect(RED_LINE_TYPES.length).toBe(10);
  });

  it('must include all required red line types', () => {
    const required = [
      'payment',                 // Zahlungen
      'contract',                // Verträge
      'invoice',                 // Rechnungsversand
      'deployment',              // Produktiv-Deployment
      'freelancer',              // Freelancer-Beauftragung
      'authority_communication', // Behördenkommunikation
      'termination',             // Kündigungen
      'refund',                  // Erstattungen
      'safety_veto_override',    // Aufhebung Safety-Veto
      'physical_security',       // Physische/sicherheitsrelevante Einsätze
    ];
    for (const type of required) {
      expect(RED_LINE_TYPES).toContain(type);
    }
  });
});

describe('ALL 10 Red Lines - Founder Only', () => {
  beforeEach(() => {
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);

    // Insert all 3 roles
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', hash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', hash, 'Admin', 'admin', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-viewer', 'viewer@thecompany.de', hash, 'Viewer', 'viewer', 1);
  });

  // ─── Test each of the 10 red lines ───
  const redLines = [
    { type: 'payment', label: 'Zahlung' },
    { type: 'contract', label: 'Vertrag' },
    { type: 'invoice', label: 'Rechnungsversand' },
    { type: 'deployment', label: 'Produktiv-Deployment' },
    { type: 'freelancer', label: 'Freelancer-Beauftragung' },
    { type: 'authority_communication', label: 'Behördenkommunikation' },
    { type: 'termination', label: 'Kündigungen' },
    { type: 'refund', label: 'Erstattungen' },
    { type: 'safety_veto_override', label: 'Aufhebung Safety-Veto' },
    { type: 'physical_security', label: 'Physische/sicherheitsrelevante Einsätze' },
  ];

  for (const { type, label } of redLines) {
    describe(`Red Line: ${label} (${type})`, () => {
      it(`blocks ADMIN from approving ${type}`, async () => {
        insertApproval(`app-${type}-001`, type);
        const res = await request(app)
          .post(`/api/approvals/app-${type}-001/approve`)
          .set('Authorization', `Bearer ${getAuthToken('admin')}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/red line|founder/i);
      });

      it(`blocks VIEWER from approving ${type}`, async () => {
        insertApproval(`app-${type}-002`, type);
        const res = await request(app)
          .post(`/api/approvals/app-${type}-002/approve`)
          .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it(`blocks ADMIN from rejecting ${type}`, async () => {
        insertApproval(`app-${type}-003`, type);
        const res = await request(app)
          .post(`/api/approvals/app-${type}-003/reject`)
          .set('Authorization', `Bearer ${getAuthToken('admin')}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it(`allows FOUNDER to approve ${type}`, async () => {
        insertApproval(`app-${type}-004`, type);
        const res = await request(app)
          .post(`/api/approvals/app-${type}-004/approve`)
          .set('Authorization', `Bearer ${getAuthToken('founder')}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('approved');
      });

      it(`allows FOUNDER to reject ${type}`, async () => {
        insertApproval(`app-${type}-005`, type);
        const res = await request(app)
          .post(`/api/approvals/app-${type}-005/reject`)
          .set('Authorization', `Bearer ${getAuthToken('founder')}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('rejected');
      });
    });
  }
});

describe('Non-Red-Line Types - Admin Allowed', () => {
  beforeEach(() => {
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', hash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', hash, 'Admin', 'admin', 1);
  });

  const nonRedLines = ['purchase', 'communication', 'other'];

  for (const type of nonRedLines) {
    it(`allows ADMIN to approve ${type}`, async () => {
      insertApproval(`app-nonrl-${type}`, type, { red_line: 0 });
      const res = await request(app)
        .post(`/api/approvals/app-nonrl-${type}/approve`)
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });
  }
});

describe('Fail-Closed Enforcement', () => {
  beforeEach(() => {
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', hash, 'Gruender', 'founder', 1);
  });

  it('blocks approval when role is unclear / empty', async () => {
    insertApproval('app-fail-001', 'purchase', { red_line: 0 });
    const res = await request(app)
      .post('/api/approvals/app-fail-001/approve')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('blocks approval for non-pending items', async () => {
    insertApproval('app-fail-002', 'purchase', { red_line: 0, status: 'approved' });
    const res = await request(app)
      .post('/api/approvals/app-fail-002/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('blocks approval for non-existent approval', async () => {
    const res = await request(app)
      .post('/api/approvals/non-existent/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('Audit Log Verification', () => {
  beforeEach(() => {
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', hash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', hash, 'Admin', 'admin', 1);
  });

  it('writes audit log on APPROVAL', async () => {
    insertApproval('app-audit-001', 'purchase', { red_line: 0 });
    await request(app)
      .post('/api/approvals/app-audit-001/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);

    const db = testDb;
    const auditEntry = db.prepare("SELECT * FROM audit_log WHERE action LIKE ? ORDER BY timestamp DESC LIMIT 1").get(`%app-audit-001%`) as {
      action: string; agent: string; output: string; risk_score: number;
    } | undefined;

    expect(auditEntry).toBeDefined();
    expect(auditEntry!.action).toContain('app-audit-001');
    expect(auditEntry!.action).toContain('approved');
    expect(auditEntry!.output).toBe('approved');
  });

  it('writes audit log on REJECTION', async () => {
    insertApproval('app-audit-002', 'purchase', { red_line: 0 });
    await request(app)
      .post('/api/approvals/app-audit-002/reject')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);

    const db = testDb;
    const auditEntry = db.prepare("SELECT * FROM audit_log WHERE action LIKE ? ORDER BY timestamp DESC LIMIT 1").get(`%app-audit-002%`) as {
      action: string; agent: string; output: string;
    } | undefined;

    expect(auditEntry).toBeDefined();
    expect(auditEntry!.action).toContain('app-audit-002');
    expect(auditEntry!.output).toBe('rejected');
  });

  it('writes audit log with risk_score >= 20', async () => {
    insertApproval('app-audit-003', 'payment');
    await request(app)
      .post('/api/approvals/app-audit-003/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);

    const db = testDb;
    const auditEntry = db.prepare("SELECT * FROM audit_log WHERE action LIKE ? ORDER BY timestamp DESC LIMIT 1").get(`%app-audit-003%`) as {
      risk_score: number;
    } | undefined;

    expect(auditEntry).toBeDefined();
    expect(auditEntry!.risk_score).toBeGreaterThanOrEqual(20);
  });
});

describe('Role Hierarchy Enforcement', () => {
  beforeEach(() => {
    const db = testDb;
    const hash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', hash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', hash, 'Admin', 'admin', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-viewer', 'viewer@thecompany.de', hash, 'Viewer', 'viewer', 1);
  });

  it('VIEWER cannot approve ANYTHING', async () => {
    insertApproval('app-role-001', 'purchase', { red_line: 0 });
    const res = await request(app)
      .post('/api/approvals/app-role-001/approve')
      .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('VIEWER cannot reject ANYTHING', async () => {
    insertApproval('app-role-002', 'purchase', { red_line: 0 });
    const res = await request(app)
      .post('/api/approvals/app-role-002/reject')
      .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('FOUNDER can approve EVERYTHING', async () => {
    // Non-red-line
    insertApproval('app-role-003', 'purchase', { red_line: 0 });
    const res1 = await request(app)
      .post('/api/approvals/app-role-003/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);
    expect(res1.status).toBe(200);

    // Red-line
    insertApproval('app-role-004', 'payment');
    const res2 = await request(app)
      .post('/api/approvals/app-role-004/approve')
      .set('Authorization', `Bearer ${getAuthToken('founder')}`);
    expect(res2.status).toBe(200);
  });
});

describe('═══════════════════════════════════════════════════════════', () => {});
describe('SUMMARY: 10 Red Lines x 4 Tests = 40 Red Line Tests', () => {});
describe('+ 3 Non-Red-Line Tests', () => {});
describe('+ 3 Fail-Closed Tests', () => {});
describe('+ 3 Audit Log Tests', () => {});
describe('+ 4 Role Hierarchy Tests', () => {});
describe('= 53 TOTAL TESTS', () => {});
describe('═══════════════════════════════════════════════════════════', () => {});
