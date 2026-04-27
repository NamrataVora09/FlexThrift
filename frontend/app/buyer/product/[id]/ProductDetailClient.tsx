'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { addToCart, isInCart } from '@/lib/cart';
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/wishlist';
import LandingNavbar from '@/components/layout/LandingNavbar';
import Footer from '@/components/layout/Footer';
import { RentalCalendar } from '@/components/shared/RentalCalendar';
import toast from 'react-hot-toast';

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
  allow_alter_fitting?: number;
  bill_image?: string;
  listing_type_name?: string;
  orignal_brand?: string;
  seller_brand?: string;
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
  orignal_brand?: string;
  seller_brand?: string;
}

interface Props {
  product: Product;
  images: ProductImage[];
  similarProducts?: SimilarProduct[];
  minRentalDays?: number;
}

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

export default function ProductDetailClient({ product, images, similarProducts = [], minRentalDays = 3 }: Props) {
  const router = useRouter();
  const [activeProductTab, setActiveProductTab] = useState<'description' | 'specifications'>('description');
  const [imgIdx, setImgIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [autoPlay, setAutoPlay] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [offerForm, setOfferForm] = useState({
    offer_price:
      product.listing_type === 'sell'
        ? product.selling_price || product.price || product.original_price
        : product.rental_cost || '',
    deposit_amount: product.rental_deposit || '',
    rental_start_date: '',
    rental_end_date: '',
    delivery_state: '',
    delivery_city: '',
    delivery_pin_code: '',
    delivery_address: '',
  });
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [bookedRanges, setBookedRanges] = useState<{ start: string; end: string }[]>([]);
  const [user, setUser] = useState<{ id?: number; name?: string; user_type?: string; role?: string; blocked_buyer?: number | string } | null>(null);
  const [inCart, setInCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ seller_name: string; seller_email: string; seller_mobile: string; seller_city: string; seller_state: string; seller_pincode: string; already_viewed: boolean } | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [previousOffer, setPreviousOffer] = useState<any | null>(null);
  const [rentalExpired, setRentalExpired] = useState(false);

  const datesSelected = product.listing_type !== 'rent' || (!!offerForm.rental_start_date && !!offerForm.rental_end_date);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flex_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUser(u);
          // 1. Blocked admin check
          if (u.role === 'admin' && Number(u.blocked_buyer) === 1) {
            router.replace('/admin');
            return;
          }
          // 2. Strictly seller check (not 'both' and not 'admin/super_admin')
          // Allow if they are the owner of THIS product
          if (u.user_type === 'seller' && !['admin', 'super_admin'].includes(u.role) && Number(u.id) !== Number(product.seller_id)) {
            router.replace('/seller');
            return;
          }
        } catch { /* ignore */ }
      }
      setInCart(isInCart(Number(product.id)));
      setInWishlist(isInWishlist(Number(product.id)));
    }
  }, [product.id, router, product.seller_id]);

  // Check if buyer already has an active offer on this product (persists across refreshes)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('flex_token') : null;
    if (!token) return;
    api.get<{ has_offer: boolean, offer: any, rental_period_ended: boolean }>(`/buyer/offer-status/${product.id}`)
      .then(res => {
        if (res.success && res.data?.has_offer) {
          const off = res.data.offer;
          setPreviousOffer(off);

          if (off.status === 'rejected') {
            // Offer was rejected — pre-fill delivery info so buyer can re-submit easily
            setOfferForm(f => ({
              ...f,
              offer_price: off.offer_price,
              delivery_state: off.delivery_state || '',
              delivery_city: off.delivery_city || '',
              delivery_pin_code: off.delivery_pin_code || '',
              delivery_address: off.delivery_address || '',
            }));
          } else if (res.data.rental_period_ended) {
            // Accepted rental offer whose period has ended — allow a fresh offer
            setRentalExpired(true);
            setOfferForm(f => ({
              ...f,
              delivery_state: off.delivery_state || '',
              delivery_city: off.delivery_city || '',
              delivery_pin_code: off.delivery_pin_code || '',
              delivery_address: off.delivery_address || '',
            }));
          } else {
            setOfferSuccess(true);
            // Also fetch seller contact so "View Seller Contact" button is visible after refresh
            setContactLoading(true);
            api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_city: string; seller_state: string; seller_pincode: string; already_viewed: boolean }>(
              `/buyer/view-seller-contact/${product.id}`
            ).then(cres => {
              setContactLoading(false);
              if (cres.success && cres.data) setContactInfo(cres.data);
            }).catch(() => setContactLoading(false));
          }
        }
      })
      .catch(() => { });
  }, [product.id]);

  // Prevent rendering if blocked (MUST BE AFTER HOOKS)
  if (user) {
    if (user.role === 'admin' && Number((user as any).blocked_buyer) === 1) return null;
    if (user.user_type === 'seller' && !['admin', 'super_admin'].includes(user.role || '') && Number(user.id) !== Number(product.seller_id)) return null;
  }

  // Recalculate rental price when dates change
  useEffect(() => {
    if (product.listing_type === 'rent' && offerForm.rental_start_date && offerForm.rental_end_date) {
      const s = new Date(offerForm.rental_start_date);
      const e = new Date(offerForm.rental_end_date);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const days = Math.ceil(diffTime / 86400000) + 1; // inclusive
      if (days > 0) {
        const dailyRate = parseFloat(product.rental_cost || '0');
        const total = dailyRate * days;
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
    if (!offerForm.delivery_state.trim()) {
      setOfferError('State is mandatory.');
      return;
    }
    if (!offerForm.delivery_city.trim()) {
      setOfferError('City is mandatory.');
      return;
    }
    if (!offerForm.delivery_pin_code.trim()) {
      setOfferError('PIN code is mandatory.');
      return;
    }
    if (!offerForm.delivery_address.trim()) {
      setOfferError('Delivery address is mandatory.');
      return;
    }
    if (!/^\d{6}$/.test(offerForm.delivery_pin_code)) {
      setOfferError('PIN code must be exactly 6 digits.');
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
      delivery_city: offerForm.delivery_city,
      delivery_state: offerForm.delivery_state,
      delivery_pin_code: offerForm.delivery_pin_code,
    });
    setOfferLoading(false);
    if (res?.success) {
      setOfferSuccess(true);
      setShowOffer(false);
      // Auto-fetch seller contact after successful offer
      setContactLoading(true);
      setContactError(null);
      const contactRes = await api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_city: string; seller_state: string; seller_pincode: string; already_viewed: boolean }>(
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
    const res = await api.post<{ seller_name: string; seller_email: string; seller_mobile: string; seller_city: string; seller_state: string; seller_pincode: string; already_viewed: boolean }>(
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
  const brandName = product.orignal_brand || product.brand_name || product.brand || 'Premium Listing';
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

  const ratingCount = parseInt(product.seller_rating_count || '0', 10);

  const toSlug = (title: string, id: number) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${slug}-${id}`;
  };

  const getSimilarPrice = (p: SimilarProduct) => {
    if (p.listing_type === 'sell') return p.selling_price || p.price || p.original_price;
    return p.rental_cost;
  };


  const discountPct = product.listing_type === 'sell' && product.original_price && parseFloat(product.original_price) > parseFloat(product.selling_price || '0')
    ? Math.round((1 - parseFloat(product.selling_price || '0') / parseFloat(product.original_price)) * 100)
    : 0;

  return (
    <div style={{ fontFamily: "'Maven Pro', sans-serif", backgroundColor: '#fff', color: '#111827', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* Landing Navbar */}
      <LandingNavbar showAuth />
      <div style={{ height: 70 }} />

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.2rem', paddingTop: '3.5rem', paddingBottom: '2rem' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: '#0c0f0f', textTransform: 'uppercase', letterSpacing: '0.05em', flexWrap: 'wrap' }}>
          <Link href="/buyer/browse" style={{ color: '#5a5c5c', textDecoration: 'none', textTransform: 'capitalize' }}>Home</Link>
          {product.listing_type && (
            <>
              <span style={{ color: '#acadad' }}>/</span>
              <Link href={`/buyer/browse?listing_type=${product.listing_type.toLowerCase()}`} style={{ color: '#5a5c5c', textDecoration: 'none', textTransform: 'capitalize' }}>
                {product.listing_type_name || product.listing_type}
              </Link>
            </>
          )}
          {product.category && (
            <>
              <span style={{ color: '#acadad' }}>/</span>
              <span style={{ color: '#5a5c5c', textTransform: 'capitalize' }}>{product.category}</span>
            </>
          )}
          <span style={{ color: '#acadad' }}>/</span>
          <span style={{ color: '#0c0f0f', textTransform: 'capitalize' }}>{product.title}</span>
        </nav>
      </div>

      {/* Product container */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1rem 3rem' }}>

        {/* Product layout — 2 columns */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-18 mb-10'>

          {/* LEFT: Image gallery */}
          <div style={{
            display: 'flex',
            gap: '3rem', // No gap if only 1 image
            width: "fit-content",
            margin: images.length > 1 ? "" : "0 auto",
            paddingLeft: images.length > 1 ? "" : "5rem"
          }}>
            {/* Vertical thumbnail list */}
            {images.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    onClick={() => { setImgIdx(i); setAutoPlay(false); setTimeout(() => setAutoPlay(true), 5000); }}
                    onMouseEnter={() => { setImgIdx(i); setAutoPlay(false); }}
                    onMouseLeave={() => setAutoPlay(true)}
                    style={{
                      width: 80, height: 100, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${i === imgIdx ? '#FFC63A' : 'transparent'}`,
                      opacity: i === imgIdx ? 1 : 0.6, transition: 'all 0.3s', flexShrink: 0,
                    }}
                  >
                    <img src={getImageUrl(img.image_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                width: 'fit-content',
                height: 'fit-content',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                cursor: isHovering ? 'crosshair' : 'default'
              }}
              onMouseEnter={() => { setIsHovering(true); setAutoPlay(false); }}
              onMouseLeave={() => { setIsHovering(false); setAutoPlay(true); }}
              onMouseMove={handleMouseMove}
            >
              <img
                src={getImageUrl(images[imgIdx]?.image_path)}
                alt={product.title}
                className='w-full md:w-[530px] max-h-[600px] aspect-[4/5] object-cover rounded-xl'
                style={{
                  transform: isHovering ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transition: isHovering ? 'transform-origin 0.1s ease' : 'transform 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* RIGHT: Product info */}
          <div style={{ paddingTop: 0 }}>
            {/* Category */}
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              {product.category || brandName}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827' , marginBottom:0, lineHeight: 1.3, fontFamily: "'Maven Pro', sans-serif" }}>
              {product.title}
            </h1>


            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom:10 }}>
              {/* <div style={{ display: 'flex', gap: 3, color: '#FFC63A', fontSize: '0.9rem' }}>
                {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ opacity: i <= Math.min(ratingCount, 5) ? 1 : 0.25 }}>★</span>)}
              </div> */}
              <span style={{ color: '#3b404a', fontSize: '14px' }}>{ratingCount} seller points</span>
            </div>


            {/* Price */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#FFC63A', fontFamily: "'Maven Pro', sans-serif" }}>
                &#8377;{formatPrice(price)}
                {product.listing_type === 'rent' && <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#6b7280' }}>/day</span>}
              </span>
              {product.listing_type === 'sell' && product.original_price && parseFloat(product.original_price) > parseFloat(product.selling_price || '0') && (
                <>
                  <span style={{ fontSize: 22, color: '#6b7280', textDecoration: 'line-through', marginLeft: 12 }}>
                    &#8377;{formatPrice(product.original_price)}
                  </span>

                </>
              )}
              {product.listing_type === 'rent' && product.rental_deposit && (
                <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.85rem' }}>
                  + &#8377;{formatPrice(product.rental_deposit)} deposit
                </div>
              )}
            </div>

            {/* Brand info after price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Original Brand</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#3b404a' }}>{product.orignal_brand || 'Premium Listing'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Brand</div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#3b404a' }}>{product.seller_brand || '—'}</div>
              </div>
            </div>




            {/* CTA block */}
            <div style={{ marginBottom: 0 }}>
              {offerSuccess ? (
                <div>
                  <div style={{ borderRadius: 32, marginBottom: '2rem' }}>
                

                    <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 -2rem 1.5rem', opacity: 0.4 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem',  marginBottom:24}}>
                      <button
                        onClick={() => setShowContactModal(true)}
                        style={{ width: '100%', padding: '1rem', borderRadius: 10, background: '#ffc63a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.8px', textTransform: 'uppercase', transition: 'all 0.2s', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        View Seller Contact
                      </button>
                      <button
                        onClick={() => router.push('/buyer/my-offers')}
                        style={{ width: '100%', padding: '1rem', borderRadius: 10, border: '2px solid #E5E7EB', background: 'transparent', color: '#111827', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.8px', textTransform: 'uppercase', transition: 'all 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        View Offer
                      </button>
                    </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d6b06b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-check-lg" style={{ color: '#ffff', fontSize: '1.4rem' }}></i>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#111827', fontFamily: "'Maven Pro', sans-serif" }}>Offer Submitted!</div>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>The seller will review your offer shortly.</div>
                      </div>
                    </div>
                  </div>

                  {contactLoading && (
                    <div style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontSize: '0.85rem' }}>
                      <span className="spinner-border spinner-border-sm me-2"></span>Fetching seller contact…
                    </div>
                  )}
                  {contactError && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8 }}>
                      <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }}></i>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{contactError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Re-offer notice banners */}
                  {previousOffer?.status === 'rejected' && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="bi bi-x-circle-fill" style={{ color: '#ef4444', fontSize: '1rem', flexShrink: 0 }}></i>
                      <span style={{ color: '#991b1b', fontSize: '0.82rem', fontWeight: 500 }}>
                        Your previous offer was rejected. You can submit a new offer below.
                      </span>
                    </div>
                  )}
                  {rentalExpired && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="bi bi-calendar-x-fill" style={{ color: '#3b82f6', fontSize: '1rem', flexShrink: 0 }}></i>
                      <span style={{ color: '#1e40af', fontSize: '0.82rem', fontWeight: 500 }}>
                        Your previous rental period has ended. You can make a new offer for new dates.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
                    <button
                      onClick={() => {
                        if (inWishlist) {
                          removeFromWishlist(Number(product.id));
                          setInWishlist(false);
                          toast.success('Removed from wishlist');
                        } else {
                          addToWishlist({
                            id: Number(product.id),
                            title: product.title,
                            listing_type: product.listing_type,
                            price: product.listing_type === 'sell' ? (product.selling_price || product.original_price) : product.rental_cost,
                            image: images[0]?.image_path,
                            seller_name: product.seller_name
                          });
                          setInWishlist(true);
                          toast.success('Added to wishlist');
                        }
                      }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        border: '1.5px solid #ef4444',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                      title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}`} style={{ fontSize: '1.3rem', color: '#ef4444' }}></i>
                    </button>
                    <button
                      onClick={() => { setShowOffer(true); setOfferError(null); }}
                      style={{ flex: 1, padding: '16px 24px', borderRadius: 8, fontSize: 17, fontWeight: 600, fontFamily: "'Maven Pro', sans-serif", cursor: 'pointer', transition: 'all 0.3s', border: 'none', background: '#FFC63A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
                    >
                      <i className={`bi ${product.listing_type === 'rent' ? 'bi-calendar-check-fill' : 'bi-tags-fill'}`} style={{ color: '#fff' }}></i>
                      Make an Offer
                    </button>

                  </div>
                  {/* <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem', margin: 0 }}>
                    <i className="bi bi-shield-check me-1" style={{ color: '#22c55e' }}></i>
                    Active subscription required · Secure platform offer
                  </p> */}
                </>
              )}
            </div>


          </div>
        </div>

        {/* TABS: Description + Specifications */}
        <div style={{ marginTop: 60 }}>
          <div style={{ display: 'flex', gap: 40, borderBottom: '2px solid #e5e7eb', marginBottom: 30 }}>
            {(['description', 'specifications'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveProductTab(tab)}
                style={{
                  padding: '16px 0', fontSize: 18, fontWeight: 600,
                  color: activeProductTab === tab ? '#111827' : '#6b7280',
                  background: 'none', border: 'none', borderBottom: `3px solid ${activeProductTab === tab ? '#FFC63A' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.3s', fontFamily: "'Maven Pro', sans-serif",
                  textTransform: 'capitalize',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeProductTab === 'description' && (
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, fontFamily: "'Maven Pro', sans-serif", color: '#111827' }}>Product Description</h3>
              {product.description ? (() => {
                const CHAR_LIMIT = 300;
                const paragraphs = product.description.split(/\n\n+/).filter(Boolean);
                const hasMultiPara = paragraphs.length > 1;
                const isLong = hasMultiPara || product.description.length > CHAR_LIMIT;

                let collapsedText: string;
                if (hasMultiPara) {
                  collapsedText = paragraphs[0];
                } else if (product.description.length > CHAR_LIMIT) {
                  // truncate at word boundary
                  const cut = product.description.substring(0, CHAR_LIMIT);
                  collapsedText = cut.substring(0, cut.lastIndexOf(' ') + 1).trimEnd();
                } else {
                  collapsedText = product.description;
                }

                const displayText = (!isLong || showFullDesc) ? product.description : collapsedText;
                return (
                  <div>
                    <p style={{ color: '#6b7280', lineHeight: 1.8, fontSize: 16, margin: 0 }}>
                      {displayText.split('\n').map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                      ))}
                      {isLong && !showFullDesc && <span style={{ color: '#9ca3af' }}>…</span>}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => setShowFullDesc(v => !v)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: 15, marginTop: 10, textDecoration: 'underline', textUnderlineOffset: 3 }}
                      >
                        {showFullDesc ? 'View less' : 'View more'}
                      </button>
                    )}
                  </div>
                );
              })() : (
                <p style={{ color: '#6b7280', lineHeight: 1.8, fontSize: 16 }}>No description available.</p>
              )}
            </div>
          )}

          {activeProductTab === 'specifications' && (
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 30, fontFamily: "'Maven Pro', sans-serif", color: '#111827' }}>Product Specifications</h3>
              <div style={{ display: 'grid', gap: 0, marginBottom: 20 }}>
                {product.product_number && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Product SKU</span>
                    <span style={{ color: '#6b7280' }}>{product.product_number}</span>
                  </div>
                )}
                {(product.listing_type_name || product.listing_type) && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Listing Type</span>
                    <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
                      {product.listing_type_name || (product.listing_type === 'sell' ? 'Direct Purchase' : 'Rental')}
                    </span>
                  </div>
                )}
                {product.category && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Category</span>
                    <span style={{ color: '#6b7280' }}>{product.category}</span>
                  </div>
                )}
                {product.size && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Size</span>
                    <span style={{ color: '#6b7280' }}>{product.size}</span>
                  </div>
                )}
                {product.color && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Color</span>
                    <span style={{ color: '#6b7280' }}>{product.color}</span>
                  </div>
                )}
                {genders.length > 0 && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Gender</span>
                    <span style={{ color: '#6b7280' }}>{genders.join(', ')}</span>
                  </div>
                )}
                {usedTimes !== undefined && usedTimes !== '' && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Condition</span>
                    <span style={{ color: '#6b7280' }}>
                      {usedTimes === '0' ? 'Brand New' : (product.usage_label ? `${usedTimes} ${product.usage_label}` : `Used ${usedTimes}×`)}
                    </span>
                  </div>
                )}
                {product.condition_description && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Condition Notes</span>
                    <span style={{ color: '#6b7280' }}>{product.condition_description}</span>
                  </div>
                )}
                {product.listing_type === 'rent' && product.allow_alter_fitting !== undefined && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Alteration</span>
                    <span style={{ color: '#6b7280' }}>{Number(product.allow_alter_fitting) === 1 ? 'Allowed' : 'Not Allowed'}</span>
                  </div>
                )}
                {product.orignal_brand && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Original Brand</span>
                    <span style={{ color: '#6b7280' }}>{product.orignal_brand}</span>
                  </div>
                )}
                {product.seller_brand && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Seller Brand</span>
                    <span style={{ color: '#6b7280' }}>{product.seller_brand}</span>
                  </div>
                )}
                {!product.orignal_brand && !product.seller_brand && brandName && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Brand</span>
                    <span style={{ color: '#6b7280' }}>{brandName}</span>
                  </div>
                )}
                {product.listing_type === 'sell' && product.original_price && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Original Price</span>
                    <span style={{ color: '#6b7280' }}>&#8377;{formatPrice(product.original_price)}</span>
                  </div>
                )}
                {Object.entries(specs).map(([key, val]) => val && (
                  <div key={key} style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>{key}</span>
                    <span style={{ color: '#6b7280' }}>{val}</span>
                  </div>
                ))}
                {Number(product.has_bill) === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Original Bill</span>
                      <div style={{ padding: '6px 14px', background: '#ecfdf5', color: '#059669', borderRadius: 50, fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #d1fae5' }}>
                        <i className="bi bi-patch-check-fill"></i> Verified Bill Included
                      </div>
                    </div>

                  </div>
                )}
                {product.views_count !== undefined && product.views_count > 0 && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Views</span>
                    <span style={{ color: '#6b7280' }}>{product.views_count} times</span>
                  </div>
                )}
                {product.seller_name && (
                  <div style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#111827', width: 200, flexShrink: 0 }}>Seller</span>
                    <span style={{ color: '#6b7280' }}>{product.seller_name}</span>
                  </div>
                )}
              </div>

              {product.bill_image && (
                <div style={{ marginLeft: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 12, fontWeight: 500 }}>DOCUMENT PROOF:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {(() => {
                      let billPaths: string[] = [];
                      try {
                        if (product.bill_image.startsWith('[')) {
                          billPaths = JSON.parse(product.bill_image);
                        } else {
                          billPaths = [product.bill_image];
                        }
                      } catch {
                        billPaths = [product.bill_image];
                      }
                      return billPaths.map((path, idx) => {
                        const url = path.startsWith('http') ? path : `${BASE_URL}/${path}`;
                        return (
                          <div key={idx} style={{ position: 'relative', width: 140 }}>
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <img
                                  src={url}
                                  alt={`Bill ${idx + 1}`}
                                  style={{ width: '100%', height: 180, objectFit: 'cover', background: '#fff' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '8px' }}>
                                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>View Document</span>
                                </div>
                              </div>
                              <div style={{ marginTop: 6, fontSize: '11px', color: '#9ca3af', textAlign: 'center', fontWeight: 600 }}>BILL_{idx + 1}.JPG</div>
                            </a>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Products */}
        {similarProducts.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 30, fontFamily: "'Maven Pro', sans-serif" }}>You May Also Like</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              {similarProducts.slice(0, 4).map((sp) => {
                const spPrice = getSimilarPrice(sp);
                const spImage = sp.image ? (sp.image.startsWith('http') ? sp.image : `${BASE_URL}/${sp.image}`) : '';
                return (
                  <Link key={sp.id} href={`/buyer/product/${toSlug(sp.title, sp.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div
                      style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.3s', cursor: 'pointer', background: '#fff', border: '1px solid #e5e7eb' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                    >
                      <div style={{ width: '100%', height: 300, overflow: 'hidden', background: '#f9fafb' }}>
                        {spImage ? (
                          <img src={spImage} alt={sp.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-image" style={{ fontSize: 40, color: '#ccc' }}></i>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                          {sp.category || sp.orignal_brand || sp.seller_brand || (sp.brand_name || sp.brand) || 'Product'}
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Maven Pro', sans-serif" }}>
                          {sp.title}
                        </h3>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#FFC63A' }}>
                          &#8377;{formatPrice(spPrice)}
                          {sp.listing_type === 'rent' && <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#9ca3af' }}>/day</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Seller Contact Modal */}
      {showContactModal && contactInfo && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', }}
          onClick={() => setShowContactModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: "'Maven Pro', sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header section (White background) */}
            <div style={{ background: '#fff', padding: '32px 28px 20px', position: 'relative', borderBottom: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111827', fontSize: 18, transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
              >
                &times;
              </button>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 4, background: '#FFC63A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
                  {contactInfo.seller_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Verified Seller</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{contactInfo.seller_name}</div>
                  {contactInfo.already_viewed && (
                    <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 10px' }}>
                      <i className="bi bi-check-circle-fill" style={{ color: '#FFC63A', fontSize: '0.65rem' }}></i>
                      <span style={{ fontSize: '0.65rem', color: '#FFC63A', fontWeight: 600 }}>Previously contacted</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact rows */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Contact Details</div>

              {/* Email */}
              <a
                href={`mailto:${contactInfo.seller_email}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 4, background: '#f9fafb', marginBottom: 12, textDecoration: 'none', border: '1px solid #f3f4f6', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#fffbeb'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#fde68a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#f3f4f6'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 4, background: '#FFC63A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="bi bi-envelope-fill" style={{ color: '#111827', fontSize: '1rem' }}></i>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Email</div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contactInfo.seller_email}</div>
                </div>
                <i className="bi bi-arrow-up-right" style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 'auto', flexShrink: 0 }}></i>
              </a>

              {/* Phone */}
              <a
                href={`tel:${contactInfo.seller_mobile}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 4, background: '#f9fafb', marginBottom: 12, textDecoration: 'none', border: '1px solid #f3f4f6', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#fffbeb'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#fde68a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f9fafb'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#f3f4f6'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 4, background: '#FFC63A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="bi bi-telephone-fill" style={{ color: '#111827', fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Phone</div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{contactInfo.seller_mobile}</div>
                </div>
                <i className="bi bi-arrow-up-right" style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 'auto', flexShrink: 0 }}></i>
              </a>

              {/* Location */}
              {(contactInfo.seller_city || contactInfo.seller_state || contactInfo.seller_pincode) && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 4, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: '#FFC63A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-geo-alt-fill" style={{ color: '#111827', fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Location</div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>
                      {[contactInfo.seller_city, contactInfo.seller_state].filter(Boolean).join(', ')}
                    </div>
                    {contactInfo.seller_pincode && (
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>PIN: {contactInfo.seller_pincode}</div>
                    )}
                  </div>
                </div>
              )}
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
                <h5 className="modal-title fw-bold" style={{ fontFamily: "'Maven Pro', sans-serif" }}>
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
                      minRentalDays={minRentalDays}
                    />
                    <div className="mt-3 mb-3">
                      <label className="form-label fw-bold small">Deposit Amount (&#8377;)</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        value={offerForm.deposit_amount}
                        readOnly={true}
                        style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
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
                    readOnly={true}
                    style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                  />

                  {product.listing_type === 'rent' && offerForm.rental_start_date && offerForm.rental_end_date && (
                    <div className="mt-1 small text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Calculated: ₹{product.rental_cost} × {
                        (() => {
                          const s = new Date(offerForm.rental_start_date);
                          const e = new Date(offerForm.rental_end_date);
                          const diffTime = Math.abs(e.getTime() - s.getTime());
                          return Math.ceil(diffTime / 86400000) + 1;
                        })()
                      } days = ₹{offerForm.offer_price}
                    </div>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold small text-dark">Full Delivery Address <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control rounded-3"
                    rows={2}
                    value={offerForm.delivery_address}
                    onChange={(e) => setOfferForm({ ...offerForm, delivery_address: e.target.value })}
                    placeholder="Street, House No, Landmark"
                    required
                  />
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Note: Only City, State, and PIN will be shared with the seller for privacy.
                  </small>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold small text-dark">State <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={offerForm.delivery_state}
                      onChange={(e) => setOfferForm({ ...offerForm, delivery_state: e.target.value })}
                      placeholder="e.g. Punjab"
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-bold small text-dark">City <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={offerForm.delivery_city}
                      onChange={(e) => setOfferForm({ ...offerForm, delivery_city: e.target.value })}
                      placeholder="e.g. Amritsar"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small text-dark">PIN Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={offerForm.delivery_pin_code}
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').substring(0, 6);
                        setOfferForm({ ...offerForm, delivery_pin_code: val });
                      }}
                      placeholder="6-digit PIN code"
                      required
                    />
                  </div>

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
                  style={{ background: '#FFC63A', color: '#ffff', border: 'none', padding: '12px 30px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', fontFamily: "'Maven Pro', sans-serif", cursor: 'pointer', transition: '0.3s' }}
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

      <Footer />
    </div>
  );
}
