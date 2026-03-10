
import type {Metadata, Viewport} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Dosimat Pro | Pool Management',
  description: 'Smart pool maintenance and financial management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dosimat Pro',
  },
  formatDetection: {
    telephone: false,
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
        <link rel="apple-touch-icon" href="https://picsum.photos/seed/dosimat-icon-180/180/180" />
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
        
        {/* Registro del Service Worker para PWA */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
