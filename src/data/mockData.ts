import type {
  Agent, Department, BusinessUnit, ProductStudio, Approval,
  AuditLogEntry, Risk, Workflow, HumanExpert, FinanceEntry,
  Invoice, Budget, Incident, SystemSettings,
} from './models';

export const agents: Agent[] = [];

export const departments: Department[] = [];

export const businessUnits: BusinessUnit[] = [];

export const productStudios: ProductStudio[] = [];

export const approvals: Approval[] = [];

export const auditLog: AuditLogEntry[] = [];

export const risks: Risk[] = [];

export const workflows: Workflow[] = [];

export const humanExperts: HumanExpert[] = [];

export const financeEntries: FinanceEntry[] = [];

export const invoices: Invoice[] = [];

export const budgets: Budget[] = [];

export const liquidityTrend: { day: string; value: number }[] = [];

export const automationTrend: { day: string; value: number }[] = [];

export const incidents: Incident[] = [];

export const systemSettings: SystemSettings = {
  killSwitchStatus: 'armed',
  modelPolicy: [],
  toolPermissions: [],
  budgetLimits: [],
};
