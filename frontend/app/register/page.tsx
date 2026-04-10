'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', mobile: '', password: '', address: '', pin_code: '', user_type: 'buyer',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileError, setMobileError] = useState(false);
  const [coords, setCoords] = useState({ lat: '', lng: '' });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
        () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    (window as any).handleGoogleRegister = async (response: any) => {
      setError(''); setLoading(true);
      const res = await api.post<{ user: any; token: string }>('/auth/google-login', { credential: response.credential });
      setLoading(false);
      if (res.success && res.data) {
        localStorage.setItem('flex_token', res.data.token);
        localStorage.setItem('flex_user', JSON.stringify(res.data.user));
        router.push('/');
      } else { setError(res.message || 'Google sign-up failed'); }
    };
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'mobile') { const digits = value.replace(/\D/g, ''); setMobileError(digits.length > 0 && digits.length !== 10); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const result = await register({ ...formData, user_latitude: coords.lat, user_longitude: coords.lng });
    setLoading(false);
    if (result.success) { sessionStorage.setItem('otp_email', formData.email); sessionStorage.setItem('otp_type', 'register'); router.push('/verify-otp'); }
    else setError(result.message || 'Registration failed');
  };

  const canGoNext = () => {
    if (step === 1) return true; // role selection always valid
    if (step === 2) return formData.name && formData.email && formData.mobile && !mobileError && formData.password;
    return true;
  };

  const nextStep = () => { if (canGoNext()) { setError(''); setStep(s => s + 1); } };
  const prevStep = () => { setError(''); setStep(s => s - 1); };

  const roles = [
    { value: 'buyer', label: 'Buy', icon: 'bi-bag-heart', desc: 'Shop products' },
    { value: 'seller', label: 'Sell', icon: 'bi-shop-window', desc: 'List & sell items' },
    { value: 'both', label: 'Both', icon: 'bi-arrow-left-right', desc: 'Buy & sell' },
    { value: 'delivery', label: 'Delivery', icon: 'bi-truck', desc: 'Deliver orders' },
  ];

  const steps = [
    { num: 1, label: 'Role' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Address' },
  ];

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        body { margin: 0; padding: 0; }
        .reg-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fff; padding: 20px; }
        .reg-card { background: #fff; border-radius: 24px; padding: 40px 36px; width: 100%; max-width: 480px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.08); border: 1px solid #f0f0f0; }
        .auth-logo { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 900; color: #000; text-align: center; display: block; text-decoration: none; margin-bottom: 28px; letter-spacing: -1.5px; }
        .auth-logo span { color: #ffc63a; }

        /* Stepper */
        .stepper { display: flex; justify-content: center; gap: 0; margin-bottom: 32px; position: relative; }
        .stepper::before { content: ''; position: absolute; top: 18px; left: 25%; right: 25%; height: 2px; background: #eee; z-index: 0; }
        .step-dot { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 1; flex: 1; }
        .step-circle { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.85rem; transition: all 0.3s; border: 2px solid #eee; background: #fff; color: #bbb; }
        .step-dot.active .step-circle { background: #ffc63a; color: #000; border-color: #ffc63a; box-shadow: 0 4px 14px rgba(255,198,58,0.35); }
        .step-dot.done .step-circle { background: #000; color: #ffc63a; border-color: #000; }
        .step-label { font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.5px; }
        .step-dot.active .step-label, .step-dot.done .step-label { color: #000; }

        /* Step title */
        .step-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.4rem; color: #000; text-align: center; margin-bottom: 4px; }
        .step-desc { font-family: 'Inter', sans-serif; color: #999; font-size: 0.85rem; text-align: center; margin-bottom: 24px; }

        /* Role cards */
        .role-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .role-card { padding: 20px 16px; text-align: center; border: 2px solid #eee; border-radius: 16px; cursor: pointer; transition: all 0.3s; background: #fafafa; }
        .role-card:hover { border-color: #ffc63a; background: #fffdf5; }
        .role-card.active { border-color: #ffc63a; background: rgba(255,198,58,0.08); box-shadow: 0 4px 16px rgba(255,198,58,0.15); }
        .role-card i { font-size: 1.8rem; color: #bbb; display: block; margin-bottom: 8px; transition: color 0.3s; }
        .role-card.active i { color: #ffc63a; }
        .role-card .rc-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; color: #333; }
        .role-card .rc-desc { font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #999; margin-top: 2px; }

        /* Inputs */
        .auth-input-group { margin-bottom: 16px; }
        .auth-input-group label { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.78rem; color: #444; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
        .auth-input { width: 100%; padding: 12px 16px; border: 2px solid #eee; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; transition: all 0.3s; outline: none; background: #fafafa; box-sizing: border-box; }
        .auth-input:focus { border-color: #ffc63a; background: #fff; box-shadow: 0 0 0 4px rgba(255,198,58,0.08); }
        .auth-textarea { resize: vertical; min-height: 80px; }
        .mobile-error { color: #d32f2f; font-size: 0.75rem; margin-top: 4px; }

        /* Buttons */
        .btn-row { display: flex; gap: 10px; margin-top: 12px; }
        .auth-btn { flex: 1; padding: 13px; background: #ffc63a; color: #000; border: none; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; }
        .auth-btn:hover { background: #000; color: #ffc63a; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-btn-outline { flex: 1; padding: 13px; background: #fff; color: #333; border: 2px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; }
        .auth-btn-outline:hover { border-color: #333; }

        /* Google & divider */
        .auth-google { width: 100%; padding: 12px; background: #fff; color: #333; border: 2px solid #eee; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .auth-google:hover { border-color: #333; background: #fafafa; }
        .auth-google svg { width: 18px; height: 18px; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; color: #ccc; font-size: 0.78rem; font-family: 'Inter', sans-serif; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #eee; }

        .auth-footer-text { text-align: center; margin-top: 20px; font-family: 'Inter', sans-serif; font-size: 0.84rem; color: #999; }
        .auth-footer-text a { color: #ffc63a; font-weight: 600; text-decoration: none; }
        .auth-footer-text a:hover { color: #000; }
        .auth-alert { padding: 12px 16px; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; background: #fff0f0; color: #d32f2f; border: 1px solid #ffd6d6; }

        @media (max-width: 480px) { .reg-card { padding: 28px 20px; } }
      `}</style>

      <div className="reg-page">
        <div className="reg-card">
          <Link href="/" className="auth-logo">Flex Market<span>.</span></Link>

          {/* Stepper */}
          <div className="stepper">
            {steps.map((s) => (
              <div key={s.num} className={`step-dot ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}>
                <div className="step-circle">
                  {step > s.num ? <i className="bi bi-check2"></i> : s.num}
                </div>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </div>

          {error && <div className="auth-alert"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <>
              <h2 className="step-title">What brings you here?</h2>
              <p className="step-desc">Choose how you want to use Flex Market</p>

              {/* Google */}
              <button className="auth-google" onClick={() => {
                const google = (window as any).google;
                if (google?.accounts?.id) {
                  google.accounts.id.initialize({ client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', callback: (window as any).handleGoogleRegister });
                  google.accounts.id.prompt();
                }
              }}>
                <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Quick sign up with Google
              </button>
              <div className="auth-divider">or choose a role</div>

              <div className="role-cards">
                {roles.map((r) => (
                  <div key={r.value} className={`role-card ${formData.user_type === r.value ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, user_type: r.value }))}>
                    <i className={`bi ${r.icon}`}></i>
                    <div className="rc-title">{r.label}</div>
                    <div className="rc-desc">{r.desc}</div>
                  </div>
                ))}
              </div>

              <div className="btn-row">
                <button className="auth-btn" onClick={nextStep}>
                  Continue <i className="bi bi-arrow-right ms-2"></i>
                </button>
              </div>
            </>
          )}

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <>
              <h2 className="step-title">Your Details</h2>
              <p className="step-desc">Tell us a bit about yourself</p>

              <div className="auth-input-group">
                <label>Full Name</label>
                <input className="auth-input" type="text" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="auth-input-group">
                <label>Email Address</label>
                <input className="auth-input" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="auth-input-group">
                <label>Mobile Number</label>
                <input className="auth-input" type="tel" name="mobile" placeholder="98XXXXXXXX" value={formData.mobile} onChange={handleChange} required />
                {mobileError && <div className="mobile-error">Please enter a valid 10-digit mobile number</div>}
              </div>
              <div className="auth-input-group">
                <label>Password</label>
                <input className="auth-input" type="password" name="password" placeholder="Create a strong password" value={formData.password} onChange={handleChange} required />
              </div>

              <div className="btn-row">
                <button className="auth-btn-outline" onClick={prevStep}>
                  <i className="bi bi-arrow-left me-1"></i> Back
                </button>
                <button className="auth-btn" onClick={nextStep} disabled={!canGoNext()}>
                  Continue <i className="bi bi-arrow-right ms-2"></i>
                </button>
              </div>
            </>
          )}

          {/* Step 3: Address & Submit */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h2 className="step-title">Almost There!</h2>
              <p className="step-desc">Add your address to complete registration</p>

              <div className="auth-input-group">
                <label>Address</label>
                <textarea className="auth-input auth-textarea" name="address" placeholder="Enter your full address" value={formData.address} onChange={handleChange} required />
              </div>
              <div className="auth-input-group">
                <label>PIN Code</label>
                <input className="auth-input" type="text" name="pin_code" placeholder="Enter PIN code" value={formData.pin_code} onChange={handleChange} required />
              </div>

              <div className="btn-row">
                <button type="button" className="auth-btn-outline" onClick={prevStep}>
                  <i className="bi bi-arrow-left me-1"></i> Back
                </button>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'} <i className="bi bi-check-circle ms-2"></i>
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer-text">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
