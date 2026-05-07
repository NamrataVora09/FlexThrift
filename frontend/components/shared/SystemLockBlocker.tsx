'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SystemLockBlocker({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLock = async () => {
      try {
        const res = await api.get<any>('/landing-content');
        if (res.success && res.data && (res.data.global_system_lock === '1' || res.data.global_system_lock === 'true')) {
          // If locked, check if user is NOT superadmin
          if (!['super_admin', 'superadmin'].includes(user?.role || '')) {
            setIsLocked(true);
          }
        }
      } catch (err) {
        console.error("Failed to check system lock:", err);
      } finally {
        setLoading(false);
      }
    };

    checkLock();
  }, [user]);

  if (loading) {
    return null;
  }

  if (isLocked) {
    return (
      <div className="system-lock-overlay" style={{
        position: 'fixed', inset: 0, background: '#fff', zIndex: 999999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '100px', height: '100px', background: '#fff7ed', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem',
          border: '4px solid #ffedd5'
        }}>
           <i className="bi bi-lock-fill" style={{ fontSize: '3rem', color: '#f97316' }}></i>
        </div>
        
        <h1 style={{ fontWeight: 800, fontSize: '2.5rem', marginBottom: '1rem', color: '#111', letterSpacing: '-0.02em' }}>
          System Maintenance
        </h1>
        
        <p style={{ maxWidth: '550px', color: '#4b5563', lineHeight: 1.7, fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          The platform is currently undergoing scheduled maintenance or is temporarily locked by the administration. 
          Please try again later. We apologize for the inconvenience.
        </p>

        <div style={{
          background: '#f9fafb', borderRadius: '20px', padding: '1.5rem 2.5rem',
          maxWidth: '500px', textAlign: 'center', marginBottom: '2.5rem', border: '1px solid #e5e7eb'
        }}>
          <p className="mb-0 text-muted" style={{ fontSize: '0.95rem' }}>
            Expected downtime is minimal. For urgent queries, contact <br />
            <a href="mailto:support@flexmarket.com" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>support@flexmarket.com</a>
          </p>
        </div>

        {user && (
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            style={{
              background: '#000', color: '#fff', border: 'none', borderRadius: '14px',
              padding: '14px 40px', fontWeight: 600, cursor: 'pointer', transition: '0.3s',
              fontSize: '1rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = '#000'}
          >
            Logout / Switch Account
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
