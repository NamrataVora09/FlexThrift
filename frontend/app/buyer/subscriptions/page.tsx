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
    if (error)   setFlashMsg({ text: decodeURIComponent(error),   ok: false });

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
        .membership-tier-card{background:#fff;border-radius:20px;padding:30px;height:100%;border:1px solid #eee;transition:.3s;display:flex;flex-direction:column}
        .membership-tier-card:hover{transform:translateY(-8px);box-shadow:0 15px 35px rgba(0,0,0,.05);border-color:#ffc63a}
        .btn-brand-sub{background:#ffc63a;color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;width:100%;transition:.3s;cursor:pointer}
        .btn-brand-sub:hover{background:#000;color:#ffc63a}
        .btn-brand-sub:disabled{opacity:.6;cursor:not-allowed}
        .feature-icon-sub{color:#ffc63a;font-size:1.2rem;margin-right:12px}
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
        <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold mb-1">My Membership <span role="img" aria-label="diamond">💎</span></h1>
            <p className="text-muted mb-0">Manage your active plans and contact limits.</p>
          </div>
          <a href="#available-plans" className="btn btn-dark rounded-pill px-4 fw-bold">
            Upgrade Plan
          </a>
        </div>

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
            <div className="row g-4 mb-4" key={sub.id}>
              {/* --- subscription card --- */}
              <div className="col-lg-8">
                <div
                  className={`luxury-sub-card shadow-sm${sub.isPrimary ? ' border-warning' : ''}`}
                  style={sub.isPrimary ? { borderWidth: 2, borderStyle: 'solid' } : undefined}
                >
                  {sub.isPrimary && (
                    <div className="bg-warning text-dark text-center fw-bold small py-1">
                      CURRENTLY ACTIVE / IN USE
                    </div>
                  )}
                  <div className="sub-header">
                    <h3 className="fw-bold mb-1">{sub.plan_name}</h3>
                    <div className="opacity-75 small">
                      Active since {fmtDate(sub.starts_at)}
                    </div>
                  </div>
                  <div className="sub-body">
                    <div className="row align-items-center">
                      <div className="col-md-5 text-center">
                        <div className="stat-circle">
                          <span
                            className="value-large"
                            style={{ fontSize: sub.remaining === 'Unlimited' ? '1.5rem' : '2.5rem' }}
                          >
                            {sub.remaining}
                          </span>
                          <span className="label-small">
                            {sub.remaining === 'Unlimited' ? 'Access' : 'Left'}
                          </span>
                        </div>
                        <h6 className="fw-bold mb-0">
                          {sub.plan_type === 'duration' ? 'Full Access' : 'Contacts Left'}
                        </h6>
                      </div>
                      <div className="col-md-7 ps-md-5">
                        {/* usage */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between mb-2 small fw-bold">
                            <span>USAGE STATUS</span>
                            <span className="text-muted">
                              {sub.plan_type === 'duration'
                                ? 'Full Access'
                                : `${sub.used} used out of ${sub.limit} units`}
                            </span>
                          </div>
                          {sub.plan_type === 'quantity' ? (
                            <div className="progress" style={{ height: 8, borderRadius: 10 }}>
                              <div
                                className="progress-bar bg-warning"
                                style={{ width: `${sub.percentUsed}%` }}
                              />
                            </div>
                          ) : (
                            <div className="bg-light p-2 rounded-3 text-center small fw-bold">
                              UNLIMITED MODE ACTIVE
                            </div>
                          )}
                        </div>
                        {/* expiry */}
                        <div className="p-3 bg-light rounded-4">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-calendar-check text-warning fs-3 me-3" />
                            <div>
                              <small className="text-muted d-block fw-bold lh-1 mb-1">
                                MEMBERSHIP EXPIRES
                              </small>
                              <div className="fw-bold h5 mb-0">
                                {isLifetime(sub.expires_at)
                                  ? 'No Expiry (Life-Time)'
                                  : fmtDateLong(sub.expires_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- account benefits card --- */}
              <div className="col-lg-4">
                <div className="membership-tier-card bg-dark text-white border-0">
                  <h5 className="fw-bold mb-4">Account Benefits</h5>
                  <ul className="list-unstyled mb-4">
                    {[
                      'Direct seller contact reveal',
                      'Exclusive member badges',
                      'Priority rental queue',
                      'Privacy protection shield',
                    ].map((b) => (
                      <li key={b} className="mb-3 d-flex align-items-center">
                        <i className="bi bi-check-circle-fill feature-icon-sub" />
                        <span className="small">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="#available-plans" className="btn btn-brand-sub mt-auto py-3">
                    Renew Plan
                  </a>
                </div>
              </div>
            </div>
          ))
        )}

        {/* -------- available plans -------- */}
        <div className="mt-5 pt-4" id="available-plans">
          <h2 className="fw-bold mb-4">
            Select A Membership Tier <span role="img" aria-label="lightning">⚡</span>
          </h2>
          <div className="row g-4">
            {data?.plans && data.plans.length > 0 ? (
              data.plans.map((plan) => (
                <div key={plan.id} className="col-md-4">
                  <div className="membership-tier-card">
                    <div className="mb-4">
                      <span className="badge bg-light text-dark px-3 py-2 rounded-pill mb-2 border small fw-bold">
                        {plan.plan_type.toUpperCase()} BASED
                      </span>
                      <h4 className="fw-bold mb-1">{plan.name}</h4>
                    </div>
                    <div className="mb-4">
                      <h2 className="fw-bold mb-0">
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </h2>
                      <small className="text-muted">
                        {plan.plan_type === 'duration'
                          ? 'One-time access fee'
                          : 'Usage based pricing'}
                      </small>
                    </div>
                    <ul className="list-unstyled mb-5 small">
                      <li className="mb-3">
                        <i className="bi bi-check2 text-warning fw-bold me-2" />
                        {plan.plan_type === 'duration' ? 'Lifetime' : plan.limit_value} Contacts
                      </li>
                      <li className="mb-3">
                        <i className="bi bi-check2 text-warning fw-bold me-2" />
                        {Number(plan.duration_hours) || '∞'} Hours Validity
                      </li>
                      <li className="mb-3">
                        <i className="bi bi-check2 text-warning fw-bold me-2" />
                        Direct Messaging Access
                      </li>
                    </ul>

                    <button
                      className="btn btn-brand-sub mt-auto text-center py-2"
                      onClick={() => handleChoosePlan(plan.id)}
                    >
                      {hasActiveSub ? 'Purchase More' : 'Choose Plan'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-12 text-center py-4">
                <p className="text-muted">No plans available at the moment.</p>
              </div>
            )}
          </div>
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
