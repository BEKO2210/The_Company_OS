// ═══════════════════════════════════════════════════════════════
// Smart Recommendations Engine - The Company OS
// Generates prioritized actionable recommendations
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  Approval,
  FinanceEntry,
  ProductStudio,
  Risk,
  Workflow,
  SmartRecommendation,
} from './types';

import {
  agents,
  approvals,
  financeEntries,
  productStudios,
  risks,
  workflows,
} from '../data/mockData';

/**
 * Generate prioritized recommendations from company data
 */
export function getRecommendations(data?: {
  agents?: Agent[];
  approvals?: Approval[];
  financeEntries?: FinanceEntry[];
  productStudios?: ProductStudio[];
  risks?: Risk[];
  workflows?: Workflow[];
}): SmartRecommendation[] {
  const {
    agents: allAgents = agents,
    approvals: allApprovals = approvals,
    financeEntries: allFinance = financeEntries,
    productStudios: allStudios = productStudios,
    risks: allRisks = risks,
    workflows: allWorkflows = workflows,
  } = data || {};

  const recommendations: SmartRecommendation[] = [];

  // ── 1. Approval Recommendations ──
  const overdueApprovals = allApprovals.filter((a) => {
    if (a.status !== 'pending') return false;
    const createdAt = new Date(a.createdAt).getTime();
    const age = Date.now() - createdAt;
    return age > 48 * 60 * 60 * 1000; // > 48 hours
  });

  for (const approval of overdueApprovals) {
    const age = Math.ceil(
      (Date.now() - new Date(approval.createdAt).getTime()) /
        (1000 * 60 * 60)
    );
    recommendations.push({
      id: `rec-approval-${approval.id}`,
      type: 'approval',
      priority: age > 72 ? 'critical' : 'high',
      title: `Freigabe überfällig: ${approval.title}`,
      description: `Seit ${age}h ausstehend - Erfordert ${approval.riskLevel === 'critical' ? 'sofortige' : 'baldige'} Entscheidung`,
      actionLabel: 'Freigabe prüfen',
      actionPath: '/approvals',
      entityId: approval.id,
      createdAt: approval.createdAt,
    });
  }

  // Critical pending approvals (< 24h)
  const criticalApprovals = allApprovals.filter(
    (a) => a.status === 'pending' && a.riskLevel === 'critical'
  );
  for (const approval of criticalApprovals) {
    if (!recommendations.find((r) => r.entityId === approval.id)) {
      recommendations.push({
        id: `rec-critical-${approval.id}`,
        type: 'approval',
        priority: 'critical',
        title: `Kritische Freigabe: ${approval.title}`,
        description: `Kritisches Risiko - Sofortige Prüfung erforderlich`,
        actionLabel: 'Jetzt prüfen',
        actionPath: '/approvals',
        entityId: approval.id,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── 2. Agent Anomaly Recommendations ──
  const quarantineAgents = allAgents.filter(
    (a) => a.status === 'quarantine'
  );
  for (const agent of quarantineAgents) {
    recommendations.push({
      id: `rec-agent-${agent.id}`,
      type: 'agent',
      priority: 'critical',
      title: `Agent in Quarantäne: ${agent.name}`,
      description: `${agent.name} ist isoliert - Prüfung der Aktionen erforderlich`,
      actionLabel: 'Agent prüfen',
      actionPath: '/agents',
      entityId: agent.id,
      createdAt: new Date().toISOString(),
    });
  }

  // Paused agents
  const pausedAgents = allAgents.filter((a) => a.status === 'paused');
  for (const agent of pausedAgents) {
    recommendations.push({
      id: `rec-paused-${agent.id}`,
      type: 'agent',
      priority: 'medium',
      title: `Agent pausiert: ${agent.name}`,
      description: `${agent.name} ist pausiert - Wiederaktivierung prüfen?`,
      actionLabel: 'Status prüfen',
      actionPath: '/agents',
      entityId: agent.id,
      createdAt: new Date().toISOString(),
    });
  }

  // ── 3. Budget Recommendations ──
  for (const finance of allFinance) {
    const utilization = finance.budget > 0 ? finance.spent / finance.budget : 0;

    if (utilization >= 0.95) {
      recommendations.push({
        id: `rec-budget-${finance.id}`,
        type: 'budget',
        priority: 'critical',
        title: `Budget fast erschöpft: ${finance.category}`,
        description: `${(utilization * 100).toFixed(0)}% von ${finance.category} aufgebraucht (EUR ${finance.spent.toLocaleString()} / EUR ${finance.budget.toLocaleString()})`,
        actionLabel: 'Budget prüfen',
        actionPath: '/finance',
        entityId: finance.id,
        createdAt: new Date().toISOString(),
      });
    } else if (utilization >= 0.8) {
      recommendations.push({
        id: `rec-budget-${finance.id}`,
        type: 'budget',
        priority: 'high',
        title: `Budget kritisch: ${finance.category}`,
        description: `${(utilization * 100).toFixed(0)}% von ${finance.category} genutzt`,
        actionLabel: 'Budget prüfen',
        actionPath: '/finance',
        entityId: finance.id,
        createdAt: new Date().toISOString(),
      });
    } else if (utilization >= 0.7) {
      recommendations.push({
        id: `rec-budget-${finance.id}`,
        type: 'budget',
        priority: 'medium',
        title: `Budget-Warnung: ${finance.category}`,
        description: `${(utilization * 100).toFixed(0)}% von ${finance.category} verwendet`,
        actionLabel: 'Details ansehen',
        actionPath: '/finance',
        entityId: finance.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Negative variance
    if (finance.variance < -1000) {
      recommendations.push({
        id: `rec-variance-${finance.id}`,
        type: 'budget',
        priority: 'high',
        title: `Budget-Überschreitung: ${finance.category}`,
        description: `Neg. Abweichung: EUR ${Math.abs(finance.variance).toLocaleString()}`,
        actionLabel: 'Analyse',
        actionPath: '/finance',
        entityId: finance.id,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── 4. Workflow Block Recommendations ──
  for (const workflow of allWorkflows) {
    const blockedSteps = workflow.steps.filter(
      (s) => s.status === 'blocked'
    );
    if (blockedSteps.length > 0) {
      for (const step of blockedSteps) {
        recommendations.push({
          id: `rec-wf-${workflow.id}-${step.id}`,
          type: 'workflow',
          priority: step.blockingGate ? 'critical' : 'high',
          title: `Workflow blockiert: ${workflow.name}`,
          description: `Schritt "${step.name}" (${step.agent}) ist blockiert`,
          actionLabel: 'Workflow öffnen',
          actionPath: '/workflows',
          entityId: workflow.id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Long-running in-progress steps (> 2h for blocking gates)
    const stuckSteps = workflow.steps.filter(
      (s) => s.status === 'in-progress' && s.blockingGate
    );
    if (stuckSteps.length > 0) {
      for (const step of stuckSteps) {
        if (
          !recommendations.find(
            (r) => r.entityId === workflow.id && r.type === 'workflow'
          )
        ) {
          recommendations.push({
            id: `rec-wf-stuck-${workflow.id}-${step.id}`,
            type: 'workflow',
            priority: 'medium',
            title: `Workflow läuft: ${workflow.name}`,
            description: `Blockierender Schritt "${step.name}" läuft noch`,
            actionLabel: 'Status prüfen',
            actionPath: '/workflows',
            entityId: workflow.id,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // ── 5. Risk Recommendations ──
  const highRisks = allRisks.filter(
    (r) => (r.status === 'active' || r.status === 'monitoring') && r.score >= 12
  );
  for (const risk of highRisks) {
    recommendations.push({
      id: `rec-risk-${risk.id}`,
      type: 'risk',
      priority: risk.score >= 15 ? 'critical' : 'high',
      title: `Risiko beobachten: ${risk.name}`,
      description: `Score: ${risk.score} (P:${risk.probability}, S:${risk.severity}) - ${risk.owner}`,
      actionLabel: 'Risiko anzeigen',
      actionPath: '/risks',
      entityId: String(risk.id),
      createdAt: new Date().toISOString(),
    });
  }

  // ── 6. Studio Budget Recommendations ──
  for (const studio of allStudios) {
    const budgetUtilization =
      studio.budget.total > 0
        ? studio.budget.spent / studio.budget.total
        : 0;
    if (budgetUtilization >= 0.9 && studio.completion < 100) {
      recommendations.push({
        id: `rec-studio-${studio.id}`,
        type: 'budget',
        priority: budgetUtilization >= 0.95 ? 'critical' : 'high',
        title: `Studio-Budget kritisch: ${studio.name}`,
        description: `${(budgetUtilization * 100).toFixed(0)}% verbraucht, ${studio.completion}% fertig`,
        actionLabel: 'Studio prüfen',
        actionPath: '/studios',
        entityId: studio.id,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Get top N recommendations
 */
export function getTopRecommendations(
  count: number = 5,
  data?: Parameters<typeof getRecommendations>[0]
): SmartRecommendation[] {
  return getRecommendations(data).slice(0, count);
}
