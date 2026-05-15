/**
 * PWA Initialisierung
 * Registriert Service Worker und fordert Benachrichtigungsberechtigungen an.
 */

/**
 * Dynamically injects PWA icon links into document head.
 * Done at runtime to avoid Vite build-time asset processing issues.
 */
function injectPWALinks(): void {
  const iconSizes = [72, 96, 128, 144, 152, 192];
  const head = document.head;

  // Favicon
  const favicon32 = document.createElement('link');
  favicon32.rel = 'icon';
  favicon32.type = 'image/png';
  favicon32.sizes = '32x32';
  favicon32.href = 'icons/icon-72.png';
  head.appendChild(favicon32);

  const favicon16 = document.createElement('link');
  favicon16.rel = 'icon';
  favicon16.type = 'image/png';
  favicon16.sizes = '16x16';
  favicon16.href = 'icons/icon-72.png';
  head.appendChild(favicon16);

  // Apple touch icons
  for (const size of iconSizes) {
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.sizes = `${size}x${size}`;
    link.href = `icons/icon-${size}.png`;
    head.appendChild(link);
  }

  // MS Tile Image
  const msTile = document.createElement('meta');
  msTile.name = 'msapplication-TileImage';
  msTile.content = 'icons/icon-144.png';
  head.appendChild(msTile);
}

export function initPWA(): void {
  // Inject PWA links dynamically
  injectPWALinks();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);

          // Handle updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available');
                  window.dispatchEvent(new CustomEvent('sw-update-available'));
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        window.dispatchEvent(
          new CustomEvent('pwa-notification-action', { detail: event.data })
        );
      }
    });
  }

  // Request notification permission
  requestNotificationPermission();

  // Listen for online/offline
  window.addEventListener('online', () => {
    console.log('[PWA] App is online');
    window.dispatchEvent(new CustomEvent('app-online'));
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] App is offline');
    window.dispatchEvent(new CustomEvent('app-offline'));
  });
}

async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);

    if (permission === 'granted') {
      subscribeToPush();
    }
  } catch (err) {
    console.error('[PWA] Notification permission error:', err);
  }
}

async function subscribeToPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for Push API support
    if (!('pushManager' in registration)) {
      console.log('[PWA] Push API not supported');
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[PWA] No push subscription yet');
      // In production: subscribe with applicationServerKey
    } else {
      console.log('[PWA] Push subscription exists');
    }
  } catch (err) {
    console.error('[PWA] Push subscription error:', err);
  }
}

/**
 * Trigger a manual service worker update check
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  await registration.update();
  return !!registration.waiting;
}

/**
 * Skip waiting and activate new service worker
 */
export async function activateUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}
