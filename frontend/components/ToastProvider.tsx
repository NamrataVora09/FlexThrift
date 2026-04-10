'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: '12px',
          padding: '12px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        },
      }}
    />
  );
}
