import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/globals.css';
import { AuthProvider } from '@/lib/auth-context';
import BootstrapClient from '@/components/BootstrapClient';
import ToastProvider from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'Flex Market',
  description: 'Buy, Sell & Rent — Flex Market',
};

import GeolocationBlocker from '@/components/shared/GeolocationBlocker';
import SystemLockBlocker from '@/components/shared/SystemLockBlocker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;600;700;800&family=Maven+Pro:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <SystemLockBlocker>
            <GeolocationBlocker>
              {children}
            </GeolocationBlocker>
          </SystemLockBlocker>
        </AuthProvider>
        <ToastProvider />
        <BootstrapClient />
      </body>
    </html>
  );
}
