/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant API Routes                          ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * REST API endpoints for tenant management:
 * - Admin endpoints (protected): CRUD operations
 * - Public endpoints: Onboarding, branding, stylesheets
 * - Authenticated endpoints: Config, usage
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { TenantManager } from "../tenant/tenantManager";
import { BrandingEngine } from "../tenant/branding";
import { isValidSlug, isValidTenantPlan } from "../tenant/types";
import type {
  CreateTenantDTO,
  UpdateTenantDTO,
  TenantFilter,
  OnboardingDTO,
  TenantPlan,
} from "../tenant/types";

// ───────────────────────────────────────────────
// Router Factory
// ───────────────────────────────────────────────

export interface TenantRouterDependencies {
  tenantManager: TenantManager;
  brandingEngine: BrandingEngine;
  /** JWT verification middleware */
  authMiddleware: (req: Request, res: Response, next: () => void) => void;
  /** Admin role check middleware */
  isAdmin: (req: Request, res: Response, next: () => void) => void;
  /** Tenant admin role check middleware */
  isTenantAdmin: (req: Request, res: Response, next: () => void) => void;
}

export function createTenantRouter(deps: TenantRouterDependencies): Router {
  const { tenantManager, brandingEngine, authMiddleware, isAdmin, isTenantAdmin } =
    deps;
  const router = Router();

  // ─── Health Check ────────────────────────

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "tenant-api", timestamp: new Date().toISOString() });
  });

  // ═══════════════════════════════════════════
  // ADMIN ENDPOINTS (authMiddleware + isAdmin)
  // ═══════════════════════════════════════════

  /**
   * POST /api/tenant
   * Create a new tenant (admin only)
   */
  router.post("/", authMiddleware, isAdmin, (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;

      // Validate required fields
      if (!body.name || typeof body.name !== "string") {
        res.status(400).json({ error: "MISSING_NAME", message: "Tenant name is required." });
        return;
      }
      if (!body.slug || typeof body.slug !== "string") {
        res.status(400).json({ error: "MISSING_SLUG", message: "Tenant slug is required." });
        return;
      }

      const dto: CreateTenantDTO = {
        name: body.name,
        slug: body.slug,
        plan: isValidTenantPlan(body.plan) ? body.plan : "starter",
        branding:
          typeof body.branding === "object" && body.branding !== null
            ? (body.branding as CreateTenantDTO["branding"])
            : undefined,
        config:
          typeof body.config === "object" && body.config !== null
            ? (body.config as CreateTenantDTO["config"])
            : undefined,
        limits:
          typeof body.limits === "object" && body.limits !== null
            ? (body.limits as CreateTenantDTO["limits"])
            : undefined,
      };

      const tenant = tenantManager.createTenant(dto);
      res.status(201).json({
        success: true,
        data: tenant,
        links: {
          self: `/api/tenant/${tenant.id}`,
          branding: `/api/tenant/${tenant.slug}/branding`,
          login: `/login/${tenant.slug}`,
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /api/tenant
   * List all tenants (admin only)
   */
  router.get("/", authMiddleware, isAdmin, (req: Request, res: Response) => {
    try {
      const filter: TenantFilter = {
        status: req.query.status as TenantFilter["status"],
        plan: req.query.plan as TenantFilter["plan"],
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string, 10)
          : 50,
      };

      // Remove undefined values
      Object.keys(filter).forEach((key) => {
        if (filter[key as keyof TenantFilter] === undefined) {
          delete filter[key as keyof TenantFilter];
        }
      });

      const result = tenantManager.listTenants(filter);
      res.json({
        success: true,
        data: result,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /api/tenant/:id
   * Get a specific tenant (admin only)
   */
  router.get("/:id", authMiddleware, isAdmin, (req: Request, res: Response) => {
    try {
      const tenant = tenantManager.getTenant(String(req.params.id));
      if (!tenant) {
        res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
        return;
      }
      res.json({ success: true, data: tenant });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * PUT /api/tenant/:id
   * Update a tenant (admin only)
   */
  router.put("/:id", authMiddleware, isAdmin, (req: Request, res: Response) => {
    try {
      const existing = tenantManager.getTenant(String(req.params.id));
      if (!existing) {
        res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const dto: UpdateTenantDTO = {};

      if (body.name !== undefined) dto.name = body.name as string;
      if (body.slug !== undefined) dto.slug = body.slug as string;
      if (body.status !== undefined) dto.status = body.status as UpdateTenantDTO["status"];
      if (body.plan !== undefined && isValidTenantPlan(body.plan)) {
        dto.plan = body.plan;
      }
      if (body.branding !== undefined) dto.branding = body.branding as UpdateTenantDTO["branding"];
      if (body.config !== undefined) dto.config = body.config as UpdateTenantDTO["config"];
      if (body.limits !== undefined) dto.limits = body.limits as UpdateTenantDTO["limits"];

      const updated = tenantManager.updateTenant(String(req.params.id), dto);

      // Invalidate branding cache on update
      brandingEngine.invalidateCache(String(req.params.id));

      res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * DELETE /api/tenant/:id
   * Delete (soft-delete) a tenant (admin only)
   */
  router.delete("/:id", authMiddleware, isAdmin, (req: Request, res: Response) => {
    try {
      const existing = tenantManager.getTenant(String(req.params.id));
      if (!existing) {
        res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
        return;
      }

      tenantManager.deleteTenant(String(req.params.id));
      brandingEngine.invalidateCache(String(req.params.id));

      res.json({
        success: true,
        message: `Tenant "${existing.name}" has been scheduled for deletion.`,
        data: { id: String(req.params.id), status: "cancelled" },
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  // ─── Status Management ───────────────────

  /**
   * POST /api/tenant/:id/activate
   * Activate a trial tenant
   */
  router.post(
    "/:id/activate",
    authMiddleware,
    isAdmin,
    (req: Request, res: Response) => {
      try {
        const tenant = tenantManager.activateTenant(String(req.params.id));
        res.json({ success: true, data: tenant });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  /**
   * POST /api/tenant/:id/suspend
   * Suspend a tenant
   */
  router.post(
    "/:id/suspend",
    authMiddleware,
    isAdmin,
    (req: Request, res: Response) => {
      try {
        const body = req.body as Record<string, unknown>;
        const tenant = tenantManager.suspendTenant(
          String(req.params.id),
          (body.reason as string) || "No reason provided."
        );
        res.json({ success: true, data: tenant });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  /**
   * POST /api/tenant/:id/extend
   * Extend tenant expiration
   */
  router.post(
    "/:id/extend",
    authMiddleware,
    isAdmin,
    (req: Request, res: Response) => {
      try {
        const body = req.body as Record<string, unknown>;
        const days = typeof body.days === "number" ? body.days : 30;
        const tenant = tenantManager.extendTenant(String(req.params.id), days);
        res.json({ success: true, data: tenant });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  // ═══════════════════════════════════════════
  // PLAN MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * POST /api/tenant/:id/upgrade
   * Upgrade tenant plan
   */
  router.post(
    "/:id/upgrade",
    authMiddleware,
    isAdmin,
    (req: Request, res: Response) => {
      try {
        const body = req.body as Record<string, unknown>;
        if (!body.plan || !isValidTenantPlan(body.plan)) {
          res.status(400).json({
            error: "INVALID_PLAN",
            message: "Valid target plan is required.",
            validPlans: ["starter", "professional", "enterprise"],
          });
          return;
        }

        const tenant = tenantManager.updateTenant(String(req.params.id), { plan: body.plan as TenantPlan });
        res.json({ success: true, data: tenant });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  /**
   * POST /api/tenant/:id/downgrade
   * Downgrade tenant plan
   */
  router.post(
    "/:id/downgrade",
    authMiddleware,
    isAdmin,
    (req: Request, res: Response) => {
      try {
        const body = req.body as Record<string, unknown>;
        if (!body.plan || !isValidTenantPlan(body.plan)) {
          res.status(400).json({
            error: "INVALID_PLAN",
            message: "Valid target plan is required.",
            validPlans: ["starter", "professional", "enterprise"],
          });
          return;
        }

        const tenant = tenantManager.downgradePlan(String(req.params.id), body.plan as TenantPlan);
        res.json({ success: true, data: tenant });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  // ═══════════════════════════════════════════
  // SELF-SERVICE ONBOARDING (Public)
  // ═══════════════════════════════════════════

  /**
   * POST /api/tenant/onboard
   * Self-service tenant onboarding (no auth required)
   */
  router.post("/onboard", async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;

      // Validate required fields
      const requiredFields = ["companyName", "slug", "email", "password", "adminName"];
      const missing = requiredFields.filter((f) => !body[f]);
      if (missing.length > 0) {
        res.status(400).json({
          error: "MISSING_FIELDS",
          message: `Missing required fields: ${missing.join(", ")}`,
        });
        return;
      }

      if (!isValidSlug(body.slug)) {
        res.status(400).json({
          error: "INVALID_SLUG",
          message: "Slug must contain only lowercase letters, numbers, and hyphens.",
        });
        return;
      }

      const plan = isValidTenantPlan(body.plan) ? body.plan : "starter";

      const dto: OnboardingDTO = {
        companyName: body.companyName as string,
        slug: body.slug as string,
        email: body.email as string,
        password: body.password as string,
        adminName: body.adminName as string,
        plan,
        billingEmail: body.billingEmail as string | undefined,
        agreedToTerms: body.agreedToTerms === true,
      };

      const result = await tenantManager.onboardTenant(dto);

      res.status(201).json({
        success: true,
        message: `Welcome aboard! Your tenant "${result.tenant.name}" has been created.`,
        data: {
          tenant: {
            id: result.tenant.id,
            slug: result.tenant.slug,
            name: result.tenant.name,
            plan: result.tenant.plan,
            status: result.tenant.status,
            expiresAt: result.tenant.expiresAt?.toISOString(),
          },
          adminUser: result.adminUser,
        },
        links: {
          login: `/login/${result.tenant.slug}`,
          setup: result.setupUrl,
          dashboard: `/dashboard/${result.tenant.slug}`,
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /api/tenant/check-slug/:slug
   * Check if a slug is available (public)
   */
  router.get("/check-slug/:slug", (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      if (!isValidSlug(slug)) {
        res.status(400).json({
          error: "INVALID_SLUG",
          available: false,
          message: "Invalid slug format.",
        });
        return;
      }

      const existing = tenantManager.getTenantBySlug(slug);
      res.json({
        slug,
        available: !existing,
        ...(existing && {
          message: `Slug "${slug}" is already taken.`,
          suggestions: generateSlugSuggestions(slug),
        }),
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  // ═══════════════════════════════════════════
  // BRANDING (Public)
  // ═══════════════════════════════════════════

  /**
   * GET /api/tenant/:slug/branding
   * Get tenant branding configuration (public)
   */
  router.get("/:slug/branding", (req: Request, res: Response) => {
    try {
      const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
      if (!tenant) {
        res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
        return;
      }

      const config = brandingEngine.getBrandingConfig(tenant.id);
      res.json({ success: true, data: config });
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /api/tenant/:slug/styles.css
   * Get tenant stylesheet (public)
   */
  router.get("/:slug/styles.css", (req: Request, res: Response) => {
    try {
      const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
      if (!tenant) {
        res.status(404).type("text/css").send("/* Tenant not found */");
        return;
      }

      const stylesheet = brandingEngine.getStylesheet(tenant.id);
      res.type("text/css").send(stylesheet);
    } catch (error) {
      res.status(500).type("text/css").send(`/* Error: ${(error as Error).message} */`);
    }
  });

  // ═══════════════════════════════════════════
  // TENANT CONFIG (Authenticated)
  // ═══════════════════════════════════════════

  /**
   * GET /api/tenant/:slug/config
   * Get tenant config (tenant members)
   */
  router.get(
    "/:slug/config",
    authMiddleware,
    (req: Request, res: Response) => {
      try {
        const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
        if (!tenant) {
          res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
          return;
        }

        res.json({
          success: true,
          data: {
            config: tenant.config,
            limits: tenant.limits,
            plan: tenant.plan,
            usage: tenantManager.getTenantUsage(tenant.id),
          },
        });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  /**
   * PUT /api/tenant/:slug/config
   * Update tenant config (tenant admin only)
   */
  router.put(
    "/:slug/config",
    authMiddleware,
    isTenantAdmin,
    (req: Request, res: Response) => {
      try {
        const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
        if (!tenant) {
          res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
          return;
        }

        const body = req.body as Record<string, unknown>;
        const dto: UpdateTenantDTO = {};

        if (body.branding !== undefined) {
          dto.branding = body.branding as UpdateTenantDTO["branding"];
        }
        // Only allow branding updates via this endpoint
        // Plan/config changes require admin access

        const updated = tenantManager.updateTenant(tenant.id, dto);
        brandingEngine.invalidateCache(tenant.id);

        res.json({ success: true, data: updated });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  // ─── Usage & Limits ──────────────────────

  /**
   * GET /api/tenant/:slug/usage
   * Get tenant usage stats (authenticated)
   */
  router.get(
    "/:slug/usage",
    authMiddleware,
    (req: Request, res: Response) => {
      try {
        const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
        if (!tenant) {
          res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
          return;
        }

        const usage = tenantManager.getTenantUsage(tenant.id);
        const limitCheck = tenantManager.checkLimits(tenant.id);

        res.json({
          success: true,
          data: {
            usage,
            limits: tenant.limits,
            config: {
              maxAgents: tenant.config.maxAgents,
              maxUsers: tenant.config.maxUsers,
              maxWorkflows: tenant.config.maxWorkflows,
            },
            withinLimits: limitCheck.withinLimits,
            violations: limitCheck.violations,
            plan: tenant.plan,
          },
        });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  // ─── Limits Check ────────────────────────

  /**
   * GET /api/tenant/:slug/limits
   * Check if tenant is within limits (authenticated)
   */
  router.get(
    "/:slug/limits",
    authMiddleware,
    (req: Request, res: Response) => {
      try {
        const tenant = tenantManager.getTenantBySlug(String(req.params.slug));
        if (!tenant) {
          res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found." });
          return;
        }

        const result = tenantManager.checkLimits(tenant.id);
        res.json({
          success: true,
          data: {
            withinLimits: result.withinLimits,
            violations: result.violations,
          },
        });
      } catch (error) {
        handleError(error, res);
      }
    }
  );

  return router;
}

// ───────────────────────────────────────────────
// Error Handler
// ───────────────────────────────────────────────

import { TenantManagerError } from "../tenant/tenantManager";

function handleError(error: unknown, res: Response): void {
  if (error instanceof TenantManagerError) {
    res.status(400).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "An unknown error occurred.",
  });
}

// ───────────────────────────────────────────────
// Slug Suggestion Generator
// ───────────────────────────────────────────────

function generateSlugSuggestions(base: string): string[] {
  const suggestions: string[] = [];
  const suffixes = ["-hq", "-app", "-team", "-co", "-io", "-labs", "-corp"];

  for (const suffix of suffixes) {
    suggestions.push(`${base}${suffix}`);
  }

  // Add number suffixes
  for (let i = 2; i <= 5; i++) {
    suggestions.push(`${base}-${i}`);
  }

  return suggestions.slice(0, 5);
}
