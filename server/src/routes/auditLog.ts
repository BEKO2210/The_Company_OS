import { Router } from 'express';
import { getEntries, verifyChain } from '../services/auditService.js';
import { auditFilterSchema } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/audit-log - Append-only audit log with filters
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = auditFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { agent, action, project, minRisk, page, limit } = parsed.data;
  const result = getEntries({ agent, action, project, minRisk, page, limit });

  res.json({
    success: true,
    data: result.entries,
    pagination: {
      page: page || 1,
      limit: limit || 50,
      total: result.total,
      totalPages: Math.ceil(result.total / (limit || 50)),
    },
  });
}));

// GET /api/audit-log/verify - Verify hash chain integrity
router.get('/verify', authMiddleware, asyncHandler(async (_req, res) => {
  const isValid = verifyChain();
  res.json({
    success: true,
    data: { chainValid: isValid },
  });
}));

export default router;
