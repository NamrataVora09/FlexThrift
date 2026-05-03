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
  features?: string;
}
interface ActiveSub {
  id: number;
  plan_name: string;
  plan_type: string;
  limit_value: number;
  duration_hours: number;
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
  duration_hours: number;
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
  unlock_card?: Record<string, string>;
}

/* ---------- helpers ---------- */
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });
}
function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', day: '2-digit', year: 'numeric' });
}
function isLifetime(expires: string) {
  return new Date(expires).getFullYear() >= 2099;
}

/* ---------- component ---------- */
function SubscriptionsInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMsg, setFlashMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
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
    const error = searchParams.get('error');
    if (success) setFlashMsg({ text: decodeURIComponent(success), ok: true });
    if (error) setFlashMsg({ text: decodeURIComponent(error), ok: false });

    api.get<SubData>('/shared/subscriptions/buyer').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, [searchParams]);

  const handleChoosePlan = (plan: Plan) => {
    router.push(`/buyer/checkout-plan/${plan.id}`);
  };

  const goNext = () => { if (plans.length > VISIBLE) setPIdx(i => i + 1); };
  const goPrev = () => {
    if (plans.length <= VISIBLE) return;
    if (pIdx === 0) { setPAnim(false); setPIdx(plans.length - 1); }
    else setPIdx(i => i - 1);
  };

  // SuperAdmin has full access - no subscription needed
  if (user?.role === 'super_admin') {
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
        <div className="container py-5">
          <div className="text-center py-5 bg-white rounded-4 border shadow-sm">
            <i className="bi bi-shield-check" style={{ fontSize: '5rem', color: '#ffc63a' }}></i>
            <h3 className="mt-4 fw-bold">SuperAdmin Full Access</h3>
            <p className="text-muted">You have unlimited access to all features. No subscription required.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading)
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      </DashboardLayout>
    );

  /* Build active subscriptions list (prioritize dedicated active object from backend) */
  let activeSubscriptions: (ActiveSub | HistoryItem)[] = [];
  if (data?.active && new Date(data.active.expires_at) >= new Date()) {
    activeSubscriptions = [data.active];
  } else if (data?.history) {
    activeSubscriptions = data.history.filter(
      (h) => Number(h.is_active) === 1 && new Date(h.expires_at) >= new Date()
    );
  }

  const hasActiveSub = activeSubscriptions.length > 0;

  /* Track which quantity sub is "primary" (first with remaining usage) */
  let primaryFound = false;
  const subsWithMeta = activeSubscriptions.map((sub) => {
    const limit = Number(sub.limit_value ?? 0);
    const used = Number(sub.usage_count ?? 0);
    const isQuantity = sub.plan_type === 'quantity';
    const remaining = sub.plan_type === 'duration' ? 'Unlimited' : Math.max(0, limit - used);
    const percentUsed = sub.plan_type === 'duration' ? 0 : limit > 0 ? (used / limit) * 100 : 0;
    let isPrimary = false;
    if (isQuantity && used < limit && !primaryFound) {
      isPrimary = true;
      primaryFound = true;
    }
    return { ...sub, limit, used, isQuantity, remaining, percentUsed, isPrimary };
  });

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style>{`
        .luxury-sub-card{background:#fff;border-radius:20px;overflow:hidden;border:1px solid #eee;margin-bottom:30px}
        .sub-header{background:#000;padding:40px 30px;color:#fff;text-align:center}
        .sub-body{padding:40px}
        .stat-circle{width:130px;height:130px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid #ffc63a;margin:0 auto 20px}
        .value-large{font-size:2.5rem;font-weight:800;color:#000;line-height:1}
        .label-small{font-size:10px;font-weight:700;color:#6c757d;text-transform:uppercase;margin-top:5px}
        .tier-basic{background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;border:1px solid #e5e7eb;box-shadow: 0 10px 30px rgba(0,0,0,0.05);display:flex;flex-direction:column}
        .tier-standard{ background:#fff;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;transform:scale(1.03);z-index:10; border:1px solid #e5e7eb;box-shadow: 0 10px 30px rgba(0,0,0,0.05);border:1px solid #e5e7eb;box-shadow: 0 10px 30px rgba(0,0,0,0.05);}
        .tier-elite{background:#e7efe5;border-radius:1rem;padding:2.5rem;height:100%;width:100%;display:flex;flex-direction:column;position:relative;overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);}
        .tier-badge{position:absolute;top:0px;right:-5px;background:#d7b467;color:#ffff;padding:.4rem 1.2rem;border-bottom-left-radius:.75rem;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.15em}
        .tier-btn-basic{width:100%;padding:1rem;border-radius:9999px;background:#fdc003;color:#ffff;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-basic:hover{background:#0a0a0a;color:#fff}
        .tier-btn-standard{width:100%;padding:1rem;border-radius:9999px;background:#fdc003;color:#ffff;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .2s;margin-top:auto}
        .tier-btn-elite{width:100%;padding:1rem;border-radius:9999px;background:#d7b467;color:#fff;border:none;font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;transition:all .3s;margin-top:auto}
        .tier-btn-elite:hover{background:#c5a356}

        .btn-brand-sub{background:#ffc63a;color:#ffff;border:none;padding:14px;border-radius:12px;font-weight:700;width:100%;transition:.3s;cursor:pointer}
        .btn-brand-sub:hover{background:#000;color:#ffc63a}
}
        .feature-icon-sub{color:#ffc63a;font-size:1.2rem;margin-right:12px}
        .plan-conveyor{display:flex;gap:1.5rem;align-items:center;justify-content:center;overflow:hidden;padding:2rem 0 2.5rem;}
        .plan-card-wrap{flex:0 0 calc(33.333% - 1rem);transition:transform .5s cubic-bezier(.4,0,.2,1),opacity .5s,box-shadow .5s,filter .5s;}
        .plan-card-wrap.center{transform:scale(1.06) translateY(-8px);z-index:10;}
        .plan-card-wrap.side{transform:scale(0.93) translateY(0);opacity:0.82;}
        .plan-card-wrap.exiting{transform:scale(0.85) translateX(-60px);opacity:0;}
        .plan-card-wrap.entering{transform:scale(0.85) translateX(60px);opacity:0;}
        .conveyor-dots{display:flex;justify-content:center;gap:6px;margin-top:1rem;}
        .conveyor-dot{width:8px;height:8px;border-radius:50%;background:#e5e7eb;cursor:pointer;transition:all .3s;border:none;padding:0;}
        .conveyor-dot.active{background:#D7B467;width:22px;border-radius:9999px;}
        .plan-arrow{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:#374151;transition:all .2s;z-index:20;box-shadow:0 2px 8px rgba(0,0,0,.1)}
        .plan-arrow:hover{background:#D7B467;color:#fff;border-color:#D7B467;}
        .plan-arrow.left{left:8px}
        .plan-arrow.right{right:8px}
        .bento-grid{display:grid;grid-template-columns:1fr;gap:2rem;margin-bottom:2rem}
        @media(min-width:992px){.bento-grid{grid-template-columns:repeat(12,1fr)}}
        .bento-col-8{grid-column:span 1}
        .bento-col-4{grid-column:span 1}
        @media(min-width:992px){.bento-col-8{grid-column:span 8}.bento-col-4{grid-column:span 4}}
      `}</style>

      <div className="container">
        {/* -------- flash messages -------- */}
        {flashMsg && (
          <div className={`alert ${flashMsg.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
            <i className={`bi ${flashMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
            {flashMsg.text}
            <button type="button" className="btn-close" onClick={() => setFlashMsg(null)} />
          </div>
        )}

        {/* -------- header -------- */}
        {/* <div className="mb-5">
          <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', fontFamily: 'Poppins' }} className="mb-1">Subscription Details</h1>
        </div> */}

        {/* -------- active subscriptions -------- */}
        {subsWithMeta.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border">
            <i className="bi bi-gem opacity-25" style={{ fontSize: '5rem' }} />
            <h3 className="mt-4 fw-bold">No active plan found</h3>
            <p className="text-muted">Unlock direct access to sellers by subscribing to a plan.</p>
            <a href="#available-plans" className="btn btn-brand-sub px-5 rounded-pill mt-3" style={{ width: 'auto' }}>
              Explore Membership Plans
            </a>
          </div>
        ) : (
          subsWithMeta.map((sub) => (
            <div className="bento-grid" key={sub.id}>
              {/* --- Primary Status Card --- */}
              <div className="bento-col-8">
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280, border: '1px solid #f0f0f0', height: '100%' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <span style={{ background: '#D7B467', color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Plan</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        Valid For {sub.duration_hours > 0 ? `${sub.duration_hours} hour/s` : 'Unlimited hours'} 
                      </span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#111', marginBottom: '0.6rem', lineHeight: 1 }}>{sub.plan_name}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: '28rem', marginBottom: '2rem', textTransform: 'capitalize' }}>
                      {sub.plan_type.toUpperCase()} BASED
                    </p>
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{sub.remaining === 'Unlimited' ? " " : sub.remaining}</span>
                        {sub.plan_type !== 'duration' && <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>/ {sub.limit}</span>}
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.2rem' }}>{sub.remaining === 'Unlimited' ? 'Full Access' : 'Contacts Left'}</span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 10, background: '#e7e8e8', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#ffc63a', width: sub.plan_type === 'duration' ? '100%' : `${Math.max(2, 100 - sub.percentUsed)}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: '-5rem', top: '-5rem', width: '20rem', height: '20rem', background: '#D7B467', opacity: 0.05, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: '2rem', bottom: '1rem', opacity: 0.07, fontSize: '8rem', lineHeight: 1, pointerEvents: 'none', fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 48" }}>workspace_premium</span>
                </div>
              </div>

              {/* --- Unlock More Card --- */}
              {(() => {
                const uc = data?.unlock_card || {};
                const label = uc['buyer_unlock_label'] || 'Unlock More';
                const title = uc['buyer_unlock_title'] || 'Elevate to a Higher Tier';
                const btn   = uc['buyer_unlock_btn']   || 'Upgrade Plan';
                let items: { icon: string; text: string }[] = [
                  { icon: 'all_inclusive', text: 'Unlimited concierge contacts' },
                  { icon: 'stars',         text: 'Early access to new listings' },
                  { icon: 'insights',      text: 'Custom market reporting' },
                  { icon: 'support_agent', text: 'Priority support' },
                ];
                try { const p = JSON.parse(uc['buyer_unlock_items'] || '[]'); if (Array.isArray(p) && p.length) items = p; } catch {}
                return (
                  <div className="bento-col-4">
                    <div style={{ background: '#e7efe5', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 280, border: '1px solid #d1e4cf' }}>
                      <div>
                        <span style={{ color: '#D7B467', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '1.25rem' }}>{label}</span>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1F2937', marginBottom: '1rem', lineHeight: 1.2 }}>{title}</h3>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                          {items.map((b, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem', color: '#374151', fontSize: '0.85rem', fontWeight: 400 }}>
                              <span className="material-symbols-outlined" style={{ color: '#D7B467', fontSize: '1.1rem', flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{b.icon}</span>
                              {b.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <a href="#available-plans" style={{ display: 'block', textAlign: 'center', marginTop: '2rem', background: '#D7B467', color: '#fff', padding: '0.9rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', textDecoration: 'none', transition: 'background 0.3s' }}>
                        {btn}
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))
        )}

        {/* -------- available plans -------- */}
        <div className="mt-5 pt-4" id="available-plans">
          <h2 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: '1.25rem' }}>Available Plans</h2>
          {plans.length > 0 ? (
            <div style={{ position: 'relative' }}>
              {plans.length > VISIBLE && (
                <>
                  <button className="plan-arrow left" onClick={goPrev}><i className="bi bi-chevron-left" /></button>
                  <button className="plan-arrow right" onClick={goNext}><i className="bi bi-chevron-right" /></button>
                </>
              )}
              <div style={{ overflow: 'hidden', width: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                padding: '20px 0',
                width: `${(loopPlans.length / VISIBLE) * 100}%`,
                transform: plans.length > VISIBLE ? `translateX(calc(-${pIdx} * 100% / ${loopPlans.length}))` : 'none',
                transition: pAnim ? 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
              }}>
                {loopPlans.map((plan, idx) => {
                  const isPopular = Number(plan.is_most_selected) === 1;
                  const isFeatured = Number(plan.is_featured) === 1;
                  const cardClass = isFeatured ? 'tier-elite' : isPopular ? 'tier-standard' : 'tier-basic';
                  const btnClass = isFeatured ? 'tier-btn-elite' : isPopular ? 'tier-btn-standard' : 'tier-btn-basic';
                  const nameColor =  '#0a0a0a' ;
                  const typeColor = isFeatured ? '#734d26' : '#6b7280';
                  const priceColor =  '#0a0a0a';
                  const iconColor = '#fdc003';
                  const textColor =  '#2d2f2f';
                  return (
                    <div key={`${plan.id}-${idx}`} style={{ width: `${100 / loopPlans.length}%`, padding: '0 0.75rem', boxSizing: 'border-box', display: 'flex' }}>
                      <div className={cardClass}>
                        {isPopular && <div className="tier-badge" >Most Selected</div>}
                        <div style={{ marginBottom: '3rem' }}>
                          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: nameColor, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>{plan.name}</h2>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: typeColor, margin: 0 }}>
                            {plan.plan_type.toUpperCase()}  BASED
                          </p>
                        </div>
                        <div style={{ marginBottom: '3rem' }}>
                          <span style={{ fontSize: '3rem', fontWeight: 900, color: priceColor, letterSpacing: '-0.03em' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>

                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '4rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {(() => {
                            const coreFeatures = [
                              { icon: 'contacts', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Contacts` },
                              { icon: 'schedule', text: `${Number(plan.duration_hours) > 0 ? plan.duration_hours + ' Hours' : 'Life-Time'} Validity` },
                            ];
                            let customFeatures: { icon: string; text: string }[] = [];
                            try { if (plan.features) customFeatures = JSON.parse(plan.features); } catch (e) {}
                            
                            const filteredCustom = customFeatures.filter(cf => 
                              cf.text && 
                              !cf.text.toLowerCase().includes('contact') && 
                              !cf.text.toLowerCase().includes('validity') && 
                              !cf.text.toLowerCase().includes('hour')
                            );

                            const allFeatures = [...coreFeatures, ...filteredCustom];

                            return allFeatures.map((f, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: textColor }}>
                                <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: '1.3rem', flexShrink: 0, fontVariationSettings: isFeatured ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: isPopular ? 600 : 400 }}>{f.text}</span>
                              </li>
                            ));
                          })()}
                        </ul>
                        <button className={btnClass} onClick={() => handleChoosePlan(plan)}>Buy Plan</button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
      <SubscriptionsInner />
    </Suspense>
  );
}
