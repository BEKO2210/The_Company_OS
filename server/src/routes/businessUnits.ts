import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { BusinessUnit } from '../types/index.js';

const router = Router();

// GET /api/business-units - All units
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const units = db.prepare('SELECT * FROM business_units ORDER BY code').all() as BusinessUnit[];
  res.json({ success: true, data: units });
}));

// GET /api/business-units/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const unit = db.prepare('SELECT * FROM business_units WHERE id = ?').get(req.params.id) as BusinessUnit | undefined;
  if (!unit) {
    res.status(404).json({ success: false, error: 'Business unit not found' });
    return;
  }
  res.json({ success: true, data: unit });
}));

export default router;
