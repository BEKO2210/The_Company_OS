/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant System Barrel Export               ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

// Types
export * from "./types";

// Tenant Manager
export { TenantManager, TenantManagerError } from "./tenantManager";
export type { TenantChangeEvent } from "./tenantManager";

// Tenant Context & Middleware
export {
  extractTenantIdentifier,
  resolveTenantContext,
  createTenantContextMiddleware,
  requireTenant,
} from "./tenantContext";
export type { TenantContextConfig, ExtractionResult } from "./tenantContext";

// Data Isolation
export {
  addTenantFilter,
  addTenantInsertColumn,
  createTenantIsolation,
  createTenantScopedRepository,
  extractTenantId,
  isSharedTable,
  parseQuery,
  withTenantScope,
  DEFAULT_ISOLATION_CONFIG,
} from "./isolation";
export type {
  IsolationConfig,
  TenantScopedRepository,
} from "./isolation";

// Branding Engine
export { BrandingEngine, isValidColor, isValidLogoUrl } from "./branding";
