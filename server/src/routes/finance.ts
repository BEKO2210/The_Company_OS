import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { Budget, Invoice } from '../types/index.js';

const router = Router();

// ─── Budgets ───

// GET /api/finance/budgets
router.get('/budgets', authMiddleware, asyncHandler(async (_req, res) => {
  const budgets = db.prepare('SELECT * FROM budgets ORDER BY limit_amount DESC').all() as Budget[];
  
  const totalLimit = budgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0);
  
  res.json({
    success: true,
    data: budgets,
    summary: {
      totalLimit,
      totalSpent,
      totalRemaining,
      utilizationRate: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0,
    },
  });
}));

// GET /api/finance/budgets/:id
router.get('/budgets/:id', authMiddleware, asyncHandler(async (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id) as Budget | undefined;
  if (!budget) {
    res.status(404).json({ success: false, error: 'Budget not found' });
    return;
  }
  res.json({ success: true, data: budget });
}));

// ─── Invoices ───

// GET /api/finance/invoices
router.get('/invoices', authMiddleware, asyncHandler(async (req, res) => {
  const status = req.query.status as string | undefined;
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params: string[] = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  const invoices = db.prepare(sql).all(...params) as Invoice[];
  res.json({ success: true, data: invoices });
}));

// GET /api/finance/invoices/:id
router.get('/invoices/:id', authMiddleware, asyncHandler(async (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as Invoice | undefined;
  if (!invoice) {
    res.status(404).json({ success: false, error: 'Invoice not found' });
    return;
  }
  res.json({ success: true, data: invoice });
}));

// ─── Liquidity ───

// GET /api/finance/liquidity
router.get('/liquidity', authMiddleware, asyncHandler(async (_req, res) => {
  const liquiditySetting = db.prepare("SELECT value FROM system_settings WHERE key = 'liquidity_eur'").get() as { value: string } | undefined;
  const liquidity = liquiditySetting ? parseInt(liquiditySetting.value, 10) : 12450;

  // 30-day trend data
  const trend = [
    { day: '1', value: 18500 }, { day: '2', value: 18200 }, { day: '3', value: 17800 },
    { day: '4', value: 17600 }, { day: '5', value: 17300 }, { day: '6', value: 17100 },
    { day: '7', value: 16900 }, { day: '8', value: 16600 }, { day: '9', value: 16300 },
    { day: '10', value: 16100 }, { day: '11', value: 15800 }, { day: '12', value: 15400 },
    { day: '13', value: 15000 }, { day: '14', value: 14800 }, { day: '15', value: 14500 },
    { day: '16', value: 14200 }, { day: '17', value: 13900 }, { day: '18', value: 13600 },
    { day: '19', value: 13300 }, { day: '20', value: 13000 }, { day: '21', value: 12800 },
    { day: '22', value: 12500 }, { day: '23', value: 12200 }, { day: '24', value: 11800 },
    { day: '25', value: 11500 }, { day: '26', value: 11200 }, { day: '27', value: 11000 },
    { day: '28', value: 10800 }, { day: '29', value: 11600 }, { day: '30', value: 12450 },
  ];

  // Finance entries
  const financeEntries = [
    { id: 'fin-001', category: 'Hosting & Infrastructure', budget: 5000, spent: 2880, projected: 5200, variance: -200 },
    { id: 'fin-002', category: 'Freelancer & Experts', budget: 15000, spent: 8450, projected: 18000, variance: -3000 },
    { id: 'fin-003', category: 'Software & Tools', budget: 8000, spent: 3200, projected: 7800, variance: 200 },
    { id: 'fin-004', category: 'Marketing & Sales', budget: 5000, spent: 2100, projected: 4800, variance: 200 },
    { id: 'fin-005', category: 'Legal & Compliance', budget: 3000, spent: 1750, projected: 3200, variance: -200 },
    { id: 'fin-006', category: 'Security & Audit', budget: 4000, spent: 2200, projected: 4200, variance: -200 },
    { id: 'fin-007', category: 'Operations', budget: 6000, spent: 2900, projected: 5800, variance: 200 },
    { id: 'fin-008', category: 'Internal Tools', budget: 3000, spent: 980, projected: 2800, variance: 200 },
  ];

  res.json({
    success: true,
    data: {
      currentLiquidity: liquidity,
      trend,
      financeEntries,
    },
  });
}));

export default router;
