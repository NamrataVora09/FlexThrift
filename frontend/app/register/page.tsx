'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'super_admin') router.replace('/superadmin');
      else if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else router.replace('/buyer/browse');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referred_by: ref.toUpperCase() }));
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '', email: '', mobile: '', password: '', address: '', pin_code: '', user_type: 'buyer', referred_by: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileError, setMobileError] = useState(false);
  const [coords, setCoords] = useState({ lat: '', lng: '' });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
        () => { }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'mobile') {
      const digits = value.replace(/\D/g, '');
      setMobileError(digits.length > 0 && digits.length !== 10);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await register({ ...formData, user_latitude: coords.lat, user_longitude: coords.lng });
    setLoading(false);
    if (result.success) {
      sessionStorage.setItem('otp_email', formData.email);
      sessionStorage.setItem('otp_type', 'register');
      router.push('/verify-otp');
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  const roles = [
    { value: 'buyer', label: 'Buy', icon: 'bi-lock' },
    { value: 'seller', label: 'Sell', icon: 'bi-shop' },
    { value: 'both', label: 'Both', icon: 'bi-arrow-left-right' },
  ];

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        body { margin: 0; padding: 0; background: #f4f7f9; }
        .reg-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .reg-card { background: #fff; border-radius: 24px; padding: 48px; width: 100%; max-width: 600px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        
        .reg-header { text-align: center; margin-bottom: 40px; }
        .reg-header h1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2.2rem; color: #000; margin: 0 0 8px; }
        .reg-header p { font-family: 'Inter', sans-serif; color: #666; font-size: 1rem; margin: 0; }

        .form-section-label { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.9rem; color: #000; margin-bottom: 12px; display: block; }
        
        /* Role Toggles */
        .role-toggles { display: flex; gap: 12px; margin-bottom: 32px; }
        .role-toggle { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; border: 1.5px solid #e0e0e0; border-radius: 12px; background: #fff; cursor: pointer; transition: all 0.2s ease; font-family: 'Inter', sans-serif; font-weight: 600; color: #444; }
        .role-toggle i { font-size: 1.1rem; }
        .role-toggle.active { background: #ffc63a; border-color: #ffc63a; color: #fff; box-shadow: 0 4px 12px rgba(255,198,58,0.3); }

        /* Inputs */
        .input-group { margin-bottom: 24px; flex-direction: column; }
        .input-group label { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.9rem; color: #000; margin-bottom: 10px; display: block; }
        .input-field { width: 100%; padding: 14px 18px; border: 1px solid #e0e0e0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: border-color 0.2s; outline: none; background: #fff; box-sizing: border-box; }
        .input-field:focus { border-color: #ffc63a; }
        .input-field::placeholder { color: #aaa; }
        
        /* Mobile Input Custom */
        .mobile-input-wrapper { display: flex; align-items: center; border: 1px solid #e0e0e0; border-radius: 12px; padding: 0 16px; background: #fff; }
        .mobile-input-wrapper:focus-within { border-color: #ffc63a; }
        .country-prefix { display: flex; align-items: center; gap: 8px; padding-right: 12px; border-right: 1px solid #eee; margin-right: 12px; color: #444; font-family: 'Inter', sans-serif; font-size: 0.95rem; }
        .country-flag { width: 20px; height: 14px; object-fit: cover; border-radius: 2px; }
        .mobile-input-wrapper input { border: none; padding: 14px 0; width: 100%; outline: none; font-family: 'Inter', sans-serif; font-size: 0.95rem; }

        .textarea-field { min-height: 100px; resize: none; }

        .submit-btn { width: 100%; padding: 18px; background: #ffc63a; color: #fff; border: none; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: transform 0.1s; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .submit-btn:active { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .footer-text { text-align: center; margin-top: 32px; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #666; }
        .footer-text a { color: #ffc63a; font-weight: 700; text-decoration: none; margin-left: 4px; }
        .footer-text a:hover { text-decoration: underline; }

        .alert-error { padding: 14px; background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; border-radius: 12px; margin-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
      `}</style>

      <div className="reg-page">
        <form className="reg-card" onSubmit={handleSubmit}>
          <div className="reg-header">
            <h1>Create Account</h1>
            <p>Join Flex Market today</p>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="form-section">
            <span className="form-section-label">I want to...</span>
            <div className="role-toggles">
              {roles.map((r) => (
                <div key={r.value} className={`role-toggle ${formData.user_type === r.value ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, user_type: r.value }))}>
                  <i className={`bi ${r.icon}`}></i>
                  {r.label}
                </div>
              ))}
            </div>

            <div className="input-group">
              <label>Full Name</label>
              <input className="input-field" type="text" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input className="input-field" type="email" name="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label className='block'>Mobile Number</label>
              <div className="mobile-input-wrapper">
                <div className="country-prefix">
                  <img src="https://flagcdn.com/w20/in.png" className="country-flag" alt="India" />
                  <span>+91</span>
                  <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.7rem' }}></i>
                </div>
                <input type="tel" name="mobile" placeholder="98XXX XXX00" value={formData.mobile} onChange={handleChange} required />
              </div>
              {mobileError && <div style={{ color: '#cf1322', fontSize: '0.8rem', marginTop: 6 }}>Please enter a valid 10-digit number</div>}
            </div>

            <div className="input-group">
              <label>Password</label>
              <input className="input-field" type="password" name="password" placeholder="Create a strong password" value={formData.password} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>Address</label>
              <textarea className="input-field textarea-field" name="address" placeholder="Enter your full address" value={formData.address} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>PIN Code</label>
              <input className="input-field" type="text" name="pin_code" placeholder="Enter PIN code" value={formData.pin_code} onChange={handleChange} required />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating Account...' : <>Create Account <i className="bi bi-arrow-right"></i></>}
            </button>

            <div className="footer-text">
              Already have an account? <Link href="/">Login here</Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
