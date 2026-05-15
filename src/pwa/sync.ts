/**
 * Background Sync
 * Registriert Background-Sync fuer Offline-Aktionen.
 */

export interface SyncOptions {
  tag: string;
  immediate?: boolean;
}

/**
 * Registriert einen Background-Sync.
 */
export async function registerSync(options: SyncOptions): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not available');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!('sync' in registration)) {
      console.warn('[PWA] Background Sync not supported');
      return false;
    }

    const syncManager = registration.sync as {
      register: (tag: string) => Promise<void>;
    };

    await syncManager.register(options.tag);
    console.log('[PWA] Background sync registered:', options.tag);
    return true;
  } catch (err) {
    console.error('[PWA] Background sync registration failed:', err);
    return false;
  }
}

/**
 * Sync fuer Freigabe-Aktionen.
 */
export async function registerApprovalSync(): Promise<boolean> {
  return registerSync({ tag: 'sync-approvals' });
}

/**
 * Sync fuer generische Aktionen.
 */
export async function registerActionSync(): Promise<boolean> {
  return registerSync({ tag: 'sync-actions' });
}

/**
 * Sync fuer Audit-Log.
 */
export async function registerAuditSync(): Promise<boolean> {
  return registerSync({ tag: 'sync-audit' });
}

/**
 * Prueft ob Background Sync verfuegbar ist.
 */
export function isBackgroundSyncAvailable(): boolean {
  return 'serviceWorker' in navigator && 'sync' in (navigator.serviceWorker?.ready || {});
}

/**
 * Manuelles Ausloesen eines Sync (nur zu Testzwecken).
 */
export async function triggerManualSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'REGISTER_SYNC', tag });
    return true;
  } catch {
    return false;
  }
}
