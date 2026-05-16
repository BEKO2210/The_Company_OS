import { useEffect, useState } from 'react';
import { isSetupCompleted, markSetupCompleted, resetSetup as clearSetup } from '@/lib/storage';

export function useFirstRun() {
  const [needsSetup, setNeedsSetup] = useState<boolean>(() => !isSetupCompleted());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('company-os.')) {
        setNeedsSetup(!isSetupCompleted());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return {
    needsSetup,
    completeSetup: () => {
      markSetupCompleted();
      setNeedsSetup(false);
    },
    resetSetup: () => {
      clearSetup();
      setNeedsSetup(true);
    },
  };
}
