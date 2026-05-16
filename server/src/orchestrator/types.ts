// Shared types for the orchestrator subsystem.

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskSource = 'chat' | 'cron' | 'api' | 'agent';

export interface AgentTaskRow {
  id: string;
  parent_id: string | null;
  agent_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  source: TaskSource;
  source_user: string | null;
  tool: string | null;
  input: string | null;   // JSON string
  result: string | null;  // JSON string
  error: string | null;
  attempts: number;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  parentId?: string | null;
  agentId: string | null;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  source: TaskSource;
  sourceUser?: string | null;
  tool?: string | null;
  input?: Record<string, unknown> | null;
  result?: unknown;
  error?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface DispatchInput {
  agentId: string;
  title: string;
  description: string;
  priority?: TaskPriority;
  tool?: string;
  input?: Record<string, unknown>;
  source?: TaskSource;
  sourceUser?: string;
  parentId?: string;
}
