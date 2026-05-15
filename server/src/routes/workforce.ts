import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { expertFilterSchema } from '../utils/validators.js';
import type { HumanExpert } from '../types/index.js';

const router = Router();

// GET /api/workforce - Human Experts with filters
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = expertFilterSchema.safeParse(req.query);
  let sql = 'SELECT * FROM human_experts WHERE 1=1';
  const params: (string | number)[] = [];

  if (parsed.success) {
    if (parsed.data.type) {
      sql += ' AND type = ?';
      params.push(parsed.data.type);
    }
    if (parsed.data.availability) {
      sql += ' AND availability = ?';
      params.push(parsed.data.availability);
    }
    if (parsed.data.status) {
      sql += ' AND status = ?';
      params.push(parsed.data.status);
    }
  }

  sql += ' ORDER BY name';
  const experts = db.prepare(sql).all(...params) as HumanExpert[];

  // Summary stats
  const totalCount = experts.length;
  const availableCount = experts.filter(e => e.availability === 'available').length;
  const avgRating = totalCount > 0 ? experts.reduce((sum, e) => sum + e.rating, 0) / totalCount : 0;
  const totalProjects = experts.reduce((sum, e) => sum + e.total_projects, 0);

  res.json({
    success: true,
    data: experts,
    summary: {
      totalCount,
      availableCount,
      avgRating: Math.round(avgRating * 10) / 10,
      totalProjects,
    },
  });
}));

// GET /api/workforce/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const expert = db.prepare('SELECT * FROM human_experts WHERE id = ?').get(req.params.id) as HumanExpert | undefined;
  if (!expert) {
    res.status(404).json({ success: false, error: 'Expert not found' });
    return;
  }
  res.json({ success: true, data: expert });
}));

export default router;
