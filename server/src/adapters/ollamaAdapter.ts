// Ollama adapter - talks to a local Ollama daemon.
// Default: http://localhost:11434, model: mistral-nemo:12b
// See: https://github.com/ollama/ollama/blob/main/docs/api.md

import { BaseAdapter } from './baseAdapter.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export interface ChatChunk {
  done: boolean;
  message?: { role: 'assistant'; content: string };
  total_duration?: number;
  load_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAdapter extends BaseAdapter {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    const url =
      process.env.OLLAMA_URL ||
      process.env.AI_OLLAMA_URL ||
      'http://localhost:11434';
    super('Ollama', { OLLAMA_URL: url });
    this.baseUrl = url.replace(/\/+$/, '');
    this.defaultModel =
      process.env.OLLAMA_MODEL ||
      process.env.AI_OLLAMA_MODEL ||
      'mistral-nemo:12b';
    // Ollama is treated as a real adapter unless explicit MOCK
    this.mockMode = process.env.OLLAMA_MOCK === 'true';
  }

  async connect(): Promise<boolean> {
    try {
      const r = await fetch(`${this.baseUrl}/api/tags`);
      const ok = r.ok;
      this.status = ok ? 'idle' : 'error';
      return ok;
    } catch (err) {
      this.status = 'error';
      this.lastError = err instanceof Error ? err.message : 'unknown';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.status = 'idle';
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      mockMode: this.mockMode,
      lastError: this.lastError,
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
    };
  }

  async listModels(): Promise<OllamaModel[]> {
    const r = await fetch(`${this.baseUrl}/api/tags`);
    if (!r.ok) throw new Error(`Ollama /api/tags -> HTTP ${r.status}`);
    const json = (await r.json()) as { models?: OllamaModel[] };
    return json.models || [];
  }

  /**
   * Non-streaming chat completion. Returns the assistant message.
   */
  async chat(opts: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    options?: Record<string, unknown>;
  }): Promise<{ content: string; model: string; raw: ChatChunk }> {
    const model = opts.model || this.defaultModel;
    const numCtx = Number(process.env.OLLAMA_NUM_CTX || 4096);
    const numPredict = Number(process.env.OLLAMA_NUM_PREDICT || 512);
    const body = {
      model,
      messages: opts.messages,
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_ctx: numCtx,
        num_predict: numPredict,
        ...(opts.options || {}),
      },
    };
    const r = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`Ollama /api/chat -> HTTP ${r.status} ${text}`.trim());
    }
    const json = (await r.json()) as ChatChunk;
    return {
      content: json.message?.content ?? '',
      model,
      raw: json,
    };
  }

  /**
   * Streaming chat: yields ChatChunk objects as Ollama emits them.
   * Caller is responsible for closing the consumer (e.g. SSE response).
   */
  async *chatStream(opts: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
  }): AsyncGenerator<ChatChunk, void, unknown> {
    const model = opts.model || this.defaultModel;
    const numCtx = Number(process.env.OLLAMA_NUM_CTX || 4096);
    const numPredict = Number(process.env.OLLAMA_NUM_PREDICT || 512);
    const body = {
      model,
      messages: opts.messages,
      stream: true,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_ctx: numCtx,
        num_predict: numPredict,
      },
    };
    const r = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok || !r.body) {
      const text = !r.ok ? await r.text().catch(() => '') : '';
      throw new Error(`Ollama /api/chat -> HTTP ${r.status} ${text}`.trim());
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Ollama emits one JSON object per line.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as ChatChunk;
          yield parsed;
          if (parsed.done) return;
        } catch {
          // ignore malformed line
        }
      }
    }
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as ChatChunk;
        yield parsed;
      } catch {
        /* ignore */
      }
    }
  }
}

// Singleton: lazy-initialized so env vars from dotenv are available.
let _instance: OllamaAdapter | null = null;
export function getOllama(): OllamaAdapter {
  if (!_instance) _instance = new OllamaAdapter();
  return _instance;
}
