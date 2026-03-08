'use client';

import React, { useMemo, useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
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

        // Verificamos el perfil pero no bloqueamos si no se encuentra inmediatamente
        try {
          const userDoc = await getDoc(doc(firebaseServices.firestore, 'users', user.uid));
          // Si estamos en login y el usuario ya tiene perfil, lo mandamos al home
          if (userDoc.exists() && pathname === '/login') {
            router.replace('/');
          }
        } catch (error) {
          // Si hay error de permisos aquí, es probable que las reglas se estén actualizando
          console.warn("Error inicial verificando perfil:", error);
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