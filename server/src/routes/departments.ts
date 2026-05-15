import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { Department } from '../types/index.js';

const router = Router();

// GET /api/departments - All departments
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name').all() as Department[];
  res.json({ success: true, data: departments });
}));

// GET /api/departments/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id) as Department | undefined;
  if (!department) {
    res.status(404).json({ success: false, error: 'Department not found' });
    return;
  }
  res.json({ success: true, data: department });
}));

export default router;
