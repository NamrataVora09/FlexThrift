'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import SeoManager from '@/components/shared/SeoManager';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, resetPassword, isAuthenticated, isLoading, user } = useAuth();

  // Redirect to browse/portal if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') router.replace('/superadmin');
      else if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else router.replace('/buyer/browse');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message || 'Verification OTP sent to your email.');
      setStep('reset');
      startCooldown();
    } else {
      setError(result.message || 'Failed to send reset code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError('');
    setSuccessMessage('');
    setResendLoading(true);
    const result = await forgotPassword(email);
    setResendLoading(false);

    if (result.success) {
      setSuccessMessage('A fresh OTP has been sent to your email.');
      startCooldown();
    } else {
      setError(result.message || 'Failed to resend OTP.');
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, otp, password);
    setLoading(false);

    if (result.success) {
      setStep('success');
    } else {
      setError(result.message || 'Failed to reset password. Please verify the OTP.');
    }
  };

  return (
    <>
      <SeoManager pageKey="forgot_password" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        body { margin: 0; padding: 0; background: #f4f7f9; }
        .recovery-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .recovery-card { background: #fff; border-radius: 24px; padding: 48px; width: 100%; max-width: 520px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        
        .recovery-header { text-align: center; margin-bottom: 35px; }
        .recovery-header h1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2.2rem; color: #000; margin: 0 0 8px; }
        .recovery-header p { font-family: 'Inter', sans-serif; color: #666; font-size: 0.95rem; margin: 0; line-height: 1.5; }

        .input-group { margin-bottom: 22px; }
        .input-group label { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.9rem; color: #000; margin-bottom: 8px; display: block; }
        .input-field { width: 100%; padding: 14px 18px; border: 1px solid #e0e0e0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: border-color 0.2s; outline: none; background: #fff; box-sizing: border-box; }
        .input-field:focus { border-color: #ffc63a; }
        .input-field::placeholder { color: #aaa; }
        
        .password-wrapper { position: relative; }
        .password-toggle { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; cursor: pointer; display: flex; align-items: center; padding: 4px; }

        .submit-btn { width: 100%; padding: 16px; background: #ffc63a; color: #fff; border: none; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: transform 0.1s; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .submit-btn:active { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .back-link { display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem; color: #666; text-decoration: none; margin-top: 24px; transition: color 0.2s; }
        .back-link:hover { color: #ffc63a; }

        .alert-error { padding: 14px; background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; border-radius: 12px; margin-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
        .alert-success { padding: 14px; background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; border-radius: 12px; margin-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 0.9rem; }

        .resend-container { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: #666; }
        .resend-btn { background: none; border: none; color: #ffc63a; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; font-size: 0.85rem; }
        .resend-btn:disabled { color: #999; text-decoration: none; cursor: not-allowed; }

        /* Success screen animations */
        .success-icon-wrapper { display: flex; justify-content: center; margin-bottom: 20px; }
        .success-icon { font-size: 4rem; color: #389e0d; animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="recovery-page">
        <div className="recovery-card">
          {step === 'email' && (
            <>
              <div className="recovery-header">
                <h1>Reset Password</h1>
                <p>Enter your email and we&apos;ll send you a 6-digit verification code to recover your account.</p>
              </div>

              {error && <div className="alert-error" id="recovery-error">{error}</div>}

              <form onSubmit={handleSendOtp} id="forgot-email-form">
                <div className="input-group">
                  <label htmlFor="recovery-email">Email Address</label>
                  <input
                    id="recovery-email"
                    className="input-field"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={loading} id="send-otp-btn">
                  {loading ? 'Sending Code...' : <>Send Code <i className="bi bi-arrow-right"></i></>}
                </button>
              </form>

              <Link href="/login" className="back-link" id="back-to-login">
                <i className="bi bi-arrow-left"></i> Back to Login
              </Link>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="recovery-header">
                <h1>Verify OTP</h1>
                <p>We&apos;ve sent a 6-digit verification code to <strong style={{ color: '#000' }}>{email}</strong>. Enter it below along with your new password.</p>
              </div>

              {successMessage && <div className="alert-success" id="recovery-success">{successMessage}</div>}
              {error && <div className="alert-error" id="recovery-error">{error}</div>}

              <form onSubmit={handleResetPassword} id="reset-password-form">
                <div className="input-group">
                  <label htmlFor="reset-otp">Verification Code (OTP)</label>
                  <input
                    id="reset-otp"
                    className="input-field"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                  <div className="resend-container">
                    <span>Didn&apos;t get the code?</span>
                    {resendCooldown > 0 ? (
                      <span style={{ fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        className="resend-btn"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                      >
                        {resendLoading ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="reset-password">New Password</label>
                  <div className="password-wrapper">
                    <input
                      id="reset-password"
                      className="input-field"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="reset-confirm-password">Confirm Password</label>
                  <input
                    id="reset-confirm-password"
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading} id="submit-reset-btn">
                  {loading ? 'Updating Password...' : <>Reset Password <i className="bi bi-check2-circle"></i></>}
                </button>
              </form>

              <button
                type="button"
                className="back-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
                onClick={() => {
                  setStep('email');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                <i className="bi bi-arrow-left"></i> Back to Step 1
              </button>
            </>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center' }} id="reset-success-screen">
              <div className="success-icon-wrapper">
                <i className="bi bi-check-circle-fill success-icon"></i>
              </div>
              <div className="recovery-header" style={{ marginBottom: 25 }}>
                <h1 style={{ fontSize: '1.8rem' }}>Password Updated!</h1>
                <p>Your password has been reset successfully. You can now log in using your new password.</p>
              </div>
              <Link href="/login" className="submit-btn" style={{ textDecoration: 'none' }} id="go-to-login-btn">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
