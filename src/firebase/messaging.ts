
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * REEMPLAZA ESTA CONSTANTE con la "VAPID Key" generada en la Consola de Firebase
 * Configuración de proyecto > Cloud Messaging > Certificados de inserción web
 */
const VAPID_KEY = "TU_VAPID_KEY_AQUI";

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
) {
  if (!messaging || !user || typeof window === 'undefined') return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        // Guardar el token en el perfil del usuario en Firestore para poder enviarle mensajes luego
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        console.log("Dispositivo registrado para notificaciones.");
      } else {
        console.log('No se pudo obtener el token de registro. Revisa los permisos.');
      }
    }
  } catch (error) {
    console.error('Error al configurar notificaciones push:', error);
  }
}

export function onMessageListener(messaging: Messaging | null) {
  if (!messaging) return;
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Mensaje recibido en primer plano:", payload);
      resolve(payload);
    });
  });
}
