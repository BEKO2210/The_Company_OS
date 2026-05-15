// ═══════════════════════════════════════════════════════════════
// The Company OS - Workflow Stop (Level 3)
// RUN-005: Bereichsweiser Stopp - Kein Datenverlust, Neustart moeglich
// ═══════════════════════════════════════════════════════════════

import { db } from '../db/connection.js';
import type {
  StoppedWorkflow,
  StoppedWorkflowDbRecord,
  WorkflowStopStatus,
  DbInstance,
} from './types.js';

// ─── In-Memory Tracking ───

const stoppedWorkflows = new Set<string>();
const stoppedUnits = new Set<string>();
let memoryInitialized = false;

// ─── Utility ───

function now(): Date {
  return new Date();
}

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Memory Sync ───

function syncMemoryWithDb(database: DbInstance): void {
  stoppedWorkflows.clear();
  stoppedUnits.clear();
  try {
    const wfRecords = database
      .prepare("SELECT instance_id FROM stopped_workflows WHERE status = 'stopped'")
      .all() as { instance_id: string }[];
    for (const r of wfRecords) {
      stoppedWorkflows.add(r.instance_id);
    }

    const unitRecords = database
      .prepare("SELECT DISTINCT unit_id FROM stopped_workflows WHERE status = 'stopped' AND unit_id IS NOT NULL")
      .all() as { unit_id: string }[];
    for (const r of unitRecords) {
      stoppedUnits.add(r.unit_id);
    }

    memoryInitialized = true;
  } catch (err) {
    console.warn('[WorkflowStop] Memory sync failed:', (err as Error).message);
  }
}

// ─── Workflow Stop Manager ───

export class WorkflowStop {
  private db: DbInstance;

  constructor(database?: DbInstance) {
    this.db = database || db;
    if (!memoryInitialized) {
      syncMemoryWithDb(this.db);
    }
  }

  // ─── Core Operations ───

  /**
   * Stop a specific workflow instance
   * Freezes current step, no data loss, restart possible
   */
  stopWorkflow(instanceId: string, reason: string, triggeredBy: string, unitId?: string): boolean {
    if (this.isWorkflowStopped(instanceId)) {
      console.warn(`[WorkflowStop] Workflow "${instanceId}" is already stopped`);
      return false;
    }

    const id = generateId();

    try {
      // Get current workflow state before stopping
      const instance = this.db
        .prepare('SELECT * FROM workflow_instances WHERE id = ?')
        .get(instanceId) as { id: string; status: string; current_step: number; context: string | null } | undefined;

      if (!instance) {
        console.error(`[WorkflowStop] Workflow instance "${instanceId}" not found`);
        return false;
      }

      // Don't stop already completed/failed workflows
      if (instance.status === 'completed' || instance.status === 'failed') {
        console.warn(`[WorkflowStop] Workflow "${instanceId}" is already ${instance.status}`);
        return false;
      }

      // Freeze the workflow
      this.db.prepare(`
        UPDATE workflow_instances
        SET status = 'stopped', context = json_set(COALESCE(context, '{}'), '$.stopInfo', json(?))
        WHERE id = ?
      `).run(JSON.stringify({
        stoppedAt: now().toISOString(),
        stoppedBy: triggeredBy,
        reason,
        previousStatus: instance.status,
        stepAtStop: instance.current_step,
      }), instanceId);

      // Log the stop - store unitId if provided for resumeUnit functionality
      this.db.prepare(`
        INSERT INTO stopped_workflows (id, instance_id, unit_id, reason, triggered_by, stopped_at, status)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'stopped')
      `).run(id, instanceId, unitId ?? null, reason, triggeredBy);

      stoppedWorkflows.add(instanceId);

      console.warn(
        `[WorkflowStop] WORKFLOW "${instanceId}" STOPPED by ${triggeredBy}: ${reason}${unitId ? ` (unit: ${unitId})` : ''}`
      );

      return true;
    } catch (err) {
      console.error(`[WorkflowStop] Failed to stop workflow "${instanceId}":`, (err as Error).message);
      return false;
    }
  }

  /**
   * Stop ALL workflows in a unit (business unit or department)
   */
  stopUnit(unitId: string, reason: string, triggeredBy: string): boolean {
    try {
      // Find all running workflow instances for this unit
      // SECURITY: Robust matching that handles JSON arrays, comma-separated lists, and exact matches
      const allInstances = this.db
        .prepare(`
          SELECT wi.id, wi.workflow_id, wi.status, w.responsible_agents
          FROM workflow_instances wi
          JOIN workflows w ON wi.workflow_id = w.id
          WHERE wi.status IN ('running', 'pending', 'active')
        `)
        .all() as { id: string; workflow_id: string; status: string; responsible_agents: string }[];

      // Filter for exact unit match to prevent false positives (e.g. "sales" matching "sales-manager")
      const instances = allInstances.filter(row => {
        if (!row.responsible_agents) return false;
        const agents = row.responsible_agents;
        // Try JSON array first
        try {
          const parsed = JSON.parse(agents);
          if (Array.isArray(parsed)) return parsed.includes(unitId);
        } catch { /* not JSON */ }
        // Comma-separated list
        if (agents.includes(',')) {
          return agents.split(',').map(a => a.trim()).includes(unitId);
        }
        // Exact match
        return agents === unitId;
      });

      if (instances.length === 0) {
        console.warn(`[WorkflowStop] No running workflows found for unit "${unitId}"`);
      }

      for (const instance of instances) {
        this.stopWorkflow(instance.id, `Unit stop: ${reason}`, triggeredBy, unitId);
      }

      stoppedUnits.add(unitId);

      console.warn(
        `[WorkflowStop] UNIT "${unitId}" STOPPED by ${triggeredBy}: ${reason} ` +
        `(${instances.length} workflows stopped)`
      );

      return true;
    } catch (err) {
      console.error(`[WorkflowStop] Failed to stop unit "${unitId}":`, (err as Error).message);
      return false;
    }
  }

