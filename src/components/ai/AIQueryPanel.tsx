import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Send, Square, History, Trash2, ChevronRight,
  X, Cpu, Loader2, MessageSquare, Briefcase, RotateCw, CheckCircle2,
  XCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  processQuery, getSuggestions, getQueryHistory, addToHistory, clearHistory,
} from '@/ai';
import type { QueryResult, QueryHistoryEntry } from '@/ai/types';
import {
  type ChatMessage, type LlmHealth, checkLlmHealth, streamChat,
} from '@/ai/llmClient';
import {
  dispatchChat, listOrchestratorTasks, retryOrchestratorTask,
  type OrchestratorTask,
} from '@/ai/orchestratorClient';

interface AIQueryPanelProps {
  onNavigate?: (path: string) => void;
  onFilter?: (filter: Record<string, string>) => void;
}

const SYSTEM_PROMPT = `Du bist der KI-Assistent von The Company OS, einem Betriebssystem fuer eine AI-native Holding.
Antworte kurz und konkret auf Deutsch. Wenn der User nach einem Bereich fragt (Risiken, Freigaben, Liquiditaet, Agenten, Workflows, ...), erklaere kurz und nenne den Bereich, in dem die Information liegt.
Halte Antworten unter 4 Saetzen, ausser der User fragt explizit nach Details.`;

const EXAMPLE_CHIPS = [
  'Zeige Risiken',
  'Offene Freigaben',
  'Liquiditat',
  'Agenten-Status',
  'Tagesreport',
  'Kritische Workflows',
];

type Mode = 'ask' | 'dispatch';

