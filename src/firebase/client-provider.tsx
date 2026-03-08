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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (firebaseServices.auth && firebaseServices.firestore) {
      const unsubscribe = onAuthStateChanged(firebaseServices.auth, async (user) => {
        if (!user) {
          setIsInitializing(false);
          if (pathname !== '/login') {
            router.replace('/login');
          }
          return;
        }

        try {
          const userDoc = await getDoc(doc(firebaseServices.firestore, 'users', user.uid));
          if (userDoc.exists() && pathname === '/login') {
            router.replace('/');
          }
        } catch (error) {
          console.warn("Aviso: Sincronizando perfil de usuario...");
        } finally {
          setIsInitializing(false);
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseServices.auth, firebaseServices.firestore, pathname, router, mounted]);

  // Pantalla de carga unificada para evitar errores de hidratación
  if (!mounted || isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Validando acceso...
        </p>
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
