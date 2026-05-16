// Typed localStorage wrapper for first-run company setup.
// Keys are namespaced under `company-os.*`.

const NS = 'company-os';
const K_SETUP_DONE = `${NS}.setup.completed`;
const K_CONFIG = `${NS}.config`;

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
  createdAt: string;
}

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
  createdAt: '',
};

export function isSetupCompleted(): boolean {
  try {
    return localStorage.getItem(K_SETUP_DONE) === 'true';
  } catch {
    return true; // If localStorage unavailable, don't block UI.
  }
}

export function markSetupCompleted(): void {
  try {
    localStorage.setItem(K_SETUP_DONE, 'true');
  } catch {
    /* ignore */
  }
}

export function resetSetup(): void {
  try {
    localStorage.removeItem(K_SETUP_DONE);
    localStorage.removeItem(K_CONFIG);
  } catch {
    /* ignore */
  }
}

export function getCompanyConfig(): CompanyConfig {
  try {
    const raw = localStorage.getItem(K_CONFIG);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<CompanyConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveCompanyConfig(config: CompanyConfig): void {
  try {
    const withTimestamp = { ...config, createdAt: config.createdAt || new Date().toISOString() };
    localStorage.setItem(K_CONFIG, JSON.stringify(withTimestamp));
  } catch {
    /* ignore */
  }
}
