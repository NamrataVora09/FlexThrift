'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useToast } from '@/lib/toast';

// ── Inline rental calendar (reused from ProductDetailClient) ────────────────
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const D = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function RentalCalendar({ bookedRanges, startDate, endDate, onRangeChange, minRentalDays }: {
  bookedRanges: { start: string; end: string }[];
  startDate: string; endDate: string;
  onRangeChange: (s: string, e: string) => void;
  minRentalDays?: number;
}) {
    const { toastError } = useToast();
  
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [phase, setPhase] = useState<'start' | 'end'>('start');
  const [hover, setHover] = useState<Date | null>(null);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s: string) => { if (!s) return null; const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); };
  const dateOnly = (s: string) => s ? s.split(' ')[0] : s;

  const isBooked = (d: Date) => { const ds = fmt(d); return bookedRanges.some(r => ds >= dateOnly(r.start) && ds <= dateOnly(r.end)); };
  const sD = parse(startDate), eD = parse(endDate);
  const inRange = (d: Date) => {
    if (!sD) return false;
    const eff = eD || hover; if (!eff) return false;
    const lo = sD <= eff ? sD : eff, hi = sD <= eff ? eff : sD;
    return d > lo && d < hi;
  };

  const daysBetween = (a: Date, b: Date) => {
    const lo = a <= b ? a : b;
    const hi = a <= b ? b : a;
    return Math.round((hi.getTime() - lo.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const yr = view.getFullYear(), mo = view.getMonth();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < new Date(yr, mo, 1).getDay(); i++) cells.push(null);
  for (let i = 1; i <= new Date(yr, mo + 1, 0).getDate(); i++) cells.push(new Date(yr, mo, i));

  const click = (d: Date) => {
    if (d < today || isBooked(d)) return;
    if (phase === 'start' || (sD && eD)) { onRangeChange(fmt(d), ''); setPhase('end'); }
    else {
      const s = sD!;
      const limit = minRentalDays || 3;
      if (daysBetween(s, d) < limit) {
        toastError('rental_min_days_error', `Minimum rental period is ${limit} days. You selected ${daysBetween(s, d)} day(s).`, { min: String(limit), selected: String(daysBetween(s, d)) });
        return;
      }
      d < s ? onRangeChange(fmt(d), fmt(s)) : onRangeChange(fmt(s), fmt(d));
      setPhase('start');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 12, userSelect: 'none', fontSize: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={() => setView(new Date(yr, mo - 1, 1))} style={{ background: 'none', border: '1px solid #eee', borderRadius: 6, cursor: 'pointer', padding: '1px 10px', fontWeight: 700 }}>‹</button>
        <span style={{ fontWeight: 700 }}>{M[mo]} {yr}</span>
        <button type="button" onClick={() => setView(new Date(yr, mo + 1, 1))} style={{ background: 'none', border: '1px solid #eee', borderRadius: 6, cursor: 'pointer', padding: '1px 10px', fontWeight: 700 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
        {D.map(n => <div key={n} style={{ textAlign: 'center', fontWeight: 700, color: '#aaa', padding: 2 }}>{n}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today, bk = isBooked(d), dis = past || bk;
          const isS = sD && fmt(d) === fmt(sD), isE = eD && fmt(d) === fmt(eD), rng = inRange(d), isT = fmt(d) === fmt(today);
          let bg = 'transparent', col = '#000', br = '6px';
          if (bk) { bg = '#fee2e2'; col = '#dc2626'; }
          else if (isS || isE) { bg = '#ffc63a'; col = '#000'; br = '8px'; }
          else if (rng) { bg = '#fff3cc'; col = '#555'; br = '0'; }
          if (past && !bk) col = '#ccc';
          return <div key={i} onClick={() => click(d)} onMouseEnter={() => { if (!dis) setHover(d); }} onMouseLeave={() => setHover(null)}
            title={bk ? 'Already booked' : undefined}
            style={{
              textAlign: 'center', padding: '5px 2px', borderRadius: br, background: bg, color: col, cursor: dis ? 'not-allowed' : 'pointer',
              fontWeight: (isS || isE || isT) ? 700 : 400, border: isT && !isS && !isE ? '1.5px solid #ffc63a' : '1.5px solid transparent',
              opacity: past && !bk ? 0.35 : 1, transition: 'background .1s'
            }}>
            {d.getDate()}
            {bk && <div style={{ width: 3, height: 3, background: '#dc2626', borderRadius: '50%', margin: '1px auto 0' }} />}
          </div>;
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, color: '#888', fontSize: '0.72rem', flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ffc63a', borderRadius: 2, marginRight: 3 }} />Selected</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#fff3cc', borderRadius: 2, marginRight: 3 }} />Range</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#fee2e2', borderRadius: 2, marginRight: 3 }} />Booked</span>
      </div>
      {startDate && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#fffdf0', borderRadius: 7, border: '1px solid #ffc63a44', fontSize: '0.78rem' }}>
          {endDate
            ? <><strong>{startDate}</strong> → <strong>{endDate}</strong>
              {' '}·{' '}<span style={{ color: '#888' }}>{Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1} days</span></>
            : <><strong>{startDate}</strong> — click an end date</>}
        </div>
      )}
    </div>
  );
}

interface OfferHistory {
  action: string;
  created_at: string;
  new_start_date?: string;
  new_end_date?: string;
}

interface ConflictInfo {
  message: string;
  type: string;
}



interface Offer {
  id: number;
  product_id: number;
  product_title: string;
  product_image?: string;
  listing_type: string;
  offer_type?: string;
  offer_price: string;
  offered_price?: string;
  original_price: string;
  status: string;
  created_at: string;
  accepted_at?: string;
  seller_name?: string;
  seller_mobile?: string;
  seller_email?: string;
  seller_rating_avg?: string | number;
  seller_rating_count?: string | number;
  buyer_name?: string;
  dispatch_city?: string;
  dispatch_state?: string;
  dispatch_pin_code?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_cost?: string;
  deposit_amount?: string;
  delivery_address?: string;
  delivery_pin_code?: string;
  message?: string;
  conflict_info?: ConflictInfo;
  history?: OfferHistory[];
  seller_remarks?: string;
  buyer_rated_seller?: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080');

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${BASE_URL}/${path}`;
  return `${BASE_URL}/uploads/products/${path}`;
}

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'rejected'] as const;

const pillStyles: Record<string, React.CSSProperties> = {
  pending: { background: '#f8f9fa', color: '#666', border: '1px solid #eee' },
  missed: { background: '#fff5f5', color: '#d63031', border: '1px solid #ffeaea' },
  negotiating: { background: '', color: '#d97706', border: '1px solid #fde68a' },
  accepted: { background: '#eaffea', color: '#1a8a1a', border: '1px solid #c9f9c9' },
  rejected: { background: '#fff5f5', color: '#d63031', border: '1px solid #ffeaea' },
  cancelled: { background: '#f8f9fa', color: '#999', border: '1px solid #eee' },
};

function getHistoryLabel(action: string): string {
  switch (action) {
    case 'initial_offer': return 'Offer Initiated';
    case 'buyer_date_update': return 'Buyer updated dates';
    case 'seller_suggest_dates': return 'Seller suggested new dates';
    case 'buyer_accept_negotiation': return 'Buyer accepted suggested dates';
    default: return action;
  }
}

function getHistoryIcon(action: string): string {
  switch (action) {
    case 'initial_offer': return 'fa-solid fa-tag';
    case 'buyer_date_update': return 'fa-solid fa-calendar-plus';
    case 'seller_suggest_dates': return 'fa-solid fa-calendar-days';
    case 'buyer_accept_negotiation': return 'fa-solid fa-calendar-check';
    default: return 'fa-solid fa-clock';
  }
}

export default function Page() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ id: number; action: 'cancel' | 'accept_dates'; title: string; message?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changeDatesModal, setChangeDatesModal] = useState<{ id: number; title: string; productId: number } | null>(null);
  const [cdStart, setCdStart] = useState('');
  const [cdEnd, setCdEnd] = useState('');
  const [cdLoading, setCdLoading] = useState(false);
  const [cdError, setCdError] = useState<string | null>(null);
  const [cdBookedRanges, setCdBookedRanges] = useState<{ start: string; end: string }[]>([]);
  const [minRentalDays, setMinRentalDays] = useState(3);
  const [cdPrice, setCdPrice] = useState('0');
  const [cdDailyRate, setCdDailyRate] = useState('0');
  const [settings, setSettings] = useState({ acceptanceLimitDays: 7, ratingPeriod: 7, rejectionWindowHours: 24 });

  // Rating state
  const [ratingModal, setRatingModal] = useState<{ id: number; title: string } | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);



  const load = () => {
    setLoading(true);
    // The backend returns { success: true, data: Offer[], minRentalDays: number }
    api.get<Offer[]>('/buyer/my-offers').then((r) => {
      // Cast to any to access the root-level 'minRentalDays' property which isn't in generic ApiResponse
      const res = r as any;
      if (res.success && res.data) {
        setOffers(res.data);
        if (res.minRentalDays) setMinRentalDays(res.minRentalDays);
        if (res.acceptanceLimitDays) setSettings(prev => ({ ...prev, acceptanceLimitDays: res.acceptanceLimitDays }));
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    const res = await api.post(`/buyer/cancel-offer/${actionModal.id}`);
    setActionLoading(false);
    if (res?.success) {
      setActionModal(null);
      load();
    } else {
      toast.error(res?.message || 'Action failed');
    }
  };

  const handleAcceptDates = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    const res = await api.post(`/buyer/confirmDateChange/${actionModal.id}`);
    setActionLoading(false);
    if (res?.success) {
      setActionModal(null);
      load();
    } else {
      toast.error(res?.message || 'Failed to confirm dates');
    }
  };

  const handleRateSubmit = async () => {
    if (!ratingModal) return;
    setRatingLoading(true);
    const res = await api.post<any>('/buyer/rate-seller', {
      offer_id: ratingModal.id,
      rating: 5
    });
    setRatingLoading(false);
    if (res.success) {
      toast.success('Rating submitted successfully!');
      setRatingModal(null);
      load();
    } else {
      toast.error(res.message || 'Failed to submit rating');
    }
  };



  const openChangeDates = (o: Offer) => {
    setCdStart(o.rental_start_date || '');
    setCdEnd(o.rental_end_date || '');
    setCdPrice(o.offered_price || o.offer_price || '0');
    setCdDailyRate((o as any).product_rental_cost ?? o.rental_cost ?? '0');
    setCdError(null);
    setCdBookedRanges([]);
    setChangeDatesModal({ id: o.id, title: o.product_title, productId: o.product_id });
    // fetch booked ranges so calendar shows unavailable dates
    api.get<{ booked_ranges: { start: string; end: string }[] }>(`/product/${o.product_id}/booked-dates`)
      .then(r => { if (r.success && r.data) setCdBookedRanges(r.data.booked_ranges.filter(br => !(br.start === o.rental_start_date && br.end === o.rental_end_date))); })
      .catch(() => { });
  };

  // Recalculate price in modal
  useEffect(() => {
    if (cdStart && cdEnd && cdDailyRate !== '0') {
      const s = new Date(cdStart);
      const e = new Date(cdEnd);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const days = Math.ceil(diffTime / 86400000) + 1; // inclusive
      if (days > 0) {
        setCdPrice((parseFloat(cdDailyRate) * days).toString());
      }
    }
  }, [cdStart, cdEnd, cdDailyRate]);

  const handleChangeDates = async () => {
    if (!changeDatesModal) return;
    if (!cdStart || !cdEnd) { setCdError('Please select both start and end dates.'); return; }

    const s = new Date(cdStart);
    const e = new Date(cdEnd);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const totalDays = Math.ceil(diffTime / 86400000) + 1; // inclusive

    if (totalDays < minRentalDays) {
      setCdError(`Minimum ${minRentalDays} days rental required. You selected ${totalDays} day${totalDays === 1 ? '' : 's'}.`);
      return;
    }
    setCdLoading(true);
    setCdError(null);
    const res = await api.post(`/buyer/update-offer-dates/${changeDatesModal.id}`, {
      rental_start_date: cdStart,
      rental_end_date: cdEnd,
      offer_price: cdPrice,
    });
    setCdLoading(false);
    if (res?.success) {
      setChangeDatesModal(null);
      load();
    } else {
      setCdError(res?.message || 'Failed to update dates');
    }
  };


  const getOfferDisplayStatus = (o: Offer) => {
    // Backend-confirmed missed offers → treat as 'rejected' for filter tabs
    if (o.status === 'missed') return 'rejected';
    if (o.status === 'cancelled') return 'rejected';

    // Frontend-detected expiry (offer still marked pending but time window passed)
    if (o.status === 'pending' && o.created_at) {
      const offerTime = new Date(o.created_at).getTime();
      const expiryTime = offerTime + settings.acceptanceLimitDays * 86400000;
      const isExpired = Date.now() > expiryTime;
      const isProductSold = Number((o as any).is_product_sold ?? 0) > 0;
      const isRentalBlocked = Number((o as any).is_rental_blocked ?? 0) > 0;
      if (isExpired || isProductSold || isRentalBlocked) return 'rejected';
    }
    return o.status;
  };

  const filtered = useMemo(() => {
    const list = offers || [];
    if (filter !== 'all') return list.filter((o) => getOfferDisplayStatus(o) === filter);
    const byTime = (a: Offer, b: Offer) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const REJECTED = ['rejected', 'cancelled', 'missed'];
    return [
      ...list.filter(o => ['pending', 'negotiating'].includes(getOfferDisplayStatus(o))).sort(byTime),
      ...list.filter(o => REJECTED.includes(getOfferDisplayStatus(o))).sort(byTime),
      ...list.filter(o => getOfferDisplayStatus(o) === 'accepted').sort(byTime),
    ];
  }, [offers, filter, settings.acceptanceLimitDays]);

  const counts = useMemo(() => {
    const list = offers || [];
    return {
      all: list.length,
      pending: list.filter((o) => getOfferDisplayStatus(o) === 'pending').length,
      negotiating: list.filter((o) => getOfferDisplayStatus(o) === 'negotiating').length,
      accepted: list.filter((o) => getOfferDisplayStatus(o) === 'accepted').length,
      rejected: list.filter((o) => getOfferDisplayStatus(o) === 'rejected').length,
    }
  }, [offers, settings.acceptanceLimitDays]);

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx global>{`
        .luxury-item-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #eee;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }
        .luxury-item-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border-color: #ffc63a;
        }
        .item-img {
          width: 100px;
          height: 125px;
          object-fit: cover;
          border-radius: 12px;
        }
        .status-pill {
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          white-space: nowrap;
        }
        .price-badge {
          font-size: 1.5rem;
          font-weight: 800;
          color: #000;
        }
        .btn-modern-cancel {
          background: #fff5f5;
          color: #d63031;
          border: 1px solid #ffeaea;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          transition: 0.2s;
          cursor: pointer;
        }
        .btn-modern-cancel:hover {
          background: #d63031;
          color: white;
        }
        .no-data-lux {
          padding: 80px 0;
          text-align: center;
          background: white;
          border-radius: 20px;
          border: 1px solid #eee;
        }
        .conflict-alert {
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #fda4af;
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 15px;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .filter-pill {
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #eee;
          background: #fff;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-pill:hover {
          border-color: #eee;
        }
        .filter-pill.active {
          background: #ffc63a;
          color: #fff;
          border-color: #ffc63a;
        }
        .filter-pill .count-badge {
          background: rgba(0,0,0,0.08);
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          margin-left: 6px;
        }
        .filter-pill.active .count-badge {
          background: rgba(255,255,255,0.25);
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', fontFamily: 'Poppins', marginBottom: 4 }}>Offers Sent</h1>
            <p className="text-muted mb-0">Track offers and negotiation status with sellers.</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-pill${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="count-badge">{counts[f as keyof typeof counts] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border" role="status" style={{ color: '#ffc63a' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="no-data-lux shadow-sm">
            <i className="bi bi-tag" style={{ fontSize: '6rem', opacity: 0.1 }}></i>
            <h3 className="mt-3 fw-bold">No active offers</h3>
            <p className="text-muted">Explore the marketplace to send your first proposal.</p>
          </div>
        )}

        {/* Offer Cards */}
        {!loading && filtered.map((o) => {
          const offerType = o.offer_type || o.listing_type || 'buy';
          const price = o.offered_price || o.offer_price;

          // expiry logic — covers both backend-confirmed 'missed' and frontend-detected pending expiry
          const offerTime = o.created_at ? new Date(o.created_at).getTime() : Date.now();
          const expiryTime = offerTime + settings.acceptanceLimitDays * 86400000;
          // isExpired is true when: backend set status to 'missed' OR offer is pending and time window passed
          const isExpired = o.status === 'missed' || (o.status === 'pending' && Date.now() > expiryTime);
          // expiryDate: for backend-missed offers we may not know exact expiry so compute from creation + limit
          const expiryDate = new Date(expiryTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

          const isProductSold = Number((o as any).is_product_sold ?? 0) > 0;
          const isRentalBlocked = Number((o as any).is_rental_blocked ?? 0) > 0;
          const displayStatus = getOfferDisplayStatus(o);

          const statusLabel = (() => {
            // Backend-confirmed missed (most reliable)
            if (o.status === 'missed') return 'Missed';
            // Frontend-detected expiry on a still-pending offer
            if (o.status === 'pending' && isExpired) return 'Missed';
            if (o.status === 'pending' && isProductSold && (o.offer_type ?? o.listing_type) === 'sell') return 'Sold Out';
            if (o.status === 'pending' && isRentalBlocked) return 'Dates Booked';
            if (o.status === 'negotiating') return 'Action Required';
            if (o.status === 'accepted') return 'Accepted';
            if (o.status === 'rejected') return 'Rejected';
            if (o.status === 'cancelled') return 'Cancelled';
            // fallback capitalise
            return o.status.charAt(0).toUpperCase() + o.status.slice(1);
          })();

          const sellerName = o.seller_name || 'Seller';
          const avatarLetter = sellerName.charAt(0).toUpperCase();
          const sellerAddress = [o.dispatch_city, o.dispatch_state, o.dispatch_pin_code].filter(Boolean).join(', ');

          const days = o.rental_start_date && o.rental_end_date
            ? Math.round((new Date(o.rental_end_date).getTime() - new Date(o.rental_start_date).getTime()) / 86400000) + 1
            : 0;
          const startFormatted = o.rental_start_date ? new Date(o.rental_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
          const endFormatted = o.rental_end_date ? new Date(o.rental_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

          return (
            <div key={o.id} className="luxury-item-card shadow-sm" style={{ padding: 24, borderRadius: 20, background: '#fff', border: '1px solid #eee', marginBottom: 20 }}>
              <div className="row align-items-start g-4">

                {/* LEFT COLUMN — Seller Profile Details */}
                <div className="col-12 col-md-4 col-lg-3.5 pr-md-4" style={{ borderRight: '1px solid #f0f0f0' }}>
                  {/* Product Image */}
                  <img
                    src={getImageUrl(o.product_image) || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'}
                    alt={o.product_title || 'Product'}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'; }}
                    style={{ width: '100%', height: 260, objectFit: 'contain', borderRadius: 12, marginBottom: 14 }}
                  />
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%',
                      border: '2px solid #ffc63a', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', color: '#ffc63a', fontSize: '1.4rem',
                      background: '#fff', flexShrink: 0, marginRight: 12
                    }}>
                      {avatarLetter}
                    </div>
                    <div>
                      <div className="fw-bold fs-6 text-dark">{sellerName}</div>
                      {o.seller_rating_count !== undefined && o.seller_rating_count > 0 && (
                        <div className="d-flex align-items-center gap-1 text-xs" style={{ color: '#FFC107' }}>
                          <i className="bi bi-star-fill"></i>
                          <span className="fw-bold">{o.seller_rating_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#555' }}>
                    {o.seller_mobile && (
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-telephone text-primary" style={{ fontSize: '1rem', color: '#0d6efd' }}></i>
                        <span>{o.seller_mobile}</span>
                      </div>
                    )}
                    {o.seller_email && (
                      <div className="d-flex align-items-center gap-2" style={{ wordBreak: 'break-all' }}>
                        <i className="bi bi-envelope text-primary" style={{ fontSize: '1rem', color: '#0d6efd' }}></i>
                        <span>{o.seller_email}</span>
                      </div>
                    )}
                    {sellerAddress && (
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-geo-alt text-danger" style={{ fontSize: '1.1rem', color: '#dc3545', marginTop: 1 }}></i>
                        <span>{sellerAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN — Offer Price, Box, Logs, and Buttons */}
                <div className="col-12 col-md-8 col-lg-8.5 ps-md-4">
                  {/* Top Bar inside Right Pane */}
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OFFERED PRICE</span>
                        <span className="status-pill" style={pillStyles[displayStatus] || pillStyles.pending}>
                          {statusLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffc63a', marginTop: 4 }}>
                        ₹{Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="mt-2">
                        <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '1rem' }}>{o.product_title}</h6>
                        <small className="text-muted">#REF-{o.id} &bull; {offerType.charAt(0).toUpperCase() + offerType.slice(1)}</small>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      {(o.status === 'pending' || o.status === 'rejected' || o.status === 'negotiating') && !isExpired && (
                        <>
                          {o.status === 'rejected' ? (
                            <button
                              className="btn px-4 py-2 rounded-pill fw-bold text-white"
                              style={{ background: '#ffc63a', border: 'none', fontSize: '0.82rem' }}
                              onClick={() => openChangeDates(o)}
                            >
                              Make Offer
                            </button>
                          ) : (o.offer_type ?? o.listing_type) === 'rent' && (
                            <button
                              className="btn btn-outline-primary px-3 py-2 rounded-pill fw-bold"
                              style={{ fontSize: '0.82rem' }}
                              onClick={() => openChangeDates(o)}
                            >
                              Change Dates
                            </button>
                          )}
                          
                          {o.status === 'negotiating' && (
                            <button
                              className="btn px-4 py-2 rounded-pill fw-bold text-white"
                              style={{ background: '#ffc63a', border: 'none', fontSize: '0.82rem' }}
                              onClick={() => setActionModal({ id: o.id, action: 'accept_dates', title: o.product_title, message: 'Are you sure you want to accept the seller\'s suggested dates?' })}
                            >
                              Accept Dates
                            </button>
                          )}

                          <button
                            className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-bold"
                            style={{ fontSize: '0.82rem' }}
                            onClick={() => setActionModal({ id: o.id, action: 'cancel', title: o.product_title, message: 'Are you sure you want to cancel this offer?' })}
                          >
                            {o.status === 'rejected' ? 'Close Offer' : 'Cancel Offer'}
                          </button>
                        </>
                      )}

                      {o.status === 'accepted' && !Number(o.buyer_rated_seller) && (
                        <button
                          className="btn px-4 py-2 rounded-pill fw-bold text-white"
                          style={{ background: '#ffc63a', border: 'none', fontSize: '0.82rem' }}
                          onClick={() => setRatingModal({ id: o.id, title: o.product_title })}
                        >
                          <i className="bi bi-star-fill me-1"></i> Rate Seller
                        </button>
                      )}
                      {o.status === 'accepted' && Number(o.buyer_rated_seller) === 1 && (
                        <span className="badge bg-light text-success border py-2 px-3 rounded-pill fw-bold" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.78rem' }}>
                          <i className="bi bi-check-circle-fill me-1"></i> Rated
                        </span>
                      )}

                      <Link
                        href={`/buyer/product/${o.product_id}`}
                        className="btn btn-outline-secondary px-4 py-2 rounded-pill fw-bold"
                        style={{ fontSize: '0.82rem', textDecoration: 'none' }}
                      >
                        View Item
                      </Link>
                    </div>
                  </div>

                  {/* Rent Info Box */}
                  {offerType === 'rent' && o.rental_start_date && (
                    <div style={{
                      border: '1px solid #e9ecef', background: '#f8f9fa',
                      borderRadius: 16, padding: '16px 20px', marginBottom: 20
                    }}>
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Product Rental:</span>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>₹{Number(o.rental_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/day</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Security Deposit:</span>
                        <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>₹{Number(o.deposit_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <hr style={{ margin: '12px 0', borderColor: '#e9ecef' }} />
                      <div className="d-flex align-items-center flex-wrap gap-2 text-dark font-medium" style={{ fontSize: '0.9rem' }}>
                        <i className="bi bi-calendar3 text-primary me-1" style={{ fontSize: '1rem', color: '#0d6efd' }}></i>
                        <span className="fw-semibold">{startFormatted} - {endFormatted}</span>
                        <span className="badge text-white px-3 py-1.5 rounded-pill" style={{ background: '#6c757d', fontSize: '0.75rem', fontWeight: 600 }}>{days} days</span>
                      </div>
                    </div>
                  )}

                  {/* Message & Alerts */}
                  {(isExpired || o.status === 'missed') && (
                    <div className="alert border-0 py-3 px-4 mb-3" style={{ background: '#fff5f5', borderRadius: 12, border: '1px solid #ffd0d0' }}>
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-clock-history" style={{ fontSize: '1.2rem', color: '#d63031', marginTop: 2 }}></i>
                        <div>
                          <div className="fw-bold mb-1" style={{ fontSize: '0.88rem', color: '#d63031' }}>
                            ⏰ Offer Expired — No Response from Seller
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.5' }}>
                            {o.status === 'missed'
                              ? `This offer was marked as missed by the system. The seller did not respond within the allowed window (deadline: ${expiryDate}).`
                              : `This offer expired on ${expiryDate}. The seller did not respond within the acceptance window.`
                            }
                          </div>
                          <div className="mt-2" style={{ fontSize: '0.78rem', color: '#888' }}>
                            You can browse the marketplace to find similar items and make a new offer.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {o.message && (
                    <div className="alert alert-info border-0 py-3 px-4 mb-3" style={{ background: '#e3f2fd', borderRadius: 12 }}>
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-chat-quote-fill text-primary mt-1" style={{ fontSize: '1.1rem' }}></i>
                        <div>
                          <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.85rem' }}>Your Message:</div>
                          <div className="text-dark" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{o.message}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {o.status === 'negotiating' && o.message && (
                    <div className="alert alert-warning py-2 px-3 mt-2 rounded-3 border-0 small mb-3" style={{ background: '#fff3cd' }}>
                      <i className="bi bi-info-circle-fill me-2"></i>
                      <strong>Action Required:</strong> Seller has responded to your offer.
                    </div>
                  )}
                  {o.seller_remarks && (
                    <div className="mb-3 p-2 rounded-3 border-start border-4 border-warning bg-warning-subtle small text-dark fw-medium">
                      <i className="bi bi-reply-fill me-1"></i>
                      Seller: {o.seller_remarks}
                    </div>
                  )}

                  {/* Conflict Alert */}
                  {o.conflict_info && (
                    <div className="conflict-alert mb-3">
                      <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.2rem' }}></i>
                      <div>
                        {o.conflict_info.message}
                        {o.conflict_info.type === 'rent_conflict' && (
                          <>
                            <br />
                            <small style={{ fontWeight: 400, opacity: 0.75 }}>
                              You can try changing your dates to something else.
                            </small>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logs Section */}
                  {(() => {
                    const sortedHistory = [...(o.history || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const steps = [
                      ...sortedHistory.map(h => ({
                        label: getHistoryLabel(h.action),
                        date: new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          + (h.new_start_date && h.new_end_date
                            ? ` • ${new Date(h.new_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(h.new_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                            : ''),
                        icon: getHistoryIcon(h.action),
                      })),
                      {
                        label: 'Offer Initiated',
                        date: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                        icon: 'fa-solid fa-tag',
                      },
                    ];
                    return (
                      <div style={{ background: '', padding: '0 8px', marginTop: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                          <i className="bi bi-clock-history" style={{ color: '#D7B467', fontSize: '1.1rem' }}></i> Date/Time Logs
                        </div>
                        {steps.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.75rem' }}>
                            {/* number + line */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <div style={{
                                width: 28, height: 28, background: '#D7B467', color: '#fff',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 13,
                              }}>
                                {idx + 1}
                              </div>
                              {idx < steps.length - 1 && (
                                <div style={{ width: 2, flex: 1, background: '#ccc', minHeight: 22, marginTop: 3 }} />
                              )}
                            </div>
                            {/* content */}
                            <div style={{ paddingBottom: idx < steps.length - 1 ? '0.85rem' : 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1F2937' }}>{step.label}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{step.date}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Confirm Action Modal (Cancel / Accept Dates) ── */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 16, textAlign: 'center' }}>
              {actionModal.action === 'cancel' ? '🚫' : '✅'}
            </div>
            <h5 className="fw-bold text-center mb-2" style={{ fontSize: '1.1rem' }}>
              {actionModal.action === 'cancel' ? 'Cancel Offer' : 'Accept Suggested Dates'}
            </h5>
            <p className="text-muted text-center mb-4" style={{ fontSize: '0.9rem' }}>
              {actionModal.message || (actionModal.action === 'cancel'
                ? `Are you sure you want to cancel your offer on "${actionModal.title}"?`
                : `Accept the seller's suggested dates for "${actionModal.title}"?`)}
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <button
                className="btn btn-outline-secondary px-4 rounded-pill fw-bold"
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
              >
                No, Go Back
              </button>
              <button
                className="btn fw-bold px-4 rounded-pill text-white"
                style={{ background: actionModal.action === 'cancel' ? '#d63031' : '#ffc63a', border: 'none' }}
                onClick={actionModal.action === 'cancel' ? handleCancel : handleAcceptDates}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                ) : null}
                {actionModal.action === 'cancel' ? 'Yes, Cancel' : 'Yes, Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Dates Modal ── */}
      {changeDatesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0" style={{ fontSize: '1.1rem' }}>
                <i className="bi bi-calendar3 me-2" style={{ color: '#ffc63a' }}></i>
                Change Rental Dates
              </h5>
              <button
                type="button"
                onClick={() => setChangeDatesModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <p className="text-muted small mb-3">
              Updating dates for: <strong>{changeDatesModal.title}</strong>
            </p>

            <RentalCalendar
              bookedRanges={cdBookedRanges}
              startDate={cdStart}
              endDate={cdEnd}
              onRangeChange={(s, e) => { setCdStart(s); setCdEnd(e); }}
              minRentalDays={minRentalDays}
            />

            {cdStart && cdEnd && (
              <div className="mt-3 p-3 rounded-3" style={{ background: '#fffdf0', border: '1px solid #ffc63a44', fontSize: '0.85rem' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Estimated Total:</span>
                  <span className="fw-bold" style={{ color: '#ffc63a', fontSize: '1.1rem' }}>
                    ₹{Number(cdPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {cdError && (
              <div className="alert alert-danger py-2 px-3 mt-3 rounded-3 small border-0">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>{cdError}
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill rounded-pill fw-bold"
                onClick={() => setChangeDatesModal(null)}
                disabled={cdLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn flex-fill rounded-pill fw-bold text-white"
                style={{ background: '#ffc63a', border: 'none' }}
                onClick={handleChangeDates}
                disabled={cdLoading || !cdStart || !cdEnd}
              >
                {cdLoading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                ) : null}
                Update Dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rating Modal ── */}
      {ratingModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setRatingModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">Reward User</h5>
                <button type="button" className="btn-close" onClick={() => setRatingModal(null)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <p className="text-muted mb-4">You are about to give <strong>+1 Point</strong> for <strong>{ratingModal.title}</strong>.</p>
                <div className="d-flex justify-content-center mb-3">
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ffc63a22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-star-fill" style={{ fontSize: '3rem', color: '#ffc63a' }}></i>
                  </div>
                </div>
                <div className="h5 fw-bold text-gold">
                  Give +1 Point!
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setRatingModal(null)}>Cancel</button>
                <button className="bg-gold text-white py-2 rounded-pill px-4 fw-bold" onClick={handleRateSubmit} disabled={ratingLoading}>
                  {ratingLoading ? 'Submitting…' : 'Yes, Give Point'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </DashboardLayout>
  );
}

