'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { useSystem } from '@/lib/system-context';
import { api } from '@/lib/api';
import SeoManager from '@/components/shared/SeoManager';

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp, isAuthenticated, user, isLoading } = useAuth();
  const { getMsg } = useSystem();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') router.replace('/superadmin');
      else if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else router.replace('/buyer/browse');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectByRole = (role: string) => {
    const pendingRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('redirect_after_login') : null;
    if (pendingRedirect) {
      sessionStorage.removeItem('redirect_after_login');
      router.push(pendingRedirect);
      return;
    }
    if (role === 'super_admin') router.push('/superadmin');
    else if (role === 'admin') router.push('/admin');
    else if (role === 'delivery') router.push('/delivery');
    else if (role === 'seller') router.push('/seller');
    else router.push('/');
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('flex_user') || '{}');
      redirectByRole(user.role);
    } else {
      setError(result.message || getMsg('login_failed', 'Login failed'));
    }
  };

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await sendOtp(email);
    setLoading(false);
    if (result.success) {
      sessionStorage.setItem('otp_email', email);
      sessionStorage.setItem('otp_type', 'login');
      router.push('/verify-otp');
    } else {
      setError(result.message || getMsg('otp_send_failed', 'Failed to send OTP'));
    }
  };

  return (
    <>
      <SeoManager pageKey="login" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        body { margin: 0; padding: 0; background: #f4f7f9; }
        .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .login-card { background: #fff; border-radius: 24px; padding: 48px; width: 100%; max-width: 520px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        
        .login-header { text-align: center; margin-bottom: 40px; }
        .login-header h1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2.2rem; color: #000; margin: 0 0 8px; }
        .login-header p { font-family: 'Inter', sans-serif; color: #666; font-size: 1rem; margin: 0; }

        /* Tabs Selection */
        .auth-tabs { display: flex; gap: 8px; margin-bottom: 32px; background: #f5f5f5; padding: 6px; border-radius: 12px; }
        .auth-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border: none; border-radius: 8px; background: transparent; cursor: pointer; transition: all 0.2s ease; font-family: 'Inter', sans-serif; font-weight: 600; color: #666; font-size: 0.9rem; }
        .auth-tab i { font-size: 1rem; }
        .auth-tab.active { background: #ffc63a; color: #fff; box-shadow: 0 4px 12px rgba(255,198,58,0.25); }

        /* Inputs */
        .input-group { margin-bottom: 24px; }
        .input-group label { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.9rem; color: #000; margin-bottom: 10px; display: block; }
        .input-field { width: 100%; padding: 14px 18px; border: 1px solid #e0e0e0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: border-color 0.2s; outline: none; background: #fff; box-sizing: border-box; }
        .input-field:focus { border-color: #ffc63a; }
        .input-field::placeholder { color: #aaa; }
        
        .password-wrapper { position: relative; }
        .password-toggle { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; cursor: pointer; display: flex; align-items: center; padding: 4px; }

        .submit-btn { width: 100%; padding: 18px; background: #ffc63a; color: #fff; border: none; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: transform 0.1s; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .submit-btn:active { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .footer-text { text-align: center; margin-top: 32px; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #666; }
        .footer-text a { color: #ffc63a; font-weight: 700; text-decoration: none; margin-left: 4px; }
        .footer-text a:hover { text-decoration: underline; }

        .alert-error { padding: 14px; background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; border-radius: 12px; margin-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Login to your account</p>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${activeTab === 'otp' ? 'active' : ''}`} onClick={() => setActiveTab('otp')}>
              <i className="bi bi-phone"></i> OTP Login
            </button>
            <button className={`auth-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
              <i className="bi bi-key"></i> Password
            </button>
          </div>

          {error && <div className="alert-error">{error}</div>}

          {activeTab === 'otp' ? (
            <form onSubmit={handleOtpLogin}>
              <div className="input-group">
                <label>Email Address</label>
                <input className="input-field" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending OTP...' : <>Send OTP <i className="bi bi-arrow-right"></i></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin}>
              <div className="input-group">
                <label>Email Address</label>
                <input className="input-field" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input className="input-field" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Link href="/forgot-password" style={{ color: '#1d4ed8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline', fontFamily: "'Inter', sans-serif" }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    Forgot Password?
                  </Link>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : <>Login <i className="bi bi-arrow-right"></i></>}
              </button>
            </form>
          )}

          <div className="footer-text">
            Don&apos;t have an account? <Link href="/register">Register here</Link>
          </div>
        </div>
      </div>
    </>
  );
}
