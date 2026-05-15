/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - useTenant Hook                             ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Primary hook for accessing tenant data and branding throughout
 * the React application. Provides convenient helpers for:
 * - Checking feature availability
 * - Accessing branding colors and assets
 * - Admin status checks
 * - Limit validation
 */

import { useMemo } from "react";
import { useTenantContext } from "./TenantProvider";
import type {
  UseTenantReturn,
  TenantFeatures,
  FrontendTenant,
} from "./types";

// ───────────────────────────────────────────────
// useTenant Hook
// ───────────────────────────────────────────────

/**
 * Access tenant data, branding, and feature flags.
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { tenant, isLoading, companyName, logoUrl, hasFeature } = useTenant();
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (!tenant) return <FallbackSidebar />;
 *
 *   return (
 *     <aside className="tenant-sidebar">
 *       <img src={logoUrl || '/default-logo.svg'} alt={companyName} />
 *       <h1>{companyName}</h1>
 *       {hasFeature('advancedAnalytics') && <AnalyticsWidget />}
 *     </aside>
 *   );
 * }
 * ```
 */
export function useTenant(): UseTenantReturn {
  const context = useTenantContext();
  const { tenant, isLoading, error, refresh, setTenant } = context;

  // ─── Computed Values ─────────────────────

  /** Whether the current user is a tenant admin */
  const isAdmin = useMemo(() => {
    // In a real app, check the user's role from auth context
    // For now, we assume all authenticated users in a tenant context are members
    return !!tenant;
  }, [tenant]);

  /** Check if a specific feature is enabled */
  const hasFeature = useMemo(() => {
    return (feature: keyof TenantFeatures): boolean => {
      if (!tenant) return false;
      return tenant.features[feature] === true;
    };
  }, [tenant]);

  /** Whether the tenant is within its usage limits */
  const withinLimits = useMemo(() => {
    if (!tenant) return true;
    const { usage, limits } = tenant;
    return (
      usage.agentsUsed < limits.maxAgents &&
      usage.usersUsed < limits.maxUsers &&
      usage.workflowsUsed < limits.maxWorkflows &&
      usage.storageUsed < limits.maxStorage &&
      usage.apiCallsUsed < limits.maxApiCalls
    );
  }, [tenant]);

  /** Quick access to branding colors */
  const colors = useMemo(() => {
    if (!tenant) {
      return { primary: "#2563eb", secondary: "#475569" };
    }
    return {
      primary: tenant.branding.primaryColor,
      secondary: tenant.branding.secondaryColor,
    };
  }, [tenant?.branding.primaryColor, tenant?.branding.secondaryColor]);

  /** Quick access to company name */
  const companyName = useMemo(() => {
    return tenant?.branding.companyName || "The Company OS";
  }, [tenant?.branding.companyName]);

  /** Quick access to logo URL */
  const logoUrl = useMemo(() => {
    return tenant?.branding.logoUrl || null;
  }, [tenant?.branding.logoUrl]);

  // ─── Return ──────────────────────────────

  return useMemo<UseTenantReturn>(
    () => ({
      tenant,
      isLoading,
      error,
      refresh,
      setTenant,
      isAdmin,
      hasFeature,
      withinLimits,
      colors,
      companyName,
      logoUrl,
    }),
    [
      tenant,
      isLoading,
      error,
      refresh,
      setTenant,
      isAdmin,
      hasFeature,
      withinLimits,
      colors,
      companyName,
      logoUrl,
    ]
  );
}

// ───────────────────────────────────────────────
// Specialized Hooks
// ───────────────────────────────────────────────

/**
 * Hook for accessing branding-specific values only.
 * Lightweight alternative to useTenant when only branding is needed.
 */
export function useTenantBranding(): {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cssVariables: Record<string, string>;
  isLoading: boolean;
} {
  const { tenant, isLoading } = useTenantContext();

  return useMemo(
    () => ({
      companyName: tenant?.branding.companyName || "The Company OS",
      primaryColor: tenant?.branding.primaryColor || "#2563eb",
      secondaryColor: tenant?.branding.secondaryColor || "#475569",
      logoUrl: tenant?.branding.logoUrl || null,
      faviconUrl: tenant?.branding.faviconUrl || null,
      cssVariables: tenant?.branding.cssVariables || {},
      isLoading,
    }),
    [
      tenant?.branding.companyName,
      tenant?.branding.primaryColor,
      tenant?.branding.secondaryColor,
      tenant?.branding.logoUrl,
      tenant?.branding.faviconUrl,
      tenant?.branding.cssVariables,
      isLoading,
    ]
  );
}

/**
 * Hook for checking feature flags.
 * Returns a typed feature checker and a features object.
 */
export function useTenantFeatures(): {
  features: TenantFeatures;
  hasFeature: (feature: keyof TenantFeatures) => boolean;
  isLoading: boolean;
} {
  const { tenant, isLoading } = useTenantContext();

  const hasFeature = useMemo(() => {
    return (feature: keyof TenantFeatures): boolean => {
      if (!tenant) return false;
      return tenant.features[feature] === true;
    };
  }, [tenant]);

  return useMemo(
    () => ({
      features: tenant?.features || getDefaultFeatures(),
      hasFeature,
      isLoading,
    }),
    [tenant?.features, hasFeature, isLoading]
  );
}

/**
 * Hook for accessing tenant limits and current usage.
 * Useful for showing usage bars and warnings.
 */
export function useTenantLimits(): {
  limits: FrontendTenant["limits"] | null;
  usage: FrontendTenant["usage"] | null;
  withinLimits: boolean;
  usagePercentages: Record<string, number>;
  isLoading: boolean;
} {
  const { tenant, isLoading } = useTenantContext();

  const usagePercentages = useMemo(() => {
    if (!tenant) {
      return { agents: 0, users: 0, workflows: 0, storage: 0, apiCalls: 0 };
    }
    const { usage, limits } = tenant;
    return {
      agents: Math.round((usage.agentsUsed / limits.maxAgents) * 100),
      users: Math.round((usage.usersUsed / limits.maxUsers) * 100),
      workflows: Math.round((usage.workflowsUsed / limits.maxWorkflows) * 100),
      storage: Math.round((usage.storageUsed / limits.maxStorage) * 100),
      apiCalls: Math.round((usage.apiCallsUsed / limits.maxApiCalls) * 100),
    };
  }, [tenant]);

  const withinLimits = useMemo(() => {
    if (!tenant) return true;
    return Object.values(usagePercentages).every((p) => p < 100);
  }, [usagePercentages]);

  return useMemo(
    () => ({
      limits: tenant?.limits || null,
      usage: tenant?.usage || null,
      withinLimits,
      usagePercentages,
      isLoading,
    }),
    [tenant?.limits, tenant?.usage, withinLimits, usagePercentages, isLoading]
  );
}

// ───────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────

function getDefaultFeatures(): TenantFeatures {
  return {
    agents: true,
    workflows: true,
    dashboard: true,
    apiAccess: true,
    sso: false,
    customIntegrations: false,
    advancedAnalytics: false,
    teamCollaboration: true,
    whiteLabel: false,
    prioritySupport: false,
    auditLog: false,
    dedicatedInfra: false,
  };
}
