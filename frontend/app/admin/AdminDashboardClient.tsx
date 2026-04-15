'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import { api } from '@/lib/api';

interface AdminData {
  user: { name: string };
  stats: { 
    total_users: number; 
    total_sellers: number;
    total_buyers: number;
    total_products: number; 
    pending_products: number; 
    total_offers: number;
    successful_deals: number;
    active_subscriptions: number;
  };
  recent_offers: any[];
}

export default function AdminDashboardClient() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    api.get<AdminData>('/admin/dashboard').then((r) => { if (r.success && r.data) setData(r.data); });
  }, []);

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout requiredRoles={['admin']}>
      <div className="container pb-5">
        <h1 className="header_label_font mb-4">Admin Dashboard</h1>
        
        <h5 className="fw-bold mb-3" style={{ opacity: 0.6 }}>Platform Overview</h5>
        <div className="row mb-4">
          <div className="col-md-3 mt-2"><StatsCard title="Total Users" value={data?.stats.total_users ?? 0} icon="bi bi-people-fill" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Sellers" value={data?.stats.total_sellers ?? 0} icon="bi bi-shop" color="#8b5cf6" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Buyers" value={data?.stats.total_buyers ?? 0} icon="bi bi-bag-heart" color="#ec4899" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Active Subs" value={data?.stats.active_subscriptions ?? 0} icon="bi bi-credit-card-2-back" color="#10b981" /></div>
        </div>

        <h5 className="fw-bold mb-3" style={{ opacity: 0.6 }}>Operations & Sales</h5>
        <div className="row mb-5">
          <div className="col-md-3 mt-2"><StatsCard title="Total Products" value={data?.stats.total_products ?? 0} icon="bi bi-box-seam" color="#6366f1" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Pending Approvals" value={data?.stats.pending_products ?? 0} icon="bi bi-hourglass-split" color="#f59e0b" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Offers" value={data?.stats.total_offers ?? 0} icon="bi bi-chat-left-dots" color="#3b82f6" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Completed Deals" value={data?.stats.successful_deals ?? 0} icon="bi bi-check-circle-fill" color="#10b981" /></div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0" style={{ opacity: 0.6 }}>Recent Offers Activity</h5>
          <a href="/admin/all-platform-offers" className="btn btn-sm btn-link text-decoration-none fw-bold" style={{ color: '#ffc63a' }}>
            View All Offers →
          </a>
        </div>

        <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
          <div className="table-responsive p-3">
            <table className="table align-middle mb-0">
              <thead className="text-muted small text-uppercase border-bottom">
                <tr>
                  <th style={{ background: 'transparent' }}>Product</th>
                  <th style={{ background: 'transparent' }}>Buyer</th>
                  <th style={{ background: 'transparent' }}>Seller</th>
                  <th style={{ background: 'transparent' }}>Price</th>
                  <th style={{ background: 'transparent' }}>Status</th>
                  <th style={{ background: 'transparent' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_offers && data.recent_offers.length > 0 ? (
                  data.recent_offers.map((o, i) => (
                    <tr key={i}>
                      <td>
                        <div className="fw-bold text-truncate" style={{ maxWidth: 200 }}>{o.product_title}</div>
                        <small className="text-muted">#{o.product_id}</small>
                      </td>
                      <td>{o.buyer_name}</td>
                      <td>{o.seller_name}</td>
                      <td>&#8377;{Number(o.offer_price).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-2 fw-semibold status-badge-${o.status}`}>
                          {o.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDate(o.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">No recent activity found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .status-badge-accepted { background: #dcfce7; color: #15803d; }
        .status-badge-pending { background: #fef3c7; color: #92400e; }
        .status-badge-rejected { background: #fee2e2; color: #b91c1c; }
        .status-badge-completed { background: #dbeafe; color: #1d4ed8; }
      `}</style>
    </DashboardLayout>
  );
}
