'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error no controlado de la aplicación:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full shadow-lg border-amber-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-800">
            Algo no salió como esperábamos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Se produjo un inconveniente temporal en la pantalla. Podés reintentar o volver al inicio.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => reset()} className="w-full gap-2 font-bold">
              <RefreshCw className="h-4 w-4" /> Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="w-full gap-2"
            >
              <Home className="h-4 w-4" /> Ir al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
