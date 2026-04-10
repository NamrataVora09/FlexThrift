'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Product {
  id: number; title: string; description: string; listing_type: string;
  original_price: string; selling_price: string; price: string;
  rental_cost: string; rental_deposit: string;
  brand: string; color: string; size: string; gender: string;
  condition_description: string; times_used: string; used_times: string;
  category: string; dispatch_address: string; dispatch_city: string;
  dispatch_state: string; dispatch_pin_code: string;
  seller_name: string; seller_email: string; seller_mobile: string;
  seller_rating_avg: string; seller_rating_count: string; status: string;
  is_featured?: number | string;
}
interface ProductImage { id: number; image_path: string; }
interface DetailData { product: Product; images: ProductImage[]; }

const BASE = 'http://localhost:8080';

export default function SAProductDetailClient() {
  const params = useParams();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (params.id) {
      api.get<DetailData>(`/buyer/product/${params.id}`).then((r) => {
        if (r.success && r.data) setData(r.data);
        setLoading(false);
      });
    }
  }, [params.id]);

  if (loading) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  if (!data) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid text-center py-5">
        <i className="bi bi-exclamation-circle" style={{ fontSize: '3rem', color: '#ddd' }}></i>
        <p className="text-muted mt-3">Product not found</p>
        <Link href="/superadmin/browse" className="btn" style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, borderRadius: '0.5rem' }}>Back to Browse</Link>
      </div>
    </DashboardLayout>
  );

  const [product, setProduct] = useState(data.product);
  const p = product;
  const images = data.images;
  const usedTimes = p.used_times || p.times_used || '0';
  const price = p.selling_price || p.price || p.original_price;

  const toggleFeatured = async () => {
    const res = await api.post<{ is_featured: number }>(`/superadmin/toggle-featured/${p.id}`);
    if (res.success) {
      setProduct({ ...p, is_featured: res.data?.is_featured ?? (Number(p.is_featured) ? 0 : 1) });
    }
  };

  const renderStars = (avg: number, count: number) => (
    <span style={{ fontSize: '0.85rem' }}>
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={`bi bi-star${i <= Math.round(avg) ? '-fill' : ''}`} style={{ color: i <= Math.round(avg) ? '#f59e0b' : '#cbd5e1' }}></i>)}
      <span className="text-muted ms-1">({count} reviews)</span>
    </span>
  );

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Back button */}
        <Link href="/superadmin/browse" className="btn btn-light border mb-4" style={{ borderRadius: 8 }}>
          <i className="bi bi-arrow-left me-2"></i>Back to Browse
        </Link>

        <div className="row g-4">
          {/* Left: Images */}
          <div className="col-md-6">
            <div className="card border-0" style={{ borderRadius: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ background: '#f1f5f9', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {images.length > 0 ? (
                  <img src={`${BASE}/${images[imgIdx]?.image_path}`} alt={p.title} style={{ maxWidth: '100%', maxHeight: 450, objectFit: 'contain' }} />
                ) : (
                  <div className="text-center py-5"><i className="bi bi-image" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i><p className="text-muted mt-2">No images</p></div>
                )}
                {/* Listing type badge */}
                <span style={{ position: 'absolute', top: 15, left: 15, padding: '6px 16px', borderRadius: 20, fontWeight: 600, fontSize: '0.75rem', color: '#fff', background: p.listing_type === 'rent' ? '#0dcaf0' : '#ffc63a' }}>
                  {p.listing_type === 'rent' ? 'RENT' : 'SELL'}
                </span>
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="d-flex gap-2 p-3" style={{ overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <div key={img.id} onClick={() => setImgIdx(i)} style={{ width: 70, height: 70, borderRadius: 8, overflow: 'hidden', border: imgIdx === i ? '2px solid #ffc63a' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }}>
                      <img src={`${BASE}/${img.image_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="col-md-6">
            <div className="card border-0" style={{ borderRadius: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
              <div className="card-body" style={{ padding: '2rem' }}>
                {/* Status */}
                <div className="d-flex gap-2 mb-3 align-items-center">
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: '0.75rem', background: p.listing_type === 'rent' ? 'rgba(13,202,240,0.1)' : 'rgba(255,198,58,0.1)', color: p.listing_type === 'rent' ? '#0dcaf0' : '#ffc63a' }}>
                    {p.listing_type?.toUpperCase()}
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: '0.75rem', background: p.status === 'approved' ? '#d1e7dd' : p.status === 'rejected' ? '#f8d7da' : '#fff3cd', color: p.status === 'approved' ? '#0f5132' : p.status === 'rejected' ? '#842029' : '#856404' }}>
                    {p.status?.charAt(0).toUpperCase() + p.status?.slice(1)}
                  </span>
                  <button
                    onClick={toggleFeatured}
                    style={{
                      padding: '4px 14px', borderRadius: 20, fontWeight: 600, fontSize: '0.75rem',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      background: Number(p.is_featured) ? 'rgba(255,198,58,0.2)' : '#f1f5f9',
                      color: Number(p.is_featured) ? '#b8860b' : '#677788',
                      transition: 'all 0.2s',
                    }}
                  >
                    <i className={`bi bi-star${Number(p.is_featured) ? '-fill' : ''}`}></i>
                    {Number(p.is_featured) ? 'Featured' : 'Mark Featured'}
                  </button>
                </div>

                <h2 className="fw-bold mb-2" style={{ fontSize: '1.5rem' }}>{p.title}</h2>
                {p.category && <span className="text-muted small"><i className="bi bi-tag me-1"></i>{p.category}</span>}

                <p className="text-muted mt-3 mb-3" style={{ lineHeight: 1.7 }}>{p.description}</p>

                <hr />

                {/* Pricing */}
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <small className="text-muted d-block mb-1">Original Price</small>
                    <h5 className="fw-bold mb-0">₹{Number(p.original_price || 0).toLocaleString()}</h5>
                  </div>
                  {p.listing_type === 'sell' && (
                    <div className="col-6">
                      <small className="text-muted d-block mb-1">Selling Price</small>
                      <h5 className="fw-bold mb-0" style={{ color: '#ffc63a' }}>₹{Number(price || 0).toLocaleString()}</h5>
                    </div>
                  )}
                  {p.listing_type === 'rent' && (
                    <>
                      <div className="col-6">
                        <small className="text-muted d-block mb-1">Rental / Day</small>
                        <h5 className="fw-bold mb-0" style={{ color: '#ffc63a' }}>₹{Number(p.rental_cost || 0).toLocaleString()}</h5>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block mb-1">Deposit</small>
                        <h5 className="fw-bold mb-0">₹{Number(p.rental_deposit || 0).toLocaleString()}</h5>
                      </div>
                    </>
                  )}
                </div>

                <hr />

                {/* Specs */}
                <div className="row g-3 mb-3">
                  {p.brand && <div className="col-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>BRAND</small><div className="fw-bold small">{p.brand}</div></div></div>}
                  {p.color && <div className="col-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>COLOR</small><div className="fw-bold small">{p.color}</div></div></div>}
                  {p.size && <div className="col-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>SIZE</small><div className="fw-bold small">{p.size}</div></div></div>}
                  <div className="col-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>TIMES USED</small><div className="fw-bold small">{usedTimes}</div></div></div>
                  {p.gender && <div className="col-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>GENDER</small><div className="fw-bold small">{p.gender}</div></div></div>}
                </div>

                {p.condition_description && (<><small className="text-muted d-block mb-1">Condition</small><p className="small mb-3">{p.condition_description}</p></>)}

                {/* Dispatch */}
                {(p.dispatch_address || p.dispatch_city) && (
                  <>
                    <hr />
                    <h6 className="fw-bold mb-2"><i className="bi bi-geo-alt me-1" style={{ color: '#ffc63a' }}></i>Dispatch Location</h6>
                    <p className="small text-muted mb-0">
                      {p.dispatch_address && <>{p.dispatch_address}<br /></>}
                      {p.dispatch_city}{p.dispatch_state ? `, ${p.dispatch_state}` : ''}{p.dispatch_pin_code ? ` - ${p.dispatch_pin_code}` : ''}
                    </p>
                  </>
                )}

                <hr />

                {/* Seller */}
                <h6 className="fw-bold mb-3"><i className="bi bi-person-circle me-1" style={{ color: '#ffc63a' }}></i>Seller Info</h6>
                <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '15px 20px' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#ffc63a', color: '#212529', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                      {p.seller_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{p.seller_name}</div>
                      <div className="text-muted small"><i className="bi bi-envelope me-1"></i>{p.seller_email}</div>
                      {p.seller_mobile && <div className="text-muted small"><i className="bi bi-phone me-1"></i>{p.seller_mobile}</div>}
                    </div>
                  </div>
                  <div className="mt-2">{renderStars(Number(p.seller_rating_avg || 0), Number(p.seller_rating_count || 0))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
