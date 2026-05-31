
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { requestNotificationPermission, onMessageListener, isPushServiceAvailable } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { isStaffRole } from '@/lib/auth-routing';

export function NotificationManager() {
  const { messaging, firestore } = useFirebase();
  const { user, userData } = useUser();
  const { toast } = useToast();
  const hasSyncedToken = useRef(false);

  useEffect(() => {
    if (!user || !userData || !isStaffRole(userData.role)) return;
    if (!messaging || !firestore || !isPushServiceAvailable()) return;

    if (Notification.permission === 'granted' && !hasSyncedToken.current) {
      hasSyncedToken.current = true;

      requestNotificationPermission(messaging, firestore, user, { requestPermission: false })
        .then((result) => {
          if (!result.success) return;

          const lastAlert = localStorage.getItem('last_fcm_check');
          const today = new Date().toDateString();

          if (lastAlert !== today) {
            toast({
              title: "Notificaciones Activas",
              description: "Este dispositivo ya está vinculado para recibir alertas de rutas.",
            });
            localStorage.setItem('last_fcm_check', today);
          }
        })
        .catch(() => {});
    }

    onMessageListener(messaging)?.then((payload: any) => {
      toast({
        title: payload?.notification?.title || "Aviso de Sistema",
        description: payload?.notification?.body || "Tienes una nueva notificación.",
      });
    }).catch(() => {});
  }, [user, userData, messaging, firestore, toast]);

  return null;
}
