/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - TenantProvider                             ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * React Context Provider that:
 * - Detects tenant from URL (subdomain or path)
 * - Loads tenant branding from API
 * - Injects CSS custom properties into <html>
 * - Provides tenant context to all child components
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type {
  FrontendTenant,
  TenantContextValue,
  TenantBrandingApiResponse,
  TenantBrandingFrontend,
  TenantFeatures,
  TenantError,
  TenantBrandingProviderProps,
} from "./types";

// ───────────────────────────────────────────────
// Context
// ───────────────────────────────────────────────

const TenantContext = createContext<TenantContextValue | null>(null);

// ───────────────────────────────────────────────
// TenantProvider Component
// ───────────────────────────────────────────────

export function TenantProvider({
  children,
  initialTenant,
  apiBaseUrl = "",
}: TenantBrandingProviderProps): React.ReactElement {
  const [tenant, setTenantState] = useState<FrontendTenant | null>(
    initialTenant || null
  );
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<TenantError | null>(null);

  // Detect tenant slug from URL
  const detectedSlug = useMemo(() => detectTenantSlug(), []);

  /**
   * Load tenant data from API
   */
  const loadTenant = useCallback(
    async (slug: string): Promise<FrontendTenant | null> => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/tenant/${slug}/branding`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw {
              code: "TENANT_NOT_FOUND",
              message: `Tenant "${slug}" was not found.`,
              isRetryable: false,
            };
          }
          throw {
            code: "LOAD_ERROR",
            message: `Failed to load tenant: ${response.statusText}`,
            isRetryable: true,
          };
        }

        const result = (await response.json()) as {
          success: boolean;
          data: TenantBrandingApiResponse;
        };

        if (!result.success || !result.data) {
          throw {
            code: "INVALID_RESPONSE",
            message: "Invalid response from tenant API.",
            isRetryable: true,
          };
        }

        return apiResponseToFrontendTenant(slug, result.data);
      } catch (err) {
        const tenantError: TenantError = {
          code: (err as TenantError).code || "UNKNOWN_ERROR",
          message:
            (err as TenantError).message || "Failed to load tenant data.",
          isRetryable: (err as TenantError).isRetryable ?? true,
        };
        setError(tenantError);
        return null;
      }
    },
    [apiBaseUrl]
  );

  /**
   * Refresh tenant data
   */
  const refresh = useCallback(async () => {
    const slug = tenant?.slug || detectedSlug;
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const loaded = await loadTenant(slug);
      if (loaded) {
        setTenantState(loaded);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.slug, detectedSlug, loadTenant]);

  /**
   * Set tenant (for admin impersonation)
   */
  const setTenant = useCallback((t: FrontendTenant | null) => {
    setTenantState(t);
  }, []);

  // ─── Initial Load ────────────────────────

  useEffect(() => {
    // If we have initial tenant from props or already loaded tenant, skip
    if (initialTenant || tenant) {
      setIsLoading(false);
      return;
    }

    const slug = detectedSlug;
    if (!slug) {
      setIsLoading(false);
      // No slug detected - running in platform mode
      return;
    }

    let cancelled = false;

    const doLoad = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await loadTenant(slug);
        if (!cancelled && loaded) {
          setTenantState(loaded);
        }
      } catch {
        // Error already handled in loadTenant
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    doLoad();

    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  // ─── CSS Variables Injection ─────────────

  useEffect(() => {
    if (!tenant?.branding.cssVariables) return;

    const root = document.documentElement;
    const vars = tenant.branding.cssVariables;

    // Set CSS custom properties
    for (const [key, value] of Object.entries(vars)) {
      if (key.startsWith("--")) {
        root.style.setProperty(key, value);
      }
    }

    // Update page title
    if (tenant.branding.companyName) {
      document.title = tenant.branding.companyName;
    }

    // Update favicon
    if (tenant.branding.faviconUrl) {
      updateFavicon(tenant.branding.faviconUrl);
    }

    // Update meta theme-color
    updateMetaThemeColor(tenant.branding.primaryColor);

    // Cleanup on unmount
    return () => {
      for (const key of Object.keys(vars)) {
        if (key.startsWith("--")) {
          root.style.removeProperty(key);
        }
      }
    };
  }, [tenant?.branding.cssVariables]);

  // ─── Stylesheet Injection ────────────────

  useEffect(() => {
    if (!tenant?.slug) return;

    const linkId = "tenant-stylesheet";
    const existingLink = document.getElementById(linkId);

    if (existingLink) {
      existingLink.remove();
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `${apiBaseUrl}/api/tenant/${tenant.slug}/styles.css`;

    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [tenant?.slug, apiBaseUrl]);

  // ─── Value Memo ──────────────────────────

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      isLoading,
      error,
      refresh,
      setTenant,
    }),
    [tenant, isLoading, error, refresh, setTenant]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ───────────────────────────────────────────────
// useTenantContext Hook (internal)
// ───────────────────────────────────────────────

export function useTenantContext(): TenantContextValue {
  const context = React.useContext(TenantContext);
  if (!context) {
    throw new Error(
      "useTenantContext must be used within a <TenantProvider>"
    );
  }
  return context;
}

// ───────────────────────────────────────────────
// Slug Detection
// ───────────────────────────────────────────────

/**
 * Detect tenant slug from current URL.
 * Supports:
 * - Subdomain: acme.company-os.com → "acme"
 * - Path: /dashboard/acme → "acme"
 * - Query: ?tenant=acme → "acme"
 */
function detectTenantSlug(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check URL path segments
  const pathMatch = window.location.pathname.match(
    /^\/(?:dashboard|login|settings|setup)\/([a-z0-9-]+)/
  );
  if (pathMatch) return pathMatch[1];

  // 2. Check query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const querySlug = urlParams.get("tenant") || urlParams.get("tenantSlug");
  if (querySlug) return querySlug;

  // 3. Check subdomain
  const hostname = window.location.hostname;
  const platformDomains = ["company-os.com", "companyos.io", "localhost"];
  const isPlatformDomain = platformDomains.some((d) => hostname.includes(d));

  if (isPlatformDomain) {
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain && subdomain !== "www" && subdomain !== "app") {
        return subdomain;
      }
    }
  }

  // 4. Check meta tag
  const metaSlug = document
    .querySelector('meta[name="tenant-slug"]')
    ?.getAttribute("content");
  if (metaSlug) return metaSlug;

  return null;
}

// ───────────────────────────────────────────────
// Transformers
// ───────────────────────────────────────────────

/**
 * Convert API branding response to frontend tenant object
 */
function apiResponseToFrontendTenant(
  slug: string,
  api: TenantBrandingApiResponse
): FrontendTenant {
  const branding: TenantBrandingFrontend = {
    companyName: api.companyName,
    primaryColor: api.colors.primary,
    secondaryColor: api.colors.secondary,
    logoUrl: api.logo.url,
    faviconUrl: api.favicon.url,
    customDomain: null,
    emailFrom: "",
    tagline: api.tagline,
    footerText: api.footerText,
    cssVariables: generateCSSVariables(api.colors.primary, api.colors.secondary, api.companyName),
  };

  const features = generateFeaturesFromApi(api.features);

  return {
    id: slug, // Will be overwritten when full tenant data loads
    slug,
    name: api.companyName,
    status: "active", // Default, will be updated
    plan: "starter", // Default, will be updated
    branding,
    features,
    limits: {
      maxAgents: 3,
      maxUsers: 5,
      maxWorkflows: 10,
      maxStorage: 1024,
      maxApiCalls: 10000,
    },
    usage: {
      agentsUsed: 0,
      usersUsed: 1,
      workflowsUsed: 0,
      storageUsed: 0,
      apiCallsUsed: 0,
      budgetUsed: 0,
    },
  };
}

/**
 * Generate CSS variables map for frontend use
 */
function generateCSSVariables(
  primary: string,
  secondary: string,
  companyName: string
): Record<string, string> {
  return {
    "--tenant-primary": primary,
    "--tenant-secondary": secondary,
    "--tenant-primary-rgb": hexToRgb(primary),
    "--tenant-secondary-rgb": hexToRgb(secondary),
    "--tenant-company-name": `"${companyName}"`,
    "--tenant-background": "#f8fafc",
    "--tenant-surface": "#ffffff",
    "--tenant-text": "#0f172a",
    "--tenant-text-muted": "#64748b",
    "--tenant-border": "#e2e8f0",
    "--tenant-accent": secondary,
    "--tenant-error": "#ef4444",
    "--tenant-success": "#22c55e",
    "--tenant-warning": "#f59e0b",
    "--tenant-sidebar-bg": "#f8fafc",
    "--tenant-sidebar-text": "#0f172a",
    "--tenant-card-bg": "#ffffff",
    "--tenant-button-bg": primary,
    "--tenant-button-text": getContrastColor(primary),
    "--tenant-link": primary,
  };
}

/**
 * Generate feature flags from API capabilities
 */
function generateFeaturesFromApi(apiFeatures: {
  whiteLabel: boolean;
  customDomain: boolean;
  sso: boolean;
  api: boolean;
}): TenantFeatures {
  return {
    agents: true,
    workflows: true,
    dashboard: true,
    apiAccess: apiFeatures.api,
    sso: apiFeatures.sso,
    customIntegrations: apiFeatures.whiteLabel,
    advancedAnalytics: false,
    teamCollaboration: true,
    whiteLabel: apiFeatures.whiteLabel,
    prioritySupport: false,
    auditLog: false,
    dedicatedInfra: false,
  };
}

// ───────────────────────────────────────────────
// DOM Utilities
// ───────────────────────────────────────────────

/** Update favicon link element */
function updateFavicon(url: string): void {
  const existing = document.querySelector('link[rel*="icon"]');
  if (existing) {
    existing.remove();
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = url.endsWith(".png") ? "image/png" : "image/x-icon";
  link.href = url;
  document.head.appendChild(link);
}

/** Update meta theme-color tag */
function updateMetaThemeColor(color: string): void {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

// ───────────────────────────────────────────────
// Color Utilities
// ───────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function getBrightness(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getContrastColor(hex: string): string {
  return getBrightness(hex) > 0.5 ? "#0f172a" : "#ffffff";
}
