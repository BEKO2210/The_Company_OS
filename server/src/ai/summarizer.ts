// ═══════════════════════════════════════════════════════════════
// Summarizer Engine - The Company OS
// Auto-generates daily/weekly reports and audit log summaries
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  Approval,
  AuditLogEntry,
  Department,
  FinanceEntry,
  Incident,
  ProductStudio,
  Risk,
  Workflow,
  DailyReport,
  WeeklySummary,
  ReportEvent,
  AgentStatusChange,
  FinanceUpdate,
  AgentPerformance,
  RiskDevelopment,
  UpcomingDeadline,
} from './types';

import {
  agents,
  approvals,
  departments,
  financeEntries,
  incidents,
  productStudios,
  risks,
  workflows,
} from '../data/mockData';

// ═══════════════════════════════════════════════════════════════
// Daily Report Generator
// ═══════════════════════════════════════════════════════════════

export function generateDailyReport(
  data?: {
    agents?: Agent[];
    approvals?: Approval[];
    risks?: Risk[];
    financeEntries?: FinanceEntry[];
    incidents?: Incident[];
    departments?: Department[];
    productStudios?: ProductStudio[];
    workflows?: Workflow[];
  }
): DailyReport {
  const {
    agents: allAgents = agents,
    approvals: allApprovals = approvals,
    risks: allRisks = risks,
    financeEntries: allFinance = financeEntries,
    incidents: allIncidents = incidents,
    departments: allDepartments = departments,
    productStudios: allStudios = productStudios,
    workflows: allWorkflows = workflows,
  } = data || {};

  const now = new Date();
  const date = now.toISOString().split('T')[0];

  // ── Events ──
  const events: ReportEvent[] = [];

  // Critical risks
  const criticalRisks = allRisks.filter(
    (r) => r.score >= 15 && r.status === 'active'
  );
  if (criticalRisks.length > 0) {
    events.push({
      type: 'critical',
      title: `${criticalRisks.length} kritische Risiken aktiv`,
      description: criticalRisks.map((r) => r.name).join(', '),
      entity: 'risk',
    });
  }

  // Escalated risks (score >= 12)
  const escalatedRisks = allRisks.filter(
    (r) => r.score >= 12 && r.status === 'active' && r.score < 15
  );
  if (escalatedRisks.length > 0) {
    events.push({
      type: 'warning',
      title: `${escalatedRisks.length} Risiken erfordern Aufmerksamkeit`,
      description: escalatedRisks.map((r) => r.name).join(', '),
      entity: 'risk',
    });
  }

  // Open incidents
  const openIncidents = allIncidents.filter((i) => i.status === 'open');
  if (openIncidents.length > 0) {
    openIncidents.forEach((inc) => {
      events.push({
        type: inc.severity <= 2 ? 'critical' : 'warning',
        title: inc.title,
        description: inc.description,
        entity: 'incident',
      });
    });
  }

  // Department KPI trends
  allDepartments.forEach((dept) => {
    const criticalKpis = dept.kpiSummary.filter(
      (k) => k.trend === 'down' && parseFloat(k.value) > 0
    );
    if (criticalKpis.length > 0) {
      events.push({
        type: 'info',
        title: `${dept.name}: KPI-Rückgang`,
        description: criticalKpis.map((k) => `${k.metric}: ${k.value}`).join(', '),
        entity: 'department',
      });
    }
  });

  // Studio completion milestones
  allStudios.forEach((studio) => {
    if (studio.completion >= 90 && studio.completion < 100) {
      events.push({
        type: 'success',
        title: `${studio.name} fast abgeschlossen (${studio.completion}%)`,
        description: `QA: ${studio.qaStatus}, Deployment: ${studio.deploymentStatus}`,
        entity: 'studio',
      });
    }
  });

  // Workflow blocks
  const blockedWorkflows = allWorkflows.filter((w) =>
    w.steps.some((s) => s.status === 'blocked')
  );
  if (blockedWorkflows.length > 0) {
    events.push({
      type: 'warning',
      title: `${blockedWorkflows.length} Workflows blockiert`,
      description: blockedWorkflows.map((w) => w.name).join(', '),
      entity: 'workflow',
    });
  }

  // ── Agent Status Changes ──
  const quarantineAgents = allAgents.filter(
    (a) => a.status === 'quarantine'
  );
  const pausedAgents = allAgents.filter((a) => a.status === 'paused');
  const agentStatusChanges: AgentStatusChange[] = [
    ...quarantineAgents.map((a) => ({
      agent: a.name,
      from: 'active',
      to: 'quarantine',
    })),
    ...pausedAgents.map((a) => ({
      agent: a.name,
      from: 'active',
      to: 'paused',
    })),
  ];

  // ── Finance Update ──
  const totalBudget = allFinance.reduce((s, f) => s + f.budget, 0);
  const totalSpent = allFinance.reduce((s, f) => s + f.spent, 0);
  const totalProjected = allFinance.reduce((s, f) => s + f.projected, 0);
  const liquidity = totalSpent > 0 ? totalBudget - totalSpent : totalBudget * 0.45;
  const burnRate = totalSpent / 30; // Daily burn rate
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const financeUpdate: FinanceUpdate = {
    liquidity: Math.round(liquidity),
    burnRate: Math.round(burnRate),
    budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    trend: totalProjected > totalBudget ? 'down' : 'up',
  };

  // ── Overdue Items ──
  const overdueApprovals = allApprovals.filter(
    (a) => {
      const createdAt = new Date(a.createdAt).getTime();
      const age = now.getTime() - createdAt;
      return a.status === 'pending' && age > 48 * 60 * 60 * 1000; // > 48h
    }
  );

  const overdueItems: string[] = [
    ...overdueApprovals.map((a) => `Freigabe: ${a.title}`),
    ...allStudios
      .filter((s) => {
        const targetDate = new Date(s.targetDate).getTime();
        return targetDate < now.getTime() && s.completion < 100;
      })
      .map((s) => `Studio: ${s.name} überfällig`),
  ];

  // ── Headline ──
  const pendingCount = allApprovals.filter((a) => a.status === 'pending').length;
  const headline =
    criticalRisks.length > 0
      ? `${criticalRisks.length} kritische Risiken - Handlung erforderlich`
      : openIncidents.length > 0
        ? `${openIncidents.length} offene Vorfälle - Aufmerksamkeit nötig`
        : overdueApprovals.length > 0
          ? `${overdueApprovals.length} überfällige Freigaben`
          : `Tagesbericht - ${pendingCount} offene Freigaben`;

  return {
    date,
    headline,
    events,
    openApprovals: pendingCount,
    newRisks: allRisks.filter((r) => r.status === 'active').length,
    agentStatusChanges,
    financeUpdate,
    pendingTasks: allWorkflows.reduce(
      (s, w) => s + w.steps.filter((step) => step.status === 'pending').length,
      0
    ),
    overdueItems,
  };
}

