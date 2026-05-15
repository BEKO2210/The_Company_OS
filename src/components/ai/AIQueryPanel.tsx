import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mic,
  Search,
  Clock,
  X,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  processQuery,
  getSuggestions,
  getQueryHistory,
  addToHistory,
  clearHistory,
} from '@/ai';
import type { QueryResult, QueryHistoryEntry } from '@/ai/types';

interface AIQueryPanelProps {
  onNavigate?: (path: string) => void;
  onFilter?: (filter: Record<string, string>) => void;
}

export function AIQueryPanel({ onNavigate, onFilter }: AIQueryPanelProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getQueryHistory());
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions as user types
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setResult(null);
    if (value.length >= 2) {
      setSuggestions(getSuggestions(value));
      setShowSuggestions(true);
      setShowHistory(false);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  // Execute query
  const executeQuery = useCallback(
    (q: string) => {
      if (!q.trim()) return;

      const res = processQuery(q);
      setResult(res);
      addToHistory(q, res);
      setHistory(getQueryHistory());
      setQuery(q);
      setShowSuggestions(false);
      setShowHistory(false);

      // Auto-navigate if page hint available
      if (res.pageHint && onNavigate) {
        setTimeout(() => {
          if (res.pageHint) onNavigate(res.pageHint);
        }, 800);
      }

      // Apply filter if present
      if (res.parsed.filter && onFilter) {
        onFilter(res.parsed.filter as Record<string, string>);
      }
    },
    [onNavigate, onFilter]
  );

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query);
  };

  // Use a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeQuery(suggestion);
  };

  // Use history entry
  const handleHistoryClick = (entry: QueryHistoryEntry) => {
    setQuery(entry.query);
    setResult(entry.result);
    setShowHistory(false);
  };

  // Clear all history
  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setShowHistory(false);
  };

  // Toggle history view
  const toggleHistory = () => {
    setShowHistory((prev) => !prev);
    setShowSuggestions(false);
    if (!showHistory) {
      setHistory(getQueryHistory());
    }
  };

  // Simulated voice input
  const toggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    // Auto-stop after 3 seconds (simulated)
    setTimeout(() => {
      setIsListening(false);
      setQuery('Zeige alle Risiken');
    }, 3000);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <Card className="w-full" ref={panelRef}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          KI-Suche
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="z.B. 'Zeige alle Risiken'..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                  if (query.length >= 2) {
                    setSuggestions(getSuggestions(query));
                    setShowSuggestions(true);
                  }
                }}
                className="pl-9 pr-4"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleVoice}
              className={isListening ? 'animate-pulse text-red-500' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleHistory}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1 rounded-md border bg-popover shadow-md">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Vorschläge
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => handleSuggestionClick(s)}
              >
                <Search className="h-3 w-3 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* History Dropdown */}
        {showHistory && (
          <div className="mt-1 rounded-md border bg-popover shadow-md">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Verlauf (letzte 10)
              </span>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Löschen
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                Keine Suchhistorie
              </div>
            ) : (
              history.map((entry, i) => (
                <button
                  key={i}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => handleHistoryClick(entry)}
                >
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{entry.query}</span>
                  {entry.result.pageHint && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Voice Indicator */}
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-500 animate-pulse">
            <Mic className="h-4 w-4" />
            Höre zu... Sprechen Sie Ihre Abfrage
          </div>
        )}

        {/* Query Result */}
        {result && (
          <div className="mt-3 rounded-md border bg-muted/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Interpretation
              </span>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-medium ${getConfidenceColor(
                    result.parsed.confidence
                  )}`}
                >
                  {result.parsed.confidence}% Konfidenz
                </span>
                <button
                  onClick={() => setResult(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="text-sm font-medium">{result.answer}</p>
            {result.parsed.filter &&
              Object.keys(result.parsed.filter).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(result.parsed.filter).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            {result.pageHint && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Navigiere zu: {result.pageHint}
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Intent: <code>{result.parsed.intent}</code> | Entity:{" "}
              <code>{result.parsed.entity}</code>
            </div>
          </div>
        )}

        {/* Quick Example Chips */}
        {!result && !showSuggestions && !showHistory && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              'Zeige Risiken',
              'Offene Freigaben',
              'Liquidität',
              'Agenten-Status',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSuggestionClick(chip)}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
