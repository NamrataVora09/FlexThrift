'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type PayStatus = 'verifying' | 'success' | 'failed' | 'pending';

function OrderPaymentCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const merchantOrderId = searchParams.get('id') ?? '';

  const [status, setStatus] = useState<PayStatus>('verifying');
  const [message, setMessage] = useState('Verifying your payment with the bank…');
  const [progress, setProgress] = useState(0);
  const [orderId, setOrderId] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const checkPayment = async () => {
    if (!merchantOrderId) {
      setStatus('failed');
      setMessage('No transaction ID found.');
      return;
    }

    const res = await api.get<{ status: string; message: string; order_id?: number }>(
      `/buyer/verify-order-payment?id=${merchantOrderId}`
    );
    const data = res as unknown as { status: string; message: string; order_id?: number };

    if (data.status === 'success') {
      clearTimers();
      setProgress(100);
      setStatus('success');
      setMessage(data.message || 'Payment successful! Your order has been confirmed.');
      if (data.order_id) setOrderId(data.order_id);
      setTimeout(() => router.push('/buyer/my-orders?success=' + encodeURIComponent('Payment successful! Your order is confirmed.')), 2500);
    } else if (data.status === 'failed') {
      clearTimers();
      setStatus('failed');
      setMessage(data.message || 'Payment failed. Please try again.');
    }
    // 'pending' — keep polling
  };

  useEffect(() => {
    if (!merchantOrderId) {
      setStatus('failed');
      setMessage('Invalid payment session.');
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + 2));
    }, 300);

    checkPayment();
    pollRef.current = setInterval(checkPayment, 3000);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      clearInterval(progressInterval);
      setStatus('failed');
      setMessage('Payment verification timed out. If you were charged, please contact support with your transaction ID.');
    }, 60000);

    return () => {
      clearTimers();
      clearInterval(progressInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantOrderId]);

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      <style>{`
        body { background: #f8f9fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; font-family: 'Segoe UI', sans-serif; }
        .card-wrap { background: #fff; padding: 50px 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,.06); text-align: center; max-width: 460px; width: 90%; }
        .coin { width: 80px; height: 80px; margin: 0 auto 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 38px; animation: bounce 1.2s infinite ease-in-out; }
        .coin-verifying { background: #ffc63a; color: #000; box-shadow: 0 10px 20px rgba(255,198,58,.3); }
        .coin-success   { background: #28a745; color: #fff; box-shadow: 0 10px 20px rgba(40,167,69,.3); animation: none; }
        .coin-failed    { background: #dc3545; color: #fff; box-shadow: 0 10px 20px rgba(220,53,69,.3); animation: none; }
        @keyframes bounce { 0%,100%{ transform:translateY(0) rotateY(0) } 50%{ transform:translateY(-15px) rotateY(180deg) } }
        .progress { height: 6px; border-radius: 10px; background: #e9ecef; overflow: hidden; margin-top: 32px; }
        .progress-bar { background: #ffc63a; transition: width .5s ease; }
      `}</style>

      <div className="card-wrap">
        <div className={`coin coin-${status === 'verifying' || status === 'pending' ? 'verifying' : status}`}>
          {(status === 'verifying' || status === 'pending') && <i className="bi bi-bag-check" />}
          {status === 'success' && <i className="bi bi-check-lg" />}
          {status === 'failed' && <i className="bi bi-x-lg" />}
        </div>

        <h2 className="fw-bold mb-2" style={{ fontSize: '1.4rem' }}>
          {status === 'verifying' || status === 'pending'
            ? 'Confirming Payment'
            : status === 'success'
            ? 'Order Confirmed!'
            : 'Payment Failed'}
        </h2>

        <p className="text-muted mb-4" style={{ fontSize: '.93rem' }}>{message}</p>

        {(status === 'verifying' || status === 'pending') && (
          <div className="d-flex align-items-center justify-content-center gap-2 text-warning fw-bold small text-uppercase" style={{ letterSpacing: 1 }}>
            <div className="spinner-border spinner-border-sm text-warning" />
            Verifying with bank…
          </div>
        )}

        {status === 'success' && (
          <div className="alert alert-success py-2 small fw-bold">
            <i className="bi bi-check-circle me-1" /> Redirecting to your orders…
          </div>
        )}

        {status === 'failed' && (
          <div className="d-flex flex-column gap-2 mt-3">
            <button className="btn btn-dark rounded-pill" onClick={() => router.push('/buyer/my-orders')}>
              Back to Orders
            </button>
          </div>
        )}

        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {merchantOrderId && (
          <div className="mt-4 pt-3 border-top">
            <small className="text-muted d-block mb-1">Transaction ID</small>
            <code className="fw-bold text-dark" style={{ fontSize: '.8rem' }}>{merchantOrderId}</code>
            {orderId && (
              <div className="mt-2">
                <small className="text-muted d-block mb-1">Order ID</small>
                <code className="fw-bold text-dark" style={{ fontSize: '.8rem' }}>#{String(orderId).padStart(6, '0')}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function OrderPaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-border text-warning" />
        </div>
      }
    >
      <OrderPaymentCallbackInner />
    </Suspense>
  );
}
