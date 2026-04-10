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

export default function SellerDashboardClient() {
  const [data, setData] = useState<SellerData | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <DashboardLayout requiredRoles={['seller', 'super_admin']}>
      <style jsx>{`
        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
          height: 100%;
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
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .stat-card .card-label {
          font-size: 0.875rem;
          color: #6f6f6f;
        }
        .stat-card .card-icon {
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
        .manage-btn {
          background: #c7a15a;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .manage-btn:hover {
          background: #b08e45;
          color: #fff;
        }
        .explore-btn {
          background: #ffc63a;
          color: #000;
          font-weight: 700;
          padding: 10px 24px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
        }
        .explore-btn:hover {
          background: #e6b230;
          color: #000;
        }
        .rating-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #fff8e6;
          border: 1px solid #ffc63a;
          color: #a07c1a;
          border-radius: 999px;
          padding: 4px 14px;
          font-size: 0.85rem;
          font-weight: 600;
        }
      `}</style>

      <div className="container" style={{ marginTop: '3%' }}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="row mb-4 align-items-center">
              <div className="col-md-8">
                <h1 style={{ fontWeight: 700 }}>Hello, {data?.user.name || '...'}!</h1>
                <p style={{ color: '#6f6f6f', marginBottom: '0.75rem' }}>
                  Manage your listings, track offers, and grow your business.
                </p>
                <span className="rating-pill">
                  <i className="fa-solid fa-star" style={{ color: '#ffc63a' }}></i>
                  {Number(data?.user.seller_rating_avg ?? 0).toFixed(1)} &nbsp;
                  <span style={{ color: '#aaa', fontWeight: 400 }}>({data?.user.seller_rating_count ?? 0} reviews)</span>
                </span>
              </div>
              <div className="col-md-4 mt-3 mt-md-0 text-md-end">
                <Link href="/seller/upload-product" className="explore-btn">
                  + Upload Product
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.ttl_products ?? 0}</h4>
                  <i className="fa-solid fa-layer-group card-icon"></i>
                  <span className="card-label">Total Products</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.pending ?? 0}</h4>
                  <i className="fa-solid fa-clock card-icon"></i>
                  <span className="card-label">Pending Review</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stat-card">
                  <h4>{data?.stats.approved ?? 0}</h4>
                  <i className="fa-solid fa-check-circle card-icon"></i>
                  <span className="card-label">Approved</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="stat-card">
                  <h4 style={{ fontSize: '1.8rem' }}>&#8377;{Number(data?.total_revenue ?? 0).toLocaleString('en-IN')}</h4>
                  <i className="fa-solid fa-indian-rupee-sign card-icon"></i>
                  <span className="card-label">Total Revenue</span>
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
                  <Link href="/seller/subscriptions" className="manage-btn">Manage Plan</Link>
                </div>
              ) : (
                <div className="plan-bar">
                  <div className="d-flex align-items-start gap-3">
                    <i className="fa-solid fa-ban fs-3 text-danger mt-1"></i>
                    <div>
                      <h6 className="fw-bold mb-1">No Active Plan</h6>
                      <p className="text-muted mb-0 small">You need an active subscription to list products and reach buyers.</p>
                    </div>
                  </div>
                  <Link href="/seller/subscriptions" className="manage-btn">Get a Plan</Link>
                </div>
              )}
            </div>

            {/* Pending Offers Table */}
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <div
                className="card-header bg-white d-flex align-items-center justify-content-between fw-semibold"
                style={{ borderRadius: '16px 16px 0 0' }}
              >
                <span className="d-flex align-items-center gap-2">
                  <i className="fa-solid fa-handshake"></i>
                  Pending Offers
                </span>
                <Link href="/seller/offers" className="btn btn-sm" style={{ background: '#ffc63a', color: '#000', fontWeight: 600 }}>
                  View All
                </Link>
              </div>
              <div className="table-responsive p-3">
                <table className="table align-middle mb-0">
                  <thead className="text-muted small text-uppercase border-bottom">
                    <tr>
                      <th>Product</th>
                      <th>Buyer</th>
                      <th>Type</th>
                      <th>Offer Price</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending_offers && data.pending_offers.length > 0 ? (
                      data.pending_offers.map((offer, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{offer.product_title || '—'}</td>
                          <td>{offer.buyer_name || '—'}</td>
                          <td>
                            <span
                              className="badge rounded-pill px-3 py-2 fw-semibold"
                              style={{ background: offer.listing_type === 'rent' ? '#cf0048' : '#008080', color: '#fff' }}
                            >
                              {offer.listing_type === 'rent' ? 'Rent' : 'Sell'}
                            </span>
                          </td>
                          <td className="fw-semibold">&#8377;{Number(offer.offer_price || 0).toLocaleString('en-IN')}</td>
                          <td className="text-muted">
                            {offer.created_at ? formatDate(offer.created_at) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">No pending offers at the moment.</td>
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
