'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface SellerData {
  user: { name: string; seller_rating_avg: number; seller_rating_count: number };
  stats: { ttl_products: number; pending: number; approved: number; rejected: number };
  pending_offers: Array<Record<string, string>>;
  total_deals: number;
  total_revenue: number;
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

const SELLER_DEFAULT_SUBTITLE = 'Manage your listings, track offers, and grow your business.';

export default function SellerDashboardClient() {
  const [data, setData] = useState<SellerData | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subtitle, setSubtitle] = useState(SELLER_DEFAULT_SUBTITLE);

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    api.get<SellerData>('/seller/dashboard').then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
    api.get<{ active: Subscription | null; history: Subscription[] }>('/shared/subscriptions/seller').then((res) => {
      if (res.success && res.data) {
        const a = res.data.active;
        if (a && String(a.is_active) === '1' && new Date(a.expires_at) > new Date()) {
          setActiveSub(a);
        } else {
          setActiveSub(null);
        }
      }
    });
    api.get<Record<string, string>>('/landing-content').then((res) => {
      if (res.success && res.data?.seller_dashboard_subtitle) {
        setSubtitle(res.data.seller_dashboard_subtitle);
      }
    });
  }, []);

  const statCards = [
    { icon: 'fa-solid fa-layer-group', label: 'Total Products', value: String(data?.stats.ttl_products ?? 0) },
    { icon: 'fa-solid fa-clock', label: 'Pending Review', value: String(data?.stats.pending ?? 0) },
    { icon: 'fa-solid fa-check-circle', label: 'Approved', value: String(data?.stats.approved ?? 0) },
    { icon: 'fa-solid fa-indian-rupee-sign', label: 'Total Revenue', value: `₹${Number(data?.total_revenue ?? 0).toLocaleString('en-IN')}` },
  ];

  return (
    <DashboardLayout requiredRoles={['seller', 'super_admin']}>
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
        .metric-value.sm { font-size: 1.75rem; }

        /* ── Rating pill ── */
        .rating-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #fff8e6;
          border: 1px solid #ffc63a;
          color: #a07c1a;
          border-radius: 999px;
          padding: 4px 14px;
          font-size: 0.82rem;
          font-weight: 600;
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
          background: #D7B467;
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
          font-size: 0.6rem;
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

        .product-name { font-weight: 700; font-size: 0.82rem; color: #1a1a1a; }

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

        /* ── Upload button ── */
        .upload-btn {
          background: #ffc63a;
          color: #000 !important;
          font-weight: 700;
          padding: 10px 22px;
          border-radius: 8px;
          text-decoration: none !important;
          display: inline-block;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .upload-btn:hover { background: #e6b230; color: #000 !important; }
      `}</style>

      <div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="row mb-4 align-items-center">
              <div className="col-md-8">
                <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: "poppins" }}>
                  Hello, {data?.user.name || '...'}!
                </h1>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{subtitle}</p>

              </div>

            </div>

            {/* Analytics Cards */}
            <div className="row g-3 mb-4">
              {statCards.map((card, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="metric-card">
                    <i className={`${card.icon} metric-icon`} />
                    <p className="metric-label mb-1">{card.label}</p>
                    <div className={`metric-value${card.icon.includes('rupee') ? ' sm' : ''}`}>{card.value}</div>
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
                      <i className="fa-solid fa-layer-group fs-4" style={{ color: '#D7B467' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a', marginBottom: 3 }}>
                          Active Plan: {activeSub.plan_name}
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#374151' }}>
                          {Number(activeSub.limit_value) === 0
                            ? 'Unlimited listings'
                            : `${activeSub.usage_count ?? 0} used out of ${activeSub.limit_value} Listings`}
                        </div>
                      </div>
                    </div>
                    <Link href="/seller/subscriptions" className="manage-btn" style={{ color: '#fff', background: '#D7B467', padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700 }} >Manage Plan</Link>
                  </>
                ) : (
                  <>
                    <div className="d-flex align-items-center gap-3">
                      <i className="fa-solid fa-ban fs-4" style={{ color: '#ef4444' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a', marginBottom: 3 }}>
                          No Active Plan
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#374151' }}>
                          You need an active subscription to list products and reach buyers.
                        </div>
                      </div>
                    </div>
                    <Link href="/seller/subscriptions" className="manage-btn" style={{ color: '#fff', background: '#D7B467', padding: '0.8rem 1.8rem', borderRadius: '10px', fontWeight: 700 }} >Get a Plan</Link>
                  </>
                )}
              </div>
            </div>

            {/* Pending Offers Table */}
            <div className="offers-wrap">
              <div className="offers-head">
                <span className="offers-title">Pending Offers</span>
                <Link href="/seller/offers" className="view-all">View All</Link>
              </div>

              <div className="table-responsive">
                <table className="offers-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Buyer</th>
                      <th>Type</th>
                      <th className="tr">Offer Price</th>
                      <th className="tr">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending_offers && data.pending_offers.length > 0 ? (
                      data.pending_offers.map((offer, i) => (
                        <tr key={i}>
                          <td>
                            <span className="product-name">{offer.product_title || '—'}</span>
                          </td>
                          <td style={{ color: '#374151', fontWeight: 500, fontSize: '0.82rem' }}>
                            {offer.buyer_name || '—'}
                          </td>
                          <td>
                            <span
                              className="pill"
                              style={
                                offer.listing_type === 'rent'
                                  ? { background: '#fce7f3', color: '#be185d' }
                                  : { background: '#d1fae5', color: '#065f46' }
                              }
                            >
                              {offer.listing_type === 'rent' ? 'Rent' : 'Sell'}
                            </span>
                          </td>
                          <td className="tr">
                            <span className="price-val">
                              &#8377;{Number(offer.offer_price || 0).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="tr">
                            <span className="date-val">
                              {offer.created_at ? formatDate(offer.created_at) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 1.5rem', fontSize: '0.85rem' }}
                        >
                          No pending offers at the moment.
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
