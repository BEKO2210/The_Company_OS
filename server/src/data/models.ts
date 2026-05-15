// Agent
export interface Agent {
  id: string;
  role: string;
  name: string;
  department: string;
  description: string;
  allowedTools: string[];
  budgetLimit: number;
  riskCeiling: 'low' | 'medium' | 'high' | 'critical';
  autonomyLevel: 'full' | 'supervised' | 'approval-required' | 'human-only';
  humanApprovalRules: string[];
  kpis: { name: string; value: string; target: string }[];
  status: 'active' | 'paused' | 'quarantine' | 'offline';
  version: string;
  ownerHuman: string;
  avatar?: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'maintenance';
  leadAgent: string;
  agents: string[];
  currentTasks: { id: string; title: string; status: string; priority: string }[];
  kpiSummary: { metric: string; value: string; trend: 'up' | 'down' | 'stable' }[];
}

// Business Unit
export interface BusinessUnit {
  id: string;
  code: string;
  name: string;
  purpose: string;
  status: 'active' | 'parked' | 'planned' | 'internal-active';
  phase: number;
  products: string[];
  revenueModel: string;
  requiredAgents: string[];
  requiredHumans: string[];
  risks: string[];
  kpis: { name: string; value: string; target: string }[];
  dependencies: string[];
}

// Product Studio
export interface ProductStudio {
  id: string;
  name: string;
  businessUnit: string;
  status: 'active' | 'planning' | 'building' | 'qa' | 'deploying' | 'live' | 'maintenance' | 'closed';
  budget: { total: number; spent: number; remaining: number };
  workflowStep: string;
  qaStatus: 'pending' | 'in-progress' | 'passed' | 'failed' | 'veto';
  deploymentStatus: 'not-started' | 'staging' | 'ready' | 'deployed' | 'rolled-back';
  customer: string;
  startDate: string;
  targetDate: string;
  completion: number;
}

// Approval
export interface Approval {
  id: string;
  type: 'payment' | 'contract' | 'invoice' | 'deployment' | 'freelancer' | 'purchase' | 'communication' | 'other';
  title: string;
  description: string;
  requester: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  amount?: number;
  recommendation: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: string;
  redLine: boolean;
}

// Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  tool?: string;
  input?: string;
  output?: string;
  riskScore: number;
  project?: string;
  approvedBy?: string;
  hash: string;
}

// Risk
export interface Risk {
  id: number;
  name: string;
  category: 'technical' | 'legal' | 'financial' | 'reputational' | 'security' | 'human' | 'operational';
  cause: string;
  impact: string;
  earlyWarning: string;
  mitigation: string;
  owner: string;
  probability: number;
  severity: number;
  score: number;
  status: 'active' | 'mitigated' | 'monitoring' | 'closed';
}

// Workflow
export interface Workflow {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: WorkflowStep[];
  responsibleAgents: string[];
  inputs: string[];
  outputs: string[];
  riskScore: number;
  requiresApproval: boolean;
  status: 'active' | 'draft' | 'deprecated';
  successRate: number;
  avgDuration: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agent: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
  blockingGate: boolean;
  input: string;
  output: string;
}

// Human Expert
export interface HumanExpert {
  id: string;
  name: string;
  type: 'freelancer' | 'vendor' | 'expert' | 'operator';
  skills: string[];
  rating: number;
  hourlyRate: number;
  availability: 'available' | 'busy' | 'partial' | 'unavailable';
  status: 'active' | 'onboarding' | 'suspended' | 'inactive';
  onboardingProgress: number;
  totalProjects: number;
  completedProjects: number;
}

// Finance Entry
export interface FinanceEntry {
  id: string;
  category: string;
  budget: number;
  spent: number;
  projected: number;
  variance: number;
}

// Invoice
export interface Invoice {
  id: string;
  studio: string;
  amount: number;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  blocked: boolean;
}

// Budget
export interface Budget {
  id: string;
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  warningAt: number;
  criticalAt: number;
}

// Incident
export interface Incident {
  id: string;
  severity: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  status: 'open' | 'contained' | 'resolved' | 'closed';
  detectedAt: string;
  resolvedAt?: string;
  affectedAgents: string[];
  mitigation: string;
}

// System Settings
export interface SystemSettings {
  killSwitchStatus: 'armed' | 'triggered' | 'disabled';
  modelPolicy: { name: string; enabled: boolean; description: string }[];
  toolPermissions: { toolId: string; toolName: string; riskClass: 'green' | 'yellow' | 'red'; allowedRoles: string[]; paramLimits: string }[];
  budgetLimits: { category: string; limit: number; period: string }[];
}
