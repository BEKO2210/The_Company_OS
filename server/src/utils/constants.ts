// ═══════════════════════════════════════════════════════════════
// The Company OS - Constants
// ═══════════════════════════════════════════════════════════════

// ─── Auth ───
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ─── Roles ───
export const ROLES = {
  FOUNDER: 'founder',
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;

// ─── Role Hierarchy (higher = more permissions) ───
export const ROLE_HIERARCHY: Record<string, number> = {
  [ROLES.VIEWER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.FOUNDER]: 3,
};

// ─── Red Line Approval Types ───
// These approval types require 'founder' role.
// These 10 red lines are NON-NEGOTIABLE and must NEVER be bypassed.
export const RED_LINE_TYPES = [
  'payment',                 // Zahlungen
  'contract',                // Verträge
  'invoice',                 // Rechnungsversand
  'deployment',              // Produktiv-Deployment
  'freelancer',              // Freelancer-Beauftragung
  'authority_communication', // Behördenkommunikation
  'termination',             // Kündigungen
  'refund',                  // Erstattungen
  'safety_veto_override',    // Aufhebung Safety-Veto
  'physical_security',       // Physische/sicherheitsrelevante Einsätze
] as const;

// ─── Risk Levels ───
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// ─── Agent Status ───
export const AGENT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  QUARANTINE: 'quarantine',
  OFFLINE: 'offline',
} as const;

// ─── Approval Status ───
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const;

// ─── Workflow Status ───
export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

// ─── Kill Switch Levels ───
export const KILL_SWITCH_LEVELS = {
  LEVEL_1: 1, // Soft pause - review required
  LEVEL_2: 2, // Hard pause - no autonomous actions
  LEVEL_3: 3, // Shutdown - all agents offline
  LEVEL_4: 4, // Emergency - full system halt
} as const;

// ─── Pagination ───
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// ─── Risk Thresholds ───
export const RISK_HIGH_THRESHOLD = 10;
export const RISK_CRITICAL_THRESHOLD = 15;

// ─── Budget Thresholds ───
export const BUDGET_WARNING_DEFAULT = 70;
export const BUDGET_CRITICAL_DEFAULT = 90;

// ─── Audit Log ───
export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

// ─── CORS ───
export const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];
