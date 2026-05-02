'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

/* ---------- types ---------- */
interface Plan {
  id: number;
  name: string;
  plan_type: string;
  limit_value: number;
  duration_hours: number;
  price: string;
  is_featured?: number | string;
  is_most_selected?: number | string;
}
interface ActiveSub {
  id: number;
  plan_name: string;
  plan_type: string;
  limit_value: number;
  price: string;
  starts_at: string;
  created_at: string;
  expires_at: string;
  usage_count: number;
}
interface HistoryItem {
  id: number;
  plan_name: string;
  plan_type: string;
  limit_value: number;
  price: string;
  starts_at: string;
  expires_at: string;
  is_active: number;
  usage_count: number;
}
interface SubData {
  plans: Plan[];
  active: ActiveSub | null;
  history: HistoryItem[];
}

/* ---------- helpers ---------- */
function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', day: '2-digit', year: 'numeric' });
}
function isLifetime(expires: string) {
  return new Date(expires).getFullYear() >= 2099;
}

/* ---------- component ---------- */
function SellerSubscriptionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMsg, setFlashMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pIdx, setPIdx] = useState(0);
  const [pAnim, setPAnim] = useState(true);

  const plans = data?.plans || [];
  const VISIBLE = 3;
  const loopPlans = plans.length > VISIBLE ? [...plans, ...plans.slice(0, VISIBLE - 1)] : plans;

  useEffect(() => {
    if (plans.length <= VISIBLE) return;
    const t = setInterval(() => setPIdx(i => i + 1), 4000);
    return () => clearInterval(t);
  }, [plans.length]);

  useEffect(() => {
    if (pIdx >= plans.length) {
      const id = setTimeout(() => { setPAnim(false); setPIdx(0); }, 620);
      return () => clearTimeout(id);
    }
  }, [pIdx, plans.length]);

  useEffect(() => {
    if (!pAnim) { const id = setTimeout(() => setPAnim(true), 50); return () => clearTimeout(id); }
  }, [pAnim]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error   = searchParams.get('error');
    if (success) setFlashMsg({ text: decodeURIComponent(success), ok: true });
    if (error)   setFlashMsg({ text: decodeURIComponent(error),   ok: false });

    api.get<SubData>('/seller/subscriptions/seller').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, [searchParams]);

  const handleChoosePlan = (plan: Plan) => {
    router.push(`/seller/checkout-plan/${plan.id}`);
  };

  if (loading)
    return (
      <DashboardLayout requiredRoles={['seller', 'super_admin']}>
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      </DashboardLayout>
    );

  let activeSubscriptions: (ActiveSub | HistoryItem)[] = [];
  if (data?.active) {
    activeSubscriptions = [data.active];
  } else if (data?.history) {
    activeSubscriptions = data.history.filter(
      (h) => Number(h.is_active) === 1 && new Date(h.expires_at) >= new Date()
    );
  }

  const subsWithMeta = activeSubscriptions.map((sub) => {
    const limit      = Number(sub.limit_value ?? 0);
    const used       = Number(sub.usage_count ?? 0);
    const isQuantity = sub.plan_type === 'quantity';
    const remaining  = sub.plan_type === 'duration' ? 'Unlimited' : Math.max(0, limit - used);
    const percentUsed = sub.plan_type === 'duration' ? 0 : limit > 0 ? (used / limit) * 100 : 0;
    return { ...sub, limit, used, isQuantity, remaining, percentUsed };
  });

  return (
    <DashboardLayout requiredRoles={['seller', 'super_admin']}>
      <style>{`
        .tier-basic{background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;border-top:4px solid transparent;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;display:flex;flex-direction:column}
        .tier-standard{background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;transform:scale(1.03);z-index:10}
        .tier-elite{background:#0c0f0f;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden}
        .tier-badge{position:absolute;top:0;right:0;background:#fdc003;color:#3d2b00;padding:.4rem 1.2rem;border-bottom-left-radius:.75rem;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.15em}
        .tier-btn-basic{width:100%;padding:1rem;border-radius:9999px;background:none;border:2px solid #0a0a0a;color:#0a0a0a;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-basic:hover{background:#0a0a0a;color:#fff}
        .tier-btn-standard{width:100%;padding:1rem;border-radius:9999px;background:#fdc003;color:#3d2b00;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .2s;margin-top:auto}
        .tier-btn-elite{width:100%;padding:1rem;border-radius:9999px;background:#fff;color:#0a0a0a;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-elite:hover{background:#fdc003}
        .btn-brand-sub{background:#fdc003;color:#3d2b00;border:none;padding:14px;border-radius:12px;font-weight:700;width:100%;transition:.3s;cursor:pointer}
        .btn-brand-sub:hover{background:#0a0a0a;color:#fff}
        .bento-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-bottom:2rem}
        @media(min-width:992px){.bento-grid{grid-template-columns:repeat(12,1fr)}}
        .bento-col-8{grid-column:span 1}
        .bento-col-4{grid-column:span 1}
        @media(min-width:992px){.bento-col-8{grid-column:span 8}.bento-col-4{grid-column:span 4}}
      `}</style>

      <div className="container">
        {flashMsg && (
          <div className={`alert ${flashMsg.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
            <i className={`bi ${flashMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
            {flashMsg.text}
            <button type="button" className="btn-close" onClick={() => setFlashMsg(null)} />
          </div>
        )}

        {/* -------- active subscriptions -------- */}
        {subsWithMeta.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border">
            <i className="bi bi-gem opacity-25" style={{ fontSize: '5rem' }} />
            <h3 className="mt-4 fw-bold">No active plan found</h3>
            <p className="text-muted">Unlock product listing features by subscribing to a plan.</p>
            <a href="#available-plans" className="btn btn-brand-sub px-5 rounded-pill mt-3" style={{ width: 'auto' }}>
              Explore Membership Plans
            </a>
          </div>
        ) : (
          subsWithMeta.map((sub) => (
            <div className="bento-grid" key={sub.id}>
              <div className="bento-col-8">
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280, border: '1px solid #f0f0f0', height: '100%' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <span style={{ background: '#D7B467', color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Plan</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        Valid until {isLifetime(sub.expires_at) ? 'No Expiry' : fmtDateLong(sub.expires_at)}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#111', marginBottom: '0.6rem', lineHeight: 1 }}>{sub.plan_name}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: '28rem', marginBottom: '2rem' }}>
                      {sub.plan_type === 'duration' ? 'Full duration-based access to all platform features.' : `Usage-based plan · ${sub.used} used out of ${sub.limit} listings.`}
                    </p>
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{sub.remaining === 'Unlimited' ? ' ' : sub.remaining}</span>
                        {sub.plan_type !== 'duration' && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>/ {sub.limit}</span>}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{sub.remaining === 'Unlimited' ? 'Full Access' : 'Listings Left'}</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#e7e8e8', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#ffc63a', width: sub.plan_type === 'duration' ? '100%' : `${Math.max(2, 100 - sub.percentUsed)}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: '-5rem', top: '-5rem', width: '20rem', height: '20rem', background: '#D7B467', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: '2rem', bottom: '1rem', opacity: 0.07, fontSize: '8rem', lineHeight: 1, pointerEvents: 'none', fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48" }}>workspace_premium</span>
                </div>
              </div>

              <div className="bento-col-4">
                <div style={{ background: '#e7efe5', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 280, border: '1px solid #d1e4cf' }}>
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
                  <a href="#available-plans" style={{ display: 'block', textAlign: 'center', marginTop: '2rem', background: '#D7B467', color: '#fff', padding: '0.9rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', textDecoration: 'none', transition: 'background 0.3s' }}>
                    Upgrade Plan
                  </a>
                </div>
              </div>
            </div>
          ))
        )}

        {/* -------- available plans -------- */}
        <div className="mt-5 pt-4" id="available-plans">
          <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem' }}>Available Plans</h2>
          {plans.length > 0 ? (
            <div style={{ overflow: 'hidden', width: '100%' }}>
              <div style={{
                display: 'flex',
                padding: '20px 0',
                width: `${(loopPlans.length / VISIBLE) * 100}%`,
                transform: plans.length > VISIBLE ? `translateX(calc(-${pIdx} * 100% / ${loopPlans.length}))` : 'none',
                transition: pAnim ? 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
              }}>
                {loopPlans.map((plan, idx) => {
                  const isPopular  = Number(plan.is_most_selected) === 1;
                  const isFeatured = Number(plan.is_featured) === 1;
                  const cardClass  = isFeatured ? 'tier-elite' : isPopular ? 'tier-standard' : 'tier-basic';
                  const btnClass   = isFeatured ? 'tier-btn-elite' : isPopular ? 'tier-btn-standard' : 'tier-btn-basic';
                  const nameColor  = isFeatured ? '#fff' : '#0a0a0a';
                  const typeColor  = isFeatured ? '#fdc003' : isPopular ? '#755700' : '#5a5c5c';
                  const priceColor = isFeatured ? '#fff' : '#0a0a0a';
                  const iconColor  = (isFeatured || isPopular) ? '#fdc003' : '#9ca3af';
                  const textColor  = isFeatured ? '#fff' : '#2d2f2f';
                  return (
                    <div key={`${plan.id}-${idx}`} style={{ width: `${100 / loopPlans.length}%`, padding: '0 0.75rem', boxSizing: 'border-box', display: 'flex' }}>
                      <div className={cardClass} style={{ width: '100%' }}>
                        {isPopular && <div className="tier-badge">Most Selected</div>}
                        <div style={{ marginBottom: '3rem' }}>
                          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: nameColor, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>{plan.name}</h2>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: typeColor, margin: 0 }}>
                            {plan.plan_type.toUpperCase()} BASED
                          </p>
                        </div>
                        <div style={{ marginBottom: '3rem' }}>
                          <span style={{ fontSize: '3rem', fontWeight: 900, color: priceColor, letterSpacing: '-0.03em' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '4rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {[
                            { icon: 'storefront', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Listings` },
                            { icon: 'schedule',   text: `${Number(plan.duration_hours) || '∞'} Hours Validity` },
                            { icon: 'verified',   text: 'Verified Seller Badge' },
                          ].map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: textColor }}>
                              <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '1.3rem', flexShrink: 0, fontVariationSettings: (isFeatured || isPopular) ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: isPopular ? 600 : 400 }}>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                        <button className={btnClass} onClick={() => handleChoosePlan(plan)}>Buy Plan</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-muted text-center py-4">No plans available at the moment.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }} /></div>}>
      <SellerSubscriptionsInner />
    </Suspense>
  );
}
