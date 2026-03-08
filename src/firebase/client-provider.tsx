
'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []); 

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (firebaseServices.auth) {
      const unsubscribe = firebaseServices.auth.onAuthStateChanged((user) => {
        // Si no hay usuario y no estamos en la página de login, redirigimos
        if (!user && pathname !== '/login') {
          router.push('/login');
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseServices.auth, pathname, router]);

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
