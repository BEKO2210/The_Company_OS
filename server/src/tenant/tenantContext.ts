/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant Context                             ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Provides tenant resolution from HTTP requests via:
 * - Subdomain (acme.company-os.com)
 * - Custom domain (app.acme.com)
 * - Header (X-Tenant-ID)
 * - Path parameter (/api/acme-corp/...)
 * - Query string (?tenant=acme-corp)
 *
 * The resolved tenant is attached to the request for downstream use.
 */

import type { Tenant } from "./types";
import { TenantManager } from "./tenantManager";

// ───────────────────────────────────────────────
// Request Augmentation
// ───────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Resolved tenant for the current request */
      tenant?: Tenant;
      /** Tenant ID shorthand (extracted or from tenant) */
      tenantId?: string;
    }
  }
}

// ───────────────────────────────────────────────
// Extraction Strategies
// ───────────────────────────────────────────────

/** Result of a tenant extraction attempt */
export interface ExtractionResult {
  source: "subdomain" | "custom-domain" | "header" | "path" | "query" | "none";
  slugOrId: string | null;
}

/** Extract tenant identifier from request using all strategies */
export function extractTenantIdentifier(req: {
  headers: Record<string, unknown>;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  hostname?: string;
  path?: string;
}): ExtractionResult {
  const hostname = req.hostname || "";
  const headers = req.headers || {};
  const params = req.params || {};
  const query = req.query || {};

  // 1. Custom domain mapping (highest priority)
  // Detected by checking against a domain that doesn't match the platform
  if (hostname) {
    const parts = hostname.split(".");
    // If domain looks like: acme.company-os.com → subdomain strategy
    // If domain looks like: app.acme.com → custom domain strategy
    if (parts.length >= 2) {
      const isPlatformDomain = hostname.includes("company-os.com") || hostname.includes("localhost");

      if (!isPlatformDomain) {
        return { source: "custom-domain", slugOrId: hostname };
      }

      // 2. Subdomain extraction (e.g., acme.company-os.com)
      if (parts.length >= 3) {
        const subdomain = parts[0];
        if (subdomain && subdomain !== "www" && subdomain !== "app") {
          return { source: "subdomain", slugOrId: subdomain.toLowerCase() };
        }
      }
    }
  }

  // 3. Header extraction
  const tenantHeader = headers["x-tenant-id"] || headers["x-tenant-slug"];
  if (typeof tenantHeader === "string" && tenantHeader) {
    return { source: "header", slugOrId: tenantHeader.toLowerCase() };
  }

  // 4. Path parameter extraction
  const pathTenant = params.tenantSlug || params.tenantId;
  if (typeof pathTenant === "string" && pathTenant) {
    return { source: "path", slugOrId: pathTenant.toLowerCase() };
  }

  // 5. Query string extraction
  const queryTenant = query.tenant || query.tenantId || query.tenantSlug;
  if (typeof queryTenant === "string" && queryTenant) {
    return { source: "query", slugOrId: queryTenant.toLowerCase() };
  }

  return { source: "none", slugOrId: null };
}

// ───────────────────────────────────────────────
// Tenant Resolution
// ───────────────────────────────────────────────

/** Configuration for the tenant context resolver */
export interface TenantContextConfig {
  /** Platform domains that indicate subdomain extraction */
  platformDomains: string[];
  /** Default tenant when none is resolved (for single-tenant mode) */
  defaultTenantId?: string;
  /** Allow requests without a tenant (for platform-level routes) */
  allowNoTenant: boolean;
}

/** Default configuration */
const DEFAULT_CONFIG: TenantContextConfig = {
  platformDomains: ["company-os.com", "companyos.io", "localhost"],
  allowNoTenant: false,
};

/** Resolve tenant from request and attach to context */
export async function resolveTenantContext(
  req: {
    headers: Record<string, unknown>;
    params: Record<string, unknown>;
    query: Record<string, unknown>;
    hostname?: string;
    path?: string;
  },
  tenantManager: TenantManager,
  config: Partial<TenantContextConfig> = {}
): Promise<{ tenant: Tenant | null; source: string }> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Check if custom domain mapping is needed
  const hostname = req.hostname || "";
  const { source, slugOrId } = extractTenantIdentifier(req);

  if (!slugOrId) {
    if (mergedConfig.defaultTenantId) {
      const tenant = tenantManager.getTenant(mergedConfig.defaultTenantId);
      return { tenant: tenant || null, source: "default" };
    }
    return { tenant: null, source: "none" };
  }

  // Try to resolve as slug first
  let tenant = tenantManager.getTenantBySlug(slugOrId);

  // If not found by slug, try custom domain lookup
  if (!tenant && source === "custom-domain") {
    tenant = tenantManager.getTenantByCustomDomain(hostname);
  }

  // If still not found, try as ID
  if (!tenant) {
    tenant = tenantManager.getTenant(slugOrId);
  }

  return { tenant, source };
}

// ───────────────────────────────────────────────
// Express Middleware Factory
// ───────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

/** Create Express middleware that resolves and attaches tenant context */
export function createTenantContextMiddleware(
  tenantManager: TenantManager,
  config?: Partial<TenantContextConfig>
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenant, source } = await resolveTenantContext(req, tenantManager, config);

      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant.id;
        // Expose source for debugging/auditing
        Object.defineProperty(req, "tenantSource", {
          value: source,
          writable: false,
          enumerable: false,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Middleware that enforces a tenant is present */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenant || !req.tenantId) {
    res.status(400).json({
      error: "TENANT_REQUIRED",
      message: "Tenant identification is required for this endpoint.",
      hint: "Provide tenant via subdomain, custom domain, X-Tenant-ID header, or path parameter.",
    });
    return;
  }

  // Check tenant status
  if (req.tenant.status === "suspended") {
    res.status(403).json({
      error: "TENANT_SUSPENDED",
      message: `Tenant "${req.tenant.name}" has been suspended.`,
      contactSupport: true,
    });
    return;
  }

  if (req.tenant.status === "cancelled") {
    res.status(403).json({
      error: "TENANT_CANCELLED",
      message: `Tenant "${req.tenant.name}" has been cancelled.`,
      contactSupport: true,
    });
    return;
  }

  // Check expiration
  if (req.tenant.expiresAt && new Date() > req.tenant.expiresAt) {
    res.status(403).json({
      error: "TENANT_EXPIRED",
      message: `Tenant subscription has expired on ${req.tenant.expiresAt.toISOString()}.`,
      expiredAt: req.tenant.expiresAt.toISOString(),
    });
    return;
  }

  next();
}
