
// Service Worker para recibir notificaciones push en segundo plano
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-messaging-compat.js');

firebase.initializeApp({
  "projectId": "studio-8013388458-8013f",
  "appId": "1:711462197972:web:d190a572e8561b3004f941",
  "apiKey": "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  "authDomain": "studio-8013388458-8013f.firebaseapp.com",
  "messagingSenderId": "711462197972"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/tM1VCHQ5/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
