
// Service Worker básico para habilitar la instalación de la PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia de red solamente para asegurar datos frescos de Firestore
  event.respondWith(fetch(event.request));
});