// ═══════════════════════════════════════════════════════════════
// Weekly Summary Generator
// ═══════════════════════════════════════════════════════════════

export function generateWeeklySummary(
  data?: {
    studios?: ProductStudio[];
    agents?: Agent[];
    risks?: Risk[];
    workflows?: Workflow[];
    departments?: Department[];
    financeEntries?: FinanceEntry[];
  }
): WeeklySummary {
  const {
    studios: allStudios = productStudios,
    agents: allAgents = agents,
    risks: allRisks = risks,
    workflows: allWorkflows = workflows,
    departments: _allDepartments = departments,
    financeEntries: allFinance = financeEntries,
  } = data || {};

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const period = `${weekStart.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]}`;

  // ── Completed Projects ──
  const completedProjects = allStudios.filter(
    (s) => s.completion >= 95
  ).length;

  // ── Budget Utilization ──
  const totalBudget = allFinance.reduce((s, f) => s + f.budget, 0);
  const totalSpent = allFinance.reduce((s, f) => s + f.spent, 0);
  const budgetUtilization =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 10) / 10 : 0;

  // ── Agent Performance ──
  const agentPerformance: AgentPerformance[] = allAgents
    .filter((a) => a.status === 'active')
    .map((agent) => {
      const tasksCompleted =
        agent.kpis?.reduce((sum, kpi) => {
          const val = parseInt(kpi.value) || 0;
          return sum + val;
        }, 0) || 0;

      const kpiEfficiency =
        agent.kpis?.map((kpi) => {
          const val = parseFloat(kpi.value) || 0;
          const target = parseFloat(kpi.target) || 1;
          return Math.min(100, Math.round((val / target) * 100));
        }) || [];

      const efficiency =
        kpiEfficiency.length > 0
          ? Math.round(
              kpiEfficiency.reduce((s, v) => s + v, 0) / kpiEfficiency.length
            )
          : 0;

      return {
        agent: agent.name,
        tasksCompleted: Math.round(tasksCompleted / 10),
        efficiency,
        trend: (efficiency >= 90 ? 'up' : efficiency >= 70 ? 'stable' : 'down') as AgentPerformance['trend'],
      };
    })
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 10);

  // ── Risk Development ──
  const activeRisks = allRisks.filter((r) => r.status === 'active');
  const _monitoringRisks = allRisks.filter((r) => r.status === 'monitoring');
  const mitigatedRisks = allRisks.filter((r) => r.status === 'mitigated');
  const riskDevelopment: RiskDevelopment = {
    newRisks: activeRisks.filter((r) => r.score >= 12).length,
    mitigatedRisks: mitigatedRisks.length,
    escalatedRisks: activeRisks.filter((r) => r.score >= 14).length,
    totalRisks: allRisks.length,
  };

  // ── Upcoming Deadlines ──
  const upcomingDeadlines: UpcomingDeadline[] = [
    ...allStudios
      .filter((s) => s.completion < 100)
      .map((s) => {
        const targetDate = new Date(s.targetDate);
        const daysLeft = Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const priority: UpcomingDeadline['priority'] =
          daysLeft < 0
            ? 'critical'
            : daysLeft <= 7
              ? 'high'
              : daysLeft <= 14
                ? 'medium'
                : 'low';
        return {
          title: `${s.name} Fertigstellung`,
          date: s.targetDate,
          daysLeft,
          priority,
        };
      }),
    ...allWorkflows
      .filter((w) => w.steps.some((s) => s.status === 'in-progress'))
      .map((w) => {
        const progress =
          w.steps.filter((s) => s.status === 'completed').length /
          w.steps.length;
        const estimatedDays = Math.ceil(
          (w.avgDuration ? parseInt(w.avgDuration) : 24) * (1 - progress)
        );
        return {
          title: `Workflow: ${w.name}`,
          date: new Date(
            now.getTime() + estimatedDays * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split('T')[0],
          daysLeft: estimatedDays,
          priority: (w.riskScore >= 50 ? 'high' : 'medium') as UpcomingDeadline['priority'],
        };
      }),
  ]
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  // ── Headline ──
  const headline =
    riskDevelopment.escalatedRisks > 0
      ? `${riskDevelopment.escalatedRisks} Risiken eskaliert - Wochenübersicht`
      : completedProjects > 0
        ? `${completedProjects} Projekte abgeschlossen diese Woche`
        : budgetUtilization > 80
          ? `Budget-Auslastung ${budgetUtilization}% - Aufmerksamkeit nötig`
          : `Wochenübersicht - ${allAgents.filter((a) => a.status === 'active').length} Agenten aktiv`;

  return {
    period,
    headline,
    completedProjects,
    newCustomers: allStudios.filter((s) => s.customer === 'External').length,
    budgetUtilization,
    agentPerformance,
    riskDevelopment,
    upcomingDeadlines,
  };
}

