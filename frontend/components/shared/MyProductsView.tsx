'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';
import { useAuth } from '@/lib/auth-context';

interface Product {
  id: number; title: string; product_number: string; listing_type: string; category: string;
  original_price: string; price: string; selling_price: string; status: string;
  admin_remarks: string; views_count: string; offer_count: string; image_count: string;
  image: string; created_at: string; rental_cost: string;
}

interface Props { role: string; apiPath: string; uploadPath: string; }

const thStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: '12.5px',
  letterSpacing: '0.14em',
  color: '#9ca3af',
  padding: '0.9rem 1.5rem',
  borderBottom: '1px solid #f3f4f6'
};
const tdStyle: React.CSSProperties = { padding: '1.1rem 1.5rem', verticalAlign: 'middle', fontSize: '0.875rem', borderBottom: '1px solid #f9fafb' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#ffff', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const productNameStyle: React.CSSProperties = { fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a' };
const productIdStyle: React.CSSProperties = { fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' };
const priceValStyle: React.CSSProperties = { fontWeight: 800, fontSize: '0.88rem' };
const dateValStyle: React.CSSProperties = { fontSize: '0.72rem', color: '#9ca3af' };

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('uploads/')) return `${BACKEND_URL}/${path}`;
  return `${BACKEND_URL}/uploads/products/${path}`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  sold:     { bg: '#ede9fe', color: '#5b21b6' },
  rented:   { bg: '#cffafe', color: '#0e7490' },
  active:   { bg: '#dcfce7', color: '#15803d' },
  inactive: { bg: '#f3f4f6', color: '#6b7280' },
};

const TABS = ['all', 'pending', 'approved', 'rejected', 'inactive'];

