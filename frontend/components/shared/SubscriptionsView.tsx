'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Plan { id: number; name: string; plan_type: string; limit_value: number; duration_hours: number; price: string; }
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
      `}</style>

      <div className="container">
        <PageHeader title="Subscriptions" />

        {flashMsg && (
          <div className={`alert ${flashMsg.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
            <i className={`bi ${flashMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
            {flashMsg.text}
            <button type="button" className="btn-close" onClick={() => setFlashMsg(null)} />
          </div>
        )}

        {/* Active Subscription */}
        {data?.active && (
          <div className="card mb-4" style={{ border: '2px solid #ffc63a' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="accept_sts">Active</span>
                  <h5 className="mt-2 fw-bold">{data.active.plan_name}</h5>
                  <p className="normal_label_font mb-0">
                    {data.active.plan_type === 'duration'
                      ? `Expires: ${new Date(data.active.expires_at).toLocaleDateString('en-IN')}`
                      : `Usage: ${data.active.usage_count} / ${data.active.limit_value}`}
                  </p>
                </div>
                <h4 className="fw-bold" style={{ color: '#ffc63a' }}>₹{data.active.price}</h4>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <h5 className="subsection_label_font mb-3">{user?.role === 'admin' ? 'Seller Plans' : 'Available Plans'}</h5>
        <div className="row">
          {data?.plans && data.plans.length > 0 ? data.plans.map((plan) => (
            <div key={plan.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body text-center d-flex flex-column">
                  <h5 className="fw-bold">{plan.name}</h5>
                  <span className="type-badge sell">{plan.plan_type}</span>
                  <h3 className="fw-bold mt-3" style={{ color: '#ffc63a' }}>₹{Number(plan.price).toLocaleString('en-IN')}</h3>
                  <p className="normal_label_font">
                    {plan.plan_type === 'duration'
                      ? `${plan.duration_hours} hours`
                      : `${plan.limit_value} items`}
                  </p>
                  <button
                    className="btn yellow_button w-100 mt-auto"
                    onClick={() => openCheckout(plan)}
                  >
                    <i className="bi bi-credit-card me-2" />
                    {hasActiveSub ? 'Purchase More' : 'Subscribe & Pay'}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-12 text-center py-4">
              <p className="normal_label_font">No seller plans available</p>
            </div>
          )}
        </div>

        {user?.role === 'admin' && buyerPlans.length > 0 && (
          <>
            <h5 className="subsection_label_font mt-4 mb-3">Buyer Plans</h5>
            <div className="row">
              {buyerPlans.map((plan) => (
                <div key={plan.id} className="col-md-4 mb-4">
                  <div className="card h-100">
                    <div className="card-body text-center d-flex flex-column">
                      <h5 className="fw-bold">{plan.name}</h5>
                      <span className="type-badge sell">{plan.plan_type}</span>
                      <h3 className="fw-bold mt-3" style={{ color: '#ffc63a' }}>₹{Number(plan.price).toLocaleString('en-IN')}</h3>
                      <p className="normal_label_font">
                        {plan.plan_type === 'duration'
                          ? `${plan.duration_hours} hours`
                          : `${plan.limit_value} items`}
                      </p>
                      <button
                        className="btn yellow_button w-100 mt-auto"
                        onClick={() => openCheckout(plan)}
                      >
                        <i className="bi bi-credit-card me-2" />
                        {hasActiveSub ? 'Purchase More' : 'Subscribe & Pay'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* History */}
        {data?.history && data.history.length > 0 && (
          <>
            <h5 className="subsection_label_font mt-4 mb-3">Subscription History</h5>
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead><tr><th>Plan</th><th>Type</th><th>Price</th><th>Period</th><th>Status</th></tr></thead>
                    <tbody>
                      {data.history.map((h, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{h.plan_name}</td>
                          <td><span className="type-badge sell">{h.plan_type}</span></td>
                          <td>₹{h.price}</td>
                          <td className="normal_label_font">
                            {new Date(h.starts_at).toLocaleDateString('en-IN')} – {new Date(h.expires_at).toLocaleDateString('en-IN')}
                          </td>
                          <td>
                            {Number(h.is_active) === 1
                              ? <span className="accept_sts">Active</span>
                              : <span className="status-badge pending">Expired</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
