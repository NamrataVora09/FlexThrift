'use client';

import { useEffect, useState } from 'react';
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

  const mediaUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}/uploads/advertisements/${ad.media_path}`;

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

          <div className="aspect-video bg-gray-100">
            {ad.ad_type === 'video' ? (
              <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
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

  return (
    <div className={`ad-banner-container ${className}`} title={ad.title}>
      {ad.ad_type === 'video' ? (
        <video
          src={mediaUrl}
          className="img-fluid rounded shadow-sm w-100"
          autoPlay
          muted
          loop
          playsInline
          style={{ objectFit: 'cover', maxHeight: position === 'top_banner' || position === 'footer' ? '300px' : 'auto' }}
        />
      ) : (
        <img
          src={mediaUrl}
          alt={ad.title}
          className="img-fluid rounded shadow-sm w-100"
          style={{ objectFit: 'cover', maxHeight: position === 'top_banner' || position === 'footer' ? '300px' : 'auto' }}
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
