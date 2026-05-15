// ═══════════════════════════════════════════════════════════════
// The Company OS - Agent Quarantine (Level 2)
// RUN-005: Gezielte Agent-Isolierung - KEINE Ausfuehrung moeglich
// ═══════════════════════════════════════════════════════════════

import { db } from '../db/connection.js';
import type {
  QuarantineRecord,
  QuarantineDbRecord,
  QuarantineStatus,
  DbInstance,
} from './types.js';

// ─── In-Memory Active Quarantine Set ───

const activeQuarantines = new Set<string>();
let memoryInitialized = false;

// ─── Utility ───

function now(): Date {
  return new Date();
}

function generateId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Memory Sync ───

function syncMemoryWithDb(database: DbInstance): void {
  activeQuarantines.clear();
  try {
    const records = database
      .prepare("SELECT agent_id FROM quarantine_log WHERE status = 'active'")
      .all() as { agent_id: string }[];
    for (const record of records) {
      activeQuarantines.add(record.agent_id);
    }
    memoryInitialized = true;
  } catch (err) {
    console.warn('[AgentQuarantine] Memory sync failed:', (err as Error).message);
  }
}

// ─── Quarantine Manager ───

export class AgentQuarantine {
  private db: DbInstance;

  constructor(database?: DbInstance) {
    this.db = database || db;
    if (!memoryInitialized) {
      syncMemoryWithDb(this.db);
    }
  }

  // ─── Core Operations ───

