/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Frontend Tenant Types                      ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Frontend-specific type definitions for the tenant system.
 * These types are consumed by React components and hooks.
 */

// ───────────────────────────────────────────────
// Core Frontend Types
// ───────────────────────────────────────────────

/** Simplified tenant info for the frontend */
export interface FrontendTenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  branding: TenantBrandingFrontend;
  features: TenantFeatures;
  limits: {
    maxAgents: number;
    maxUsers: number;
    maxWorkflows: number;
    maxStorage: number;
    maxApiCalls: number;
  };
  usage: TenantUsageFrontend;
  expiresAt?: string; // ISO date string
}

/** Frontend branding with computed CSS properties */
export interface TenantBrandingFrontend {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
  emailFrom: string;
  tagline: string | null;
  footerText: string | null;
  /** Computed CSS variables for direct use */
  cssVariables: Record<string, string>;
}

/** Feature flags available to the frontend */
export interface TenantFeatures {
  agents: boolean;
  workflows: boolean;
  dashboard: boolean;
  apiAccess: boolean;
  sso: boolean;
  customIntegrations: boolean;
  advancedAnalytics: boolean;
  teamCollaboration: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
  auditLog: boolean;
  dedicatedInfra: boolean;
}

/** Current usage statistics */
export interface TenantUsageFrontend {
  agentsUsed: number;
  usersUsed: number;
  workflowsUsed: number;
  storageUsed: number;
  apiCallsUsed: number;
  budgetUsed: number;
}

// ───────────────────────────────────────────────
// Shared Enums
// ───────────────────────────────────────────────

export type TenantStatus = "active" | "suspended" | "trial" | "cancelled";
export type TenantPlan = "starter" | "professional" | "enterprise";

// ───────────────────────────────────────────────
// Context & State Types
// ───────────────────────────────────────────────

/** React Context value for tenant */
export interface TenantContextValue {
  /** Currently loaded tenant */
  tenant: FrontendTenant | null;
  /** Whether tenant data is loading */
  isLoading: boolean;
  /** Any error that occurred during loading */
  error: TenantError | null;
  /** Manually refresh tenant data */
  refresh: () => Promise<void>;
  /** Set tenant (for admin impersonation) */
  setTenant: (tenant: FrontendTenant | null) => void;
}

/** Tenant loading error */
export interface TenantError {
  code: string;
  message: string;
  isRetryable: boolean;
}

/** Hook return type */
export interface UseTenantReturn extends TenantContextValue {
  /** Whether the current user is a tenant admin */
  isAdmin: boolean;
  /** Whether the tenant has a specific feature */
  hasFeature: (feature: keyof TenantFeatures) => boolean;
  /** Whether the tenant is within limits */
  withinLimits: boolean;
  /** Quick access to branding colors */
  colors: { primary: string; secondary: string };
  /** Quick access to company name */
  companyName: string;
  /** Quick access to logo URL */
  logoUrl: string | null;
}

// ───────────────────────────────────────────────
// API Response Types
// ───────────────────────────────────────────────

export interface TenantBrandingApiResponse {
  companyName: string;
  tagline: string | null;
  footerText: string | null;
  colors: { primary: string; secondary: string };
  logo: { url: string | null; alt: string };
  favicon: { url: string | null };
  links: {
    login: string;
    dashboard: string;
    settings: string;
  };
  features: {
    whiteLabel: boolean;
    customDomain: boolean;
    sso: boolean;
    api: boolean;
  };
}

export interface TenantOnboardingApiResponse {
  success: boolean;
  message: string;
  data: {
    tenant: {
      id: string;
      slug: string;
      name: string;
      plan: TenantPlan;
      status: TenantStatus;
      expiresAt: string;
    };
    adminUser: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
  links: {
    login: string;
    setup: string;
    dashboard: string;
  };
}

// ───────────────────────────────────────────────
// Component Props
// ───────────────────────────────────────────────

export interface TenantAwareComponentProps {
  /** Override tenant (defaults to context tenant) */
  tenant?: FrontendTenant;
}

export interface TenantLogoProps extends TenantAwareComponentProps {
  /** Logo size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show company name next to logo */
  showName?: boolean;
  /** Custom className */
  className?: string;
}

export interface TenantBrandingProviderProps {
  children: React.ReactNode;
  /** Initial tenant data (for SSR) */
  initialTenant?: FrontendTenant;
  /** API base URL */
  apiBaseUrl?: string;
}

// ───────────────────────────────────────────────
// Utility Types
// ───────────────────────────────────────────────

/** Nullable partial for form state */
export type PartialTenantUpdate = Partial<
  Omit<FrontendTenant, "id" | "slug" | "createdAt" | "usage">
>;

/** Feature flag check utility */
export const FEATURE_MAP: Record<string, keyof TenantFeatures> = {
  agents: "agents",
  workflows: "workflows",
  dashboard: "dashboard",
  "api-access": "apiAccess",
  sso: "sso",
  "custom-integrations": "customIntegrations",
  "advanced-analytics": "advancedAnalytics",
  "team-collaboration": "teamCollaboration",
  "white-label": "whiteLabel",
  "priority-support": "prioritySupport",
  "audit-log": "auditLog",
  "dedicated-infra": "dedicatedInfra",
};
