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
}

export default function AdminDashboardClient() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    api.get<AdminData>('/admin/dashboard').then((r) => { if (r.success && r.data) setData(r.data); });
  }, []);

  return (
    <DashboardLayout requiredRoles={['admin']}>
      <div className="container">
        <h1 className="header_label_font mb-4">Admin Dashboard</h1>
        
        <h5 className="fw-bold mb-3" style={{ opacity: 0.6 }}>Platform Overview</h5>
        <div className="row mb-4">
          <div className="col-md-3 mt-2"><StatsCard title="Total Users" value={data?.stats.total_users ?? 0} icon="bi bi-people-fill" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Sellers" value={data?.stats.total_sellers ?? 0} icon="bi bi-shop" color="#8b5cf6" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Buyers" value={data?.stats.total_buyers ?? 0} icon="bi bi-bag-heart" color="#ec4899" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Active Subs" value={data?.stats.active_subscriptions ?? 0} icon="bi bi-credit-card-2-back" color="#10b981" /></div>
        </div>

        <h5 className="fw-bold mb-3" style={{ opacity: 0.6 }}>Operations & Sales</h5>
        <div className="row">
          <div className="col-md-3 mt-2"><StatsCard title="Total Products" value={data?.stats.total_products ?? 0} icon="bi bi-box-seam" color="#6366f1" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Pending Approvals" value={data?.stats.pending_products ?? 0} icon="bi bi-hourglass-split" color="#f59e0b" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Offers" value={data?.stats.total_offers ?? 0} icon="bi bi-chat-left-dots" color="#3b82f6" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Completed Deals" value={data?.stats.successful_deals ?? 0} icon="bi bi-check-circle-fill" color="#10b981" /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
