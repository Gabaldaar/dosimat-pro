// Archivo de Service Worker para Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Los valores de configuración se sincronizan con src/firebase/config.ts
firebase.initializeApp({
  apiKey: "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  authDomain: "studio-8013388458-8013f.firebaseapp.com",
  projectId: "studio-8013388458-8013f",
  messagingSenderId: "711462197972",
  appId: "1:711462197972:web:d190a572e8561b3004f941",
});

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || "Dosimat Pro";
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/tM1VCHQ5/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
