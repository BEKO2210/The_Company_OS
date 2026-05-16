// Thin browser-side client for the backend Ollama proxy.
// Endpoints live under /api/ai/llm/* (see server/src/routes/ai.ts).

export interface LlmHealth {
  reachable: boolean;
  baseUrl: string;
  defaultModel: string;
  models: { name: string }[];
  mockMode?: boolean;
  lastError?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const API_BASE = (typeof window !== 'undefined' && (window as { __API_BASE__?: string }).__API_BASE__)
  || (import.meta.env?.VITE_API_URL as string | undefined)
  || 'http://localhost:3001/api';

const TOKEN_KEY = 'company-os.auth.token';

function authHeaders(): Record<string, string> {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export async function checkLlmHealth(): Promise<LlmHealth> {
  try {
    const r = await fetch(`${API_BASE}/ai/llm/health`, { headers: authHeaders() });
    const json = await r.json().catch(() => ({}));
    if (json.success && json.data) {
      return json.data as LlmHealth;
    }
    return {
      reachable: false, baseUrl: '', defaultModel: '', models: [],
      lastError: json.error || `HTTP ${r.status}`,
    };
  } catch (err) {
    return {
      reachable: false, baseUrl: '', defaultModel: '', models: [],
      lastError: err instanceof Error ? err.message : 'unreachable',
    };
  }
}

export interface StreamHandlers {
  onDelta?: (chunk: string) => void;
  onDone?: (meta: { eval_count?: number; eval_duration_ms?: number }) => void;
  onError?: (msg: string) => void;
}

/**
 * SSE stream of an LLM chat response.
 * Returns an abort controller you can call .abort() on to cancel.
 */
export function streamChat(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } & StreamHandlers,
): AbortController {
  const ctrl = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${API_BASE}/ai/llm/stream`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ messages, model: opts.model, temperature: opts.temperature }),
      });
      if (!r.ok || !r.body) {
        opts.onError?.(`HTTP ${r.status}`);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) {
            currentEvent = null;
            continue;
          }
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            try {
              const parsed = JSON.parse(payload);
              if (currentEvent === 'delta' && parsed.content) {
                opts.onDelta?.(parsed.content);
              } else if (currentEvent === 'done') {
                opts.onDone?.(parsed);
              } else if (currentEvent === 'error') {
                opts.onError?.(parsed.message || 'stream error');
              }
            } catch {
              /* malformed, skip */
            }
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      opts.onError?.(err instanceof Error ? err.message : 'fetch failed');
    }
  })();
  return ctrl;
}

/**
 * Non-streaming chat (one-shot).
 */
export async function chatOnce(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {},
): Promise<{ content: string; model: string; eval_count?: number; eval_duration_ms?: number }> {
  const r = await fetch(`${API_BASE}/ai/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ messages, ...opts }),
  });
  const json = await r.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.error || `HTTP ${r.status}`);
  }
  return json.data;
}
