import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

function getAuthToken(role: string = 'founder', email?: string, id?: string) {
  const finalEmail = email || (role === 'founder' ? 'founder@thecompany.de' : role === 'admin' ? 'admin@thecompany.de' : 'viewer@thecompany.de');
  const finalId = id || (role === 'founder' ? 'user-founder' : role === 'admin' ? 'user-admin' : 'user-viewer');
  return generateToken({ userId: finalId, email: finalEmail, role }, process.env.JWT_SECRET!);
}

describe('Approvals API', () => {
  beforeEach(() => {
    const db = testDb;
    
    // Insert users with different roles
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-admin', 'admin@thecompany.de', founderHash, 'Admin', 'admin', 1);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-viewer', 'viewer@thecompany.de', founderHash, 'Viewer', 'viewer', 1);
    
    // Insert test approvals
    const insertApproval = db.prepare(`
      INSERT INTO approvals (id, type, title, description, requester, risk_level, amount, recommendation, status, red_line)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Red line approval (payment - requires founder)
    insertApproval.run('app-001', 'payment', 'Hosting-Rechnung EUR 240', 'Monthly hosting', 'Procurement-Agent', 'high', 240, 'Freigeben', 'pending', 1);
    // Red line approval (contract - requires founder)
    insertApproval.run('app-002', 'contract', 'Freelancer-NDA', 'NDA contract', 'CHRO-Agent', 'high', null, 'Freigeben', 'pending', 1);
    // Non-red line
    insertApproval.run('app-003', 'communication', 'Email campaign', 'Bulk email', 'Marketing-Agent', 'medium', null, 'Prufen', 'pending', 0);
  });

  describe('GET /api/approvals', () => {
    it('should list all approvals', async () => {
      const res = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/approvals?type=payment')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].type).toBe('payment');
    });
  });

  describe('POST /api/approvals/:id/approve', () => {
    it('should allow founder to approve red-line approval', async () => {
      const res = await request(app)
        .post('/api/approvals/app-001/approve')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });

    it('should reject viewer from approving', async () => {
      const res = await request(app)
        .post('/api/approvals/app-001/approve')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject admin from approving red-line', async () => {
      const res = await request(app)
        .post('/api/approvals/app-001/approve')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Red line');
    });

    it('should allow admin to approve non-red-line', async () => {
      const res = await request(app)
        .post('/api/approvals/app-003/approve')
        .set('Authorization', `Bearer ${getAuthToken('admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should write audit log on approval', async () => {
      await request(app)
        .post('/api/approvals/app-001/approve')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`);

      // Check audit log was written
      const db = testDb;
      const auditEntry = db.prepare("SELECT * FROM audit_log WHERE action LIKE '%approved%' ORDER BY timestamp DESC LIMIT 1").get() as {
        action: string; agent: string;
      } | undefined;
      
      expect(auditEntry).toBeDefined();
      expect(auditEntry!.action).toContain('approved');
    });
  });

  describe('POST /api/approvals/:id/reject', () => {
    it('should allow founder to reject red-line approval', async () => {
      const res = await request(app)
        .post('/api/approvals/app-002/reject')
        .set('Authorization', `Bearer ${getAuthToken('founder')}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
    });

    it('should reject viewer from rejecting', async () => {
      const res = await request(app)
        .post('/api/approvals/app-002/reject')
        .set('Authorization', `Bearer ${getAuthToken('viewer')}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
