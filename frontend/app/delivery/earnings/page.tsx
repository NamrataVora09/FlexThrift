'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';
import { api } from '@/lib/api';

interface EarningsData {
  total_earnings: number;
  recent: Array<{ id: number; amount: string; description: string; created_at: string }>;
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<EarningsData>('/delivery/earnings').then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout requiredRoles={['delivery']}>
      <div className="container">
        <h1 className="header_label_font mb-4">Earnings</h1>

        <div className="row mb-4">
          <div className="col-md-4">
            <StatsCard title="Total Earnings" value={`₹${(data?.total_earnings ?? 0).toLocaleString()}`} icon="bi bi-wallet2" color="#10b981" />
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h5 className="subsection_label_font mb-3">Recent Earnings</h5>
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : !data?.recent?.length ? (
              <div className="text-center py-5">
                <i className="bi bi-wallet2" style={{ fontSize: 48, color: '#ddd' }}></i>
                <p className="normal_label_font mt-3">No earnings yet</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.recent.map((t) => (
                      <tr key={t.id}>
                        <td>#{t.id}</td>
                        <td>{t.description || 'Delivery earning'}</td>
                        <td className="fw-bold" style={{ color: '#10b981' }}>+₹{t.amount}</td>
                        <td className="normal_label_font">{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
