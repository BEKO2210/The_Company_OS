import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type CompanyConfig, DEFAULT_CONFIG,
  getCompanyConfig, saveCompanyConfig, resetSetup,
} from '@/lib/storage';

interface CompanyContextValue {
  config: CompanyConfig;
  save: (next: CompanyConfig) => void;
  reset: () => void;
  isConfigured: boolean; // true if at least a company name is set
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CompanyConfig>(() => getCompanyConfig());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('company-os.')) {
        setConfig(getCompanyConfig());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((next: CompanyConfig) => {
    saveCompanyConfig(next);
    setConfig(next);
  }, []);

  const reset = useCallback(() => {
    resetSetup();
    setConfig({ ...DEFAULT_CONFIG });
  }, []);

  const value = useMemo<CompanyContextValue>(
    () => ({ config, save, reset, isConfigured: !!config.companyName }),
    [config, save, reset],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyConfig(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompanyConfig must be used inside <CompanyProvider>');
  return ctx;
}
