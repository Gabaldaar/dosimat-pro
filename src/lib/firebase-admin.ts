
import * as admin from 'firebase-admin';

/**
 * Inicialización segura de Firebase Admin SDK para uso en el servidor (API Routes).
 */
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (serviceAccountRaw) {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin: Inicializado con cuenta de servicio.');
    } catch (e) {
      console.error('Firebase Admin: Error al parsear FIREBASE_SERVICE_ACCOUNT:', e);
    }
  } else {
    // Intento de inicialización por defecto (útil en entornos de Google Cloud / App Hosting)
    try {
      admin.initializeApp();
      console.log('Firebase Admin: Inicializado con credenciales por defecto del entorno.');
    } catch (e) {
      // No logueamos error aquí para evitar ruido si se inicializa bajo demanda
    }
  }
}

// Exportamos los servicios con getters para asegurar que se llamen después de la inicialización
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
