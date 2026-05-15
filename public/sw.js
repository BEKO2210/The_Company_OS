const CACHE_NAME = 'company-os-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.warn('[SW] Cache addAll failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip API calls - let them pass through
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version immediately
      if (cached) {
        // Revalidate in background
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for document requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline - Inhalt nicht verfuegbar', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text() || 'Neue Benachrichtigung' };
  }

  const title = data.title || 'The Company OS';
  const options = {
    body: data.body || 'Neue Benachrichtigung',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    renotify: data.renotify || false,
    silent: data.silent || false,
    data: data.payload || {},
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now(),
    vibrate: data.vibrate || [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();

            // Post message to app about the action
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action,
              tag: event.notification.tag,
              data
            });
            return;
          }
        }

        // Open new window
        const url = data.url || '/';
        if (self.clients.openWindow) {
          self.clients.openWindow(url);
        }
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-approvals') {
    event.waitUntil(syncApprovals());
  } else if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  } else if (event.tag === 'sync-audit') {
    event.waitUntil(syncAuditLog());
  }
});

// Message handler from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'REGISTER_SYNC') {
    if ('sync' in self.registration) {
      self.registration.sync.register(event.data.tag || 'sync-actions');
    }
  }
});

// Periodic sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-refresh') {
    event.waitUntil(syncDataRefresh());
  }
});

// ---- Sync Functions ----

async function syncApprovals() {
  console.log('[SW] Syncing approvals...');
  try {
    const db = await openIndexedDB();
    const pendingActions = await getPendingActions(db);

    for (const action of pendingActions.filter(a => a.type === 'approval')) {
      try {
        await fetch('/api/approvals/' + action.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload)
        });
        await removePendingAction(db, action.localId);
      } catch (err) {
        console.warn('[SW] Approval sync failed:', err);
      }
    }
    db.close();
  } catch (err) {
    console.error('[SW] syncApprovals error:', err);
  }
}

async function syncPendingActions() {
  console.log('[SW] Syncing pending actions...');
  try {
    const db = await openIndexedDB();
    const pendingActions = await getPendingActions(db);

    for (const action of pendingActions) {
      try {
        await fetch(action.endpoint, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload)
        });
        await removePendingAction(db, action.localId);
      } catch (err) {
        console.warn('[SW] Action sync failed:', err);
      }
    }
    db.close();
  } catch (err) {
    console.error('[SW] syncPendingActions error:', err);
  }
}

async function syncAuditLog() {
  console.log('[SW] Syncing audit log...');
  // Implementation for audit log sync
}

async function syncDataRefresh() {
  console.log('[SW] Periodic data refresh...');
  // Triggered by periodic sync - refresh KPIs etc.
}

// ---- IndexedDB Helpers ----

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('company-os-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingActions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removePendingAction(db, localId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const request = store.delete(localId);
    request.onsuccess = () => resolve(undefined);
    request.onerror = () => reject(request.error);
  });
}
