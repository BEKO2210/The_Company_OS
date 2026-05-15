// ═══════════════════════════════════════════════════════════════
// AI Module Types - The Company OS
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  Approval,
  AuditLogEntry,
  BusinessUnit,
  Department,
  FinanceEntry,
  HumanExpert,
  Incident,
  ProductStudio,
  Risk,
  Workflow,
  WorkflowStep,
} from '@/data/models';

// Re-export model types for AI modules
export type {
  Agent,
  Approval,
  AuditLogEntry,
  BusinessUnit,
  Department,
  FinanceEntry,
  HumanExpert,
  Incident,
  ProductStudio,
  Risk,
  Workflow,
  WorkflowStep,
};

// ─── Parsed Query Result ───
export type QueryIntent = 'list' | 'get' | 'count' | 'status' | 'help' | 'unknown';

export interface ParsedQuery {
  intent: QueryIntent;
  entity: string;
  filter?: Record<string, string | string[]>;
  query: string;
  confidence: number;
  pageHint?: string;
}

export interface QueryResult {
  parsed: ParsedQuery;
  answer: string;
  data?: unknown;
  pageHint?: string;
}

// ─── Decision Support ───
export type Recommendation = 'approve' | 'reject' | 'review';

export interface SimilarDecision {
  id: string;
  title: string;
  outcome: string;
  similarity: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

export interface DecisionSupport {
  approvalId: string;
  recommendation: Recommendation;
  confidence: number;
  reasoning: string[];
  similarDecisions: SimilarDecision[];
  riskFactors: RiskFactor[];
  budgetImpact: number;
  urgencyScore: number;
}

// ─── Daily Report ───
export interface DailyReport {
  date: string;
  headline: string;
  events: ReportEvent[];
  openApprovals: number;
  newRisks: number;
  agentStatusChanges: AgentStatusChange[];
  financeUpdate: FinanceUpdate;
  pendingTasks: number;
  overdueItems: string[];
}

export interface ReportEvent {
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  entity: string;
}

export interface AgentStatusChange {
  agent: string;
  from: string;
  to: string;
}

export interface FinanceUpdate {
  liquidity: number;
  burnRate: number;
  budgetUtilization: number;
  trend: 'up' | 'down' | 'stable';
}

// ─── Weekly Summary ───
export interface WeeklySummary {
  period: string;
  headline: string;
  completedProjects: number;
  newCustomers: number;
  budgetUtilization: number;
  agentPerformance: AgentPerformance[];
  riskDevelopment: RiskDevelopment;
  upcomingDeadlines: UpcomingDeadline[];
}

export interface AgentPerformance {
  agent: string;
  tasksCompleted: number;
  efficiency: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RiskDevelopment {
  newRisks: number;
  mitigatedRisks: number;
  escalatedRisks: number;
  totalRisks: number;
}

export interface UpcomingDeadline {
  title: string;
  date: string;
  daysLeft: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Predictions ───
export interface Prediction {
  values: number[];
  confidence: number[];
  labels: string[];
  trend: 'up' | 'down' | 'stable';
  summary: string;
}

export interface BreakEvenPrediction {
  predictedDate: string;
  confidence: number;
  monthsToBreakEven: number;
  currentBurnRate: number;
  projectedRevenue: number;
  summary: string;
}

export interface RiskEscalationPrediction {
  riskId: number;
  riskName: string;
  currentScore: number;
  predictedScore: number;
  probability: number;
  reason: string;
}

export interface OverloadPrediction {
  agentId: string;
  agentName: string;
  currentTasks: number;
  predictedOverloadDays: number;
  confidence: number;
  recommendation: string;
}

// ─── Smart Recommendations ───
export interface SmartRecommendation {
  id: string;
  type: 'approval' | 'agent' | 'budget' | 'workflow' | 'risk' | 'finance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
  entityId?: string;
  createdAt: string;
}

// ─── Company Data Container ───
export interface CompanyData {
  agents: Agent[];
  departments: Department[];
  businessUnits: BusinessUnit[];
  productStudios: ProductStudio[];
  approvals: Approval[];
  auditLog: AuditLogEntry[];
  risks: Risk[];
  workflows: Workflow[];
  humanExperts: HumanExpert[];
  financeEntries: FinanceEntry[];
  incidents: Incident[];
}

// ─── NLQ History ───
export interface QueryHistoryEntry {
  query: string;
  result: QueryResult;
  timestamp: number;
}
