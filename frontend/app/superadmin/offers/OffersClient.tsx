'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Offer {
  id: number;
  product_id: number;
  product_title: string;
  product_number?: string;
  product_image?: string;
  listing_type: string;
  offer_type?: string;
  original_price?: string;
  offer_price: string;
  counter_price?: string;
  deposit_amount?: string;
  status: string;
  message?: string;
  seller_remarks?: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_mobile?: string;
  buyer_rating_avg?: number;
  buyer_rating_count?: number;
  seller_name: string;
  seller_email?: string;
  seller_mobile?: string;
  seller_rating_avg?: number;
  seller_rating_count?: number;
  rental_start_date?: string;
  rental_end_date?: string;
  delivery_address?: string;        // from offers table (offer-time address)
  delivery_city?: string;
  delivery_state?: string;
  delivery_pin_code?: string;
  order_delivery_address?: string;  // from orders table
  order_delivery_pin_code?: string;
  accepted_at?: string;
  created_at: string;
  // Linked order
  order_id?: number;
  order_number?: string;
  order_status?: string;
  payment_status?: string;
  order_amount?: string;
  order_deposit?: string;
  delivery_type?: string;
  self_delivery?: number;
  dispatched_at?: string;
  delivery_date?: string;
  return_date?: string;
  delivery_photo?: string;
  seller_rated_buyer?: number;
  buyer_rated_seller?: number;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem' };

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'rgba(255,198,58,0.12)', color: '#b8860b' },
  accepted:    { bg: 'rgba(25,135,84,0.1)',   color: '#198754' },
  rejected:    { bg: 'rgba(220,53,69,0.1)',   color: '#dc3545' },
  cancelled:   { bg: 'rgba(108,117,125,0.1)', color: '#6c757d' },
  withdrawn:   { bg: 'rgba(108,117,125,0.1)', color: '#6c757d' },
  negotiating: { bg: 'rgba(13,110,253,0.1)',  color: '#0d6efd' },
};

const orderStatusColors: Record<string, { bg: string; color: string }> = {
  pending:    { bg: '#fff3cd', color: '#856404' },
  confirmed:  { bg: '#d1e7dd', color: '#0f5132' },
  dispatched: { bg: '#cfe2ff', color: '#084298' },
  delivered:  { bg: '#d1e7dd', color: '#0f5132' },
  completed:  { bg: '#ffc63a22', color: '#7a5c00' },
  cancelled:  { bg: '#f8d7da', color: '#842029' },
  returned:   { bg: '#e2e3e5', color: '#41464b' },
};

