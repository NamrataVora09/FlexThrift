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
  const [centerIdx, setCenterIdx] = useState(1);
  const [animating, setAnimating] = useState(false);

  const plans = data?.plans || [];

  useEffect(() => {
    if (plans.length <= 3) return;
    const t = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCenterIdx(c => (c + 1) % plans.length);
        setAnimating(false);
      }, 500);
    }, 3500);
    return () => clearInterval(t);
  }, [plans.length]);

  // SuperAdmin has full access - no subscription needed
  if (user?.role === 'super_admin') {
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
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
    // Show flash messages from payment callback redirect
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) setFlashMsg({ text: decodeURIComponent(success), ok: true });
    if (error) setFlashMsg({ text: decodeURIComponent(error), ok: false });

    api.get<SubData>('/shared/subscriptions/buyer').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  /* Build active subscriptions list (prioritize dedicated active object from backend) */
  let activeSubscriptions: any[] = [];
  if (data?.active) {
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

  const handleChoosePlan = (planId: number) => {
    router.push(`/buyer/checkout-plan/${planId}`);
  };

  if (loading)
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style>{`
        .luxury-sub-card{background:#fff;border-radius:20px;overflow:hidden;border:1px solid #eee;margin-bottom:30px}
        .sub-header{background:#000;padding:40px 30px;color:#fff;text-align:center}
        .sub-body{padding:40px}
        .stat-circle{width:130px;height:130px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid #ffc63a;margin:0 auto 20px;box-shadow:0 4px 15px rgba(255,198,58,.1)}
        .value-large{font-size:2.5rem;font-weight:800;color:#000;line-height:1}
        .label-small{font-size:10px;font-weight:700;color:#6c757d;text-transform:uppercase;margin-top:5px}
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
        .btn-brand-sub{background:#ffc63a;color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;width:100%;transition:.3s;cursor:pointer}
        .btn-brand-sub:hover{background:#000;color:#ffc63a}
        .btn-brand-sub:disabled{opacity:.6;cursor:not-allowed}
        .feature-icon-sub{color:#ffc63a;font-size:1.2rem;margin-right:12px}
        .plan-conveyor{display:flex;gap:1.5rem;align-items:center;justify-content:center;overflow:hidden;padding:2rem 0 2.5rem;}
        .plan-card-wrap{flex:0 0 calc(33.333% - 1rem);transition:transform .5s cubic-bezier(.4,0,.2,1),opacity .5s,box-shadow .5s,filter .5s;}
        .plan-card-wrap.center{transform:scale(1.06) translateY(-8px);z-index:10;filter:drop-shadow(0 20px 40px rgba(0,0,0,.14));}
        .plan-card-wrap.side{transform:scale(0.93) translateY(0);opacity:0.82;filter:drop-shadow(0 4px 12px rgba(0,0,0,.06));}
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
                <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280, border: '1px solid #f0f0f0', height: '100%' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <span style={{ background: '#D7B467', color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Plan</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        Valid until {isLifetime(sub.expires_at) ? 'No Expiry' : fmtDateLong(sub.expires_at)}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#111', marginBottom: '0.6rem', lineHeight: 1 }}>{sub.plan_name}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: '28rem', marginBottom: '2rem' }}>
                      {sub.plan_type === 'duration' ? 'Full duration-based access to all platform features.' : `Usage-based plan · ${sub.used} used out of ${sub.limit} contacts.`}
                    </p>
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{sub.remaining === 'Unlimited' ? " " : sub.remaining}</span>
                        {sub.plan_type !== 'duration' && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>/ {sub.limit}</span>}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{sub.remaining === 'Unlimited' ? 'Full Access' : 'Contacts Left'}</span>
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
              <div className="bento-col-4">
                <div style={{ background: '#e7efe5', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: 280, cursor: 'pointer', transition: 'transform 0.4s', border: '1px solid #d1e4cf' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <div>
                    <span style={{ color: '#D7B467', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '1.25rem' }}>Unlock More</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1F2937', marginBottom: '1rem', lineHeight: 1.2 }}>Elevate to a Higher Tier</h3>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                      {[
                        { icon: 'all_inclusive', text: 'Unlimited concierge contacts' },
                        { icon: 'stars', text: 'Early access to new listings' },
                        { icon: 'insights', text: 'Custom market reporting' },
                        { icon: 'support_agent', text: 'Priority support' },
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
          {plans.length > 0 ? (() => {
            // Build the 3-card window: [left, center, right]
            const n = plans.length;
            const leftIdx  = (centerIdx - 1 + n) % n;
            const rightIdx = (centerIdx + 1) % n;
            const visible  = n === 1 ? [plans[0]] : n === 2 ? [plans[0], plans[1]] : [plans[leftIdx], plans[centerIdx], plans[rightIdx]];
            const positions = n === 1 ? ['center'] : n === 2 ? ['side', 'center'] : ['side', 'center', 'side'];

            const prev = () => { if (animating) return; setAnimating(true); setTimeout(() => { setCenterIdx(c => (c - 1 + n) % n); setAnimating(false); }, 500); };
            const next = () => { if (animating) return; setAnimating(true); setTimeout(() => { setCenterIdx(c => (c + 1) % n); setAnimating(false); }, 500); };

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {n > 3 && <button className="slider-arrow" onClick={prev}><i className="bi bi-chevron-left" /></button>}
                  <div className="plan-conveyor" style={{ flex: 1 }}>
                    {visible.map((plan, vi) => {
                      const pos = positions[vi];
                      const isCenter = pos === 'center';
                      const cardType = Number(plan.is_featured) === 1 ? 'standard' : isCenter ? 'standard' : vi === 0 ? 'basic' : 'elite';
                      return (
                        <div
                          key={plan.id}
                          className={`plan-card-wrap ${animating && pos !== 'center' ? (vi === 0 ? 'exiting' : 'entering') : pos}`}
                          style={{ flex: '0 0 calc(33.333% - 1rem)' }}
                        >
                          <div className={`tier-${cardType}`} style={isCenter ? { borderColor: '#ffc63a55', borderWidth: 1.5 } : {}}>
                            {Number(plan.is_most_selected) === 1 && <div className="tier-badge">Most Selected</div>}
                            {isCenter && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#ffc63a,#D7B467)', borderRadius: '2rem 2rem 0 0' }} />
                            )}
                            <div style={{ marginBottom: '2rem' }}>
                              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111', marginBottom: '0.4rem' }}>{plan.name}</h2>
                              <p style={{ fontSize: '0.82rem', fontWeight: 500, color: isCenter ? '#D7B467' : '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {plan.plan_type} Based
                              </p>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#111' }}>₹{Number(plan.price).toLocaleString('en-IN')}</span>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                              {[
                                { icon: 'contacts', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Contacts` },
                                { icon: 'schedule', text: `${Number(plan.duration_hours) || '∞'} Hours Validity` },
                                { icon: 'chat', text: 'Direct Messaging Access' },
                              ].map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < 2 ? '1rem' : 0 }}>
                                  <span className="material-symbols-outlined" style={{ color: '#ffc63a', fontSize: '1.1rem', width: 20, flexShrink: 0, fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>{f.icon}</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: isCenter ? 600 : 400, color: '#374151' }}>{f.text}</span>
                                </li>
                              ))}
                            </ul>
                            <button className={`tier-btn-${cardType}`} onClick={() => handleChoosePlan(plan.id)}>
                              Buy Plan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {n > 3 && <button className="slider-arrow" onClick={next}><i className="bi bi-chevron-right" /></button>}
                </div>
                {/* Dots */}
                {n > 1 && (
                  <div className="conveyor-dots">
                    {plans.map((_, i) => (
                      <button key={i} className={`conveyor-dot${i === centerIdx ? ' active' : ''}`} onClick={() => setCenterIdx(i)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()
          : <p className="text-muted text-center py-4">No plans available at the moment.</p>}
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