// ═══════════════════════════════════════════════════════════════
// Audit Log Summarizer
// ═══════════════════════════════════════════════════════════════

export function summarizeAuditLog(entries: AuditLogEntry[]): string {
  if (entries.length === 0) {
    return 'Keine Audit-Log-Einträge vorhanden.';
  }

  const totalEntries = entries.length;

  // Group by action type
  const byAction = groupByAction(entries);

  // Group by agent
  const byAgent = groupByAgent(entries);

  // High risk entries
  const highRisk = entries.filter((e) => e.riskScore >= 50);

  // Recent entries (last hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentEntries = entries.filter(
    (e) => new Date(e.timestamp).getTime() > oneHourAgo
  );

  // Build summary
  const lines: string[] = [];

  lines.push(`## Audit-Log Zusammenfassung (${totalEntries} Einträge)`);
  lines.push('');

  // Overview
  lines.push('### Übersicht');
  lines.push(`- Gesamteinträge: ${totalEntries}`);
  lines.push(`- Hohe Risiko-Einträge (≥50): ${highRisk.length}`);
  lines.push(`- Einträge der letzten Stunde: ${recentEntries.length}`);
  lines.push('');

  // By action type
  lines.push('### Nach Aktions-Typ');
  const sortedActions = Object.entries(byAction).sort(
    (a, b) => b[1].length - a[1].length
  );
  for (const [action, actionEntries] of sortedActions.slice(0, 8)) {
    const avgRisk =
      actionEntries.reduce((s, e) => s + e.riskScore, 0) / actionEntries.length;
    const riskLabel = avgRisk >= 50 ? '⚠️' : avgRisk >= 25 ? '⚡' : '✅';
    lines.push(
      `- **${action}**: ${actionEntries.length}x (Ø-Risiko: ${Math.round(avgRisk)}) ${riskLabel}`
    );
  }
  lines.push('');

  // By agent
  lines.push('### Nach Agent');
  const sortedAgents = Object.entries(byAgent).sort(
    (a, b) => b[1].length - a[1].length
  );
  for (const [agentName, agentEntries] of sortedAgents.slice(0, 8)) {
    const maxRisk = Math.max(...agentEntries.map((e) => e.riskScore));
    lines.push(
      `- **${agentName}**: ${agentEntries.length} Aktionen (Max-Risiko: ${maxRisk})`
    );
  }
  lines.push('');

  // High risk alerts
  if (highRisk.length > 0) {
    lines.push('### ⚠️ Hohe Risiko-Einträge');
    for (const entry of highRisk.slice(0, 5)) {
      lines.push(
        `- **${entry.agent}** | ${entry.action} (Risiko: ${entry.riskScore}) - ${entry.tool || 'Kein Tool'}`
      );
    }
    lines.push('');
  }

  // Recent activity
  if (recentEntries.length > 0) {
    lines.push('### Letzte Aktivitäten');
    for (const entry of recentEntries.slice(0, 5)) {
      const time = new Date(entry.timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(`- ${time} | **${entry.agent}**: ${entry.action}`);
    }
  }

  return lines.join('\n');
}

function groupByAction(
  entries: AuditLogEntry[]
): Record<string, AuditLogEntry[]> {
  const groups: Record<string, AuditLogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.action]) {
      groups[entry.action] = [];
    }
    groups[entry.action].push(entry);
  }
  return groups;
}

function groupByAgent(
  entries: AuditLogEntry[]
): Record<string, AuditLogEntry[]> {
  const groups: Record<string, AuditLogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.agent]) {
      groups[entry.agent] = [];
    }
    groups[entry.agent].push(entry);
  }
  return groups;
}
