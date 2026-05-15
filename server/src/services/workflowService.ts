import { dbRef } from '../db/connection.js';
import type { Workflow, WorkflowInstance } from '../types/index.js';

export function getAllWorkflows(): Workflow[] {
  return dbRef().prepare('SELECT * FROM workflows ORDER BY name').all() as Workflow[];
}

export function getWorkflowById(id: string): Workflow | undefined {
  return dbRef().prepare('SELECT * FROM workflows WHERE id = ?').get(id) as Workflow | undefined;
}

export function getInstances(filters?: { workflowId?: string; status?: string }): WorkflowInstance[] {
  let sql = 'SELECT * FROM workflow_instances WHERE 1=1';
  const params: string[] = [];

  if (filters?.workflowId) {
    sql += ' AND workflow_id = ?';
    params.push(filters.workflowId);
  }
  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  sql += ' ORDER BY started_at DESC';
  return dbRef().prepare(sql).all(...params) as WorkflowInstance[];
}

export function getInstanceById(id: string): WorkflowInstance | undefined {
  return dbRef().prepare('SELECT * FROM workflow_instances WHERE id = ?').get(id) as WorkflowInstance | undefined;
}

export function startWorkflow(workflowId: string, context?: Record<string, unknown>): { success: boolean; instance?: WorkflowInstance; error?: string } {
  const workflow = getWorkflowById(workflowId);
  if (!workflow) {
    return { success: false, error: 'Workflow not found' };
  }

  const id = `wi-${Date.now()}`;
  const contextJson = context ? JSON.stringify(context) : null;

  dbRef().prepare(`
    INSERT INTO workflow_instances (id, workflow_id, status, current_step, context)
    VALUES (?, ?, 'running', 0, ?)
  `).run(id, workflowId, contextJson);

  return { success: true, instance: getInstanceById(id) };
}

export function advanceStep(instanceId: string): { success: boolean; instance?: WorkflowInstance; error?: string; blocked?: boolean } {
  const instance = getInstanceById(instanceId);
  if (!instance) {
    return { success: false, error: 'Workflow instance not found' };
  }

  if (instance.status === 'completed' || instance.status === 'failed') {
    return { success: false, error: `Workflow is already ${instance.status}` };
  }

  const workflow = getWorkflowById(instance.workflow_id);
  if (!workflow || !workflow.steps) {
    return { success: false, error: 'Workflow not found or has no steps' };
  }

  const steps = JSON.parse(workflow.steps) as Array<{
    id: string;
    name: string;
    blockingGate: boolean;
    status: string;
  }>;

  const nextStep = instance.current_step + 1;

  // Check if we completed all steps
  if (nextStep >= steps.length) {
    dbRef().prepare(`
      UPDATE workflow_instances
      SET status = 'completed', current_step = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextStep, instanceId);

    return { success: true, instance: getInstanceById(instanceId) };
  }

  // Check if next step is a blocking gate
  const nextStepData = steps[nextStep];
  if (nextStepData?.blockingGate) {
    dbRef().prepare(`
      UPDATE workflow_instances
      SET status = 'blocked', current_step = ?
      WHERE id = ?
    `).run(nextStep, instanceId);

    return { success: true, instance: getInstanceById(instanceId), blocked: true };
  }

  dbRef().prepare(`
    UPDATE workflow_instances
    SET current_step = ?
    WHERE id = ?
  `).run(nextStep, instanceId);

  return { success: true, instance: getInstanceById(instanceId) };
}

export function checkGate(instanceId: string): { success: boolean; blocking?: boolean; stepName?: string; error?: string } {
  const instance = getInstanceById(instanceId);
  if (!instance) {
    return { success: false, error: 'Workflow instance not found' };
  }

  const workflow = getWorkflowById(instance.workflow_id);
  if (!workflow || !workflow.steps) {
    return { success: false, error: 'Workflow not found or has no steps' };
  }

  const steps = JSON.parse(workflow.steps) as Array<{
    id: string;
    name: string;
    blockingGate: boolean;
  }>;

  const currentStep = steps[instance.current_step];
  if (!currentStep) {
    return { success: false, error: 'Current step not found' };
  }

  return {
    success: true,
    blocking: currentStep.blockingGate,
    stepName: currentStep.name,
  };
}

export function unblockInstance(instanceId: string): { success: boolean; instance?: WorkflowInstance; error?: string } {
  const instance = getInstanceById(instanceId);
  if (!instance) {
    return { success: false, error: 'Workflow instance not found' };
  }

  if (instance.status !== 'blocked') {
    return { success: false, error: 'Workflow is not blocked' };
  }

  dbRef().prepare(`
    UPDATE workflow_instances
    SET status = 'running'
    WHERE id = ?
  `).run(instanceId);

  return { success: true, instance: getInstanceById(instanceId) };
}
