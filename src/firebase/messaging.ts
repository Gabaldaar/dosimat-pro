
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * VAPID KEY PARA DOSIMAT PRO
 */
const VAPID_KEY = "TBLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwp";

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
): Promise<{ success: boolean; error?: string }> {
  
  if (typeof window === 'undefined') return { success: false, error: "Window no disponible" };
  
  if (!('Notification' in window)) {
    return { success: false, error: "Este navegador no soporta notificaciones de escritorio." };
  }

  if (!messaging) {
    return { success: false, error: "El servicio de mensajería no se pudo inicializar." };
  }

  try {
    // 1. Pedir permiso
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { success: false, error: "Permiso de notificaciones denegado por el usuario." };
    }

    // 2. Asegurar que el Service Worker esté listo
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    // 3. Obtener el Token
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      // 4. Guardar en Firestore
      const userRef = doc(firestore, 'users', user!.uid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken)
      }, { merge: true });
      
      return { success: true };
    } else {
      return { success: false, error: "No se pudo generar el identificador de dispositivo." };
    }
  } catch (error: any) {
    console.error('Error en vinculación:', error);
    return { success: false, error: error.message || "Error desconocido durante la vinculación." };
  }
}

export function onMessageListener(messaging: Messaging | null) {
  if (!messaging) return;
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}
