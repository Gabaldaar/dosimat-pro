'use client';

import { useUser } from '@/firebase';
import { Loader2, Droplets } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * AuthGuard protege las rutas de la aplicación.
 * Asegura que ningún componente que realice consultas a Firestore se renderice
 * si el usuario no está autenticado, evitando errores de permisos.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // Efecto para redirigir al login si no hay sesión activa
  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isUserLoading, pathname, router]);

  // Si estamos en la página de login, permitimos el renderizado siempre
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Mientras se verifica la sesión o si no hay usuario, bloqueamos el renderizado de los hijos.
  // Esto evita que componentes como el Dashboard intenten cargar datos sin estar autenticados.
  if (isUserLoading || !user) {
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
              {isUserLoading ? 'Verificando acceso...' : 'Redirigiendo al inicio...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Solo renderizamos la aplicación si el usuario está autenticado
  return <>{children}</>;
}
