
// Scripts de Firebase necesarios para el Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Los valores de configuración se inyectan dinámicamente o se usan los de desarrollo.
// Nota: El SW no tiene acceso a las variables de entorno de Next.js directamente de forma fácil,
// por lo que usamos la configuración estándar.
firebase.initializeApp({
  apiKey: "AIzaSyAHX9U6coUWgM_1vMpvlzDJ05hTu3CCo6s",
  authDomain: "studio-8013388458-8013f.firebaseapp.com",
  projectId: "studio-8013388458-8013f",
  storageBucket: "studio-8013388458-8013f.firebasestorage.app",
  messagingSenderId: "711462197972",
  appId: "1:711462197972:web:d190a572e8561b3004f941"
});

const messaging = firebase.messaging();

// Manejador de mensajes en segundo plano (cuando la app no está abierta)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Recibido mensaje en segundo plano: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Asegúrate de tener un icono en public/logo.png
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
