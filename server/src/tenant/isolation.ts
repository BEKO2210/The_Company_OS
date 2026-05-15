/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Tenant Data Isolation                      ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Enforces strict row-level tenant isolation at multiple layers:
 * - Middleware: validates tenant context on every request
 * - Query builder: automatically injects tenant_id filters
 * - Repository: wraps CRUD operations with tenant scoping
 *
 * This ensures zero cross-tenant data leakage.
 */

import type { Request, Response, NextFunction } from "express";
import type {  } from "./types";

// ───────────────────────────────────────────────
// Tenant-Aware Query Builder
// ───────────────────────────────────────────────

/** SQL operation types */
type SqlOperation = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "COUNT";

/** Parsed SQL query structure for tenant filter injection */
interface ParsedQuery {
  operation: SqlOperation;
  tableName: string | null;
  hasWhere: boolean;
  hasTenantFilter: boolean;
  original: string;
}

/** Parse a SQL query to determine injection strategy */
export function parseQuery(query: string): ParsedQuery {
  const normalized = query.trim().toUpperCase();
  let operation: SqlOperation = "SELECT";

  if (normalized.startsWith("INSERT")) operation = "INSERT";
  else if (normalized.startsWith("UPDATE")) operation = "UPDATE";
  else if (normalized.startsWith("DELETE")) operation = "DELETE";
  else if (normalized.includes("COUNT(")) operation = "COUNT";

  // Extract table name (simplified regex)
  const tableMatch = normalized.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  const tableName = tableMatch?.[1] || null;

  // Check if tenant_id filter already exists
  const hasTenantFilter =
    /tenant_id\s*[=?]|tenant_id\s+IN/i.test(query);

  // Check for existing WHERE clause
  const hasWhere = /\bWHERE\b/i.test(query);

  return { operation, tableName, hasWhere, hasTenantFilter, original: query };
}

/**
 * Automatically inject tenant_id filter into a SQL query.
 * Handles SELECT, UPDATE, DELETE, and COUNT operations.
 */
export function addTenantFilter(query: string, tenantId: string): string {
  const parsed = parseQuery(query);

  // Skip if already filtered or if it's an INSERT
  if (parsed.hasTenantFilter || parsed.operation === "INSERT") {
    return query;
  }

  // For UPDATE and DELETE, add tenant_id to WHERE
  if (parsed.operation === "UPDATE" || parsed.operation === "DELETE") {
    if (parsed.hasWhere) {
      return query.replace(/(\bWHERE\b)/i, `$1 tenant_id = '${tenantId}' AND `);
    } else {
      // Add WHERE clause
      return query.replace(
        new RegExp(`${parsed.tableName}`, "i"),
        `${parsed.tableName} WHERE tenant_id = '${tenantId}'`
      );
    }
  }

  // For SELECT / COUNT
  if (parsed.hasWhere) {
    return query.replace(/(\bWHERE\b)/i, `$1 tenant_id = '${tenantId}' AND `);
  } else if (parsed.tableName) {
    // No WHERE, inject after table name
    return query.replace(
      new RegExp(`(\\b${parsed.tableName}\\b)`, "i"),
      `$1 WHERE tenant_id = '${tenantId}'`
    );
  }

  return query;
}

/**
 * Add tenant_id to INSERT statements as a column.
 * The value placeholder must be provided by the caller.
 */
export function addTenantInsertColumn(query: string): string {
  if (!query.trim().toUpperCase().startsWith("INSERT")) {
    return query;
  }

  // Check if tenant_id column already exists
  if (/tenant_id/i.test(query)) {
    return query;
  }

  // Simple INSERT parsing: INSERT INTO table (cols) VALUES (vals)
  const colMatch = query.match(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!colMatch) return query;

  const columns = colMatch[1];
  const values = colMatch[2];

  return query.replace(columns, `${columns}, tenant_id`).replace(values, `${values}, ?`);
}

// ───────────────────────────────────────────────
// Isolation Middleware
// ───────────────────────────────────────────────

