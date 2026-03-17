
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
      { url: 'https://i.ibb.co/tM1VCHQ5/logo.png', type: 'image/png' },
    ],
    apple: 'https://i.ibb.co/tM1VCHQ5/logo.png',
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
