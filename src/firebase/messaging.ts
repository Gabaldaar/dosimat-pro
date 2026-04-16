
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * VAPID KEY PARA DOSIMAT PRO
 * Clave extraída de: Consola Firebase > Configuración > Mensajería en la nube > Certificados de inserción web.
 */
const VAPID_KEY = "BLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwpc";

/**
 * Convierte una cadena Base64 (VAPID Key) a un Uint8Array binario.
 * Esto es obligatorio para evitar el error "Provided applicationServerkey is not valid".
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null
): Promise<{ success: boolean; error?: string }> {
  
  if (typeof window === 'undefined') return { success: false, error: "Servicio no disponible en el servidor." };
  
  if (!('Notification' in window)) {
    return { success: false, error: "Tu navegador no soporta notificaciones push." };
  }

  if (!messaging) {
    return { success: false, error: "El servicio de mensajería de Firebase no se pudo inicializar." };
  }

  try {
    // 1. Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: "Permiso de notificaciones denegado por el usuario." };
    }

    // 2. Asegurar registro del Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // 3. Limpiar y Convertir Clave VAPID
    const cleanVapidKey = VAPID_KEY.trim().replace(/\s/g, '');
    const applicationServerKey = urlBase64ToUint8Array(cleanVapidKey);

    // 4. Obtener Token usando la clave binaria
    const currentToken = await getToken(messaging, {
      vapidKey: cleanVapidKey, // Firebase SDK maneja el string, pero usamos la clave limpia
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      // 5. Guardar en Firestore
      const userRef = doc(firestore, 'users', user!.uid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastDeviceLink: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    } else {
      return { success: false, error: "No se recibió un token del servidor. Intenta de nuevo." };
    }
  } catch (error: any) {
    console.error('Error detallado de vinculación:', error);
    
    if (error.message?.includes('applicationServerKey')) {
      return { 
        success: false, 
        error: "La clave configurada no coincide con el proyecto o está mal copiada. Verifica la Public Key." 
      };
    }
    
    return { success: false, error: error.message || "Error desconocido al vincular el dispositivo." };
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
