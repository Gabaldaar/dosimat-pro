// Service Worker para Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// El SDK de Firebase en el SW necesita inicializarse con el objeto de configuración
// Se asume que el navegador lo descarga desde la raíz.
firebase.initializeApp({
  apiKey: "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  authDomain: "studio-8013388458-8013f.firebaseapp.com",
  projectId: "studio-8013388458-8013f",
  storageBucket: "studio-8013388458-8013f.firebasestorage.app",
  messagingSenderId: "711462197972",
  appId: "1:711462197972:web:d190a572e8561b3004f941"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
