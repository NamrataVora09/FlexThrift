'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Offer {
  id: number; product_title: string; listing_type: string; offer_price: string;
  buyer_name: string; seller_name: string; status: string; created_at: string;
  original_price?: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(255,198,58,0.1)', color: '#b8860b' },
  accepted: { bg: 'rgba(25,135,84,0.1)', color: '#198754' },
  rejected: { bg: 'rgba(220,53,69,0.1)', color: '#dc3545' },
  cancelled: { bg: 'rgba(108,117,125,0.1)', color: '#6c757d' },
};

export default function AdminAllOffersClient() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<Offer[]>('/admin/all-offers').then((res) => {
      if (res.success && res.data) setOffers(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = offers.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const searchFields = [o.product_title, o.buyer_name, o.seller_name].filter(Boolean).join(' ');
      if (!searchFields.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <DashboardLayout requiredRoles={['admin']}>
      <div className="container-fluid">
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-globe" style={{ color: '#ffc63a' }}></i> All Offers On Platform
          </h1>
          <p className="text-muted small">Overview of every offer transaction happening on FlexMarket.</p>
        </div>

        {/* Filters */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', padding: '1rem 1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <input className="form-control" style={inputStyle} placeholder="Search by product, buyer or seller..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" style={inputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn w-100" style={btnGold}><i className="bi bi-funnel me-1"></i> {filtered.length} results</button>
            </div>
            <div className="col-md-2">
              <button className="btn w-100 btn-outline-secondary" style={{ borderRadius: '0.5rem' }} onClick={() => { setSearch(''); setFilterStatus(''); }}>Reset</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Product</th>
                      <th style={thStyle}>Buyer</th>
                      <th style={thStyle}>Seller</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Original Price</th>
                      <th style={thStyle}>Offer Price</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((o) => {
                      const sc = statusColors[o.status] || statusColors.pending;
                      return (
                        <tr key={o.id}>
                          <td style={tdStyle}>#{o.id}</td>
                          <td style={tdStyle} className="fw-bold">{o.product_title || '—'}</td>
                          <td style={tdStyle}>{o.buyer_name || '—'}</td>
                          <td style={tdStyle}>{o.seller_name || '—'}</td>
                          <td style={tdStyle}><span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: '0.7rem' }}>{o.listing_type}</span></td>
                          <td style={tdStyle} className="text-muted">₹{Number(o.original_price || 0).toLocaleString()}</td>
                          <td style={tdStyle} className="fw-bold">₹{Number(o.offer_price || 0).toLocaleString()}</td>
                          <td style={tdStyle}>
                            <span className="badge px-3 py-2" style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}>
                              {o.status?.charAt(0).toUpperCase() + o.status?.slice(1)}
                            </span>
                          </td>
                          <td style={tdStyle}><small>{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={9} className="text-center py-5 text-muted">
                        <i className="bi bi-inbox" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: '0.5rem' }}></i>
                        No offers found on the platform.
                      </td></tr>
                    )}
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
