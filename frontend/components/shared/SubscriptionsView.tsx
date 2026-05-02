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
interface SubData { plans: Plan[]; active: ActiveSub | null; history: HistoryItem[]; unlock_card?: Record<string, string>; }

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
  const [sIdx, setSIdx] = useState(0);
  const [sAnim, setSAnim] = useState(true);
  const [bIdx, setBIdx] = useState(0);
  const [bAnim, setBAnim] = useState(true);
  const VISIBLE = 3;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [paying, setPaying] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  // Management states
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [togglingMsId, setTogglingMsId] = useState<number | null>(null);
  const isSuperAdmin = user?.role === 'super_admin';

  const sellerPlans = userType === 'seller' ? (data?.plans || []) : [];
  const buyerPlans = userType === 'buyer' ? (data?.plans || []) : [];

  const loopSeller = sellerPlans.length > VISIBLE ? [...sellerPlans, ...sellerPlans.slice(0, VISIBLE - 1)] : sellerPlans;
  const loopBuyer  = buyerPlans.length  > VISIBLE ? [...buyerPlans,  ...buyerPlans.slice(0,  VISIBLE - 1)] : buyerPlans;

  const toggleFeatured = async (plan: Plan) => {
    setTogglingId(plan.id);
    const res = await api.post(`/shared/admin-subscription-plans/${plan.id}/toggle-featured`, {});
    setTogglingId(null);
    if (res.success) {
      const r = await api.get<SubData>(`/${role}/subscriptions/${userType}`);
      if (r.success && r.data) setData(r.data);
    }
  };

  const toggleMostSelected = async (plan: Plan) => {
    setTogglingMsId(plan.id);
    const res = await api.post(`/shared/admin-subscription-plans/${plan.id}/toggle-most-selected`, {});
    setTogglingMsId(null);
    if (res.success) {
      const r = await api.get<SubData>(`/${role}/subscriptions/${userType}`);
      if (r.success && r.data) setData(r.data);
    }
  };

  useEffect(() => {
    api.get<SubData>(`/${role}/subscriptions/${userType}`).then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, [role, userType]);

  useEffect(() => {
    if (sellerPlans.length <= VISIBLE) return;
    const t = setInterval(() => setSIdx(i => i + 1), 4000);
    return () => clearInterval(t);
  }, [sellerPlans.length]);
  useEffect(() => {
    if (sIdx >= sellerPlans.length) { const id = setTimeout(() => { setSAnim(false); setSIdx(0); }, 620); return () => clearTimeout(id); }
  }, [sIdx, sellerPlans.length]);
  useEffect(() => { if (!sAnim) { const id = setTimeout(() => setSAnim(true), 50); return () => clearTimeout(id); } }, [sAnim]);

  useEffect(() => {
    if (buyerPlans.length <= VISIBLE) return;
    const t = setInterval(() => setBIdx(i => i + 1), 4000);
    return () => clearInterval(t);
  }, [buyerPlans.length]);
  useEffect(() => {
    if (bIdx >= buyerPlans.length) { const id = setTimeout(() => { setBAnim(false); setBIdx(0); }, 620); return () => clearTimeout(id); }
  }, [bIdx, buyerPlans.length]);
  useEffect(() => { if (!bAnim) { const id = setTimeout(() => setBAnim(true), 50); return () => clearTimeout(id); } }, [bAnim]);

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

  const basePrice = Number(checkoutData?.plan?.price ?? 0);
  const totalCharges = checkoutData?.total_charges ?? 0;
  const referralDiscount = checkoutData?.referral_discount ?? 0;
  const displayTotal = Math.max(1, basePrice + totalCharges - referralDiscount - couponDiscount);

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
        
        .nav-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px; border-radius: 50%;
          background: #fff; border: 1px solid #eee;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 10; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .nav-btn:hover { background: #ffc63a; border-color: #ffc63a; color: #fff; box-shadow: 0 8px 20px rgba(255,198,58,0.3); }
        .nav-btn.left { left: -15px; }
        .nav-btn.right { right: -15px; }

        .tier-basic{background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;border-top:4px solid transparent;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;display:flex;flex-direction:column}
        .tier-standard{background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;transform:scale(1.03);z-index:10}
        .tier-elite{background:#0c0f0f;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden}
        .tier-badge{position:absolute;top:0;right:0;background:#fdc003;color:#3d2b00;padding:.4rem 1.2rem;border-bottom-left-radius:.75rem;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.15em}
        .tier-btn-basic{width:100%;padding:1rem;border-radius:9999px;background:none;border:2px solid #0a0a0a;color:#0a0a0a;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-basic:hover{background:#0a0a0a;color:#fff}
        .tier-btn-standard{width:100%;padding:1rem;border-radius:9999px;background:#fdc003;color:#3d2b00;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .2s;margin-top:auto}
        .tier-btn-elite{width:100%;padding:1rem;border-radius:9999px;background:#fff;color:#0a0a0a;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-elite:hover{background:#fdc003}
        
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
          const active = data.active;
          const used = active.usage_count;
          const limit = active.limit_value;
          const isQty = active.plan_type !== 'duration';
          const remaining = isQty ? Math.max(0, limit - used) : null;
          const pct = isQty && limit > 0 ? Math.round((used / limit) * 100) : 0;
          const expires = active.expires_at ? new Date(active.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Expiry';
          return (
            <div className="bento-grid">
              <div className="bento-col-8">
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 260, border: '1px solid #f0f0f0', height: '100%' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <span style={{ background: '#D7B467', color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Plan</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Valid until {expires}</span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#111', marginBottom: '0.6rem', lineHeight: 1 }}>{active.plan_name}</h2>
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
              {(() => {
                const uc = data?.unlock_card || {};
                const ucLabel = uc[`${userType}_unlock_label`] || 'Unlock More';
                const ucTitle = uc[`${userType}_unlock_title`] || 'Elevate to a Higher Tier';
                const ucBtn   = uc[`${userType}_unlock_btn`]   || 'Upgrade Plan';
                const defaultItems = userType === 'seller'
                  ? [{ icon: 'all_inclusive', text: 'Unlimited product listings' }, { icon: 'stars', text: 'Priority placement in search' }, { icon: 'insights', text: 'Advanced seller analytics' }, { icon: 'support_agent', text: 'Dedicated seller support' }]
                  : [{ icon: 'all_inclusive', text: 'Unlimited concierge contacts' }, { icon: 'stars', text: 'Early access to new listings' }, { icon: 'insights', text: 'Custom market reporting' }, { icon: 'support_agent', text: 'Priority support' }];
                let ucItems: { icon: string; text: string }[] = defaultItems;
                try { const p = JSON.parse(uc[`${userType}_unlock_items`] || '[]'); if (Array.isArray(p) && p.length) ucItems = p; } catch {}
                return (
                  <div className="bento-col-4">
                    <div style={{ background: '#e7efe5', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 260, border: '1px solid #d1e4cf' }}>
                      <div>
                        <span style={{ color: '#D7B467', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '1.25rem' }}>{ucLabel}</span>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1F2937', marginBottom: '1rem', lineHeight: 1.2 }}>{ucTitle}</h3>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                          {ucItems.map((b, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem', color: '#374151', fontSize: '0.85rem', fontWeight: 400 }}>
                              <span className="material-symbols-outlined" style={{ color: '#D7B467', fontSize: '1.1rem', flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{b.icon}</span>
                              {b.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '2rem', background: '#D7B467', color: '#fff', padding: '0.9rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
                        {ucBtn}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Seller Plans */}
        <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem' }}>Available Plans</h2>
        {sellerPlans.length > 0 ? (
          <div style={{ overflow: 'hidden', width: '100%' }}>
            <div style={{ display: 'flex', padding: '20px 0', width: `${(loopSeller.length / VISIBLE) * 100}%`, transform: sellerPlans.length > VISIBLE ? `translateX(calc(-${sIdx} * 100% / ${loopSeller.length}))` : 'none', transition: sAnim ? 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
              {loopSeller.map((plan, idx) => {
                const isPopular = Number(plan.is_most_selected) === 1;
                const isFeatured = Number(plan.is_featured) === 1;
                const cardClass = isFeatured ? 'tier-elite' : isPopular ? 'tier-standard' : 'tier-basic';
                const btnClass  = isFeatured ? 'tier-btn-elite' : isPopular ? 'tier-btn-standard' : 'tier-btn-basic';
                const nameColor  = isFeatured ? '#fff' : '#0a0a0a';
                const typeColor  = isFeatured ? '#fdc003' : isPopular ? '#755700' : '#5a5c5c';
                const priceColor = isFeatured ? '#fff' : '#0a0a0a';
                const iconColor  = (isFeatured || isPopular) ? '#fdc003' : '#9ca3af';
                const textColor  = isFeatured ? '#fff' : '#2d2f2f';
                return (
                  <div key={`${plan.id}-${idx}`} style={{ width: `${100 / loopSeller.length}%`, padding: '0 0.75rem', boxSizing: 'border-box', display: 'flex' }}>
                    <div className={cardClass} style={{ width: '100%' }}>
                      {isPopular && <div className="tier-badge">Most Selected</div>}
                      <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: nameColor, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>{plan.name}</h3>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: typeColor, margin: 0 }}>{plan.plan_type === 'quantity' ? 'Professional Listing' : plan.plan_type === 'duration' ? 'Full Duration Access' : plan.plan_type}</p>
                      </div>
                      <div style={{ marginBottom: '3rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 900, color: priceColor, letterSpacing: '-0.03em' }}>&#8377;{Number(plan.price).toLocaleString('en-IN')}</span>
                        <p style={{ fontSize: '0.65rem', color: isFeatured ? '#6b7280' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginTop: '0.5rem', marginBottom: 0 }}>{plan.plan_type === 'duration' ? 'Full Access' : 'Per Plan'}</p>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '4rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {[{ icon: 'storefront', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Listings` }, { icon: 'verified', text: 'Verified Seller Badge' }, { icon: 'support_agent', text: 'Priority Support' }].map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: textColor }}>
                            <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '1.3rem', flexShrink: 0, fontVariationSettings: (isFeatured || isPopular) ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: isPopular ? 600 : 400 }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                      {isSuperAdmin ? (
                        <div className="d-flex flex-column gap-2" style={{ marginTop: 'auto' }}>
                          <button className="btn btn-sm btn-outline-secondary fw-bold rounded-pill" onClick={() => toggleFeatured(plan)} disabled={togglingId === plan.id}>{Number(plan.is_featured) === 1 ? 'Unset Premium' : 'Set Premium'}</button>
                          <button className="btn btn-sm fw-bold rounded-pill" style={{ background: '#fdc003', color: '#3d2b00', border: 'none' }} onClick={() => toggleMostSelected(plan)} disabled={togglingMsId === plan.id}>{Number(plan.is_most_selected) === 1 ? 'Unset Selected' : 'Set Selected'}</button>
                        </div>
                      ) : (
                        <button className={btnClass} onClick={() => openCheckout(plan)}>Buy Plan</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <p className="text-center py-4 text-muted">No seller plans available</p>}

        {/* Buyer Plans (for Admins) */}
        {(user?.role === 'admin' || isSuperAdmin) && buyerPlans.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem', marginTop: '3rem' }}>Buyer Plans</h2>
            <div style={{ overflow: 'hidden', width: '100%' }}>
              <div style={{ display: 'flex', padding: '20px 0', width: `${(loopBuyer.length / VISIBLE) * 100}%`, transform: buyerPlans.length > VISIBLE ? `translateX(calc(-${bIdx} * 100% / ${loopBuyer.length}))` : 'none', transition: bAnim ? 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
                {loopBuyer.map((plan, idx) => {
                  const isPopular = Number(plan.is_most_selected) === 1;
                  const isFeatured = Number(plan.is_featured) === 1;
                  const cardClass = isFeatured ? 'tier-elite' : isPopular ? 'tier-standard' : 'tier-basic';
                  const btnClass  = isFeatured ? 'tier-btn-elite' : isPopular ? 'tier-btn-standard' : 'tier-btn-basic';
                  const nameColor  = isFeatured ? '#fff' : '#0a0a0a';
                  const typeColor  = isFeatured ? '#fdc003' : isPopular ? '#755700' : '#5a5c5c';
                  const priceColor = isFeatured ? '#fff' : '#0a0a0a';
                  const iconColor  = (isFeatured || isPopular) ? '#fdc003' : '#9ca3af';
                  const textColor  = isFeatured ? '#fff' : '#2d2f2f';
                  return (
                    <div key={`${plan.id}-${idx}`} style={{ width: `${100 / loopBuyer.length}%`, padding: '0 0.75rem', boxSizing: 'border-box', display: 'flex' }}>
                      <div className={cardClass} style={{ width: '100%' }}>
                        {isPopular && <div className="tier-badge">Most Selected</div>}
                        <div style={{ marginBottom: '3rem' }}>
                          <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: nameColor, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>{plan.name}</h3>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: typeColor, margin: 0 }}>{plan.plan_type === 'quantity' ? 'Professional Sourcing' : plan.plan_type === 'duration' ? 'Full Duration Access' : plan.plan_type}</p>
                        </div>
                        <div style={{ marginBottom: '3rem' }}>
                          <span style={{ fontSize: '3rem', fontWeight: 900, color: priceColor, letterSpacing: '-0.03em' }}>&#8377;{Number(plan.price).toLocaleString('en-IN')}</span>
                          <p style={{ fontSize: '0.65rem', color: isFeatured ? '#6b7280' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginTop: '0.5rem', marginBottom: 0 }}>{plan.plan_type === 'duration' ? 'Full Access' : 'Per Plan'}</p>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '4rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {[{ icon: 'contacts', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Contacts` }, { icon: 'chat', text: 'Direct Messaging Access' }].map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: textColor }}>
                              <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '1.3rem', flexShrink: 0, fontVariationSettings: (isFeatured || isPopular) ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: isPopular ? 600 : 400 }}>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                        {isSuperAdmin ? (
                          <div className="d-flex flex-column gap-2" style={{ marginTop: 'auto' }}>
                            <button className="btn btn-sm btn-outline-secondary fw-bold rounded-pill" onClick={() => toggleFeatured(plan)} disabled={togglingId === plan.id}>{Number(plan.is_featured) === 1 ? 'Unset Premium' : 'Set Premium'}</button>
                            <button className="btn btn-sm fw-bold rounded-pill" style={{ background: '#fdc003', color: '#3d2b00', border: 'none' }} onClick={() => toggleMostSelected(plan)} disabled={togglingMsId === plan.id}>{Number(plan.is_most_selected) === 1 ? 'Unset Selected' : 'Set Selected'}</button>
                          </div>
                        ) : (
                          <button className={btnClass} onClick={() => openCheckout(plan)}>Buy Plan</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                        <h6 className="fw-bold mb-0">{checkoutData?.plan.name}</h6>
                        <span className="plan-chip">{checkoutData?.plan.plan_type}</span>
                      </div>
                      <div className="fw-bold">₹{Number(checkoutData?.plan.price).toLocaleString('en-IN')}</div>
                    </div>

                    {/* Privileges */}
                    <h6 className="fw-bold mb-3">What you get</h6>
                    <ul className="list-unstyled privilege-list">
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        {checkoutData?.plan.plan_type === 'quantity'
                          ? <span><strong>{checkoutData?.plan.limit_value}</strong> product listing slots</span>
                          : <span><strong>Unlimited</strong> listings for the duration</span>}
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        <span>Validity:&nbsp;<strong>{Number(checkoutData?.plan.duration_hours) > 0 ? checkoutData?.plan.duration_hours + ' Hours' : 'Life-Time'}</strong></span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0" />
                        <span>Priority visibility &amp; seller badge</span>
                      </li>
                    </ul>

                    {/* Billing info */}
                    <div className="p-3 rounded-3 bg-light border mt-3">
                      <p className="fw-bold mb-1 small">{checkoutData?.user.name}</p>
                      <p className="text-muted mb-0" style={{ fontSize: '.8rem' }}>{checkoutData?.user.email}</p>
                      {checkoutData?.user.mobile && <p className="text-muted mb-0" style={{ fontSize: '.8rem' }}>{checkoutData.user.mobile}</p>}
                    </div>
                  </div>

                  {/* Right — Pricing + Pay */}
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Price Breakdown</h6>

                    <div className="price-row">
                      <span className="text-muted">Subscription Price</span>
                      <span className="fw-semibold">₹{basePrice.toFixed(2)}</span>
                    </div>

                    {checkoutData?.charge_breakdown.map((c, i) => (
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
