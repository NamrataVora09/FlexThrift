import toast from 'react-hot-toast';

const toastStyle = {
  borderRadius: '12px',
  padding: '12px 20px',
  fontSize: '0.875rem',
  fontWeight: 500,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
};

export const showToast = {
  success: (message: string) =>
    toast.success(message, {
      style: { ...toastStyle, background: '#10b981', color: '#fff' },
      iconTheme: { primary: '#fff', secondary: '#10b981' },
      duration: 3000,
    }),

  error: (message: string) =>
    toast.error(message, {
      style: { ...toastStyle, background: '#ef4444', color: '#fff' },
      iconTheme: { primary: '#fff', secondary: '#ef4444' },
      duration: 4000,
    }),

  info: (message: string) =>
    toast(message, {
      icon: 'ℹ️',
      style: { ...toastStyle, background: '#3b82f6', color: '#fff' },
      duration: 3000,
    }),

  warning: (message: string) =>
    toast(message, {
      icon: '⚠️',
      style: { ...toastStyle, background: '#f59e0b', color: '#000' },
      duration: 3500,
    }),

  loading: (message: string) =>
    toast.loading(message, {
      style: { ...toastStyle, background: '#1e293b', color: '#fff' },
    }),

  dismiss: (id?: string) => (id ? toast.dismiss(id) : toast.dismiss()),

  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) =>
    toast.promise(promise, msgs, {
      style: toastStyle,
      success: { style: { ...toastStyle, background: '#10b981', color: '#fff' } },
      error: { style: { ...toastStyle, background: '#ef4444', color: '#fff' } },
    }),
};
