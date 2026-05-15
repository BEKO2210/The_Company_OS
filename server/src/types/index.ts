// ═══════════════════════════════════════════════════════════════
// The Company OS - Shared TypeScript Types
// ═══════════════════════════════════════════════════════════════

// ─── Auth Types ───
export type UserRole = 'founder' | 'admin' | 'viewer';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Agent Types ───
export type AgentStatus = 'active' | 'paused' | 'quarantine' | 'offline';
export type RiskCeiling = 'low' | 'medium' | 'high' | 'critical';
export type AutonomyLevel = 'full' | 'supervised' | 'approval-required' | 'human-only';

export interface Agent {
  id: string;
  role: string;
  name: string;
  department: string;
  description: string | null;
  allowed_tools: string | null;
  budget_limit: number;
  budget_spent: number;
  risk_ceiling: string;
  autonomy_level: string;
  human_approval_rules: string | null;
  kpis: string | null;
  status: string;
  version: string;
  owner_human: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Department Types ───
export interface Department {
  id: string;
  name: string;
  description: string | null;
  status: string;
  lead_agent: string | null;
  agents: string | null;
  current_tasks: string | null;
  kpi_summary: string | null;
  created_at: string;
}

// ─── Business Unit Types ───
export interface BusinessUnit {
  id: string;
  code: string;
  name: string;
  purpose: string | null;
  status: string;
  phase: number;
  products: string | null;
  revenue_model: string | null;
  required_agents: string | null;
  required_humans: string | null;
  risks: string | null;
  kpis: string | null;
  dependencies: string | null;
  created_at: string;
}

// ─── Product Studio Types ───
export interface ProductStudio {
  id: string;
  name: string;
  business_unit: string | null;
  status: string;
  budget_total: number;
  budget_spent: number;
  budget_remaining: number;
  workflow_step: string | null;
  qa_status: string;
  deployment_status: string;
  customer: string | null;
  start_date: string | null;
  target_date: string | null;
  completion: number;
  created_at: string;
}

// ─── Approval Types ───
export type ApprovalType =
  // ─── Red Line Types (require FOUNDER role) ───
  | 'payment'                  // Zahlungen
  | 'contract'                 // Verträge
  | 'invoice'                  // Rechnungsversand
  | 'deployment'               // Produktiv-Deployment
  | 'freelancer'               // Freelancer-Beauftragung
  | 'authority_communication'  // Behördenkommunikation
  | 'termination'              // Kündigungen
  | 'refund'                   // Erstattungen
  | 'safety_veto_override'     // Aufhebung Safety-Veto
  | 'physical_security'        // Physische/sicherheitsrelevante Einsätze
  // ─── Non-Red-Line Types ───
  | 'purchase'
  | 'communication'
  | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

export interface Approval {
  id: string;
  type: string;
  title: string;
  description: string | null;
  requester: string;
  risk_level: string;
  amount: number | null;
  recommendation: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  red_line: number;
  created_at: string;
}

// ─── Audit Log Types ───
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  tool: string | null;
  input: string | null;
  output: string | null;
  risk_score: number;
  project: string | null;
  approved_by: string | null;
  hash: string;
  previous_hash: string | null;
  created_at: string;
}

// ─── Risk Types ───
export type RiskCategory = 'technical' | 'legal' | 'financial' | 'reputational' | 'security' | 'human' | 'operational';
export type RiskStatus = 'active' | 'mitigated' | 'monitoring' | 'closed';

export interface Risk {
  id: number;
  name: string;
  category: string;
  cause: string | null;
  impact: string | null;
  early_warning: string | null;
  mitigation: string | null;
  owner: string | null;
  probability: number;
  severity: number;
  score: number;
  status: string;
  created_at: string;
}

// ─── Incident Types ───
export interface Incident {
  id: string;
  severity: number;
  title: string;
  description: string | null;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  affected_agents: string | null;
  mitigation: string | null;
  created_at: string;
}

// ─── Workflow Types ───
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agent: string;
  status: string;
  blockingGate: boolean;
  input: string;
  output: string;
}

export interface Workflow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  responsible_agents: string | null;
  inputs: string | null;
  outputs: string | null;
  risk_score: number;
  requires_approval: number;
  status: string;
  success_rate: number;
  avg_duration: string | null;
  steps: string | null;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  status: string;
  current_step: number;
  context: string | null;
  result: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ─── Human Expert Types ───
export interface HumanExpert {
  id: string;
  name: string;
  type: string;
  skills: string | null;
  rating: number;
  hourly_rate: number;
  availability: string;
  status: string;
  onboarding_progress: number;
  total_projects: number;
  completed_projects: number;
  contact_email: string | null;
  created_at: string;
}

// ─── Finance Types ───
export interface Budget {
  id: string;
  name: string;
  category: string | null;
  limit_amount: number;
  spent: number;
  remaining: number;
  warning_at: number;
  critical_at: number;
  period: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  studio: string | null;
  customer: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  blocked: number;
  created_at: string;
}

// ─── System Settings ───
export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// ─── Kill Switch Types ───
export interface KillSwitchEntry {
  id: string;
  level: number;
  triggered_by: string;
  reason: string | null;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
}

// ─── Tool Permission Types ───
export interface ToolPermission {
  id: string;
  tool_name: string;
  tool_id: string;
  risk_class: string;
  allowed_roles: string | null;
  param_limits: string | null;
  created_at: string;
}

// ─── Model Policy Types ───
export interface ModelPolicy {
  id: string;
  name: string;
  enabled: number;
  description: string | null;
  created_at: string;
}

// ─── API Response Types ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Dashboard KPI Types ───
export interface DashboardKPIs {
  agentCount: number;
  activeAgentCount: number;
  departmentCount: number;
  pendingApprovals: number;
  totalRisks: number;
  highRisks: number;
  activeWorkflows: number;
  workflowInstances: number;
  expertCount: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  liquidity: number;
  killSwitchStatus: string;
  automationRate: number;
  incidentsOpen: number;
}