export default function MyProductsView({ role, apiPath, uploadPath }: Props) {
  const { toastSuccess, toastError } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isBlockedSeller = user && user.role !== 'super_admin' && Number(user.blocked_seller) === 1;

  const load = () => {
    setLoading(true);
    api.get<Product[]>(apiPath).then((r) => {
      if (r.success && r.data) setProducts(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [apiPath]);

  const getDeletePath = (id: number) => {
    if (role === 'super_admin') return `/superadmin/delete-product/${id}`;
    if (role === 'admin') return `/superadmin/delete-product/${id}`;
    return `/seller/delete-product/${id}`;
  };

  const handleDelete = (id: number) => {
    confirmToast('Are you sure you want to delete this product? This action cannot be undone.', async () => {
      setActionLoading(true);
      const res = await api.post(getDeletePath(id));
      setActionLoading(false);
      if (res?.success) {
        toastSuccess('product_delete_success', 'Product deleted successfully.');
        load();
      } else {
        toastError('product_delete_failed', res?.message || 'Failed to delete product.');
      }
    }, 'Delete');
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return products;
    if (filter === 'approved') return products.filter(p => ['approved', 'sold', 'rented', 'active'].includes(p.status));
    return products.filter((p) => p.status === filter);
  }, [products, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    c.pending  = products.filter(p => p.status === 'pending').length;
    c.approved = products.filter(p => ['approved', 'sold', 'rented', 'active'].includes(p.status)).length;
    c.rejected = products.filter(p => p.status === 'rejected').length;
    c.inactive = products.filter(p => p.status === 'inactive').length;
    return c;
  }, [products]);

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontWeight: 500, fontSize: 26, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Poppins' }}>
              My Products
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Manage all your uploaded products.</p>
          </div>
          <div className="d-flex gap-2">
            {isBlockedSeller ? (
              <button
                className="btn sa-filter-btn d-flex align-items-center gap-2"
                style={{ ...btnGold, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}
                disabled
                title="Your seller role is blocked"
              >
                <i className="bi bi-plus-circle"></i> Upload New Product
              </button>
            ) : (
              <Link href={uploadPath} className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold}>
                <i className="bi bi-plus-circle"></i> Upload New Product
              </Link>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="d-flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: 5 }}>
          {TABS.map((t) => {
            const tabLabel = t === 'approved' ? 'Live / Approved' : t.charAt(0).toUpperCase() + t.slice(1);
            const tabColor = t === 'pending' ? '#92400e' : t === 'rejected' ? '#dc2626' : t === 'inactive' ? '#6b7280' : undefined;
            const isActive = filter === t;
            return (
              <button key={t} className="btn" onClick={() => setFilter(t)}
                style={{
                  border: isActive ? 'none' : '1px solid #f0f0f0',
                  padding: '0.5rem 1.1rem', borderRadius: '0.5rem', fontWeight: 500,
                  whiteSpace: 'nowrap', fontSize: '0.85rem',
                  background: isActive ? (tabColor ? 'transparent' : '#ffc63a') : '#fff',
                  color: isActive ? (tabColor || '#fff') : '#677788',
                  boxShadow: isActive ? `0 0 0 2px ${tabColor || '#ffc63a'}` : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                }}>
                {tabLabel}
                <span className="badge rounded-pill ms-2" style={{
                  background: isActive ? (tabColor ? `${tabColor}22` : 'rgba(0,0,0,0.15)') : '#f1f2f4',
                  color: isActive ? (tabColor || '#fff') : '#677788',
                  fontSize: '0.7rem'
                }}>
                  {counts[t] || 0}
                </span>
              </button>
            );
          })}
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
                    <th style={thStyle}>Preview</th>
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
                          {/* Preview */}
                          <td style={tdStyle}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '8px', background: '#f6f6f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                            }}>
                              {getImageUrl(p.image) ? (
                                <img src={getImageUrl(p.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <i className="fa-regular fa-image" style={{ color: '#9ca3af' }}></i>
                              )}
                            </div>
                          </td>

                          {/* Product */}
                          <td style={tdStyle}>
                            <div style={productNameStyle}>{p.title}</div>
                            <div style={productIdStyle}>ID: {p.product_number || `#${p.id}`}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{p.category || '—'}</small>
                          </td>

                          {/* Type */}
                          <td style={tdStyle}>
                            <span className="badge" style={{ background: p.listing_type === 'sell' ? '#d1fae5' : '#fce7f3', color: p.listing_type === 'sell' ? '#065f46' : '#be185d', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', borderRadius: '9999px', padding: '3px 11px' }}>
                              {p.listing_type === 'rent' ? 'Rent' : 'Sell'}
                            </span>
                          </td>

                          {/* Price */}
                          <td style={tdStyle}>
                            <span style={priceValStyle}>
                              {p.listing_type === 'rent'
                                ? `₹${Number(p.rental_cost || 0).toFixed(0)}/day`
                                : `₹${Number(p.price || p.selling_price || p.original_price || 0).toFixed(0)}`
                              }
                            </span>
                          </td>

                          {/* Status */}
                          <td style={tdStyle}>
                            {(() => {
                              const rawStatus = p.status?.trim() || '';
                              const statusStyle = STATUS_COLORS[rawStatus] || { bg: '#f3f4f6', color: '#6b7280' };

                              const statusLabel = rawStatus
                                ? rawStatus.toUpperCase()
                                : 'UNKNOWN';

                              return (
                                <>
                                  <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, fontWeight: 700, padding: '3px 11px', borderRadius: '9999px', fontSize: '0.6rem', textTransform: 'uppercase' }}>
                                    {statusLabel}
                                  </span>
                                  {rawStatus === 'rejected' && p.admin_remarks && (
                                    <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 4, maxWidth: 150 }}>
                                      <i className="bi bi-info-circle me-1"></i>{p.admin_remarks}
                                    </div>
                                  )}
                                  {rawStatus === 'pending' && (
                                    <div style={{ fontSize: '0.65rem', color: '#92400e', marginTop: 3 }}>
                                      <i className="bi bi-hourglass-split me-1"></i>Awaiting approval
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>

                          {/* Views */}
                          <td style={{ ...tdStyle, color: '#374151', fontWeight: 500, fontSize: '0.82rem' }}>{p.views_count || '0'}</td>

                          {/* Offers */}
                          <td style={{ ...tdStyle, color: '#374151', fontWeight: 500, fontSize: '0.82rem' }}>
                            {Number(p.offer_count) > 0 ? (
                              <span>{p.offer_count} offers</span>
                            ) : (
                              <span className="text-muted">No offers</span>
                            )}
                          </td>

                          {/* Images */}
                          <td style={{ ...tdStyle, color: '#374151', fontWeight: 500, fontSize: '0.82rem' }}>{p.image_count || '0'}</td>

                          {/* Uploaded */}
                          <td style={tdStyle}>
                            <span style={dateValStyle}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </td>

                          {/* Actions */}
                          <td style={{ ...tdStyle, textAlign: 'end' }}>
                            <div className="d-flex gap-1 justify-content-end">
                              <Link
                                href={`/buyer/product/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.id}?preview=true`}
                                className="btn btn-sm border-gold! text-gold! hover:bg-gold! hover:text-white!"
                                style={{ borderRadius: 8 }}
                                target="_blank"
                              >
                                <i className="bi bi-eye"></i> View
                              </Link>
                              {isBlockedSeller ? (
                                <button className="btn btn-sm" style={{ borderRadius: 8, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed', border: 'none' }} disabled title="Your seller role is blocked">
                                  <i className="bi bi-pencil me-1"></i> Edit
                                </button>
                              ) : (
                                <Link href={`/${role === 'super_admin' ? 'superadmin' : role}/upload-product?edit=${p.id}`} className="btn btn-sm border-[#008080]! text-[#008080]! hover:bg-[#008080]! hover:text-white!" style={{ borderRadius: 8 }}>
                                  <i className="bi bi-pencil me-1"></i> Edit
                                </Link>
                              )}
                              <button className="btn btn-sm border-[#ef4444]! text-[#ef4444]! hover:bg-[#ef4444]! hover:text-white!" style={{ borderRadius: 8 }} onClick={() => handleDelete(p.id)}>
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
                {isBlockedSeller ? (
                  <button
                    className="btn mt-3 sa-filter-btn"
                    style={{ ...btnGold, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}
                    disabled
                    title="Your seller role is blocked"
                  >
                    <i className="bi bi-upload me-2"></i> Upload Your First Product
                  </button>
                ) : (
                  <Link href={uploadPath} className="btn mt-3 sa-filter-btn" style={btnGold}>
                    <i className="bi bi-upload me-2"></i> Upload Your First Product
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal removed in favor of confirmToast */}
    </DashboardLayout>
  );
}
