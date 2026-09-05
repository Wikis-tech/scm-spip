const CACHE_VERSION = 'spip-shell-v9-1';
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icons/spip-icon.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))));
self.addEventListener('activate', (event) => event.waitUntil(Promise.all([caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))), self.clients.claim()])));
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') { event.respondWith(fetch(request).catch(() => caches.match('/offline.html'))); return; }
  if (['script', 'style', 'image', 'font'].includes(request.destination)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { message: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'SCM Capital Alert', { body: data.message || 'You have a new SPIP update.', icon: '/icons/spip-icon.svg', badge: '/icons/spip-icon.svg', tag: `scm-alert-${data.id || 'general'}`, renotify: true, data: { url: data.url || '/' } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) { await existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow?.(target);
  }));
});
