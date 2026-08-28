// SCM SPIP Phase 4 Service Worker - background push and resilient notification UX

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data.json(); }
    catch { data = { message: event.data.text() }; }

    const critical = data.priority === 'critical' || data.requireInteraction === true;
    const title = data.title || 'SCM Capital Reminder';
    const body = data.message || 'You have an upcoming SPIP activity.';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: `spip-${data.id || data.reminderKind || Date.now()}`,
      renotify: true,
      requireInteraction: critical,
      vibrate: critical ? [350, 150, 350, 150, 700] : [180, 80, 180],
      timestamp: data.timestamp || Date.now(),
      data: {
        id: data.id || null,
        url: data.url || '/calendar',
        reminderKind: data.reminderKind || null,
      },
      actions: [
        { action: 'open', title: 'Open SPIP' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const target = new URL(event.notification.data?.url || '/calendar', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browsers can rotate subscriptions. The application re-syncs on next authenticated load.
  event.waitUntil(Promise.resolve());
});
