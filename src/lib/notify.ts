export function requestNotifyPermission(): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

export function notify(title: string, body: string): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/pwa-192x192.png', lang: 'ar', dir: 'rtl' });
    }
  } catch {
    /* الإشعارات اختيارية */
  }
}
