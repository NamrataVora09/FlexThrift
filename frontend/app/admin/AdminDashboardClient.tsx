'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import { api } from '@/lib/api';

interface AdminData {
  user: { name: string };
  stats: { total_users: number; total_products: number; pending_products: number; approved_products: number; total_orders: number; total_offers: number };
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
        <div className="row">
          <div className="col-md-3 mt-2"><StatsCard title="Total Users" value={data?.stats.total_users ?? 0} icon="bi bi-people-fill" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Products" value={data?.stats.total_products ?? 0} icon="bi bi-box-seam" color="#6366f1" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Pending Approvals" value={data?.stats.pending_products ?? 0} icon="bi bi-hourglass-split" color="#f59e0b" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Total Orders" value={data?.stats.total_orders ?? 0} icon="bi bi-cart-check" color="#10b981" /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
