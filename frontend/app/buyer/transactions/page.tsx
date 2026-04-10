'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Transaction {
  id: number;
  type: string;
  item_name?: string;
  title?: string;
  description?: string;
  amount: string;
  final_price?: string;
  status: string;
  date?: string;
  created_at: string;
  merchant_tid?: string;
  reference_id?: number;
  seller_name?: string;
  primary_image?: string;
}

export default function Page() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Transaction[]>('/buyer/transactions').then((r) => {
      if (r.success && r.data) setItems(r.data);
      setLoading(false);
    });
  }, []);

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const pillStyle = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fff8e1', color: '#f57f17' };
      case 'paid': return { background: '#e8f5e9', color: '#2e7d32' };
      case 'failed': return { background: '#ffebee', color: '#c62828' };
      case 'delivered': return { background: '#e0f2fe', color: '#0369a1' };
      case 'completed': return { background: '#dcfce7', color: '#166534' };
      case 'cancelled': return { background: '#fee2e2', color: '#991b1b' };
      default: return { background: '#f8f9fa', color: '#666' };
    }
  };

  const isSubscription = (type: string) => (type || '').toLowerCase().includes('subscription');

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .trx-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #eee;
          transition: all 0.3s ease;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .trx-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        .trx-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .icon-sub { background: #e9f7fe; color: #03a9f4; }
        .icon-prod { background: #fef9e9; color: #ffc107; }
        .badge-status {
          padding: 6px 12px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          display: inline-block;
        }
        .btn-receipt {
          border: 1.5px solid #eee;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          transition: 0.2s;
          padding: 4px 12px;
          background: white;
          color: #333;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .btn-receipt:hover {
          background: #f8f9fa;
          border-color: #ddd;
        }
        .empty-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #eee;
          padding: 80px 20px;
          text-align: center;
        }
      `}</style>

      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">Payment History</h3>
            <p className="text-muted small mb-0">Track all your subscription and order transactions</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-card">
            <i className="bi bi-receipt" style={{ fontSize: '4rem', opacity: 0.25 }}></i>
            <h5 className="mt-3 fw-bold">No transactions yet</h5>
            <p className="text-muted">Once you make a purchase, it will appear here.</p>
            <Link href="/buyer/browse" className="btn btn-warning fw-bold px-4 mt-2">
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="row g-3">
            {items.map((trx) => {
              const txnName = trx.item_name || trx.title || trx.description || 'Transaction';
              const txnAmount = trx.amount || trx.final_price || '0';
              const txnDate = trx.date || trx.created_at;
              const txnType = trx.type || '';
              const isSub = isSubscription(txnType);

              return (
                <div key={trx.id} className="col-12">
                  <div className="trx-card">
                    <div className="d-flex align-items-center">
                      <div className={`trx-icon me-3 ${isSub ? 'icon-sub' : 'icon-prod'}`}>
                        <i className={`bi ${isSub ? 'bi-gem' : 'bi-bag-check'}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-0 fw-bold">{txnName}</h6>
                            <small className="text-muted">
                              {txnType} &bull; {formatDate(txnDate)}
                            </small>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold fs-5">
                              {'\u20B9'}{Number(txnAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <span className="badge-status" style={pillStyle(trx.status)}>
                              {trx.status}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                          <small className="text-muted">
                            Ref: <span className="text-dark fw-medium">{trx.merchant_tid || 'N/A'}</span>
                          </small>
                          <div className="d-flex gap-2">
                            {trx.status === 'paid' && trx.reference_id && (
                              <Link
                                href={`/buyer/receipt/${(txnType.split(' ')[0] || '').toLowerCase()}/${trx.reference_id}`}
                                className="btn-receipt"
                              >
                                <i className="bi bi-file-earmark-text me-1"></i> Receipt
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
