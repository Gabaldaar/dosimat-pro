
'use client';

import { Messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * VAPID KEY PARA DOSIMAT PRO
 * Asegúrate de que esta sea la PUBLIC KEY de la consola de Firebase.
 */
const VAPID_KEY = "BLGb4ASwD1k90C3EJGiOHfS3FQD8gRdVBeN6SXz_sMInmOWuNTqgf9zc92VLXZWta001BmQh1wbpxi8prjlKwpc";

/**
 * Convierte una cadena Base64 a Uint8Array. 
 * Esto es necesario porque algunos navegadores rechazan la clave VAPID como string simple.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
  
  if (typeof window === 'undefined') return { success: false, error: "Servicio no disponible." };
  
  if (!('Notification' in window)) {
    return { success: false, error: "Tu navegador no soporta notificaciones." };
  }

  if (!messaging) {
    return { success: false, error: "El sistema de mensajes no se inició correctamente." };
  }

  try {
    // 1. Solicitar permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: "Permiso denegado. Habilita las notificaciones en el icono del candado de tu navegador." };
    }

    // 2. Registrar el Service Worker explícitamente
    console.log('Dosimat Pro: Registrando Service Worker...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    // 3. Obtener el Token usando la clave VAPID procesada
    console.log('Dosimat Pro: Obteniendo token de dispositivo...');
    
    // Intentamos obtener el token. 
    // Nota: Aunque Firebase permite pasar el string, algunos entornos requieren el Uint8Array.
    // Aquí usamos el string limpio pero con un manejo de error más descriptivo.
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY.trim(),
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      // 4. Guardar en Firestore
      const userRef = doc(firestore, 'users', user!.uid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(currentToken),
        lastDeviceLink: new Date().toISOString()
      }, { merge: true });
      
      console.log('Dosimat Pro: Token generado y guardado.');
      return { success: true };
    } else {
      return { success: false, error: "No se pudo generar el ID. Por favor, intenta refrescar la página." };
    }
  } catch (error: any) {
    console.error('Error de vinculación detallado:', error);
    
    if (error.message?.includes('applicationServerkey')) {
      return { 
        success: false, 
        error: "La clave VAPID configurada no es válida para este proyecto. Verifica que sea la 'Clave Pública' en la Consola de Firebase." 
      };
    }
    
    return { success: false, error: error.message || "Error al conectar con el servidor de mensajes." };
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