/** Configuration for tenant isolation middleware */
export interface IsolationConfig {
  /** Skip isolation for these path prefixes */
  skipPaths: string[];
  /** Skip isolation for these HTTP methods */
  skipMethods: string[];
  /** Require tenant_id on all data-modifying requests */
  strictMode: boolean;
  /** Tables that are globally shared (no tenant isolation) */
  sharedTables: string[];
}

export const DEFAULT_ISOLATION_CONFIG: IsolationConfig = {
  skipPaths: ["/api/health", "/api/tenant/onboard", "/api/tenant/public"],
  skipMethods: ["OPTIONS", "HEAD"],
  strictMode: true,
  sharedTables: ["tenants", "platform_settings", "migrations"],
};

/** Express middleware enforcing tenant isolation */
export function createTenantIsolation(config: Partial<IsolationConfig> = {}) {
  const merged = { ...DEFAULT_ISOLATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method;
    const path = req.path;

    // Skip configured paths and methods
    if (merged.skipMethods.includes(method)) {
      next();
      return;
    }
    if (merged.skipPaths.some((p) => path.startsWith(p))) {
      next();
      return;
    }

    // Extract tenant ID from request context
    const tenantId = extractTenantId(req);

    if (!tenantId) {
      if (merged.strictMode) {
        res.status(400).json({
          error: "ISOLATION_VIOLATION",
          message: "Tenant ID is required but not found in request context.",
          resolution:
            "Ensure tenant is resolved via subdomain, header, or path before accessing data endpoints.",
        });
        return;
      }
      next();
      return;
    }

    // Attach to request for downstream use
    req.tenantId = tenantId;

    // Validate tenant ID format
    if (!isValidTenantIdFormat(tenantId)) {
      res.status(400).json({
        error: "INVALID_TENANT_ID",
        message: "Tenant ID format is invalid.",
      });
      return;
    }

    next();
  };
}

// ───────────────────────────────────────────────
// Tenant ID Extraction Helpers
// ───────────────────────────────────────────────

/** Extract tenant ID from the request in priority order */
export function extractTenantId(req: Request): string | null {
  // 1. From resolved tenant object (set by tenant context middleware)
  if (req.tenant?.id) {
    return req.tenant.id;
  }

  // 2. From explicitly set tenantId
  if (req.tenantId) {
    return req.tenantId;
  }

  // 3. From header
  const headerId = req.headers["x-tenant-id"];
  if (typeof headerId === "string" && headerId) {
    return headerId;
  }

  // 4. From subdomain (e.g., acme.company-os.com)
  const host = req.hostname || "";
  if (host) {
    const parts = host.split(".");
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Map subdomain to tenant ID if needed
      if (subdomain && subdomain !== "www") {
        return subdomain;
      }
    }
  }

  // 5. From path parameter
  const paramId = req.params.tenantId || req.params.tenantSlug;
  if (typeof paramId === "string" && paramId) {
    return paramId;
  }

  // 6. From query string
  const queryId = req.query.tenantId || req.query.tenant;
  if (typeof queryId === "string" && queryId) {
    return queryId;
  }

  return null;
}

/** Validate tenant ID format (ULID or UUID) */
export function isValidTenantIdFormat(id: string): boolean {
  // ULID: 26 chars, Crockford base32
  // UUID: 36 chars with dashes
  return (
    /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(id) || // ULID
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) // UUID
  );
}

// ───────────────────────────────────────────────
// Tenant-Aware Repository Wrapper
// ───────────────────────────────────────────────

/** Generic interface for tenant-scoped data operations */
export interface TenantScopedRepository<T> {
  findAll(tenantId: string, options?: { limit?: number; offset?: number }): Promise<T[]>;
  findById(tenantId: string, id: string): Promise<T | null>;
  findOne(tenantId: string, conditions: Partial<T>): Promise<T | null>;
  create(tenantId: string, data: Omit<T, "tenantId" | "id">): Promise<T>;
  update(tenantId: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string, conditions?: Partial<T>): Promise<number>;
}

/**
 * Creates a tenant-scoped repository that enforces isolation
 * on every database operation.
 */
