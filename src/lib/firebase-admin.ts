
import * as admin from 'firebase-admin';

/**
 * Inicialización segura de Firebase Admin SDK para uso en el servidor (API Routes).
 */
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length && serviceAccountRaw) {
  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Error initializing Firebase Admin:', e);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
