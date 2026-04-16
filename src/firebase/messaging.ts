
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * VAPID KEY PARA DOSIMAT PRO
 * IMPORTANTE: Asegúrate de copiarla exactamente de la consola de Firebase sin espacios extra.
 * Generalmente empieza con "B..."
 */
const VAPID_KEY = "TBLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwp";

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
): Promise<{ success: boolean; error?: string }> {
  
  if (typeof window === 'undefined') return { success: false, error: "Servicio no disponible en este entorno." };
  
  if (!('Notification' in window)) {
    return { success: false, error: "Este navegador no soporta notificaciones." };
  }

  if (!messaging) {
    return { success: false, error: "El motor de mensajes no está inicializado." };
  }

  try {
    // 1. Pedir permiso explícito al usuario
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { success: false, error: "Permiso denegado por el usuario." };
    }

    // 2. Registrar/Obtener el Service Worker
    // Usamos el nombre estándar que busca Firebase
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // Esperar a que el SW esté listo
    await navigator.serviceWorker.ready;

    // 3. Obtener el Token usando la clave VAPID (limpiando espacios)
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY.trim(),
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      // 4. Guardar el token en el documento del usuario para enviarle alertas después
      const userRef = doc(firestore, 'users', user!.uid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken)
      }, { merge: true });
      
      console.log('Dosimat Pro: Dispositivo vinculado con éxito.');
      return { success: true };
    } else {
      return { success: false, error: "No se pudo generar el ID del dispositivo. Intenta refrescar." };
    }
  } catch (error: any) {
    console.error('Error detallado de vinculación:', error);
    
    if (error.message?.includes('applicationServerkey')) {
      return { success: false, error: "La Clave VAPID ingresada no es válida. Por favor revísala en la Consola de Firebase." };
    }
    
    return { success: false, error: error.message || "Error desconocido al vincular." };
  }
}

export function onMessageListener(messaging: Messaging | null) {
  if (!messaging) return null;
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}
