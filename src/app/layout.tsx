
import type {Metadata, Viewport} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Dosimat Pro | Gestión de Piscinas',
  description: 'Sistema inteligente para el mantenimiento de piscinas y control financiero',
  icons: {
    icon: [
      { url: 'https://picsum.photos/seed/pool-water-drop-v6/192/192', sizes: '192x192', type: 'image/png' },
      { url: 'https://picsum.photos/seed/pool-water-drop-v6/32/32', sizes: '32x32', type: 'image/png' }
    ],
    apple: 'https://picsum.photos/seed/pool-water-drop-v6/192/192',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <FirebaseClientProvider>
          <AuthGuard>
            <SidebarProvider defaultOpen={true}>
              {children}
              <Toaster />
            </SidebarProvider>
          </AuthGuard>
        </FirebaseClientProvider>
        
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
