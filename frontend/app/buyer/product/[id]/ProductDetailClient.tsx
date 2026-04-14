'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { addToCart, isInCart } from '@/lib/cart';
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/wishlist';
import LandingNavbar from '@/components/layout/LandingNavbar';
import toast from 'react-hot-toast';

// ── Rental calendar ──────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function RentalCalendar({
  bookedRanges,
  startDate,
  endDate,
  onRangeChange,
}: {
  bookedRanges: { start: string; end: string }[];
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  const [hover, setHover] = useState<Date | null>(null);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s: string) => { if (!s) return null; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };

  // Strip optional time component so 'YYYY-MM-DD HH:MM:SS' compares correctly
  const dateOnly = (s: string) => s ? s.split(' ')[0] : s;

  const isBooked = (d: Date) => {
    const ds = fmt(d);
    return bookedRanges.some(r => ds >= dateOnly(r.start) && ds <= dateOnly(r.end));
  };

  const startD = parse(startDate);
  const endD = parse(endDate);

  const inRange = (d: Date) => {
    if (!startD) return false;
    const eff = endD || hover;
    if (!eff) return false;
    const lo = startD <= eff ? startD : eff;
    const hi = startD <= eff ? eff : startD;
    return d > lo && d < hi;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let i = 1; i <= total; i++) cells.push(new Date(year, month, i));

  const daysBetween = (a: Date, b: Date) => {
    const lo = a <= b ? a : b;
    const hi = a <= b ? b : a;
    return Math.round((hi.getTime() - lo.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDay = (d: Date) => {
    if (d < today) return;
    if (phase === 'start' || (startD && endD)) {
      onRangeChange(fmt(d), '');
      setPhase('end');
    } else {
      const s = startD!;
      if (daysBetween(s, d) < 3) { toast.error('Minimum rental period is 3 days.'); return; }
      if (d < s) { onRangeChange(fmt(d), fmt(s)); }
      else { onRangeChange(fmt(s), fmt(d)); }
      setPhase('start');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '14px', padding: '16px', userSelect: 'none', fontSize: '0.82rem' }}>
      {/* nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', padding: '2px 10px', fontWeight: 700 }}>‹</button>
        <span style={{ fontWeight: 700 }}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', padding: '2px 10px', fontWeight: 700 }}>›</button>
      </div>
      {/* day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
        {DAY_NAMES.map(n => <div key={n} style={{ textAlign: 'center', fontWeight: 700, color: '#999', padding: '2px' }}>{n}</div>)}
      </div>
      {/* day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const booked = isBooked(d);
          const disabled = past;
          const isS = startD && fmt(d) === fmt(startD);
          const isE = endD && fmt(d) === fmt(endD);
          const rang = inRange(d);
          const isT = fmt(d) === fmt(today);

          let bg = 'transparent', color = '#000', br = '6px';
          if (isS || isE) { bg = '#ffc63a'; color = '#000'; br = '8px'; }
          else if (rang) { bg = '#fff3cc'; color = '#555'; br = '0'; }
          if (past) { color = '#ccc'; }

          return (
            <div key={i}
              onClick={() => handleDay(d)}
              onMouseEnter={() => { if (!disabled) setHover(d); }}
              onMouseLeave={() => setHover(null)}
              style={{
                textAlign: 'center', padding: '6px 2px', borderRadius: br,
                background: bg, color,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: (isS || isE || isT) ? 700 : 400,
                border: isT && !isS && !isE ? '1.5px solid #ffc63a' : '1.5px solid transparent',
                opacity: past ? 0.35 : 1,
                transition: 'background .1s',
              }}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      {/* legend */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', color: '#777', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ffc63a', borderRadius: 3, marginRight: 4 }} />Selected</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff3cc', borderRadius: 3, marginRight: 4 }} />Range</span>
      </div>
      {/* selected display */}
      {startDate && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffdf0', borderRadius: 8, border: '1px solid #ffc63a44' }}>
          {endDate
            ? <><i className="bi bi-calendar-range me-1" style={{ color: '#ffc63a' }} /><strong>{startDate}</strong> → <strong>{endDate}</strong></>
            : <><i className="bi bi-calendar me-1" style={{ color: '#ffc63a' }} /><strong>{startDate}</strong> — pick an end date (min 3 days)</>
          }
        </div>
      )}
      {!startDate && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, color: '#888', fontSize: '0.78rem' }}>
          <i className="bi bi-info-circle me-1" />Click a start date — minimum rental period is 3 days
        </div>
      )}
    </div>
  );
}

