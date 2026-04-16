'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace('/api/v1', '');

interface StatusHistory {
  id: number;
  status: string;
  remarks?: string;
  created_at: string;
}

interface Order {
  id: number;
  product_title: string;
  product_description?: string;
  listing_type: string;
  order_type: string;
  final_price: string;
  deposit_amount?: string;
  status: string;
  payment_status: string;
  created_at: string;
  dispatched_at?: string;
  delivery_photo?: string;
  delivery_address?: string;
  delivery_pin_code?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  seller_name?: string;
  seller_mobile?: string;
  primary_image?: string;
}

interface Review {
  rating: number;
  comment: string;
}

const pillClass = (status: string): React.CSSProperties => {
  switch (status) {
    case 'pending':    return { background: '#f8f9fa', color: '#666', border: '1px solid #eee' };
    case 'confirmed':  return { background: '#eaffea', color: '#1a8a1a', border: '1px solid #c9f9c9' };
    case 'dispatched': return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
    case 'delivered':
    case 'completed':  return { background: '#ffc63a', color: '#000', border: '1px solid #ffdb7e' };
    case 'cancelled':  return { background: '#fff5f5', color: '#d63031', border: '1px solid #ffeaea' };
    default:           return { background: '#f8f9fa', color: '#666', border: '1px solid #eee' };
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'pending':    return 'bi-clock';
    case 'confirmed':  return 'bi-check-circle';
    case 'dispatched': return 'bi-truck';
    case 'delivered':  return 'bi-box-seam';
    case 'completed':  return 'bi-patch-check';
    case 'cancelled':  return 'bi-x-circle';
    default:           return 'bi-circle';
  }
};

