// Service Worker para Notificaciones Push (Web Push)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.notification.body,
      icon: 'https://i.ibb.co/tM1VCHQ5/logo.png',
      badge: 'https://i.ibb.co/tM1VCHQ5/logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.notification.click_action || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.notification.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});