const payColors: Record<string, { bg: string; color: string }> = {
  paid:     { bg: '#d1e7dd', color: '#0f5132' },
  pending:  { bg: '#fff3cd', color: '#856404' },
  refunded: { bg: '#cfe2ff', color: '#084298' },
};

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtAmt(v?: string | number) {
  if (v === undefined || v === null || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

export default function OffersClient() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Offer | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<Offer[]>('/superadmin/all-offers').then((res) => {
      if (res.success && res.data) setOffers(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = offers.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![o.product_title, o.buyer_name, o.seller_name, o.order_number].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-tags-fill" style={{ color: '#ffc63a' }}></i> All Offers On Platform
          </h1>
          <p className="text-muted small mb-0">Full visibility into every offer, order, payment, and delivery status.</p>
        </div>

        {/* Filters */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', padding: '1rem 1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <input className="form-control" style={inputStyle} placeholder="Search by product, buyer, seller, order#..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" style={inputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Offer Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="negotiating">Negotiating</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn w-100" style={btnGold}><i className="bi bi-funnel me-1"></i> {filtered.length} results</button>
            </div>
            <div className="col-md-2">
              <button className="btn w-100 btn-outline-secondary" style={{ borderRadius: '0.5rem' }} onClick={() => { setSearch(''); setFilterStatus(''); }}>Reset</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Product</th>
                      <th style={thStyle}>Buyer</th>
                      <th style={thStyle}>Seller</th>
                      <th style={thStyle}>Offer Price</th>
                      <th style={thStyle}>Offer Status</th>
                      <th style={thStyle}>Order Status</th>
                      <th style={thStyle}>Payment</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((o) => {
                      const sc = statusColors[o.status] || statusColors.pending;
                      const oc = o.order_status ? (orderStatusColors[o.order_status] || orderStatusColors.pending) : null;
                      const pc = o.payment_status ? (payColors[o.payment_status] || payColors.pending) : null;
                      return (
                        <tr key={o.id}>
                          <td style={tdStyle}><span className="text-muted small">#{o.id}</span></td>
                          <td style={tdStyle}>
                            <div className="fw-bold" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product_title || '—'}</div>
                            <small className="text-muted text-uppercase">{o.listing_type}</small>
                          </td>
                          <td style={tdStyle}>
                            <div className="fw-semibold">{o.buyer_name || '—'}</div>
                            <small className="text-muted">{o.buyer_email || ''}</small>
                          </td>
                          <td style={tdStyle}>
                            <div className="fw-semibold">{o.seller_name || '—'}</div>
                            <small className="text-muted">{o.seller_email || ''}</small>
                          </td>
                          <td style={tdStyle} className="fw-bold">{fmtAmt(o.offer_price)}</td>
                          <td style={tdStyle}>
                            <span className="badge px-3 py-2" style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}>
                              {o.status?.charAt(0).toUpperCase() + o.status?.slice(1)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {oc ? (
                              <span className="badge px-2 py-1" style={{ background: oc.bg, color: oc.color, fontWeight: 600, fontSize: '0.7rem' }}>
                                {o.order_status?.replace(/_/g, ' ')}
                              </span>
                            ) : <span className="text-muted small">No Order</span>}
                          </td>
                          <td style={tdStyle}>
                            {pc ? (
                              <span className="badge px-2 py-1" style={{ background: pc.bg, color: pc.color, fontWeight: 600, fontSize: '0.7rem' }}>
                                {o.payment_status}
                              </span>
                            ) : <span className="text-muted small">—</span>}
                          </td>
                          <td style={tdStyle}><small>{fmt(o.created_at)}</small></td>
                          <td style={tdStyle}>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.78rem' }}
                              onClick={() => setSelected(o)}
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={10} className="text-center py-5 text-muted">
                        <i className="bi bi-inbox" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: '0.5rem' }}></i>
                        No offers found on the platform.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.55)', zIndex: 9999, overflowY: 'auto' }} onClick={() => setSelected(null)}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20 }}>
              {/* Header */}
              <div className="modal-header border-0 px-4 pt-4 pb-2 d-flex align-items-start">
                <div>
                  <h5 className="fw-bold mb-1">Offer #{selected.id} — Full Details</h5>
                  <p className="text-muted small mb-0">{selected.product_title}</p>
                </div>
                <button type="button" className="btn-close ms-auto mt-1" onClick={() => setSelected(null)}></button>
              </div>

              <div className="modal-body px-4 py-3">
                <div className="row g-3">

                  {/* ── Product ── */}
                  <div className="col-12">
                    <div className="p-3 rounded-3" style={{ background: '#f8f9fa', border: '1px solid #eee' }}>
                      <div className="d-flex gap-3 align-items-center">
                        {selected.product_image ? (
                          <img src={`${BACKEND}/${selected.product_image}`} alt="" style={{ width: 80, height: 90, objectFit: 'cover', borderRadius: 10 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 80, height: 90, background: '#e9ecef', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-image text-muted fs-4"></i>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold fs-6">{selected.product_title}</div>
                          {selected.product_number && <small className="text-muted d-block">SKU: {selected.product_number}</small>}
                          <div className="d-flex gap-2 mt-2 flex-wrap">
                            <span className="badge bg-dark text-uppercase" style={{ fontSize: '0.65rem' }}>{selected.listing_type}</span>
                            <span className="badge" style={{ background: '#ffc63a22', color: '#7a5c00', fontSize: '0.65rem' }}>Listed at {fmtAmt(selected.original_price)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Offer Details ── */}
                  <div className="col-md-6">
                    <SectionCard title="Offer Details" icon="bi-tags">
                      <InfoRow label="Offer ID" value={`#${selected.id}`} />
                      <InfoRow label="Status">
                        <span className="badge px-2 py-1" style={{ background: (statusColors[selected.status] || statusColors.pending).bg, color: (statusColors[selected.status] || statusColors.pending).color, fontWeight: 600 }}>
                          {selected.status?.charAt(0).toUpperCase() + selected.status?.slice(1)}
                        </span>
                      </InfoRow>
                      <InfoRow label="Offer Type" value={(selected.offer_type || selected.listing_type || '').toUpperCase()} />
                      <InfoRow label="Offer Price" value={<strong>{fmtAmt(selected.offer_price)}</strong>} />
                      {selected.counter_price && Number(selected.counter_price) > 0 && (
                        <InfoRow label="Counter Price" value={fmtAmt(selected.counter_price)} />
                      )}
                      {selected.deposit_amount && Number(selected.deposit_amount) > 0 && (
                        <InfoRow label="Deposit Amount" value={fmtAmt(selected.deposit_amount)} />
                      )}
                      {selected.rental_start_date && (
                        <InfoRow label="Rental Period" value={`${fmt(selected.rental_start_date)} → ${fmt(selected.rental_end_date)}`} />
                      )}
                      <InfoRow label="Submitted On" value={fmt(selected.created_at)} />
                      {selected.accepted_at && <InfoRow label="Accepted On" value={fmt(selected.accepted_at)} />}
                      {selected.seller_remarks && <InfoRow label="Seller Remarks" value={selected.seller_remarks} />}
                      {selected.message && <InfoRow label="Buyer Message" value={selected.message} />}
                    </SectionCard>
                  </div>

                  {/* ── Buyer ── */}
                  <div className="col-md-6">
                    <SectionCard title="Buyer" icon="bi-person-circle">
                      <InfoRow label="Name" value={selected.buyer_name || '—'} />
                      <InfoRow label="Email" value={selected.buyer_email || '—'} />
                      <InfoRow label="Mobile" value={selected.buyer_mobile || '—'} />
                      <InfoRow label="Rating" value={
                        selected.buyer_rating_count && selected.buyer_rating_count > 0
                          ? `⭐ ${Number(selected.buyer_rating_avg).toFixed(1)} (${selected.buyer_rating_count} ratings)`
                          : 'No ratings yet'
                      } />
                      <InfoRow label="Rated Buyer?" value={selected.seller_rated_buyer ? '✅ Yes' : 'Not yet'} />
                    </SectionCard>
                  </div>

                  {/* ── Seller ── */}
                  <div className="col-md-6">
                    <SectionCard title="Seller" icon="bi-shop">
                      <InfoRow label="Name" value={selected.seller_name || '—'} />
                      <InfoRow label="Email" value={selected.seller_email || '—'} />
                      <InfoRow label="Mobile" value={selected.seller_mobile || '—'} />
                      <InfoRow label="Rating" value={
                        selected.seller_rating_count && selected.seller_rating_count > 0
                          ? `⭐ ${Number(selected.seller_rating_avg).toFixed(1)} (${selected.seller_rating_count} ratings)`
                          : 'No ratings yet'
                      } />
                      <InfoRow label="Rated Seller?" value={selected.buyer_rated_seller ? '✅ Yes' : 'Not yet'} />
                    </SectionCard>
                  </div>

                  {/* ── Delivery ── */}
                  <div className="col-md-6">
                    <SectionCard title="Delivery Info" icon="bi-truck">
                      <InfoRow label="Type" value={selected.self_delivery ? 'Self Delivery' : (selected.delivery_type || 'Platform')} />
                      {(selected.order_delivery_address || selected.delivery_address) && (
                        <InfoRow label="Address" value={selected.order_delivery_address || selected.delivery_address} />
                      )}
                      {selected.delivery_city && <InfoRow label="City / State" value={`${selected.delivery_city}${selected.delivery_state ? ', ' + selected.delivery_state : ''}`} />}
                      {(selected.order_delivery_pin_code || selected.delivery_pin_code) && (
                        <InfoRow label="PIN Code" value={selected.order_delivery_pin_code || selected.delivery_pin_code} />
                      )}
                    </SectionCard>
                  </div>

                  {/* ── Linked Order ── */}
                  {selected.order_id ? (
                    <div className="col-12">
                      <SectionCard title="Linked Order" icon="bi-bag-check">
                        <div className="row g-2">
                          <div className="col-md-6">
                            <InfoRow label="Order #" value={selected.order_number || `#${selected.order_id}`} />
                            <InfoRow label="Order Amount" value={<strong>{fmtAmt(selected.order_amount)}</strong>} />
                            {selected.order_deposit && Number(selected.order_deposit) > 0 && (
                              <InfoRow label="Deposit" value={fmtAmt(selected.order_deposit)} />
                            )}
                          </div>
                          <div className="col-md-6">
                            <InfoRow label="Order Status">
                              {selected.order_status ? (
                                <span className="badge px-2 py-1" style={{ background: (orderStatusColors[selected.order_status] || orderStatusColors.pending).bg, color: (orderStatusColors[selected.order_status] || orderStatusColors.pending).color, fontWeight: 600 }}>
                                  {selected.order_status?.replace(/_/g, ' ')}
                                </span>
                              ) : '—'}
                            </InfoRow>
                            <InfoRow label="Payment Status">
                              {selected.payment_status ? (
                                <span className="badge px-2 py-1" style={{ background: (payColors[selected.payment_status] || payColors.pending).bg, color: (payColors[selected.payment_status] || payColors.pending).color, fontWeight: 600 }}>
                                  {selected.payment_status}
                                </span>
                              ) : '—'}
                            </InfoRow>
                            {selected.dispatched_at && <InfoRow label="Dispatched At" value={fmt(selected.dispatched_at)} />}
                            {selected.delivery_date && <InfoRow label="Delivered On" value={fmt(selected.delivery_date)} />}
                            {selected.return_date && <InfoRow label="Returned On" value={fmt(selected.return_date)} />}
                          </div>
                        </div>

                        {/* Delivery Proof Photo */}
                        {selected.delivery_photo && (
                          <div className="mt-3 pt-3 border-top">
                            <p className="text-muted small fw-bold text-uppercase mb-2"><i className="bi bi-camera me-1"></i> Proof of Delivery Photo</p>
                            <a href={`${BACKEND}/${selected.delivery_photo}`} target="_blank" rel="noreferrer">
                              <img
                                src={`${BACKEND}/${selected.delivery_photo}`}
                                alt="Delivery proof"
                                style={{ maxWidth: 260, maxHeight: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee', cursor: 'pointer' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                            <small className="text-muted d-block mt-1">Click to open full size</small>
                          </div>
                        )}
                      </SectionCard>
                    </div>
                  ) : selected.status === 'accepted' ? (
                    <div className="col-12">
                      <div className="alert alert-warning small mb-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Offer is accepted but no linked order found. The buyer may not have placed the order yet.
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="modal-footer border-0 px-4 pb-4 pt-0">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Small helper components ──────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="h-100 p-3 rounded-3" style={{ background: '#fff', border: '1px solid #eee' }}>
      <div className="fw-bold mb-2 small text-uppercase" style={{ color: '#677788', letterSpacing: 0.5 }}>
        <i className={`bi ${icon} me-1`} style={{ color: '#ffc63a' }}></i> {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between align-items-start py-1" style={{ borderBottom: '1px solid #f5f5f5', gap: 8 }}>
      <span className="text-muted small" style={{ minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span className="small fw-semibold text-end" style={{ wordBreak: 'break-word' }}>{children ?? value ?? '—'}</span>
    </div>
  );
}
