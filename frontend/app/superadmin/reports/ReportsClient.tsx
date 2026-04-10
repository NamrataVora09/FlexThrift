'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface ReportData {
  report: { total_orders: number; total_revenue: number; new_users: number; new_products: number };
  orders: Array<{ id: number; product_name: string; final_price: string; status: string; created_at: string }>;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const STATUS_COLORS: Record<string, { bg: string; color: string }> = { delivered: { bg: '#d1e7dd', color: '#0f5132' }, pending: { bg: '#fff3cd', color: '#856404' }, cancelled: { bg: '#f8d7da', color: '#842029' }, processing: { bg: '#cff4fc', color: '#055160' } };

export default function ReportsClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  const load = (p: string) => { setLoading(true); api.get<ReportData>(`/superadmin/reports?period=${p}`).then((r) => { if (r.success && r.data) setData(r.data); setLoading(false); }); };
  useEffect(() => { load(period); }, []);

  const r = data?.report;

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        <div className="mb-4"><h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><i className="bi bi-bar-chart-fill" style={{ color: '#ffc63a' }}></i> Reports</h1></div>

        <div className="card border-0 mb-4 p-4" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label fw-semibold">Report Type</label><select className="form-select" style={inputStyle} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
            <div className="col-md-4"><label className="form-label">&nbsp;</label><button className="btn w-100 sa-filter-btn" style={btnGold} onClick={() => load(period)}><i className="bi bi-search me-2"></i>Generate Report</button></div>
          </div>
        </div>

        {loading ? <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div> : (<>
          <div className="row g-3 mb-4">
            {[{ l: 'Total Orders', v: r?.total_orders ?? 0, p: '' }, { l: 'Total Revenue', v: r?.total_revenue ?? 0, p: '₹' }, { l: 'New Users', v: r?.new_users ?? 0, p: '' }, { l: 'New Products', v: r?.new_products ?? 0, p: '' }].map((s, i) => (
              <div className="col-md-3" key={i}><div className="card border-0 p-3" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}><p className="text-muted mb-1 small">{s.l}</p><h3 className="mb-0 fw-bold">{s.p}{Number(s.v).toLocaleString()}</h3></div></div>
            ))}
          </div>

          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white py-3 px-4" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}><h5 className="mb-0 fw-bold">Order Details</h5></div>
            <div className="card-body p-0"><div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Order ID</th><th style={thStyle}>Product</th><th style={thStyle}>Amount</th><th style={thStyle}>Status</th><th style={thStyle}>Commission</th></tr></thead>
              <tbody>{(data?.orders || []).length > 0 ? data!.orders.map((o) => { const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending; return (
                <tr key={o.id}><td style={tdStyle}>{new Date(o.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td style={tdStyle}>#{o.id}</td><td style={tdStyle}>{o.product_name || 'N/A'}</td><td style={tdStyle}>₹{Number(o.final_price).toLocaleString()}</td><td style={tdStyle}><span className="badge" style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}>{o.status?.charAt(0).toUpperCase() + o.status?.slice(1)}</span></td><td style={tdStyle}>₹{Math.round(Number(o.final_price) * 0.1).toLocaleString()}</td></tr>
              ); }) : <tr><td colSpan={6} className="text-center text-muted py-4">No orders found for this period</td></tr>}</tbody>
            </table></div></div>
          </div>
        </>)}
      </div>
    </DashboardLayout>
  );
}
