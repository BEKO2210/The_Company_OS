import { z } from 'zod';

// ─── ID Schema ───
export const idSchema = z.string().min(1).max(100);

// ─── Auth Schemas ───
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['admin', 'viewer']).default('viewer'),
});

// ─── Query Schema ───
export const querySchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
});

// ─── Agent Filter Schema ───
export const agentFilterSchema = z.object({
  role: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'paused', 'quarantine', 'offline']).optional(),
  riskCeiling: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Agent Update Schema ───
export const agentUpdateSchema = z.object({
  role: z.string().optional(),
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  allowed_tools: z.string().optional(),
  budget_limit: z.coerce.number().int().min(0).optional(),
  budget_spent: z.coerce.number().int().min(0).optional(),
  risk_ceiling: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  autonomy_level: z.enum(['full', 'supervised', 'approval-required', 'human-only']).optional(),
  human_approval_rules: z.string().optional(),
  kpis: z.string().optional(),
  status: z.enum(['active', 'paused', 'quarantine', 'offline']).optional(),
  version: z.string().optional(),
  owner_human: z.string().optional(),
  avatar: z.string().optional(),
});

// ─── Approval Filter Schema ───
export const approvalFilterSchema = z.object({
  type: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'escalated']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Approval Action Schema ───
export const approvalActionSchema = z.object({
  reason: z.string().optional(),
});

// ─── Audit Log Filter Schema ───
export const auditFilterSchema = z.object({
  agent: z.string().optional(),
  action: z.string().optional(),
  project: z.string().optional(),
  minRisk: z.coerce.number().int().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Risk Filter Schema ───
export const riskFilterSchema = z.object({
  category: z.string().optional(),
  status: z.enum(['active', 'mitigated', 'monitoring', 'closed']).optional(),
  minScore: z.coerce.number().int().min(0).max(25).optional(),
});

// ─── Risk Update Schema ───
export const riskUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(['technical', 'legal', 'financial', 'reputational', 'security', 'human', 'operational']).optional(),
  cause: z.string().optional(),
  impact: z.string().optional(),
  early_warning: z.string().optional(),
  mitigation: z.string().optional(),
  owner: z.string().optional(),
  probability: z.coerce.number().int().min(1).max(5).optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'mitigated', 'monitoring', 'closed']).optional(),
});

// ─── Workflow Start Schema ───
export const workflowStartSchema = z.object({
  context: z.record(z.unknown()).optional(),
});

// ─── Workflow Instance Filter ───
export const workflowInstanceFilterSchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'blocked']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Kill Switch Action Schema ───
export const killSwitchSchema = z.object({
  level: z.coerce.number().int().min(1).max(4),
  reason: z.string().optional(),
});

// ─── Settings Update Schema ───
export const settingsUpdateSchema = z.record(z.string());

// ─── Pagination Schema ───
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Human Expert Filter ───
export const expertFilterSchema = z.object({
  type: z.string().optional(),
  availability: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
