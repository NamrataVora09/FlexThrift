'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getIPLocationCoords } from '@/lib/geolocation';

export default function GeolocationBlocker({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [restrictionEnabled, setRestrictionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<'denied' | 'unavailable' | 'timeout' | null>(null);

  const [blockMessage, setBlockMessage] = useState<string>('');

  const checkLocationByIP = useCallback(async () => {
    try {
      // Fetch IP-based lat/lon using ip-api.com (or ipapi.co)
      const ipLoc = await getIPLocationCoords();
      let query = '';
      if (ipLoc?.lat && ipLoc?.lng) {
        query = `?lat=${ipLoc.lat}&lng=${ipLoc.lng}`;
      }

      const res = await api.get<any>(`/auth/check-location${query}`);
      if (res.success && res.data && res.data.restriction_enabled && !res.data.is_allowed) {
        setIsBlocked(true);
        setBlockMessage(res.data.message || 'Access restricted to authorized zones only.');
      } else {
        setIsBlocked(false);
      }
    } catch {
      // Cannot determine location — allow through (fail open)
      setIsBlocked(false);
    }
    setLoading(false);
  }, []);

  const checkLocation = useCallback(() => {
    // Only SuperAdmin bypasses location checks
    if (user?.role === 'super_admin') {
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      // No GPS support — fall back to IP-based detection
      checkLocationByIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.get<any>(`/auth/check-location?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          if (res.success && res.data && res.data.restriction_enabled && !res.data.is_allowed) {
            setIsBlocked(true);
            setBlockMessage(res.data.message || 'Access restricted to authorized zones only.');
          } else {
            setIsBlocked(false);
          }
        } catch {
          setIsBlocked(false);
        }
        setLoading(false);
      },
      async (error) => {
        // GPS denied, unavailable, or timed out — fall back silently to IP-based detection
        setErrorType(
          error.code === error.PERMISSION_DENIED ? 'denied' :
          error.code === error.POSITION_UNAVAILABLE ? 'unavailable' : 'timeout'
        );
        await checkLocationByIP();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user, checkLocationByIP]);

  useEffect(() => {
    // Check if restriction is enabled from landing-content or shared settings
    const checkRestriction = async () => {
      try {
        const res = await api.get<any>('/landing-content');
        if (res.success && res.data && res.data.enable_zone_restriction === '1') {
          setRestrictionEnabled(true);
          checkLocation();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to check zone restriction:", err);
        setLoading(false);
      }
    };

    checkRestriction();
  }, [checkLocation]);

  if (loading) {
     return null; // Or a splash screen
  }

  if (user && Number(user.is_blocked) === 1) {
    return (
      <div className="blocked-user-overlay" style={{
        position: 'fixed', inset: 0, background: '#fff', zIndex: 99999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
        }}>
           <i className="bi bi-person-x-fill" style={{ fontSize: '2.5rem', color: '#dc3545' }}></i>
        </div>
        
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '1rem', color: '#000' }}>
          Account Blocked
        </h1>
        
        <p style={{ maxWidth: '500px', color: '#666', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your account has been blocked by the administration. You no longer have access to browse the marketplace or perform any actions.
        </p>

        <div style={{
          background: '#f8f9fa', borderRadius: '16px', padding: '1.5rem',
          maxWidth: '500px', textAlign: 'center', marginBottom: '2rem', border: '1px solid #eee'
        }}>
          <p className="mb-0 small text-muted">
            If you believe this is a mistake, please contact our support team at <strong>support@flexmarket.com</strong>
          </p>
        </div>

        <button 
          onClick={() => { localStorage.clear(); window.location.href = '/'; }}
          style={{
            background: '#ffc63a', color: '#000', border: 'none', borderRadius: '12px',
            padding: '12px 32px', fontWeight: 700, cursor: 'pointer', transition: '0.3s',
            boxShadow: '0 4px 15px rgba(255,198,58,0.3)'
          }}
        >
          Logout / Switch Account
        </button>
      </div>
    );
  }

  if (restrictionEnabled && isBlocked) {
    return (
      <div className="geolocation-blocker" style={{
        position: 'fixed', inset: 0, background: '#fff', zIndex: 99999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
        }}>
           <i className="bi bi-geo-alt-fill" style={{ fontSize: '2.5rem', color: '#dc3545' }}></i>
        </div>
        
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: '1rem', color: '#000' }}>
          {blockMessage.includes('not yet available') || blockMessage.includes('restricted') ? 'Service Unavailable in Your Zone' : 'Location Access Required'}
        </h1>
        
        <p style={{ maxWidth: '500px', color: '#666', lineHeight: 1.6, marginBottom: '2rem' }}>
          {blockMessage || 'To ensure we comply with local regulations and provide services only in authorized zones, we require your GPS location.'}
        </p>

        <div style={{
          background: '#f8f9fa', borderRadius: '16px', padding: '1.5rem',
          maxWidth: '500px', textAlign: 'left', marginBottom: '2rem', border: '1px solid #eee'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>How to fix this:</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#444' }}>
            <li style={{ marginBottom: '0.5rem' }}>Click the <strong>lock icon</strong> (or info icon) in your browser's address bar.</li>
            <li style={{ marginBottom: '0.5rem' }}>Find <strong>Location</strong> and set it to <strong>Allow</strong>.</li>
            <li>Refresh this page or click the button below.</li>
          </ul>
        </div>

        <button 
          onClick={() => window.location.reload()}
          style={{
            background: '#ffc63a', color: '#000', border: 'none', borderRadius: '12px',
            padding: '12px 32px', fontWeight: 700, cursor: 'pointer', transition: '0.3s',
            boxShadow: '0 4px 15px rgba(255,198,58,0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Try Again / Refresh
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
