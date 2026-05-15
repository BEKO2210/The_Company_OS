// ═══════════════════════════════════════════════════════════════
// Natural Language Query Engine - The Company OS
// Parses German & English queries into structured dashboard filters
// ═══════════════════════════════════════════════════════════════

import type { ParsedQuery, QueryResult, QueryHistoryEntry } from './types';

// ─── Intent Keywords (Deutsch + English) ───
const INTENT_MAP: Record<string, string[]> = {
  list: [
    'zeige', 'show', 'liste', 'list', 'alle', 'all', 'welche', 'which', 'what',
    'gib', 'give', 'finde', 'find', 'suche', 'search', 'anzeigen', 'display',
    'zeig', 'lass', 'let', 'wer', 'who', 'wo', 'where',
  ],
  get: [
    'wie', 'how', 'was', 'what', 'wieviel', 'how much', 'wie hoch', 'how high',
    'wann', 'when', 'status', 'ist', 'is', 'gibt', 'are there', 'exists',
    'aktueller', 'current', 'letzter', 'latest', 'nenne', 'tell',
  ],
  count: [
    'wieviele', 'how many', 'anzahl', 'number', 'count', 'total',
    'summe', 'sum', 'gesamt', 'total',
  ],
  status: [
    'status', 'stand', 'state', 'fortschritt', 'progress',
    'wie weit', 'how far', 'läuft', 'running',
  ],
  help: [
    'hilfe', 'help', 'was kannst', 'what can', 'befehle', 'commands',
    'unterstützung', 'support', 'how to',
  ],
};

// ─── Entity Keywords ───
const ENTITY_MAP: Record<string, string[]> = {
  risks: [
    'risiken', 'risiko', 'risk', 'risks', 'gefahr', 'gefahren', 'danger',
    'bedrohung', 'threat', 'problem', 'probleme', 'problems',
  ],
  agents: [
    'agenten', 'agent', 'agents', 'bot', 'bots', 'ki', 'ai', 'assistenten',
    'mitarbeiter', 'kollegen', 'staff',
  ],
  approvals: [
    'freigaben', 'freigabe', 'approval', 'approvals', 'genehmigung',
    'genehmigungen', 'freischaltung', 'permission',
  ],
  workflows: [
    'workflow', 'workflows', 'prozess', 'prozesse', 'process', 'processes',
    'ablauf', 'abläufe',
  ],
  budget: [
    'budget', 'budgets', 'finanzen', 'finanzen', 'money', 'geld',
    'kosten', 'costs', 'expenses', 'ausgaben', 'einnahmen', 'revenue',
  ],
  liquidity: [
    'liquidität', 'liquidity', 'cash', 'cashflow', 'cash flow', 'kassenstand',
    'kasse', 'verfügbare mittel', 'available funds',
  ],
  freelancers: [
    'freelancer', 'experten', 'experts', 'consultant', 'consultants',
    'berater', 'fachkraft', 'fachkräfte', 'human expert', 'human experts',
    'workforce', 'workforce',
  ],
  break_even: [
    'break-even', 'breakeven', 'break even', 'gewinnschwelle',
    'rentabilität', 'profitabilität', 'profitability',
  ],
  departments: [
    'abteilung', 'abteilungen', 'department', 'departments', 'bereich',
    'bereiche', 'division', 'divisions', 'team', 'teams',
  ],
  studios: [
    'studio', 'studios', 'product studio', 'product studios',
    'projekt', 'projekte', 'project', 'projects', 'produkt', 'products',
  ],
  audit: [
    'audit', 'audits', 'prüfung', 'prüfungen', 'log', 'logs',
    'protokoll', 'protokolle', 'einträge', 'entries',
  ],
  incidents: [
    'vorfall', 'vorfälle', 'incident', 'incidents', 'zwischenfall',
    'problem', 'störung', 'störungen', 'issue', 'issues',
  ],
  safety_vetos: [
    'safety', 'veto', 'vetos', 'sicherheit', 'safety veto', 'safety vetos',
    'blockierung', 'blocks',
  ],
  business_units: [
    'unit', 'units', 'business unit', 'business units', 'einheit', 'einheiten',
    'geschäftsbereich', 'geschäftsbereiche', 'sparte', 'sparten',
  ],
  invoices: [
    'rechnung', 'rechnungen', 'invoice', 'invoices', 'billing', 'bill',
    'zahlung', 'zahlungen', 'payment', 'payments',
  ],
  burn_rate: [
    'burn rate', 'burn-rate', 'burnrate', 'verbrauch', 'verbrauchsrate',
    'aufwand', 'monthly burn',
  ],
  settings: [
    'einstellung', 'einstellungen', 'settings', 'configuration', 'config',
    'system', 'preferences', 'prefs',
  ],
};

