'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface Plan { id: number; name: string; plan_type: string; limit_value: number; duration_hours: number; price: string; }
interface ActiveSub { plan_name: string; plan_type: string; limit_value: number; price: string; starts_at: string; expires_at: string; usage_count: number; }
interface HistoryItem { plan_name: string; plan_type: string; price: string; starts_at: string; expires_at: string; is_active: number; }
interface SubData { plans: Plan[]; active: ActiveSub | null; history: HistoryItem[]; }

interface Props { role: string; userType: string; }

export default function SubscriptionsView({ role, userType }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMsg, setFlashMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // SuperAdmin has full access
  if (user?.role === 'super_admin') {
    return (
      <DashboardLayout requiredRoles={[role, 'super_admin']}>
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

    api.get<SubData>(`/shared/subscriptions/${userType}`).then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, [userType]);

  const handleChoosePlan = (planId: number) => {
    router.push(`/${role}/checkout-plan/${planId}`);
  };

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const hasActiveSub = !!data?.active;

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Subscriptions" />

        {flashMsg && (
          <div className={`alert ${flashMsg.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
            <i className={`bi ${flashMsg.ok ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
            {flashMsg.text}
            <button type="button" className="btn-close" onClick={() => setFlashMsg(null)} />
          </div>
        )}

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

        <h5 className="subsection_label_font mb-3">Available Plans</h5>
        <div className="row">
          {data?.plans && data.plans.length > 0 ? data.plans.map((plan) => (
            <div key={plan.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-body text-center">
                  <h5 className="fw-bold">{plan.name}</h5>
                  <span className="type-badge sell">{plan.plan_type}</span>
                  <h3 className="fw-bold mt-3" style={{ color: '#ffc63a' }}>₹{Number(plan.price).toLocaleString('en-IN')}</h3>
                  <p className="normal_label_font">
                    {plan.plan_type === 'duration'
                      ? `${plan.duration_hours} hours`
                      : `${plan.limit_value} items`}
                  </p>
                  <button
                    className="btn yellow_button w-100 mt-2"
                    onClick={() => handleChoosePlan(plan.id)}
                  >
                    {hasActiveSub ? 'Purchase More' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-12 text-center py-4">
              <p className="normal_label_font">No plans available</p>
            </div>
          )}
        </div>

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
                          <td className="normal_label_font">{new Date(h.starts_at).toLocaleDateString('en-IN')} - {new Date(h.expires_at).toLocaleDateString('en-IN')}</td>
                          <td>{Number(h.is_active) === 1 ? <span className="accept_sts">Active</span> : <span className="status-badge pending">Expired</span>}</td>
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
    </DashboardLayout>
  );
}
