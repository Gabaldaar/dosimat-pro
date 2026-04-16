
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { requestNotificationPermission, onMessageListener } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
  const { messaging, firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const hasRequested = useRef(false);

  useEffect(() => {
    if (user && messaging && firestore && !hasRequested.current) {
      hasRequested.current = true;
      
      const setupNotifications = async () => {
        const success = await requestNotificationPermission(messaging, firestore, user);
        
        if (success) {
          // Solo mostrar este toast una vez para confirmar que el sistema funciona
          const lastAlert = localStorage.getItem('last_fcm_check');
          const today = new Date().toDateString();
          
          if (lastAlert !== today) {
            toast({
              title: "Notificaciones Activas",
              description: "Este dispositivo ya está vinculado para recibir alertas de rutas.",
            });
            localStorage.setItem('last_fcm_check', today);
          }
        }
      };

      setupNotifications();

      // Escuchar mensajes cuando la app está abierta (primer plano)
      onMessageListener(messaging)?.then((payload: any) => {
        toast({
          title: payload?.notification?.title || "Aviso de Sistema",
          description: payload?.notification?.body || "Tienes una nueva notificación.",
        });
      });
    }
  }, [user, messaging, firestore, toast]);

  return null;
}