  /**
   * Resume a stopped workflow from where it left off
   */
  resumeWorkflow(instanceId: string, resumedBy: string): boolean {
    if (!this.isWorkflowStopped(instanceId)) {
      console.warn(`[WorkflowStop] Workflow "${instanceId}" is not stopped`);
      return false;
    }

    const _resumedAt = now().toISOString();

    try {
      // Get the stored previous status
      const instance = this.db
        .prepare('SELECT context FROM workflow_instances WHERE id = ?')
        .get(instanceId) as { context: string | null } | undefined;

      let previousStatus = 'pending';
      if (instance?.context) {
        try {
          const ctx = JSON.parse(instance.context);
          if (ctx.stopInfo?.previousStatus) {
            previousStatus = ctx.stopInfo.previousStatus;
          }
        } catch {
          // Use default
        }
      }

      // Restore previous status
      this.db.prepare(`
        UPDATE workflow_instances SET status = ? WHERE id = ?
      `).run(previousStatus, instanceId);

      // Update stop log
      this.db.prepare(`
        UPDATE stopped_workflows
        SET resumed_at = CURRENT_TIMESTAMP, resumed_by = ?, status = 'resumed'
        WHERE instance_id = ? AND status = 'stopped'
      `).run(resumedBy, instanceId);

      stoppedWorkflows.delete(instanceId);

      console.log(
        `[WorkflowStop] WORKFLOW "${instanceId}" RESUMED by ${resumedBy} ` +
        `(restored to status: ${previousStatus})`
      );

      return true;
    } catch (err) {
      console.error(`[WorkflowStop] Failed to resume workflow "${instanceId}":`, (err as Error).message);
      return false;
    }
  }

  /**
   * Resume ALL stopped workflows in a unit
   */
  resumeUnit(unitId: string, resumedBy: string): boolean {
    try {
      const records = this.db
        .prepare(`
          SELECT instance_id FROM stopped_workflows
          WHERE unit_id = ? AND status = 'stopped'
        `)
        .all(unitId) as { instance_id: string }[];

      for (const record of records) {
        this.resumeWorkflow(record.instance_id, resumedBy);
      }

      stoppedUnits.delete(unitId);

      console.log(
        `[WorkflowStop] UNIT "${unitId}" RESUMED by ${resumedBy} ` +
        `(${records.length} workflows resumed)`
      );

      return true;
    } catch (err) {
      console.error(`[WorkflowStop] Failed to resume unit "${unitId}":`, (err as Error).message);
      return false;
    }
  }

  // ─── Query Operations ───

  isWorkflowStopped(instanceId: string): boolean {
    return stoppedWorkflows.has(instanceId);
  }

  isUnitStopped(unitId: string): boolean {
    return stoppedUnits.has(unitId);
  }

  enforceWorkflow(instanceId: string): void {
    if (this.isWorkflowStopped(instanceId)) {
      const record = this.db
        .prepare(`
          SELECT reason, triggered_by, stopped_at
          FROM stopped_workflows
          WHERE instance_id = ? AND status = 'stopped'
          ORDER BY stopped_at DESC LIMIT 1
        `)
        .get(instanceId) as { reason: string; triggered_by: string; stopped_at: string } | undefined;

      throw new WorkflowStoppedError(
        `Workflow "${instanceId}" is STOPPED. ` +
        `Reason: ${record?.reason || 'unknown'}. ` +
        `Stopped by: ${record?.triggered_by || 'unknown'}. ` +
        `Resume required before continuation.`,
        instanceId,
        record?.reason || 'unknown'
      );
    }
  }

  getStoppedWorkflows(): StoppedWorkflow[] {
    try {
      const records = this.db
        .prepare(`
          SELECT * FROM stopped_workflows
          WHERE status = 'stopped'
          ORDER BY stopped_at DESC
        `)
        .all() as StoppedWorkflowDbRecord[];

      return records.map(r => this.toWorkflow(r));
    } catch (err) {
      console.error('[WorkflowStop] getStoppedWorkflows failed:', (err as Error).message);
      return [];
    }
  }

