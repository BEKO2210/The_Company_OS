import request from 'supertest';
import { createApp } from '../src/app.js';
import { testDb } from './setup.js';
import { generateToken, hashPasswordSync } from '../src/utils/crypto.js';

const app = createApp();

function getAuthToken(role: string = 'founder') {
  const email = role === 'founder' ? 'founder@thecompany.de' : 'viewer@thecompany.de';
  const id = role === 'founder' ? 'user-founder' : 'user-viewer';
  return generateToken({ userId: id, email, role }, process.env.JWT_SECRET!);
}

describe('Finance API', () => {
  beforeEach(() => {
    const db = testDb;
    const founderHash = hashPasswordSync('pass', 4);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-founder', 'founder@thecompany.de', founderHash, 'Gruender', 'founder', 1);
    
    // Insert budgets
    const insertBudget = db.prepare(`
      INSERT INTO budgets (id, name, category, limit_amount, spent, remaining, warning_at, critical_at, period)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBudget.run('bud-001', 'Gesamtbudget Q1', 'total', 50000, 27460, 22540, 75, 90, 'monthly');
    insertBudget.run('bud-002', 'Hosting', 'infrastructure', 5000, 2880, 2120, 80, 95, 'monthly');
    
    // Insert invoices
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (id, studio, customer, amount, status, due_date, blocked)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertInvoice.run('inv-001', 'Studio Cedar', 'Internal', 5000, 'sent', '2025-03-25', 0);
    insertInvoice.run('inv-002', 'Studio Aurora', 'External', 3200, 'pending', '2025-03-30', 1);
    insertInvoice.run('inv-003', 'Studio Bridge', 'Pilot', 7500, 'overdue', '2025-02-28', 1);
    
    // Insert system settings for liquidity
    db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)')
      .run('liquidity_eur', '12450', 'Current liquidity');
  });

  describe('GET /api/finance/budgets', () => {
    it('should list all budgets', async () => {
      const res = await request(app)
        .get('/api/finance/budgets')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should include summary totals', async () => {
      const res = await request(app)
        .get('/api/finance/budgets')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalLimit).toBe(55000);
      expect(res.body.summary.totalSpent).toBe(30340);
    });
  });

  describe('GET /api/finance/invoices', () => {
    it('should list all invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter invoices by status', async () => {
      const res = await request(app)
        .get('/api/finance/invoices?status=pending')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('pending');
    });

    it('should correctly identify blocked invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      const blockedInvoices = res.body.data.filter((i: { blocked: number }) => i.blocked === 1);
      expect(blockedInvoices.length).toBe(2);
    });
  });

  describe('GET /api/finance/liquidity', () => {
    it('should return liquidity data with trend', async () => {
      const res = await request(app)
        .get('/api/finance/liquidity')
        .set('Authorization', `Bearer ${getAuthToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentLiquidity).toBe(12450);
      expect(res.body.data.trend.length).toBe(30);
      expect(res.body.data.financeEntries.length).toBeGreaterThan(0);
    });
  });
});
