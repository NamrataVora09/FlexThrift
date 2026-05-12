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

  useEffect(() => {
    const fetchAd = async () => {
      const res = await api.get<Ad[]>(`/shared/advertisements?position=${position}&page=${page}`);
      if (res.success && res.data && res.data.length > 0) {
        // Pick a random ad from the results
        const randomAd = res.data[Math.floor(Math.random() * res.data.length)];
        setAd(randomAd);
      }
      setLoading(false);
    };

    fetchAd();
  }, [position, page]);

  if (loading || !ad) return null;

  const mediaUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}/uploads/advertisements/${ad.media_path}`;

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
          style={{ objectFit: 'cover', maxHeight: position === 'top_banner' ? '300px' : 'auto' }}
        />
      ) : (
        <img 
          src={mediaUrl} 
          alt={ad.title} 
          className="img-fluid rounded shadow-sm w-100" 
          style={{ objectFit: 'cover', maxHeight: position === 'top_banner' ? '300px' : 'auto' }}
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
