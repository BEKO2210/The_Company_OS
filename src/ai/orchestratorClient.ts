// Browser client for the orchestrator backend (/api/orchestrator/*).

export interface OrchestratorTask {
  id: string;
  agentId: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  source: string;
  tool?: string | null;
  result?: unknown;
  error?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatDispatchResponse {
  reply: string;
  tasks: OrchestratorTask[];
  queueMode: 'bullmq' | 'memory';
}

const API_BASE = (typeof window !== 'undefined' && (window as { __API_BASE__?: string }).__API_BASE__)
  || (import.meta.env?.VITE_API_URL as string | undefined)
  || 'http://localhost:3001/api';

const TOKEN_KEY = 'company-os.auth.token';
function authHeaders(): Record<string, string> {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

export async function dispatchChat(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<ChatDispatchResponse> {
  const r = await fetch(`${API_BASE}/orchestrator/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message, history }),
  });
  const json = await r.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.error || `HTTP ${r.status}`);
  }
  return json.data as ChatDispatchResponse;
}

export async function listOrchestratorTasks(
  opts: { status?: OrchestratorTask['status']; limit?: number } = {},
): Promise<OrchestratorTask[]> {
  const qs = new URLSearchParams();
  if (opts.status) qs.set('status', opts.status);
  if (opts.limit) qs.set('limit', String(opts.limit));
  const r = await fetch(`${API_BASE}/orchestrator/tasks?${qs.toString()}`, {
    headers: authHeaders(),
  });
  const json = await r.json().catch(() => ({}));
  if (!json.success) throw new Error(json.error || `HTTP ${r.status}`);
  return json.data as OrchestratorTask[];
}

export async function retryOrchestratorTask(id: string): Promise<OrchestratorTask> {
  const r = await fetch(`${API_BASE}/orchestrator/tasks/${id}/retry`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const json = await r.json().catch(() => ({}));
  if (!json.success) throw new Error(json.error || `HTTP ${r.status}`);
  return json.data as OrchestratorTask;
}
