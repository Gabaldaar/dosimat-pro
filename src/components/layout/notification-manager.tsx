
'use client';

import { useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { requestNotificationPermission, onMessageListener } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
  const { messaging, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user && messaging && firestore) {
      // Solicitar permiso y registrar token al iniciar sesión
      requestNotificationPermission(messaging, firestore, user);

      // Escuchar mensajes cuando la app está abierta (primer plano)
      const setupListener = async () => {
        onMessageListener(messaging)?.then((payload: any) => {
          toast({
            title: payload?.notification?.title || "Notificación",
            description: payload?.notification?.body || "Tienes un nuevo mensaje.",
          });
        });
      };
      
      setupListener();
    }
  }, [user, messaging, firestore, toast]);

  return null; // Componente invisible
}
