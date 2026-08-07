export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const NOTIF_CHANNEL_NAME = 'ppu_digital_notifications';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return getNotificationPermission();
  }
}

export function showNewInformationNotification(title?: string, content?: string): boolean {
  if (!isNotificationSupported()) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notificationTitle = title || 'SUARAKU';
    const notificationBody = content || 'Informasi baru tersedia di WAFO.';

    const notification = new Notification(notificationTitle, {
      body: notificationBody,
      icon: '/favicon.ico',
      tag: 'ppu-new-wafo-' + Date.now(),
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (window.location.pathname !== '/informasi') {
        window.location.href = '/informasi';
      }
    };
    return true;
  } catch (err) {
    console.error('Error displaying notification:', err);
    return false;
  }
}

// Broadcast new announcement event across browser tabs
export function broadcastNewInformationEvent(id?: string, title?: string, content?: string): void {
  const payload = { type: 'NEW_INFORMATION', id, title, content, timestamp: Date.now() };
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }

  // Also dispatch local window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wafo_new_announcement', { detail: payload }));
  }
}

// Subscribe to BroadcastChannel messages
export function subscribeToNotificationBroadcast(
  onNewInfo: (detail?: { id?: string; title?: string; content?: string }) => void
): () => void {
  let channel: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_INFORMATION') {
          onNewInfo(event.data);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel subscription error:', err);
    }
  }

  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent;
    onNewInfo(customEvt.detail);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('wafo_new_announcement', handleCustomEvent);
  }

  return () => {
    if (channel) {
      channel.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('wafo_new_announcement', handleCustomEvent);
    }
  };
}

