
// Service Worker básico para cumplir con los requisitos de instalación PWA
const CACHE_NAME = 'dosimat-pro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Requerido para la activación del banner de instalación
  // Aquí se podría implementar lógica de caché offline en el futuro
});
