/**
 * Push-Notifications
 * Lokale und Push-Benachrichtigungen fuer wichtige System-Events.
 */

import type { Approval, Risk } from '@/data/models';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, unknown>;
  vibrate?: number[];
  timestamp?: number;
}

/**
 * Sendet eine lokale Benachrichtigung ueber den Service Worker.
 */
export async function sendLocalNotification(
  title: string,
  options?: NotificationPayload
): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[PWA] Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
      data: {
        ...options?.data,
        url: options?.data?.url || '/',
      },
    });
  } catch (err) {
    console.error('[PWA] Failed to show notification:', err);
  }
}

/**
 * Benachrichtigung fuer erforderliche Freigabe.
 */
export function notifyApprovalRequired(approval: Approval): void {
  sendLocalNotification('Freigabe erforderlich', {
    body: `${approval.title} (${approval.type}) - Risiko: ${approval.riskLevel}`,
    tag: `approval-${approval.id}`,
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'approve', title: 'Genehmigen' },
      { action: 'reject', title: 'Ablehnen' },
      { action: 'view', title: 'Ansehen' },
    ],
    data: {
      url: '/approvals',
      approvalId: approval.id,
    },
  });
}

/**
 * Benachrichtigung fuer Risiko-Alert.
 */
export function notifyRiskAlert(risk: Risk): void {
  const isCritical = risk.score >= 15;

  sendLocalNotification(isCritical ? 'KRITISCHES RISIKO' : 'Risk Alert', {
    body: `${risk.name} (Score: ${risk.score}/25, Kategorie: ${risk.category})`,
    tag: `risk-${risk.id}`,
    requireInteraction: isCritical,
    vibrate: isCritical ? [300, 100, 300, 100, 300] : [200, 100, 200],
    actions: isCritical
      ? [
          { action: 'view', title: 'Ansehen' },
          { action: 'mitigate', title: 'Mitigieren' },
        ]
      : [{ action: 'view', title: 'Ansehen' }],
    data: {
      url: '/risk-center',
      riskId: risk.id,
    },
  });
}

/**
 * Benachrichtigung fuer Kill-Switch-Aktivierung.
 */
export function notifyKillSwitch(level: number): void {
  sendLocalNotification('NOT-AUS aktiviert!', {
    body: `Kill Switch Level ${level} wurde ausgeloest! Alle Agenten werden gestoppt.`,
    tag: 'kill-switch',
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
    actions: [
      { action: 'view', title: 'Ansehen' },
      { action: 'acknowledge', title: 'Bestaetigen' },
    ],
    data: {
      url: '/kill-switch',
      level,
    },
  });
}

/**
 * Benachrichtigung fuer Workflow-Fehler.
 */
export function notifyWorkflowError(
  workflowName: string,
  error: string
): void {
  sendLocalNotification('Workflow-Fehler', {
    body: `${workflowName}: ${error}`,
    tag: `workflow-error-${Date.now()}`,
    actions: [{ action: 'view', title: 'Ansehen' }],
    data: {
      url: '/workflows',
    },
  });
}

/**
 * Benachrichtigung fuer Budget-Warnung.
 */
export function notifyBudgetWarning(
  category: string,
  spent: number,
  budget: number
): void {
  const percent = Math.round((spent / budget) * 100);

  sendLocalNotification('Budget-Warnung', {
    body: `${category}: ${percent}% des Budgets aufgebraucht (${spent.toLocaleString('de-DE')} / ${budget.toLocaleString('de-DE')} EUR)`,
    tag: `budget-${category}`,
    requireInteraction: percent >= 90,
    actions: [{ action: 'view', title: 'Ansehen' }],
    data: {
      url: '/finance',
    },
  });
}

/**
 * Generische System-Benachrichtigung.
 */
export function notifySystem(
  title: string,
  message: string,
  options?: Partial<NotificationPayload>
): void {
  sendLocalNotification(title, {
    body: message,
    tag: `system-${Date.now()}`,
    ...options,
  });
}

/**
 * Prueft ob Notifications verfuegbar sind.
 */
export function areNotificationsAvailable(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Gibt den aktuellen Notification-Permission-Status zurueck.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
