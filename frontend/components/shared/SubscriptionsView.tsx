'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Plan { id: number; name: string; plan_type: string; limit_value: number; duration_hours: number; price: string; is_featured?: number | string; is_most_selected?: number | string; }
interface ActiveSub { plan_name: string; plan_type: string; limit_value: number; price: string; starts_at: string; expires_at: string; usage_count: number; }
interface HistoryItem { plan_name: string; plan_type: string; price: string; starts_at: string; expires_at: string; is_active: number; }
interface SubData { plans: Plan[]; active: ActiveSub | null; history: HistoryItem[]; }

interface ChargeItem { name: string; type: 'percentage' | 'fixed'; value: number; amount: number; }
interface CheckoutData {
  plan: Plan;
  user: { name: string; email: string; mobile: string; address: string };
  charge_breakdown: ChargeItem[];
  total_charges: number;
  referral_discount: number;
  total: number;
}

interface Props { role: string; userType: string; }

export default function SubscriptionsView({ role, userType }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMsg, setFlashMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sellerCenter, setSellerCenter] = useState(1);
  const [sellerAnimating, setSellerAnimating] = useState(false);
  const [buyerCenter, setBuyerCenter] = useState(1);
  const [buyerAnimating, setBuyerAnimating] = useState(false);

  // Payment modal state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [paying, setPaying] = useState(false);

  const [buyerPlans, setBuyerPlans] = useState<Plan[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [togglingMsId, setTogglingMsId] = useState<number | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  const toggleFeatured = async (plan: Plan) => {
    setTogglingId(plan.id);
    const res = await api.post(`/shared/admin-subscription-plans/${plan.id}/toggle-featured`, {});
    setTogglingId(null);
    if (res.success) {
      const newFeatured = Number(plan.is_featured) ? 0 : 1;
      const updateList = (list: Plan[]) => list.map(p =>
        p.id === plan.id ? { ...p, is_featured: newFeatured } :
        (p as any).user_type === (plan as any).user_type ? { ...p, is_featured: 0 } : p
      );
      setData(prev => prev ? { ...prev, plans: updateList(prev.plans) } : prev);
      setBuyerPlans(prev => updateList(prev));
    }
  };

  const toggleMostSelected = async (plan: Plan) => {
    setTogglingMsId(plan.id);
    const res = await api.post(`/shared/admin-subscription-plans/${plan.id}/toggle-most-selected`, {});
    setTogglingMsId(null);
    if (res.success) {
      const newVal = Number(plan.is_most_selected) ? 0 : 1;
      const updateList = (list: Plan[]) => list.map(p =>
        p.id === plan.id ? { ...p, is_most_selected: newVal } : p
      );
      setData(prev => prev ? { ...prev, plans: updateList(prev.plans) } : prev);
      setBuyerPlans(prev => updateList(prev));
    }
  };

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) setFlashMsg({ text: decodeURIComponent(success), ok: true });
    if (error)   setFlashMsg({ text: decodeURIComponent(error),   ok: false });

    // Super_admin and admin both see both plan types
    if (isSuperAdmin || user?.role === 'admin') {
      api.get<SubData>(`/shared/subscriptions/seller`).then((r) => {
        if (r.success && r.data) setData(r.data);
      });
      api.get<SubData>(`/shared/subscriptions/buyer`).then((r) => {
        if (r.success && r.data) {
          setBuyerPlans(r.data.plans);
          setLoading(false);
        }
      });
    } else {
      api.get<SubData>(`/shared/subscriptions/${userType}`).then((r) => {
        if (r.success && r.data) setData(r.data);
        setLoading(false);
      });
    }
  }, [userType, user?.role]);

  const sellerPlans = data?.plans || [];

  // Seller auto-advance
  useEffect(() => {
    if (sellerPlans.length <= 3) return;
    const t = setInterval(() => { setSellerAnimating(true); setTimeout(() => { setSellerCenter(c => (c + 1) % sellerPlans.length); setSellerAnimating(false); }, 500); }, 3500);
    return () => clearInterval(t);
  }, [sellerPlans.length]);

  // Buyer auto-advance
  useEffect(() => {
    if (buyerPlans.length <= 3) return;
    const t = setInterval(() => { setBuyerAnimating(true); setTimeout(() => { setBuyerCenter(c => (c + 1) % buyerPlans.length); setBuyerAnimating(false); }, 500); }, 3500);
    return () => clearInterval(t);
  }, [buyerPlans.length]);

  const openCheckout = async (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutLoading(true);
    setCheckoutData(null);
    setCouponCode('');
    setCouponMsg(null);
    setCouponDiscount(0);
    setAppliedCoupon('');
    setModalOpen(true);

    const r = await api.get<CheckoutData>(`/${role}/plan-checkout-details/${plan.id}`);
    if (r.success && r.data) {
      setCheckoutData(r.data);
    } else {
      setFlashMsg({ text: r.message || 'Failed to load plan details', ok: false });
      setModalOpen(false);
    }
    setCheckoutLoading(false);
  };

  const closeModal = () => {
    if (paying) return;
    setModalOpen(false);
    setSelectedPlan(null);
    setCheckoutData(null);
  };

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setCouponLoading(true);
    setCouponMsg(null);
    const res = await api.post<{ discount: number }>(`/${role}/apply-coupon`, {
      code: couponCode.trim().toUpperCase(),
      plan_id: selectedPlan.id,
    });
    setCouponLoading(false);
    if (res.success && res.data) {
      setCouponDiscount(res.data.discount);
      setAppliedCoupon(couponCode.trim().toUpperCase());
      setCouponMsg({ text: res.message || 'Coupon applied!', ok: true });
    } else {
      setCouponDiscount(0);
      setAppliedCoupon('');
      setCouponMsg({ text: res.message || 'Invalid coupon', ok: false });
    }
  }, [couponCode, selectedPlan, role]);

  const processPayment = useCallback(async () => {
    if (!checkoutData || !selectedPlan) return;
    setPaying(true);
    const callbackUrl = `${window.location.origin}/${role}/payment-callback?id={id}`;
    const res = await api.post<{ redirect_url: string; merchant_order_id: string }>(`/${role}/initiate-payment`, {
      plan_id: selectedPlan.id,
      coupon_code: appliedCoupon,
      callback_url: callbackUrl,
    });
    if (res.success && res.data?.redirect_url) {
      window.location.href = res.data.redirect_url;
    } else {
      setFlashMsg({ text: res.message || 'Failed to initiate payment. Please try again.', ok: false });
      setPaying(false);
      setModalOpen(false);
    }
  }, [checkoutData, selectedPlan, appliedCoupon, role]);

  const basePrice      = Number(checkoutData?.plan?.price ?? 0);
  const totalCharges   = checkoutData?.total_charges ?? 0;
  const referralDiscount = checkoutData?.referral_discount ?? 0;
  const displayTotal   = Math.max(1, basePrice + totalCharges - referralDiscount - couponDiscount);

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const hasActiveSub = !!data?.active;

  return (
    <DashboardLayout requiredRoles={[role]}>
      <style>{`
        .pay-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,.55);
          z-index: 1050; display: flex; align-items: center; justify-content: center;
          padding: 1rem; animation: fadeIn .18s ease;
        }
        .pay-modal {
          background: #fff; border-radius: 1.25rem;
          box-shadow: 0 24px 64px rgba(0,0,0,.18);
          width: 100%; max-width: 820px; max-height: 90vh;
          overflow-y: auto; animation: slideUp .2s ease;
        }
        .pay-modal-header {
          padding: 1.4rem 1.75rem 1rem;
          border-bottom: 1px solid #f0f0f0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .pay-modal-body { padding: 1.5rem 1.75rem; }
        .price-row { display: flex; justify-content: space-between; margin-bottom: .6rem; font-size: .9rem; }
        .price-total {
          border-top: 1px dashed #dee2e6; margin-top: .9rem; padding-top: .9rem;
          font-size: 1.15rem; font-weight: 700;
          display: flex; justify-content: space-between;
        }
        .plan-chip {
          background: rgba(255,198,58,.15); color: #000;
          padding: .18rem .65rem; border-radius: 2rem;
          font-size: .78rem; font-weight: 600; display: inline-block;
        }
        .btn-pay {
          background: #ffc63a; color: #000; border: none;
          border-radius: 10px; font-weight: 700; padding: .8rem 1.5rem;
          font-size: 1rem; transition: all .25s; width: 100%;
        }
        .btn-pay:hover:not(:disabled) { background: #e0a800; transform: translateY(-2px); }
        .btn-pay:disabled { opacity: .6; cursor: not-allowed; }
        .close-btn {
          background: none; border: none; font-size: 1.4rem;
          line-height: 1; cursor: pointer; color: #666; padding: .2rem .4rem;
          border-radius: 6px; transition: background .15s;
        }
        .close-btn:hover { background: #f3f3f3; }
        .gateway-logo {
          display: flex; align-items: center; gap: .5rem;
          font-size: .72rem; color: #888; justify-content: center; margin-top: .75rem;
        }
        .coupon-input { border-radius: 8px 0 0 8px !important; }
        .coupon-btn   { border-radius: 0 8px 8px 0 !important; }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .privilege-list li { display: flex; align-items: flex-start; gap: .5rem; margin-bottom: .55rem; font-size: .88rem; }
        .tier-basic{background:#fff;border-radius:2rem;padding:2.5rem;height:100%;border-top:4px solid transparent;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;transition:all .5s;display:flex;flex-direction:column}
        .tier-basic:hover{border-top-color:#acadad44;transform:translateY(-4px)}
        .tier-standard{background:#fff;border-radius:2rem;padding:2.5rem;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,.12);transform:scale(1.04);z-index:10;border:1px solid #f0f0f0}
        .tier-elite{background:#e7efe5;border-radius:2rem;padding:2.5rem;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;border:1px solid #d1e4cf;transition:all .5s}
        .tier-elite:hover{transform:translateY(-4px)}
        .tier-badge{position:absolute;top:0;right:0;background:#D7B467;color:#fff;padding:.45rem 1.2rem;border-bottom-left-radius:.75rem;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.15em}
        .tier-btn-basic{width:100%;padding:.9rem;border-radius:9999px;background:#D7B467;color:#fff;border:none;font-weight:700;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-basic:hover{background:#c9a455;transform:translateY(-2px)}
        .tier-btn-standard{width:100%;padding:.9rem;border-radius:9999px;background:#D7B467;color:#fff;border:none;font-weight:900;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .2s;box-shadow:0 10px 25px rgba(215,180,103,.3);margin-top:auto}
        .tier-btn-standard:hover{transform:scale(1.03);background:#c9a455}
        .tier-btn-elite{width:100%;padding:.9rem;border-radius:9999px;background:#D7B467;color:#fff;border:none;font-weight:900;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-elite:hover{background:#c9a455;transform:translateY(-2px)}
        .plan-conveyor{display:flex;gap:1.5rem;align-items:center;justify-content:center;overflow:hidden;padding:2rem 0 2.5rem;}
        .plan-card-wrap{flex:0 0 calc(33.333% - 1rem);transition:transform .5s cubic-bezier(.4,0,.2,1),opacity .5s,filter .5s;}
        .plan-card-wrap.center{transform:scale(1.06) translateY(-8px);z-index:10;filter:drop-shadow(0 20px 40px rgba(0,0,0,.14));}
        .plan-card-wrap.side{transform:scale(0.93);opacity:0.82;filter:drop-shadow(0 4px 12px rgba(0,0,0,.06));}
        .plan-card-wrap.exiting{transform:scale(0.85) translateX(-60px);opacity:0;}
        .plan-card-wrap.entering{transform:scale(0.85) translateX(60px);opacity:0;}
        .conveyor-dots{display:flex;justify-content:center;gap:6px;margin-top:1rem;}
        .conveyor-dot{width:8px;height:8px;border-radius:50%;background:#e5e7eb;cursor:pointer;transition:all .3s;border:none;padding:0;}
        .conveyor-dot.active{background:#D7B467;width:22px;border-radius:9999px;}
        .slider-arrow{width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .2s;z-index:5;flex-shrink:0;}
        .slider-arrow:hover{background:#D7B467;color:#fff;border-color:#D7B467;}
        .bento-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-bottom:2rem}
        @media(min-width:992px){.bento-grid{grid-template-columns:repeat(12,1fr)}}
        .bento-col-8{grid-column:span 1}
        .bento-col-4{grid-column:span 1}
        @media(min-width:992px){.bento-col-8{grid-column:span 8}.bento-col-4{grid-column:span 4}}
      `}</style>

      <div className="container">
        {/* <PageHeader title="Subscription Details" /> */}

        {flashMsg && (
          <div className={`alert ${flashMsg.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
            <i className={`bi ${flashMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
            {flashMsg.text}
            <button type="button" className="btn-close" onClick={() => setFlashMsg(null)} />
          </div>
        )}

        {/* Active Subscription */}
        {data?.active && (() => {
          const used = data.active.usage_count;
          const limit = data.active.limit_value;
          const isQty = data.active.plan_type !== 'duration';
          const remaining = isQty ? Math.max(0, limit - used) : null;
          const pct = isQty && limit > 0 ? Math.round((used / limit) * 100) : 0;
          const expires = data.active.expires_at ? new Date(data.active.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Expiry';
          return (
            <div className="bento-grid">
              <div className="bento-col-8">
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 260, border: '1px solid #f0f0f0', height: '100%' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <span style={{ background: '#D7B467', color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Plan</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Valid until {expires}</span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#111', marginBottom: '0.6rem', lineHeight: 1 }}>{data.active.plan_name}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: '28rem', marginBottom: '2rem' }}>
                      {isQty ? `Usage-based plan · ${used} used out of ${limit} listings.` : 'Full duration-based access to all platform features.'}
                    </p>
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{isQty ? remaining : '∞'}</span>
                        {isQty && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>/ {limit}</span>}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isQty ? 'Listings Left' : 'Full Access'}</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#e7e8e8', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#ffc63a', width: isQty ? `${Math.max(2, 100 - pct)}%` : '100%', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: '-5rem', top: '-5rem', width: '20rem', height: '20rem', background: '#D7B467', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: '2rem', bottom: '1rem', opacity: 0.07, fontSize: '8rem', lineHeight: 1, pointerEvents: 'none', fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48" }}>workspace_premium</span>
                </div>
              </div>
              <div className="bento-col-4">
                <div style={{ background: '#e7efe5', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 260, cursor: 'pointer', transition: 'transform 0.4s', border: '1px solid #d1e4cf' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <div>
                    <span style={{ color: '#D7B467', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '1.25rem' }}>Unlock More</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1F2937', marginBottom: '1rem', lineHeight: 1.2 }}>Elevate to a Higher Tier</h3>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                      {[
                        { icon: 'all_inclusive', text: 'Unlimited product listings' },
                        { icon: 'stars', text: 'Priority placement in search' },
                        { icon: 'insights', text: 'Advanced seller analytics' },
                        { icon: 'support_agent', text: 'Dedicated seller support' },
                      ].map((b, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem', color: '#374151', fontSize: '0.85rem', fontWeight: 400 }}>
                          <span className="material-symbols-outlined" style={{ color: '#D7B467', fontSize: '1.1rem', flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{b.icon}</span>
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '2rem', background: '#D7B467', color: '#fff', padding: '0.9rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Plans */}
        <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem' }}>Available Plans</h2>
        {sellerPlans.length > 0 ? (() => {
          const n = sellerPlans.length;
          const li = (sellerCenter - 1 + n) % n, ri = (sellerCenter + 1) % n;
          const vis = n === 1 ? [sellerPlans[0]] : n === 2 ? [sellerPlans[0], sellerPlans[1]] : [sellerPlans[li], sellerPlans[sellerCenter], sellerPlans[ri]];
          const pos = n === 1 ? ['center'] : n === 2 ? ['side','center'] : ['side','center','side'];
          const prev = () => { if (sellerAnimating) return; setSellerAnimating(true); setTimeout(() => { setSellerCenter(c => (c - 1 + n) % n); setSellerAnimating(false); }, 500); };
          const next = () => { if (sellerAnimating) return; setSellerAnimating(true); setTimeout(() => { setSellerCenter(c => (c + 1) % n); setSellerAnimating(false); }, 500); };
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {n > 3 && <button className="slider-arrow" onClick={prev}><i className="bi bi-chevron-left" /></button>}
                <div className="plan-conveyor" style={{ flex: 1 }}>
                  {vis.map((plan, vi) => {
                    const p = pos[vi]; const isC = p === 'center';
                    const ct = Number(plan.is_featured) === 1 ? 'standard' : isC ? 'standard' : vi === 0 ? 'basic' : 'elite';
                    return (
                      <div key={plan.id} className={`plan-card-wrap ${sellerAnimating && !isC ? (vi === 0 ? 'exiting' : 'entering') : p}`}>
                        <div className={`tier-${ct}`} style={isC ? { borderColor: '#ffc63a55', borderWidth: 1.5 } : {}}>
                          {Number(plan.is_most_selected) === 1 && <div className="tier-badge">Most Selected</div>}
                          {isC && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#ffc63a,#D7B467)', borderRadius: '2rem 2rem 0 0' }} />}
                          <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111', marginBottom: '0.4rem' }}>{plan.name}</h2>
                            <p style={{ fontSize: '0.82rem', fontWeight: 500, color: isC ? '#D7B467' : '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{plan.plan_type} Based</p>
                          </div>
                          <div style={{ marginBottom: '2rem' }}>
                            <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#111' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                          </div>
                          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                            {[{ icon: 'inventory_2', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Listings` }, { icon: 'schedule', text: `${Number(plan.duration_hours) || '∞'} Hours Validity` }, { icon: 'verified', text: 'Verified Seller Badge' }].map((f, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                                <span className="material-symbols-outlined" style={{ color: '#ffc63a', fontSize: '1.1rem', width: 20, flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: isC ? 600 : 400, color: '#374151' }}>{f.text}</span>
                              </li>
                            ))}
                          </ul>
                          {isSuperAdmin ? (
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <button style={{ width: '100%', padding: '.7rem', borderRadius: '9999px', background: Number(plan.is_featured) === 1 ? '#D7B467' : '#f3f4f6', color: Number(plan.is_featured) === 1 ? '#fff' : '#374151', border: 'none', fontWeight: 700, fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} onClick={() => toggleFeatured(plan)} disabled={togglingId === plan.id}>
                                {togglingId === plan.id ? <span className="spinner-border spinner-border-sm" /> : <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: Number(plan.is_featured) === 1 ? "'FILL' 1" : "'FILL' 0" }}>workspace_premium</span>}
                                {Number(plan.is_featured) === 1 ? 'Premium' : 'Set Premium'}
                              </button>
                              <button style={{ width: '100%', padding: '.7rem', borderRadius: '9999px', background: Number(plan.is_most_selected) === 1 ? '#1a1a1a' : '#f3f4f6', color: Number(plan.is_most_selected) === 1 ? '#ffc63a' : '#374151', border: 'none', fontWeight: 700, fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} onClick={() => toggleMostSelected(plan)} disabled={togglingMsId === plan.id}>
                                {togglingMsId === plan.id ? <span className="spinner-border spinner-border-sm" /> : <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: Number(plan.is_most_selected) === 1 ? "'FILL' 1" : "'FILL' 0" }}>star</span>}
                                {Number(plan.is_most_selected) === 1 ? 'Most Selected' : 'Set Most Selected'}
                              </button>
                            </div>
                          ) : (
                            <button className={`tier-btn-${ct}`} onClick={() => openCheckout(plan)}>Buy Plan</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {n > 3 && <button className="slider-arrow" onClick={next}><i className="bi bi-chevron-right" /></button>}
              </div>
              {n > 1 && (
                <div className="conveyor-dots">
                  {sellerPlans.map((_, i) => <button key={i} className={`conveyor-dot${i === sellerCenter ? ' active' : ''}`} onClick={() => setSellerCenter(i)} />)}
                </div>
              )}
            </div>
          );
        })() : <p className="normal_label_font text-center py-4">No seller plans available</p>}

        {(user?.role === 'admin' || isSuperAdmin) && buyerPlans.length > 0 && (() => {
          const n = buyerPlans.length;
          const li = (buyerCenter - 1 + n) % n, ri = (buyerCenter + 1) % n;
          const vis = n === 1 ? [buyerPlans[0]] : n === 2 ? [buyerPlans[0], buyerPlans[1]] : [buyerPlans[li], buyerPlans[buyerCenter], buyerPlans[ri]];
          const pos = n === 1 ? ['center'] : n === 2 ? ['side','center'] : ['side','center','side'];
          const prev = () => { if (buyerAnimating) return; setBuyerAnimating(true); setTimeout(() => { setBuyerCenter(c => (c - 1 + n) % n); setBuyerAnimating(false); }, 500); };
          const next = () => { if (buyerAnimating) return; setBuyerAnimating(true); setTimeout(() => { setBuyerCenter(c => (c + 1) % n); setBuyerAnimating(false); }, 500); };
          return (
            <>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem', marginTop: '2rem' }}>Buyer Plans</h2>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {n > 3 && <button className="slider-arrow" onClick={prev}><i className="bi bi-chevron-left" /></button>}
                  <div className="plan-conveyor" style={{ flex: 1 }}>
                    {vis.map((plan, vi) => {
                      const p = pos[vi]; const isC = p === 'center';
                      const ct = Number(plan.is_featured) === 1 ? 'standard' : isC ? 'standard' : vi === 0 ? 'basic' : 'elite';
                      return (
                        <div key={plan.id} className={`plan-card-wrap ${buyerAnimating && !isC ? (vi === 0 ? 'exiting' : 'entering') : p}`}>
                          <div className={`tier-${ct}`} style={isC ? { borderColor: '#ffc63a55', borderWidth: 1.5 } : {}}>
                            {Number(plan.is_most_selected) === 1 && <div className="tier-badge">Most Selected</div>}
                            {isC && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#ffc63a,#D7B467)', borderRadius: '2rem 2rem 0 0' }} />}
                            <div style={{ marginBottom: '2rem' }}>
                              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111', marginBottom: '0.4rem' }}>{plan.name}</h2>
                              <p style={{ fontSize: '0.82rem', fontWeight: 500, color: isC ? '#D7B467' : '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{plan.plan_type} Based</p>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#111' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                              {[{ icon: 'contacts', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Contacts` }, { icon: 'schedule', text: `${Number(plan.duration_hours) || '∞'} Hours Validity` }, { icon: 'chat', text: 'Direct Messaging Access' }].map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                                  <span className="material-symbols-outlined" style={{ color: '#ffc63a', fontSize: '1.1rem', width: 20, flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: isC ? 600 : 400, color: '#374151' }}>{f.text}</span>
                                </li>
                              ))}
                            </ul>
                            {isSuperAdmin ? (
                              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button style={{ width: '100%', padding: '.7rem', borderRadius: '9999px', background: Number(plan.is_featured) === 1 ? '#D7B467' : '#f3f4f6', color: Number(plan.is_featured) === 1 ? '#fff' : '#374151', border: 'none', fontWeight: 700, fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} onClick={() => toggleFeatured(plan)} disabled={togglingId === plan.id}>
                                  {togglingId === plan.id ? <span className="spinner-border spinner-border-sm" /> : <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: Number(plan.is_featured) === 1 ? "'FILL' 1" : "'FILL' 0" }}>workspace_premium</span>}
                                  {Number(plan.is_featured) === 1 ? 'Premium' : 'Set Premium'}
                                </button>
                                <button style={{ width: '100%', padding: '.7rem', borderRadius: '9999px', background: Number(plan.is_most_selected) === 1 ? '#1a1a1a' : '#f3f4f6', color: Number(plan.is_most_selected) === 1 ? '#ffc63a' : '#374151', border: 'none', fontWeight: 700, fontSize: '.65rem', textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} onClick={() => toggleMostSelected(plan)} disabled={togglingMsId === plan.id}>
                                  {togglingMsId === plan.id ? <span className="spinner-border spinner-border-sm" /> : <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: Number(plan.is_most_selected) === 1 ? "'FILL' 1" : "'FILL' 0" }}>star</span>}
                                  {Number(plan.is_most_selected) === 1 ? 'Most Selected' : 'Set Most Selected'}
                                </button>
                              </div>
                            ) : (
                              <button className={`tier-btn-${ct}`} onClick={() => openCheckout(plan)}>Buy Plan</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {n > 3 && <button className="slider-arrow" onClick={next}><i className="bi bi-chevron-right" /></button>}
                </div>
                {n > 1 && (
                  <div className="conveyor-dots">
                    {buyerPlans.map((_, i) => <button key={i} className={`conveyor-dot${i === buyerCenter ? ' active' : ''}`} onClick={() => setBuyerCenter(i)} />)}
                  </div>
                )}
              </div>
            </>
          );
        })()}

      </div>

      {/* ── Payment Modal ── */}
      {modalOpen && (
        <div className="pay-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pay-modal">
            <div className="pay-modal-header">
              <div>
                <h5 className="fw-bold mb-0">Complete Payment</h5>
                <p className="text-muted small mb-0">Secure checkout via PhonePe</p>
              </div>
              <button className="close-btn" onClick={closeModal} disabled={paying}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {checkoutLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: '#ffc63a' }} />
                <p className="text-muted mt-3 small">Loading plan details…</p>
              </div>
            ) : checkoutData && (
              <div className="pay-modal-body">
                <div className="row g-4">

                  {/* Left — Plan info */}
                  <div className="col-md-6">
                    {/* Plan card */}
                    <div className="d-flex align-items-center p-3 rounded-3 border border-warning-subtle mb-4" style={{ background: '#fffdf5' }}>
                      <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{ width: 46, height: 46, background: '#000', color: '#ffc63a' }}>
                        <i className="bi bi-gem fs-5" />
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-0">{checkoutData.plan.name}</h6>
                        <span className="plan-chip">{checkoutData.plan.plan_type}</span>
                      </div>
                      <div className="fw-bold">₹{Number(checkoutData.plan.price).toLocaleString('en-IN')}</div>
                    </div>

                    {/* Privileges */}
                    <h6 className="fw-bold mb-3">What you get</h6>
                    <ul className="list-unstyled privilege-list">
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        {checkoutData.plan.plan_type === 'quantity'
                          ? <span><strong>{checkoutData.plan.limit_value}</strong> product listing slots</span>
                          : <span><strong>Unlimited</strong> listings for the duration</span>}
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        <span>Validity:&nbsp;<strong>{Number(checkoutData.plan.duration_hours) > 0 ? checkoutData.plan.duration_hours + ' Hours' : 'Life-Time'}</strong></span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        <span>Priority visibility &amp; seller badge</span>
                      </li>
                    </ul>

                    {/* Billing info */}
                    <div className="p-3 rounded-3 bg-light border mt-3">
                      <p className="fw-bold mb-1 small">{checkoutData.user.name}</p>
                      <p className="text-muted mb-0" style={{ fontSize: '.8rem' }}>{checkoutData.user.email}</p>
                      {checkoutData.user.mobile && <p className="text-muted mb-0" style={{ fontSize: '.8rem' }}>{checkoutData.user.mobile}</p>}
                    </div>
                  </div>

                  {/* Right — Pricing + Pay */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Price Breakdown</h6>

                    <div className="price-row">
                      <span className="text-muted">Subscription Price</span>
                      <span className="fw-semibold">₹{basePrice.toFixed(2)}</span>
                    </div>

                    {checkoutData.charge_breakdown.map((c, i) => (
                      <div key={i} className="price-row">
                        <span className="text-muted">{c.name}&nbsp;({c.type === 'percentage' ? `${c.value}%` : 'Fixed'})</span>
                        <span className="fw-semibold">₹{Number(c.amount).toFixed(2)}</span>
                      </div>
                    ))}

                    {referralDiscount > 0 && (
                      <div className="price-row text-success">
                        <span className="fw-bold">Referral Credit</span>
                        <span className="fw-bold">− ₹{referralDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {couponDiscount > 0 && (
                      <div className="price-row text-success">
                        <span className="fw-bold">Coupon ({appliedCoupon})</span>
                        <span className="fw-bold">− ₹{couponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="price-total">
                      <span>Total Payable</span>
                      <span style={{ color: '#ffc63a' }}>₹{displayTotal.toFixed(2)}</span>
                    </div>

                    {/* Coupon */}
                    <div className="mt-4 mb-3">
                      <label className="form-label small fw-bold">Apply Coupon Code</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control coupon-input text-uppercase"
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                          disabled={couponLoading || paying}
                        />
                        <button
                          className="btn btn-outline-secondary coupon-btn fw-bold"
                          onClick={applyCoupon}
                          disabled={couponLoading || paying}
                        >
                          {couponLoading ? <span className="spinner-border spinner-border-sm" /> : 'Apply'}
                        </button>
                      </div>
                      {couponMsg && (
                        <div className={`small mt-1 ${couponMsg.ok ? 'text-success' : 'text-danger'}`}>
                          <i className={`bi ${couponMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-1`} />
                          {couponMsg.text}
                        </div>
                      )}
                    </div>

                    <div className="alert alert-warning small border-0 py-2 d-flex gap-2 align-items-start"
                      style={{ background: 'rgba(255,198,58,.12)', borderRadius: 8 }}>
                      <i className="bi bi-shield-lock-fill fs-6 flex-shrink-0" style={{ color: '#ffc63a' }} />
                      <span>Payments are 256-bit encrypted and secure via PhonePe.</span>
                    </div>

                    <button
                      className="btn-pay d-flex align-items-center justify-content-center gap-2"
                      onClick={processPayment}
                      disabled={paying}
                    >
                      {paying ? (
                        <><span className="spinner-border spinner-border-sm" /> Redirecting to PhonePe…</>
                      ) : (
                        <><i className="bi bi-wallet2 fs-5" /> Pay ₹{displayTotal.toFixed(2)}</>
                      )}
                    </button>

                    <div className="gateway-logo mt-3">
                      <i className="bi bi-lock-fill" />
                      <span>Secured by PhonePe Payment Gateway</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