export function AIQueryPanel({ onNavigate, onFilter }: AIQueryPanelProps) {
  const [mode, setMode] = useState<Mode>('ask');
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => getQueryHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [llmHealth, setLlmHealth] = useState<LlmHealth | null>(null);
  const [response, setResponse] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockResult, setMockResult] = useState<QueryResult | null>(null);
  const [meta, setMeta] = useState<{ eval_count?: number; eval_duration_ms?: number; model?: string } | null>(null);

  // Orchestrator state
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [queueMode, setQueueMode] = useState<'bullmq' | 'memory' | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkLlmHealth().then(setLlmHealth);
    const id = window.setInterval(() => checkLlmHealth().then(setLlmHealth), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Poll orchestrator tasks while dispatch mode is active OR any task is running.
  useEffect(() => {
    const anyOpen = tasks.some((t) => t.status === 'queued' || t.status === 'running');
    if (mode !== 'dispatch' && !anyOpen) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await listOrchestratorTasks({ limit: 20 });
        if (!cancelled) setTasks(list);
      } catch { /* silent */ }
    };
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [mode, tasks]);

  const retryTask = useCallback(async (id: string) => {
    try {
      await retryOrchestratorTask(id);
      const list = await listOrchestratorTasks({ limit: 20 });
      setTasks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    }
  }, []);

  const llmActive = !!llmHealth?.reachable;

  const onChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      setSuggestions(getSuggestions(value).slice(0, 4));
    } else {
      setSuggestions([]);
    }
  }, []);

  const runMock = useCallback((q: string) => {
    const res = processQuery(q);
    setMockResult(res);
    setResponse('');
    addToHistory(q, res);
    setHistory(getQueryHistory());
    if (res.pageHint && onNavigate) {
      window.setTimeout(() => res.pageHint && onNavigate(res.pageHint), 700);
    }
    if (res.parsed.filter && onFilter) {
      onFilter(res.parsed.filter as Record<string, string>);
    }
  }, [onNavigate, onFilter]);

  const submitDispatch = useCallback(async (text: string) => {
    setDispatching(true);
    setError(null);
    setResponse('');
    setMeta(null);
    try {
      const res = await dispatchChat(text);
      setResponse(res.reply);
      setQueueMode(res.queueMode);
      // Merge newly created tasks to the top
      setTasks((prev) => {
        const ids = new Set(res.tasks.map((t) => t.id));
        return [...res.tasks, ...prev.filter((t) => !ids.has(t.id))].slice(0, 20);
      });
      addToHistory(text, {
        answer: `(Auftrag → ${res.tasks.length} Task(s))`,
        parsed: { intent: 'unknown', entity: 'agent', confidence: 100, query: text },
      });
      setHistory(getQueryHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dispatch fehlgeschlagen');
    } finally {
      setDispatching(false);
    }
  }, []);

  const submit = useCallback((q: string) => {
    const text = q.trim();
    if (!text || streaming || dispatching) return;
    setError(null);
    setMockResult(null);
    setResponse('');
    setMeta(null);
    setSuggestions([]);
    setShowHistory(false);

    if (mode === 'dispatch') {
      void submitDispatch(text);
      return;
    }

    if (!llmActive) {
      runMock(text);
      return;
    }

    setStreaming(true);
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: text },
    ];
    abortRef.current = streamChat(messages, {
      model: llmHealth?.defaultModel,
      onDelta: (delta) => setResponse((prev) => prev + delta),
      onDone:  (m) => {
        setStreaming(false);
        setMeta({ ...m, model: llmHealth?.defaultModel });
        addToHistory(text, {
          answer: '(LLM-Antwort)',
          parsed: { intent: 'unknown', entity: 'unknown', confidence: 100, query: text },
        });
        setHistory(getQueryHistory());
      },
      onError: (msg) => {
        setStreaming(false);
        setError(msg);
        runMock(text);
      },
    });
  }, [mode, llmActive, llmHealth?.defaultModel, streaming, dispatching, runMock, submitDispatch]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(query);
    }
  };

  const onClear = () => {
    setQuery('');
    setResponse('');
    setMockResult(null);
    setError(null);
    setMeta(null);
    inputRef.current?.focus();
  };

  const modelLabel = useMemo(() => {
    if (!llmHealth) return 'pruefe ...';
    if (!llmActive) return 'offline (Mock)';
    return llmHealth.defaultModel || 'LLM';
  }, [llmHealth, llmActive]);

  return (
    <div className="rounded-card bg-bg-secondary border border-border-subtle p-3 flex flex-col gap-2">
      {/* Header — Row 1: title + LLM status */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
          <Sparkles className="w-3.5 h-3.5 text-accent-teal flex-shrink-0" />
          <span className="text-xs font-semibold text-text-primary tracking-tight truncate">
            {mode === 'dispatch' ? 'CEO-Auftrag' : 'KI-Suche'}
          </span>
        </div>
        <button
          type="button"
          title={`LLM: ${modelLabel}`}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border min-w-0 flex-shrink',
            llmActive
              ? 'border-status-green/40 bg-status-green/10 text-status-green'
              : 'border-border-default bg-bg-tertiary text-text-tertiary',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', llmActive ? 'bg-status-green animate-pulse-status' : 'bg-text-muted')} />
          <Cpu className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate max-w-[72px]">{modelLabel}</span>
        </button>
      </div>

      {/* Header — Row 2: mode toggle (full width, no overflow risk) */}
      <div className="flex items-center gap-1">
        <div className="flex bg-bg-tertiary rounded-full p-0.5 border border-border-subtle w-full">
          <button
            type="button"
            onClick={() => setMode('ask')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
              mode === 'ask' ? 'bg-accent-teal text-bg-primary' : 'text-text-tertiary hover:text-text-primary',
            )}
            title="Frage stellen (nur LLM-Antwort)"
          >
            <MessageSquare className="w-2.5 h-2.5" />
            Frage
          </button>
          <button
            type="button"
            onClick={() => setMode('dispatch')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
              mode === 'dispatch' ? 'bg-accent-teal text-bg-primary' : 'text-text-tertiary hover:text-text-primary',
            )}
            title="An Agenten verteilen + Cron-Verarbeitung"
          >
            <Briefcase className="w-2.5 h-2.5" />
            Auftrag
          </button>
        </div>
        {queueMode && mode === 'dispatch' && (
          <span className="text-[9px] text-text-tertiary uppercase tracking-wider flex-shrink-0">
            {queueMode === 'bullmq' ? 'redis' : 'mem'}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          ref={inputRef}
          rows={2}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            mode === 'dispatch'
              ? 'Auftrag an die Agenten (z.B. "Sende Angebot an client@x.de") ...'
              : (llmActive ? 'Frag dein Unternehmen...' : 'z.B. Zeige alle Risiken')
          }
          className={cn(
            'w-full resize-none rounded-input bg-bg-tertiary border border-border-default',
            'pl-3 pr-10 py-2 text-xs text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:border-accent-teal/60 transition-colors',
          )}
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-button flex items-center justify-center bg-status-red text-bg-primary hover:bg-status-red/90 transition-colors"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submit(query)}
            disabled={!query.trim() || dispatching}
            className={cn(
              'absolute right-1.5 bottom-1.5 w-7 h-7 rounded-button flex items-center justify-center transition-colors',
              query.trim() && !dispatching
                ? 'bg-accent-teal text-bg-primary hover:bg-accent-teal/90'
                : 'bg-bg-elevated text-text-muted cursor-not-allowed',
            )}
            title={mode === 'dispatch' ? 'An Agenten senden (Enter)' : 'Senden (Enter)'}
          >
            {dispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !response && !mockResult && (
        <div className="flex flex-col gap-0.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuery(s); submit(s); }}
              className="text-left px-2 py-1 rounded-md text-[11px] text-text-secondary hover:bg-bg-tertiary truncate transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* LLM Response */}
      {(response || streaming) && (
        <div className="rounded-md bg-bg-tertiary border border-border-subtle p-2 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {streaming ? 'Antwort ...' : 'Antwort'}
            </span>
            <div className="flex items-center gap-2">
              {streaming && <Loader2 className="w-3 h-3 text-accent-teal animate-spin" />}
              {!streaming && response && (
                <button onClick={onClear} className="text-text-muted hover:text-text-primary">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
            {response}
            {streaming && <span className="inline-block w-1.5 h-3 bg-accent-teal animate-pulse ml-0.5 align-middle" />}
          </p>
          {!streaming && meta && (meta.eval_count || meta.eval_duration_ms) && (
            <div className="mt-1.5 pt-1.5 border-t border-border-subtle text-[10px] text-text-muted font-mono-data">
              {meta.eval_count} tok / {meta.eval_duration_ms}ms
              {meta.eval_count && meta.eval_duration_ms ?
                ` (${Math.round((meta.eval_count / (meta.eval_duration_ms / 1000)) * 10) / 10} t/s)` : ''}
            </div>
          )}
        </div>
      )}

      {/* Mock NLQ result (fallback) */}
      {mockResult && !response && (
        <div className="rounded-md bg-bg-tertiary border border-border-subtle p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Mock NLQ
            </span>
            <button onClick={onClear} className="text-text-muted hover:text-text-primary">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11px] text-text-primary leading-relaxed">{mockResult.answer}</p>
          {mockResult.pageHint && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-accent-teal">
              <ChevronRight className="w-3 h-3" /> {mockResult.pageHint}
            </div>
          )}
        </div>
      )}

      {error && !mockResult && (
        <div className="text-[10px] text-status-red bg-status-red/10 border border-status-red/30 rounded-md px-2 py-1">
          {error}
        </div>
      )}

      {/* Orchestrator task list (dispatch mode) */}
      {mode === 'dispatch' && tasks.length > 0 && (
        <div className="rounded-md bg-bg-tertiary border border-border-subtle p-2 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Verteilte Auftraege ({tasks.length})
            </span>
            <button
              type="button"
              onClick={() => setTasks([])}
              className="text-text-muted hover:text-text-primary"
              title="Ausblenden"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="bg-bg-secondary rounded p-1.5 border border-border-subtle">
                <div className="flex items-center gap-1.5">
                  {t.status === 'queued' && <Clock className="w-3 h-3 text-text-tertiary" />}
                  {t.status === 'running' && <Loader2 className="w-3 h-3 text-accent-teal animate-spin" />}
                  {t.status === 'done' && <CheckCircle2 className="w-3 h-3 text-status-green" />}
                  {(t.status === 'failed' || t.status === 'cancelled') && <XCircle className="w-3 h-3 text-status-red" />}
                  <span className="text-[11px] font-medium text-text-primary truncate flex-1" title={t.title}>
                    {t.title}
                  </span>
                  {t.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => retryTask(t.id)}
                      className="text-text-tertiary hover:text-accent-teal"
                      title="Erneut versuchen"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {t.agentId && (
                    <span className="text-[9px] text-text-tertiary font-mono-data">{t.agentId}</span>
                  )}
                  {t.tool && (
                    <span className="text-[9px] text-accent-teal/80">{t.tool}</span>
                  )}
                  <span className="text-[9px] text-text-muted ml-auto">{t.status}</span>
                </div>
                {t.error && (
                  <p className="text-[10px] text-status-red mt-1 truncate" title={t.error}>{t.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Chips */}
      {!response && !mockResult && suggestions.length === 0 && (
        <div className="flex flex-wrap gap-1">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => { setQuery(chip); submit(chip); }}
              className="rounded-full bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary px-2 py-0.5 text-[10px] transition-colors border border-border-subtle"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* History toggle */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setShowHistory((p) => !p)}
          className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
        >
          <History className="w-3 h-3" />
          Verlauf {history.length > 0 && `(${history.length})`}
        </button>
        {history.length > 0 && showHistory && (
          <button
            type="button"
            onClick={() => { clearHistory(); setHistory([]); }}
            className="flex items-center gap-1 text-[10px] text-status-red hover:text-status-red/80"
          >
            <Trash2 className="w-3 h-3" /> Loeschen
          </button>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => { setQuery(h.query); submit(h.query); setShowHistory(false); }}
              className="text-left px-1.5 py-1 rounded-md text-[10px] text-text-secondary hover:bg-bg-tertiary truncate"
            >
              {h.query}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
