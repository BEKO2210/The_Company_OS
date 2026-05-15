/**
 * Offline-Storage
 * Speichert kritische Daten in IndexedDB fuer Offline-Nutzung.
 */

import type { Approval, Risk, Agent, AuditLogEntry } from '@/data/models';

const OFFLINE_DB_NAME = 'company-os-offline';
const OFFLINE_DB_VERSION = 1;

export interface PendingAction {
  localId?: number;
  id: string;
  type: 'approval' | 'agent' | 'workflow' | 'kill-switch' | 'audit' | 'other';
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

export interface CachedKPIs {
  key: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export class OfflineStorage {
  private db: IDBDatabase | null = null;
  private static instance: OfflineStorage | null = null;

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private constructor() {}

  /** Oeffnet die IndexedDB-Verbindung. */
  async open(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[OfflineStorage] Upgrading database to v' + OFFLINE_DB_VERSION);

        // KPIs store
        if (!db.objectStoreNames.contains('kpis')) {
          db.createObjectStore('kpis', { keyPath: 'key' });
        }

        // Approvals store
        if (!db.objectStoreNames.contains('approvals')) {
          db.createObjectStore('approvals', { keyPath: 'id' });
        }

        // Agents store
        if (!db.objectStoreNames.contains('agents')) {
          db.createObjectStore('agents', { keyPath: 'id' });
        }

        // Audit log store
        if (!db.objectStoreNames.contains('audit')) {
          db.createObjectStore('audit', { keyPath: 'id' });
        }

        // Pending actions store (auto-increment)
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'localId', autoIncrement: true });
        }

        // Risks store
        if (!db.objectStoreNames.contains('risks')) {
          db.createObjectStore('risks', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /** Schliesst die Datenbankverbindung. */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ---- KPIs ----

  async storeKPIs(key: string, kpis: Record<string, unknown>): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('kpis', 'readwrite');
    const store = tx.objectStore('kpis');
    await promisifyRequest(
      store.put({ key, data: kpis, timestamp: new Date().toISOString() })
    );
  }

  async getKPIs(key: string): Promise<CachedKPIs | null> {
    await this.ensureOpen();
    const tx = this.db!.transaction('kpis', 'readonly');
    const store = tx.objectStore('kpis');
    return promisifyRequest(store.get(key)) || null;
  }

  async getAllKPIs(): Promise<CachedKPIs[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('kpis', 'readonly');
    const store = tx.objectStore('kpis');
    return promisifyRequest(store.getAll()) || [];
  }

  // ---- Approvals ----

  async storeApprovals(approvals: Approval[]): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('approvals', 'readwrite');
    const store = tx.objectStore('approvals');
    for (const approval of approvals) {
      await promisifyRequest(store.put(approval));
    }
  }

  async getApproval(id: string): Promise<Approval | null> {
    await this.ensureOpen();
    const tx = this.db!.transaction('approvals', 'readonly');
    const store = tx.objectStore('approvals');
    return promisifyRequest(store.get(id)) || null;
  }

  async getAllApprovals(): Promise<Approval[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('approvals', 'readonly');
    const store = tx.objectStore('approvals');
    return promisifyRequest(store.getAll()) || [];
  }

  async clearApprovals(): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('approvals', 'readwrite');
    const store = tx.objectStore('approvals');
    await promisifyRequest(store.clear());
  }

  // ---- Risks ----

  async storeRisks(risks: Risk[]): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('risks', 'readwrite');
    const store = tx.objectStore('risks');
    for (const risk of risks) {
      await promisifyRequest(store.put(risk));
    }
  }

  async getAllRisks(): Promise<Risk[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('risks', 'readonly');
    const store = tx.objectStore('risks');
    return promisifyRequest(store.getAll()) || [];
  }

  // ---- Agents ----

  async storeAgents(agents: Agent[]): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('agents', 'readwrite');
    const store = tx.objectStore('agents');
    for (const agent of agents) {
      await promisifyRequest(store.put(agent));
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('agents', 'readonly');
    const store = tx.objectStore('agents');
    return promisifyRequest(store.getAll()) || [];
  }

  // ---- Audit ----

  async storeAuditEntries(entries: AuditLogEntry[]): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('audit', 'readwrite');
    const store = tx.objectStore('audit');
    for (const entry of entries) {
      await promisifyRequest(store.put(entry));
    }
  }

  async getAllAuditEntries(): Promise<AuditLogEntry[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('audit', 'readonly');
    const store = tx.objectStore('audit');
    return promisifyRequest(store.getAll()) || [];
  }

  // ---- Pending Actions (Offline-Queue) ----

  async queueAction(action: Omit<PendingAction, 'localId' | 'timestamp' | 'retryCount'>): Promise<number> {
    await this.ensureOpen();
    const tx = this.db!.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const fullAction: Omit<PendingAction, 'localId'> = {
      ...action,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    const result = await promisifyRequest(store.add(fullAction));
    return Number(result);
  }

  async getPendingActions(): Promise<PendingAction[]> {
    await this.ensureOpen();
    const tx = this.db!.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    return promisifyRequest(store.getAll()) || [];
  }

  async removePendingAction(localId: number): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    await promisifyRequest(store.delete(localId));
  }

  async clearPendingActions(): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    await promisifyRequest(store.clear());
  }

  async incrementRetryCount(localId: number): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const action = await promisifyRequest<PendingAction>(store.get(localId));
    if (action) {
      action.retryCount += 1;
      await promisifyRequest(store.put(action));
    }
  }

  // ---- Settings ----

  async storeSetting(key: string, value: unknown): Promise<void> {
    await this.ensureOpen();
    const tx = this.db!.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    await promisifyRequest(store.put({ key, value, timestamp: new Date().toISOString() }));
  }

  async getSetting<T>(key: string): Promise<T | null> {
    await this.ensureOpen();
    const tx = this.db!.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const result = await promisifyRequest<{ value: T } | undefined>(store.get(key));
    return result?.value ?? null;
  }

  // ---- Helpers ----

  private async ensureOpen(): Promise<void> {
    if (!this.db) {
      await this.open();
    }
  }

  /** Prueft ob IndexedDB verfuegbar ist. */
  static isAvailable(): boolean {
    return 'indexedDB' in window;
  }

  /** Gibt die Groesse aller gespeicherten Daten zurueck. */
  async getStorageSize(): Promise<{ stores: Record<string, number>; total: number }> {
    await this.ensureOpen();
    const stores = Array.from(this.db!.objectStoreNames);
    const result: Record<string, number> = {};
    let total = 0;

    for (const storeName of stores) {
      const tx = this.db!.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const count = await promisifyRequest<number>(store.count());
      result[storeName] = count;
      total += count;
    }

    return { stores: result, total };
  }

  /** Loescht alle Offline-Daten. */
  async clearAll(): Promise<void> {
    await this.ensureOpen();
    const stores = Array.from(this.db!.objectStoreNames);
    for (const storeName of stores) {
      const tx = this.db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await promisifyRequest(store.clear());
    }
    console.log('[OfflineStorage] All data cleared');
  }
}

// ---- Helper ----

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Singleton-Export */
export const offlineStorage = OfflineStorage.getInstance();
