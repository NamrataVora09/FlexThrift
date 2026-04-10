'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Product {
  id: number; title: string; listing_type: string; listing_type_category: string;
  category: string; original_price: string; price: string; rental_cost: string;
  seller_name: string; seller_email: string; image?: string; status: string;
  is_featured: number | string; gender: string; color: string; used_times: string;
  created_at: string; views_count: string;
}

interface PageData {
  products: Product[];
  pagination: { page: number; total: number; total_pages: number; per_page: number };
}

const BASE = 'http://localhost:8080';

export default function ProductManagementPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [listingType, setListingType] = useState('');
  const [featured, setFeatured] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [statusModal, setStatusModal] = useState<{ id: number; title: string; current: string } | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ id: number; title: string } | null>(null);

  const load = (p = page) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (listingType) params.set('listing_type', listingType);
    if (featured) params.set('featured', featured);

    api.get<PageData>(`/superadmin/all-products?${params}`).then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(page); }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1); };
  const resetFilters = () => { setSearch(''); setStatus(''); setListingType(''); setFeatured(''); setPage(1); setTimeout(() => load(1), 0); };

  const toggleFeatured = async (id: number) => {
    const res = await api.post<{ is_featured: number }>(`/superadmin/toggle-featured/${id}`);
    if (res.success && data) {
      setData({ ...data, products: data.products.map(p => p.id === id ? { ...p, is_featured: res.data?.is_featured ?? (Number(p.is_featured) ? 0 : 1) } : p) });
    }
  };

  const changeStatus = async () => {
    if (!statusModal || !newStatus) return;
    const res = await api.post(`/superadmin/update-product-status/${statusModal.id}`, { status: newStatus, remarks });
    if (res.success) { setStatusModal(null); setNewStatus(''); setRemarks(''); load(); }
  };

  const deleteProduct = async () => {
    if (!deleteModal) return;
    const res = await api.post(`/superadmin/delete-product/${deleteModal.id}`);
    if (res.success) { setDeleteModal(null); load(); }
  };

  const selectAll = () => {
    if (!data) return;
    if (selectedIds.length === data.products.length) setSelectedIds([]);
    else setSelectedIds(data.products.map(p => p.id));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const [bulkLoading, setBulkLoading] = useState(false);

  const bulkUpdateStatus = async (newSt: string) => {
    if (!selectedIds.length) return;
    confirmToast(`Change ${selectedIds.length} product(s) to "${newSt}"?`, async () => {
      setBulkLoading(true);
      await Promise.all(selectedIds.map(id => api.post(`/superadmin/update-product-status/${id}`, { status: newSt })));
      setBulkLoading(false);
      setSelectedIds([]);
      toast.success(`Products updated to ${newSt}`);
      load();
    }, 'Update');
  };

  const bulkToggleFeatured = async (val: boolean) => {
    if (!selectedIds.length) return;
    confirmToast(`${val ? 'Feature' : 'Unfeature'} ${selectedIds.length} product(s)?`, async () => {
      setBulkLoading(true);
      for (const id of selectedIds) {
        const p = data?.products.find(pr => pr.id === id);
        if (p && !!Number(p.is_featured) !== val) {
          await api.post(`/superadmin/toggle-featured/${id}`);
        }
      }
      setBulkLoading(false);
      setSelectedIds([]);
      toast.success(`Products ${val ? 'featured' : 'unfeatured'}`);
      load();
    }, val ? 'Feature' : 'Unfeature');
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    confirmToast(`Permanently delete ${selectedIds.length} product(s)? This cannot be undone.`, async () => {
      setBulkLoading(true);
      await Promise.all(selectedIds.map(id => api.post(`/superadmin/delete-product/${id}`)));
      setBulkLoading(false);
      setSelectedIds([]);
      toast.success('Products deleted');
      load();
    }, 'Delete');
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return { bg: '#d1fae5', color: '#065f46' };
      case 'pending': return { bg: '#fef3c7', color: '#92400e' };
      case 'rejected': return { bg: '#fee2e2', color: '#991b1b' };
      case 'inactive': return { bg: '#e5e7eb', color: '#374151' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 style={{ fontWeight: 700 }}><i className="bi bi-boxes" style={{ color: '#ffc63a' }}></i> Product Management</h2>
            <p className="text-muted mb-0 small">Manage all products across the platform</p>
          </div>
          {data && <div className="d-flex gap-2 align-items-center">
            <span className="badge bg-dark rounded-pill px-3 py-2" style={{ fontSize: '0.8rem' }}>{data.pagination.total} total products</span>
          </div>}
        </div>

        {/* Filters */}
        <div className="card border-0 mb-4" style={{ borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div className="card-body p-3">
            <form onSubmit={handleSearch} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-bold text-muted mb-1">Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input className="form-control border-start-0 shadow-none" placeholder="Title, category..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.875rem' }} />
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold text-muted mb-1">Status</label>
                <select className="form-select shadow-none" value={status} onChange={e => setStatus(e.target.value)} style={{ fontSize: '0.875rem' }}>
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold text-muted mb-1">Type</label>
                <select className="form-select shadow-none" value={listingType} onChange={e => setListingType(e.target.value)} style={{ fontSize: '0.875rem' }}>
                  <option value="">All Types</option>
                  <option value="sell">Sell</option>
                  <option value="rent">Rent</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold text-muted mb-1">Featured</label>
                <select className="form-select shadow-none" value={featured} onChange={e => setFeatured(e.target.value)} style={{ fontSize: '0.875rem' }}>
                  <option value="">All</option>
                  <option value="1">Featured</option>
                  <option value="0">Not Featured</option>
                </select>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn sa-filter-btn flex-grow-1" style={{ background: '#ffc63a', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, padding: '0.5rem' }}>
                  <i className="bi bi-funnel me-1"></i> Filter
                </button>
                <button type="button" className="btn sa-filter-reset-btn" onClick={resetFilters} style={{ background: '#fff', color: '#666', fontWeight: 600, border: '1px solid #e0e0e0', borderRadius: 8, padding: '0.5rem 1rem' }}>
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="card border-0 mb-3" style={{ borderRadius: 12, background: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge rounded-pill" style={{ background: '#ffc63a', color: '#000', fontSize: '0.8rem', padding: '6px 14px', fontWeight: 700 }}>
                  {selectedIds.length} selected
                </span>
                <button className="btn btn-sm text-white" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedIds([])}>
                  <i className="bi bi-x-lg me-1"></i>Clear
                </button>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkUpdateStatus('approved')} style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-check-circle me-1"></i>Approve
                </button>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkUpdateStatus('pending')} style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-clock me-1"></i>Pending
                </button>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkUpdateStatus('rejected')} style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-x-circle me-1"></i>Reject
                </button>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkUpdateStatus('inactive')} style={{ background: '#e5e7eb', color: '#374151', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-pause-circle me-1"></i>Inactive
                </button>
                <div style={{ width: 1, background: '#444', alignSelf: 'stretch' }}></div>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkToggleFeatured(true)} style={{ background: '#ffc63a', color: '#000', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-star-fill me-1"></i>Feature
                </button>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={() => bulkToggleFeatured(false)} style={{ background: '#374151', color: '#fff', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-star me-1"></i>Unfeature
                </button>
                <div style={{ width: 1, background: '#444', alignSelf: 'stretch' }}></div>
                <button className="btn btn-sm" disabled={bulkLoading} onClick={bulkDelete} style={{ background: '#dc3545', color: '#fff', fontWeight: 600, borderRadius: 8, fontSize: '0.78rem', padding: '5px 14px' }}>
                  <i className="bi bi-trash3 me-1"></i>Delete
                </button>
              </div>
              {bulkLoading && <div className="spinner-border spinner-border-sm text-warning"></div>}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
        ) : (
          <>
            <div className="card border-0" style={{ borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ width: 40, padding: '12px' }}>
                        <input type="checkbox" className="form-check-input" checked={data?.products.length ? selectedIds.length === data.products.length : false} onChange={selectAll} />
                      </th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Product</th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Seller</th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Category</th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Price</th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px', fontWeight: 700 }}>Featured</th>
                      <th style={{ padding: '12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.products && data.products.length > 0 ? data.products.map(p => (
                      <tr key={p.id} style={{ verticalAlign: 'middle' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <input type="checkbox" className="form-check-input" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div className="d-flex align-items-center gap-3">
                            <div style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {p.image ? (
                                <img src={p.image.startsWith('http') ? p.image : p.image.startsWith('uploads/') ? `${BASE}/${p.image}` : `${BASE}/uploads/products/${p.image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <i className="bi bi-image" style={{ color: '#ccc' }}></i>
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-truncate" style={{ maxWidth: 180 }}>{p.title}</div>
                              <small className="text-muted">#{p.id} &middot; {p.listing_type} &middot; {p.color || '-'}</small>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div className="fw-semibold">{p.seller_name}</div>
                          <small className="text-muted">{p.seller_email}</small>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge bg-light text-dark border" style={{ fontSize: '0.75rem' }}>{p.listing_type_category || '-'}</span>
                          {p.category && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{p.category}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div className="fw-bold" style={{ color: '#ffc63a' }}>
                            ₹{Number(p.listing_type === 'sell' ? (p.price || p.original_price || 0) : (p.rental_cost || 0)).toLocaleString()}
                          </div>
                          {p.original_price && p.price && p.original_price !== p.price && (
                            <small className="text-muted text-decoration-line-through">₹{Number(p.original_price).toLocaleString()}</small>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', ...statusColor(p.status), cursor: 'pointer' }}
                            onClick={() => { setStatusModal({ id: p.id, title: p.title, current: p.status }); setNewStatus(p.status); setRemarks(''); }}
                            title="Click to change status"
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => toggleFeatured(p.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: Number(p.is_featured) ? '#ffc63a' : '#ddd', transition: 'color 0.2s' }}
                            title={Number(p.is_featured) ? 'Remove from Elite Drops' : 'Add to Elite Drops'}
                          >
                            <i className={`bi bi-star${Number(p.is_featured) ? '-fill' : ''}`}></i>
                          </button>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div className="d-flex gap-1 justify-content-center">
                            <Link 
                              href={`/buyer/product/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.id}`} 
                              className="btn btn-sm btn-light border" 
                              style={{ borderRadius: 8 }}
                              target="_blank"
                              title="View Product"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <button className="btn btn-sm btn-light border" title="Change Status" onClick={() => { setStatusModal({ id: p.id, title: p.title, current: p.status }); setNewStatus(p.status); setRemarks(''); }}>
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button className="btn btn-sm btn-light border text-danger" title="Delete" onClick={() => setDeleteModal({ id: p.id, title: p.title })}>
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="text-center py-5 text-muted">
                          <i className="bi bi-inbox" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No products found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {data && data.pagination.total_pages > 1 && (
              <nav className="mt-4">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left"></i></button>
                  </li>
                  {Array.from({ length: Math.min(data.pagination.total_pages, 7) }, (_, i) => {
                    let pageNum: number;
                    const total = data.pagination.total_pages;
                    if (total <= 7) { pageNum = i + 1; }
                    else if (page <= 4) { pageNum = i + 1; }
                    else if (page >= total - 3) { pageNum = total - 6 + i; }
                    else { pageNum = page - 3 + i; }
                    return (
                      <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(pageNum)} style={page === pageNum ? { background: '#ffc63a', borderColor: '#ffc63a', color: '#000' } : {}}>{pageNum}</button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${page === data.pagination.total_pages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right"></i></button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Change Status Modal */}
      {statusModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setStatusModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Change Status</h5>
                <button type="button" className="btn-close" onClick={() => setStatusModal(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Product: <strong>{statusModal.title}</strong></p>
                <label className="form-label small fw-bold">New Status</label>
                <select className="form-select mb-3" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="inactive">Inactive</option>
                </select>
                <label className="form-label small fw-bold">Remarks (optional)</label>
                <textarea className="form-control" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note..." />
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-light" onClick={() => setStatusModal(null)}>Cancel</button>
                <button className="btn" style={{ background: '#ffc63a', fontWeight: 700 }} onClick={changeStatus} disabled={newStatus === statusModal.current}>
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setDeleteModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <div className="modal-body text-center py-4">
                <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
                <h5 className="fw-bold mt-3">Delete Product?</h5>
                <p className="text-muted">Are you sure you want to delete <strong>{deleteModal.title}</strong>? This cannot be undone.</p>
                <div className="d-flex gap-2 justify-content-center mt-3">
                  <button className="btn btn-light px-4" onClick={() => setDeleteModal(null)}>Cancel</button>
                  <button className="btn btn-danger px-4 fw-bold" onClick={deleteProduct}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
