'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface DashboardData {
  user: { id: number; name: string; email: string; role: string; user_type: string; reliability_score: number; referral_code: string };
  stats: { ttl_products: number; pending: number; accepted: number; rejected: number; total_orders: number };
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080');

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${BACKEND_URL}/${path}`;
  return `${BACKEND_URL}/uploads/products/${path}`;
}

const BUYER_DEFAULT_SUBTITLE = 'Browse millions of unique fashion gems and track your rental orders.';

export default function BuyerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtitle, setSubtitle] = useState(BUYER_DEFAULT_SUBTITLE);

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
    api.get<Record<string, string>>('/landing-content').then((res) => {
      if (res.success && res.data?.buyer_dashboard_subtitle) {
        setSubtitle(res.data.buyer_dashboard_subtitle);
      }
    });
  }, []);

  const activeSub = subs.length > 0 ? subs[0] : null;
  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Contacts Left: limit_value=0 means unlimited, otherwise limit - used
  const contactsLeft = activeSub
    ? (Number(activeSub.limit_value) === 0
      ? '∞'
      : String(Math.max(0, Number(activeSub.limit_value) - Number(activeSub.usage_count))))
    : '0';

  // Hours remaining = time until expires_at
  const hrsLeft = activeSub
    ? String(Math.max(0, Math.round((new Date(activeSub.expires_at).getTime() - Date.now()) / 3_600_000)))
    : '0';

  const statCards = [
    {
      icon: 'fa-solid fa-rectangle-list',
      label: 'Approved / Rejected',
      split: true,
      approved: data?.stats.accepted ?? 0,
      rejected: data?.stats.rejected ?? 0,
    },
    { icon: 'fa-solid fa-clock', label: 'Pending Offers', value: String(data?.stats.pending ?? 0) },
    { icon: 'fa-solid fa-tags', label: 'Contacts Left', value: contactsLeft },
    { icon: 'fa-solid fa-hourglass-half', label: 'Subscription Hrs Left', value: hrsLeft },
  ];

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        /* ── Analytics Cards ── */
        .metric-card {
          background: #fff;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.06);
          border: 1px solid #f0f0f0;
          cursor: default;
          height: 100%;
        }

        .metric-icon {
          color: #ffc63a;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          display: block;
        }
        .metric-label {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.13em;
          color: #9ca3af;
          margin-bottom: 6px;
          transition: color 0.28s ease;
        }
        .metric-value {
          font-size: 2.4rem;
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1;
          transition: color 0.28s ease;
        }

        /* ── Plan bar ── */
        .plan-bar {
          background: #fff;
          border-radius: 16px;
          padding: 1.25rem 1.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .manage-btn {
          background: #D7B467 !important;
          color: #fff !important;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: none !important;
          transition: transform 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .manage-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 12px rgba(0,0,0,0.18);
          color: #fff !important;
        }

        /* ── Table ── */
        .offers-wrap {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }
        .offers-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem 0.75rem;
        }
        .offers-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1a1a1a;
        }
        .view-all {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.15s;
        }
        .view-all:hover { color: #1a1a1a; }

        .offers-table { width: 100%; border-collapse: collapse; }
        .offers-table thead tr { border-bottom: 1px solid #f3f4f6; }
        .offers-table thead th {
          padding: 0.9rem 1.5rem;
          font-size: 12.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #9ca3af;
          white-space: nowrap;
        }
        .offers-table thead th.tr { text-align: right; }

        .offers-table tbody tr { border-bottom: 1px solid #f9fafb; transition: background 0.12s; }
        .offers-table tbody tr:last-child { border-bottom: none; }
        .offers-table tbody tr:hover { background: #fafafa; }
        .offers-table tbody td { padding: 1.1rem 1.5rem; vertical-align: middle; }
        .offers-table tbody td.tr { text-align: right; }

        .product-thumb {
          width: 42px; height: 42px;
          border-radius: 8px;
          background: #f6f6f6;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .product-name { font-weight: 700; font-size: 0.82rem; color: #1a1a1a; }
        .product-id   { font-size: 0.6rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; }

        .pill {
          display: inline-block;
          padding: 3px 11px;
          border-radius: 9999px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .price-val { font-weight: 800; font-size: 0.88rem; color: #ffc63a; }
        .date-val  { font-size: 0.72rem; color: #9ca3af; }
      `}</style>

      <div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="mb-4">
              <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>
                Hello, {data?.user.name || '...'}!
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>{subtitle}</p>
            </div>

            {/* Analytics Cards */}
            <div className="row g-3 mb-4">
              {statCards.map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="metric-card">
                    <i className={`${card.icon} metric-icon`} />
                    <p className="metric-label mb-1">{card.label}</p>
                    {'split' in card ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="metric-value" style={{ color: '#16a34a' }}>{card.approved}</span>
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#d1d5db', lineHeight: 1 }}>/</span>
                        <span className="metric-value" style={{ color: '#dc2626' }}>{card.rejected}</span>
                      </div>
                    ) : (
                      <div className="metric-value">{card.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subscription Bar */}
            <div className="mb-4">
              <div className="plan-bar">
                {activeSub ? (
                  <>
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-solid fa-gem " style={{ color: '#D7B467', fontSize: '1.5rem' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '17.2px', color: '#1a1a1a', marginBottom: 3 }}>
                          Active Plan: {activeSub.plan_name}
                        </div>
                        <div style={{ fontSize: '15px', color: '#374151' }}>
                          {Number(activeSub.limit_value) === 0
                            ? 'Unlimited contacts'
                            : `${activeSub.usage_count ?? 0} used out of ${activeSub.limit_value} Contacts`}
                        </div>
                      </div>
                    </div>
                    <Link href="/buyer/subscriptions" className="manage-btn" style={{ color: '#fff', background: '#D7B467', padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700 }} >Manage Plan</Link>
                  </>
                ) : (
                  <>
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-solid fa-ban fs-4" style={{ color: '#ef4444', fontSize: '1.5rem' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '17.2px', color: '#1a1a1a', marginBottom: 3 }}>
                          No Active Plan
                        </div>
                        <div style={{ fontSize: '15px', color: '#374151' }}>
                          You need an active subscription to reach buyers.
                        </div>
                      </div>
                    </div>
                    <Link href="/buyer/subscriptions" className="manage-btn" style={{ color: '#fff', background: '#D7B467', padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700 }} >Get a Plan</Link>
                  </>
                )}
              </div>
            </div>

            {/* Recent Purchases Table */}
            <div className="offers-wrap">
              <div className="offers-head">
                <span className="offers-title" style={{ fontSize: '17.2px' }}>
                  <i className="fa-solid fa-layer-group me-2" style={{ color: '#ffc63a', fontSize: '1.5rem' }} />

                  Recent Purchases</span>
                <Link href="/buyer/my-offers" className="view-all underline!" style={{ fontSize: 14, color: 'blue' }}>View All Offers</Link>
              </div>

              <div className="table-responsive">
                <table className="offers-table">
                  <thead>
                    <tr style={{ fontSize: '20px' }}>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Seller</th>
                      <th className="tr">Price</th>
                      <th className="tr">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_offers && data.recent_offers.length > 0 ? (
                      data.recent_offers.map((o, i) => (
                        <tr key={i}>
                          {/* Product */}
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="product-thumb">
                                {getImageUrl(o.product_image) ? (
                                  <img
                                    src={getImageUrl(o.product_image)}
                                    alt={o.product_title || 'product'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                                  />
                                ) : (
                                  <i className="fa-regular fa-image" style={{ color: '#9ca3af' }} />
                                )}
                              </div>
                              <div>
                                <div className="product-name">{o.product_title || '—'}</div>
                                <div className="product-id">ID: {o.product_id}</div>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td>
                            <span
                              className="pill"
                              style={
                                o.listing_type === 'rent'
                                  ? { background: '#fce7f3', color: '#be185d' }
                                  : { background: '#d1fae5', color: '#065f46' }
                              }
                            >
                              {o.listing_type === 'rent' ? 'Rent' : 'Sell'}
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            <span
                              className="pill"
                              style={
                                o.status === 'accepted'
                                  ? { background: '#dcfce7', color: '#15803d' }
                                  : o.status === 'rejected'
                                    ? { background: '#fee2e2', color: '#dc2626' }
                                    : { background: '#f3f4f6', color: '#6b7280' }
                              }
                            >
                              {o.status?.toUpperCase() ?? '—'}
                            </span>
                          </td>

                          {/* Seller */}
                          <td style={{ color: '#374151', fontWeight: 500, fontSize: '0.82rem' }}>
                            {o.seller_name || '—'}
                          </td>

                          {/* Price */}
                          <td className="tr">
                            <span className="price-val">
                              &#8377;{Number(o.offer_price || 0).toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="tr">
                            <span className="date-val">
                              {o.created_at ? formatDate(o.created_at) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 1.5rem', fontSize: '0.85rem' }}
                        >
                          No data found.
                        </td>
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
