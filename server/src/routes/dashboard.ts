import { Router } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getAgentCount, getActiveAgentCount } from '../services/agentService.js';
import { getPendingCount, getRedLineCount } from '../services/approvalService.js';
import { getRiskCounts } from '../services/riskService.js';
import type { DashboardKPIs } from '../types/index.js';

const router = Router();

// GET /api/dashboard/kpis - Aggregated KPIs
router.get('/kpis', authMiddleware, asyncHandler(async (_req, res) => {
  const agentCount = getAgentCount();
  const activeAgentCount = getActiveAgentCount();
  const pendingApprovals = getPendingCount();
  const _redLineCount = getRedLineCount();
  
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  
  const riskCounts = getRiskCounts();
  
  const activeWorkflows = db.prepare("SELECT COUNT(*) as count FROM workflows WHERE status = 'active'").get() as { count: number };
  const workflowInstances = db.prepare("SELECT COUNT(*) as count FROM workflow_instances WHERE status IN ('pending', 'running', 'blocked')").get() as { count: number };
  
  const expertCount = db.prepare("SELECT COUNT(*) as count FROM human_experts WHERE status = 'active'").get() as { count: number };
  
  const budgets = db.prepare('SELECT SUM(limit_amount) as total, SUM(spent) as spent, SUM(remaining) as remaining FROM budgets').get() as {
    total: number; spent: number; remaining: number;
  };
  
  const liquiditySetting = db.prepare("SELECT value FROM system_settings WHERE key = 'liquidity_eur'").get() as { value: string } | undefined;
  const liquidity = liquiditySetting ? parseInt(liquiditySetting.value, 10) : 12450;
  
  const killSwitchSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'kill_switch_status'").get() as { value: string } | undefined;
  const killSwitchStatus = killSwitchSetting?.value || 'armed';
  
  const automationSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'automation_rate'").get() as { value: string } | undefined;
  const automationRate = automationSetting ? parseInt(automationSetting.value, 10) : 73;
  
  const openIncidents = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status IN ('open', 'contained')").get() as { count: number };

  const kpis: DashboardKPIs = {
    agentCount,
    activeAgentCount,
    departmentCount: deptCount.count,
    pendingApprovals,
    totalRisks: riskCounts.total,
    highRisks: riskCounts.high,
    activeWorkflows: activeWorkflows.count,
    workflowInstances: workflowInstances.count,
    expertCount: expertCount.count,
    totalBudget: budgets.total || 0,
    totalSpent: budgets.spent || 0,
    totalRemaining: budgets.remaining || 0,
    liquidity,
    killSwitchStatus,
    automationRate,
    incidentsOpen: openIncidents.count,
  };

  res.json({ success: true, data: kpis });
}));

// GET /api/dashboard/activity - Recent activity summary
router.get('/activity', authMiddleware, asyncHandler(async (_req, res) => {
  const recentAudit = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10').all();
  const recentApprovals = db.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5").all();
  const openIncidents = db.prepare("SELECT * FROM incidents WHERE status IN ('open', 'contained') ORDER BY detected_at DESC").all();

  res.json({
    success: true,
    data: {
      recentAudit,
      pendingApprovals: recentApprovals,
      openIncidents,
    },
  });
}));

export default router;
