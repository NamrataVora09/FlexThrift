'use client';

import { useEffect, useState, useRef, ChangeEvent, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { RentalCalendar } from './RentalCalendar';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

/* ─────────────────────────── types ─────────────────────────── */

interface OfferHistory {
  id: number;
  action: string;
  new_start_date?: string;
  new_end_date?: string;
  created_at: string;
}

interface Offer {
  id: number;
  product_id: number;
  product_title: string;
  product_number?: string;
  product_image?: string;
  product_rental_cost?: number;
  product_rental_deposit?: number;
  product_views?: number;
  dispatch_city?: string;
  dispatch_state?: string;
  seller_id: number;
  buyer_id: number;
  offer_price: number;
  offered_price?: number;
  original_price?: number;
  status: string;
  listing_type: string;
  offer_type?: string;
  seller_remarks?: string;
  buyer_name?: string;
  buyer_mobile?: string;
  buyer_email?: string;
  buyer_rating_avg?: number;
  buyer_rating_count?: number;
  buyer_reliability_score?: number;
  seller_name?: string;
  seller_rating_avg?: number;
  seller_rating_count?: number;
  message?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_pin_code?: string;
  deposit_amount?: number;
  created_at: string;
  updated_at?: string;
  accepted_at?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  perspective?: 'buyer' | 'seller' | 'sent' | 'received';
  buyer_rated_seller?: boolean | number;
  seller_rated_buyer?: boolean | number;
  is_product_sold?: number;
  is_rental_blocked?: number;
  linked_order_status?: string;
  contact_viewed_at?: string;
  history?: OfferHistory[];
  rental_cost?: number;
}


const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

interface Props {
  role: string;
  apiPath: string;
  perspective: 'buyer' | 'seller' | 'combined';
  noLayout?: boolean;
  noHeader?: boolean;
}

/* ─────────────────────────── helpers ───────────────────────── */

function historyLabel(action: string) {
  switch (action) {
    case 'initial_offer': return 'Offer Initiated';
    case 'buyer_date_update': return 'Buyer updated dates';
    case 'seller_suggest_dates': return 'Seller suggested new dates';
    case 'buyer_accept_negotiation': return 'Buyer accepted suggested dates';
    default: return action;
  }
}

function historyIcon(action: string) {
  switch (action) {
    case 'initial_offer': return 'fa-solid fa-tag';
    case 'buyer_date_update': return 'fa-solid fa-calendar-plus';
    case 'seller_suggest_dates': return 'fa-solid fa-calendar-days';
    case 'buyer_accept_negotiation': return 'fa-solid fa-calendar-check';
    default: return 'fa-solid fa-clock';
  }
}

const REJECTED_STATUSES = ['rejected', 'cancelled', 'missed'];

function fmtShort(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtFull(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function daysBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  // Use +1 to count days inclusively (e.g., 15th to 17th is 3 days)
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

/** 
 * Robust date comparison helper: converts "YYYY-MM-DD" to YYYYMMDD number.
 * Avoids all timezone/parsing issues of the JS Date object.
 */
function toDateVal(d?: any): number {
  if (!d) return 0;
  try {
    const s = String(d).trim();
    if (!s) return 0;

    // 1. Try ISO format (YYYY-MM-DD)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return Number(`${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`);
    }

    // 2. Try common formats (DD-MM-YYYY or DD/MM/YYYY)
    const commonMatch = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (commonMatch) {
      return Number(`${commonMatch[3]}${commonMatch[2]}${commonMatch[1]}`);
    }

    // 3. Last resort: JS Date object
    const date = new Date(s);
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return Number(`${y}${m}${day}`);
    }

    // 4. Ultimate fallback: just strip non-digits
    const clean = s.split(' ')[0].replace(/\D/g, '');
    if (clean.length === 8) {
      if (Number(clean.substring(0, 4)) > 1900) return Number(clean); // likely YYYYMMDD
      return Number(clean.substring(4, 8) + clean.substring(2, 4) + clean.substring(0, 2)); // likely DDMMYYYY
    }
    return Number(clean) || 0;
  } catch (e) {
    return 0;
  }
}

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${BASE_URL}/${path}`;
  if (path.startsWith('/uploads/')) return `${BASE_URL}${path}`;
  return `${BASE_URL}/uploads/products/${path}`;
}

/* ─────────────────── CSS (exact copy from PHP reference) ───── */

const CSS = `
  /* ── filter tabs (offers_new.php) ── */
  .filter-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .filter-tabs .nav-link {
    padding: 8px 18px;
    border-radius: 50px;
    font-size: 13px;
    font-weight: 700;
    border: 1px solid #eee;
    background: #fff;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none !important;
  }
  .filter-tabs .nav-link:hover { color: #666 !important; background: #fff; border-color: #eee; }
  .filter-tabs .nav-link.active { background: #ffc63a; color: #fff !important; border-color: #ffc63a; }
  .filter-tabs .nav-link .count-badge { background: rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-left: 6px; }
  .filter-tabs .nav-link.active .count-badge { background: rgba(255,255,255,0.25); }

  /* ── product group (seller view) ── */
  .product-group { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 30px; border: 1px solid #eee; }
  .product-header { background: #fffdf8; padding: 20px 25px; border-bottom: 1px solid #f9e6b3; display: flex; align-items: center; }
  .product-thumb { width: 65px; height: 65px; border-radius: 12px; object-fit: cover; margin-right: 20px; border: 2px solid #ffc63a; flex-shrink: 0; }

  /* ── offer row (seller view) ── */
  .offer-row { padding: 25px; border-bottom: 1px solid #f8f8f8; transition: all 0.3s ease; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .offer-row:last-child { border-bottom: none; }
  .offer-row:hover { background-color: #fffef5; }

  /* ── buyer avatar ── */
  .buyer-avatar { width: 45px; height: 45px; background: #000; color: #ffc63a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; margin-right: 15px; font-family: 'Maven Pro', sans-serif; flex-shrink: 0; }

  /* ── buyer contact item ── */
  .buyer-contact-item { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #555; margin-bottom: 3px; }

  /* ── seller status pill ── */
  .status-pill { font-size: 0.7rem; padding: 5px 12px; border-radius: 50px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; }
  .status-pending   { background: #FFF9E6; color: #D7B467; }
  .status-accepted  { background: #E7F9ED; color: #15BD66; }
  .status-rejected  { background: #FDEEEE; color: #EB5757; }
  .status-negotiating { background: #E1F5FE; color: #01579B; }
  .status-cancelled { background: #f1f3f5; color: #868e96; }

  /* ── price ── */
  .price-tag { font-family: 'Maven Pro', sans-serif; font-size: 1.25rem; font-weight: 800; color: #000; }
  .original-price-strikethrough { font-size: 0.82rem; color: #aaa; text-decoration: line-through; }

  /* ── rental info box ── */
  .rental-info-box { background: #fffdf8 !important; border: 1px solid #f9e6b3; border-radius: 12px; padding: 10px 14px; }

  /* ── conflict warning (seller) ── */
  .conflict-warning { background: #fff1f2; color: #e11d48; border: 1px solid #fda4af; border-radius: 8px; padding: 8px 12px; font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; gap: 8px; }

  /* ── delivery box ── */
  .delivery-box { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 8px 12px; }

  /* ── buttons ── */
  .btn-yellow { background-color: #ffc63a; color: #000; border: none; border-radius: 10px; font-weight: 700; padding: 8px 16px; transition: all 0.3s ease; cursor: pointer; }
  .btn-yellow:hover { background-color: #000; color: #fff; }
  .btn-outline-dark-custom { border: 1px solid #ddd; color: #666; border-radius: 10px; font-weight: 600; padding: 8px 16px; transition: all 0.3s ease; background: transparent; cursor: pointer; }
  .btn-outline-dark-custom:hover { background: #f8f9fa; border-color: #000; color: #000; }

  /* ── product meta badge ── */
  .product-meta-badge { font-size: 0.75rem; background: #f8f9fa; padding: 5px 12px; border-radius: 8px; color: #666; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }

  /* ── badge colors ── */
  .badge-rent  { background: #e0f2f1; color: #00897b; }
  .badge-sell  { background: #e8eaf6; color: #3949ab; }

  /* ───────────────────────────────────────────────────────────
     BUYER my_offers.php styles
  ─────────────────────────────────────────────────────────── */

  .luxury-item-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #eee; margin-bottom: 20px; transition: all 0.3s ease; }
  .luxury-item-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-color: #ffc63a; }
  .item-img { width: 100px; height: 125px; object-fit: cover; border-radius: 12px; }

  /* buyer status pills use pill-* prefix */
  .pill-pending     { background: #f8f9fa; color: #666; border: 1px solid #eee; }
  .pill-accepted    { background: #eaffea; color: #1a8a1a; border: 1px solid #c9f9c9; }
  .pill-rejected    { background: #fff5f5; color: #d63031; border: 1px solid #ffeaea; }
  .pill-cancelled   { background: #f1f3f5; color: #868e96; border: 1px solid #dee2e6; }
  .pill-negotiating { background: #ffc63a; color: #000; border: 1px solid #ffdb7e; }

  .price-badge { font-size: 1.5rem; font-weight: 800; color: #000; }

  .btn-modern-cancel { background: #fff5f5; color: #d63031; border: 1px solid #ffeaea; padding: 10px 18px; border-radius: 10px; font-weight: 700; transition: 0.2s; cursor: pointer; width: 100%; }
  .btn-modern-cancel:hover { background: #d63031; color: white; }

  /* conflict alert (buyer) */
  .conflict-alert { background: #fff1f2; color: #e11d48; border: 1px solid #fda4af; border-radius: 12px; padding: 12px 16px; margin-top: 15px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 10px; }

  /* no-data box */
  .no-data { padding: 80px 0; text-align: center; background: white; border-radius: 20px; border: 1px solid #eee; }

  /* history */
  .history-item { display: flex; gap: 8px; margin-bottom: 8px; }

  /* change dates modal */
  .rental-date-range-container { border: 1px solid #eee; border-radius: 12px; padding: 15px; transition: 0.3s; cursor: pointer; background: #f8f9fa; }
  .rental-date-range-container:hover { border-color: #ffc63a; background: #fff; }
  .calendar-icon-bg { width: 40px; height: 40px; background: #ffc63a; color: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  /* admin table */
  .direction-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
  .direction-sent { background: #fff4e5; color: #ed6c02; }
  .direction-received { background: #e3f2fd; color: #1976d2; }
  .admin-table th { background: #f8f9fa; color: #666; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 15px 20px; border: none; }
  .admin-table td { padding: 18px 20px; border-bottom: 1px solid #f1f1f1; }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table .product-img { width: 45px; height: 45px; border-radius: 8px; object-fit: cover; }
`;

/* ─────────────────────────── main component ────────────────── */

export default function OffersView({ role, apiPath, perspective, noLayout, noHeader }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ acceptanceLimitDays: 7, ratingPeriod: 7, rejectionWindowHours: 24, minRentalDays: 3 });
  const [bookedDates, setBookedDates] = useState<{ product_id: number; rental_start_date: string; rental_end_date: string }[]>([]);

  /* modals */
  const [ratingModal, setRatingModal] = useState<{ id: number; title: string; target: 'seller' | 'buyer' } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [actionModal, setActionModal] = useState<{ id: number; action: 'accept' | 'reject' | 'cancel'; title: string; offer?: Offer } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [dateModal, setDateModal] = useState<{
    id: number;
    title: string;
    start: string;
    end: string;
    price?: number | string;
    type?: string;
    status?: string;
    rentalCostPerDay?: number;
    depositAmount?: number;
    delivery_address?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_pin_code?: string;
  } | null>(null);
  const [dateLoading, setDateLoading] = useState(false);

  /* ── change dates modal (buyer) ── */
  const [changeDatesModal, setChangeDatesModal] = useState<{ offer: Offer } | null>(null);
  const [cdStart, setCdStart] = useState('');
  const [cdEnd, setCdEnd] = useState('');
  const [cdAddress, setCdAddress] = useState('');
  const [cdPin, setCdPin] = useState('');
  const [cdLoading, setCdLoading] = useState(false);

  /* ── suggest dates modal (seller) ── */
  const [suggestModal, setSuggestModal] = useState<{ offer: Offer } | null>(null);
  const [sdStart, setSdStart] = useState('');
  const [sdEnd, setSdEnd] = useState('');
  const [sdRemarks, setSdRemarks] = useState('');
  const [bookedRanges, setBookedRanges] = useState<{ start: string; end: string }[]>([]);
  const [sdLoading, setSdLoading] = useState(false);

  useEffect(() => {
    const productId = dateModal?.id || suggestModal?.offer?.product_id;
    if (productId) {
      api.get<{ booked_ranges: { start: string; end: string }[] }>(`/product/${productId}/booked-dates`)
        .then(res => { if (res.success && res.data) setBookedRanges(res.data.booked_ranges); })
        .catch(() => { });
    } else {
      setBookedRanges([]);
    }
  }, [dateModal?.id, suggestModal?.offer?.product_id]);

  /* ── accept-or-suggest choice modal (seller, rent only) ── */
  const [acceptChoiceModal, setAcceptChoiceModal] = useState<{ offer: Offer } | null>(null);

  /* ── data loading ── */
  const load = () => {
    setLoading(true);
    api.get<Offer[]>(apiPath).then((r: any) => {
      if (r.success && r.data) setOffers(r.data);
      if (r.bookedDates) setBookedDates(r.bookedDates);
      if (r.acceptanceLimitDays != null) {
        setSettings({
          acceptanceLimitDays: r.acceptanceLimitDays ?? 7,
          ratingPeriod: r.ratingPeriod ?? 7,
          rejectionWindowHours: r.rejectionWindowHours ?? 24,
          minRentalDays: r.minRentalDays ?? 3,
        });
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [apiPath, perspective]);

  /* ── accept / reject / cancel ── */
  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    let res;
    if (actionModal.action === 'accept') res = await api.post(`/seller/accept-offer/${actionModal.id}`, { remarks });
    else if (actionModal.action === 'reject') res = await api.post(`/seller/reject-offer/${actionModal.id}`, { remarks });
    else res = await api.post(`/buyer/cancel-offer/${actionModal.id}`);
    setActionLoading(false);
    if (res?.success) {
      toast.success(`Offer ${actionModal.action === 'accept' ? 'accepted' : actionModal.action === 'reject' ? 'rejected' : 'cancelled'}`);
      setActionModal(null);
      setRemarks('');
      load();
    }
    else toast.error(res?.message || 'Action failed');
  };

  /* ── rating ── */
  const handleRateSubmit = async () => {
    if (!ratingModal) return;
    setRatingLoading(true);
    const endpoint = ratingModal.target === 'seller' ? '/buyer/rate-seller' : '/seller/rate-buyer';
    const res = await api.post<any>(endpoint, { offer_id: ratingModal.id, rating: 5 });
    setRatingLoading(false);
    if (res.success) {
      toast.success('Rating submitted!');
      setRatingModal(null);
      load();
    }
    else toast.error(res.message || 'Failed to submit rating');
  };

  /* ── update dates ── */
  const handleUpdateDates = async () => {
    if (!dateModal) return;
    setDateLoading(true);

    const dailyRate = Number(dateModal.rentalCostPerDay || 0);
    const days = daysBetween(dateModal.start, dateModal.end);
    const computedPrice = (dateModal.type === 'rent' && dailyRate > 0 && days > 0) ? Math.round(days * dailyRate) : Number(dateModal.price || 0);

    const payload = {
      rental_start_date: dateModal.start,
      rental_end_date: dateModal.end,
      offer_price: computedPrice,
      delivery_address: dateModal.delivery_address,
      delivery_city: dateModal.delivery_city,
      delivery_state: dateModal.delivery_state,
      delivery_pin_code: dateModal.delivery_pin_code
    };

    const res = await api.post(`/buyer/update-offer-dates/${dateModal.id}`, payload);
    setDateLoading(false);
    if (res?.success) {
      toast.success('Offer updated successfully!');
      setDateModal(null);
      load();
    }
    else toast.error(res?.message || 'Update failed');
  };

  /* ── open change dates modal ── */
  const openChangeDates = (offer: Offer) => {
    setChangeDatesModal({ offer });
    setCdStart(offer.rental_start_date || '');
    setCdEnd(offer.rental_end_date || '');
    setCdAddress(offer.delivery_address || '');
    setCdPin(offer.delivery_pin_code || '');
  };

  /* ── submit changed dates ── */
  const submitChangeDates = async () => {
    if (!changeDatesModal) return;
    const { offer } = changeDatesModal;
    const days = daysBetween(cdStart, cdEnd);
    if (days < settings.minRentalDays) {
      toast.error(`Minimum ${settings.minRentalDays} days rental required`);
      return;
    }
    if (!cdAddress || !cdPin) { toast.error('Please fill delivery address and pin code'); return; }
    setCdLoading(true);
    const res = await api.post(`/buyer/update-offer-dates/${offer.id}`, {
      rental_start_date: cdStart,
      rental_end_date: cdEnd,
      delivery_address: cdAddress,
      delivery_pin_code: cdPin,
      offered_price: Math.round(days * Number(offer.rental_cost ?? 0)),
    });
    setCdLoading(false);
    if (res?.success) {
      toast.success('Dates updated!');
      setChangeDatesModal(null);
      load();
    }
    else toast.error(res?.message || 'Failed to update dates');
  };

  /* ── submit seller date suggestion ── */
  const submitSuggestDates = async () => {
    if (!suggestModal) return;
    if (!sdStart || !sdEnd) { toast.error('Please select both start and end dates'); return; }
    if (sdEnd <= sdStart) { toast.error('End date must be after start date'); return; }

    const days = daysBetween(sdStart, sdEnd);
    if (days < settings.minRentalDays) {
      toast.error(`Minimum ${settings.minRentalDays} days rental required`);
      return;
    }

    setSdLoading(true);
    const res = await api.post(`/seller/suggest-dates/${suggestModal.offer.id}`, {
      rental_start_date: sdStart,
      rental_end_date: sdEnd,
      remarks: sdRemarks,
    });
    setSdLoading(false);
    if (res?.success) {
      toast.success('Date suggestion sent to buyer!');
      setSuggestModal(null);
      setSdStart(''); setSdEnd(''); setSdRemarks('');
      load();
    } else {
      toast.error(res?.message || 'Failed to send suggestion');
    }
  };

  /* ── buyer accepts seller-suggested dates ── */
  const handleAcceptDates = async (offer: Offer) => {
    const res = await api.post(`/buyer/confirmDateChange/${offer.id}`, {});
    if (res?.success) {
      toast.success('Dates accepted! Deal is finalized.');
      load();
    } else {
      toast.error(res?.message || 'Action failed');
    }
  };

  /* ── computed ── */
  const productStatusMap = useMemo(() => {
    const map: Record<number, { isSold: boolean; bookedRanges: { start: number; end: number; id: number }[] }> = {};
    offers.forEach(o => {
      if (o.status === 'accepted') {
        const pid = Number(o.product_id);
        if (!map[pid]) map[pid] = { isSold: false, bookedRanges: [] };
        if (o.listing_type === 'sell') map[pid].isSold = true;
        else if (o.listing_type === 'rent' && o.rental_start_date && o.rental_end_date) {
          map[pid].bookedRanges.push({
            start: toDateVal(o.rental_start_date),
            end: toDateVal(o.rental_end_date),
            id: o.id
          });
        }
      }
    });
    return map;
  }, [offers]);

  /**
   * Unified conflict detection logic.
   * Returns conflict info if found, else null.
   */
  const getRentalConflict = (o: Offer): { start: string; end: string; source: 'order' | 'offer'; id?: number } | null => {
    if ((o.offer_type ?? o.listing_type) !== 'rent') return null;
    const status = o.status;
    if (status !== 'pending' && status !== 'negotiating') return null;

    if (!o.rental_start_date || !o.rental_end_date) return null;

    const s1 = toDateVal(o.rental_start_date);
    const e1 = toDateVal(o.rental_end_date);

    // Safety check: if dates are invalid or start > end, we can't check for conflict
    if (!s1 || !e1 || s1 > e1) return null;

    // 1. Check backend-confirmed bookedDates (from orders table)
    for (const b of bookedDates) {
      if (Number(b.product_id) === Number(o.product_id)) {
        const s2 = toDateVal(b.rental_start_date);
        const e2 = toDateVal(b.rental_end_date);

        if (s2 && e2) {
          // Standard overlap check: (Start1 <= End2) AND (End1 >= Start2)
          const overlap = (s1 <= e2 && e1 >= s2);
          if (overlap) {
            return { start: b.rental_start_date, end: b.rental_end_date, source: 'order' };
          }
        }
      }
    }

    // 2. Check accepted offers in the current list
    const pid = Number(o.product_id);
    const ps = productStatusMap[pid];
    if (ps && ps.bookedRanges) {
      for (const r of ps.bookedRanges) {
        // Self-exclusion: Don't conflict with yourself
        if (Number(r.id) === Number(o.id)) continue;

        // Standard overlap check: (Start1 <= End2) AND (End1 >= Start2)
        const overlap = (s1 <= r.end && e1 >= r.start);
        if (overlap) {
          // find the offer to get raw date strings for display
          const other = offers.find(x => Number(x.id) === Number(r.id));
          return {
            start: other?.rental_start_date || '?',
            end: other?.rental_end_date || '?',
            source: 'offer',
            id: r.id
          };
        }
      }
    }

    return null;
  };

  const isRentalBlocked = (o: Offer) => !!getRentalConflict(o);
  const isRentalConflict = (o: Offer) => !!getRentalConflict(o);

  const isSoldOut = (o: Offer) => {
    if (o.listing_type !== 'sell') return false;
    return !!(productStatusMap[o.product_id]?.isSold || (o.is_product_sold && o.is_product_sold > 0));
  };


  const byTime = (a: Offer, b: Offer) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();


  const sorted = (() => {
    const all = [...offers];
    const p = all.filter(o => ['pending', 'negotiating'].includes(o.status)).sort(byTime);
    const r = all.filter(o => REJECTED_STATUSES.includes(o.status)).sort(byTime);
    const a = all.filter(o => o.status === 'accepted').sort(byTime);
    return [...p, ...r, ...a];
  })();

  const filtered = (() => {
    // Step 1: apply perspective + search to get the candidate pool
    const pool = sorted.filter(o => {
      if (perspective === 'buyer' && o.perspective && o.perspective !== 'sent') return false;
      if (perspective === 'seller' && o.perspective && o.perspective !== 'received') return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        o.product_title?.toLowerCase().includes(q) ||
        o.buyer_name?.toLowerCase().includes(q) ||
        o.seller_name?.toLowerCase().includes(q) ||
        o.product_number?.toLowerCase().includes(q) ||
        o.delivery_city?.toLowerCase().includes(q) ||
        o.dispatch_city?.toLowerCase().includes(q)
      );
    });

    // Step 2: when no status filter active, return everything (already grouped)
    if (filter === '') return pool;

    // Step 3 (product-level filter): find all product_ids that have ≥1 offer matching the status
    const statusMatch = (o: Offer) => {
      if (filter === 'rejected') return REJECTED_STATUSES.includes(o.status);
      if (filter === 'pending') return ['pending', 'negotiating'].includes(o.status);
      return o.status === filter;
    };
    const matchingProductIds = new Set(
      pool.filter(o => statusMatch(o)).map(o => o.product_id)
    );

    // Step 4: return ALL offers belonging to those qualifying products
    return pool.filter(o => matchingProductIds.has(o.product_id));
  })();

  /* ── render ── */
  const content = (
    <div className={noLayout ? '' : 'container-fluid py-4'}>
      <style>{CSS}</style>

      {!noHeader && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4 }}>
              {perspective === 'buyer'
                ? 'Sent Proposals'
                : 'Offers Received'}
            </h2>
            <p className="text-muted mb-0">
              {perspective === 'buyer'
                ? 'Track offers and negotiation status with sellers.'
                : 'Manage buying requests and rental bookings on Flex Market'}
            </p>
          </div>
        </div>
      )}

      {/* Status Filter + Search */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div className="filter-tabs mb-0">
          {[
            { key: '', label: 'All', count: sorted.length },
            { key: 'pending', label: 'Pending', count: offers.filter(o => ['pending', 'negotiating'].includes(o.status)).length },
            { key: 'accepted', label: 'Accepted', count: offers.filter(o => o.status === 'accepted').length },
            { key: 'rejected', label: 'Rejected', count: offers.filter(o => REJECTED_STATUSES.includes(o.status)).length },
          ].map(({ key, label, count }) => (
            <button key={key} className={`nav-link ${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
              {label}<span className="count-badge">{count}</span>
            </button>
          ))}
        </div>
        <div className="input-group" style={{ maxWidth: 280 }}>
          <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '12px 0 0 12px', border: '1px solid #eee' }}>
            <i className="bi bi-search text-muted" style={{ fontSize: '0.85rem' }}></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Search offers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: '0 12px 12px 0', border: '1px solid #eee', borderLeft: 'none', fontSize: '0.88rem' }}
          />
          {search && (
            <button className="btn btn-link position-absolute end-0 top-50 translate-middle-y pe-2 text-muted" style={{ zIndex: 5, fontSize: '0.8rem' }} onClick={() => setSearch('')}>
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="no-data shadow-sm">
          <i className="bi bi-inbox" style={{ fontSize: 64, color: '#ccc' }}></i>
          <h5 className="mt-3 text-muted">No offers found</h5>
        </div>
      ) : perspective === 'seller' ? (
        <SellerView
          offers={filtered}
          settings={settings}
          isRentalBlocked={isRentalBlocked}
          getRentalConflict={getRentalConflict}
          onAccept={o => {
            if ((o.offer_type ?? o.listing_type) === 'rent') {
              setAcceptChoiceModal({ offer: o });
            } else {
              setActionModal({ id: o.id, action: 'accept', title: o.product_title, offer: o });
              setRemarks('');
            }
          }}
          onReject={o => { setActionModal({ id: o.id, action: 'reject', title: o.product_title, offer: o }); setRemarks(''); }}
          onRate={o => { setRatingModal({ id: o.id, title: o.product_title, target: 'buyer' }); setRatingValue(5); }}
        />
      ) : perspective === 'buyer' ? (
        <BuyerView
          offers={filtered}
          settings={settings}
          isRentalConflict={isRentalConflict}
          getRentalConflict={getRentalConflict}
          isSoldOut={isSoldOut}
          onCancel={o => setActionModal({ id: o.id, action: 'cancel', title: o.product_title })}
          onRate={o => { setRatingModal({ id: o.id, title: o.product_title, target: 'seller' }); setRatingValue(5); }}
          onUpdateDates={o => setDateModal({
            id: o.id,
            title: o.product_title,
            start: o.rental_start_date || '',
            end: o.rental_end_date || '',
            price: o.offered_price ?? o.offer_price,
            type: o.offer_type ?? o.listing_type,
            status: o.status,
            rentalCostPerDay: Number(o.product_rental_cost ?? o.rental_cost ?? 0),
            depositAmount: Number(o.product_rental_deposit ?? o.deposit_amount ?? 0),
            delivery_address: o.delivery_address || '',
            delivery_city: o.delivery_city || '',
            delivery_state: o.delivery_state || '',
            delivery_pin_code: o.delivery_pin_code || ''
          })}
          onAcceptDates={handleAcceptDates}
        />
      ) : (
        <BuyerView
          offers={filtered}
          settings={settings}
          role={role}
          isRentalConflict={isRentalConflict}
          getRentalConflict={getRentalConflict}
          isSoldOut={isSoldOut}
          onAccept={o => (o.offer_type ?? o.listing_type) === 'rent' ? setAcceptChoiceModal({ offer: o }) : setActionModal({ id: o.id, action: 'accept', title: o.product_title, offer: o })}
          onReject={o => { setActionModal({ id: o.id, action: 'reject', title: o.product_title, offer: o }); setRemarks(''); }}
          onCancel={o => setActionModal({ id: o.id, action: 'cancel', title: o.product_title })}
          onRate={o => { setRatingModal({ id: o.id, title: o.product_title, target: 'seller' }); setRatingValue(5); }}
          onUpdateDates={o => setDateModal({
            id: o.id,
            title: o.product_title,
            start: o.rental_start_date || '',
            end: o.rental_end_date || '',
            price: o.offered_price ?? o.offer_price,
            type: o.offer_type ?? o.listing_type,
            status: o.status,
            rentalCostPerDay: Number(o.product_rental_cost ?? o.rental_cost ?? 0),
            depositAmount: Number(o.product_rental_deposit ?? o.deposit_amount ?? 0),
            delivery_address: o.delivery_address || '',
            delivery_city: o.delivery_city || '',
            delivery_state: o.delivery_state || '',
            delivery_pin_code: o.delivery_pin_code || ''
          })}
          onAcceptDates={handleAcceptDates}
        />
      )}
    </div>
  );

  const modals = (
    <>
      {/* ── Accept / Reject / Cancel Modal ── */}
      {actionModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setActionModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  {actionModal.action === 'cancel'
                    ? 'Cancel Proposal?'
                    : actionModal.action === 'accept'
                      ? 'Accept Offer'
                      : actionModal.offer?.status === 'accepted'
                        ? 'Retract Acceptance?'
                        : 'Reject Offer'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setActionModal(null)}></button>
              </div>
              <div className="modal-body px-4 pt-3">
                <p className="text-muted">
                  {actionModal.action === 'cancel'
                    ? `Are you sure you want to withdraw this offer on "${actionModal.title}"? This action cannot be undone.`
                    : actionModal.action === 'accept'
                      ? `Accept offer on "${actionModal.title}"?`
                      : actionModal.offer?.status === 'accepted'
                        ? `You are about to retract your acceptance of the offer on "${actionModal.title}". The linked order will be cancelled and the product will be relisted. This action cannot be undone.`
                        : `Reject offer on "${actionModal.title}"?`}
                </p>
                {actionModal.action !== 'cancel' && (
                  <>
                    <label className="form-label fw-bold small text-uppercase">Remarks (optional)</label>
                    <textarea className="form-control rounded-3" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks…" />
                  </>
                )}
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setActionModal(null)}>
                  {actionModal.action === 'cancel' ? 'No, keep it' : 'Close'}
                </button>
                <button
                  className={`btn rounded-pill px-4 fw-bold ${actionModal.action === 'accept' ? 'btn-warning' : 'btn-danger'}`}
                  onClick={handleAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing…'
                    : actionModal.action === 'cancel'
                      ? 'Yes, withdraw it!'
                      : actionModal.action === 'accept'
                        ? 'Accept'
                        : actionModal.offer?.status === 'accepted'
                          ? 'Yes, Retract Acceptance'
                          : 'Reject'}
                </button>
              </div>
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
                <div className="h5 fw-bold text-dark">
                  Give +1 Point!
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setRatingModal(null)}>Cancel</button>
                <button className="btn btn-dark rounded-pill px-4 fw-bold" onClick={handleRateSubmit} disabled={ratingLoading}>
                  {ratingLoading ? 'Submitting…' : 'Yes, Give Point'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Date/Offer Update Modal ── */}
      {dateModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setDateModal(null)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calendar3 me-2" style={{ color: '#ffc63a' }}></i>
                  {dateModal.status === 'rejected' ? 'Make Offer Again' : 'Update Rental Details'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setDateModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-4">
                  {dateModal.status === 'rejected'
                    ? `You are re-submitting your offer for "${dateModal.title}".`
                    : `Modify the proposal details for "${dateModal.title}"`}
                </p>

                {dateModal.type === 'rent' && (
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold small">Select Rental Dates</span>
                    </div>
                    <RentalCalendar
                      bookedRanges={bookedRanges}
                      startDate={dateModal.start}
                      endDate={dateModal.end}
                      onRangeChange={(start, end) => setDateModal({ ...dateModal, start, end })}
                      minRentalDays={settings.minRentalDays || 3}
                    />

                    <div className="mt-4 mb-3">
                      <label className="form-label fw-bold small">Deposit Amount (₹)</label>
                      <input
                        type="text"
                        className="form-control bg-light rounded-3"
                        value={Number(dateModal.depositAmount || 0).toLocaleString('en-IN')}
                        readOnly
                        style={{ cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-bold small">Offer Price (₹)</label>
                  {(() => {
                    const daily = Number(dateModal.rentalCostPerDay ?? 0);
                    const days = daysBetween(dateModal.start, dateModal.end);
                    const computed = (dateModal.type === 'rent' && daily > 0 && days > 0)
                      ? Math.round(days * daily)
                      : Number(dateModal.price || 0);
                    return (
                      <input
                        type="text"
                        className="form-control bg-warning bg-opacity-10 border-warning fw-bold"
                        value={`₹${computed.toLocaleString('en-IN')}`}
                        readOnly
                        style={{ cursor: 'default' }}
                      />
                    );
                  })()}
                  {dateModal.type === 'rent' && (dateModal.rentalCostPerDay ?? 0) > 0 && dateModal.start && dateModal.end && (
                    <small className="text-muted mt-1 d-block">
                      Calculated: ₹{Number(dateModal.rentalCostPerDay || 0).toLocaleString('en-IN')} × {daysBetween(dateModal.start, dateModal.end)} days
                    </small>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small">Delivery Address</label>
                  <textarea
                    className="form-control rounded-3 mb-2"
                    rows={2}
                    value={dateModal.delivery_address}
                    onChange={e => setDateModal({ ...dateModal, delivery_address: e.target.value })}
                    placeholder="Street, House No, Landmark"
                  />
                  <div className="row g-2">
                    <div className="col-6">
                      <input type="text" className="form-control rounded-3" value={dateModal.delivery_city} onChange={e => setDateModal({ ...dateModal, delivery_city: e.target.value })} placeholder="City" />
                    </div>
                    <div className="col-6">
                      <input type="text" className="form-control rounded-3" value={dateModal.delivery_state} onChange={e => setDateModal({ ...dateModal, delivery_state: e.target.value })} placeholder="State" />
                    </div>
                    <div className="col-12">
                      <input type="text" className="form-control rounded-3" value={dateModal.delivery_pin_code} maxLength={6} onChange={e => setDateModal({ ...dateModal, delivery_pin_code: e.target.value.replace(/\D/g, '') })} placeholder="PIN Code" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 mt-0">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setDateModal(null)}>Cancel</button>
                <button
                  className="btn btn-dark rounded-pill px-4 fw-bold"
                  onClick={handleUpdateDates}
                  disabled={dateLoading || (dateModal.type === 'rent' && (!dateModal.start || !dateModal.end))}
                >
                  {dateLoading ? 'Wait…' : (dateModal.status === 'rejected' ? 'Submit Offer' : 'Update Offer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept-or-Suggest choice modal (seller, rent offers) ── */}
      {acceptChoiceModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setAcceptChoiceModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">Accept Offer</h5>
                <button type="button" className="btn-close" onClick={() => setAcceptChoiceModal(null)}></button>
              </div>
              <div className="modal-body px-4 pt-2 pb-4">
                <p className="text-muted small mb-4">Choose how you want to accept this offer for <strong>{acceptChoiceModal.offer.product_title}</strong>.</p>
                <div className="d-grid gap-3">
                  <button
                    className="btn btn-warning fw-bold rounded-3 py-3"
                    onClick={() => {
                      const o = acceptChoiceModal.offer;
                      setAcceptChoiceModal(null);
                      setActionModal({ id: o.id, action: 'accept', title: o.product_title, offer: o });
                      setRemarks('');
                    }}
                  >
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Accept As-Is
                    <div className="small fw-normal opacity-75 mt-1">
                      Confirm the buyer's dates: {acceptChoiceModal.offer.rental_start_date ? `${fmtShort(acceptChoiceModal.offer.rental_start_date)} → ${fmtShort(acceptChoiceModal.offer.rental_end_date)}` : 'N/A'}
                    </div>
                  </button>
                  <button
                    className="btn btn-outline-primary fw-bold rounded-3 py-3"
                    onClick={() => {
                      const o = acceptChoiceModal.offer;
                      setAcceptChoiceModal(null);
                      setSdStart(o.rental_start_date || '');
                      setSdEnd(o.rental_end_date || '');
                      setSdRemarks('');
                      setSuggestModal({ offer: o });
                    }}
                  >
                    <i className="bi bi-calendar-range me-2"></i>
                    Accept with Different Dates
                    <div className="small fw-normal opacity-75 mt-1">Propose new rental dates for the buyer to review</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Seller suggest-dates modal ── */}
      {suggestModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setSuggestModal(null)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calendar-plus me-2" style={{ color: '#ffc63a' }}></i>
                  Suggest New Dates
                </h5>
                <button type="button" className="btn-close" onClick={() => setSuggestModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-4">
                  Suggest alternate dates for <strong>{suggestModal.offer.product_title}</strong>. The buyer will need to accept these before the deal is finalised.
                </p>
                <div className="mb-4">
                  <RentalCalendar
                    bookedRanges={bookedRanges}
                    startDate={sdStart}
                    endDate={sdEnd}
                    onRangeChange={(start, end) => { setSdStart(start); setSdEnd(end); }}
                    minRentalDays={settings.minRentalDays || 3}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-bold">Estimated Price (₹)</label>
                  {(() => {
                    const daily = Number(suggestModal.offer.product_rental_cost ?? 0);
                    const days = daysBetween(sdStart, sdEnd);
                    const computed = (daily > 0 && days > 0) ? Math.round(days * daily) : 0;
                    return (
                      <input
                        type="text"
                        className="form-control bg-warning bg-opacity-10 border-warning fw-bold"
                        value={`₹${computed.toLocaleString('en-IN')}`}
                        readOnly
                        style={{ cursor: 'default' }}
                      />
                    );
                  })()}
                  {sdStart && sdEnd && (
                    <small className="text-muted mt-1 d-block">
                      Recalculated: ₹{Number(suggestModal.offer.product_rental_cost ?? 0).toLocaleString('en-IN')} × {daysBetween(sdStart, sdEnd)} days
                    </small>
                  )}
                </div>

                <label className="form-label fw-bold small">Note to Buyer (optional)</label>
                <textarea
                  className="form-control rounded-3"
                  rows={2}
                  value={sdRemarks}
                  onChange={e => setSdRemarks(e.target.value)}
                  placeholder="e.g. Original dates not available, suggest alternative…"
                />
              </div>
              <div className="modal-footer border-0 px-4 pb-4 mt-0">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setSuggestModal(null)}>Cancel</button>
                <button
                  className="btn btn-dark rounded-pill px-4 fw-bold"
                  onClick={submitSuggestDates}
                  disabled={sdLoading || !sdStart || !sdEnd}
                >
                  {sdLoading ? 'Sending…' : 'Send Suggestion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (noLayout) return <>{content}{modals}</>;
  return (
    <DashboardLayout requiredRoles={[role]}>
      {content}
      {modals}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REJECTION WINDOW COUNTDOWN
═══════════════════════════════════════════════════════════════ */

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function RejectionCountdown({ acceptedAt, windowHours }: { acceptedAt: string; windowHours: number }) {
  const now = useNow(10000);
  const expiryMs = new Date(acceptedAt).getTime() + windowHours * 3600000;
  const remainMs = expiryMs - now;
  if (remainMs <= 0) return null;
  const h = Math.floor(remainMs / 3600000);
  const m = Math.floor((remainMs % 3600000) / 60000);
  return (
    <div style={{ fontSize: '0.72rem', color: '#b45309', background: '#fff8e1', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <i className="bi bi-clock" style={{ fontSize: '0.7rem' }}></i>
      {h > 0 ? `${h}h ${m}m` : `${m}m`} left to retract
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SELLER VIEW  —  grouped by product, matches offers_new.php
═══════════════════════════════════════════════════════════════ */

interface SellerViewProps {
  offers: Offer[];
  settings: { acceptanceLimitDays: number; ratingPeriod: number; rejectionWindowHours: number };
  isRentalBlocked: (o: Offer) => boolean;
  getRentalConflict: (o: Offer) => { start: string; end: string; source: 'order' | 'offer'; id?: number } | null;
  onAccept: (o: Offer) => void;
  onReject: (o: Offer) => void;
  onRate: (o: Offer) => void;
}

function SellerView({ offers, settings, isRentalBlocked, getRentalConflict, onAccept, onReject, onRate }: SellerViewProps) {
  // group by product_id, each group sorted newest-first, groups ordered by their newest offer
  const grouped = useMemo(() => {
    const m: Record<number, Offer[]> = {};
    offers.forEach(o => { (m[o.product_id] = m[o.product_id] || []).push(o); });
    // sort offers within each group newest-first
    Object.values(m).forEach(arr => {
      const byTime = (a: Offer, b: Offer) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const REJECTED = ['rejected', 'cancelled', 'missed'];
      const p = arr.filter(o => ['pending', 'negotiating'].includes(o.status)).sort(byTime);
      const r = arr.filter(o => REJECTED.includes(o.status)).sort(byTime);
      const a = arr.filter(o => o.status === 'accepted').sort(byTime);
      arr.splice(0, arr.length, ...p, ...r, ...a);
    });
    return m;
  }, [offers]);

  // sort product groups by their most important status first, then newest offer
  const groupEntries = useMemo(() =>
    Object.entries(grouped).sort(([, a], [, b]) => {
      const getPriority = (status: string) => {
        if (['pending', 'negotiating'].includes(status)) return 3;
        if (REJECTED_STATUSES.includes(status)) return 2;
        if (status === 'accepted') return 1;
        return 0;
      };
      
      const pA = getPriority(a[0].status);
      const pB = getPriority(b[0].status);
      
      if (pB !== pA) return pB - pA;
      return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
    }), [grouped]);

  return (
    <>
      {groupEntries.map(([pid, productOffers]) => {
        const first = productOffers[0];

        // per-group sold & accepted rental ranges (matching PHP logic exactly)
        const isGroupSold = productOffers.some(o => o.status === 'accepted' && (o.offer_type ?? o.listing_type) === 'sell');
        const acceptedRentalRanges = productOffers
          .filter(o => o.status === 'accepted' && (o.offer_type ?? o.listing_type) === 'rent' && o.rental_start_date && o.rental_end_date)
          .map(o => ({
            start: toDateVal(o.rental_start_date!),
            end: toDateVal(o.rental_end_date!),
            id: o.id
          }));

        return (
          <div key={pid} className="product-group">
            {/* Product header */}
            <div className="product-header">
              {first.product_image
                ? <img src={getImageUrl(first.product_image)} className="product-thumb" alt={first.product_title} />
                : <div className="product-thumb d-flex align-items-center justify-content-center bg-light"><i className="bi bi-image text-muted"></i></div>}
              <div>
                <div className="mb-1">
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    <i className="bi bi-eye me-1"></i>{first.product_views ?? 0} Views
                  </small>
                </div>
                <h5 className="fw-bold mb-0">{first.product_title}</h5>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <small className="text-muted"><i className="bi bi-hash"></i> ID: {first.product_number || `#${first.product_id}`}</small>
                  <span className={`badge badge-${first.listing_type} text-uppercase`} style={{ fontSize: '0.65rem' }}>
                    {first.listing_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Offer rows */}
            <div className="offer-container">
              {productOffers.map(offer => {
                const isBlockedRental = isRentalBlocked?.(offer);

                // expiry logic (matching PHP exactly)
                let isExpired = false;
                let expiryDate: string | null = null;
                if (offer.status === 'pending' && offer.contact_viewed_at) {
                  const viewedTime = new Date(offer.contact_viewed_at).getTime();
                  const expiryTime = viewedTime + settings.acceptanceLimitDays * 86400000;
                  isExpired = Date.now() > expiryTime;
                  expiryDate = new Date(expiryTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                const offeredPrice = offer.offered_price ?? offer.offer_price;
                const days = daysBetween(offer.rental_start_date, offer.rental_end_date);

                // display status (matching PHP logic)
                const displayStatus = (() => {
                  if (offer.status === 'pending' && isExpired) return 'rejected';
                  if (offer.status === 'pending' && isGroupSold && (offer.offer_type ?? offer.listing_type) === 'sell') return 'rejected';
                  if (offer.status === 'pending' && isBlockedRental) return 'rejected';
                  return offer.status;
                })();
                const statusLabel = (() => {
                  if (offer.status === 'pending' && isExpired) return 'Missed';
                  if (offer.status === 'pending' && isGroupSold && (offer.offer_type ?? offer.listing_type) === 'sell') return 'Sold Out';
                  if (offer.status === 'pending' && isBlockedRental) return 'Dates Booked';
                  if (offer.status === 'negotiating') return 'waiting';
                  return offer.status;
                })();

                // accepted offer windows — fall back to updated_at for legacy offers
                const effectiveAcceptedAt = offer.accepted_at || (offer.status === 'accepted' ? offer.updated_at : undefined);
                const acceptedTs = effectiveAcceptedAt ? new Date(effectiveAcceptedAt).getTime() : 0;
                const windowMs = settings.rejectionWindowHours * 3600000;
                const canRejectByTime = offer.status === 'accepted' && acceptedTs > 0 && Date.now() < acceptedTs + windowMs;
                const canRejectByPickup = offer.status === 'accepted' && (offer.offer_type ?? offer.listing_type) === 'rent' && offer.rental_start_date
                  ? Date.now() < new Date(offer.rental_start_date).getTime() - windowMs : false;
                const isProcessed = !!offer.linked_order_status && ['paid', 'for_delivery', 'dispatched', 'delivered', 'completed'].includes(offer.linked_order_status);
                const canRate = offer.status === 'accepted' && !Number(offer.seller_rated_buyer) && (acceptedTs === 0 || Date.now() < acceptedTs + settings.ratingPeriod * 86400000);

                return (
                  <div key={offer.id} className={`offer-row${offer.status === 'rejected' ? ' opacity-50' : ''}`}>

                    {/* ── buyer info column ── */}
                    <div className="buyer-info d-flex flex-column align-items-start" style={{ minWidth: 170 }}>
                      <div className="d-flex align-items-center mb-2">
                        <div className="buyer-avatar">{(offer.buyer_name || 'B').charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="fw-bold fs-6">{offer.buyer_name || '—'}</div>
                          <div className="d-flex align-items-center">
                            <span style={{ fontSize: '0.82rem' }}>
                              {offer.buyer_rating_count ?? 0} <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.7rem' }}></i>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="buyer-contact-info border-top pt-2 w-100">
                        <div className="buyer-contact-item"><i className="bi bi-telephone text-primary"></i><span>{offer.buyer_mobile || 'N/A'}</span></div>
                        <div className="buyer-contact-item"><i className="bi bi-envelope text-primary"></i><span className="text-truncate" style={{ maxWidth: 180, display: 'block' }}>{offer.buyer_email || 'N/A'}</span></div>
                        <div className="buyer-contact-item"><i className="bi bi-geo-alt text-danger"></i><span>{offer.delivery_state || ''},{offer.delivery_city || 'N/A'}, {offer.delivery_pin_code || 'No Pin'} </span></div>
                      </div>
                    </div>

                    {/* ── offer details column ── */}
                    <div className="offer-details flex-grow-1">

                      {/* price + status */}
                      <div className="price-container d-flex align-items-end gap-2 mb-2">
                        {(offer.original_price ?? 0) > 0 && (
                          <span className="original-price-strikethrough">₹{Number(offer.original_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        )}
                        <div className="d-flex flex-column">
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>OFFERED PRICE</small>
                          <span className="price-tag">₹{Number(offeredPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <span className={`status-pill status-${displayStatus}`}>{statusLabel}</span>
                      </div>

                      {/* rental info box */}
                      {(offer.offer_type ?? offer.listing_type) === 'rent' && offer.rental_start_date && (
                        <div className="rental-info-box bg-light p-2 rounded mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-muted">Product Rental:</span>
                            <span className="fw-bold text-dark">₹{Number(offer.product_rental_cost ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/day</span>
                          </div>
                          <div className="d-flex justify-content-between small mb-2">
                            <span className="text-muted">Security Deposit:</span>
                            <span className="fw-bold text-dark">₹{Number(offer.product_rental_deposit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="rental-dates border-top pt-2 small">
                            <i className="bi bi-calendar-range text-primary me-1"></i>
                            <strong>{fmtShort(offer.rental_start_date)}</strong>
                            {' - '}
                            <strong>{fmtFull(offer.rental_end_date)}</strong>
                            {days > 0 && <span className="badge bg-secondary ms-1">{days} days</span>}
                          </div>
                          {(() => {
                            const conflict = getRentalConflict?.(offer);
                            if (!conflict) return null;
                            return (
                              <div className="conflict-warning mt-2 w-100">
                                <i className="bi bi-exclamation-triangle-fill"></i> Booking Overlap Detected!
                                <div style={{ fontSize: '0.7rem', fontWeight: 'normal', marginTop: '2px' }}>
                                  Conflicts with: {fmtShort(conflict.start)} - {fmtShort(conflict.end)} ({conflict.source === 'order' ? 'Confirmed Booking' : `Accepted Offer #${conflict.id}`})
                                  {conflict.source === 'offer' && (
                                    <button
                                      className="btn btn-link p-0 ms-2 text-danger fw-bold"
                                      style={{ fontSize: '0.7rem', textDecoration: 'none' }}
                                      onClick={() => {
                                        const other = offers.find(x => Number(x.id) === Number(conflict.id));
                                        if (other) onReject(other);
                                      }}
                                    >
                                      [Retract & Resolve]
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* message */}
                      {offer.message && (
                        <div className="alert alert-light border-0 py-2 px-3 small fst-italic mb-3">
                          <i className="bi bi-chat-quote me-1 text-muted"></i>"{offer.message}"
                        </div>
                      )}

                      {/* delivery box */}
                      {offer.delivery_address && (
                        <div className="delivery-box bg-white border rounded p-2 mb-3">
                          <div className="d-flex align-items-center gap-2 small">
                            <i className="bi bi-truck text-primary"></i>
                            <span className="fw-bold">DELIVERY:</span>
                            <span className="text-dark">{offer.delivery_city ?? 'N/A'}, {offer.delivery_pin_code ?? 'No Pin'} {offer.delivery_state ?? ''}</span>
                          </div>
                        </div>
                      )}

                      {/* Negotiation Timeline */}
                      {(() => {
                        const sortedHistory = [...(offer.history || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        const steps = [
                          ...sortedHistory.filter(h => h.action !== 'initial_offer').map(h => ({
                            label: historyLabel(h.action),
                            date: fmtDateTime(h.created_at) + (h.new_start_date && h.new_end_date ? ` • ${fmtShort(h.new_start_date)} – ${fmtShort(h.new_end_date)}` : ''),
                            icon: historyIcon(h.action),
                          })),
                          { label: 'Offer Initiated', date: fmtDateTime(offer.created_at), icon: 'fa-solid fa-tag' },
                        ];
                        return (
                          <div style={{ background: '', borderRadius: 10, padding: '1rem 1.25rem', marginTop: '0.75rem' }}>
                             <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                               <i className="fa-solid fa-clock-rotate-left" style={{ color: '#D7B467' }}></i> Date/Time Logs
                             </div>
                             {steps.map((step, idx) => (
                               <div key={idx} style={{ display: 'flex', gap: '0.75rem' }}>
                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                   <div style={{ width: 28, height: 28, background: '#D7B467', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                                     {idx + 1}
                                   </div>
                                   {idx < steps.length - 1 && <div style={{ width: 2, flex: 1, background: '#ccc', minHeight: 22, marginTop: 3 }} />}
                                 </div>
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

                    {/* ── offer actions column ── */}
                    <div className="offer-actions" style={{ minWidth: 120, textAlign: 'right' }}>
                      {offer.status === 'pending' && (
                        <>
                          {isExpired ? (
                            <div className="text-danger small fw-bold">
                              <i className="bi bi-clock-fill"></i> Offer Missed
                              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>Acceptance period expired on {expiryDate}</div>
                            </div>
                          ) : (
                            <div className="d-flex flex-column align-items-end gap-2">
                              {isGroupSold && (offer.offer_type ?? offer.listing_type) === 'sell' && (
                                <div className="text-danger small fw-bold">
                                  <i className="bi bi-slash-circle-fill"></i> Already Sold
                                  <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>This product is sold to another buyer.</div>
                                </div>
                              )}
                              {isBlockedRental && (
                                <div className="text-danger small fw-bold">
                                  <i className="bi bi-calendar-x-fill"></i> Dates Booked
                                  <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>These dates overlap with an accepted booking.</div>
                                </div>
                              )}
                              <div className="btn-group btn-group-sm">
                                <button className="btn-yellow" onClick={() => onAccept(offer)}>Accept</button>
                                <button className="btn-outline-dark-custom" onClick={() => onReject(offer)}>Reject</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {offer.status === 'negotiating' && (
                        <span className="badge bg-info text-dark rounded-pill py-2 px-3">
                          <i className="bi bi-clock-history me-1"></i>Waiting for Buyer
                        </span>
                      )}

                      {offer.status === 'accepted' && (
                        <div className="d-flex flex-column align-items-end gap-1">
                          <div className="d-flex align-items-center gap-1">
                            {offer.linked_order_status && offer.linked_order_status !== 'pending' && (
                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 rounded-pill" style={{ fontSize: '0.65rem' }}>
                                <i className="bi bi-truck me-1"></i>{offer.linked_order_status.toUpperCase()}
                              </span>
                            )}
                            <i className="bi bi-patch-check-fill text-success fs-4" title="Accepted"></i>
                          </div>
                          {/* Rejection window: hide once seller has rated (deal is done) or order is processed */}
                          {canRejectByTime && !isProcessed && !Number(offer.seller_rated_buyer) && !Number(offer.buyer_rated_seller) && effectiveAcceptedAt && (
                            <div className="d-flex flex-column align-items-end gap-1 mt-1">
                              <RejectionCountdown acceptedAt={effectiveAcceptedAt} windowHours={settings.rejectionWindowHours} />
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                style={{ fontSize: '0.78rem', fontWeight: 700 }}
                                onClick={() => onReject(offer)}
                              >
                                <i className="bi bi-x-circle me-1"></i>Retract Acceptance
                              </button>
                            </div>
                          )}
                          {canRate ? (
                            <button className="btn-yellow btn-sm mt-2 rounded-pill px-3" style={{ fontSize: '0.8rem' }} onClick={() => onRate(offer)}>
                              <i className="bi bi-star-fill me-1"></i>Rate Buyer
                            </button>
                          ) : Number(offer.seller_rated_buyer) === 1 ? (
                            <span className="badge bg-light text-dark mt-2 border rounded-pill px-3">
                              <i className="bi bi-check-circle-fill text-success me-1"></i>Rated
                            </span>
                          ) : null}
                        </div>
                      )}

                      {offer.status === 'rejected' && (
                        <i className="bi bi-dash-circle text-muted fs-4" title="Rejected"></i>
                      )}


                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BUYER VIEW  —  luxury cards, matches my_offers.php
═══════════════════════════════════════════════════════════════ */

interface BuyerViewProps {
  offers: Offer[];
  settings: { acceptanceLimitDays: number; ratingPeriod: number; rejectionWindowHours: number; minRentalDays: number };
  role?: string;
  isRentalConflict: (o: Offer) => boolean;
  getRentalConflict: (o: Offer) => { start: string; end: string; source: 'order' | 'offer'; id?: number } | null;
  isSoldOut: (o: Offer) => boolean;
  onAccept?: (o: Offer) => void;
  onReject?: (o: Offer) => void;
  onCancel: (o: Offer) => void;
  onRate: (o: Offer) => void;
  onUpdateDates: (o: Offer) => void;
  onAcceptDates: (o: Offer) => void;
}

function BuyerView({ offers, settings, role, isRentalConflict, getRentalConflict, isSoldOut, onAccept, onReject, onCancel, onRate, onUpdateDates, onAcceptDates }: BuyerViewProps) {
  const isAdmin = role === 'admin' || role === 'super_admin';
  return (
    <>
      {offers.map(o => {
        const offeredPrice = o.offered_price ?? o.offer_price;
        const days = daysBetween(o.rental_start_date, o.rental_end_date);
        const conflict = isRentalConflict?.(o);
        const soldOut = isSoldOut?.(o);
        const acceptedTs = o.accepted_at ? new Date(o.accepted_at).getTime() : 0;
        const ratingExpiryTs = acceptedTs + settings.ratingPeriod * 86400000;
        const canRate = o.status === 'accepted' && !Number(o.buyer_rated_seller) && (acceptedTs === 0 || Date.now() < ratingExpiryTs);

        // pill class: pill-pending / pill-accepted etc  (my_offers.php convention)
        const pillClass = `status-pill pill-${o.status}`;
        const pillLabel = o.status === 'negotiating' ? 'action required' : o.status;

        return (
          <div key={o.id} className="luxury-item-card shadow-sm">
            <div className="row align-items-center">
              {/* product image */}
              <div className="col-auto">
                {o.product_image
                  ? <img src={getImageUrl(o.product_image)} className="item-img" alt={o.product_title} />
                  : <div className="item-img d-flex align-items-center justify-content-center bg-light rounded-3"><i className="bi bi-image text-muted fs-3"></i></div>}
              </div>

              {/* main info */}
              <div className="col px-md-4">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="fw-bold mb-1">{o.product_title}</h5>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <small className="text-muted">#REF-{o.id} • {o.offer_type ? o.offer_type.charAt(0).toUpperCase() + o.offer_type.slice(1) : (o.listing_type ? o.listing_type.charAt(0).toUpperCase() + o.listing_type.slice(1) : '')}</small>
                      {isAdmin && (
                        <>
                          <span className="badge bg-light text-dark border fw-bold" style={{ fontSize: '0.65rem' }}>
                            <i className="bi bi-person-fill text-primary me-1"></i>
                            Buyer: {o.buyer_name || 'N/A'}
                          </span>
                          <span className="badge bg-light text-dark border fw-bold" style={{ fontSize: '0.65rem' }}>
                            <i className="bi bi-shop text-success me-1"></i>
                            Seller: {o.seller_name || 'N/A'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={pillClass}>{pillLabel}</span>
                </div>

                {/* price + rental info block */}
                <div className="bg-light p-3 rounded-4 mt-2">
                  <div className="row text-center text-md-start align-items-center">
                    <div className="col-md-4 border-end">
                      <small className="text-muted d-block">PROPOSED PRICE</small>
                      <span className="price-badge">₹{Number(offeredPrice).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="col-md-8 ps-md-4">
                      {(o.offer_type ?? o.listing_type) === 'rent' && o.rental_start_date && (
                        <div className="mb-0 small fw-bold text-muted">
                          <i className="bi bi-calendar-event me-1 text-primary"></i>
                          {fmtShort(o.rental_start_date)} to {fmtFull(o.rental_end_date)}
                        </div>
                      )}
                      <p className="mb-0 mt-1 small text-muted fw-semibold">
                        <i className="bi bi-geo-alt me-1 text-danger"></i>
                        {o.delivery_city || 'N/A'}, {o.delivery_state || ''} {o.delivery_pin_code ? `(${o.delivery_pin_code})` : ''}
                      </p>
                      {o.status === 'negotiating' ? (
                        <div className="alert alert-info py-2 px-3 mt-2 rounded-3 border-0 small">
                          <i className="bi bi-info-circle-fill me-2"></i>
                          <strong>Action Required:</strong> {o.message}
                        </div>
                      ) : (
                        <p className="mb-0 small text-muted fst-italic mt-1">
                          <i className="bi bi-chat-left-dots me-1"></i>{o.message || 'No message attached.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* conflict alert */}
                  {(() => {
                    const c = getRentalConflict?.(o);
                    if (!c) return null;
                    return (
                      <div className="conflict-alert mb-3">
                        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                        <div>
                          Rental Conflict: These dates overlap with an existing booking ({fmtShort(c.start)} - {fmtShort(c.end)} {c.source === 'offer' ? `#${c.id}` : ''}).
                          <br /><small className="fw-normal opacity-75">Please select different dates to proceed.</small>
                        </div>
                      </div>
                    );
                  })()}
                  {soldOut && o.status === 'pending' && (
                    <div className="conflict-alert mb-3">
                      <i className="bi bi-slash-circle-fill fs-5"></i>
                      <div>This product has been sold to another buyer.</div>
                    </div>
                  )}

                  {/* negotiation logs */}
                  {o.history && o.history.length > 0 && (
                    <div className="mt-3 pt-3 border-top">
                      <h6 className="small fw-bold text-muted mb-2"><i className="fa-solid fa-clock-rotate-left me-1"></i>Date/Time Logs</h6>
                      <div className="history-list small">
                        {o.history.map(h => (
                          <div key={h.id} className="history-item d-flex gap-2 mb-2">
                            <div className="text-primary"><i className="bi bi-dot"></i></div>
                            <div>
                              <span className="text-dark fw-semibold">{historyLabel(h.action)}</span>
                              <div className="text-muted opacity-75" style={{ fontSize: '0.75rem' }}>
                                {fmtDateTime(h.created_at)}
                                {h.new_start_date && <> • {fmtShort(h.new_start_date)} - {fmtShort(h.new_end_date)}</>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* action buttons */}
              <div className="col-md-2 text-end">
                <div className="d-grid gap-2">
                  {isAdmin && o.status === 'pending' && (
                    <div className="d-grid gap-2 mb-2">
                      <button className="btn btn-warning fw-bold rounded-pill" style={{ fontSize: '0.875rem' }} onClick={() => onAccept?.(o)}>
                        <i className="bi bi-check-circle-fill me-1"></i>Accept
                      </button>
                      <button className="btn btn-outline-danger rounded-pill" style={{ fontSize: '0.875rem' }} onClick={() => onReject?.(o)}>
                        <i className="bi bi-x-circle me-1"></i>Reject
                      </button>
                    </div>
                  )}
                  {o.status === 'negotiating' && (
                    <>
                      <button
                        className="btn btn-success fw-bold rounded-pill"
                        style={{ fontSize: '0.875rem' }}
                        onClick={() => onAcceptDates?.(o)}
                      >
                        <i className="bi bi-check-circle-fill me-1"></i>Accept Dates
                      </button>
                      <button className="btn-modern-cancel" style={{ fontSize: '0.8rem' }} onClick={() => onCancel?.(o)}>Decline</button>
                    </>
                  )}
                  {(o.status === 'pending' || o.status === 'rejected' || o.status === 'negotiating') && (
                    <>
                      {o.status === 'rejected' ? (
                        <button className="btn btn-warning mb-1 fw-bold rounded-pill" style={{ fontSize: '0.875rem' }} onClick={() => onUpdateDates?.(o)}>
                          <i className="bi bi-arrow-repeat me-1"></i>Make Offer
                        </button>
                      ) : (o.offer_type ?? o.listing_type) === 'rent' && (
                        <button className="btn-yellow mb-1" style={{ fontSize: '0.875rem' }} onClick={() => onUpdateDates?.(o)}>Change dates</button>
                      )}
                      {(o.status === 'pending' || o.status === 'rejected') && (
                        <button className="btn-modern-cancel" onClick={() => onCancel?.(o)}>{o.status === 'rejected' ? 'Close Offer' : 'Cancel Offer'}</button>
                      )}
                    </>
                  )}
                  {canRate && !isAdmin && (
                    <button className="btn btn-warning rounded-pill fw-bold" onClick={() => onRate?.(o)}>
                      <i className="bi bi-star-fill me-1"></i>Rate Seller
                    </button>
                  )}
                  {o.status === 'accepted' && Number(o.buyer_rated_seller) === 1 && !isAdmin ? (
                    <span className="badge bg-light text-dark rounded-pill border py-2 px-3">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>Rated
                    </span>
                  ) : null}

                  <a href={`/buyer/product/${o.product_id}`} className="btn btn-light rounded-pill border text-decoration-none" style={{ fontSize: '0.875rem' }}>
                    View Item
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