// ─── Filter Keywords ───
const FILTER_MAP: Record<string, Record<string, string[]>> = {
  status: {
    pending: ['offen', 'open', 'pending', 'ausstehend', 'wartend', 'waiting'],
    approved: ['genehmigt', 'approved', 'freigegeben', 'accepted'],
    rejected: ['abgelehnt', 'rejected', 'declined', 'abgewiesen'],
    active: ['aktiv', 'active', 'running', 'läuft'],
    paused: ['pausiert', 'paused', 'halted', 'gestoppt'],
    quarantine: ['quarantäne', 'quarantine', 'isoliert', 'isolated'],
    offline: ['offline', 'inaktiv', 'inactive'],
    escalated: ['eskaliert', 'escalated', 'hochgestuft'],
    mitigated: ['gemildert', 'mitigated', 'reduziert', 'reduced'],
    monitoring: ['überwachung', 'monitoring', 'beobachtung', 'beobachtet'],
    closed: ['geschlossen', 'closed', 'done', 'erledigt'],
    available: ['verfügbar', 'available', 'frei', 'ready'],
    busy: ['beschäftigt', 'busy', 'ausgelastet'],
    partial: ['teilweise', 'partial', 'teilweise verfügbar', 'partially'],
    unavailable: ['nicht verfügbar', 'unavailable', 'nicht erreichbar'],
    critical: ['kritisch', 'critical', 'schwerwiegend', 'severe'],
    high: ['hoch', 'high', 'wichtig', 'important'],
    medium: ['mittel', 'medium', 'moderat', 'moderate'],
    low: ['niedrig', 'low', 'gering', 'minor'],
  },
  severity: {
    critical: ['kritisch', 'critical', 'schwerwiegend', 'severe'],
    high: ['hoch', 'high', 'wichtig', 'important'],
    medium: ['mittel', 'medium', 'moderat'],
    low: ['niedrig', 'low', 'gering'],
  },
};

// ─── Page Routing Hints ───
const PAGE_HINT_MAP: Record<string, string> = {
  risks: '/risks',
  agents: '/agents',
  approvals: '/approvals',
  workflows: '/workflows',
  budget: '/finance',
  liquidity: '/finance',
  break_even: '/finance',
  burn_rate: '/finance',
  freelancers: '/workforce',
  departments: '/departments',
  studios: '/studios',
  audit: '/audit',
  incidents: '/kill-switch',
  business_units: '/business-units',
  invoices: '/finance',
  safety_vetos: '/kill-switch',
  settings: '/settings',
};

// ─── Example Queries for Auto-Complete ───
export const EXAMPLE_QUERIES: string[] = [
  'Zeige mir alle Risiken in Unit B',
  'Wie hoch ist die Liquidität?',
  'Welche Agenten sind in Quarantäne?',
  'Zeige offene Freigaben',
  'Wie ist der Budget-Status von Studio Cedar?',
  'Liste alle kritischen Risiken',
  'Wann ist Break-even?',
  'Zeige Workflow-Status von Landingpage',
  'Welche Freelancer sind verfügbar?',
  'Gibt es Safety-Vetos?',
  'Zeige alle Agenten',
  'Wieviele Freigaben sind ausstehend?',
  'Status der Produkt-Studios',
  'Zeige Risiken mit hohem Schweregrad',
  'Welche Workflows sind aktiv?',
  'Finanz-Übersicht der letzten 30 Tage',
  'Zeige überfällige Freigaben',
  'Wer ist verfügbar im Workforce?',
  'Budget-Nutzung Gesamtbudget',
  'Liste alle Abteilungen',
];

