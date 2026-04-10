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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Maven+Pro:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap"
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
      </head>
      <body>
        <AuthProvider>
          <GeolocationBlocker>
            {children}
          </GeolocationBlocker>
        </AuthProvider>
        <ToastProvider />
        <BootstrapClient />
      </body>
    </html>
  );
}
