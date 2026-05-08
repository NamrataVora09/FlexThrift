'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Contact {
  id: number;
  seller_id: number;
  product_id: number;
  product_title?: string;
  seller_name?: string;
  seller_email?: string;
  seller_mobile?: string;
  seller_city?: string;
  seller_state?: string;
  seller_pin_code?: string;
  viewed_at?: string;
  created_at: string;
  return_confirmed?: boolean;
  window_expired?: boolean;
  already_rated?: boolean;
  can_rate_now?: boolean;
  days_left?: number;
}

export default function Page() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState<{ sellerId: number; productId: number } | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Contact[]>('/shared/contacted-sellers').then((r) => {
      if (r.success && r.data) setContacts(r.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // Auto-refresh when a new offer contact is created from another page
    const onContactCreated = () => load();
    window.addEventListener('flex:contact-created', onContactCreated);
    return () => window.removeEventListener('flex:contact-created', onContactCreated);
  }, []);

  const availableRatings = contacts.filter((c) => c.can_rate_now && !c.already_rated).length;

  const handleRate = async () => {
    if (!ratingModal) return;
    setRatingLoading(true);
    const res = await api.post('/buyer/rate-self-delivery-seller', {
      seller_id: ratingModal.sellerId,
      product_id: ratingModal.productId,
      comment: ratingComment,
    });
    if (res?.success) {
      setRatingModal(null);
      setRatingComment('');
      toast.success('Endorsement submitted successfully!');
      load();
    } else {
      toast.error(res?.message || 'Something went wrong');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .seller-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #eee;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }
        .seller-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
          border-color: #ffc63a;
        }
        .profile-avatar {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          background: #ffc63a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          font-size: 1.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .status-badge {
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .badge-not-confirmed {
          background: #f8f9fa;
          color: #666;
          border: 1px solid #eee;
        }
        .badge-confirmed {
          background: #eaffea;
          color: #1a8a1a;
          border: 1px solid #c9f9c9;
        }
        .badge-expired {
          background: #fff5f5;
          color: #d63031;
          border: 1px solid #ffeaea;
        }
        .btn-rate {
          background: #ffc63a;
          color: #000;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 700;
          border: none;
          transition: all 0.2s;
          width: 100%;
          cursor: pointer;
        }
        .btn-rate:hover {
          background: #000;
          color: #ffc63a;
        }
        .rating-meta {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 15px;
          font-size: 0.85rem;
          border: 1px solid #eee;
        }
        .stat-badge-box {
          background: #fff;
          border: 1px solid #eee;
          padding: 15px 25px;
          border-radius: 12px;
        }
        .empty-card {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #eee;
        }
      `}</style>

      <div className="mb-5">
        <h1 className="fw-bold mb-1">Contacted Sellers</h1>
        <p className="text-muted mb-0">Manage your connections and rate self-delivery services.</p>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#ffc63a' }} />
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-card">
          <i className="bi bi-people" style={{ fontSize: '5rem', opacity: 0.1 }}></i>
          <h3 className="mt-4 fw-bold">No contacts found</h3>
          <p className="text-muted">Explore the market to build your retail connections.</p>
          <Link href="/buyer/browse" className="btn btn-dark rounded-pill px-5 mt-3">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="row">
          {contacts.map((c) => {
            const contactDate = c.viewed_at || c.created_at;
            let badgeEl;
            if (c.return_confirmed) {
              badgeEl = (
                <span className="status-badge badge-confirmed">
                  <i className="bi bi-check-circle me-1"></i> Return Confirmed
                </span>
              );
            } else if (c.window_expired) {
              badgeEl = (
                <span className="status-badge badge-expired">
                  <i className="bi bi-clock me-1"></i> Window Expired
                </span>
              );
            } else {
              badgeEl = null;
            }

            return (
              <div key={c.id} className="col-12 mb-3">
                <div className="seller-card">
                  <div className="row align-items-center">
                    <div className="col">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div className="d-flex align-items-center gap-3 mb-1">
                            <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.25rem' }}>{c.seller_name || 'Verified Fashion Seller'}</h5>

                          </div>
                          <small className="text-muted d-block">
                            Inquiry for: <strong className="text-dark">{c.product_title || 'Product'}</strong>
                          </small>
                        </div>
                        {badgeEl}
                      </div>

                      <div className="py-3 border-top border-bottom mb-0">
                        <div className="d-flex flex-wrap gap-5">
                          <div>
                            <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', color: "#ffc63a", letterSpacing: '0.5px' }}>Mobile No</small>
                            <span className="fw-bold text-dark">{c.seller_mobile || 'N/A'}</span>
                          </div>
                          <div>
                            <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', color: "#ffc63a", letterSpacing: '0.5px' }}>Email Address</small>
                            <span className="fw-bold text-dark">{c.seller_email || 'N/A'}</span>
                          </div>
                          <div>
                            <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', color: "#ffc63a", letterSpacing: '0.5px' }}>City</small>
                            <span className="fw-bold text-dark">{c.seller_city || 'N/A'}</span>
                          </div>
                          <div>
                            <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', color: "#ffc63a", letterSpacing: '0.5px' }}>State</small>
                            <span className="fw-bold text-dark">{c.seller_state || 'N/A'}</span>
                          </div>
                          <div>
                            <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', color: "#ffc63a", letterSpacing: '0.5px' }}>Pincode</small>
                            <span className="fw-bold text-dark">{c.seller_pin_code || 'N/A'}</span>
                          </div>
                          {c.return_confirmed && !c.window_expired && !c.already_rated && c.days_left !== undefined && (
                            <div>
                              <small className=" d-block fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>Rating Expires In</small>
                              <span className="fw-bold text-warning">{c.days_left} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 text-end">
                      <div className="mb-3">
                        <small className=" d-block fw-bold mb-1">CONTACTED ON</small>
                        <span className="fw-bold text-dark">{formatDate(contactDate)}</span>
                      </div>
                      {c.already_rated ? (
                        <div className="text-center bg-light p-2 rounded-3 border">
                          <div className="text-warning h4 mb-0"><i className="bi bi-star-fill"></i></div>
                          <small className="text-dark fw-bold" style={{ fontSize: '10px' }}>CREDIT AWARDED</small>
                        </div>
                      ) : c.can_rate_now ? (
                        <button
                          className="btn-rate"
                          onClick={() => {
                            setRatingModal({ sellerId: c.seller_id, productId: c.product_id });
                            setRatingComment('');
                          }}
                        >
                          <i className="bi bi-star-fill me-1"></i> Confirm Reliability
                        </button>
                      ) : c.window_expired ? (
                        <span className="text-muted small fst-italic">Rating window closed</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          onClick={() => setRatingModal(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: '24px' }}>
              <div className="modal-header border-0 pb-0">
                <button type="button" className="btn-close" onClick={() => setRatingModal(null)}></button>
              </div>
              <div className="modal-body text-center p-5 pt-2">
                <div
                  className="d-inline-flex p-4 mb-4"
                  style={{ background: 'rgba(255,193,7,0.1)', borderRadius: '50%' }}
                >
                  <i className="bi bi-award-fill text-warning" style={{ fontSize: '2rem' }}></i>
                </div>
                <h3 className="fw-bold mb-3">Reward Seller</h3>
                <p className="text-muted mb-4 small">
                  You are about to give <strong>+1 Reliability Point</strong> to this seller.
                  This helps the community by confirming the transaction was handled professionally.
                </p>

                <button
                  className="btn btn-warning w-100 py-3 rounded-pill fw-bold"
                  onClick={handleRate}
                  disabled={ratingLoading}
                >
                  {ratingLoading ? 'Submitting...' : 'Yes, Give Point'}
                </button>
                <button
                  className="btn btn-link text-muted mt-2 small text-decoration-none"
                  onClick={() => setRatingModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
