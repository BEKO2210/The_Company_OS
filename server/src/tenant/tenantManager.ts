/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant Manager                             ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Central management hub for all tenant lifecycle operations:
 * - CRUD operations on tenants
 * - Self-service onboarding with automated provisioning
 * - Plan management (upgrades / downgrades)
 * - Status transitions (active, suspended, trial, cancelled)
 * - Custom domain resolution
 *
 * Uses an in-memory store with SQLite persistence.
 */

import {
  type Tenant,
  type CreateTenantDTO,
  type UpdateTenantDTO,
  type TenantFilter,
  type TenantListResponse,
  type OnboardingDTO,
  type OnboardingResult,
  type TenantPlan,
  type TenantBranding,
  type TenantConfig,
  type TenantLimits,
  type TenantUsage,
  isValidSlug,
} from "./types";

// ───────────────────────────────────────────────
// Plan Defaults
// ───────────────────────────────────────────────

/** Feature sets per plan */
const PLAN_FEATURES: Record<TenantPlan, string[]> = {
  starter: ["agents", "workflows", "dashboard", "api-access"],
  professional: [
    "agents",
    "workflows",
    "dashboard",
    "api-access",
    "sso",
    "custom-integrations",
    "advanced-analytics",
    "team-collaboration",
  ],
  enterprise: [
    "agents",
    "workflows",
    "dashboard",
    "api-access",
    "sso",
    "custom-integrations",
    "advanced-analytics",
    "team-collaboration",
    "white-label",
    "priority-support",
    "audit-log",
    "dedicated-infra",
  ],
};

/** Modules per plan */
const PLAN_MODULES: Record<TenantPlan, string[]> = {
  starter: ["core"],
  professional: ["core", "analytics", "integrations"],
  enterprise: ["core", "analytics", "integrations", "white-label", "billing"],
};

/** Default configs per plan */
const PLAN_CONFIGS: Record<TenantPlan, Omit<TenantConfig, "features" | "modules">> = {
  starter: {
    maxAgents: 3,
    maxUsers: 5,
    maxWorkflows: 10,
    allowCustomIntegrations: false,
    allowApiAccess: true,
    allowSso: false,
    allowSubBranding: false,
  },
  professional: {
    maxAgents: 10,
    maxUsers: 25,
    maxWorkflows: 50,
    allowCustomIntegrations: true,
    allowApiAccess: true,
    allowSso: true,
    allowSubBranding: false,
  },
  enterprise: {
    maxAgents: 100,
    maxUsers: 500,
    maxWorkflows: 500,
    allowCustomIntegrations: true,
    allowApiAccess: true,
    allowSso: true,
    allowSubBranding: true,
  },
};

/** Default limits per plan */
const PLAN_LIMITS: Record<TenantPlan, Omit<TenantLimits, "currency">> = {
  starter: { maxMonthlyBudget: 100, maxStorage: 1024, maxApiCalls: 10000 },
  professional: { maxMonthlyBudget: 1000, maxStorage: 10240, maxApiCalls: 100000 },
  enterprise: { maxMonthlyBudget: 10000, maxStorage: 102400, maxApiCalls: 1000000 },
};

/** Trial period in days */
const TRIAL_DAYS = 14;

// ───────────────────────────────────────────────
// Tenant Manager Class
// ───────────────────────────────────────────────

