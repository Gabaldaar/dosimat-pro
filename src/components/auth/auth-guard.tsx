
'use client';

import { useUser, useFirestore, setDocumentNonBlocking } from '../../firebase';
import { Loader2, Droplets, Clock, Ban, User, ShieldAlert, RefreshCw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '../../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { useToast } from '../../hooks/use-toast';

/**
 * AuthGuard protege las rutas de la aplicación.
 * Asegura que ningún componente que realice consultas a Firestore se renderice
 * si el usuario no está autenticado o no tiene los permisos aprobados.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isCheckingAdmins, setIsCheckingAdmins] = useState(false);

  // Efecto para redirigir al login si no hay sesión activa
  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // Desbloqueador global de puntero (Evita congelamientos de Radix UI)
  useEffect(() => {
    const fixPointerEvents = () => {
      if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
        const activeModals = document.querySelectorAll('[data-state="open"]');
        if (activeModals.length === 0) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    };
    const interval = setInterval(fixPointerEvents, 1000);
    return () => clearInterval(interval);
  }, []);

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
  };

  const handleEmergencyAdminCheck = async () => {
    if (!user || !firestore) return;
    setIsCheckingAdmins(true);
    try {
      const adminsQuery = query(collection(firestore, 'users'), where('role', '==', 'Admin'), limit(1));
      const adminsSnap = await getDocs(adminsQuery);
      
      if (adminsSnap.empty) {
        // No hay admins! Me auto-promuevo
        setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          role: 'Admin',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        toast({ 
          title: "Acceso Recuperado", 
          description: "No se encontraron otros administradores. Has sido promovido a Admin automáticamente." 
        });
      } else {
        toast({ 
          title: "Acceso Denegado", 
          description: "Ya existe un administrador en el sistema. Debes ser aprobado por él.",
          variant: "destructive"
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingAdmins(false);
    }
  };

  if (pathname === '/login') return <>{children}</>;

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="bg-primary p-4 rounded-2xl shadow-2xl shadow-primary/20">
          <Droplets className="h-10 w-10 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = userData?.role;

  // PERFIL NO ENCONTRADO
  if (!isUserLoading && user && !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-slate-200 rounded-3xl space-y-6">
          <div className="bg-slate-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-slate-600">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Perfil no encontrado</h2>
            <p className="text-muted-foreground text-sm">Tu cuenta está registrada pero no tienes un perfil activo.</p>
          </div>
          <div className="pt-4 space-y-3">
            <Button className="w-full font-bold h-12" onClick={handleRequestAccess} disabled={isCreatingProfile}>
              {isCreatingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Solicitar acceso de nuevo"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut(auth)}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  // ACCESO PENDIENTE (REVISIÓN)
  if (role === 'Pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-amber-200 rounded-3xl space-y-6">
          <div className="bg-amber-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Acceso en revisión</h2>
            <p className="text-muted-foreground text-sm">Hola <b>{userData?.name || user.email}</b>. Tu solicitud de acceso ha sido recibida y debe ser aprobada.</p>
          </div>
          <div className="pt-4 space-y-3">
            <Button variant="secondary" className="w-full font-bold" onClick={handleEmergencyAdminCheck} disabled={isCheckingAdmins}>
              {isCheckingAdmins ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Soy el Administrador (Verificar)"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut(auth)}>Cerrar sesión y volver</Button>
          </div>
        </div>
      </div>
    );
  }

  // ACCESO BLOQUEADO
  if (role === 'Blocked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="max-w-md w-full p-8 glass-card border-rose-200 rounded-3xl space-y-6">
          <div className="bg-rose-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <Ban className="h-10 w-10 text-rose-600" />
          </div>
          <div className="space-y-2 text-rose-800">
            <h2 className="text-2xl font-bold">Acceso Bloqueado</h2>
            <p className="text-sm">Tu cuenta ha sido inhabilitada para acceder a Dosimat Pro.</p>
          </div>
          <Button variant="outline" className="w-full border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => signOut(auth)}>Volver</Button>
        </div>
      </div>
    );
  }

  const AUTHORIZED_ROLES = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'];
  if (AUTHORIZED_ROLES.includes(role)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground font-bold uppercase tracking-widest">Configurando Perfil...</p>
    </div>
  );
}
