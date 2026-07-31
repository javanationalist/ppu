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

export function showNewInformationNotification(title?: string, content?: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notificationTitle = 'PPU Digital';
    const notificationBody = 'Ada informasi terbaru dari Panitia Pemilihan.';

    const notification = new Notification(notificationTitle, {
      body: notificationBody,
      icon: '/favicon.ico',
      tag: 'ppu-new-wafo',
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (window.location.pathname !== '/informasi') {
        window.location.href = '/informasi';
      }
    };
  } catch (err) {
    console.error('Error displaying notification:', err);
  }
}

// Broadcast new announcement event across browser tabs
export function broadcastNewInformationEvent(title?: string, content?: string): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
      channel.postMessage({ type: 'NEW_INFORMATION', title, content, timestamp: Date.now() });
      channel.close();
    }
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }

  // Also dispatch local window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wafo_new_announcement', { detail: { title, content } }));
  }
}

// Subscribe to BroadcastChannel messages
export function subscribeToNotificationBroadcast(onNewInfo: () => void): () => void {
  let channel: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(NOTIF_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_INFORMATION') {
          onNewInfo();
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel subscription error:', err);
    }
  }

  const handleCustomEvent = () => {
    onNewInfo();
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