  getStoppedUnits(): { unitId: string; reason: string; triggeredBy: string; stoppedAt: Date; workflowCount: number }[] {
    try {
      const records = this.db
        .prepare(`
          SELECT unit_id, reason, triggered_by, stopped_at, COUNT(*) as count
          FROM stopped_workflows
          WHERE status = 'stopped' AND unit_id IS NOT NULL
          GROUP BY unit_id
          ORDER BY stopped_at DESC
        `)
        .all() as { unit_id: string; reason: string; triggered_by: string; stopped_at: string; count: number }[];

      return records.map(r => ({
        unitId: r.unit_id,
        reason: r.reason,
        triggeredBy: r.triggered_by,
        stoppedAt: new Date(r.stopped_at),
        workflowCount: r.count,
      }));
    } catch (err) {
      console.error('[WorkflowStop] getStoppedUnits failed:', (err as Error).message);
      return [];
    }
  }

  getWorkflowHistory(instanceId: string): StoppedWorkflow[] {
    try {
      const records = this.db
        .prepare(`
          SELECT * FROM stopped_workflows
          WHERE instance_id = ?
          ORDER BY stopped_at DESC
        `)
        .all(instanceId) as StoppedWorkflowDbRecord[];

      return records.map(r => this.toWorkflow(r));
    } catch (err) {
      console.error('[WorkflowStop] getWorkflowHistory failed:', (err as Error).message);
      return [];
    }
  }

  // ─── Bulk Operations ───

  stopAll(reason: string, triggeredBy: string): number {
    try {
      const instances = this.db
        .prepare(`
          SELECT id FROM workflow_instances
          WHERE status IN ('running', 'pending', 'active')
        `)
        .all() as { id: string }[];

      let count = 0;
      for (const instance of instances) {
        if (this.stopWorkflow(instance.id, reason, triggeredBy)) {
          count++;
        }
      }

      console.warn(`[WorkflowStop] ALL WORKFLOWS STOPPED by ${triggeredBy}: ${count} workflows`);
      return count;
    } catch (err) {
      console.error('[WorkflowStop] stopAll failed:', (err as Error).message);
      return 0;
    }
  }

  resumeAll(resumedBy: string): number {
    try {
      const records = this.getStoppedWorkflows();
      let count = 0;
      for (const record of records) {
        if (this.resumeWorkflow(record.instanceId, resumedBy)) {
          count++;
        }
      }
      console.log(`[WorkflowStop] ALL WORKFLOWS RESUMED by ${resumedBy}: ${count} workflows`);
      return count;
    } catch (err) {
      console.error('[WorkflowStop] resumeAll failed:', (err as Error).message);
      return 0;
    }
  }

  // ─── Statistics ───

  getStats(): {
    stoppedWorkflows: number;
    stoppedUnits: number;
    resumedWorkflows: number;
    failedWorkflows: number;
  } {
    try {
      const stopped = this.db
        .prepare("SELECT COUNT(*) as count FROM stopped_workflows WHERE status = 'stopped'")
        .get() as { count: number };
      const resumed = this.db
        .prepare("SELECT COUNT(*) as count FROM stopped_workflows WHERE status = 'resumed'")
        .get() as { count: number };
      const failed = this.db
        .prepare("SELECT COUNT(*) as count FROM stopped_workflows WHERE status = 'failed'")
        .get() as { count: number };

      return {
        stoppedWorkflows: stopped.count,
        stoppedUnits: this.getStoppedUnits().length,
        resumedWorkflows: resumed.count,
        failedWorkflows: failed.count,
      };
    } catch {
      return { stoppedWorkflows: 0, stoppedUnits: 0, resumedWorkflows: 0, failedWorkflows: 0 };
    }
  }

  // ─── Helpers ───

  private toWorkflow(r: StoppedWorkflowDbRecord): StoppedWorkflow {
    return {
      id: r.id,
      instanceId: r.instance_id,
      unitId: r.unit_id,
      reason: r.reason,
      triggeredBy: r.triggered_by,
      stoppedAt: new Date(r.stopped_at),
      resumedAt: r.resumed_at ? new Date(r.resumed_at) : undefined,
      resumedBy: r.resumed_by ?? undefined,
      status: r.status as WorkflowStopStatus,
    };
  }
}

// ─── Custom Error ───

export class WorkflowStoppedError extends Error {
  public readonly instanceId: string;
  public readonly stopReason: string;
  public readonly code = 'WORKFLOW_STOPPED';

  constructor(message: string, instanceId: string, stopReason: string) {
    super(message);
    this.name = 'WorkflowStoppedError';
    this.instanceId = instanceId;
    this.stopReason = stopReason;
    Object.setPrototypeOf(this, WorkflowStoppedError.prototype);
  }
}

// ─── Singleton Instance ───

let workflowStopInstance: WorkflowStop | null = null;

export function getWorkflowStop(): WorkflowStop {
  if (!workflowStopInstance) {
    workflowStopInstance = new WorkflowStop();
  }
  return workflowStopInstance;
}

export function resetWorkflowStopInstance(): void {
  workflowStopInstance = null;
  stoppedWorkflows.clear();
  stoppedUnits.clear();
  memoryInitialized = false;
}