export class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private slugIndex: Map<string, string> = new Map();
  private domainIndex: Map<string, string> = new Map();
  private onChangeListeners: Array<(event: TenantChangeEvent) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  // ─── CRUD Operations ─────────────────────

  /** Create a new tenant with plan-based defaults */
  createTenant(data: CreateTenantDTO): Tenant {
    // Validate slug
    if (!isValidSlug(data.slug)) {
      throw new TenantManagerError(
        "INVALID_SLUG",
        `Slug "${data.slug}" is invalid. Use lowercase letters, numbers, and hyphens only.`
      );
    }

    // Check slug uniqueness
    if (this.slugIndex.has(data.slug)) {
      throw new TenantManagerError(
        "DUPLICATE_SLUG",
        `Slug "${data.slug}" is already in use.`
      );
    }

    const plan = data.plan || "starter";
    const now = new Date();
    const id = generateTenantId(data.slug);

    const tenant: Tenant = {
      id,
      slug: data.slug,
      name: data.name,
      status: "trial",
      plan,
      branding: this.buildDefaultBranding(data.branding, data.name, data.slug),
      config: this.buildConfig(plan, data.config),
      limits: this.buildLimits(plan, data.limits),
      createdAt: now,
      expiresAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      updatedAt: now,
    };

    this.tenants.set(id, tenant);
    this.slugIndex.set(data.slug, id);
    this.persist();
    this.emitChange({ type: "created", tenant });

    return tenant;
  }

  /** Get tenant by ID */
  getTenant(id: string): Tenant | null {
    return this.tenants.get(id) || null;
  }

  /** Get tenant by slug */
  getTenantBySlug(slug: string): Tenant | null {
    const id = this.slugIndex.get(slug);
    return id ? this.tenants.get(id) || null : null;
  }

  /** Get tenant by custom domain */
  getTenantByCustomDomain(domain: string): Tenant | null {
    const id = this.domainIndex.get(domain);
    return id ? this.tenants.get(id) || null : null;
  }

  /** Update tenant properties */
  updateTenant(id: string, data: UpdateTenantDTO): Tenant {
    const tenant = this.tenants.get(id);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${id}" not found.`);
    }

    const updated: Tenant = {
      ...tenant,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.plan !== undefined && { plan: data.plan }),
      ...(data.branding !== undefined && {
        branding: { ...tenant.branding, ...data.branding },
      }),
      ...(data.config !== undefined && {
        config: { ...tenant.config, ...data.config },
      }),
      ...(data.limits !== undefined && {
        limits: { ...tenant.limits, ...data.limits },
      }),
      updatedAt: new Date(),
    };

    // Handle slug change
    if (data.slug && data.slug !== tenant.slug) {
      if (!isValidSlug(data.slug)) {
        throw new TenantManagerError("INVALID_SLUG", `Slug "${data.slug}" is invalid.`);
      }
      if (this.slugIndex.has(data.slug) && data.slug !== tenant.slug) {
        throw new TenantManagerError("DUPLICATE_SLUG", `Slug "${data.slug}" already in use.`);
      }
      this.slugIndex.delete(tenant.slug);
      this.slugIndex.set(data.slug, id);
      updated.slug = data.slug;
    }

    // Handle custom domain change
    if (data.branding?.customDomain && data.branding.customDomain !== tenant.branding.customDomain) {
      if (tenant.branding.customDomain) {
        this.domainIndex.delete(tenant.branding.customDomain);
      }
      this.domainIndex.set(data.branding.customDomain, id);
    }

    this.tenants.set(id, updated);
    this.persist();
    this.emitChange({ type: "updated", tenant: updated });

    return updated;
  }

  /** Suspend a tenant */
  suspendTenant(id: string, reason: string): Tenant {
    const tenant = this.getTenant(id);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${id}" not found.`);
    }

    const updated = this.updateTenant(id, {
      status: "suspended",
    });

    this.emitChange({ type: "suspended", tenant: updated, reason });
    return updated;
  }

  /** Delete a tenant (soft-delete by setting cancelled) */
  deleteTenant(id: string): void {
    const tenant = this.getTenant(id);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${id}" not found.`);
    }

    this.updateTenant(id, { status: "cancelled" });
    this.emitChange({ type: "deleted", tenant: { ...tenant, status: "cancelled" } });
  }

  /** Hard delete - use with caution */
  permanentlyDeleteTenant(id: string): void {
    const tenant = this.tenants.get(id);
    if (tenant) {
      this.slugIndex.delete(tenant.slug);
      if (tenant.branding.customDomain) {
        this.domainIndex.delete(tenant.branding.customDomain);
      }
      this.tenants.delete(id);
      this.persist();
      this.emitChange({ type: "deleted", tenant });
    }
  }

  /** List tenants with optional filtering */
  listTenants(filter?: TenantFilter): TenantListResponse {
    let results = Array.from(this.tenants.values());

    if (filter) {
      if (filter.status) {
        results = results.filter((t) => t.status === filter.status);
      }
      if (filter.plan) {
        results = results.filter((t) => t.plan === filter.plan);
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        results = results.filter(
          (t) =>
            t.name.toLowerCase().includes(search) ||
            t.slug.toLowerCase().includes(search)
        );
      }
      if (filter.createdAfter) {
        results = results.filter((t) => t.createdAt >= filter.createdAfter!);
      }
      if (filter.createdBefore) {
        results = results.filter((t) => t.createdAt <= filter.createdBefore!);
      }
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const page = filter?.page || 1;
    const pageSize = filter?.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    return { tenants: paginated, total, page, pageSize };
  }

  // ─── Self-Service Onboarding ─────────────

  /** Complete self-service onboarding flow */
  async onboardTenant(data: OnboardingDTO): Promise<OnboardingResult> {
    // Validate
    if (!data.agreedToTerms) {
      throw new TenantManagerError("TERMS_REQUIRED", "You must agree to the terms of service.");
    }

    if (!isValidSlug(data.slug)) {
      throw new TenantManagerError(
        "INVALID_SLUG",
        `Slug "${data.slug}" is invalid. Use lowercase letters, numbers, and hyphens only.`
      );
    }

    // Check slug availability
    if (this.slugIndex.has(data.slug)) {
      throw new TenantManagerError(
        "SLUG_TAKEN",
        `The slug "${data.slug}" is already taken. Please choose another.`
      );
    }

    // Check email uniqueness (would query user DB in production)
    // For now, we trust the input

    // 1. Create tenant
    const tenant = this.createTenant({
      name: data.companyName,
      slug: data.slug,
      plan: data.plan,
      branding: {
        companyName: data.companyName,
        emailFrom: data.billingEmail || data.email,
      },
    });

    // 2. Create admin user
    const adminUser = await this.createAdminUser({
      tenantId: tenant.id,
      email: data.email,
      password: data.password,
      name: data.adminName,
    });

    // 3. Generate setup URL
    const setupUrl = `/setup/${tenant.slug}?token=${generateSetupToken(tenant.id)}`;

    // 4. Send welcome email (mock)
    this.sendWelcomeEmail(tenant, adminUser);

    this.emitChange({ type: "onboarded", tenant });

    return {
      tenant,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      setupUrl,
    };
  }

  // ─── Plan Management ─────────────────────

  /** Upgrade tenant to a higher plan */
  upgradePlan(tenantId: string, newPlan: TenantPlan): Tenant {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${tenantId}" not found.`);
    }

    const planOrder: TenantPlan[] = ["starter", "professional", "enterprise"];
    const currentIndex = planOrder.indexOf(tenant.plan);
    const newIndex = planOrder.indexOf(newPlan);

    if (newIndex <= currentIndex) {
      throw new TenantManagerError(
        "INVALID_UPGRADE",
        `Cannot upgrade from ${tenant.plan} to ${newPlan}. Use downgradePlan instead.`
      );
    }

    // Build new config and limits based on new plan
    const updated = this.updateTenant(tenantId, {
      plan: newPlan,
      config: this.buildConfig(newPlan),
      limits: this.buildLimits(newPlan),
    });

    this.emitChange({ type: "plan-upgraded", tenant: updated, fromPlan: tenant.plan, toPlan: newPlan });
    return updated;
  }

  /** Downgrade tenant to a lower plan */
  downgradePlan(tenantId: string, newPlan: TenantPlan): Tenant {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${tenantId}" not found.`);
    }

    const planOrder: TenantPlan[] = ["starter", "professional", "enterprise"];
    const currentIndex = planOrder.indexOf(tenant.plan);
    const newIndex = planOrder.indexOf(newPlan);

    if (newIndex >= currentIndex) {
      throw new TenantManagerError(
        "INVALID_DOWNGRADE",
        `Cannot downgrade from ${tenant.plan} to ${newPlan}. Use upgradePlan instead.`
      );
    }

    const updated = this.updateTenant(tenantId, {
      plan: newPlan,
      config: this.buildConfig(newPlan),
      limits: this.buildLimits(newPlan),
    });

    this.emitChange({ type: "plan-downgraded", tenant: updated, fromPlan: tenant.plan, toPlan: newPlan });
    return updated;
  }

  /** Activate a trial tenant */
  activateTenant(tenantId: string): Tenant {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${tenantId}" not found.`);
    }

    if (tenant.status !== "trial") {
      throw new TenantManagerError(
        "INVALID_STATUS_TRANSITION",
        `Cannot activate tenant with status "${tenant.status}". Only "trial" can be activated.`
      );
    }

    return this.updateTenant(tenantId, { status: "active" });
  }

  /** Renew or extend tenant expiration */
  extendTenant(tenantId: string, days: number): Tenant {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new TenantManagerError("NOT_FOUND", `Tenant "${tenantId}" not found.`);
    }

    const baseDate = tenant.expiresAt || new Date();
    const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    return this.updateTenant(tenantId, { status: "active", expiresAt: newExpiresAt } as UpdateTenantDTO);
  }

  // ─── Usage & Analytics ───────────────────

  /** Get current usage for a tenant */
  getTenantUsage(_tenantId: string): TenantUsage {
    // In production, these would be real-time counts from the database
    // For now, return mock data structure
    return {
      agentsUsed: 0,
      usersUsed: 1, // Admin user
      workflowsUsed: 0,
      storageUsed: 0,
      apiCallsUsed: 0,
      budgetUsed: 0,
    };
  }

  /** Check if tenant has exceeded any limits */
  checkLimits(tenantId: string): { withinLimits: boolean; violations: string[] } {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      return { withinLimits: false, violations: ["Tenant not found"] };
    }

    const usage = this.getTenantUsage(tenantId);
    const violations: string[] = [];

    if (usage.agentsUsed >= tenant.config.maxAgents) {
      violations.push(`Agent limit exceeded: ${usage.agentsUsed}/${tenant.config.maxAgents}`);
    }
    if (usage.usersUsed >= tenant.config.maxUsers) {
      violations.push(`User limit exceeded: ${usage.usersUsed}/${tenant.config.maxUsers}`);
    }
    if (usage.workflowsUsed >= tenant.config.maxWorkflows) {
      violations.push(`Workflow limit exceeded: ${usage.workflowsUsed}/${tenant.config.maxWorkflows}`);
    }
    if (usage.storageUsed >= tenant.limits.maxStorage) {
      violations.push(`Storage limit exceeded: ${usage.storageUsed}MB/${tenant.limits.maxStorage}MB`);
    }

    return { withinLimits: violations.length === 0, violations };
  }

  // ─── Event System ────────────────────────

  /** Subscribe to tenant changes */
  onChange(listener: (event: TenantChangeEvent) => void): () => void {
    this.onChangeListeners.push(listener);
    return () => {
      this.onChangeListeners = this.onChangeListeners.filter((l) => l !== listener);
    };
  }

  private emitChange(event: TenantChangeEvent): void {
    for (const listener of this.onChangeListeners) {
      try {
        listener(event);
      } catch (_error) {
        // Prevent listener errors from cascading
      }
    }
  }

  // ─── Persistence ─────────────────────────

  private persist(): void {
    try {
      const data = Array.from(this.tenants.values());
      // In production, write to SQLite
      // For demo: attempt localStorage-style persistence via fs if available
      globalThis.__tenantData = JSON.stringify(data, null, 2);
    } catch {
      // Silent fail for environments without write access
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = (globalThis as Record<string, unknown>).__tenantData;
      if (typeof raw === "string") {
        const data: Tenant[] = JSON.parse(raw);
        for (const tenant of data) {
          this.tenants.set(tenant.id, reviveDates(tenant));
          this.slugIndex.set(tenant.slug, tenant.id);
          if (tenant.branding.customDomain) {
            this.domainIndex.set(tenant.branding.customDomain, tenant.id);
          }
        }
      }
    } catch {
      // Start fresh
    }
  }

  // ─── Internal Helpers ────────────────────

  private buildDefaultBranding(
    partial?: Partial<TenantBranding>,
    name?: string,
    slug?: string
  ): TenantBranding {
    return {
      primaryColor: "#2563eb", // blue-600
      secondaryColor: "#475569", // slate-600
      logoUrl: undefined,
      faviconUrl: undefined,
      companyName: name || slug || "My Company",
      customDomain: undefined,
      emailFrom: partial?.emailFrom || `noreply@${slug || "company"}.com`,
      tagline: partial?.tagline,
      footerText: partial?.footerText,
      ...partial,
    };
  }

  private buildConfig(
    plan: TenantPlan,
    partial?: Partial<TenantConfig>
  ): TenantConfig {
    return {
      ...PLAN_CONFIGS[plan],
      features: PLAN_FEATURES[plan],
      modules: PLAN_MODULES[plan],
      ...partial,
    };
  }

  private buildLimits(
    plan: TenantPlan,
    partial?: Partial<TenantLimits>
  ): TenantLimits {
    return {
      ...PLAN_LIMITS[plan],
      currency: partial?.currency || "EUR",
      ...partial,
    };
  }

  /** Create admin user (placeholder for real user management) */
  private async createAdminUser(data: {
    tenantId: string;
    email: string;
    password: string;
    name: string;
  }): Promise<{ id: string; email: string; name: string; role: string }> {
    // In production: hash password, write to users table
    return {
      id: `usr_${generateTenantId(data.email)}`,
      email: data.email,
      name: data.name,
      role: "admin",
    };
  }

  /** Send welcome email (mock implementation) */
  private sendWelcomeEmail(
    tenant: Tenant,
    user: { id: string; email: string; name: string }
  ): void {
    // In production: integrate with email service
    const mockEmail = {
      to: user.email,
      from: tenant.branding.emailFrom,
      subject: `Welcome to ${tenant.branding.companyName}!`,
      body: `Hi ${user.name},\n\nYour tenant "${tenant.name}" has been created.\nLogin: /login/${tenant.slug}\n\nBest regards,\nThe Company OS Team`,
    };
    // Log for development
        console.log("[Mock Email]", mockEmail);
  }
}

