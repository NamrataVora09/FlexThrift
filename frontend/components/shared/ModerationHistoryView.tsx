'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Item {
  id: number; title: string; listing_type: string; original_price: string; price: string;
  status: string; admin_remarks: string; updated_at: string; created_at: string;
  seller_name: string; seller_email: string; seller_rating_avg: string; seller_rating_count: string;
  description: string; seller_mobile: string;
  primary_image?: string;
  images?: Array<{ id: number; image_path: string }>;
}

interface Props { role: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, padding: '1rem', border: 'none' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', color: '#1e293b', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.75rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.75rem', padding: '0.5rem 1rem' };
const BASE = 'http://localhost:8080';

export default function ModerationHistoryView({ role }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');

  // Detail modal
  const [detail, setDetail] = useState<Item | null>(null);
  const [detailImages, setDetailImages] = useState<Array<{ id: number; image_path: string }>>([]);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get<Item[]>('/shared/moderation-history').then((r) => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => items.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.seller_name.toLowerCase().includes(q) && !(i.seller_email || '').toLowerCase().includes(q)) return false;
    }
    if (dateFrom && i.updated_at < dateFrom) return false;
    if (dateTo && i.updated_at.split(' ')[0] > dateTo) return false;
    return true;
  }), [items, statusFilter, search, dateFrom, dateTo, userType]);

  const resetFilters = () => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setUserType(''); };

  const viewDetail = async (id: number) => {
    const res = await api.get<any>(`/superadmin/get-product-detail/${id}`);
    if (res.success && res.data) {
      setDetail(res.data);
      setDetailImages(res.data.images || []);
      setImgIdx(0);
    }
  };

  const renderStars = (avg: number, count: number) => (
    <span style={{ fontSize: '0.7rem' }}>
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={`bi bi-star${i <= Math.round(avg) ? '-fill' : ''}`} style={{ color: i <= Math.round(avg) ? '#f59e0b' : '#cbd5e1' }}></i>)}
      <span className="text-muted small ms-1">({count})</span>
    </span>
  );

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1">Moderation History</h2>
            <p className="text-muted small mb-0">Track all past approvals and rejections of product submissions.</p>
          </div>
          <div className="d-flex gap-2">
            {['', 'approved', 'rejected'].map((s) => (
              <button key={s} className="btn btn-light border" onClick={() => setStatusFilter(s)}
                style={{ padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', ...(statusFilter === s ? { background: '#3b82f6', color: '#fff', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.3)', borderColor: '#3b82f6' } : {}) }}>
                {s === '' ? 'All Actions' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Filter Panel */}
        <div className="card border-0 shadow-sm mb-4 p-4" style={{ borderRadius: '1rem', background: '#fff' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label style={labelStyle}>From Date</label>
              <input type="date" className="form-control" style={inputStyle} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label style={labelStyle}>To Date</label>
              <input type="date" className="form-control" style={inputStyle} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label style={labelStyle}>Search (Name / Email / Product)</label>
              <input type="text" className="form-control" style={inputStyle} placeholder="e.g. John, seller@flex.com" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>User Type</label>
              <select className="form-select" style={inputStyle} value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option value="">All Types</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="col-md-1 d-flex gap-2">
              <button className="sa-filter-btn w-100" style={btnGold}><i className="bi bi-funnel"></i></button>
              <button className="btn btn-outline-secondary" style={{ borderRadius: '0.75rem' }} onClick={resetFilters}><i className="bi bi-x-lg"></i></button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ border: 'none', borderRadius: 16, background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Seller Details</th>
                  <th style={thStyle}>Action Taken</th>
                  <th style={thStyle}>Remarks / Reason</th>
                  <th style={thStyle}>Processed On</th>
                  <th style={{ ...thStyle, textAlign: 'end' }}>Details</th>
                </tr></thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map((item) => (
                    <tr key={item.id}>
                      {/* Product */}
                      <td style={tdStyle}>
                        <div className="d-flex align-items-center gap-3">
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            {item.primary_image ? (
                              <img src={item.primary_image.startsWith('uploads/') ? `${BASE}/${item.primary_image}` : `${BASE}/uploads/products/${item.primary_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="bi bi-image text-muted"></i>
                            )}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{item.title}</div>
                            <small className="text-muted">ID: #{item.id} | {item.listing_type?.charAt(0).toUpperCase() + item.listing_type?.slice(1)}</small>
                          </div>
                        </div>
                      </td>

                      {/* Seller */}
                      <td style={tdStyle}>
                        <div className="fw-bold small">{item.seller_name}</div>
                        <div className="text-muted small">{item.seller_email}</div>
                        <div className="mt-1">{renderStars(Number(item.seller_rating_avg || 0), Number(item.seller_rating_count || 0))}</div>
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: 50, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', ...(item.status === 'approved' ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#991b1b' }) }}>
                          <i className={`bi bi-${item.status === 'approved' ? 'check-circle-fill' : 'x-circle-fill'} me-1`}></i>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td style={tdStyle}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: 10, fontSize: '0.8rem', maxWidth: 300 }} className="text-truncate">
                          {item.admin_remarks || <span className="text-muted fst-italic">No remarks provided</span>}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={tdStyle}>
                        <div className="fw-bold small text-dark">{new Date(item.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <small className="text-muted">{new Date(item.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>

                      {/* View */}
                      <td style={{ ...tdStyle, textAlign: 'end' }}>
                        <button className="btn btn-white btn-sm border rounded-pill px-3 shadow-sm" onClick={() => viewDetail(item.id)}>
                          <i className="bi bi-eye"></i>
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-5">
                      <i className="bi bi-journal-x text-muted" style={{ fontSize: '3rem' }}></i>
                      <p className="text-muted mt-2">No moderation history found matching your filters.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ Detail Modal ══ */}
      {detail && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setDetail(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">Moderation Detail</h5>
                <button type="button" className="btn-close" onClick={() => setDetail(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Image Gallery */}
                  <div className="col-md-6">
                    <div className="rounded-4 overflow-hidden border" style={{ background: '#f1f5f9', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {detailImages.length > 0 ? (
                        <img src={detailImages[imgIdx]?.image_path?.startsWith('uploads/') ? `${BASE}/${detailImages[imgIdx].image_path}` : `${BASE}/uploads/products/${detailImages[imgIdx]?.image_path}`} alt="" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                      ) : (
                        <div className="text-muted text-center p-4"><i className="bi bi-image" style={{ fontSize: '3rem', opacity: 0.3 }}></i><p className="small mt-2">No images</p></div>
                      )}
                    </div>
                    {detailImages.length > 1 && (
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button className="btn btn-sm btn-light border" onClick={() => setImgIdx((i) => (i - 1 + detailImages.length) % detailImages.length)}><i className="bi bi-chevron-left"></i></button>
                        <span className="small text-muted align-self-center">{imgIdx + 1} / {detailImages.length}</span>
                        <button className="btn btn-sm btn-light border" onClick={() => setImgIdx((i) => (i + 1) % detailImages.length)}><i className="bi bi-chevron-right"></i></button>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="text-muted small fw-bold text-uppercase mb-1 d-block">Admin Decision Remarks</label>
                      <div className="p-3 bg-light rounded-3 small fw-bold" style={{ borderLeft: '4px solid #3b82f6', color: '#ffc63a' }}>
                        {detail.admin_remarks || 'No remarks provided'}
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="p-3 bg-light rounded-3">
                          <label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Seller</label>
                          <div className="fw-bold small">{detail.seller_name}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-light rounded-3">
                          <label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Action Date</label>
                          <div className="fw-bold small">{new Date(detail.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 border rounded-3 small">
                      <p className="mb-1 text-muted">Original product price: <b className="text-dark">₹{Number(detail.original_price || 0).toLocaleString()}</b></p>
                      <p className="mb-0 text-muted">Listing Type: <b className="text-dark">{detail.listing_type?.charAt(0).toUpperCase() + detail.listing_type?.slice(1)}</b></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
