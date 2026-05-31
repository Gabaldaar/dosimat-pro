
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * VAPID KEY PARA DOSIMAT PRO
 * Clave extraída de: Consola Firebase > Configuración > Mensajería en la nube > Certificados de inserción web.
 */
const VAPID_KEY = "BLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwpc";

export function isPushServiceAvailable(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

function isBenignPushError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return error.name === 'AbortError'
    || msg.includes('push service not available')
    || msg.includes('failed to subscribe')
    || msg.includes('registration failed');
}

export async function requestNotificationPermission(
  messaging: Messaging | null,
  firestore: Firestore,
  user: User | null,
  options?: { requestPermission?: boolean }
): Promise<{ success: boolean; error?: string }> {
  
  if (typeof window === 'undefined') return { success: false, error: "Servicio no disponible en el servidor." };
  
  if (!isPushServiceAvailable()) {
    return { success: false, error: "Las notificaciones push no están disponibles en este navegador." };
  }

  if (!messaging) {
    return { success: false, error: "El servicio de mensajería de Firebase no se pudo inicializar." };
  }

  if (!user) {
    return { success: false, error: "Usuario no autenticado." };
  }

  const shouldRequestPermission = options?.requestPermission ?? true;

  try {
    if (shouldRequestPermission) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: "Permiso de notificaciones denegado por el usuario." };
      }
    } else if (Notification.permission !== 'granted') {
      return { success: false, error: "Permiso de notificaciones no concedido." };
    }

    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    } catch (swError) {
      console.warn("No se pudo registrar el service worker de notificaciones:", swError);
      return { success: false, error: "No se pudo cargar el controlador de notificaciones." };
    }

    const cleanVapidKey = VAPID_KEY.trim().replace(/\s/g, '');

    const currentToken = await getToken(messaging, {
      vapidKey: cleanVapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastDeviceLink: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    }

    return { success: false, error: "No se recibió un token del servidor." };
  } catch (error: unknown) {
    if (isBenignPushError(error)) {
      return { success: false, error: "Las notificaciones push no están disponibles en este dispositivo." };
    }

    const message = error instanceof Error ? error.message : "Error desconocido al vincular el dispositivo.";

    if (message.includes('applicationServerKey')) {
      return { 
        success: false, 
        error: "La clave configurada no coincide con el proyecto o está mal copiada." 
      };
    }
    
    console.warn('Error al vincular notificaciones:', error);
    return { success: false, error: message };
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
