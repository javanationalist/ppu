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

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      return existing;
    }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[Notification] Could not register /sw.js:', err);
    return null;
  }
}

export async function showNewInformationNotification(
  title?: string,
  content?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isNotificationSupported()) {
    const msg = 'Browser/perangkat Anda tidak mendukung Web Notification API.';
    console.error('[Notification]', msg);
    return { success: false, error: msg };
  }

  const currentPerm = Notification.permission;
  if (currentPerm !== 'granted') {
    const msg = `Izin notifikasi saat ini adalah "${currentPerm}". Silakan izinkan notifikasi pada browser Anda.`;
    console.warn('[Notification]', msg);
    return { success: false, error: msg };
  }

  const notificationTitle = title || 'SUARAKU';
  const notificationOptions: NotificationOptions = {
    body: content || 'Informasi baru tersedia di WAFO.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'ppu-new-wafo-' + Date.now(),
  };

  let primaryError: string | null = null;

  // Method 1: Try standard new Notification() constructor first
  try {
    const notification = new Notification(notificationTitle, notificationOptions);
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (window.location.pathname !== '/informasi') {
        window.location.href = '/informasi';
      }
    };
    console.log('[Notification] Successfully shown notification via Notification constructor.');
    return { success: true };
  } catch (err: any) {
    primaryError = err?.message || String(err);
    console.warn('[Notification] new Notification() constructor failed:', err);
  }

  // Method 2: Fallback to Service Worker showNotification (for mobile Chrome / PWA / sandboxed context)
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerNotificationServiceWorker();
      }
      if (reg) {
        if (!reg.active && reg.installing) {
          await new Promise<void>((resolve) => {
            const sw = reg!.installing;
            if (!sw) return resolve();
            sw.addEventListener('statechange', () => {
              if (sw.state === 'activated' || sw.state === 'redundant') resolve();
            });
            setTimeout(resolve, 1000);
          });
        }
        await reg.showNotification(notificationTitle, notificationOptions);
        console.log('[Notification] Successfully shown notification via ServiceWorkerRegistration.');
        return { success: true };
      }
    } catch (swErr: any) {
      console.error('[Notification] ServiceWorker showNotification failed:', swErr);
      return {
        success: false,
        error: `Gagal memicu Service Worker notification: ${swErr?.message || String(swErr)}`,
      };
    }
  }

  return {
    success: false,
    error: primaryError 
      ? `Gagal memicu notifikasi: ${primaryError}`
      : 'Gagal memicu notifikasi browser.',
  };
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

