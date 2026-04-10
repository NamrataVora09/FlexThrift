'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import DataTable, { Column } from './DataTable';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';

interface AnalyticsData {
  status_stats: Array<{ status: string; count: number }>;
  offer_trend: Array<{ date: string; count: number; accepted: number }>;
  revenue: Array<{ month: string; offer_revenue: string }>;
  top_products: Array<{ title: string; listing_type: string; offer_count: number; accepted_count: number }>;
}

interface Props { role: string; }

const topProductCols: Column<AnalyticsData['top_products'][0]>[] = [
  { key: 'title', label: 'Product', render: (r) => <span className="fw-semibold">{r.title}</span> },
  { key: 'listing_type', label: 'Type', render: (r) => <span className={r.listing_type === 'rent' ? 'rent_typ' : 'sell_typ'}>{r.listing_type}</span> },
  { key: 'offer_count', label: 'Offers', render: (r) => <span className="fw-bold">{r.offer_count}</span> },
  { key: 'accepted_count', label: 'Accepted', render: (r) => <span className="accept_sts">{r.accepted_count}</span> },
];

export default function AnalyticsView({ role }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsData>('/shared/analytics').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  const getStatusCount = (status: string) =>
    data?.status_stats?.find((s) => s.status === status)?.count ?? 0;

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Analytics" />

        <div className="row mb-4">
          <div className="col-md-3 mt-2"><StatsCard title="Approved" value={getStatusCount('approved')} icon="fa fa-check-circle" color="#10b981" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Pending" value={getStatusCount('pending')} icon="fa fa-clock" color="#f59e0b" /></div>
          <div className="col-md-3 mt-2"><StatsCard title="Rejected" value={getStatusCount('rejected')} icon="fa fa-times-circle" color="#ef4444" /></div>
          <div className="col-md-3 mt-2">
            <StatsCard
              title="Total Revenue"
              value={`₹${(data?.revenue?.reduce((s, r) => s + parseFloat(r.offer_revenue || '0'), 0) ?? 0).toLocaleString()}`}
              icon="fa fa-indian-rupee-sign" color="#6366f1"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="subsection_label_font mb-3">Offer Trend (30 Days)</h5>
                {data?.offer_trend && data.offer_trend.length > 0 ? (
                  <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table className="table table-sm">
                      <thead><tr><th>Date</th><th>Total</th><th>Accepted</th></tr></thead>
                      <tbody>
                        {data.offer_trend.map((d, i) => (
                          <tr key={i}>
                            <td className="normal_label_font">{d.date}</td>
                            <td><span className="badge bg-primary">{d.count}</span></td>
                            <td><span className="badge bg-success">{d.accepted}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="normal_label_font">No offer data yet</p>}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="subsection_label_font mb-3">Revenue by Month</h5>
                {data?.revenue && data.revenue.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {data.revenue.map((r, i) => (
                          <tr key={i}>
                            <td>{r.month}</td>
                            <td className="fw-bold" style={{ color: '#ffc63a' }}>₹{parseFloat(r.offer_revenue || '0').toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="normal_label_font">No revenue data yet</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-body">
            <h5 className="subsection_label_font mb-3">Top Products by Offers</h5>
            <DataTable columns={topProductCols} data={data?.top_products ?? []} emptyIcon="fa fa-box" emptyText="No product data yet" keyField="title" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
