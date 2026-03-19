
'use client';

import { useUser, useFirestore, setDocumentNonBlocking } from '../../firebase';
import { Loader2, Droplets, Clock, Ban, User, ShieldAlert } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '../../firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

/**
 * AuthGuard protege las rutas de la aplicación.
 * Asegura que ningún componente que realice consultas a Firestore se renderice
 * si el usuario no está autenticado o no tiene los permisos aprobados.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Efecto para redirigir al login si no hay sesión activa
  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // Función para recrear un perfil si el usuario existe en Auth pero fue borrado de Firestore
  const handleRequestAccess = () => {
    if (!user || !firestore) return;
    setIsCreatingProfile(true);
    const now = new Date().toISOString();
    
    setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuario',
      email: user.email,
      role: 'Pending',
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    
    // El listener de FirebaseProvider detectará el nuevo documento automáticamente
  };

  // Si estamos en la página de login, permitimos el renderizado siempre
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Mientras se verifica la sesión o si no hay usuario, bloqueamos el renderizado de los hijos.
  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="bg-primary p-4 rounded-2xl shadow-2xl shadow-primary/20">
            <Droplets className="h-10 w-10 text-white animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold font-headline text-primary">Dosimat Pro</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando acceso...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Verificación de ROL (Seguridad de acceso)
  const role = userData?.role;

  // Si el usuario está autenticado pero NO tiene datos en Firestore (posiblemente fue eliminado)
  if (!isUserLoading && user && !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-slate-200 rounded-3xl space-y-6">
          <div className="bg-slate-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-slate-600">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Perfil no encontrado</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu cuenta está registrada, pero no tienes un perfil de acceso activo en Dosimat Pro. Esto sucede si tu usuario fue eliminado recientemente.
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <Button className="w-full font-bold h-12" onClick={handleRequestAccess} disabled={isCreatingProfile}>
              {isCreatingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Solicitar acceso de nuevo"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut(auth)}>
              Cerrar sesión y volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'Pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-amber-200 rounded-3xl space-y-6">
          <div className="bg-amber-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Acceso en revisión</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Hola <b>{userData?.name || user.email}</b>. Tu solicitud de acceso ha sido recibida. Un administrador debe aprobarte antes de que puedas entrar al sistema.
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 font-medium">
              Por favor, contacta al administrador de la empresa para habilitar tu usuario.
            </div>
            <Button variant="outline" className="w-full" onClick={() => signOut(auth)}>
              Cerrar sesión y volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'Blocked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-rose-200 rounded-3xl space-y-6">
          <div className="bg-rose-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <Ban className="h-10 w-10 text-rose-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-rose-800">Acceso Bloqueado</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu cuenta ha sido inhabilitada para acceder a Dosimat Pro.
            </p>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => signOut(auth)}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Solo renderizamos la aplicación si el usuario está aprobado (Admin, Employee, Communicator o Replenisher)
  if (role === 'Admin' || role === 'Employee' || role === 'Communicator' || role === 'Replenisher') {
    return <>{children}</>;
  }

  // Caso por defecto: cargando...
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Configurando perfil de usuario...</p>
    </div>
  );
}
