'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import { api } from '@/lib/api';

interface Ad {
  id: number;
  title: string;
  short_description: string;
  media_path: string;
  media_type: string;
  ad_type: 'image' | 'video';
}

interface AdBannerProps {
  position: 'top_banner' | 'sidebar' | 'footer' | 'popup' | 'rows';
  page: string;
  className?: string;
}

/** Reusable video player with ONLY a mute/unmute button. Default: muted (required for autoplay). */
export function VideoAdPlayer({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [muted, setMuted] = useState(true); // must start muted for browser autoplay to work

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <video
        src={src}
        className={className}
        style={style}
        autoPlay
        muted={muted}
        loop
        playsInline
      />
      {/* Mute / Unmute toggle — only control shown */}
      <button
        onClick={() => setMuted((prev) => !prev)}
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
      >
        <i className={muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill'} />
      </button>
    </div>
  );
}

export default function AdBanner({ position, page, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      const res = await api.get<Ad[]>(`/shared/advertisements?position=${position}&page=${page}`);
      if (res.success && res.data && res.data.length > 0) {
        const randomAd = res.data[Math.floor(Math.random() * res.data.length)];
        setAd(randomAd);

        if (position === 'popup') {
          const hasSeen = sessionStorage.getItem(`seen_ad_${randomAd.id}`);
          if (!hasSeen) {
            setShowPopup(true);
            sessionStorage.setItem(`seen_ad_${randomAd.id}`, 'true');
          }
        }
      }
      setLoading(false);
    };

    fetchAd();
  }, [position, page]);

  if (loading || !ad) return null;

  let baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }
  const mediaUrl = ad.media_path.startsWith('http') 
    ? ad.media_path 
    : `${baseUrl}/uploads/advertisements/${ad.media_path.replace(/^\//, '')}`;

  if (position === 'popup') {
    if (!showPopup) return null;
    return (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setShowPopup(false)}
      >
        <div
          className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            onClick={() => setShowPopup(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>

          <div className="aspect-video bg-gray-100" style={{ position: 'relative' }}>
            {ad.ad_type === 'video' ? (
              <VideoAdPlayer
                src={mediaUrl}
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img src={mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
            )}
          </div>

          <div className="p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{ad.title}</h3>
            {ad.short_description && <p className="text-gray-600 text-sm mb-0">{ad.short_description}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (position === 'rows') {
    return (
      <div style={{ gridColumn: '1 / -1', width: '100%', margin: '20px 0' }}>
        <div className={`ad-banner-container ${className}`} title={ad.title}>
          {ad.ad_type === 'video' ? (
            <VideoAdPlayer
              src={mediaUrl}
              className="img-fluid rounded shadow-sm w-100"
              style={{ objectFit: 'cover', maxHeight: '600px' }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={ad.title}
              className="img-fluid rounded shadow-sm w-100"
              style={{ objectFit: 'cover', maxHeight: '600px' }}
            />
          )}
          {ad.short_description && (
            <div className="ad-caption mt-1 small text-muted text-center">
              {ad.short_description}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-banner-container ${className}`} title={ad.title}>
      {ad.ad_type === 'video' ? (
        <VideoAdPlayer
          src={mediaUrl}
          className="img-fluid rounded shadow-sm w-100"
          style={{
            objectFit: 'cover',
            maxHeight: position === 'top_banner' || position === 'footer' ? '500px' : position === 'sidebar' ? '300px' : 'auto',
          }}
        />
      ) : (
        <img
          src={mediaUrl}
          alt={ad.title}
          className="img-fluid rounded shadow-sm w-100"
          style={{
            objectFit: 'cover',
            maxHeight: position === 'top_banner' || position === 'footer' ? '500px' : position === 'sidebar' ? '300px' : 'auto',
          }}
        />
      )}
      {ad.short_description && (
        <div className="ad-caption mt-1 small text-muted text-center">
          {ad.short_description}
        </div>
      )}
    </div>
  );
}