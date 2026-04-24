'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { verifyOtp, sendOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('otp_email');
    if (!savedEmail) { router.push('/login'); return; }
    setEmail(savedEmail);
  }, [router]);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');
    const result = await sendOtp(email);
    setResendLoading(false);
    if (result.success) {
      setResendMessage('OTP resent successfully!');
      startCooldown();
    } else {
      setError(result.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const result = await verifyOtp(email, otp); setLoading(false);
    if (result.success) {
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_type');
      const user = JSON.parse(localStorage.getItem('flex_user') || '{}');
      const role = user.role;
      const pendingRedirect = sessionStorage.getItem('redirect_after_login');
      if (pendingRedirect) { sessionStorage.removeItem('redirect_after_login'); router.push(pendingRedirect); }
      else if (role === 'super_admin') router.push('/superadmin');
      else if (role === 'admin') router.push('/admin');
      else if (role === 'delivery') router.push('/delivery');
      else if (role === 'seller') router.push('/seller');
      else router.push('/');
    } else {
      setError(result.message || 'Invalid OTP');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; padding: 20px; position: relative; overflow: hidden; }
        .auth-page::before { content: ''; position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(255,198,58,0.08) 0%, transparent 70%); border-radius: 50%; }
        .auth-card { background: #fff; border-radius: 24px; padding: 48px 40px; width: 100%; max-width: 460px; position: relative; z-index: 1; box-shadow: 0 30px 80px rgba(0,0,0,0.3); }
        .auth-logo { font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 900; color: #000; text-align: center; display: block; text-decoration: none; margin-bottom: 32px; letter-spacing: -1.5px; }
        .auth-logo span { color: #ffc63a; }
        .auth-heading { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.6rem; color: #000; text-align: center; margin-bottom: 4px; }
        .auth-sub { font-family: 'Inter', sans-serif; color: #888; font-size: 0.9rem; text-align: center; margin-bottom: 28px; }
        .auth-sub strong { color: #000; }
        .auth-input-group { margin-bottom: 18px; }
        .auth-input-group label { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.8rem; color: #333; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
        .otp-input { width: 100%; padding: 16px; border: 2px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 700; text-align: center; letter-spacing: 12px; transition: all 0.3s; outline: none; background: #fafafa; box-sizing: border-box; }
        .otp-input:focus { border-color: #ffc63a; background: #fff; box-shadow: 0 0 0 4px rgba(255,198,58,0.1); }
        .auth-btn { width: 100%; padding: 14px; background: #ffc63a; color: #000; border: none; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.3s; margin-top: 8px; }
        .auth-btn:hover { background: #000; color: #ffc63a; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-alert { padding: 12px 16px; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; background: #fff0f0; color: #d32f2f; border: 1px solid #ffd6d6; }
        .auth-footer-text { text-align: center; margin-top: 24px; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: #888; }
        .otp-timer { text-align: center; margin-top: 16px; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #999; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .otp-timer i { color: #ffc63a; }
        .resend-row { text-align: center; margin-top: 16px; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: #888; }
        .resend-btn { background: none; border: none; padding: 0; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; color: #ffc63a; cursor: pointer; text-decoration: underline; transition: color 0.2s; }
        .resend-btn:hover:not(:disabled) { color: #000; }
        .resend-btn:disabled { color: #bbb; cursor: not-allowed; text-decoration: none; }
        .resend-success { color: #2e7d32; font-size: 0.82rem; font-family: 'Inter', sans-serif; text-align: center; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        @media (max-width: 480px) { .auth-card { padding: 32px 24px; } .otp-input { font-size: 1.5rem; letter-spacing: 8px; } }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <Link href="/" className="auth-logo">Flex Market<span>.</span></Link>
          <h1 className="auth-heading">Verify OTP</h1>
          <p className="auth-sub">Enter the 6-digit code sent to <strong>{email}</strong></p>

          {error && <div className="auth-alert"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label>OTP Code</label>
              <input
                className="otp-input"
                type="text"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP'} <i className="bi bi-check-circle ms-2"></i>
            </button>
          </form>

          <div className="otp-timer">
            <i className="bi bi-clock"></i> OTP expires in <strong>10 minutes</strong>
          </div>

          <div className="resend-row">
            Didn&apos;t receive it?{' '}
            <button
              className="resend-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend OTP'}
            </button>
          </div>

          {resendMessage && (
            <div className="resend-success">
              <i className="bi bi-check-circle-fill"></i> {resendMessage}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
