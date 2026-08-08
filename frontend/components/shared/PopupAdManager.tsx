'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface Ad {
  id: number;
  title: string;
  short_description: string;
  media_path: string;
  media_type: string;
  ad_type: 'image' | 'video';
}

function getPageKeyFromPathname(pathname: string): string {
  if (!pathname || pathname === '/' || pathname === '/landing') {
    return 'landing';
  }
  if (pathname.startsWith('/buyer/browse') || pathname.startsWith('/browse')) {
    return 'browse';
  }
  if (pathname.startsWith('/buyer/product') || pathname.startsWith('/product')) {
    return 'product_detail';
  }
  if (pathname === '/seller/profile') {
    return 'portal_seller_profile';
  }
  if (pathname.startsWith('/seller')) {
    return 'portal_seller_dashboard';
  }
  if (pathname === '/buyer/profile') {
    return 'portal_buyer_profile';
  }
  if (pathname.startsWith('/buyer')) {
    return 'portal_buyer_dashboard';
  }
  if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
    return 'portal_admin_dashboard';
  }
  return 'other';
}

/**
 * PopupAdManager — shows an entrance popup ad on every page navigation/load.
 * Mounted once in the root layout, but re-fetches and re-displays the popup
 * every time the pathname changes (i.e. on every page visit).
 */
export default function PopupAdManager() {
  const pathname = usePathname();
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // must start muted for browser autoplay to work

  const isSuperAdminRoute = Boolean(pathname?.startsWith('/superadmin'));

  const fetchAndShow = useCallback(async (currentPage: string) => {
    setVisible(false);
    setAd(null);
    try {
      const res = await api.get<Ad[]>(`/shared/advertisements?position=popup&page=${currentPage}`);
      if (res.success && res.data && res.data.length > 0) {
        const randomAd = res.data[Math.floor(Math.random() * res.data.length)];
        setAd(randomAd);
        setVisible(true);
        setIsMuted(true); // reset to muted on each new ad
      }
    } catch {
      // silently ignore — ads are non-critical
    }
  }, []);

  // Re-show popup on every route change (except superadmin routes)
  useEffect(() => {
    if (isSuperAdminRoute) return ;
    const pageKey = getPageKeyFromPathname(pathname);
    fetchAndShow(pageKey);
  }, [pathname, isSuperAdminRoute, fetchAndShow]);

  if (isSuperAdminRoute) return null;

  if (!ad || !visible) return null;

  let baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }
  const mediaUrl = ad.media_path.startsWith('http') 
    ? ad.media_path 
    : `${baseUrl}/uploads/advertisements/${ad.media_path.replace(/^\//, '')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={() => setVisible(false)}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: '1.25rem',
          overflow: 'hidden',
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,0.25)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            lineHeight: 1,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
          aria-label="Close advertisement"
        >
          <i className="bi bi-x-lg" />
        </button>

        {/* Media */}
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f0f0f0' }}>
          {ad.ad_type === 'video' ? (
            <>
              <video
                src={mediaUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                autoPlay
                muted={isMuted}
                loop
                playsInline
              />
              <button
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  zIndex: 10,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                }}
              >
                <i className={`bi bi-volume-${isMuted ? 'mute' : 'up'}-fill`} />
              </button>
            </>
          ) : (
            <img
              src={mediaUrl}
              alt={ad.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>

        {/* Caption */}
        <div style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0c0f0f', margin: '0 0 6px' }}>
            {ad.title}
          </h3>
          {ad.short_description && (
            <div
              className="ad-short-description"
              style={{ fontSize: '0.875rem', color: '#5a5c5c', margin: 0 }}
              dangerouslySetInnerHTML={{ __html: ad.short_description }}
            />
          )}
        </div>
      </div>
    </div>
  );
}