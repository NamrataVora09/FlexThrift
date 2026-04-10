'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface DashboardData {
  user: { id: number; name: string; email: string; role: string; user_type: string; reliability_score: number; referral_code: string };
  stats: { ttl_products: number; pending: number; accepted: number; total_orders: number };
  recent_offers: Array<Record<string, string>>;
  notifications: Array<Record<string, string>>;
}

interface Subscription {
  plan_name: string;
  plan_type: string;
  limit_value: string;
  duration_hours: string;
  expires_at: string;
  hours_remaining: number;
  usage_count: string;
  is_active: string;
}

export default function BuyerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/buyer/dashboard').then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
    api.get<{ active: Subscription | null; history: Subscription[] }>('/shared/subscriptions/buyer').then((res) => {
      if (res.success && res.data) {
        const a = res.data.active;
        if (a && String(a.is_active) === '1' && new Date(a.expires_at) > new Date()) {
          setSubs([a]);
        } else {
          setSubs([]);
        }
      }
    });
  }, []);

  const activeSub = subs.length > 0 ? subs[0] : null;
  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #D7B467;
        }
        .stat-card h4 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .stat-card span {
          font-size: 0.9rem;
          color: #6f6f6f;
        }
        .stat-card i {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 1.2rem;
          color: #D7B467;
        }
        .plan-bar {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .plan-bar .manage-btn {
          background: #c7a15a;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
        }
        .plan-bar .manage-btn:hover {
          background: #b08e45;
          color: #fff;
        }
        .type-badge-sell { background: #008080; color: #fff; }
        .type-badge-rent { background: #cf0048; color: #fff; }
        .status-badge-accepted { background: #005f44; color: #fff; }
        .status-badge-rejected { background: #981515; color: #fff; }
        .status-badge-pending { background: #6c757d; color: #fff; }
      `}</style>

      <div className="container" style={{ marginTop: '3%' }}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="row mb-4">
              <div className="col-md-9">
                <h1 style={{ fontWeight: 700 }}>Hello, {data?.user.name || '...'}!</h1>
                <p style={{ color: '#6f6f6f' }}>Browse millions of unique fashion gems and track your rental orders.</p>
              </div>
              <div className="col-md-3 mt-3">
                <Link href="/buyer" className="btn" style={{ background: '#ffc63a', color: '#000', fontWeight: 700, padding: '10px 24px', borderRadius: '8px' }}>
                  <span>Explore Marketplace</span> <span>→</span>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.ttl_products ?? 0}</h4>
                  <i className="fa-solid fa-layer-group"></i>
                  <span>Total Products</span>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.pending ?? 0}</h4>
                  <i className="fa-solid fa-clock"></i>
                  <span>Pending Products</span>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.accepted ?? 0}</h4>
                  <i className="fa-solid fa-tags"></i>
                  <span>Contacts Left</span>
                </div>
              </div>
              <div className="col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.total_orders ?? 0} <span style={{ fontSize: '1rem' }}>Hrs.</span></h4>
                  <i className="fa-solid fa-cart-shopping"></i>
                  <span>Subscription Time Left</span>
                </div>
              </div>
            </div>

            {/* Subscription Bar */}
            <div className="mb-4">
              {activeSub ? (
                <div className="plan-bar">
                  <div className="d-flex align-items-start gap-3">
                    <i className="fa-solid fa-circle-check fs-3 text-success mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Active Plan: {activeSub.plan_name}</h6>
                      <p className="text-muted mb-0 small">
                        Limit: {Number(activeSub.limit_value) === 0 ? 'Unlimited' : activeSub.limit_value}
                      </p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 border rounded px-3 py-2" style={{ background: '#f8f9fa' }}>
                    <i className="fa-solid fa-calendar-check text-warning fs-3"></i>
                    <div>
                      <small className="text-uppercase text-muted" style={{ fontSize: '0.7rem' }}>Membership Expires</small>
                      <div className="fw-bold" style={{ fontSize: '1.25rem' }}>{formatDate(activeSub.expires_at)}</div>
                    </div>
                  </div>
                  <Link href="/buyer/subscriptions" className="manage-btn">Manage Plan</Link>
                </div>
              ) : (
                <div className="plan-bar">
                  <div className="d-flex align-items-start gap-3">
                    <i className="fa-solid fa-ban fs-3 text-danger mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">No Active Plan</h6>
                      <p className="text-muted mb-0 small">You need an active subscription to upload products and reach buyers.</p>
                    </div>
                  </div>
                  <Link href="/buyer/subscriptions" className="manage-btn">Manage Plan</Link>
                </div>
              )}
            </div>

            {/* Recent Purchases Table */}
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <div className="card-header bg-white d-flex align-items-center gap-2 fw-semibold" style={{ borderRadius: '16px 16px 0 0' }}>
                <i className="fa-solid fa-layer-group"></i>
                Recent Purchases
              </div>
              <div className="table-responsive p-3">
                <table className="table align-middle mb-0">
                  <thead className="text-muted small text-uppercase border-bottom">
                    <tr>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Offer Status</th>
                      <th>Seller</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_offers && data.recent_offers.length > 0 ? (
                      data.recent_offers.map((o, i) => (
                        <tr key={i}>
                          <td>
                            <div className="fw-semibold">{o.product_title || '—'}</div>
                            <small className="text-muted">{o.product_id}</small>
                          </td>
                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2 fw-semibold"
                              style={{ background: o.listing_type === 'rent' ? '#cf0048' : '#008080' }}
                            >
                              {o.listing_type === 'rent' ? 'Rent' : 'Sell'}
                            </span>
                          </td>
                          <td>&#8377;{Number(o.offer_price || 0).toLocaleString('en-IN')}</td>
                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2 fw-semibold"
                              style={{
                                background:
                                  o.status === 'accepted' ? '#005f44'
                                    : o.status === 'rejected' ? '#981515'
                                    : '#6c757d',
                              }}
                            >
                              {o.status?.toUpperCase()}
                            </span>
                          </td>
                          <td>{o.seller_name || '—'}</td>
                          <td>{o.created_at ? formatDate(o.created_at) : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">No Data Found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
