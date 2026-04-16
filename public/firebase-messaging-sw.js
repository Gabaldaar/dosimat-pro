
/*
 * Service Worker de Dosimat Pro para Firebase Cloud Messaging
 */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración idéntica a la de la app para que el SW reconozca el proyecto
const firebaseConfig = {
  projectId: "studio-8013388458-8013f",
  appId: "1:711462197972:web:d190a572e8561b3004f941",
  apiKey: "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  messagingSenderId: "711462197972"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano (cuando la pestaña está cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || 'Aviso de Dosimat Pro';
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/tM1VCHQ5/logo.png',
    data: {
      url: payload.data?.click_action || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Al hacer clic en la notificación, abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
