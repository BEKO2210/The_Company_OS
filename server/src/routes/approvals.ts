import { Router } from 'express';
import { getAllApprovals, getApprovalById, approveApproval, rejectApproval } from '../services/approvalService.js';
import { approvalFilterSchema, approvalActionSchema } from '../utils/validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireWriteAccess } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createEntry } from '../services/auditService.js';

const router = Router();

// GET /api/approvals - List with filters and pagination
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = approvalFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { type, status, riskLevel, page, limit } = parsed.data;
  const approvals = getAllApprovals({ type, status, riskLevel });

  const total = approvals.length;
  const startIndex = ((page || 1) - 1) * (limit || 50);
  const paginated = approvals.slice(startIndex, startIndex + (limit || 50));

  res.json({
    success: true,
    data: paginated,
    pagination: {
      page: page || 1,
      limit: limit || 50,
      total,
      totalPages: Math.ceil(total / (limit || 50)),
    },
  });
}));

// GET /api/approvals/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const approval = getApprovalById(req.params.id as string);
  if (!approval) {
    res.status(404).json({ success: false, error: 'Approval not found' });
    return;
  }
  res.json({ success: true, data: approval });
}));

// POST /api/approvals/:id/approve
router.post('/:id/approve', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const result = approveApproval(req.params.id as string, req.user!.userId, req.user!.role, req.user!.email);
  
  if (!result.success) {
    // Check if it's a permission error
    if (result.error?.includes('Red line') || result.error?.includes('founder')) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  // Log to audit log
  createEntry({
    agent: req.user!.email,
    action: `Approval ${req.params.id} approved`,
    input: JSON.stringify({ approvalId: req.params.id }),
    output: 'approved',
    risk_score: 20,
    approved_by: req.user!.email,
  });

  res.json({ success: true, data: result.approval });
}));

// POST /api/approvals/:id/reject
router.post('/:id/reject', authMiddleware, requireWriteAccess, asyncHandler(async (req, res) => {
  const parsed = approvalActionSchema.safeParse(req.body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const result = rejectApproval(req.params.id as string, req.user!.userId, req.user!.role, req.user!.email, reason);
  
  if (!result.success) {
    if (result.error?.includes('Red line') || result.error?.includes('founder')) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  createEntry({
    agent: req.user!.email,
    action: `Approval ${req.params.id} rejected`,
    input: JSON.stringify({ approvalId: req.params.id, reason }),
    output: 'rejected',
    risk_score: 20,
    approved_by: req.user!.email,
  });

  res.json({ success: true, data: result.approval });
}));

export default router;