interface Product {
  id: number;
  product_number?: string;
  title: string;
  description: string;
  listing_type: string;
  original_price: string;
  selling_price: string;
  price?: string;
  rental_cost: string;
  rental_deposit: string;
  brand: string;
  brand_name?: string;
  size?: string;
  color?: string;
  used_times?: string;
  times_used?: string;
  condition_description: string;
  category?: string;
  category_id?: string;
  gender?: string;
  gender_ids?: string;
  specifications?: string;
  has_bill?: number;
  views_count?: number;
  seller_name: string;
  seller_email: string;
  seller_mobile: string;
  seller_rating_avg: string;
  seller_rating_count: string;
  status: string;
  seller_id?: number;
  usage_label?: string;
}

interface ProductImage {
  id: number;
  image_path: string;
}

interface SimilarProduct {
  id: number;
  title: string;
  listing_type: string;
  original_price: string;
  selling_price: string;
  price?: string;
  rental_cost: string;
  brand_name?: string;
  seller_name: string;
  seller_rating_avg: string;
  image?: string;
  category?: string;
  brand?: string;
}

interface Props {
  product: Product;
  images: ProductImage[];
  similarProducts?: SimilarProduct[];
}

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

export default function ProductDetailClient({ product, images, similarProducts = [] }: Props) {
  const router = useRouter();
  const [imgIdx, setImgIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [autoPlay, setAutoPlay] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    offer_price:
      product.listing_type === 'sell'
        ? product.selling_price || product.price || product.original_price
        : product.rental_cost || '',
    deposit_amount: product.rental_deposit || '',
    rental_start_date: '',
    rental_end_date: '',
    delivery_address: '',
    delivery_pin_code: '',
  });
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [bookedRanges, setBookedRanges] = useState<{ start: string; end: string }[]>([]);
  const [user, setUser] = useState<{ name?: string; user_type?: string } | null>(null);
  const [inCart, setInCart] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ seller_name: string; seller_email: string; seller_mobile: string; seller_address: string; already_viewed: boolean } | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const datesSelected = product.listing_type !== 'rent' || (!!offerForm.rental_start_date && !!offerForm.rental_end_date);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flex_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
      }
      setInCart(isInCart(Number(product.id)));
    }
  }, [product.id]);

  // Check if buyer already has an active offer on this product (persists across refreshes)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('flex_token') : null;
    if (!token) return;
    api.get<{ has_offer: boolean }>(`/buyer/offer-status/${product.id}`)
      .then(res => {
        if (res.success && res.data?.has_offer) {
          setOfferSuccess(true);
          // Also fetch seller contact so "View Seller Contact" button is visible after refresh
          setContactLoading(true);
          api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_address: string; already_viewed: boolean }>(
            `/buyer/view-seller-contact/${product.id}`
          ).then(contactRes => {
            setContactLoading(false);
            if (contactRes.success && contactRes.data) setContactInfo(contactRes.data);
          }).catch(() => setContactLoading(false));
        }
      })
      .catch(() => { });
  }, [product.id]);

  // Recalculate rental price when dates change
  useEffect(() => {
    if (product.listing_type === 'rent' && offerForm.rental_start_date && offerForm.rental_end_date) {
      const s = new Date(offerForm.rental_start_date);
      const e = new Date(offerForm.rental_end_date);
      const diff = e.getTime() - s.getTime();
      const nights = Math.round(diff / 86400000);
      if (nights > 0) {
        const dailyRate = parseFloat(product.rental_cost || '0');
        const total = dailyRate * nights;
        setOfferForm(f => ({ ...f, offer_price: total.toString() }));
      }
    }
  }, [offerForm.rental_start_date, offerForm.rental_end_date, product.rental_cost, product.listing_type]);

  // Fetch booked date ranges for rental products
  useEffect(() => {
    if (product.listing_type === 'rent') {
      api.get<{ booked_ranges: { start: string; end: string }[] }>(`/product/${product.id}/booked-dates`)
        .then(res => { if (res.success && res.data) setBookedRanges(res.data.booked_ranges); })
        .catch(() => { });
    }
  }, [product.id, product.listing_type]);

  // Auto-slideshow: cycle images every 3 seconds, pause on hover
  useEffect(() => {
    if (!autoPlay || images.length <= 1 || isHovering) return;
    const timer = setInterval(() => {
      setImgIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [autoPlay, images.length, isHovering]);

  // Hover zoom handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const handleAddToCart = () => {
    const p = product;
    const price = p.listing_type === 'sell' ? (p.selling_price || p.price || p.original_price || '0') : (p.rental_cost || p.price || '0');
    const img = images?.[0]?.image_path || '';
    addToCart({ id: p.id, title: p.title, listing_type: p.listing_type, price, image: img, seller_name: p.seller_name });
    setInCart(true);
  };

  const handleOffer = async () => {
    if (!user || !localStorage.getItem('flex_token')) {
      sessionStorage.setItem('redirect_after_login', `/buyer/product/${product.id}`);
      router.push('/login');
      return;
    }
    if (product.listing_type === 'rent' && (!offerForm.rental_start_date || !offerForm.rental_end_date)) {
      setOfferError('Please select your rental dates on the calendar first.');
      return;
    }
    setOfferLoading(true);
    setOfferError(null);
    const res = await api.post('/buyer/make-offer', {
      product_id: product.id,
      offer_type: product.listing_type,
      offer_price: offerForm.offer_price,
      deposit_amount: product.listing_type === 'rent' ? offerForm.deposit_amount : undefined,
      rental_start_date: product.listing_type === 'rent' ? offerForm.rental_start_date : undefined,
      rental_end_date: product.listing_type === 'rent' ? offerForm.rental_end_date : undefined,
      delivery_address: offerForm.delivery_address,
      delivery_pin_code: offerForm.delivery_pin_code,
    });
    setOfferLoading(false);
    if (res?.success) {
      setOfferSuccess(true);
      setShowOffer(false);
      // Auto-fetch seller contact after successful offer
      setContactLoading(true);
      setContactError(null);
      const contactRes = await api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_address: string; already_viewed: boolean }>(
        `/buyer/view-seller-contact/${product.id}`
      );
      setContactLoading(false);
      if (contactRes.success && contactRes.data) {
        setContactInfo(contactRes.data);
        setShowContactModal(true);
        // Notify contacts page (if open) to refresh its list
        window.dispatchEvent(new CustomEvent('flex:contact-created'));
      } else {
        setContactError(contactRes.message || 'Offer sent! Contact could not be retrieved.');
      }
    } else {
      setOfferError(res?.message || 'Failed to submit offer');
    }
  };

  const handleViewContact = async () => {
    if (!user || !localStorage.getItem('flex_token')) {
      sessionStorage.setItem('redirect_after_login', `/buyer/product/${product.id}`);
      router.push('/login');
      return;
    }
    setContactLoading(true);
    setContactError(null);
    const res = await api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_address: string; already_viewed: boolean }>(
      `/buyer/view-seller-contact/${product.id}`
    );
    setContactLoading(false);
    if (res.success && res.data) {
      setContactInfo(res.data);
    } else {
      setContactError(res.message || 'Failed to reveal contact');
    }
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    if (path.startsWith('uploads/')) return `${BASE_URL}/${path}`;
    return `${BASE_URL}/uploads/products/${path}`;
  };

  const usedTimes = product.used_times || product.times_used || '0';
  const brandName = product.brand_name || product.brand || 'Premium Listing';
  const price =
    product.listing_type === 'sell'
      ? product.selling_price || product.price || product.original_price
      : product.rental_cost;
  const priceLabel = product.listing_type === 'sell' ? 'SALE PRICE' : 'RENT PER DAY';

  let genders: string[] = [];
  if (product.gender_ids) {
    try {
      const parsed = JSON.parse(product.gender_ids);
      if (Array.isArray(parsed)) genders = parsed;
    } catch { /* ignore */ }
  }
  if (genders.length === 0 && product.gender) {
    genders = [product.gender];
  }

  let specs: Record<string, string> = {};
  if (product.specifications) {
    try {
      const parsed = JSON.parse(product.specifications);
      if (parsed && typeof parsed === 'object') specs = parsed;
    } catch { /* ignore */ }
  }

  const formatPrice = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getGenderBadgeClass = (g: string) => {
    const gLow = g.toLowerCase();
    if (gLow.includes('women') || gLow.includes('female')) return 'bg-danger';
    if (gLow.includes('men') || gLow.includes('male')) return 'bg-primary';
    return 'bg-secondary';
  };

  const ratingCount = parseInt(product.seller_rating_count || '0', 10);

  const toSlug = (title: string, id: number) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${slug}-${id}`;
  };

  const getSimilarPrice = (p: SimilarProduct) => {
    if (p.listing_type === 'sell') return p.selling_price || p.price || p.original_price;
    return p.rental_cost;
  };

  const styles = {
    body: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: '#f8f9fa',
      color: '#000',
      minHeight: '100vh',
    } as React.CSSProperties,
    galleryContainer: {
      background: 'white',
      borderRadius: '20px',
      padding: '20px',
      border: '1px solid #eee',
      position: 'sticky' as const,
      top: '100px',
    } as React.CSSProperties,
    mainImgContainer: {
      background: '#f8f9fa',
      borderRadius: '16px',
      overflow: 'hidden',
      aspectRatio: '4/5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #eee',
      position: 'relative' as const,
      marginBottom: '1rem',
    } as React.CSSProperties,
    mainImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transition: 'transform 0.5s',
    } as React.CSSProperties,
    thumbnailBtn: (active: boolean) =>
      ({
        width: '75px',
        height: '75px',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: active ? '2px solid #ffc63a' : '2px solid transparent',
        transition: 'all 0.2s',
        opacity: active ? 1 : 0.6,
        transform: active ? 'scale(1.05)' : 'scale(1)',
        flexShrink: 0,
      }) as React.CSSProperties,
    priceBadge: {
      background: '#000',
      color: 'white',
      padding: '30px',
      borderRadius: '20px',
      marginBottom: '30px',
      border: '1px solid #333',
    } as React.CSSProperties,
    specPill: {
      background: 'white',
      padding: '12px 20px',
      borderRadius: '12px',
      border: '1px solid #eee',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    } as React.CSSProperties,
    btnPrimaryLux: {
      background: '#ffc63a',
      color: '#000',
      border: 'none',
      padding: '18px',
      borderRadius: '14px',
      fontWeight: 700,
      fontSize: '1rem',
      fontFamily: '"Maven Pro", sans-serif',
      transition: '0.3s',
      width: '100%',
      cursor: 'pointer',
    } as React.CSSProperties,
    badgeLux: {
      background: '#000',
      color: '#ffc63a',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      fontSize: '0.7rem',
      padding: '8px 15px',
      borderRadius: '50px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: 800,
    } as React.CSSProperties,
    badgeVerified: {
      background: 'rgba(255, 193, 7, 0.1)',
      color: '#000',
      border: '1px solid rgba(255, 193, 7, 0.25)',
      padding: '8px 15px',
      borderRadius: '50px',
      fontSize: '0.75rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,
    sellerBlock: {
      background: 'white',
      border: '1px solid #eee',
      borderRadius: '20px',
      padding: '30px',
      marginTop: '40px',
    } as React.CSSProperties,
    textPurple: {
      color: '#ffc63a',
    } as React.CSSProperties,
    headingFont: {
      fontFamily: '"Maven Pro", sans-serif',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.body}>
      {/* Landing Navbar */}
      <LandingNavbar />
      <div style={{ height: 70 }} />

      {/* Main Content */}
      <div className="container py-5">
        <div className="row g-5">
          {/* Left Column - Sticky Gallery */}
          <div className="col-lg-6">
            <div style={styles.galleryContainer}>
              <div
                style={{ ...styles.mainImgContainer, overflow: 'hidden', cursor: isHovering ? 'crosshair' : 'default' }}
                onMouseEnter={() => { setIsHovering(true); setAutoPlay(false); }}
                onMouseLeave={() => { setIsHovering(false); setAutoPlay(true); }}
                onMouseMove={handleMouseMove}
              >
                {images.length > 0 ? (
                  <img
                    src={getImageUrl(images[imgIdx]?.image_path)}
                    alt={product.title}
                    style={{
                      ...styles.mainImage,
                      transform: isHovering ? 'scale(2)' : 'scale(1)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transition: isHovering ? 'transform-origin 0.1s ease' : 'transform 0.4s ease',
                    }}
                  />
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-image" style={{ fontSize: 64, color: '#ccc' }}></i>
                    <p className="mt-2 text-muted">No images available</p>
                  </div>
                )}
                {/* Image counter */}
                {images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                    {imgIdx + 1} / {images.length}
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  {images.map((img, i) => (
                    <div
                      key={img.id}
                      style={styles.thumbnailBtn(i === imgIdx)}
                      onClick={() => { setImgIdx(i); setAutoPlay(false); setTimeout(() => setAutoPlay(true), 5000); }}
                      onMouseEnter={() => { setImgIdx(i); setAutoPlay(false); }}
                      onMouseLeave={() => setAutoPlay(true)}
                    >
                      <img
                        src={getImageUrl(img.image_path)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="col-lg-6">
            <div style={{ padding: 0 }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-muted fw-semibold">
                  ID: #{product.product_number || product.id}
                </span>
                <span
                  className="badge bg-light text-dark py-2 px-3 rounded-pill border"
                  style={{ fontSize: '0.8rem' }}
                >
                  <i className="bi bi-eye text-primary me-1"></i>{' '}
                  {product.views_count ?? 0} views
                </span>
              </div>

              <div className="d-flex align-items-center gap-3 mb-3">
                <h1 className="display-5 fw-bold mb-0" style={styles.headingFont}>
                  {product.title}
                </h1>
              </div>

              <div className="d-flex gap-2 mb-4 flex-wrap align-items-center">
                <span style={styles.badgeLux}>
                  <i className="bi bi-award-fill me-1"></i>
                  {brandName}
                </span>
                <span style={styles.badgeVerified}>
                  <i className="bi bi-check-circle-fill text-success me-1"></i> Verified Authentic
                </span>
                <span style={{
                  background: product.listing_type === 'rent' ? '#dbeafe' : '#dcfce7',
                  color: product.listing_type === 'rent' ? '#1d4ed8' : '#15803d',
                  border: `1px solid ${product.listing_type === 'rent' ? '#93c5fd' : '#86efac'}`,
                  padding: '6px 14px',
                  borderRadius: '50px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.5px',
                }}>
                  <i className={`bi ${product.listing_type === 'rent' ? 'bi-calendar-week' : 'bi-bag-check'} me-1`}></i>
                  {product.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
              </div>

              <div style={styles.priceBadge}>
                <div className="row align-items-center">
                  <div className="col-8">
                    <small style={{ opacity: 0.65, display: 'block', marginBottom: '4px', fontSize: '0.7rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {priceLabel}
                    </small>
                    <h2
                      className="display-4 fw-bold mb-0"
                      style={{ fontFamily: '"Maven Pro", sans-serif' }}
                    >
                      &#8377;{formatPrice(price)}
                      {product.listing_type === 'rent' && <span style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.7 }}>/day</span>}
                    </h2>
                    {product.listing_type === 'sell' && product.original_price && parseFloat(product.original_price) > parseFloat(product.selling_price || '0') && (
                      <div className="mt-1">
                        <span style={{ textDecoration: 'line-through', opacity: 0.55, fontSize: '0.9rem' }}>
                          &#8377;{formatPrice(product.original_price)}
                        </span>
                        <span className="ms-2 badge" style={{ background: '#ffc63a', color: '#000', fontSize: '0.7rem' }}>
                          {Math.round((1 - parseFloat(product.selling_price || '0') / parseFloat(product.original_price)) * 100)}% OFF
                        </span>
                      </div>
                    )}
                    {product.listing_type === 'rent' && product.rental_deposit && (
                      <div className="mt-1" style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                        + &#8377;{formatPrice(product.rental_deposit)} deposit
                      </div>
                    )}
                  </div>
                  <div className="col-4 text-end">
                    <span style={{ background: 'rgba(255,255,255,0.12)', display: 'inline-block', padding: '14px', borderRadius: '16px' }}>
                      <i className={`bi ${product.listing_type === 'rent' ? 'bi-calendar-week-fill' : 'bi-tag-fill'}`} style={{ fontSize: '2rem' }}></i>
                    </span>
                  </div>
                </div>
              </div>

              {/* Spec pills */}
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div style={styles.specPill}>
                    <i className="bi bi-rulers fs-4" style={styles.textPurple}></i>
                    <div>
                      <small className="text-muted d-block" style={{ lineHeight: 1 }}>SIZE</small>
                      <strong>{product.size || 'Standard'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div style={styles.specPill}>
                    <i className="bi bi-palette fs-4" style={styles.textPurple}></i>
                    <div>
                      <small className="text-muted d-block" style={{ lineHeight: 1 }}>COLOR</small>
                      <strong>{product.color || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div style={styles.specPill}>
                    <i className="bi bi-lightning-charge fs-4" style={styles.textPurple}></i>
                    <div>
                      <small className="text-muted d-block" style={{ lineHeight: 1 }}>CONDITION</small>
                      <strong>
                        {usedTimes === '0' || usedTimes === '' ? 'Brand New' : (product.usage_label ? `${usedTimes} ${product.usage_label}` : `Used ${usedTimes}×`)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div style={styles.specPill}>
                    <i className="bi bi-truck fs-4" style={styles.textPurple}></i>
                    <div>
                      <small className="text-muted d-block" style={{ lineHeight: 1 }}>DELIVERY</small>
                      <strong>Professional</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Rental availability calendar (rent products only) ── */}
              {/* ── CTA block ── */}
              <div className="mb-5">
                {offerSuccess ? (
                  <div>
                    <div className="rounded-4 p-4 d-flex align-items-center gap-3 mb-3" style={{ background: '#f0fff4', border: '1.5px solid #86efac' }}>
                      <i className="bi bi-check-circle-fill fs-2 text-success flex-shrink-0"></i>
                      <div>
                        <div className="fw-bold fs-6 mb-1">Offer Submitted!</div>
                        <div className="text-muted small">The seller will review your offer and get back to you shortly.</div>
                        <a href="/buyer/my-offers" className="btn btn-sm btn-outline-success rounded-3 mt-2">View My Offers</a>
                      </div>
                    </div>

                    {/* Seller contact — shown as popup after offer */}
                    {contactLoading && (
                      <div className="text-center py-2 text-muted small">
                        <span className="spinner-border spinner-border-sm me-2"></span>Fetching seller contact…
                      </div>
                    )}
                    {contactInfo && (
                      <button
                        className="btn w-100 rounded-3 fw-semibold"
                        style={{ background: '#fffdf0', border: '1.5px solid #ffc63a', color: '#000', padding: '10px' }}
                        onClick={() => setShowContactModal(true)}
                      >
                        <i className="bi bi-person-check-fill me-2" style={{ color: '#ffc63a' }}></i>
                        View Seller Contact
                      </button>
                    )}
                    {contactError && (
                      <div className="rounded-4 p-3 d-flex align-items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <i className="bi bi-exclamation-triangle-fill text-warning mt-1 flex-shrink-0"></i>
                        <div className="text-muted small">{contactError}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Primary CTA */}
                    <button
                      style={{ ...styles.btnPrimaryLux }}
                      onClick={() => { setShowOffer(true); setOfferError(null); }}
                    >
                      {product.listing_type === 'rent'
                        ? <><i className="bi bi-calendar-check-fill me-2"></i>Make an Offer</>
                        : <><i className="bi bi-tags-fill me-2"></i>Make an Offer</>
                      }
                    </button>
                    <p className="text-center text-muted mt-2 mb-3" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-shield-check me-1 text-success"></i>
                      Active subscription required · Secure platform offer
                    </p>

                    {/* Wishlist */}
                    <div className="d-flex justify-content-end">
                      <button
                        className="btn rounded-3 fw-semibold"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.88rem',
                          background: inCart ? '#000' : '#f8f9fa',
                          color: inCart ? '#ffc63a' : '#000',
                          border: '1px solid #dee2e6',
                        }}
                        onClick={handleAddToCart}
                        disabled={inCart}
                      >
                        <i className={`bi ${inCart ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
                        {inCart ? 'Saved' : 'Wishlist'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="mb-5">
                <h5 className="fw-bold border-bottom pb-2 mb-3" style={styles.headingFont}>
                  Specifications &amp; About
                </h5>
                <p className="text-muted fs-5" style={{ lineHeight: '1.6' }}>
                  {product.description
                    ? product.description.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < product.description.split('\n').length - 1 && <br />}
                      </span>
                    ))
                    : 'No description available.'}
                </p>
                <div className="mt-4">
                  {product.category && (
                    <div className="py-2 border-bottom">
                      <strong>Category:</strong> {product.category}
                    </div>
                  )}
                  {genders.length > 0 && (
                    <div className="py-2 border-bottom">
                      <strong>Gender:</strong>{' '}
                      {genders.map((g, i) => (
                        <span key={i} className={`badge ${getGenderBadgeClass(g)} ms-1`}>{g}</span>
                      ))}
                    </div>
                  )}
                  {Object.entries(specs).map(
                    ([key, val]) =>
                      val && (
                        <div key={key} className="py-2 border-bottom">
                          <strong>{key}:</strong> {val}
                        </div>
                      )
                  )}
                  {product.has_bill ? (
                    <div className="py-2 text-success fw-bold">
                      <i className="bi bi-receipt me-1"></i> Original Bill Included
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={styles.sellerBlock} className="shadow-sm">
                <div className="d-flex align-items-center">
                  <div className="me-4">
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #eee',
                      }}
                    >
                      <i
                        className="bi bi-patch-check-fill"
                        style={{ fontSize: '1.5rem', color: '#ffc63a' }}
                      ></i>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold" style={styles.headingFont}>
                      Verified Luxury Seller
                    </h4>
                    <div className="d-flex align-items-center gap-4 mt-2">
                      <div className="text-center">
                        <div className="h4 fw-bold text-dark mb-0">{ratingCount}</div>
                        <div
                          className="small text-muted fw-bold"
                          style={{ fontSize: '10px', textTransform: 'uppercase' }}
                        >
                          Points
                        </div>
                      </div>
                      <div className="text-warning">
                        <div className="d-flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <i
                              key={i}
                              className={`bi bi-star-fill ${i <= Math.min(ratingCount, 5) ? '' : 'opacity-25'}`}
                            ></i>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products Section */}
      {similarProducts.length > 0 && (
        <div style={{ background: '#fff', borderTop: '1px solid #eee', padding: '60px 0' }}>
          <div className="container">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h3 className="fw-bold mb-1" style={styles.headingFont}>You May Also Like</h3>
                <p className="text-muted mb-0">Similar products based on your current selection</p>
              </div>
              <Link
                href="/buyer/browse"
                className="btn btn-outline-dark rounded-pill px-4 fw-semibold"
                style={{ fontSize: '0.85rem' }}
              >
                View All <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="row g-4">
              {similarProducts.slice(0, 4).map((sp) => {
                const spPrice = getSimilarPrice(sp);
                const spImage = sp.image
                  ? (sp.image.startsWith('http') ? sp.image : `${BASE_URL}/${sp.image}`)
                  : '';
                return (
                  <div key={sp.id} className="col-6 col-md-3">
                    <Link
                      href={`/buyer/product/${toSlug(sp.title, sp.id)}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: '16px',
                          border: '1px solid #eee',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-6px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ aspectRatio: '4/5', background: '#f8f9fa', overflow: 'hidden' }}>
                          {spImage ? (
                            <img
                              src={spImage}
                              alt={sp.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center h-100">
                              <i className="bi bi-image" style={{ fontSize: 40, color: '#ccc' }}></i>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '16px' }}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span
                              style={{
                                background: sp.listing_type === 'sell' ? '#000' : '#ffc63a',
                                color: sp.listing_type === 'sell' ? '#ffc63a' : '#000',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '50px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {sp.listing_type === 'sell' ? 'Buy' : 'Rent'}
                            </span>
                            {(sp.brand_name || sp.brand) && (
                              <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>
                                {sp.brand_name || sp.brand}
                              </span>
                            )}
                          </div>
                          <h6
                            className="fw-bold mb-2"
                            style={{
                              fontSize: '0.9rem',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              ...styles.headingFont,
                            }}
                          >
                            {sp.title}
                          </h6>
                          <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
                            &#8377;{formatPrice(spPrice)}
                            {sp.listing_type === 'rent' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#888' }}>/day</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Seller Contact Modal */}
      {showContactModal && contactInfo && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
          onClick={() => setShowContactModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-0 px-4 pt-4 pb-2">
                <div>
                  <h5 className="modal-title fw-bold mb-0" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-person-check-fill me-2" style={{ color: '#ffc63a' }}></i>
                    Seller Contact
                  </h5>
                  {contactInfo.already_viewed && (
                    <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>Already viewed</span>
                  )}
                </div>
                <button type="button" className="btn-close" onClick={() => setShowContactModal(false)}></button>
              </div>
              <div className="modal-body px-4 pb-4 pt-2">
                <div className="d-flex flex-column gap-3 mt-2">
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffc63a22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bi bi-person-fill" style={{ color: '#ffc63a', fontSize: '1.2rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</div>
                      <div className="fw-bold">{contactInfo.seller_name}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffc63a22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bi bi-envelope-fill" style={{ color: '#ffc63a', fontSize: '1.1rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
                      <a href={`mailto:${contactInfo.seller_email}`} className="fw-bold text-dark text-decoration-none">{contactInfo.seller_email}</a>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffc63a22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="bi bi-telephone-fill" style={{ color: '#ffc63a', fontSize: '1.1rem' }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</div>
                      <a href={`tel:${contactInfo.seller_mobile}`} className="fw-bold text-dark text-decoration-none">{contactInfo.seller_mobile}</a>
                    </div>
                  </div>
                  {contactInfo.seller_address && (
                    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffc63a22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-geo-alt-fill" style={{ color: '#ffc63a', fontSize: '1.1rem' }}></i>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</div>
                        <div className="fw-bold">{contactInfo.seller_address}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {showOffer && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          onClick={() => { setShowOffer(false); setOfferError(null); }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold" style={styles.headingFont}>
                  <i className="bi bi-tags-fill me-2" style={{ color: '#ffc63a' }}></i>
                  Make an Offer on &ldquo;{product.title}&rdquo;
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowOffer(false)}></button>
              </div>
              <div className="modal-body p-4">
                {product.listing_type === 'rent' && (
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold small">
                        <i className="bi bi-calendar3 me-1" style={{ color: '#ffc63a' }}></i>
                        Select Rental Dates
                      </span>
                    </div>
                    <RentalCalendar
                      bookedRanges={bookedRanges}
                      startDate={offerForm.rental_start_date}
                      endDate={offerForm.rental_end_date}
                      onRangeChange={(start, end) => setOfferForm(f => ({ ...f, rental_start_date: start, rental_end_date: end }))}
                    />
                    <div className="mt-3 mb-3">
                      <label className="form-label fw-bold small">Deposit Amount (&#8377;)</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        value={offerForm.deposit_amount}
                        onChange={(e) => setOfferForm({ ...offerForm, deposit_amount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label fw-bold small">Your Offer Price (&#8377;)</label>
                  <input
                    type="number"
                    className="form-control rounded-3"
                    value={offerForm.offer_price}
                    onChange={(e) => setOfferForm({ ...offerForm, offer_price: e.target.value })}
                    placeholder="Enter your offer amount"
                  />
                  {product.listing_type === 'rent' && offerForm.rental_start_date && offerForm.rental_end_date && (
                    <div className="mt-1 small text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Calculated: ₹{product.rental_cost} × {Math.round((new Date(offerForm.rental_end_date).getTime() - new Date(offerForm.rental_start_date).getTime()) / 86400000)} nights = ₹{offerForm.offer_price}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small">Delivery Address</label>
                  <textarea
                    className="form-control rounded-3"
                    rows={2}
                    value={offerForm.delivery_address}
                    onChange={(e) => setOfferForm({ ...offerForm, delivery_address: e.target.value })}
                    placeholder="Enter delivery address"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small">PIN Code</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={offerForm.delivery_pin_code}
                    onChange={(e) => setOfferForm({ ...offerForm, delivery_pin_code: e.target.value })}
                    placeholder="Enter PIN code"
                  />
                </div>
              </div>
              {offerError && (
                <div className="mx-4 mb-0">
                  <div className={`alert border-0 rounded-3 py-2 px-3 small mb-0 ${offerError.toLowerCase().includes('subscription') ? 'alert-warning' : 'alert-danger'}`}>
                    <i className={`bi ${offerError.toLowerCase().includes('subscription') ? 'bi-star-fill text-warning' : 'bi-exclamation-circle-fill'} me-2`}></i>
                    {offerError}
                    {offerError.toLowerCase().includes('subscription') && (
                      <a href="/buyer/subscriptions" className="btn btn-sm btn-warning ms-2 fw-bold rounded-3" style={{ fontSize: '0.75rem' }}>
                        Subscribe Now
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="modal-footer border-0 p-4 pt-3">
                <button className="btn btn-light rounded-3" onClick={() => { setShowOffer(false); setOfferError(null); }}>Cancel</button>
                <button
                  style={{ ...styles.btnPrimaryLux, width: 'auto', padding: '12px 30px' }}
                  onClick={handleOffer}
                  disabled={offerLoading || !offerForm.offer_price}
                >
                  {offerLoading ? 'Submitting...' : 'Submit Offer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
