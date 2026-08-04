// SCM Prospect Intelligence Platform - Enterprise Service Worker

self.addEventListener('install', (event) => {
  console.log('[SCM Service Worker] Installed successfully.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SCM Service Worker] Activated successfully.');
  event.waitUntil(self.clients.claim());
});

// Listen for Web Push events from the server
self.addEventListener('push', (event) => {
  console.log('[SCM Service Worker] Push notification event received.');
  
  if (!event.data) {
    console.warn('[SCM Service Worker] Push received but contained no payload data.');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SCM Service Worker] Push event data parsed:', data);

    const title = data.title || 'SCM Capital Alert';
    const options = {
      body: data.message || 'New strategic intelligence alert from SCM Prospect Intelligence Platform.',
      icon: '/assets/icon.png', // Fallback to icon
      badge: '/assets/badge.png', // Fallback badge
      vibrate: [100, 50, 100],
      data: {
        id: data.id,
        url: '/' // Home page URL
      },
      tag: 'scm-alert-' + (data.id || 'generic'),
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('[SCM Service Worker] Error parsing push data or showing notification:', err);
    
    // Fallback if payload isn't valid JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('SCM Capital Alert', {
        body: text || 'You have a new update in your SCM Prospect Intelligence account.',
        icon: '/assets/icon.png',
        vibrate: [100, 50, 100]
      })
    );
  }
});

// Handle clicking on background notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SCM Service Worker] Notification clicked:', event.notification.tag);
  event.notification.close();

  // URL to navigate or focus on
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
