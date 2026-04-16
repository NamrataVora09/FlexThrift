'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Product {
  id: number; title: string; product_number: string; listing_type: string; category: string;
  original_price: string; price: string; selling_price: string; status: string;
  admin_remarks: string; views_count: string; offer_count: string; image_count: string;
  image: string; created_at: string; rental_cost: string;
}

interface Props { role: string; apiPath: string; uploadPath: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d1e7dd', color: '#0f5132' },
  rejected: { bg: '#f8d7da', color: '#842029' },
  sold:     { bg: '#e2e3e5', color: '#41464b' },
  inactive: { bg: '#e9ecef', color: '#6c757d' },
};

const TABS = ['all', 'pending', 'approved', 'rejected', 'sold'];

export default function MyProductsView({ role, apiPath, uploadPath }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Product[]>(apiPath).then((r) => {
      if (r.success && r.data) setProducts(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [apiPath]);

  const handleDelete = (id: number) => {
    confirmToast('Are you sure you want to delete this product? This action cannot be undone.', async () => {
      setActionLoading(true);
      const res = await api.post(`/seller/delete-product/${id}`);
      setActionLoading(false);
      if (res?.success) {
        toast.success('Product deleted successfully');
        load();
      } else {
        toast.error(res?.message || 'Delete failed');
      }
    }, 'Delete');
  };

  const filtered = useMemo(() => filter === 'all' ? products : products.filter((p) => p.status === filter), [products, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    TABS.slice(1).forEach(s => { c[s] = products.filter(p => p.status === s).length; });
    return c;
  }, [products]);

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-box-seam" style={{ color: '#ffc63a' }}></i> My Products
            </h1>
            <p className="text-muted small mb-0">Manage all your uploaded products.</p>
          </div>
          <div className="d-flex gap-2">
            <Link href={uploadPath} className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold}>
              <i className="bi bi-plus-circle"></i> Upload New Product
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="d-flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: 5 }}>
          {TABS.map((t) => (
            <button key={t} className="btn" onClick={() => setFilter(t)}
              style={{
                border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500,
                whiteSpace: 'nowrap', fontSize: '0.85rem',
                background: filter === t ? '#ffc63a' : '#fff',
                color: filter === t ? '#212529' : '#677788',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="badge rounded-pill ms-2" style={{ background: filter === t ? 'rgba(0,0,0,0.15)' : '#f1f2f4', color: filter === t ? '#212529' : '#677788', fontSize: '0.7rem' }}>
                {counts[t] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : filtered.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Views</th>
                    <th style={thStyle}>Offers</th>
                    <th style={thStyle}>Images</th>
                    <th style={thStyle}>Uploaded</th>
                    <th style={{ ...thStyle, textAlign: 'end' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((p) => {
                      return (
                        <tr key={p.id}>
                          {/* Product */}
                          <td style={tdStyle}>
                            <strong>{p.title}</strong><br />
                            <small className="badge bg-light text-dark border mb-1">ID: {p.product_number || `#${p.id}`}</small><br />
                            <small className="text-muted">{p.category || '—'}</small>
                          </td>

                          {/* Type */}
                          <td style={tdStyle}>
                            <span className="badge" style={{ background: p.listing_type === 'sell' ? '#ffc63a' : '#0dcaf0', color: p.listing_type === 'sell' ? '#212529' : '#fff', fontWeight: 600 }}>
                              {p.listing_type?.charAt(0).toUpperCase() + p.listing_type?.slice(1)}
                            </span>
                          </td>

                          {/* Price */}
                          <td style={tdStyle}>
                            {p.listing_type === 'rent' 
                              ? `₹${Number(p.rental_cost || 0).toFixed(2)} /day`
                              : `₹${Number(p.price || p.selling_price || p.original_price || 0).toFixed(2)}`
                            }
                          </td>

                          {/* Status */}
                          <td style={tdStyle}>
                            {(() => {
                              const rawStatus = p.status?.trim() || '';
                              const sc = STATUS_COLORS[rawStatus] || { bg: '#e9ecef', color: '#6c757d' };
                              const label = !rawStatus
                                ? 'Unknown'
                                : rawStatus === 'sold' && p.listing_type === 'rent'
                                  ? 'Rented'
                                  : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
                              return (
                                <>
                                  <span className="badge" style={{ background: sc.bg, color: sc.color, fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: 6, display: 'inline-block', marginBottom: '0.25rem' }}>
                                    {label}
                                  </span>
                                  {rawStatus === 'rejected' && p.admin_remarks && (
                                    <div style={{ fontSize: '0.75rem', color: '#842029', background: 'rgba(248,215,218,0.5)', padding: '4px 8px', borderRadius: 4, marginTop: 4, maxWidth: 150, borderLeft: '3px solid #dc3545' }}>
                                      <i className="bi bi-info-circle me-1"></i>{p.admin_remarks}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>

                          {/* Views */}
                          <td style={tdStyle}>{p.views_count || '0'}</td>

                          {/* Offers */}
                          <td style={tdStyle}>
                            {Number(p.offer_count) > 0 ? (
                              <span className="badge" style={{ background: 'rgba(13,202,240,0.15)', color: '#0dcaf0', fontWeight: 600 }}>{p.offer_count} offers</span>
                            ) : (
                              <span className="text-muted">0</span>
                            )}
                          </td>

                          {/* Images */}
                          <td style={tdStyle}>{p.image_count || '0'}</td>

                          {/* Uploaded */}
                          <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>

                          {/* Actions */}
                          <td style={{ ...tdStyle, textAlign: 'end' }}>
                            <div className="d-flex gap-1 justify-content-end">
                              <Link 
                                href={`/buyer/product/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.id}`} 
                                className="btn btn-sm btn-outline-dark" 
                                style={{ borderRadius: 8 }}
                                target="_blank"
                              >
                                <i className="bi bi-eye"></i> View
                              </Link>
                              <Link href={`/${role === 'super_admin' ? 'superadmin' : role}/upload-product?edit=${p.id}`} className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}>
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Link>
                              <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }} onClick={() => handleDelete(p.id)}>
                                <i className="bi bi-trash me-1"></i> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#ddd' }}></i>
                <h5 className="mt-3 text-muted">
                  {filter !== 'all' ? `No ${filter} products found` : 'No products uploaded yet'}
                </h5>
                <Link href={uploadPath} className="btn mt-3 sa-filter-btn" style={btnGold}>
                  <i className="bi bi-upload me-2"></i> Upload Your First Product
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal removed in favor of confirmToast */}
    </DashboardLayout>
  );
}
