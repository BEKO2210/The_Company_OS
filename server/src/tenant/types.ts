/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant System Types                        ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Core type definitions for the multi-tenant architecture.
 * All tenant-related interfaces and type guards are defined here.
 */

// ───────────────────────────────────────────────
// Tenant Status & Plan Enums
// ───────────────────────────────────────────────

export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";
export type TenantPlan = "starter" | "professional" | "enterprise";
export type BillingStatus = "pending" | "paid" | "overdue" | "cancelled";

// ───────────────────────────────────────────────
// Core Tenant Interfaces
// ───────────────────────────────────────────────

/** Visual branding configuration for a tenant */
export interface TenantBranding {
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional favicon URL */
  faviconUrl?: string;
  /** Display company name */
  companyName: string;
  /** Custom domain for white-label (e.g. "app.acme.com") */
  customDomain?: string;
  /** Email "from" address for tenant communications */
  emailFrom: string;
  /** Optional tagline shown on login */
  tagline?: string;
  /** Optional footer text */
  footerText?: string;
}

/** Feature flags and limits configuration */
export interface TenantConfig {
  /** Maximum AI agents allowed */
  maxAgents: number;
  /** Maximum team members allowed */
  maxUsers: number;
  /** Maximum workflows allowed */
  maxWorkflows: number;
  /** Activated feature flags */
  features: string[];
  /** Activated module names */
  modules: string[];
  /** Enable custom integrations */
  allowCustomIntegrations: boolean;
  /** Enable API access */
  allowApiAccess: boolean;
  /** Enable SSO authentication */
  allowSso: boolean;
  /** Allow white-label sub-branding */
  allowSubBranding: boolean;
}

/** Usage limits for the tenant */
export interface TenantLimits {
  /** Maximum monthly budget in tenant's currency */
  maxMonthlyBudget: number;
  /** Maximum storage in MB */
  maxStorage: number;
  /** Maximum API calls per month */
  maxApiCalls: number;
  /** Currency code (ISO 4217) */
  currency: string;
}

/** Complete tenant entity */
export interface Tenant {
  /** Unique tenant ID (ULID) */
  id: string;
  /** URL-safe slug (e.g. "acme-corp") */
  slug: string;
  /** Human-readable tenant name */
  name: string;
  /** Current tenant status */
  status: TenantStatus;
  /** Current subscription plan */
  plan: TenantPlan;
  /** Visual branding configuration */
  branding: TenantBranding;
  /** Feature and module configuration */
  config: TenantConfig;
  /** Usage limits */
  limits: TenantLimits;
  /** Stripe customer ID for billing */
  stripeCustomerId?: string;
  /** Stripe subscription ID */
  stripeSubscriptionId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Trial expiration or subscription end */
  expiresAt?: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ───────────────────────────────────────────────
// DTOs (Data Transfer Objects)
// ───────────────────────────────────────────────

export interface CreateTenantDTO {
  name: string;
  slug: string;
  plan?: TenantPlan;
  branding?: Partial<TenantBranding>;
  config?: Partial<TenantConfig>;
  limits?: Partial<TenantLimits>;
}

export interface UpdateTenantDTO {
  name?: string;
  slug?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  branding?: Partial<TenantBranding>;
  config?: Partial<TenantConfig>;
  limits?: Partial<TenantLimits>;
}

export interface TenantFilter {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  pageSize?: number;
}

// ───────────────────────────────────────────────
// Self-Service Onboarding DTOs
// ───────────────────────────────────────────────

export interface OnboardingDTO {
  companyName: string;
  slug: string;
  email: string;
  password: string;
  plan: TenantPlan;
  adminName: string;
  billingEmail?: string;
  agreedToTerms: boolean;
}

export interface OnboardingResult {
  tenant: Tenant;
  /** Admin user object (without sensitive data) */
  adminUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  /** One-time login link (for initial setup) */
  setupUrl: string;
}

// ───────────────────────────────────────────────
// User (referenced by onboarding)
// ───────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "member" | "viewer";
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ───────────────────────────────────────────────
// Billing (Stripe-Ready)
// ───────────────────────────────────────────────

export interface BillingRecord {
  tenantId: string;
  plan: TenantPlan;
  amount: number;
  currency: string;
  period: string; // "2026-01"
  status: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  paidAt?: Date;
  dueDate?: Date;
  createdAt: Date;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ───────────────────────────────────────────────
// CSS / Branding Output
// ───────────────────────────────────────────────

export interface CSSVariables {
  [key: `--${string}`]: string;
}

export interface BrandingAssets {
  logoUrl: string;
  faviconUrl: string;
  stylesheetUrl: string;
  cssVariables: CSSVariables;
}

// ───────────────────────────────────────────────
// API Response Types
// ───────────────────────────────────────────────

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantConfigResponse {
  config: TenantConfig;
  limits: TenantLimits;
  usage: TenantUsage;
}

export interface TenantUsage {
  agentsUsed: number;
  usersUsed: number;
  workflowsUsed: number;
  storageUsed: number;
  apiCallsUsed: number;
  budgetUsed: number;
}

// ───────────────────────────────────────────────
// Type Guards
// ───────────────────────────────────────────────

export function isValidTenantStatus(status: unknown): status is TenantStatus {
  return (
    typeof status === "string" &&
    ["active", "suspended", "trial", "cancelled"].includes(status)
  );
}

export function isValidTenantPlan(plan: unknown): plan is TenantPlan {
  return (
    typeof plan === "string" &&
    ["starter", "professional", "enterprise"].includes(plan)
  );
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9-]+$/.test(slug);
}