  /**
   * Quarantine an agent - IMMEDIATELY blocks ALL execution
   * Only Human CEO or Audit-Agent may call this
   */
  quarantine(agentId: string, reason: string, triggeredBy: string): boolean {
    // Check if already quarantined
    if (this.isQuarantined(agentId)) {
      console.warn(`[AgentQuarantine] Agent "${agentId}" is already quarantined`);
      return false;
    }

    const id = generateId();
    const triggeredAt = now().toISOString();

    try {
      // Insert into quarantine log
      this.db.prepare(`
        INSERT INTO quarantine_log (id, agent_id, reason, triggered_by, triggered_at, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(id, agentId, reason, triggeredBy, triggeredAt);

      // Update agent status in agents table
      this.db.prepare(`
        UPDATE agents SET status = 'quarantine', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(agentId);

      // Add to in-memory set for instant blocking
      activeQuarantines.add(agentId);

      console.warn(
        `[AgentQuarantine] AGENT "${agentId}" QUARANTINED by ${triggeredBy}: ${reason}`
      );

      return true;
    } catch (err) {
      console.error(`[AgentQuarantine] Failed to quarantine agent "${agentId}":`, (err as Error).message);
      return false;
    }
  }

  /**
   * Lift quarantine - Reactivates the agent
   * Only Human CEO or Audit-Agent may call this
   */
  lift(agentId: string, liftedBy: string): boolean {
    if (!this.isQuarantined(agentId)) {
      console.warn(`[AgentQuarantine] Agent "${agentId}" is not quarantined`);
      return false;
    }

    const liftedAt = now().toISOString();

    try {
      // Update quarantine log
      this.db.prepare(`
        UPDATE quarantine_log
        SET lifted_at = ?, lifted_by = ?, status = 'lifted'
        WHERE agent_id = ? AND status = 'active'
      `).run(liftedAt, liftedBy, agentId);

      // Update agent status back to active
      this.db.prepare(`
        UPDATE agents SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(agentId);

      // Remove from in-memory set
      activeQuarantines.delete(agentId);

      console.log(
        `[AgentQuarantine] AGENT "${agentId}" QUARANTINE LIFTED by ${liftedBy}`
      );

      return true;
    } catch (err) {
      console.error(`[AgentQuarantine] Failed to lift quarantine for "${agentId}":`, (err as Error).message);
      return false;
    }
  }

  /**
   * Check if agent is currently quarantined
   * In-memory check for ZERO latency
   */
  isQuarantined(agentId: string): boolean {
    return activeQuarantines.has(agentId);
  }

  /**
   * Enforce quarantine check - throws if agent is quarantined
   */
  enforce(agentId: string): void {
    if (this.isQuarantined(agentId)) {
      // Get the quarantine reason from DB for better error message
      const record = this.db
        .prepare(`
          SELECT reason, triggered_by, triggered_at
          FROM quarantine_log
          WHERE agent_id = ? AND status = 'active'
          ORDER BY triggered_at DESC LIMIT 1
        `)
        .get(agentId) as { reason: string; triggered_by: string; triggered_at: string } | undefined;

      throw new AgentQuarantinedError(
        `Agent "${agentId}" is QUARANTINED and cannot execute any actions. ` +
        `Reason: ${record?.reason || 'unknown'}. ` +
        `Triggered by: ${record?.triggered_by || 'unknown'}. ` +
        `Contact CEO or Audit-Agent to lift.`,
        agentId,
        record?.reason || 'unknown',
        record?.triggered_by || 'unknown'
      );
    }
  }

  // ─── Queries ───

  getQuarantinedAgents(): QuarantineRecord[] {
    try {
      const records = this.db
        .prepare(`
          SELECT * FROM quarantine_log
          WHERE status = 'active'
          ORDER BY triggered_at DESC
        `)
        .all() as QuarantineDbRecord[];

      return records.map(r => this.toRecord(r));
    } catch (err) {
      console.error('[AgentQuarantine] getQuarantinedAgents failed:', (err as Error).message);
      return [];
    }
  }

  getHistory(): QuarantineRecord[] {
    try {
      const records = this.db
        .prepare(`
          SELECT * FROM quarantine_log
          ORDER BY triggered_at DESC
          LIMIT 100
        `)
        .all() as QuarantineDbRecord[];

      return records.map(r => this.toRecord(r));
    } catch (err) {
      console.error('[AgentQuarantine] getHistory failed:', (err as Error).message);
      return [];
    }
  }

  getAgentHistory(agentId: string): QuarantineRecord[] {
    try {
      const records = this.db
        .prepare(`
          SELECT * FROM quarantine_log
          WHERE agent_id = ?
          ORDER BY triggered_at DESC
        `)
        .all(agentId) as QuarantineDbRecord[];

      return records.map(r => this.toRecord(r));
    } catch (err) {
      console.error('[AgentQuarantine] getAgentHistory failed:', (err as Error).message);
      return [];
    }
  }

  // ─── Bulk Operations ───

  /**
   * Quarantine ALL agents in a department
   */
  quarantineDepartment(departmentId: string, reason: string, triggeredBy: string): string[] {
    try {
      const agents = this.db
        .prepare("SELECT id FROM agents WHERE department = ? AND status != 'quarantine'")
        .all(departmentId) as { id: string }[];

      const quarantined: string[] = [];
      for (const agent of agents) {
        if (this.quarantine(agent.id, reason, triggeredBy)) {
          quarantined.push(agent.id);
        }
      }

      console.warn(
        `[AgentQuarantine] Department "${departmentId}": ${quarantined.length} agents quarantined`
      );
      return quarantined;
    } catch (err) {
      console.error('[AgentQuarantine] quarantineDepartment failed:', (err as Error).message);
      return [];
    }
  }

  /**
   * Lift quarantine for ALL quarantined agents
   */
  liftAll(liftedBy: string): number {
    try {
      const agents = this.getQuarantinedAgents();
      let count = 0;
      for (const agent of agents) {
        if (this.lift(agent.agentId, liftedBy)) {
          count++;
        }
      }
      console.log(`[AgentQuarantine] ${count} agents de-quarantined by ${liftedBy}`);
      return count;
    } catch (err) {
      console.error('[AgentQuarantine] liftAll failed:', (err as Error).message);
      return 0;
    }
  }

  // ─── Statistics ───

  getStats(): {
    activeQuarantines: number;
    totalHistory: number;
    lifted: number;
    expired: number;
  } {
    try {
      const active = this.db
        .prepare("SELECT COUNT(*) as count FROM quarantine_log WHERE status = 'active'")
        .get() as { count: number };
      const total = this.db
        .prepare('SELECT COUNT(*) as count FROM quarantine_log')
        .get() as { count: number };
      const lifted = this.db
        .prepare("SELECT COUNT(*) as count FROM quarantine_log WHERE status = 'lifted'")
        .get() as { count: number };
      const expired = this.db
        .prepare("SELECT COUNT(*) as count FROM quarantine_log WHERE status = 'expired'")
        .get() as { count: number };

      return {
        activeQuarantines: active.count,
        totalHistory: total.count,
        lifted: lifted.count,
        expired: expired.count,
      };
    } catch {
      return { activeQuarantines: 0, totalHistory: 0, lifted: 0, expired: 0 };
    }
  }

  // ─── Helpers ───

  private toRecord(r: QuarantineDbRecord): QuarantineRecord {
    return {
      id: r.id,
      agentId: r.agent_id,
      reason: r.reason,
      triggeredBy: r.triggered_by,
      triggeredAt: new Date(r.triggered_at),
      liftedAt: r.lifted_at ? new Date(r.lifted_at) : undefined,
      liftedBy: r.lifted_by ?? undefined,
      status: r.status as QuarantineStatus,
    };
  }
}

// ─── Custom Error ───

export class AgentQuarantinedError extends Error {
  public readonly agentId: string;
  public readonly reason: string;
  public readonly triggeredBy: string;
  public readonly code = 'AGENT_QUARANTINED';

  constructor(message: string, agentId: string, reason: string, triggeredBy: string) {
    super(message);
    this.name = 'AgentQuarantinedError';
    this.agentId = agentId;
    this.reason = reason;
    this.triggeredBy = triggeredBy;
    Object.setPrototypeOf(this, AgentQuarantinedError.prototype);
  }
}

// ─── Singleton Instance ───

let quarantineInstance: AgentQuarantine | null = null;

export function getQuarantine(): AgentQuarantine {
  if (!quarantineInstance) {
    quarantineInstance = new AgentQuarantine();
  }
  return quarantineInstance;
}

export function resetQuarantineInstance(): void {
  quarantineInstance = null;
  activeQuarantines.clear();
  memoryInitialized = false;
}

// ═══════════════════════════════════════════════════════════════
// Standalone helpers (for direct import)
// ═══════════════════════════════════════════════════════════════

export function isAgentQuarantined(agentId: string): boolean {
  return getQuarantine().isQuarantined(agentId);
}

export function enforceQuarantine(agentId: string): void {
  getQuarantine().enforce(agentId);
}
