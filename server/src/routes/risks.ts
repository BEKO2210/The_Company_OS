import { Router } from 'express';
import { getAllRisks, getRiskById, getRiskMatrix, getHighRisks, getRiskCounts } from '../services/riskService.js';
import { riskFilterSchema } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/risks - All risks, sorted by score
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = riskFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { category, status, minScore } = parsed.data;
  const risks = getAllRisks({ category, status, minScore });

  res.json({
    success: true,
    data: risks,
    pagination: {
      total: risks.length,
      page: 1,
      limit: risks.length,
    },
  });
}));

// GET /api/risks/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const risk = getRiskById(Number(req.params.id as string));
  if (!risk) {
    res.status(404).json({ success: false, error: 'Risk not found' });
    return;
  }
  res.json({ success: true, data: risk });
}));

// GET /api/risks/matrix/overview
router.get('/matrix/overview', authMiddleware, asyncHandler(async (_req, res) => {
  const matrix = getRiskMatrix();
  const counts = getRiskCounts();
  res.json({
    success: true,
    data: { matrix, counts },
  });
}));

// GET /api/risks/high/risks
router.get('/high/risks', authMiddleware, asyncHandler(async (_req, res) => {
  const risks = getHighRisks(10);
  res.json({ success: true, data: risks });
}));

export default router;
