'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ChargeItem {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

interface CheckoutData {
  plan: {
    id: number;
    name: string;
    plan_type: string;
    limit_value: number;
    duration_hours: number;
    price: string;
    features?: string;
  };
  user: { name: string; email: string; mobile: string; address: string };
  charge_breakdown: ChargeItem[];
  total_charges: number;
  referral_discount: number;
  total_referral_balance: number;
  total: number;
}

export default function SellerCheckoutPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [useReferral, setUseReferral] = useState(true);

  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!planId) return;
    api.get<CheckoutData>(`/seller/plan-checkout-details/${planId}`).then((r) => {
      if (r.success && r.data) {
        setCheckoutData(r.data);
      } else {
        setError(r.message || 'Failed to load plan details');
      }
      setLoading(false);
    });
  }, [planId]);

  const basePrice = Number(checkoutData?.plan?.price ?? 0);
  const totalCharges = checkoutData?.total_charges ?? 0;
  const availableReferral = checkoutData?.total_referral_balance ?? 0;
  const appliedReferral = checkoutData?.referral_discount ?? 0;
  const referralDiscount = useReferral ? appliedReferral : 0;
  const displayTotal = Math.max(0, basePrice + totalCharges - referralDiscount - couponDiscount);

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    const res = await api.post<{ discount: number }>('/seller/apply-coupon', {
      code: couponCode.trim().toUpperCase(),
      plan_id: Number(planId),
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
  }, [couponCode, planId]);

  const processPayment = useCallback(async () => {
    if (!checkoutData) return;
    setPaying(true);
    const callbackUrl = `${window.location.origin}/seller/payment-callback?id={id}`;
    const res = await api.post<{ redirect_url: string; merchant_order_id: string }>('/seller/initiate-payment', {
      plan_id: Number(planId),
      coupon_code: appliedCoupon,
      use_referral: useReferral,
      callback_url: callbackUrl,
    });
    if (res.success && res.data?.redirect_url) {
      window.location.href = res.data.redirect_url;
    } else {
      toast.error(res.message || 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  }, [checkoutData, planId, appliedCoupon]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (error || !checkoutData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div className="text-center">
          <p className="text-danger fw-bold">{error || 'Plan not found'}</p>
          <button className="btn btn-secondary mt-2" onClick={() => router.push('/seller/subscriptions')}>Back to Plans</button>
        </div>
      </div>
    );
  }

  const { plan, user, charge_breakdown } = checkoutData;

  return (
    <>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      <style>{`
        :root { --brand: #ffc63a; --brand-dark: #e0a800; }
        body { background: #f0f2f5; font-family: 'Segoe UI', sans-serif; }
        .checkout-wrap { max-width: 920px; margin: 3rem auto; padding: 0 1rem; }
        .card { border: none; border-radius: 1rem; box-shadow: 0 .5rem 1rem rgba(0,0,0,.06); }
        .btn-brand { background: var(--brand); color: #000; border: none; border-radius: 8px; font-weight: 700; padding: .75rem 1.5rem; transition: all .3s; }
        .btn-brand:hover:not(:disabled) { background: var(--brand-dark); color: #000; transform: translateY(-2px); }
        .btn-brand:disabled { opacity: .6; cursor: not-allowed; }
        .price-row { display: flex; justify-content: space-between; margin-bottom: .65rem; font-size: .92rem; }
        .price-total { border-top: 1px dashed #dee2e6; margin-top: 1rem; padding-top: 1rem; font-size: 1.2rem; font-weight: 700; color: #000; display: flex; justify-content: space-between; }
        .plan-badge { background: rgba(255,198,58,.15); color: #000; padding: .2rem .7rem; border-radius: 2rem; font-size: .82rem; font-weight: 600; }
        .coupon-btn { border-radius: 0 8px 8px 0 !important; }
        .coupon-input { border-radius: 8px 0 0 8px !important; }
      `}</style>

      <div className="checkout-wrap">
        <div className="row g-4">
          {/* Left: Order Summary */}
          <div className="col-lg-7">
            <div className="card p-4 h-100">
              <div className="mb-4">
                <button
                  className="btn btn-link text-muted small text-decoration-none p-0 mb-3 d-inline-flex align-items-center gap-1"
                  onClick={() => router.push('/seller/subscriptions')}
                >
                  <i className="bi bi-arrow-left" /> Back to Plans
                </button>
                <h2 className="h4 fw-bold mb-1">Confirm Subscription</h2>
                <p className="text-muted small mb-0">Secure payment via PhonePe Payment Gateway</p>
              </div>

              {/* Plan card */}
              <div className="d-flex align-items-center p-3 rounded-3 bg-light mb-4 border border-warning-subtle">
                <div className="text-white p-3 rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: 45, height: 45, flexShrink: 0, background: '#000' }}>
                  <i className="bi bi-gem" />
                </div>
                <div>
                  <h5 className="mb-0 fw-bold">{plan.name}</h5>
                  <span className="plan-badge">{plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)} Plan</span>
                </div>
                <div className="ms-auto fw-bold text-dark">₹{Number(plan.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>

              {/* Plan privileges */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Plan Privileges</h6>
                  <ul className="list-unstyled mb-0">
                    {(() => {
                      const coreFeatures = [
                        { icon: 'storefront', text: `${plan.plan_type === 'duration' ? 'Unlimited' : plan.limit_value} Listings` },
                        { icon: 'schedule', text: `${Number(plan.duration_hours) > 0 ? plan.duration_hours + ' Hours' : 'Life-Time'} Validity` },
                      ];
                      let customFeatures: { icon: string; text: string }[] = [];
                      try { if (plan.features) customFeatures = JSON.parse(plan.features); } catch (e) {}
                      
                      const filteredCustom = customFeatures.filter(cf => 
                        cf.text && 
                        !cf.text.toLowerCase().includes('listing') && 
                        !cf.text.toLowerCase().includes('validity') && 
                        !cf.text.toLowerCase().includes('hour')
                      );

                      const allFeatures = [...coreFeatures, ...filteredCustom];

                      return allFeatures.map((f, i) => (
                        <li key={i} className="mb-2 small d-flex align-items-start gap-2">
                          <span className="material-symbols-outlined text-success" style={{ fontSize: '1.2rem', flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                          <span>{f.text}</span>
                        </li>
                      ));
                    })()}
                    <li className="small d-flex align-items-center text-muted mt-2">
                      <i className="bi bi-info-circle me-2" />Priority visibility & seller badge
                    </li>
                  </ul>
                </div>

              {/* Billing info */}
              <div className="mt-auto pt-4 border-top">
                <h6 className="fw-bold mb-3">Billing Information</h6>
                <div className="p-3 rounded bg-light border">
                  <p className="mb-1 fw-bold">{user.name}</p>
                  <p className="mb-1 small text-muted">{user.email}</p>
                  {user.mobile && <p className="mb-0 small text-muted">{user.mobile}</p>}
                  {user.address && <p className="mb-0 small text-muted mt-2 pt-1 border-top">{user.address}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Price & Payment */}
          <div className="col-lg-5">
            <div className="card p-4 h-100">
              <h5 className="fw-bold mb-4">Price Distribution</h5>

              <div className="price-row">
                <span className="text-muted">Subscription Price</span>
                <span className="fw-semibold">₹{Number(plan.price).toFixed(2)}</span>
              </div>

              {charge_breakdown.map((c, i) => (
                <div key={i} className="price-row">
                  <span className="text-muted">{c.name}&nbsp;({c.type === 'percentage' ? `${c.value}%` : 'Fixed'})</span>
                  <span className="fw-semibold">₹{Number(c.amount).toFixed(2)}</span>
                </div>
              ))}

              {referralDiscount > 0 && (
                <div className="price-row text-success">
                  <span className="fw-bold">
                    <i className="bi bi-gift-fill me-1"></i>Referral Credit
                  </span>
                  <span className="fw-bold">- ₹{referralDiscount.toFixed(2)}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="price-row text-success">
                  <span className="fw-bold">Coupon Discount</span>
                  <span className="fw-bold">- ₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="price-total">
                <span>Total Payable</span>
                <span>₹{Math.max(1, displayTotal).toFixed(2)}</span>
              </div>

              {/* Referral Balance Toggle */}
              {availableReferral > 0 && (
                <div className="mt-4" style={{
                  background: useReferral ? 'rgba(16,185,129,0.06)' : '#f8f9fa',
                  border: `1.5px solid ${useReferral ? 'rgba(16,185,129,0.3)' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  transition: 'all 0.2s',
                }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-gift-fill" style={{ color: useReferral ? '#10b981' : '#9ca3af', fontSize: '1.1rem' }}></i>
                      <div>
                        <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                          Referral Balance
                          {useReferral && (
                            <span className="ms-2 badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', borderRadius: '50px', padding: '2px 8px' }}>
                              Applied
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                          ₹{availableReferral.toFixed(2)} available
                          {availableReferral > appliedReferral && useReferral && (
                            <span className="ms-1 text-primary" style={{ fontSize: '0.7rem' }}>
                              (Max ₹{appliedReferral.toFixed(0)} applicable for this plan)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setUseReferral(prev => !prev)}
                      style={{
                        background: useReferral ? 'rgba(239,68,68,0.08)' : '#10b981',
                        color: useReferral ? '#ef4444' : '#fff',
                        border: `1px solid ${useReferral ? 'rgba(239,68,68,0.2)' : '#10b981'}`,
                        borderRadius: '8px',
                        padding: '5px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {useReferral ? 'Remove' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="mt-3 mb-4">
                <label className="form-label small fw-bold">Apply Coupon Code</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control coupon-input text-uppercase"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    disabled={couponLoading}
                  />
                  <button className="btn btn-outline-secondary coupon-btn fw-bold" onClick={applyCoupon} disabled={couponLoading}>
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

              <div className="alert alert-warning small border-0 bg-warning-subtle py-2 d-flex gap-2">
                <i className="bi bi-shield-lock-fill fs-5" />
                <span>Payments are encrypted and secure. Platform fees are inclusive.</span>
              </div>

              <button
                className="btn btn-brand w-100 py-3 mt-3 d-flex align-items-center justify-content-center gap-2"
                onClick={processPayment}
                disabled={paying}
              >
                {paying ? (
                  <><span className="spinner-border spinner-border-sm" /> Processing…</>
                ) : (
                  <><i className="bi bi-wallet2" /> Pay Now</>
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-muted" style={{ fontSize: '0.7rem' }}>Powered by PhonePe Gateway</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
