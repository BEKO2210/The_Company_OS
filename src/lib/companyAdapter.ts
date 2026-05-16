// Adapters that convert the slim CompanyConfig (filled by the setup wizard)
// into the richer data shapes that the existing pages already consume.
// Defaults are deliberately conservative so empty/partial configs still render.

import type { CompanyConfig } from './storage';
import type {
  Agent, Department, BusinessUnit,
} from '@/data/models';

export function deriveAgents(config: CompanyConfig): Agent[] {
  return config.agents.map((a) => ({
    id: a.id,
    role: a.role,
    name: a.name,
    department: a.department,
    description: `${a.role} agent`,
    allowedTools: [],
    budgetLimit: 0,
    riskCeiling: a.riskCeiling,
    autonomyLevel: a.autonomyLevel,
    humanApprovalRules: a.autonomyLevel === 'approval-required' ? ['default'] : [],
    kpis: [],
    status: 'active',
    version: '1.0.0',
    ownerHuman: config.founderName || 'Founder',
  }));
}

export function deriveDepartments(config: CompanyConfig): Department[] {
  const agentsByDept = new Map<string, string[]>();
  for (const a of config.agents) {
    const list = agentsByDept.get(a.department) ?? [];
    list.push(a.id);
    agentsByDept.set(a.department, list);
  }
  return config.departments.map((d) => {
    const deptAgents = agentsByDept.get(d.name) ?? [];
    return {
      id: d.id,
      name: d.name,
      description: `${d.name} department`,
      status: 'active' as const,
      leadAgent: deptAgents[0] ?? '',
      agents: deptAgents,
      currentTasks: [],
      kpiSummary: [],
    };
  });
}

export function deriveBusinessUnits(config: CompanyConfig): BusinessUnit[] {
  if (!config.businessUnit) return [];
  const bu = config.businessUnit;
  const code = bu.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 12) || 'BU';
  return [{
    id: bu.id,
    code,
    name: bu.name,
    purpose: `${bu.revenueModel} - phase ${bu.phase}`,
    status: 'active',
    phase: bu.phase,
    products: [],
    revenueModel: bu.revenueModel,
    requiredAgents: config.agents.map((a) => a.id),
    requiredHumans: [config.founderName].filter(Boolean),
    risks: [],
    kpis: [],
    dependencies: [],
  }];
}

export interface FinanceSummary {
  monthlyBudget: number;
  liquidityTarget: number;
  breakEvenTarget: number;
  isConfigured: boolean;
}

export function deriveFinance(config: CompanyConfig): FinanceSummary {
  const { monthly, liquidityTarget, breakEvenTarget } = config.budget;
  return {
    monthlyBudget: monthly,
    liquidityTarget,
    breakEvenTarget,
    isConfigured: monthly > 0 || liquidityTarget > 0 || breakEvenTarget > 0,
  };
}

export function founderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'F';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
