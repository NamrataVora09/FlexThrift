'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Coupon {
  id: number; code: string; discount_type: string; discount_value: string;
  min_order_amount: string; max_discount: string | null; usage_limit: string;
  used_count: string; valid_until: string | null; is_active: string; created_at: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1.1rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const modalLabel: React.CSSProperties = { fontWeight: 700, fontSize: '0.8rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

const emptyForm = { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '0', max_discount: '', usage_limit: '', valid_until: '' };

export default function CouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Coupon[]>('/shared/coupons').then((r) => { if (r.success && r.data) setCoupons(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
      min_order_amount: c.min_order_amount, max_discount: c.max_discount || '',
      usage_limit: c.usage_limit || '', valid_until: c.valid_until ? c.valid_until.split(' ')[0] : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = editId 
      ? await api.post(`/shared/coupons/${editId}/update`, form)
      : await api.post('/shared/coupons', form);
    setSaving(false);
    if (res.success) {
      toast.success(editId ? 'Coupon updated' : 'Coupon created');
      setShowModal(false);
      load();
    } else {
      toast.error(res.message || 'Failed to save');
    }
  };

  const toggleCoupon = async (id: number) => {
    await api.post(`/shared/coupons/${id}/toggle`);
    load();
  };

  const deleteCoupon = (id: number) => {
    confirmToast('This coupon will be permanently deleted! Are you sure?', async () => {
      const res = await api.post(`/shared/coupons/${id}/delete`);
      if (res.success) {
        toast.success('Coupon deleted');
        load();
      } else {
        toast.error(res.message || 'Error deleting coupon');
      }
    }, 'Delete');
  };

  const activeCoupons = coupons.filter(c => Number(c.is_active)).length;

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-ticket-perforated" style={{ color: '#ffc63a' }}></i> Coupon Management
            </h1>
            <p className="text-muted small mb-0">Create and manage discounts for subscription plans.</p>
          </div>
          <div className="d-flex gap-2">
            <div className="bg-white p-2 px-3 rounded shadow-sm d-flex align-items-center border" style={{ borderRadius: '0.5rem' }}>
              <span className="text-muted small me-2">Active Coupons:</span>
              <span className="fw-bold" style={{ color: '#ffc63a' }}>{activeCoupons}</span>
            </div>
            <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={openCreate}>
              <i className="bi bi-plus-lg"></i> Create New Coupon
            </button>
          </div>
        </div>

        <BulkCsvUpload
          endpoint="/superadmin/bulk-upload-coupons"
          templateCsv="code,discount_type,discount_value,min_order_amount,max_discount,usage_limit,valid_from,valid_until\nSAVE20,percentage,20,500,200,100,2026-01-01,2026-12-31\nFLAT50,fixed,50,200,,50,,"
          templateFilename="coupons_template.csv"
          formatGuide="code (required), discount_type (percentage/fixed), discount_value (required), min_order_amount, max_discount, usage_limit, valid_from, valid_until"
          title="Bulk Upload Coupons"
        />

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Code</th>
                    <th style={thStyle}>Discount</th>
                    <th style={thStyle}>Usage</th>
                    <th style={thStyle}>Min Purchase</th>
                    <th style={thStyle}>Max Discount</th>
                    <th style={thStyle}>Expires At</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {coupons.length > 0 ? coupons.map((c) => (
                      <tr key={c.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }} className="fw-bold" >
                          <span style={{ color: '#ffc63a', fontFamily: 'monospace', fontSize: '0.95rem' }}>{c.code}</span>
                        </td>
                        <td style={tdStyle}>
                          <span className="badge px-3 py-2" style={{ background: 'rgba(25,135,84,0.1)', color: '#198754', fontWeight: 600 }}>
                            {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${Number(c.discount_value).toFixed(2)}`}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <small className="text-muted">Limit: {Number(c.usage_limit) ? c.usage_limit : '∞'}</small>
                        </td>
                        <td style={tdStyle}>₹{Number(c.min_order_amount).toFixed(2)}</td>
                        <td style={tdStyle}>
                          {c.max_discount ? `₹${Number(c.max_discount).toFixed(2)}` : <span className="text-muted">N/A</span>}
                        </td>
                        <td style={tdStyle}>
                          {c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : <span className="text-muted">Never</span>}
                        </td>
                        <td style={tdStyle}>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch"
                              checked={Number(c.is_active) === 1} onChange={() => toggleCoupon(c.id)}
                              style={{ cursor: 'pointer', width: 38, height: 20 }} />
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => openEdit(c)} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => deleteCoupon(c.id)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="text-center py-5">
                        <i className="bi bi-ticket-perforated" style={{ fontSize: '2.5rem', color: '#ddd' }}></i>
                        <p className="text-muted mt-2">No coupons created yet.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#f8f9fa', borderRadius: '0.75rem 0.75rem 0 0' }}>
                <h5 className="modal-title fw-bold">{editId ? 'Edit' : 'Create'} Coupon</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {/* Code */}
                  <div className="mb-3">
                    <label style={modalLabel}>Coupon Code</label>
                    <input className="form-control text-uppercase" style={inputStyle} placeholder="e.g. SAVE20, WELCOME50" required
                      value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                  </div>

                  {/* Discount Type + Value */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label style={modalLabel}>Discount Type</label>
                      <select className="form-select" style={inputStyle} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label style={modalLabel}>Discount Value</label>
                      <input type="number" step="0.01" className="form-control" style={inputStyle} required
                        value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                    </div>
                  </div>

                  {/* Min Purchase + Max Discount */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label style={modalLabel}>Min Purchase (₹)</label>
                      <input type="number" className="form-control" style={inputStyle}
                        value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label style={modalLabel}>Max Discount (₹)</label>
                      <input type="number" className="form-control" style={inputStyle} placeholder="Optional"
                        value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
                    </div>
                  </div>

                  {/* Usage Limit + Expiry */}
                  <div className="row g-3">
                    <div className="col-6">
                      <label style={modalLabel}>Usage Limit</label>
                      <input type="number" className="form-control" style={inputStyle} placeholder="Optional"
                        value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label style={modalLabel}>Expiry Date</label>
                      <input type="date" className="form-control" style={inputStyle}
                        value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0" style={{ background: '#f8f9fa' }}>
                  <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4" style={btnGold} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
