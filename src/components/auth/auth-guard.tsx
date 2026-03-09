'use client';

import { useUser } from '@/firebase';
import { Loader2, Droplets } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // Permitimos ver la página de login sin estar autenticado
  if (pathname === '/login') {
    return <>{children}</>;
  }

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

  // Si no hay usuario y no estamos en login, el middleware o la lógica de negocio 
  // redirigirá, pero por ahora mostramos los hijos si ya terminó la carga.
  return <>{children}</>;
}
