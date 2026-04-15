'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Product {
  id: number; title: string; listing_type: string; original_price: string; price: string;
  rental_deposit: string; rental_cost: string; category: string; color: string; size: string; gender: string;
  used_times: string; usage_label?: string; has_bill: string; description: string; bill_image: string;
  dispatch_address: string; dispatch_city: string; dispatch_state: string; dispatch_pin_code: string;
  seller_name: string; seller_email: string; seller_mobile: string;
  seller_rating_avg?: string; seller_rating_count?: string; status: string; created_at: string;
  images?: Array<{ id: number; image_path: string }>;
}

interface EditRequest {
  id: number; product_id: number; original_title: string; listing_type: string;
  seller_name: string; reliability_score: string; created_at: string;
  updated_data: string; temp_images: string; deleted_images_ids: string;
}

interface RejectionTemplate {
  id: number;
  template_text: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface Props { role: string; apiPath: string; showRatings?: boolean; }

const btnApprove: React.CSSProperties = { background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', fontWeight: 700 };
const btnReject: React.CSSProperties = { background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444', fontWeight: 700 };
const tagBadge: React.CSSProperties = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500 };
const BASE = 'http://localhost:8080';

export default function PendingProductsView({ role, apiPath, showRatings = false }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<RejectionTemplate[]>([]);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ id: number; title: string; type: 'product' | 'edit' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [templateSearchInput, setTemplateSearchInput] = useState('');
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  // Approve modal
  const [approveModal, setApproveModal] = useState<{ id: number; title: string } | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('');

  // Inspector modal
  const [inspecting, setInspecting] = useState<Product | null>(null);
  const [inspectImages, setInspectImages] = useState<Array<{ id: number; image_path: string }>>([]);
  const [imgIdx, setImgIdx] = useState(0);

  // Comparison modal
  const [comparison, setComparison] = useState<{ request: any; original: any; original_images: any[] } | null>(null);

  const load = () => {
    setLoading(true);
    const baseApiPath = role === 'super_admin' ? '/superadmin' : '/admin';
    Promise.all([
      api.get<Product[]>(apiPath),
      api.get<EditRequest[]>(`${baseApiPath}/get-edit-requests`),
      api.get<RejectionTemplate[]>(`${baseApiPath}/get-rejection-templates?type=Products`),
    ]).then(([pr, er, tr]) => {
      if (pr.success && pr.data) setProducts(pr.data);
      if (er.success && er.data) setEditRequests(er.data);
      if (tr.success && tr.data) setTemplates(tr.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [apiPath]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setTemplateDropdownOpen(false);
      }
    };
    if (templateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [templateDropdownOpen]);

  const handleApprove = async () => {
    if (!approveModal) return;
    const res = await api.post(`/shared/approve-product/${approveModal.id}`, { remarks: approveRemarks });
    if (res.success) {
      toast.success('Product approved!');
      setApproveModal(null); 
      setApproveRemarks('');
      load();
    } else {
      toast.error(res.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const payload: any = { remarks: rejectReason };
    if (selectedTemplateId) {
      payload.template_id = selectedTemplateId;
    }
    let res;
    if (rejectModal.type === 'product') {
      res = await api.post(`/shared/reject-product/${rejectModal.id}`, payload);
    } else {
      const baseApiPath = role === 'super_admin' ? '/superadmin' : '/admin';
      res = await api.post(`${baseApiPath}/reject-edit-request/${rejectModal.id}`, payload);
    }
    if (res.success) {
      toast.success(rejectModal.type === 'product' ? 'Product rejected' : 'Edit request rejected');
      setRejectModal(null); 
      setRejectReason(''); 
      setSelectedTemplateId(null);
      setTemplateSearchInput('');
      load();
    } else {
      toast.error(res.message || 'Rejection failed');
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = templateSearchInput.toLowerCase();
    return templates.filter(t => !q || t.template_text.toLowerCase().includes(q));
  }, [templates, templateSearchInput]);

  const openInspector = async (id: number) => {
    const baseApiPath = role === 'super_admin' ? '/superadmin' : '/admin';
    const res = await api.get<any>(`${baseApiPath}/get-product-detail/${id}`);
    if (res.success && res.data) {
      setInspecting(res.data);
      setInspectImages(res.data.images || []);
      setImgIdx(0);
    }
  };

  const openComparison = async (requestId: number) => {
    console.log('Opening comparison for request:', requestId);
    const baseApiPath = role === 'super_admin' ? '/superadmin' : '/admin';
    const res = await api.get<any>(`${baseApiPath}/get-edit-comparison/${requestId}`);
    console.log('API response:', res);
    if (res.success && res.data) {
      console.log('Setting comparison data:', res.data);
      setComparison({
        request: res.data.request,
        original: res.data.original,
        original_images: res.data.original_images || [],
      });
    } else {
      console.error('Failed to get comparison:', res);
    }
  };

  const approveEdit = (id: number) => {
    confirmToast('Approve and merge these changes?', async () => {
      const baseApiPath = role === 'super_admin' ? '/superadmin' : '/admin';
      const res = await api.post(`${baseApiPath}/approve-edit-request/${id}`);
      if (res.success) {
        toast.success('Edit request approved and merged!');
        setComparison(null); 
        load();
      } else {
        toast.error(res.message || 'Failed to approve');
      }
    }, 'Approve');
  };

  const renderStars = (avg: number, count: number) => (
    <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={`bi bi-star${i <= Math.round(avg) ? '-fill' : ''}`} style={{ color: i <= Math.round(avg) ? '#f59e0b' : '#cbd5e1' }}></i>)}
      <span className="text-muted small ms-1">({count})</span>
    </div>
  );

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const totalItems = products.length + editRequests.length;

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h2 className="fw-bold mb-1">Pending Approvals</h2>
            <p className="text-muted small mb-0">Carefully review the catalog submissions before making them live.</p>
          </div>
          <div className="badge px-3 py-2 rounded-pill" style={{ background: 'rgba(255,198,58,0.1)', color: '#ffc63a', fontSize: '0.85rem' }}>
            <i className="bi bi-layers me-1"></i>{totalItems} Items
          </div>
        </header>

        {totalItems > 0 ? (
          <>
            {/* ── New Uploads ── */}
            {products.length > 0 && (
              <>
                <div className="mb-4 d-flex align-items-center gap-2">
                  <span className="badge rounded-pill" style={{ background: '#ffc63a', color: '#212529', fontWeight: 600 }}>New Uploads</span>
                  <hr className="flex-grow-1 opacity-25" />
                </div>
                <div className="row g-4 mb-5">
                  {products.map((p) => (
                    <div className="col-md-6 col-xxl-4" key={p.id}>
                      <div style={{ border: 'none', borderRadius: 20, background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', transition: 'transform 0.3s', height: '100%', display: 'flex', flexDirection: 'column' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        {/* Thumbnail */}
                        <div style={{ height: 200, background: '#e2e8f0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.images && p.images.length > 0 ? (
                            <img src={p.images[0].image_path.startsWith('uploads/') ? `${BASE}/${p.images[0].image_path}` : `${BASE}/uploads/products/${p.images[0].image_path}`} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="bi bi-image" style={{ fontSize: '3rem', color: '#94a3b8' }}></i>
                          )}
                          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5 }}>
                            <span className="badge bg-white text-dark shadow-sm px-3 py-2 rounded-pill small">{p.listing_type?.charAt(0).toUpperCase() + p.listing_type?.slice(1)}</span>
                            {Number(p.has_bill) ? <span style={{ background: '#fef9c3', color: '#854d0e', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}><i className="bi bi-receipt me-1"></i>Bill</span> : null}
                          </div>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '1.5rem', flexGrow: 1 }}>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h5 className="fw-bold mb-0 text-truncate" style={{ maxWidth: 200 }}>{p.title}</h5>
                            <div className="text-end">
                              <div className="fw-bold fs-5" style={{ color: '#ffc63a' }}>
                                ₹{Number(p.listing_type === 'rent' ? (p.rental_cost || 0) : (p.price || p.original_price || 0)).toLocaleString()}
                                {p.listing_type === 'rent' && <small className="ms-1" style={{ fontSize: '0.65rem', textTransform: 'lowercase' }}>/day</small>}
                              </div>
                              {p.listing_type === 'rent' && p.rental_deposit && <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>+ ₹{Number(p.rental_deposit).toLocaleString()} deposit</small>}
                            </div>
                          </div>
                          <div className="mb-3 d-flex flex-wrap gap-2">
                            {p.category && <span style={tagBadge}><i className="bi bi-tag small me-1"></i>{p.category}</span>}
                            {p.color && <span style={tagBadge}><i className="bi bi-palette small me-1"></i>{p.color}</span>}
                            {p.used_times && <span style={tagBadge}>{p.used_times} {p.usage_label || 'Uses'}</span>}
                          </div>
                          <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '10px 15px', marginBottom: '1.25rem' }}>
                            <div className="small text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: 0.5 }}>Seller Profile</div>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3b82f6', border: '1px solid #e2e8f0' }}>{p.seller_name?.charAt(0).toUpperCase()}</div>
                              <div className="flex-grow-1">
                                <div className="fw-bold small">{p.seller_name}</div>
                                {showRatings && renderStars(Number(p.seller_rating_avg || 0), Number(p.seller_rating_count || 0))}
                              </div>
                            </div>
                          </div>
                          {p.description && <p className="small text-muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}
                        </div>
                        {/* Actions */}
                        <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9', background: '#fbfcfd' }} className="d-flex flex-column gap-2">
                          <div className="row g-2">
                            <div className="col-6"><button className="btn w-100 py-2 rounded-3 small" style={btnApprove} onClick={() => setApproveModal({ id: p.id, title: p.title })}><i className="bi bi-check-lg me-1"></i>Approve</button></div>
                            <div className="col-6"><button className="btn w-100 py-2 rounded-3 small" style={btnReject} onClick={() => { setRejectModal({ id: p.id, title: p.title, type: 'product' }); setRejectReason(''); }}><i className="bi bi-x-lg me-1"></i>Reject</button></div>
                          </div>
                          <button className="btn btn-white border w-100 py-2 rounded-3 fw-bold shadow-sm small" onClick={() => openInspector(p.id)}>
                            <i className="bi bi-eye me-1"></i> Inspect Product & Images
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Edit Requests ── */}
            {editRequests.length > 0 && (
              <>
                <div className="mb-4 d-flex align-items-center gap-2 mt-5">
                  <span className="badge bg-warning text-dark rounded-pill" style={{ fontWeight: 600 }}>Edit Requests (Side-by-Side Review)</span>
                  <hr className="flex-grow-1 opacity-25" />
                </div>
                <div className="row g-4">
                  {editRequests.map((r) => (
                    <div className="col-md-6 col-xxl-4" key={r.id}>
                      <div style={{ borderRadius: 20, background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '2px dashed rgba(255,193,7,0.4)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 160, background: '#e2e8f0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="bi bi-pencil-square" style={{ fontSize: '2.5rem', color: '#94a3b8' }}></i>
                          <div style={{ position: 'absolute', top: 10, right: 10 }}>
                            <span className="badge bg-warning text-dark shadow-sm px-3 py-2 rounded-pill small">PENDING EDIT</span>
                          </div>
                        </div>
                        <div style={{ padding: '1.5rem', flexGrow: 1 }}>
                          <small className="text-muted fw-bold text-uppercase d-block mb-1" style={{ fontSize: '0.65rem' }}>Product ID: {r.product_id}</small>
                          <h5 className="fw-bold mb-3">{r.original_title}</h5>
                          <div style={{ background: '#f1f5f9', borderRadius: 12, padding: '10px 15px', marginBottom: '1rem' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,193,7,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#f59e0b' }}>{r.seller_name?.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="fw-bold small">{r.seller_name}</div>
                                <div className="small text-muted">Reliability: {r.reliability_score}%</div>
                              </div>
                            </div>
                          </div>
                          <p className="small text-muted mb-0"><i className="bi bi-clock-history me-1"></i>Requested: {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}, {new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9', background: '#fbfcfd' }}>
                          <button className="btn w-100 py-3 rounded-3 fw-bold sa-filter-btn" style={{ background: '#ffc63a', color: '#212529', border: 'none' }} onClick={() => openComparison(r.id)}>
                            <i className="bi bi-arrow-left-right me-2"></i>Review Changes & Act
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-5 bg-white rounded-4 shadow-sm">
            <i className="bi bi-emoji-smile text-success" style={{ fontSize: '5rem' }}></i>
            <h4 className="mt-3 fw-bold">Platform is Clean!</h4>
            <p className="text-muted">No pending products or edit requests currently waiting for your review.</p>
            <a href={`/${role === 'super_admin' ? 'superadmin' : role}`} className="btn rounded-pill px-5 sa-filter-btn" style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none' }}>Back to Home</a>
          </div>
        )}
      </div>

      {/* ══ Reject Modal ══ */}
      {rejectModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setRejectModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #ef4444', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-x-octagon me-2 text-danger"></i>Reject: {rejectModal.title}</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Template Selection */}
                <div className="mb-3">
                  <label className="form-label fw-bold small">Rejection Template (Optional)</label>
                  <div style={{ position: 'relative' }} ref={templateDropdownRef}>
                    <div 
                      onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                      style={{
                        background: '#f8f9fa',
                        border: '1px solid #e7eaf3',
                        borderRadius: '0.5rem',
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <span>{selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.template_text : 'Select a template...'}</span>
                      <i className={`bi bi-chevron-down`} style={{ fontSize: '0.75rem', transform: templateDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}></i>
                    </div>

                    {templateDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          background: '#fff',
                          border: '1px solid #e7eaf3',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 1000,
                          maxHeight: 280,
                          overflowY: 'auto'
                        }}
                      >
                        <div style={{ padding: '0.5rem', borderBottom: '1px solid #e7eaf3', position: 'sticky', top: 0, background: '#fff' }}>
                          <input
                            type="text"
                            placeholder="Search templates..."
                            value={templateSearchInput}
                            onChange={(e) => setTemplateSearchInput(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #e7eaf3',
                              borderRadius: '0.4rem',
                              fontSize: '0.875rem',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                            onBlur={(e) => e.target.style.borderColor = '#e7eaf3'}
                            autoFocus
                          />
                        </div>

                        <div>
                          <div
                            onClick={() => {
                              setSelectedTemplateId(null);
                              setTemplateSearchInput('');
                              setTemplateDropdownOpen(false);
                              setRejectReason('');
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              background: selectedTemplateId === null ? '#fef2f2' : 'transparent',
                              borderLeft: selectedTemplateId === null ? '3px solid #dc2626' : '3px solid transparent',
                              fontSize: '0.875rem',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedTemplateId !== null) e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              if (selectedTemplateId !== null) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            None
                          </div>

                          {filteredTemplates.map(t => (
                            <div
                              key={t.id}
                              onClick={() => {
                                setSelectedTemplateId(t.id);
                                setTemplateSearchInput('');
                                setTemplateDropdownOpen(false);
                                setRejectReason(t.template_text);
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                background: selectedTemplateId === t.id ? '#fef2f2' : 'transparent',
                                borderLeft: selectedTemplateId === t.id ? '3px solid #dc2626' : '3px solid transparent',
                                fontSize: '0.875rem',
                                transition: 'all 0.15s',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedTemplateId !== t.id) e.currentTarget.style.background = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div className="fw-bold small">{t.template_text.substring(0, 50)}{t.template_text.length > 50 ? '...' : ''}</div>
                              <div className="text-muted small" style={{ fontSize: '0.7rem', marginTop: '2px' }}>{t.template_text.substring(0, 60)}...</div>
                            </div>
                          ))}

                          {filteredTemplates.length === 0 && (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#adb5bd', fontSize: '0.875rem' }}>
                              No templates found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Reason */}
                <label className="form-label fw-bold small">Custom Reason (Optional)</label>
                <textarea className="form-control" rows={3} placeholder="Add custom notes..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem' }} />
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn" style={btnReject} onClick={handleReject}><i className="bi bi-x-lg me-1"></i>Confirm Rejection</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Approve Modal ══ */}
      {approveModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setApproveModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-check-circle me-2" style={{ color: '#ffc63a' }}></i>Approve: {approveModal.title}</h5>
                <button type="button" className="btn-close" onClick={() => setApproveModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <label className="form-label fw-bold small">Comments (Optional)</label>
                <textarea className="form-control" rows={3} placeholder="Add any notes or remarks..." value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem' }} />
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light" onClick={() => setApproveModal(null)}>Cancel</button>
                <button className="btn" style={btnApprove} onClick={handleApprove}><i className="bi bi-check-lg me-1"></i>Approve Product</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Inspector Modal ══ */}
      {inspecting && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setInspecting(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <h5 className="modal-title fw-bold">{inspecting.title}</h5>
                <button type="button" className="btn-close" onClick={() => setInspecting(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Image Gallery */}
                  <div className="col-md-6">
                    <div className="rounded-4 overflow-hidden border" style={{ position: 'relative', background: '#f1f5f9', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {inspectImages.length > 0 ? (
                        <img src={inspectImages[imgIdx]?.image_path?.startsWith('uploads/') ? `${BASE}/${inspectImages[imgIdx].image_path}` : `${BASE}/uploads/products/${inspectImages[imgIdx]?.image_path}`} alt="" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                      ) : (
                        <div className="text-muted text-center p-4"><i className="bi bi-image" style={{ fontSize: '3rem', opacity: 0.3 }}></i><p className="small mt-2">No images uploaded</p></div>
                      )}
                    </div>
                    {inspectImages.length > 1 && (
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button className="btn btn-sm btn-light border" onClick={() => setImgIdx((i) => (i - 1 + inspectImages.length) % inspectImages.length)}><i className="bi bi-chevron-left"></i></button>
                        <span className="small text-muted align-self-center">{imgIdx + 1} / {inspectImages.length}</span>
                        <button className="btn btn-sm btn-light border" onClick={() => setImgIdx((i) => (i + 1) % inspectImages.length)}><i className="bi bi-chevron-right"></i></button>
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="text-muted small fw-bold text-uppercase mb-1 d-block">Full Description</label>
                      <div className="p-3 bg-light rounded-3 small" style={{ minHeight: 80 }}>{inspecting.description || 'No description'}</div>
                    </div>
                    <div className="row g-3">
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Contact</label><div className="fw-bold small">{inspecting.seller_name}</div></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Mobile</label><div className="fw-bold small">{inspecting.seller_mobile || 'N/A'}</div></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Category</label><div className="fw-bold small">{inspecting.category || 'N/A'}</div></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Color / Size</label><div className="fw-bold small">{inspecting.color || '—'} / {inspecting.size || '—'}</div></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Price</label><div className="fw-bold small" style={{ color: '#ffc63a' }}>₹{Number(inspecting.listing_type === 'rent' ? (inspecting.rental_cost || 0) : (inspecting.price || inspecting.original_price || 0)).toLocaleString()}{inspecting.listing_type === 'rent' ? ' /pm' : ''}</div></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-3"><label className="text-muted small fw-bold text-uppercase mb-1 d-block" style={{ fontSize: '0.6rem' }}>Used Times</label><div className="fw-bold small">{inspecting.used_times || '0'}</div></div></div>
                    </div>
                    {Number(inspecting.has_bill) && inspecting.bill_image ? (
                      <div className="mt-3 p-3 border rounded-3" style={{ background: 'rgba(255,193,7,0.08)', borderColor: 'rgba(255,193,7,0.3)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="small fw-bold" style={{ color: '#854d0e' }}><i className="bi bi-file-earmark-check me-1"></i>Bill Available</div>
                          {(() => {
                            let billPaths: string[] = [];
                            if (inspecting.bill_image.startsWith('[')) {
                              try {
                                billPaths = JSON.parse(inspecting.bill_image);
                              } catch {
                                billPaths = [inspecting.bill_image];
                              }
                            } else {
                              billPaths = [inspecting.bill_image];
                            }
                            const firstBill = billPaths[0];
                            return (
                              <a href={firstBill?.startsWith('uploads/') ? `${BASE}/${firstBill}` : `${BASE}/uploads/products/${firstBill}`} target="_blank" rel="noreferrer" className="btn btn-warning btn-sm py-1 px-3 small rounded-pill">
                                View Bill {billPaths.length > 1 ? `(${billPaths.length})` : ''}
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <div className="d-flex gap-2 w-100">
                  <button className="btn flex-grow-1 py-2 rounded-3" style={btnApprove} onClick={() => { setApproveModal({ id: inspecting.id, title: inspecting.title }); setInspecting(null); }}><i className="bi bi-check-lg me-1"></i>Approve</button>
                  <button className="btn flex-grow-1 py-2 rounded-3" style={btnReject} onClick={() => { setRejectModal({ id: inspecting.id, title: inspecting.title, type: 'product' }); setRejectReason(''); setInspecting(null); }}><i className="bi bi-x-lg me-1"></i>Reject</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Comparison Modal ══ */}
      {comparison && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setComparison(null)}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
              <div className="modal-header border-bottom p-4">
                <h5 className="modal-title fw-bold"><i className="bi bi-arrow-left-right me-2"></i>Side-by-Side Comparison</h5>
                <button type="button" className="btn-close" onClick={() => setComparison(null)}></button>
              </div>
              <div className="modal-body p-0">
                <div className="row g-0">
                  {/* Original */}
                  <div className="col-md-6 border-end p-4" style={{ background: 'rgba(248,250,252,0.5)' }}>
                    <div className="text-center mb-4"><span className="badge bg-secondary px-3 py-2 rounded-pill">ORIGINAL DATA</span></div>
                    <h5 className="fw-bold mb-3">{comparison.original?.title}</h5>
                    {renderCompSection('General', [
                      { l: 'Title', v: comparison.original?.title },
                      { l: 'Category', v: comparison.original?.category },
                      { l: 'Listing Type', v: comparison.original?.listing_type?.toUpperCase() },
                    ])}
                    {renderCompSection('Specs', [
                      { l: 'Color', v: comparison.original?.color || 'N/A' },
                      { l: 'Size', v: comparison.original?.size || 'N/A' },
                      { l: 'Gender', v: comparison.original?.gender || 'N/A' },
                      { l: 'Used Times', v: comparison.original?.used_times ?? 'N/A' },
                    ])}
                    {renderCompSection('Pricing', [
                      { l: 'Original Price', v: '₹' + Number(comparison.original?.original_price || 0).toLocaleString() },
                      { 
                        l: comparison.original?.listing_type === 'rent' ? 'Monthly Rental' : 'Sale Price', 
                        v: '₹' + Number(comparison.original?.listing_type === 'rent' ? (comparison.original?.rental_cost || 0) : (comparison.original?.price || 0)).toLocaleString() + (comparison.original?.listing_type === 'rent' ? ' /pm' : '')
                      },
                      comparison.original?.listing_type === 'rent' && { l: 'Security Deposit', v: '₹' + Number(comparison.original?.rental_deposit || 0).toLocaleString() }
                    ].filter((item): item is { l: string; v: any } => !!item))}
                    <h6 className="fw-bold text-muted text-uppercase small border-bottom pb-1 mb-2 mt-3">Images</h6>
                    <div className="row g-2">
                      {(comparison.original_images || []).map((img: any, i: number) => {
                        const deletedIds = JSON.parse(comparison.request?.deleted_images_ids || '[]');
                        const isDeleted = deletedIds.includes(String(img.id)) || deletedIds.includes(Number(img.id));
                        return (
                          <div className="col-4" key={i} style={{ position: 'relative' }}>
                            <img src={img.image_path?.startsWith('uploads/') ? `${BASE}/${img.image_path}` : `${BASE}/uploads/products/${img.image_path}`} className="w-100 rounded border" style={{ height: 80, objectFit: 'cover', opacity: isDeleted ? 0.25 : 1 }} alt="" />
                            {isDeleted && <span className="badge bg-danger position-absolute top-50 start-50 translate-middle" style={{ fontSize: '0.6rem' }}>DELETING</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Proposed Changes */}
                  <div className="col-md-6 p-4">
                    <div className="text-center mb-4"><span className="badge bg-success px-3 py-2 rounded-pill">PROPOSED CHANGES</span></div>
                    {(() => {
                      const updated = JSON.parse(comparison.request?.updated_data || '{}');
                      const orig = comparison.original || {};
                      const diff = (o: string, n: string) => String(o).trim() === String(n).trim() ? n : <><span className="text-danger" style={{ textDecoration: 'line-through', opacity: 0.6 }}>{o}</span> <i className="bi bi-arrow-right mx-1"></i> <mark style={{ background: 'rgba(16,185,129,0.2)', color: '#059669', padding: '0 4px', borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)' }}>{n}</mark></>;
                      return (
                        <>
                          <h5 className="fw-bold mb-3">{diff(orig.title, updated.title)}</h5>
                          {renderCompSection('General', [
                            { l: 'Title', v: diff(orig.title, updated.title) },
                            { l: 'Category', v: diff(orig.category || '', updated.category || '') },
                            { l: 'Listing Type', v: String(diff(orig.listing_type || '', updated.listing_type || '')).toUpperCase() },
                          ])}
                          {renderCompSection('Specs', [
                            { l: 'Color', v: diff(orig.color || 'N/A', updated.color || 'N/A') },
                            { l: 'Size', v: diff(orig.size || 'N/A', updated.size || 'N/A') },
                            { l: 'Gender', v: diff(orig.gender || 'N/A', updated.gender || 'N/A') },
                            { l: 'Used Times', v: diff(String(orig.used_times ?? ''), String(updated.used_times ?? '')) },
                          ])}
                          {renderCompSection('Pricing', [
                            { l: 'Original Price', v: diff('₹' + Number(orig.original_price || 0), '₹' + Number(updated.original_price || 0)) },
                            { 
                              l: updated.listing_type === 'rent' ? 'Monthly Rental' : 'Sale Price', 
                              v: diff(
                                '₹' + Number(orig.listing_type === 'rent' ? (orig.rental_cost || 0) : (orig.price || 0)) + (orig.listing_type === 'rent' ? ' /pm' : ''),
                                '₹' + Number(updated.listing_type === 'rent' ? (updated.rental_cost || 0) : (updated.price || 0)) + (updated.listing_type === 'rent' ? ' /pm' : '')
                              ) 
                            },
                            updated.listing_type === 'rent' && { l: 'Security Deposit', v: diff('₹' + Number(orig.rental_deposit || 0), '₹' + Number(updated.rental_deposit || 0)) }
                          ].filter((item): item is { l: string; v: any } => !!item))}
                          {/* New images */}
                          {(() => {
                            const tempImages = JSON.parse(comparison.request?.temp_images || '[]');
                            if (tempImages.length === 0) return null;
                            return (<><h6 className="fw-bold text-muted text-uppercase small border-bottom pb-1 mb-2 mt-3">New Images</h6><div className="row g-2">{tempImages.map((path: string, i: number) => <div className="col-4" key={i}><img src={path.startsWith('uploads/') ? `${BASE}/${path}` : `${BASE}/uploads/products/${path}`} className="w-100 rounded border" style={{ height: 80, objectFit: 'cover' }} alt="" /></div>)}</div></>);
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top p-4 d-flex justify-content-between">
                <button className="btn btn-outline-secondary px-4 fw-bold" onClick={() => setComparison(null)}>Close</button>
                <div className="d-flex gap-2">
                  <button className="btn px-4 fw-bold" style={btnReject} onClick={() => { setRejectModal({ id: comparison.request.id, title: 'Edit Request', type: 'edit' }); setRejectReason(''); setComparison(null); }}>Reject Changes</button>
                  <button className="btn px-4 fw-bold" style={btnApprove} onClick={() => approveEdit(comparison.request.id)}>Approve & Merge Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function renderCompSection(title: string, items: Array<{ l: string; v: any }>) {
  return (
    <div className="mb-3">
      <h6 className="fw-bold text-muted text-uppercase small border-bottom pb-1 mb-2">{title}</h6>
      <div className="ps-2" style={{ borderLeft: '3px solid #e2e8f0' }}>
        {items.map((item, i) => (
          <div className="mb-2" key={i}><small className="text-muted d-block">{item.l}</small><div className="fw-bold">{item.v}</div></div>
        ))}
      </div>
    </div>
  );
}
