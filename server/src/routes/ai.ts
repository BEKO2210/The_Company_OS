// ═══════════════════════════════════════════════════════════════
// AI Routes - The Company OS
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireWriteAccess } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { querySchema } from '../utils/validators.js';
import {
  processQuery,
  getQueryHistory,
  clearHistory,
  analyzeApproval,
  getPrioritizedApprovals,
  generateDailyReport,
  generateWeeklySummary,
  summarizeAuditLog,
  predictLiquidity,
  predictBreakEven,
  predictRiskEscalation,
  predictAgentOverload,
  getRecommendations,
} from '../ai/index.js';

import {
  approvals,
  agents,
  risks,
  financeEntries,
  auditLog,
  liquidityTrend,
  departments,
  businessUnits,
  productStudios,
  workflows,
  humanExperts,
  incidents,
} from '../data/mockData.js';

const router = Router();

// Apply auth middleware to ALL AI routes
router.use(authMiddleware);

// ─── Helper for mock data context ───
function getCompanyData() {
  return {
    agents,
    departments,
    businessUnits,
    productStudios,
    approvals,
    auditLog,
    risks,
    workflows,
    humanExperts,
    financeEntries,
    incidents,
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/ai/query - Natural Language Query
// ═══════════════════════════════════════════════════════════════

router.post('/query', asyncHandler(async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors[0].message,
    });
    return;
  }

  const result = processQuery(parsed.data.query);

  res.json({
    success: true,
    data: result,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/query/history - Query History
// ═══════════════════════════════════════════════════════════════

router.get('/query/history', asyncHandler(async (_req: Request, res: Response) => {
  const history = getQueryHistory();
  res.json({
    success: true,
    data: history,
  });
}));

// ═══════════════════════════════════════════════════════════════
// DELETE /api/ai/query/history - Clear History (write access required)
// ═══════════════════════════════════════════════════════════════

router.delete('/query/history', requireWriteAccess, asyncHandler(async (_req: Request, res: Response) => {
  clearHistory();
  res.json({
    success: true,
    message: 'History cleared',
  });
}));

// ═══════════════════════════════════════════════════════════════
// POST /api/ai/approval/:id/analyze - Analyze Approval
// ═══════════════════════════════════════════════════════════════

router.post('/approval/:id/analyze', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const allApprovals = approvals;
  const allAgents = agents;
  const allRisks = risks;

  const approval = allApprovals.find((a) => a.id === id);

  if (!approval) {
    res.status(404).json({
      success: false,
      error: `Approval with id '${id}' not found`,
    });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decision = analyzeApproval(approval as any, allApprovals as any, allAgents as any, allRisks as any);

  res.json({
    success: true,
    data: decision,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/approvals/prioritized - Get Prioritized Approvals
// ═══════════════════════════════════════════════════════════════

router.get('/approvals/prioritized', asyncHandler(async (_req: Request, res: Response) => {
  const allApprovals = approvals;
  const prioritized = getPrioritizedApprovals(allApprovals);

  res.json({
    success: true,
    data: prioritized,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/summary/daily - Daily Report
// ═══════════════════════════════════════════════════════════════

router.get('/summary/daily', asyncHandler(async (_req: Request, res: Response) => {
  const data = getCompanyData();
  const report = generateDailyReport(data);

  res.json({
    success: true,
    data: report,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/summary/weekly - Weekly Report
// ═══════════════════════════════════════════════════════════════

router.get('/summary/weekly', asyncHandler(async (_req: Request, res: Response) => {
  const data = getCompanyData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = generateWeeklySummary({
    studios: data.productStudios as any,
    agents: data.agents as any,
    risks: data.risks as any,
    workflows: data.workflows as any,
    departments: data.departments as any,
    financeEntries: data.financeEntries as any,
  });

  res.json({
    success: true,
    data: report,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/summary/audit - Audit Log Summary
// ═══════════════════════════════════════════════════════════════

router.get('/summary/audit', asyncHandler(async (_req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary = summarizeAuditLog(auditLog as any);

  res.json({
    success: true,
    data: { summary },
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/predict/liquidity - Liquidity Prediction
// ═══════════════════════════════════════════════════════════════

router.get('/predict/liquidity', asyncHandler(async (req: Request, res: Response) => {
  const months = req.query.months ? parseInt(req.query.months as string) : 3;
  if (isNaN(months) || months < 1 || months > 24) {
    res.status(400).json({
      success: false,
      error: 'months must be between 1 and 24',
    });
    return;
  }
  const prediction = predictLiquidity(liquidityTrend, months);

  res.json({
    success: true,
    data: prediction,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/predict/break-even - Break-Even Prediction
// ═══════════════════════════════════════════════════════════════

router.get('/predict/break-even', asyncHandler(async (_req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prediction = predictBreakEven(financeEntries as any);

  res.json({
    success: true,
    data: prediction,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/predict/risks - Risk Escalation Prediction
// ═══════════════════════════════════════════════════════════════

router.get('/predict/risks', asyncHandler(async (_req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prediction = predictRiskEscalation(risks as any);

  res.json({
    success: true,
    data: prediction,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/predict/overload - Agent Overload Prediction
// ═══════════════════════════════════════════════════════════════

router.get('/predict/overload', asyncHandler(async (_req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prediction = predictAgentOverload(agents as any);

  res.json({
    success: true,
    data: prediction,
  });
}));

// ═══════════════════════════════════════════════════════════════
// GET /api/ai/recommendations - Smart Recommendations
// ═══════════════════════════════════════════════════════════════

router.get('/recommendations', asyncHandler(async (_req: Request, res: Response) => {
  const data = getCompanyData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendations = getRecommendations({
    agents: data.agents as any,
    approvals: data.approvals as any,
    financeEntries: data.financeEntries as any,
    productStudios: data.productStudios as any,
    risks: data.risks as any,
    workflows: data.workflows as any,
  });

  res.json({
    success: true,
    data: recommendations,
  });
}));

export default router;