// ───────────────────────────────────────────────
// Tenant Manager Error
// ───────────────────────────────────────────────

export class TenantManagerError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "TenantManagerError";
  }
}

// ───────────────────────────────────────────────
// Change Event Type
// ───────────────────────────────────────────────

export interface TenantChangeEvent {
  type:
    | "created"
    | "updated"
    | "deleted"
    | "suspended"
    | "onboarded"
    | "plan-upgraded"
    | "plan-downgraded";
  tenant: Tenant;
  reason?: string;
  fromPlan?: TenantPlan;
  toPlan?: TenantPlan;
}

// ───────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────

/** Generate a tenant-scoped ID */
function generateTenantId(slug: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const slugHash = slug
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TEN-${timestamp}-${slugHash}-${random}`;
}

/** Generate a one-time setup token */
function generateSetupToken(tenantId: string): string {
  const ts = Date.now().toString(36);
  const hash = tenantId.slice(-6);
  return `setup_${ts}_${hash}`;
}

/** Revive date strings back to Date objects */
function reviveDates(tenant: Tenant): Tenant {
  return {
    ...tenant,
    createdAt: new Date(tenant.createdAt),
    expiresAt: tenant.expiresAt ? new Date(tenant.expiresAt) : undefined,
    updatedAt: new Date(tenant.updatedAt),
  };
}

// Declare global for in-memory persistence
declare global {
    var __tenantData: string | undefined;
}
