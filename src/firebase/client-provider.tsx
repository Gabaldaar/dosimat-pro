'use client';

import React, { useMemo, useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const LOADING_MESSAGE = "Sincronizando acceso...";

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []); 

  const router = useRouter();
  const pathname = usePathname();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (firebaseServices.auth) {
      const unsubscribe = onAuthStateChanged(firebaseServices.auth, (authUser) => {
        setUser(authUser);
        if (!authUser) {
          setIsInitializing(false);
          if (pathname !== '/login') {
            router.replace('/login');
          }
        } else {
          setIsInitializing(false);
          if (pathname === '/login') {
            router.replace('/');
          }
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseServices.auth, pathname, router, mounted]);

  // Durante la carga inicial
  if (!mounted || isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">
          {LOADING_MESSAGE}
        </p>
      </div>
    );
  }

  // Si no hay usuario y no estamos en login, forzamos espera al redirect
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Redirigiendo al acceso...</p>
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