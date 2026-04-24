'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp, isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') router.replace('/superadmin');
      else if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else router.replace('/buyer/dashboard');
    }
  }, [isLoading, isAuthenticated, user]);

  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectByRole = (role: string) => {
    const pendingRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('redirect_after_login') : null;
    if (pendingRedirect) { sessionStorage.removeItem('redirect_after_login'); router.push(pendingRedirect); return; }
    if (role === 'super_admin') router.push('/superadmin');
    else if (role === 'admin') router.push('/admin');
    else if (role === 'delivery') router.push('/delivery');
    else if (role === 'seller') router.push('/seller');
    else router.push('/');
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const result = await login(email, password); setLoading(false);
    if (result.success) { const user = JSON.parse(localStorage.getItem('flex_user') || '{}'); redirectByRole(user.role); }
    else setError(result.message || 'Login failed');
  };

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const result = await sendOtp(email); setLoading(false);
    if (result.success) { sessionStorage.setItem('otp_email', email); sessionStorage.setItem('otp_type', 'login'); router.push('/verify-otp'); }
    else setError(result.message || 'Failed to send OTP');
  };

  // Google Sign-In callback
  useEffect(() => {
    (window as any).handleGoogleLogin = async (response: any) => {
      setError(''); setLoading(true);
      const res = await api.post<{ user: any; token: string }>('/auth/google-login', { credential: response.credential });
      setLoading(false);
      if (res.success && res.data) {
        localStorage.setItem('flex_token', res.data.token);
        localStorage.setItem('flex_user', JSON.stringify(res.data.user));
        redirectByRole(res.data.user.role);
      } else {
        setError(res.message || 'Google login failed');
      }
    };
  }, []);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        body { margin: 0; padding: 0; }
        .login-wrapper { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }

        /* Left Panel - Image */
        .login-visual { flex: 1; position: relative; overflow: hidden; display: flex; align-items: flex-end; }
        .login-visual-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .login-visual-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%); }
        .login-visual-content { position: relative; z-index: 2; padding: 60px; color: #fff; }
        .login-visual-tag { display: inline-block; padding: 8px 18px; background: rgba(255,198,58,0.2); backdrop-filter: blur(10px); color: #ffc63a; border-radius: 50px; font-size: 0.7rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; border: 1px solid rgba(255,198,58,0.3); }
        .login-visual-title { font-family: 'Outfit', sans-serif; font-size: 3.2rem; font-weight: 900; line-height: 1.1; margin-bottom: 16px; letter-spacing: -1px; }
        .login-visual-title em { font-style: normal; color: #ffc63a; }
        .login-visual-desc { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.6; max-width: 420px; }

        /* Right Panel - Form */
        .login-form-side { flex: 0 0 520px; display: flex; align-items: center; justify-content: center; padding: 40px; background: #fff; position: relative; }
        .login-form-inner { width: 100%; max-width: 400px; }
        .auth-logo { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 900; color: #000; display: block; text-decoration: none; margin-bottom: 36px; letter-spacing: -1.5px; }
        .auth-logo span { color: #ffc63a; }
        .auth-heading { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.5rem; color: #000; margin-bottom: 4px; }
        .auth-sub { font-family: 'Inter', sans-serif; color: #999; font-size: 0.88rem; margin-bottom: 28px; }
        .auth-tabs { display: flex; gap: 8px; margin-bottom: 22px; background: #f5f5f5; padding: 4px; border-radius: 12px; }
        .auth-tab { flex: 1; padding: 10px; background: transparent; border: none; border-radius: 8px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; color: #999; cursor: pointer; transition: all 0.3s; }
        .auth-tab.active { background: #ffc63a; color: #000; box-shadow: 0 4px 12px rgba(255,198,58,0.25); }
        .auth-input-group { margin-bottom: 16px; }
        .auth-input-group label { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.75rem; color: #444; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
        .auth-input { width: 100%; padding: 12px 16px; border: 2px solid #eee; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; transition: all 0.3s; outline: none; background: #fafafa; box-sizing: border-box; }
        .auth-input:focus { border-color: #ffc63a; background: #fff; box-shadow: 0 0 0 4px rgba(255,198,58,0.08); }
        .auth-btn { width: 100%; padding: 13px; background: #ffc63a; color: #000; border: none; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; margin-top: 6px; }
        .auth-btn:hover { background: #000; color: #ffc63a; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; color: #ccc; font-size: 0.78rem; font-family: 'Inter', sans-serif; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #eee; }
        .auth-google { width: 100%; padding: 12px; background: #fff; color: #333; border: 2px solid #eee; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .auth-google:hover { border-color: #333; background: #fafafa; }
        .auth-google svg { width: 18px; height: 18px; }
        .auth-footer-text { text-align: center; margin-top: 24px; font-family: 'Inter', sans-serif; font-size: 0.84rem; color: #999; }
        .auth-footer-text a { color: #ffc63a; font-weight: 600; text-decoration: none; }
        .auth-footer-text a:hover { color: #000; }
        .auth-alert { padding: 12px 16px; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
        .auth-alert-error { background: #fff0f0; color: #d32f2f; border: 1px solid #ffd6d6; }

        @media (max-width: 1024px) {
          .login-visual { display: none; }
          .login-form-side { flex: 1; }
        }
        @media (max-width: 480px) {
          .login-form-side { padding: 24px; }
          .login-form-inner { max-width: 100%; }
        }
      `}</style>

      <div className="login-wrapper">
        {/* Left - Fashion Image */}
        <div className="login-visual">
          <img
            className="login-visual-img"
            src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1920&q=80"
            alt="Fashion"
          />
          <div className="login-visual-overlay"></div>
          <div className="login-visual-content">
            <span className="login-visual-tag">Flex Market</span>
            <h1 className="login-visual-title">
              Where Style<br />Meets <em>Purpose.</em>
            </h1>
            <p className="login-visual-desc">
              Buy, sell, and rent premium fashion. Join thousands of style-conscious individuals on the most trusted marketplace.
            </p>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="login-form-side">
          <div className="login-form-inner">
            <Link href="/" className="auth-logo">Flex Market<span>.</span></Link>
            <h1 className="auth-heading">Welcome Back</h1>
            <p className="auth-sub">Sign in to continue to your account</p>

            {error && <div className="auth-alert auth-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

            {/* Google Sign-In */}
            <button className="auth-google" onClick={() => {
              const google = (window as any).google;
              if (google?.accounts?.id) {
                google.accounts.id.initialize({ client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', callback: (window as any).handleGoogleLogin });
                google.accounts.id.prompt();
              }
            }}>
              <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div className="auth-divider">or sign in with email</div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button className={`auth-tab ${activeTab === 'otp' ? 'active' : ''}`} onClick={() => setActiveTab('otp')}>
                <i className="bi bi-phone me-1"></i> OTP
              </button>
              <button className={`auth-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
                <i className="bi bi-key me-1"></i> Password
              </button>
            </div>

            {activeTab === 'otp' && (
              <form onSubmit={handleOtpLogin}>
                <div className="auth-input-group">
                  <label>Email Address</label>
                  <input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send OTP'} <i className="bi bi-arrow-right ms-2"></i>
                </button>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handlePasswordLogin}>
                <div className="auth-input-group">
                  <label>Email Address</label>
                  <input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="auth-input-group">
                  <label>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="auth-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#666', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'} <i className="bi bi-arrow-right ms-2"></i>
                </button>
              </form>
            )}

            <div className="auth-footer-text">
              Don&apos;t have an account? <Link href="/register">Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
