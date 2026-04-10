'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column } from './DataTable';
import StatusFilter from './StatusFilter';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace('/api/v1', '');

interface Order {
  id: number; product_title: string; listing_type: string;
  final_price: string; status: string; payment_status: string; created_at: string;
  order_type: string; delivery_address: string;
  seller_name?: string; buyer_name?: string;
  rental_start_date?: string; rental_end_date?: string;
  primary_image?: string;
}

interface Props {
  role: string;
  apiPath: string;
  perspective: 'buyer' | 'seller';
}

export default function OrdersView({ role, apiPath, perspective }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<{ orderId: number; title: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Seller confirm delivery modal
  const [deliveryModal, setDeliveryModal] = useState<{ orderId: number } | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Order[]>(apiPath).then((r) => {
      if (r.success && r.data) setOrders(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [apiPath]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    ['pending', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled'].forEach(s => {
      c[s] = orders.filter(o => o.status === s).length;
    });
    return c;
  }, [orders]);

  const handleAction = (orderId: number, action: string) => {
    confirmToast(`Are you sure you want to ${action.replace('-', ' ')} this order?`, async () => {
      setActionLoading(orderId);
      let res;
      switch (action) {
        case 'cancel':
          res = await api.post(`/buyer/cancel-order/${orderId}`);
          break;
        case 'dispatch':
          res = await api.post(`/seller/mark-dispatched/${orderId}`);
          break;
        default:
          res = { success: false, message: 'Unknown action' };
      }
      setActionLoading(null);
      if (res?.success) {
        toast.success(`Order ${action.replace('-', ' ')}ed!`);
        load();
      } else {
        toast.error(res?.message || 'Action failed');
      }
    }, action === 'cancel' ? 'Confirm Cancel' : 'Confirm Action');
  };

  const handleSellerConfirmDelivery = async () => {
    if (!deliveryModal || !deliveryPhoto) return;
    setDeliveryLoading(true);
    const fd = new FormData();
    fd.append('delivery_photo', deliveryPhoto);
    const res = await api.upload(`/seller/confirm-delivery/${deliveryModal.orderId}`, fd);
    setDeliveryLoading(false);
    if (res?.success) {
      setDeliveryModal(null);
      setDeliveryPhoto(null);
      toast.success('Delivery confirmed!');
      load();
    } else {
      toast.error(res?.message || 'Failed to confirm delivery');
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    const res = await api.post('/buyer/submit-review', {
      order_id: reviewModal.orderId,
      rating,
      comment: reviewComment,
    });
    setReviewLoading(false);
    if (res?.success) {
      setReviewModal(null);
      setRating(5);
      setReviewComment('');
      toast.success('Review submitted!');
      load();
    } else {
      toast.error(res?.message || 'Failed to submit review');
    }
  };

  const counterpartyLabel = perspective === 'buyer' ? 'Seller' : 'Buyer';
  const counterpartyKey = perspective === 'buyer' ? 'seller_name' : 'buyer_name';

  const columns: Column<Order>[] = [
    { key: 'id', label: '#', render: (r) => <span className="normal_label_font">#{r.id}</span> },
    {
      key: 'primary_image', label: '', render: (r) => (
        <img
          src={r.primary_image ? `${BASE_URL}/${r.primary_image}` : 'https://via.placeholder.com/48x48?text=No+Img'}
          alt={r.product_title || ''}
          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48x48?text=No+Img'; }}
        />
      )
    },
    { key: 'product_title', label: 'Product', render: (r) => <span className="fw-semibold">{r.product_title || '—'}</span> },
    { key: counterpartyKey, label: counterpartyLabel },
    { key: 'listing_type', label: 'Type', render: (r) => <span className={r.listing_type === 'rent' ? 'rent_typ' : 'sell_typ'}>{r.listing_type}</span> },
    { key: 'final_price', label: 'Amount', render: (r) => <span className="fw-bold">₹{r.final_price}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`status-badge ${r.status}`}>{r.status}</span> },
    {
      key: 'payment_status', label: 'Payment', render: (r) => {
        const paid = r.payment_status === 'paid';
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
            background: paid ? '#eaffea' : '#fff8e1',
            color: paid ? '#1a8a1a' : '#b45309',
            border: `1px solid ${paid ? '#c9f9c9' : '#fde68a'}`,
          }}>
            <i className={`fa ${paid ? 'fa-check-circle' : 'fa-clock-o'}`} style={{ fontSize: '0.7rem' }}></i>
            {paid ? 'Paid' : 'Pending'}
          </span>
        );
      }
    },
    { key: 'created_at', label: 'Date', render: (r) => <span className="normal_label_font">{new Date(r.created_at).toLocaleDateString('en-IN')}</span> },
    {
      key: 'actions', label: 'Actions',
      render: (r) => {
        const isLoading = actionLoading === r.id;
        if (perspective === 'buyer') {
          return (
            <div className="d-flex gap-1 flex-wrap">
              {r.status === 'pending' && (
                <button className="btn btn-sm btn-outline-danger" disabled={isLoading} onClick={() => handleAction(r.id, 'cancel')}>
                  <i className="fa fa-ban me-1"></i>Cancel
                </button>
              )}
            </div>
          );
        } else {
          return (
            <div className="d-flex gap-1">
              {r.status === 'confirmed' && (
                <button className="btn btn-sm accept_sts" disabled={isLoading} onClick={() => handleAction(r.id, 'dispatch')}>
                  <i className="fa fa-truck me-1"></i>Dispatch
                </button>
              )}
              {r.status === 'dispatched' && (
                <button className="btn btn-sm btn-success" disabled={isLoading} onClick={() => { setDeliveryModal({ orderId: r.id }); setDeliveryPhoto(null); }}>
                  <i className="fa fa-check-circle me-1"></i>Confirm Delivery
                </button>
              )}
            </div>
          );
        }
      },
    },
  ];

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title={perspective === 'buyer' ? 'My Orders' : 'Orders'} />
        <StatusFilter
          filters={['all', 'pending', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled']}
          counts={counts}
          active={filter}
          onChange={setFilter}
        />
        <div className="card">
          <div className="card-body">
            <DataTable columns={columns} data={filtered} loading={loading} emptyIcon="fa fa-shopping-bag" emptyText="No orders yet" />
          </div>
        </div>
      </div>

      {/* Seller Confirm Delivery Modal */}
      {deliveryModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setDeliveryModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">Confirm Delivery</h5>
                <button type="button" className="btn-close" onClick={() => setDeliveryModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-3">Upload a photograph as proof that the order has been delivered to the buyer.</p>
                <label className="form-label fw-bold small">Delivery Photograph <span className="text-danger">*</span></label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={(e) => setDeliveryPhoto(e.target.files?.[0] || null)}
                  style={{ borderRadius: '0.5rem' }}
                />
                {deliveryPhoto && (
                  <img
                    src={URL.createObjectURL(deliveryPhoto)}
                    alt="preview"
                    className="mt-3 w-100"
                    style={{ borderRadius: '0.5rem', maxHeight: 200, objectFit: 'cover' }}
                  />
                )}
              </div>
              <div className="modal-footer border-0 p-4 pt-0 d-grid gap-2">
                <button
                  className="btn btn-success fw-bold"
                  onClick={handleSellerConfirmDelivery}
                  disabled={deliveryLoading || !deliveryPhoto}
                >
                  {deliveryLoading ? 'Confirming...' : 'Confirm Delivery'}
                </button>
                <button className="btn btn-light" onClick={() => setDeliveryModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setReviewModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom px-4 pt-4">
                <h5 className="modal-title fw-bold">Review: {reviewModal.title}</h5>
                <button type="button" className="btn-close" onClick={() => setReviewModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <label className="form-label fw-bold small">Rating</label>
                <div className="d-flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} className="btn p-0 border-0" onClick={() => setRating(star)} style={{ fontSize: '1.5rem', color: star <= rating ? '#f59e0b' : '#cbd5e1' }}>
                      ★
                    </button>
                  ))}
                </div>
                <label className="form-label fw-bold small">Comment (optional)</label>
                <textarea className="form-control" rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." style={{ borderRadius: '0.5rem' }} />
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light" onClick={() => setReviewModal(null)}>Close</button>
                <button className="btn btn-warning fw-bold" onClick={handleReview} disabled={reviewLoading}>
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
