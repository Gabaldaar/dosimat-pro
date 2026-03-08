
'use client';

import React, { useMemo, useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []); 

  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (firebaseServices.auth && firebaseServices.firestore) {
      const unsubscribe = onAuthStateChanged(firebaseServices.auth, async (user) => {
        if (!user) {
          setIsInitializing(false);
          if (pathname !== '/login') {
            router.replace('/login');
          }
          return;
        }

        // Si hay usuario, verificamos si tiene perfil en Firestore
        try {
          const userDoc = await getDoc(doc(firebaseServices.firestore, 'users', user.uid));
          
          if (!userDoc.exists() && pathname !== '/login') {
            // Si el usuario existe en Auth pero no tiene perfil (ej: sesión anónima vieja)
            // lo deslogueamos para forzar el registro/login real
            await signOut(firebaseServices.auth);
            router.replace('/login');
          }
        } catch (error) {
          console.error("Error verificando perfil:", error);
        } finally {
          setIsInitializing(false);
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseServices.auth, firebaseServices.firestore, pathname, router]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Validando acceso...</p>
      </div>
    );
  }

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
