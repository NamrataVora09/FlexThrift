'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Product {
  id: number; title: string; listing_type: string; original_price: string;
  selling_price?: string; rental_cost?: string; seller_name: string;
  seller_rating_avg?: string; image?: string; status: string;
  is_featured?: number | string;
}

interface BrowseData {
  products: Product[];
  categories: Array<{ id: number; name: string }>;
  pagination: { page: number; total: number; total_pages: number };
}

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

export default function BrowseClient() {
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState('');
  const [page, setPage] = useState(1);

  const load = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (search) params.set('search', search);
    if (listingType) params.set('listing_type', listingType);

    api.get<BrowseData>(`/buyer/browse?${params}`).then((r) => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(page); }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1); };

  const toggleFeatured = async (productId: number) => {
    const res = await api.post<{ is_featured: number }>(`/superadmin/toggle-featured/${productId}`);
    if (res.success && data) {
      setData({
        ...data,
        products: data.products.map((p) =>
          p.id === productId ? { ...p, is_featured: res.data?.is_featured ?? (Number(p.is_featured) ? 0 : 1) } : p
        ),
      });
    }
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-shop-window" style={{ color: '#ffc63a' }}></i> Browse Marketplace
          </h1>
          <p className="text-muted small">View all approved products listed by sellers on the platform.</p>
        </div>

        {/* Search & Filters */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', padding: '1.25rem 1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSearch} className="row g-3 align-items-end">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRight: 0, color: '#999' }}><i className="bi bi-search"></i></span>
                <input className="form-control shadow-none" style={{ ...inputStyle, borderLeft: 0, borderRadius: '0 0.5rem 0.5rem 0' }} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select shadow-none" style={inputStyle} value={listingType} onChange={(e) => setListingType(e.target.value)}>
                <option value="">All Types</option>
                <option value="sell">Buy</option>
                <option value="rent">Rent</option>
              </select>
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-search me-1"></i> Search</button>
            </div>
            <div className="col-md-2">
              <button type="button" className="btn w-100 sa-filter-reset-btn" onClick={() => { setSearch(''); setListingType(''); setPage(1); setTimeout(() => load(1), 0); }}
                style={{ background: '#fff', color: '#677788', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #e7eaf3', padding: '0.6rem 1rem' }}>
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
        ) : (
          <>
            <div className="row">
              {data?.products && data.products.length > 0 ? data.products.map((p) => (
                <div key={p.id} className="col-md-6 col-lg-4 col-xl-3 mb-4">
                  <div className="card h-100 border-0" style={{ borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', overflow: 'hidden', transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    {/* Image */}
                    <div style={{ height: 200, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {p.image ? (
                        <img src={`http://localhost:8080/${p.image}`} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className="bi bi-image" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>
                      )}
                      <span style={{ position: 'absolute', top: 10, right: 10, padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, color: '#fff', background: p.listing_type === 'rent' ? '#0dcaf0' : '#ffc63a' }}>
                        {p.listing_type === 'rent' ? 'RENT' : 'BUY'}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFeatured(p.id); }}
                        title={Number(p.is_featured) ? 'Remove from Featured' : 'Mark as Featured'}
                        style={{
                          position: 'absolute', top: 10, left: 10, width: 36, height: 36,
                          borderRadius: '50%', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: Number(p.is_featured) ? '#ffc63a' : 'rgba(255,255,255,0.9)',
                          color: Number(p.is_featured) ? '#000' : '#999',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '1rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className={`bi bi-star${Number(p.is_featured) ? '-fill' : ''}`}></i>
                      </button>
                    </div>

                    {/* Body */}
                    <div className="card-body" style={{ padding: '1.25rem' }}>
                      <h6 className="fw-bold mb-1 text-truncate">{p.title}</h6>
                      <p className="text-muted small mb-2">by {p.seller_name}</p>
                      {p.seller_rating_avg && Number(p.seller_rating_avg) > 0 && (
                        <div className="mb-2" style={{ fontSize: '0.75rem' }}>
                          {[1, 2, 3, 4, 5].map(i => <i key={i} className={`bi bi-star${i <= Math.round(Number(p.seller_rating_avg)) ? '-fill' : ''}`} style={{ color: i <= Math.round(Number(p.seller_rating_avg)) ? '#f59e0b' : '#cbd5e1' }}></i>)}
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold" style={{ color: '#ffc63a', fontSize: '1.1rem' }}>
                          ₹{Number(p.selling_price || p.rental_cost || p.original_price || 0).toLocaleString()}
                        </span>
                        {p.listing_type === 'rent' && <small className="text-muted">/day</small>}
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '0 1.25rem 1.25rem' }}>
                      <Link href={`/superadmin/browse/${p.id}`} className="btn w-100 sa-filter-btn" style={{ ...btnGold, padding: '0.5rem', fontSize: '0.85rem' }}>
                        <i className="bi bi-eye me-1"></i> View Details
                      </Link>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-12 text-center py-5">
                  <i className="bi bi-search" style={{ fontSize: '3rem', color: '#ddd' }}></i>
                  <p className="text-muted mt-3">No products found matching your search.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.pagination && data.pagination.total_pages > 1 && (
              <nav className="mt-3">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left"></i></button>
                  </li>
                  {Array.from({ length: data.pagination.total_pages }, (_, i) => (
                    <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(i + 1)}
                        style={page === i + 1 ? { background: '#ffc63a', borderColor: '#ffc63a', color: '#212529' } : {}}>
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${page === data.pagination.total_pages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right"></i></button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
