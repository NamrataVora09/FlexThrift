'use client';

import toast from 'react-hot-toast';

/**
 * Modern Confirmation Toast
 * Replaces the browser's native confirm() with a beautiful, themed popup
 */
export const confirmToast = (
  message: string,
  onConfirm: () => void,
  confirmLabel: string = 'Confirm',
  onCancel?: () => void,
  cancelLabel: string = 'Cancel'
) => {
  toast.custom((t) => (
    <div
      className={`${t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-column p-4 border border-light`}
      style={{
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        minWidth: '320px'
      }}
    >
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className="bg-warning-subtle text-warning d-flex align-items-center justify-content-center rounded-circle"
          style={{ width: '45px', height: '45px', flexShrink: 0 }}
        >
          <i className="bi bi-exclamation-triangle fs-4"></i>
        </div>
        <div>
          <h6 className="mb-1 fw-bold text-dark">Confirmation Required</h6>
          <p className="mb-0 text-muted small">{message}</p>
        </div>
      </div>

      <div className="d-flex gap-2 justify-content-end pt-2">
        <button
          onClick={() => {
            toast.dismiss(t.id);
            if (onCancel) onCancel();
          }}
          className="btn btn-light btn-sm px-4 rounded-pill border fw-bold text-secondary"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onConfirm();
          }}
          className="btn btn-dark btn-sm px-4 rounded-pill fw-bold"
          style={{ background: '#ffc63a', color: '#ffff' }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ), {
    duration: 6000,
    position: 'top-center'
  });
};