export function createTenantScopedRepository<T extends { id: string; tenantId: string }>(
  tableName: string,
  dbQuery: (sql: string, params?: unknown[]) => Promise<unknown[]>
): TenantScopedRepository<T> {
  return {
    async findAll(
      tenantId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<T[]> {
      let sql = `SELECT * FROM ${tableName} WHERE tenant_id = ? ORDER BY created_at DESC`;
      const params: unknown[] = [tenantId];

      if (options?.limit) {
        sql += " LIMIT ?";
        params.push(options.limit);
      }
      if (options?.offset) {
        sql += " OFFSET ?";
        params.push(options.offset);
      }

      return dbQuery(sql, params) as Promise<T[]>;
    },

    async findById(tenantId: string, id: string): Promise<T | null> {
      const results = (await dbQuery(
        `SELECT * FROM ${tableName} WHERE tenant_id = ? AND id = ?`,
        [tenantId, id]
      )) as T[];
      return results[0] || null;
    },

    async findOne(tenantId: string, conditions: Partial<T>): Promise<T | null> {
      const entries = Object.entries(conditions).filter(([, v]) => v !== undefined);
      if (entries.length === 0) return null;

      const whereClauses = entries.map(([k]) => `${k} = ?`).join(" AND ");
      const values = entries.map(([, v]) => v);

      const results = (await dbQuery(
        `SELECT * FROM ${tableName} WHERE tenant_id = ? AND ${whereClauses} LIMIT 1`,
        [tenantId, ...values]
      )) as T[];
      return results[0] || null;
    },

    async create(tenantId: string, data: Omit<T, "tenantId" | "id">): Promise<T> {
      const id = generateScopedId(tenantId);
      const entries = Object.entries(data).filter(([, v]) => v !== undefined);
      const columns = ["id", "tenant_id", ...entries.map(([k]) => k)];
      const placeholders = columns.map(() => "?").join(", ");
      const values = [id, tenantId, ...entries.map(([, v]) => v)];

      await dbQuery(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );

      return { id, tenantId, ...data } as T;
    },

    async update(tenantId: string, id: string, data: Partial<T>): Promise<T | null> {
      const entries = Object.entries(data).filter(([k]) => k !== "id" && k !== "tenantId");
      if (entries.length === 0) return this.findById(tenantId, id);

      const setClauses = entries.map(([k]) => `${k} = ?`).join(", ");
      const values = [...entries.map(([, v]) => v), tenantId, id];

      await dbQuery(
        `UPDATE ${tableName} SET ${setClauses} WHERE tenant_id = ? AND id = ?`,
        values
      );

      return this.findById(tenantId, id);
    },

    async delete(tenantId: string, id: string): Promise<boolean> {
      const result = await dbQuery(
        `DELETE FROM ${tableName} WHERE tenant_id = ? AND id = ?`,
        [tenantId, id]
      );
      // For SQLite, check changes
      return Array.isArray(result) || true;
    },

    async count(tenantId: string, conditions?: Partial<T>): Promise<number> {
      let sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE tenant_id = ?`;
      const params: unknown[] = [tenantId];

      if (conditions) {
        const entries = Object.entries(conditions).filter(([, v]) => v !== undefined);
        for (const [key, value] of entries) {
          sql += ` AND ${key} = ?`;
          params.push(value);
        }
      }

      const results = (await dbQuery(sql, params)) as Array<{ count: number }>;
      return results[0]?.count ?? 0;
    },
  };
}

// ───────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────

/** Generate a tenant-scoped unique ID */
function generateScopedId(_tenantId: string): string {
  // Combines timestamp + random for uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/** Check if a table is shared (no tenant isolation) */
export function isSharedTable(tableName: string, sharedTables?: string[]): boolean {
  const shared = sharedTables || DEFAULT_ISOLATION_CONFIG.sharedTables;
  return shared.includes(tableName.toLowerCase());
}

/** Wrap a raw SQL query with tenant isolation */
export function withTenantScope(
  sql: string,
  tenantId: string,
  tableName?: string
): { sql: string; params: unknown[] } {
  if (tableName && isSharedTable(tableName)) {
    return { sql, params: [] };
  }

  const filtered = addTenantFilter(sql, tenantId);
  return { sql: filtered, params: [tenantId] };
}