// ═══════════════════════════════════════════════════════════════
// Core Parsing Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a query string: lowercase, remove extra punctuation
 */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[?!.,;:"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect intent from query string
 */
function detectIntent(q: string): { intent: string; confidence: number } {
  const normalized = normalizeQuery(q);
  let bestIntent = 'unknown';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'g');
      const matches = normalized.match(regex);
      if (matches) {
        score += matches.length * kw.length;
      }
      // Also check for partial matches at word start
      if (normalized.includes(kw.toLowerCase())) {
        score += kw.length * 0.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Fallback heuristics
  if (bestIntent === 'unknown') {
    if (normalized.match(/\b(zeige|show|liste|list|gib|give|welche|which)\b/)) {
      bestIntent = 'list';
      bestScore = 1;
    } else if (normalized.match(/\b(wie|how|was|what|wann|when|wieviel)\b/)) {
      bestIntent = 'get';
      bestScore = 1;
    }
  }

  // Count intent: look for number-related patterns
  if (normalized.match(/\b(wieviele|how many|anzahl|count|anzahl)\b/)) {
    bestIntent = 'count';
    bestScore = Math.max(bestScore, 1);
  }

  const confidence = Math.min(100, Math.max(30, bestScore * 5 + 30));
  return { intent: bestIntent, confidence };
}

/**
 * Detect entity from query string
 */
function detectEntity(q: string): { entity: string; confidence: number } {
  const normalized = normalizeQuery(q);
  let bestEntity = 'unknown';
  let bestScore = 0;

  for (const [entity, keywords] of Object.entries(ENTITY_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += kw.length;
        // Exact word boundary match gets extra points
        const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'g');
        if (regex.test(normalized)) {
          score += kw.length * 2;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntity = entity;
    }
  }

  const confidence = Math.min(100, Math.max(20, bestScore * 3 + 20));
  return { entity: bestEntity, confidence };
}

/**
 * Extract filters from query (status, unit, studio, severity)
 */
function extractFilters(q: string): Record<string, string> {
  const normalized = normalizeQuery(q);
  const filters: Record<string, string> = {};

  // ── Status filters ──
  for (const [filterKey, values] of Object.entries(FILTER_MAP.status)) {
    for (const kw of values) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(normalized)) {
        filters.status = filterKey;
        break;
      }
    }
    if (filters.status) break;
  }

  // ── Severity filters ──
  for (const [filterKey, values] of Object.entries(FILTER_MAP.severity)) {
    for (const kw of values) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(normalized)) {
        filters.severity = filterKey;
        break;
      }
    }
    if (filters.severity) break;
  }

  // ── Business Unit filter ──
  const unitMatch = normalized.match(/\b(unit)\s*([a-h])\b/i);
  if (unitMatch) {
    filters.unit = unitMatch[2].toUpperCase();
  }
  const unitPattern = /\bin\s+(?:unit\s+)?([a-h])\b/i;
  const unitAltMatch = normalized.match(unitPattern);
  if (unitAltMatch && !filters.unit) {
    filters.unit = unitAltMatch[1].toUpperCase();
  }

  // ── Studio filter ──
  const studioKeywords = ['studio cedar', 'studio aurora', 'studio bridge'];
  for (const sk of studioKeywords) {
    if (normalized.includes(sk)) {
      const studioName = sk
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      filters.studio = studioName;
      break;
    }
  }

  // ── Agent filter ──
  const agentNameMatch = normalized.match(
    /\b(cto|cfo|clo|ciso|cpo|chro|coo|ceo|sales|marketing|qa|safety|audit|brand|procurement|cs|doc|pricing|knowledge|analytics|field-ops)[\s-]?agent\b/i
  );
  if (agentNameMatch) {
    const name = agentNameMatch[1];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    filters.agent = `${capitalized}-Agent`;
  }

  // ── Workflow name filter ──
  const workflowMatch = normalized.match(/\b(?:von|of)\s+["']?([^"']+)["']?\b/i);
  if (workflowMatch && normalized.includes('workflow')) {
    filters.name = workflowMatch[1].charAt(0).toUpperCase() + workflowMatch[1].slice(1);
  }

  // ── Type filter ──
  const typeKeywords = [
    'payment', 'contract', 'invoice', 'deployment', 'freelancer',
    'purchase', 'communication',
  ];
  for (const tk of typeKeywords) {
    if (normalized.includes(tk)) {
      filters.type = tk;
      break;
    }
  }

  // ── Department filter ──
  const deptKeywords: Record<string, string> = {
    executive: 'Executive Council',
    sales: 'Sales',
    product: 'Product',
    engineering: 'Engineering',
    qa: 'QA',
    finance: 'Finance',
    legal: 'Legal/Compliance',
    security: 'Security',
    operations: 'Operations',
    marketing: 'Marketing',
    support: 'Support',
    audit: 'Audit',
  };
  for (const [key, val] of Object.entries(deptKeywords)) {
    if (normalized.includes(key)) {
      filters.department = val;
      break;
    }
  }

  return filters;
}

/**
 * Get page hint based on entity
 */
