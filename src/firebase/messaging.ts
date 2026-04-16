
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * TU VAPID KEY GENERADA EN FIREBASE
 */
const VAPID_KEY = "TBLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwp";

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
): Promise<boolean> {
  if (!messaging || !user || typeof window === 'undefined') {
    console.error('Dosimat Pro: Messaging, User o Window no disponibles');
    return false;
  }

  try {
    console.log('Dosimat Pro: Solicitando permiso de notificación...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Dosimat Pro: Permiso concedido. Obteniendo token...');
      
      // Forzar el registro del service worker antes de pedir el token
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('Dosimat Pro: Token obtenido con éxito:', currentToken);
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        }, { merge: true });
        
        return true;
      } else {
        console.warn('Dosimat Pro: No se pudo obtener el token.');
        return false;
      }
    } else {
      console.warn("Dosimat Pro: Permiso denegado por el usuario.");
      return false;
    }
  } catch (error) {
    console.error('Dosimat Pro: Error crítico en vinculación:', error);
    return false;
  }
}

export function onMessageListener(messaging: Messaging | null) {
  if (!messaging) return;
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Dosimat Pro: Mensaje recibido en primer plano:", payload);
      resolve(payload);
    });
  });
}
