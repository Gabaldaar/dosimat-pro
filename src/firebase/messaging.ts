
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * REEMPLAZA ESTA CONSTANTE con la "VAPID Key" generada en la Consola de Firebase
 * Configuración de proyecto > Cloud Messaging > Certificados de inserción web
 */
const VAPID_KEY = "TBLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwp";

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
): Promise<boolean> {
  if (!messaging || !user || typeof window === 'undefined') return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        // Guardar el token de forma persistente en el perfil del usuario
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        }, { merge: true });
        
        console.log("Dosimat Pro: Dispositivo registrado para notificaciones push.");
        return true;
      } else {
        console.warn('Dosimat Pro: No se pudo obtener el token de registro. Revisa los permisos en el navegador.');
        return false;
      }
    } else {
      console.warn("Dosimat Pro: Permiso de notificaciones denegado por el usuario.");
      return false;
    }
  } catch (error) {
    console.error('Dosimat Pro: Error al configurar notificaciones push:', error);
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
