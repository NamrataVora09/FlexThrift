'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  product_id: number;
  product_title: string;
  product_name?: string;
  primary_image?: string;
  listing_type: string;
  order_type: string;
  final_price: string;
  status: string;
  created_at: string;
  seller_name?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  can_review?: boolean;
  review?: { rating: number; comment: string };
}

const statusFilters = ['all', 'pending', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled'];

function MyOrdersInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{ orderId: number; title: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Order[]>('/buyer/my-orders').then((r) => {
      if (r.success && r.data) setOrders(r.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const successMsg = searchParams.get('success');
    if (successMsg) {
      toast.success(decodeURIComponent(successMsg));
      // Clean up URL without re-render
      window.history.replaceState({}, '', '/buyer/my-orders');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() =>
    filter === 'all' ? orders : orders.filter((o) => o.status === filter),
    [orders, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    statusFilters.forEach(s => {
      if (s !== 'all') c[s] = orders.filter(o => o.status === s).length;
    });
    return c;
  }, [orders]);

  const handlePay = async (orderId: number) => {
    setActionLoading(orderId);
    const callbackUrl = `${window.location.origin}/buyer/order-payment-callback?id={id}`;
    const res = await api.post<{ redirect_url: string; merchant_order_id: string }>(
      '/buyer/initiate-order-payment',
      { order_id: orderId, callback_url: callbackUrl }
    );
    setActionLoading(null);
    if (res?.success && res.data?.redirect_url) {
      window.location.href = res.data.redirect_url;
    } else {
      toast.error(res?.message || 'Failed to initiate payment. Please try again.');
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    const res = await api.post('/buyer/submit-review', {
      order_id: reviewModal.orderId,
      rating: 5,
      comment: '',
    });
    setReviewLoading(false);
    if (res?.success) {
      setReviewModal(null);
      setRating(0);
      setReviewComment('');
      toast.success('Reward sent successfully!');
      load();
    } else {
      toast.error(res?.message || 'Failed to submit review');
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const pillClass = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#f8f9fa', color: '#666', border: '1px solid #eee' };
      case 'confirmed': return { background: '#eaffea', color: '#1a8a1a', border: '1px solid #c9f9c9' };
      case 'paid': return { background: '#eaffea', color: '#1a8a1a', border: '1px solid #c9f9c9' };
      case 'delivered':
      case 'completed': return { background: '#ffc63a', color: '#000', border: '1px solid #ffdb7e' };
      case 'cancelled': return { background: '#fff5f5', color: '#d63031', border: '1px solid #ffeaea' };
      case 'dispatched': return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      default: return { background: '#f8f9fa', color: '#666', border: '1px solid #eee' };
    }
  };

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .luxury-item-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #eee;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }
        .luxury-item-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border-color: #ffc63a;
        }
        .item-img {
          width: 100px;
          height: 125px;
          object-fit: cover;
          border-radius: 12px;
        }
        .status-pill {
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .price-badge {
          font-size: 1.5rem;
          font-weight: 800;
          color: #000;
        }
        .btn-action {
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 700;
          transition: 0.2s;
          border: none;
          cursor: pointer;
        }
        .btn-pay {
          background: #000;
          color: white;
        }
        .btn-pay:hover {
          background: #333;
          color: #ffc63a;
        }
        .btn-review {
          background: #ffc63a;
          color: #000;
        }
        .btn-review:hover {
          background: #000;
          color: #ffc63a;
        }
        .no-data {
          padding: 80px 0;
          text-align: center;
          background: white;
          border-radius: 20px;
          border: 1px solid #eee;
        }
        .rating-stars {
          color: #ffc63a;
        }
        .filter-pill {
          padding: 8px 18px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #eee;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: capitalize;
        }
        .filter-pill:hover {
          border-color: #ffc63a;
        }
        .filter-pill.active {
          background: #000;
          color: white;
          border-color: #000;
        }
      `}</style>

      <div className="container-fluid px-md-4">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h1 className="fw-bold mb-1">My Orders</h1>
            <p className="text-muted mb-0">Track your purchases and rentals across the platform.</p>
          </div>
          <Link href="/buyer/browse" className="btn btn-dark rounded-pill px-4">
            Browse Market
          </Link>
        </div>

        {/* Status Filters */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          {statusFilters.map((s) => (
            <button
              key={s}
              className={`filter-pill ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s} {counts[s] ? `(${counts[s]})` : '(0)'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="no-data shadow-sm">
            <i className="bi bi-box-seam" style={{ fontSize: '6rem', opacity: 0.1 }}></i>
            <h3 className="mt-3">No orders yet</h3>
            <p className="text-muted">Start exploring to find something you love!</p>
          </div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="luxury-item-card shadow-sm">
              <div className="row align-items-center">
                <div className="col-auto">
                  <img
                    src={o.primary_image ? `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/${o.primary_image}` : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'}
                    className="item-img"
                    alt={o.product_title || o.product_name || 'Product'}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=120&h=120&fit=crop'; }}
                  />
                </div>
                <div className="col px-md-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="fw-bold mb-1">{o.product_title || o.product_name || 'Product'}</h5>
                      <small className="text-muted d-block mb-1">
                        #ORDER-{String(o.id).padStart(6, '0')} &bull; {(o.order_type || o.listing_type || '').charAt(0).toUpperCase() + (o.order_type || o.listing_type || '').slice(1)}
                      </small>
                      <small className="text-muted">
                        Seller: <strong>{o.seller_name || 'N/A'}</strong>
                      </small>
                    </div>
                    <span className="status-pill" style={pillClass(o.status)}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="bg-light p-3 rounded-4 mt-2">
                    <div className="row text-center text-md-start align-items-center">
                      <div className="col-md-4 border-end">
                        <small className="text-muted d-block">TOTAL AMOUNT</small>
                        <span className="price-badge">
                          {'\u20B9'}{Number(o.final_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="col-md-8 ps-md-4">
                        <p className="mb-0 small fw-bold text-muted">
                          <i className="bi bi-clock-history me-1 text-primary"></i>
                          Ordered on {formatDate(o.created_at)}
                        </p>
                        {(o.order_type === 'rent' || o.listing_type === 'rent') && o.rental_start_date && (
                          <p className="mb-0 small text-muted mt-1">
                            <i className="bi bi-calendar-range me-1"></i>
                            Rental: {formatDate(o.rental_start_date)} to {formatDate(o.rental_end_date || '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 text-end">
                  <div className="d-grid gap-2">
                    {o.status === 'pending' && (
                      <button
                        className="btn btn-action btn-pay"
                        disabled={actionLoading === o.id}
                        onClick={() => handlePay(o.id)}
                      >
                        {actionLoading === o.id ? (
                          <span className="spinner-border spinner-border-sm me-1"></span>
                        ) : (
                          <i className="bi bi-credit-card me-1"></i>
                        )}
                        Pay Now
                      </button>
                    )}
                    {o.can_review && (
                      <button
                        className="btn btn-action btn-review"
                        onClick={() => {
                          setReviewModal({ orderId: o.id, title: o.product_title || o.product_name || 'Product' });
                          setRating(0);
                          setReviewComment('');
                        }}
                      >
                        <i className="bi bi-star-fill me-1"></i> Review
                      </button>
                    )}
                    {o.review && (
                      <div className="text-center">
                        <div className="rating-stars mb-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <i key={i} className={`bi bi-star${i <= o.review!.rating ? '-fill' : ''}`}></i>
                          ))}
                        </div>
                        <span className="badge bg-light text-muted border">Reviewed</span>
                      </div>
                    )}
                    <Link href={`/buyer/order/${o.id}`} className="btn btn-light rounded-pill border py-2">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          onClick={() => setReviewModal(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '32px' }}>
              <div className="modal-header border-0 pb-0">
                <button type="button" className="btn-close" onClick={() => setReviewModal(null)}></button>
              </div>
              <div className="modal-body p-4 pt-0 text-center">
                <div
                  className="d-inline-flex p-3 mb-3"
                  style={{ background: 'rgba(255,198,58,0.1)', borderRadius: '50%' }}
                >
                  <i className="bi bi-star-fill" style={{ fontSize: '2rem', color: '#ffc63a' }}></i>
                </div>
                <h4 className="fw-bold">Reward Seller</h4>
                <p className="text-muted">You are about to give <strong>+1 Point</strong> to the seller for <strong>{reviewModal.title}</strong>.</p>
                <div className="h5 fw-bold mb-0 mt-3">
                  Give +1 Point!
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0 d-grid">
                <button
                  className="btn btn-dark rounded-pill py-3 fw-bold"
                  onClick={handleReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? 'Submitting...' : 'Yes, Give Point'}
                </button>
                <button className="btn btn-link text-muted mt-2 small text-decoration-none" onClick={() => setReviewModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner-border text-warning" /></div>}>
      <MyOrdersInner />
    </Suspense>
  );
}
