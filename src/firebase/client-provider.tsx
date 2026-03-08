'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); 

  useEffect(() => {
    // Aseguramos que el usuario tenga una identidad (sesión anónima)
    // para que las reglas de seguridad de Firestore funcionen.
    if (firebaseServices.auth) {
      const unsubscribe = firebaseServices.auth.onAuthStateChanged((user) => {
        if (!user) {
          signInAnonymously(firebaseServices.auth).catch((error) => {
            console.error("Error al iniciar sesión anónima:", error);
          });
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseServices.auth]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}