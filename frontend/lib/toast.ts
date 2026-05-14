'use client';

import toast from 'react-hot-toast';
import { useSystem } from '@/lib/system-context';

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

/**
 * useToast — React hook that binds showToast to dynamic messages from the DB.
 *
 * Usage (inside any client component):
 *   const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();
 *
 *   toastSuccess('brand_create_success', 'Brand created!');
 *   toastError('login_failed', 'Login failed. Please check your credentials.');
 *
 * - The first arg is a `message_key` stored in the `app_messages` DB table.
 * - The second arg is the hardcoded fallback shown if the key is not in DB.
 * - SuperAdmin can edit the DB values at any time to change the displayed text.
 */
export function useToast() {
  const { getMsg } = useSystem();

  return {
    /** Show a success toast with a DB-configurable message */
    toastSuccess: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      showToast.success(msg);
    },

    /** Show an error toast with a DB-configurable message */
    toastError: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      showToast.error(msg);
    },

    /** Show a warning toast with a DB-configurable message */
    toastWarning: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      showToast.warning(msg);
    },

    /** Show an info toast with a DB-configurable message */
    toastInfo: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      showToast.info(msg);
    },

    /** Show a loading toast with a DB-configurable message (returns ID for dismissal) */
    toastLoading: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      return showToast.loading(msg);
    },

    /** Dismiss a toast by ID, or all toasts if no ID is provided */
    toastDismiss: (id?: string) => showToast.dismiss(id),

    /** Resolve a message key to a string (for use in setError, confirm prompts, etc.) */
    resolveMsg: (key: string, fallback: string, replacements?: Record<string, string>) => {
      let msg = getMsg(key, fallback);
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          msg = msg.replace(`{${k}}`, v);
        });
      }
      return msg;
    },

    /** Direct getMsg access */
    getMsg,

    /** Raw showToast for cases that don't need a message key */
    showToast,
  };
}
