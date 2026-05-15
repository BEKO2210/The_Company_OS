import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { ProductStudio } from '../types/index.js';

const router = Router();

// GET /api/product-studios - All studios
router.get('/', authMiddleware, asyncHandler(async (_req, res) => {
  const studios = db.prepare('SELECT * FROM product_studios ORDER BY name').all() as ProductStudio[];
  res.json({ success: true, data: studios });
}));

// GET /api/product-studios/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const studio = db.prepare('SELECT * FROM product_studios WHERE id = ?').get(req.params.id) as ProductStudio | undefined;
  if (!studio) {
    res.status(404).json({ success: false, error: 'Product studio not found' });
    return;
  }
  res.json({ success: true, data: studio });
}));

export default router;
