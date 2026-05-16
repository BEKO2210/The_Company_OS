// Typed localStorage wrapper for first-run company setup.
// Keys are namespaced under `company-os.*`.

const NS = 'company-os';
const K_SETUP_DONE = `${NS}.setup.completed`;
const K_CONFIG = `${NS}.config`;

// ─── Adapter & DB types ──────────────────────────────────────────────

export type AdapterKey =
  | 'ai'
  | 'email' | 'linkedin' | 'banking' | 'accounting'
  | 'github' | 'hosting' | 'calendar' | 'freelancer';

export interface AdapterConfig {
  enabled: boolean;
  provider: string;                  // dropdown selection per adapter
  credentials: Record<string, string>;
}

export type AdaptersConfig = Record<AdapterKey, AdapterConfig>;

export interface DatabaseConfig {
  type: 'sqlite';
  path: string;                      // default ./data/company-os.db
}

// ─── Company config ──────────────────────────────────────────────────

export interface CompanyConfig {
  companyName: string;
  founderName: string;
  founderEmail: string;
  founderRole: string;
  departments: { id: string; name: string }[];
  agents: { id: string; name: string; role: string; department: string; autonomyLevel: 'full' | 'supervised' | 'approval-required' | 'human-only'; riskCeiling: 'low' | 'medium' | 'high' | 'critical' }[];
  businessUnit: { id: string; name: string; revenueModel: string; phase: number } | null;
  budget: { monthly: number; liquidityTarget: number; breakEvenTarget: number };
  killSwitchArmed: boolean;
  database: DatabaseConfig;
  adapters: AdaptersConfig;
  createdAt: string;
}

const EMPTY_ADAPTER = (provider: string): AdapterConfig => ({
  enabled: false,
  provider,
  credentials: {},
});

export const DEFAULT_ADAPTERS: AdaptersConfig = {
  ai: {
    enabled: true,
    provider: 'ollama',
    credentials: {
      url: 'http://localhost:11434',
      model: 'mistral-nemo:12b',
    },
  },
  email:      EMPTY_ADAPTER('smtp'),
  linkedin:   EMPTY_ADAPTER('linkedin-api'),
  banking:    EMPTY_ADAPTER('plaid'),
  accounting: EMPTY_ADAPTER('lexware'),
  github:     EMPTY_ADAPTER('github-pat'),
  hosting:    EMPTY_ADAPTER('vercel'),
  calendar:   EMPTY_ADAPTER('google'),
  freelancer: EMPTY_ADAPTER('upwork'),
};

export const DEFAULT_DATABASE: DatabaseConfig = {
  type: 'sqlite',
  path: './data/company-os.db',
};

export const DEFAULT_CONFIG: CompanyConfig = {
  companyName: '',
  founderName: '',
  founderEmail: '',
  founderRole: 'CEO',
  departments: [],
  agents: [],
  businessUnit: null,
  budget: { monthly: 0, liquidityTarget: 0, breakEvenTarget: 0 },
  killSwitchArmed: true,
  database: { ...DEFAULT_DATABASE },
  adapters: structuredClone(DEFAULT_ADAPTERS),
  createdAt: '',
};

export function isSetupCompleted(): boolean {
  try {
    return localStorage.getItem(K_SETUP_DONE) === 'true';
  } catch {
    return true;
  }
}

export function markSetupCompleted(): void {
  try {
    localStorage.setItem(K_SETUP_DONE, 'true');
  } catch { /* ignore */ }
}

export function resetSetup(): void {
  try {
    localStorage.removeItem(K_SETUP_DONE);
    localStorage.removeItem(K_CONFIG);
  } catch { /* ignore */ }
}

export function getCompanyConfig(): CompanyConfig {
  try {
    const raw = localStorage.getItem(K_CONFIG);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw) as Partial<CompanyConfig>;
    return {
      ...cloneDefault(),
      ...parsed,
      database: { ...DEFAULT_DATABASE, ...(parsed.database || {}) },
      adapters: mergeAdapters(parsed.adapters),
    };
  } catch {
    return cloneDefault();
  }
}

export function saveCompanyConfig(config: CompanyConfig): void {
  try {
    const withTimestamp = { ...config, createdAt: config.createdAt || new Date().toISOString() };
    localStorage.setItem(K_CONFIG, JSON.stringify(withTimestamp));
  } catch { /* ignore */ }
}

function cloneDefault(): CompanyConfig {
  return {
    ...DEFAULT_CONFIG,
    database: { ...DEFAULT_DATABASE },
    adapters: structuredClone(DEFAULT_ADAPTERS),
  };
}

function mergeAdapters(partial: Partial<AdaptersConfig> | undefined): AdaptersConfig {
  const out = structuredClone(DEFAULT_ADAPTERS);
  if (!partial) return out;
  for (const k of Object.keys(out) as AdapterKey[]) {
    const incoming = partial[k];
    if (incoming) {
      out[k] = {
        enabled: !!incoming.enabled,
        provider: incoming.provider || out[k].provider,
        credentials: { ...out[k].credentials, ...(incoming.credentials || {}) },
      };
    }
  }
  return out;
}
