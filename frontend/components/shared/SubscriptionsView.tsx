'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Plan { id: number; name: string; plan_type: string; limit_value: number; duration_hours: number; price: string; is_featured?: number | string; }
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
  const [planSlide, setPlanSlide] = useState(0);
  const [buyerSlide, setBuyerSlide] = useState(0);

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

  // SuperAdmin has full access view
  if (user?.role === 'super_admin') {
    return (
      <DashboardLayout requiredRoles={['super_admin']}>
        <div className="container">
          <div className="text-center py-5 bg-white rounded-4 border">
            <i className="bi bi-shield-check" style={{ fontSize: '5rem', color: '#ffc63a' }}></i>
            <h3 className="mt-4 fw-bold">SuperAdmin Full Access</h3>
            <p className="text-muted">You have unlimited access to all features. No subscription required.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) setFlashMsg({ text: decodeURIComponent(success), ok: true });
    if (error)   setFlashMsg({ text: decodeURIComponent(error),   ok: false });

    // For regular admins, we show both types of plans for their information
    if (user?.role === 'admin') {
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
  const sellerSlideCount = Math.ceil(sellerPlans.length / 3);
  const buyerSlideCount = Math.ceil(buyerPlans.length / 3);

  useEffect(() => {
    if (sellerSlideCount <= 1) return;
    const t = setInterval(() => setPlanSlide(s => (s + 1) % sellerSlideCount), 4000);
    return () => clearInterval(t);
  }, [sellerSlideCount]);

  useEffect(() => {
    if (buyerSlideCount <= 1) return;
    const t = setInterval(() => setBuyerSlide(s => (s + 1) % buyerSlideCount), 4000);
    return () => clearInterval(t);
  }, [buyerSlideCount]);

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
        .tier-btn-basic{width:100%;padding:.9rem;border-radius:9999px;border:2px solid #111;background:transparent;color:#111;font-weight:700;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-basic:hover{background:#111;color:#fff}
        .tier-btn-standard{width:100%;padding:.9rem;border-radius:9999px;background:#D7B467;color:#fff;border:none;font-weight:900;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .2s;box-shadow:0 10px 25px rgba(215,180,103,.3);margin-top:auto}
        .tier-btn-standard:hover{transform:scale(1.03);background:#c9a455}
        .tier-btn-elite{width:100%;padding:.9rem;border-radius:9999px;background:#fff;color:#111;border:none;font-weight:900;font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-elite:hover{background:#D7B467;color:#fff}
        .slider-arrow{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .2s;z-index:5}
        .slider-arrow:hover{background:#D7B467;color:#fff;border-color:#D7B467}
        .slider-arrow.left{left:-22px}
        .slider-arrow.right{right:-22px}
        .slider-dots{display:flex;justify-content:center;gap:6px;margin-top:1.5rem}
        .slider-dot{width:8px;height:8px;border-radius:50%;background:#e5e7eb;cursor:pointer;transition:all .3s}
        .slider-dot.active{background:#D7B467;width:22px;border-radius:9999px}
        .bento-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-bottom:2rem}
        @media(min-width:992px){.bento-grid{grid-template-columns:repeat(12,1fr)}}
        .bento-col-8{grid-column:span 1}
        .bento-col-4{grid-column:span 1}
        @media(min-width:992px){.bento-col-8{grid-column:span 8}.bento-col-4{grid-column:span 4}}
      `}</style>

      <div className="container">
        <PageHeader title="Subscription Details" />

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                      <div>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{isQty ? remaining : '∞'}</span>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.5rem' }}>{isQty ? 'Listings Left' : 'Full Access'}</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isQty ? `${limit} Total Cap` : 'Unlimited Mode'}</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#e7e8e8', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#D7B467', width: isQty ? `${Math.max(2, 100 - pct)}%` : '100%', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: '-5rem', top: '-5rem', width: '20rem', height: '20rem', background: '#D7B467', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                  <i className="bi bi-gem" style={{ position: 'absolute', right: '2rem', bottom: '1rem', opacity: 0.07, fontSize: '8rem', lineHeight: 1, pointerEvents: 'none' }} />
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
                      {['Unlimited product listings', 'Priority placement in search', 'Advanced seller analytics', 'Dedicated seller support'].map((b, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem', color: '#374151', fontSize: '0.85rem', fontWeight: 400 }}>
                          <i className="bi bi-check-circle-fill" style={{ color: '#D7B467', fontSize: '0.85rem', flexShrink: 0 }} />
                          {b}
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
        {sellerPlans.length > 0 ? (
          <div style={{ position: 'relative', padding: '0 30px' }}>
            {sellerSlideCount > 1 && (
              <>
                <button className="slider-arrow left" onClick={() => setPlanSlide(s => (s - 1 + sellerSlideCount) % sellerSlideCount)}><i className="bi bi-chevron-left" /></button>
                <button className="slider-arrow right" onClick={() => setPlanSlide(s => (s + 1) % sellerSlideCount)}><i className="bi bi-chevron-right" /></button>
              </>
            )}
            <div className="row g-4 align-items-center">
              {sellerPlans.slice(planSlide * 3, planSlide * 3 + 3).map((plan, idx) => {
                const cardType = Number(plan.is_featured) === 1 ? 'standard' : idx === 0 ? 'basic' : idx === 1 ? 'standard' : 'elite';
                const isFeatured = cardType === 'standard';
                const isElite = cardType === 'elite';
                return (
                  <div key={plan.id} className="col-md-4">
                    <div className={`tier-${cardType}`}>
                      {isFeatured && <div className="tier-badge">Most Selected</div>}
                      <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111', marginBottom: '0.4rem' }}>{plan.name}</h2>
                        <p style={{ fontSize: '0.82rem', fontWeight: isFeatured ? 700 : 500, color: isFeatured ? '#D7B467' : '#6b7280', margin: 0 }}>{plan.plan_type === 'duration' ? 'Duration Based' : 'Usage Based'}</p>
                      </div>
                      <div style={{ marginBottom: '2rem' }}>
                        <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#111' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: '#9ca3af', marginTop: '0.4rem', marginBottom: 0 }}>{plan.plan_type === 'duration' ? 'One-time access fee' : 'Usage based pricing'}</p>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                        {[{ icon: 'bi-box-seam', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Listings` }, { icon: 'bi-clock', text: `${Number(plan.duration_hours) || '∞'} Hours Validity` }, { icon: 'bi-shield-check', text: 'Verified Seller Badge' }].map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                            <i className={`bi ${f.icon}`} style={{ color: isFeatured || isElite ? '#D7B467' : '#9ca3af', fontSize: '1rem', width: 20 }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: isFeatured ? 600 : 400, color: '#374151' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                      <button className={`tier-btn-${cardType}`} onClick={() => openCheckout(plan)}>{hasActiveSub ? 'Purchase More' : 'Subscribe & Pay'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {sellerSlideCount > 1 && (
              <div className="slider-dots">
                {Array.from({ length: sellerSlideCount }).map((_, i) => (
                  <div key={i} className={`slider-dot${planSlide === i ? ' active' : ''}`} onClick={() => setPlanSlide(i)} />
                ))}
              </div>
            )}
          </div>
        ) : <p className="normal_label_font text-center py-4">No seller plans available</p>}

        {user?.role === 'admin' && buyerPlans.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem', marginTop: '2rem' }}>Buyer Plans</h2>
            <div style={{ position: 'relative', padding: '0 30px' }}>
              {buyerSlideCount > 1 && (
                <>
                  <button className="slider-arrow left" onClick={() => setBuyerSlide(s => (s - 1 + buyerSlideCount) % buyerSlideCount)}><i className="bi bi-chevron-left" /></button>
                  <button className="slider-arrow right" onClick={() => setBuyerSlide(s => (s + 1) % buyerSlideCount)}><i className="bi bi-chevron-right" /></button>
                </>
              )}
              <div className="row g-4 align-items-center">
                {buyerPlans.slice(buyerSlide * 3, buyerSlide * 3 + 3).map((plan, idx) => {
                  const cardType = Number(plan.is_featured) === 1 ? 'standard' : idx === 0 ? 'basic' : idx === 1 ? 'standard' : 'elite';
                  const isFeatured = cardType === 'standard';
                  const isElite = cardType === 'elite';
                  return (
                    <div key={plan.id} className="col-md-4">
                      <div className={`tier-${cardType}`}>
                        {isFeatured && <div className="tier-badge">Most Selected</div>}
                        <div style={{ marginBottom: '2rem' }}>
                          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111', marginBottom: '0.4rem' }}>{plan.name}</h2>
                          <p style={{ fontSize: '0.82rem', fontWeight: isFeatured ? 700 : 500, color: isFeatured ? '#D7B467' : '#6b7280', margin: 0 }}>{plan.plan_type === 'duration' ? 'Duration Based' : 'Usage Based'}</p>
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                          <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#111' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: '#9ca3af', marginTop: '0.4rem', marginBottom: 0 }}>{plan.plan_type === 'duration' ? 'One-time access fee' : 'Usage based pricing'}</p>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                          {[{ icon: 'bi-people', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Contacts` }, { icon: 'bi-clock', text: `${Number(plan.duration_hours) || '∞'} Hours Validity` }, { icon: 'bi-chat-dots', text: 'Direct Messaging Access' }].map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                              <i className={`bi ${f.icon}`} style={{ color: isFeatured || isElite ? '#D7B467' : '#9ca3af', fontSize: '1rem', width: 20 }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: isFeatured ? 600 : 400, color: '#374151' }}>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                        <button className={`tier-btn-${cardType}`} onClick={() => openCheckout(plan)}>{hasActiveSub ? 'Purchase More' : 'Subscribe & Pay'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {buyerSlideCount > 1 && (
                <div className="slider-dots">
                  {Array.from({ length: buyerSlideCount }).map((_, i) => (
                    <div key={i} className={`slider-dot${buyerSlide === i ? ' active' : ''}`} onClick={() => setBuyerSlide(i)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

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