function getPageHint(entity: string): string | undefined {
  return PAGE_HINT_MAP[entity];
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a natural language query into structured dashboard filter
 */
export function parseQuery(query: string): ParsedQuery {
  const intentResult = detectIntent(query);
  const entityResult = detectEntity(query);
  const filters = extractFilters(query);

  // Adjust confidence based on combined scoring
  const combinedConfidence = Math.round(
    (intentResult.confidence + entityResult.confidence) / 2
  );

  const pageHint = getPageHint(entityResult.entity);

  return {
    intent: intentResult.intent as ParsedQuery['intent'],
    entity: entityResult.entity,
    filter: filters,
    query,
    confidence: combinedConfidence,
    pageHint,
  };
}

/**
 * Generate a human-readable answer from a parsed query
 */
export function generateAnswer(parsed: ParsedQuery): string {
  const { intent, entity, filter } = parsed;

  // Build answer text
  const entityNames: Record<string, string> = {
    risks: 'Risiken',
    agents: 'Agenten',
    approvals: 'Freigaben',
    workflows: 'Workflows',
    budget: 'Budget',
    liquidity: 'Liquidität',
    freelancers: 'Freelancer',
    break_even: 'Break-Even',
    departments: 'Abteilungen',
    studios: 'Product Studios',
    audit: 'Audit-Logs',
    incidents: 'Vorfälle',
    safety_vetos: 'Safety-Vetos',
    business_units: 'Business Units',
    invoices: 'Rechnungen',
    burn_rate: 'Burn Rate',
    settings: 'Einstellungen',
  };

  const entityName = entityNames[entity] || entity;

  if (intent === 'list' || intent === 'get') {
    const filterTexts: string[] = [];
    if (filter?.status) {
      const statusNames: Record<string, string> = {
        pending: 'ausstehende',
        approved: 'genehmigte',
        rejected: 'abgelehnte',
        active: 'aktive',
        paused: 'pausierte',
        quarantine: 'in Quarantäne',
        offline: 'offline',
        escalated: 'eskalierte',
        mitigated: 'gemilderte',
        monitoring: 'in Überwachung',
        closed: 'geschlossene',
        available: 'verfügbare',
        busy: 'beschäftigte',
        partial: 'teilweise verfügbare',
        unavailable: 'nicht verfügbare',
        critical: 'kritische',
        high: 'hochpriore',
        medium: 'mittlere',
        low: 'niedrige',
      };
      filterTexts.push(statusNames[String(filter.status)] || String(filter.status));
    }
    if (filter?.unit) {
      filterTexts.push(`in Unit ${filter.unit}`);
    }
    if (filter?.studio) {
      filterTexts.push(`für ${filter.studio}`);
    }
    if (filter?.severity) {
      const sevNames: Record<string, string> = {
        critical: 'kritische',
        high: 'hohe',
        medium: 'mittlere',
        low: 'niedrige',
      };
      filterTexts.push(`mit ${sevNames[String(filter.severity)] || String(filter.severity)}m Schweregrad`);
    }
    if (filter?.agent) {
      filterTexts.push(`für ${filter.agent}`);
    }

    if (filterTexts.length > 0) {
      return `${filterTexts.join(' ')} ${entityName} anzeigen`;
    }
    return `Alle ${entityName} anzeigen`;
  }

  if (intent === 'count') {
    return `Anzahl ${entityName} berechnen`;
  }

  if (intent === 'status') {
    return `Status von ${entityName} abrufen`;
  }

  if (intent === 'help') {
    return 'Verfügbare Befehle anzeigen';
  }

  return `Abfrage für ${entityName} verarbeiten`;
}

/**
 * Process a full query and return structured result
 */
export function processQuery(query: string): QueryResult {
  const parsed = parseQuery(query);
  const answer = generateAnswer(parsed);

  return {
    parsed,
    answer,
    pageHint: parsed.pageHint,
  };
}

// ─── Query History Management ───

const HISTORY_KEY = 'cos_nlq_history';
const MAX_HISTORY = 10;

/**
 * Get stored query history
 */
export function getQueryHistory(): QueryHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

/**
 * Add a query result to history (max 10 entries, newest first)
 */
export function addToHistory(query: string, result: QueryResult): void {
  const history = getQueryHistory();
  const entry: QueryHistoryEntry = {
    query,
    result,
    timestamp: Date.now(),
  };
  const newHistory = [entry, ...history].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch {
    // ignore storage errors
  }
}

/**
 * Clear query history
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Get matching example queries based on partial input
 */
export function getSuggestions(partial: string): string[] {
  const normalized = normalizeQuery(partial);
  if (normalized.length < 2) return EXAMPLE_QUERIES.slice(0, 5);

  return EXAMPLE_QUERIES.filter((q) => {
    const nq = normalizeQuery(q);
    // Check word starts
    const words = nq.split(' ');
    const partials = normalized.split(' ');
    return partials.every((p) =>
      words.some((w) => w.startsWith(p)) || nq.includes(p)
    );
  }).slice(0, 5);
}
