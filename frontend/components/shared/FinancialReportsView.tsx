'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface TrxData {
  stats: {
    total_revenue: number; sub_revenue: number; order_revenue: number;
    success_rate: number; total_transactions: number; total_orders: number;
    paid_count: number; pending_count: number; failed_count: number;
  };
  transactions: Array<{
    id: number; user_name: string; type: string; amount: string;
    status: string; description: string; transaction_id: string;
    item_name: string; created_at: string; transaction_type: string;
  }>;
}

type Period = 'today' | '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

const thStyle: React.CSSProperties = { backgroundColor: '#f7fafc', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1, color: '#4a5568', border: 'none', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '0.9rem 1rem', verticalAlign: 'middle', color: '#2d3748', fontSize: '0.85rem', borderBottom: '1px solid #edf2f7' };
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  paid: { background: '#d1fae5', color: '#065f46' },
  pending: { background: '#fef3c7', color: '#92400e' },
  failed: { background: '#fee2e2', color: '#991b1b' },
  refunded: { background: '#e0e7ff', color: '#3730a3' },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '1y', label: '1 Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

export default function FinancialReportsView() {
  const [data, setData] = useState<TrxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback((p: Period, from?: string, to?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('period', p);
    if (p === 'custom' && from) params.set('from', from);
    if (p === 'custom' && to) params.set('to', to);
    api.get<TrxData>(`/superadmin/financial-reports?${params}`).then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(period); }, []);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') load(p);
  };

  const handleCustomApply = () => {
    if (dateFrom) load('custom', dateFrom, dateTo || new Date().toISOString().split('T')[0]);
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.transactions;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.user_name || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q) ||
        (t.item_name || '').toLowerCase().includes(q) ||
        (t.transaction_id || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter(t => t.status === statusFilter);
    if (typeFilter) list = list.filter(t => (t.type || '').toLowerCase() === typeFilter);
    return list;
  }, [data, search, statusFilter, typeFilter]);

  const s = data?.stats;

  const statCards = [
    { label: 'Gross Revenue', value: `₹${Number(s?.total_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: 'bi-wallet2', bg: '#e7f1ff', color: '#0d6efd' },
    { label: 'Order Revenue', value: `₹${Number(s?.order_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: 'bi-cart-check', bg: '#d1fae5', color: '#065f46' },
    { label: 'Subscription Revenue', value: `₹${Number(s?.sub_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: 'bi-gem', bg: '#fef3c7', color: '#92400e' },
    { label: 'Total Transactions', value: String(s?.total_transactions ?? 0), icon: 'bi-receipt', bg: '#e0e7ff', color: '#3730a3' },
    { label: 'Success Rate', value: `${Number(s?.success_rate ?? 0).toFixed(1)}%`, icon: 'bi-check2-circle', bg: '#d1fae5', color: '#065f46' },
    { label: 'Total Orders', value: String(s?.total_orders ?? 0), icon: 'bi-box-seam', bg: '#fce7f3', color: '#9d174d' },
  ];

  const periodLabel = period === 'custom' && dateFrom
    ? `${dateFrom} to ${dateTo || 'now'}`
    : PERIODS.find(p => p.key === period)?.label || '';

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h2 style={{ fontWeight: 800 }}>
              <i className="bi bi-graph-up-arrow" style={{ color: '#ffc63a' }}></i> Financial Reports
            </h2>
            <p className="text-muted mb-0 small">Revenue, transactions and financial analytics — {periodLabel}</p>
          </div>
          <button className="btn btn-sm" style={{ background: '#000', color: '#fff', borderRadius: 10, padding: '8px 20px', fontWeight: 600 }}
            onClick={() => window.print()}>
            <i className="bi bi-download me-1"></i> Export
          </button>
        </div>

        {/* Period Selector */}
        <div className="card border-0 mb-4" style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="card-body py-3 px-4">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="small fw-bold text-muted text-uppercase" style={{ letterSpacing: 0.5 }}>Period:</span>
              {PERIODS.map(p => (
                <button key={p.key} className={`btn btn-sm ${period === p.key ? '' : 'btn-outline-secondary'}`}
                  onClick={() => handlePeriodChange(p.key)}
                  style={period === p.key ? { background: '#ffc63a', color: '#000', fontWeight: 700, border: 'none', borderRadius: 20 } : { borderRadius: 20, fontSize: '0.8rem' }}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="d-flex gap-2 align-items-end mt-3">
                <div>
                  <label className="form-label small fw-bold mb-1">From <span className="text-danger">*</span></label>
                  <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="form-label small fw-bold mb-1">To</label>
                  <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <button className="btn btn-sm" disabled={!dateFrom} onClick={handleCustomApply}
                  style={{ background: '#ffc63a', color: '#000', fontWeight: 700, border: 'none', borderRadius: 8, padding: '6px 20px' }}>
                  <i className="bi bi-funnel me-1"></i>Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="row g-3 mb-4">
              {statCards.map((c, i) => (
                <div key={i} className="col-md-4 col-lg-2">
                  <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 12, background: c.bg, color: c.color }}>
                      <i className={`bi ${c.icon}`}></i>
                    </div>
                    <div className="text-muted small fw-bold" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                    <div className="fw-bold" style={{ fontSize: '1.15rem' }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Summary Bar */}
            {s && (s.paid_count > 0 || s.pending_count > 0 || s.failed_count > 0) && (
              <div className="d-flex gap-3 mb-4">
                {[
                  { label: 'Paid', count: s.paid_count, bg: '#d1fae5', color: '#065f46' },
                  { label: 'Pending', count: s.pending_count, bg: '#fef3c7', color: '#92400e' },
                  { label: 'Failed', count: s.failed_count, bg: '#fee2e2', color: '#991b1b' },
                ].map(b => (
                  <div key={b.label} style={{ background: b.bg, color: b.color, padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, display: 'inline-block' }}></span>
                    {b.label}: {b.count}
                  </div>
                ))}
              </div>
            )}

            {/* Transactions Table */}
            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 14 }}>
              <div className="card-header bg-white py-3 px-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">Transaction History <span className="badge bg-dark rounded-pill ms-2" style={{ fontSize: '0.7rem' }}>{filtered.length}</span></h5>
                  <div className="d-flex gap-2 align-items-center">
                    <select className="form-select form-select-sm shadow-none" style={{ width: 120, fontSize: '0.8rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <select className="form-select form-select-sm shadow-none" style={{ width: 140, fontSize: '0.8rem' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                      <option value="">All Types</option>
                      <option value="order">Order</option>
                      <option value="subscription">Subscription</option>
                    </select>
                    <div className="input-group input-group-sm" style={{ width: 200 }}>
                      <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                      <input className="form-control bg-light border-start-0 shadow-none" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive" style={{ maxHeight: 500 }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
                      <th style={{ ...thStyle, paddingLeft: '1.25rem' }}>Date</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Customer</th>
                      <th style={thStyle}>Item / Details</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, paddingRight: '1.25rem' }}>Ref ID</th>
                    </tr></thead>
                    <tbody>
                      {filtered.length > 0 ? filtered.map((t) => {
                        const ss = STATUS_STYLES[t.status] || STATUS_STYLES.pending;
                        const isSub = (t.type || '').toLowerCase().includes('subscription');
                        return (
                          <tr key={t.id}>
                            <td style={{ ...tdStyle, paddingLeft: '1.25rem' }}>
                              <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>{new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: isSub ? 'rgba(255,198,58,0.15)' : 'rgba(13,202,240,0.1)', color: isSub ? '#b8860b' : '#0891b2' }}>
                                {t.type || t.transaction_type || 'N/A'}
                              </span>
                            </td>
                            <td style={tdStyle}><div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{t.user_name || 'N/A'}</div></td>
                            <td style={tdStyle}><div className="small">{t.item_name || t.description || 'N/A'}</div></td>
                            <td style={tdStyle}>
                              <div className="fw-bold">₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ ...ss, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                {t.status || 'N/A'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, paddingRight: '1.25rem' }}>
                              <code className="text-muted" style={{ fontSize: '0.72rem' }}>{t.transaction_id || '—'}</code>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={7} className="text-center py-5">
                          <i className="bi bi-receipt" style={{ fontSize: '2.5rem', opacity: 0.2 }}></i>
                          <p className="text-muted mt-2 mb-0">No transactions found for this period.</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
