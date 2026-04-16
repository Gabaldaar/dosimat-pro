
// Scripts necesarios para el Service Worker de Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con tu src/firebase/config.ts)
// Nota: Estos valores son públicos y necesarios para que el worker funcione.
firebase.initializeApp({
  "projectId": "studio-8013388458-8013f",
  "appId": "1:711462197972:web:d190a572e8561b3004f941",
  "apiKey": "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  "authDomain": "studio-8013388458-8013f.firebaseapp.com",
  "messagingSenderId": "711462197972"
});

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/tM1VCHQ5/logo.png',
    data: {
      url: payload.data?.click_action || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejador de clics en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
