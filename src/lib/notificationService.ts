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
    // Auto register service worker if granted
    if (permission === 'granted') {
      registerNotificationServiceWorker().catch((err) => {
        console.warn('[Notification] Auto service worker registration after permission grant failed:', err);
      });
    }
    return permission as NotificationPermissionStatus;
  } catch (err) {
    console.error('[Notification] Error requesting notification permission:', err);
    return getNotificationPermission();
  }
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    const readyReg = await navigator.serviceWorker.ready;
    return readyReg;
  } catch (err) {
    console.error('[Notification] Could not register /sw.js:', err);
    return null;
  }
}

export async function showNewInformationNotification(
  title?: string,
  content?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check browser Notification API support
  if (!isNotificationSupported()) {
    const msg = 'Browser/perangkat Anda tidak mendukung Web Notification API.';
    console.error('[Notification]', msg);
    return { success: false, error: msg };
  }

  // 2. Check Service Worker API support
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    const msg = 'Browser Anda tidak mendukung Service Worker yang diperlukan untuk Web Notification.';
    console.error('[Notification]', msg);
    return { success: false, error: msg };
  }

  // 3. Check browser notification permission status
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

  try {
    // 4. Register or retrieve Service Worker registration
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    // 5. Wait for navigator.serviceWorker.ready before triggering notification
    const readyRegistration = await navigator.serviceWorker.ready;

    // 6. Show notification strictly using ServiceWorkerRegistration.showNotification()
    await readyRegistration.showNotification(notificationTitle, notificationOptions);
    console.log('[Notification] Successfully shown notification via ServiceWorkerRegistration.showNotification()');
    return { success: true };
  } catch (err: any) {
    const rawError = err?.message || String(err);
    console.error('[Notification] ServiceWorker showNotification failed:', err);
    return {
      success: false,
      error: `Gagal memicu Service Worker notification: ${rawError}`,
    };
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