const fmt = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ order: Order; status_history: StatusHistory[]; review: Review | null }>(`/buyer/order/${orderId}`)
      .then((r) => {
        if (r.success && r.data) {
          setOrder(r.data.order);
          setHistory(r.data.status_history || []);
          setReview(r.data.review || null);
        }
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [orderId]);

  const handleSubmitReview = async () => {
    setReviewLoading(true);
    const res = await api.post('/buyer/submit-review', { order_id: Number(orderId), rating: 5, comment: '' });
    setReviewLoading(false);
    if (res?.success) {
      setShowReview(false);
      setRating(0);
      setReviewComment('');
      toast.success('Reward sent successfully!');
      load();
    } else {
      toast.error(res?.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
        <div className="container text-center py-5">
          <i className="bi bi-exclamation-circle" style={{ fontSize: '4rem', color: '#d63031' }}></i>
          <h3 className="mt-3">Order not found</h3>
          <button className="btn btn-dark mt-3 rounded-pill px-4" onClick={() => router.push('/buyer/my-orders')}>
            Back to Orders
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isRental = order.order_type === 'rent' || order.listing_type === 'rent';

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .detail-card {
          background: white;
          border-radius: 20px;
          border: 1px solid #eee;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .detail-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f0f0f0;
          font-weight: 700;
          font-size: 0.9rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-card-body {
          padding: 24px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f8f8f8;
          font-size: 0.9rem;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #888; }
        .info-value { font-weight: 600; color: #111; }
        .timeline-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #ffc63a; flex-shrink: 0; margin-top: 5px;
        }
        .status-pill {
          padding: 6px 14px; border-radius: 50px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.5px;
          display: inline-block;
        }
      `}</style>

      <div className="container-fluid px-md-4">
        {/* Back button + Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-light rounded-pill border px-3" onClick={() => router.push('/buyer/my-orders')}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>
          <div>
            <h1 className="fw-bold mb-0" style={{ fontSize: '1.5rem' }}>{order.product_title}</h1>
            <small className="text-muted">
              {isRental ? 'Rental' : 'Purchase'} &bull; Ordered {fmt(order.created_at)}
            </small>
          </div>
          <span className="ms-auto status-pill" style={pillClass(order.status)}>
            <i className={`bi ${statusIcon(order.status)} me-1`}></i>
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="row g-4">
          {/* Left column */}
          <div className="col-lg-8">
            {/* Product Info */}
            <div className="detail-card shadow-sm">
              <div className="detail-card-body">
                <div className="d-flex gap-4">
                  <img
                    src={order.primary_image ? `${BASE_URL}/${order.primary_image}` : 'https://via.placeholder.com/120x150?text=No+Image'}
                    alt={order.product_title}
                    style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120x150?text=No+Image'; }}
                  />
                  <div className="flex-grow-1">
                    <h4 className="fw-bold mb-1">{order.product_title}</h4>
                    <span className={`badge me-2 ${isRental ? 'bg-primary' : 'bg-dark'}`}>
                      {isRental ? 'Rental' : 'Sale'}
                    </span>
                    <span className="badge" style={{ background: order.payment_status === 'paid' ? '#eaffea' : '#fff8e1', color: order.payment_status === 'paid' ? '#1a8a1a' : '#b45309', border: '1px solid', borderColor: order.payment_status === 'paid' ? '#c9f9c9' : '#fde68a' }}>
                      {order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                    </span>
                    {order.product_description && (
                      <p className="text-muted small mt-2 mb-0" style={{ lineHeight: 1.6 }}>
                        {order.product_description.slice(0, 200)}{order.product_description.length > 200 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="detail-card shadow-sm">
              <div className="detail-card-header">Order Details</div>
              <div className="detail-card-body">
                <div className="info-row">
                  <span className="info-label">Order Amount</span>
                  <span className="info-value" style={{ fontSize: '1.2rem', color: '#000' }}>
                    ₹{Number(order.final_price).toLocaleString('en-IN')}
                  </span>
                </div>
                {order.deposit_amount && Number(order.deposit_amount) > 0 && (
                  <div className="info-row">
                    <span className="info-label">Deposit Amount</span>
                    <span className="info-value">₹{Number(order.deposit_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {isRental && order.rental_start_date && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Rental Start</span>
                      <span className="info-value">{fmt(order.rental_start_date)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Rental End</span>
                      <span className="info-value">{fmt(order.rental_end_date)}</span>
                    </div>
                  </>
                )}
                {order.delivery_address && (
                  <div className="info-row">
                    <span className="info-label">Delivery Address</span>
                    <span className="info-value text-end" style={{ maxWidth: '60%' }}>
                      {order.delivery_address}{order.delivery_pin_code ? ` — ${order.delivery_pin_code}` : ''}
                    </span>
                  </div>
                )}
                {order.dispatched_at && (
                  <div className="info-row">
                    <span className="info-label">Dispatched On</span>
                    <span className="info-value">{fmt(order.dispatched_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            {history.length > 0 && (
              <div className="detail-card shadow-sm">
                <div className="detail-card-header">Order Timeline</div>
                <div className="detail-card-body">
                  {history.map((h, idx) => (
                    <div key={h.id} className="d-flex gap-3 mb-3">
                      <div className="d-flex flex-column align-items-center">
                        <div className="timeline-dot"></div>
                        {idx < history.length - 1 && (
                          <div style={{ width: 2, flexGrow: 1, background: '#f0f0f0', margin: '4px 0' }}></div>
                        )}
                      </div>
                      <div className="pb-2">
                        <span className="fw-bold text-capitalize">{h.status.replace(/_/g, ' ')}</span>
                        {h.remarks && <p className="text-muted small mb-0">{h.remarks}</p>}
                        <small className="text-muted">{new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="col-lg-4">
            {/* Seller Info */}
            <div className="detail-card shadow-sm">
              <div className="detail-card-header">Seller</div>
              <div className="detail-card-body">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-person" style={{ fontSize: '1.2rem', color: '#888' }}></i>
                  </div>
                  <div>
                    <div className="fw-bold">{order.seller_name || 'Seller'}</div>
                    {order.seller_mobile && <small className="text-muted">{order.seller_mobile}</small>}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Photo */}
            {order.delivery_photo && (
              <div className="detail-card shadow-sm">
                <div className="detail-card-header">Delivery Confirmation</div>
                <div className="detail-card-body text-center">
                  <img
                    src={`${BASE_URL}/${order.delivery_photo}`}
                    alt="Delivery proof"
                    style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <small className="text-muted d-block mt-2">Delivery photograph uploaded by seller</small>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="detail-card shadow-sm">
              <div className="detail-card-header">Actions</div>
              <div className="detail-card-body d-grid gap-2">
                {order.status === 'dispatched' && (
                  <p className="text-muted small text-center mb-0">
                    <i className="bi bi-truck me-1"></i>Order is on the way. The seller will confirm delivery.
                  </p>
                )}
                {order.status === 'delivered' && !review && (
                  <button
                    className="btn fw-bold py-3"
                    style={{ background: '#ffc63a', color: '#000', borderRadius: 12 }}
                    onClick={() => setShowReview(true)}
                  >
                    <i className="bi bi-star-fill me-2"></i>Write a Review
                  </button>
                )}
                {review && (
                  <div className="text-center p-3" style={{ background: '#f8f9fa', borderRadius: 12 }}>
                    <div style={{ color: '#ffc63a', fontSize: '1.2rem' }}>
                      {[1,2,3,4,5].map(i => (
                        <i key={i} className={`bi bi-star${i <= review.rating ? '-fill' : ''}`}></i>
                      ))}
                    </div>
                    <small className="text-muted d-block mt-1">You reviewed this order</small>
                  </div>
                )}
                {order.status === 'cancelled' && (
                  <p className="text-muted small text-center mb-0">This order was cancelled</p>
                )}
                {!['dispatched','delivered','completed','cancelled'].includes(order.status) && !review && (
                  <p className="text-muted small text-center mb-0">No actions available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowReview(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '2rem' }}>
              <div className="modal-header border-0 pb-0">
                <button type="button" className="btn-close" onClick={() => setShowReview(false)}></button>
              </div>
              <div className="modal-body p-4 pt-0 text-center">
                <div className="d-inline-flex p-3 mb-3" style={{ background: 'rgba(255,198,58,0.15)', borderRadius: '50%' }}>
                  <i className="bi bi-star-fill" style={{ fontSize: '2rem', color: '#ffc63a' }}></i>
                </div>
                <h4 className="fw-bold">Reward Seller</h4>
                <p className="text-muted">You are about to give <strong>+1 Point</strong> to the seller for <strong>{order.product_title}</strong>.</p>
                <div className="h5 fw-bold mb-0 mt-3">
                  Give +1 Point!
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0 d-grid">
                <button
                  className="btn btn-dark rounded-pill py-3 fw-bold"
                  onClick={handleSubmitReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? 'Submitting...' : 'Yes, Give Point'}
                </button>
                <button className="btn btn-link text-muted mt-2 small text-decoration-none" onClick={() => setShowReview(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
