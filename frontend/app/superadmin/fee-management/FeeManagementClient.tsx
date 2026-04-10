'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Charge { id: number; charge_name: string; charge_type: string; charge_value: string; is_active: string; created_at: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.8rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

export default function FeeManagementClient() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ charge_name: '', charge_type: 'percentage', charge_value: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Charge[]>('/superadmin/platform-charges').then((r) => {
      if (r.success && r.data) setCharges(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ charge_name: '', charge_type: 'percentage', charge_value: '' }); setShowModal(true); };
  const openEdit = (c: Charge) => { setEditId(c.id); setForm({ charge_name: c.charge_name, charge_type: c.charge_type ?? 'percentage', charge_value: String(c.charge_value ?? '') }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    if (editId) {
      await api.post(`/superadmin/update-charge/${editId}`, form);
    } else {
      await api.post('/superadmin/create-charge', form);
    }
    setSubmitting(false); setShowModal(false); load();
  };

  const handleDelete = async (id: number) => {
    confirmToast('Delete this charge?', async () => {
      const res = await api.post(`/superadmin/delete-charge/${id}`);
      if (res.success) {
        toast.success('Charge deleted');
        load();
      } else {
        toast.error(res.message || 'Delete failed');
      }
    }, 'Delete');
  };


  const toggleActive = async (c: Charge) => {
    await api.post(`/superadmin/update-charge/${c.id}`, { is_active: Number(c.is_active) ? 0 : 1 });
    load();
  };

  const isPercentage = (c: Charge) => c.charge_type === 'percentage';
  const activeCharges = charges.filter(c => Number(c.is_active));

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-cash-coin" style={{ color: '#ffc63a' }}></i> Fee Management
            </h1>
            <p className="text-muted small mb-0">Manage platform charges like GST, convenience fee, etc. Active charges are applied to billing.</p>
          </div>
          <button className="btn d-flex align-items-center gap-2" style={btnGold} onClick={openCreate}>
            <i className="bi bi-plus-lg"></i> Add Charge
          </button>
        </div>

        {/* Summary */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 p-3" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 45, height: 45, borderRadius: 12, background: 'rgba(255,198,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffc63a', fontSize: '1.2rem' }}><i className="bi bi-receipt"></i></div>
                <div><div className="text-muted small">Total Charges</div><div className="fw-bold fs-5">{charges.length}</div></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 p-3" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 45, height: 45, borderRadius: 12, background: 'rgba(25,135,84,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#198754', fontSize: '1.2rem' }}><i className="bi bi-check-circle"></i></div>
                <div><div className="text-muted small">Active</div><div className="fw-bold fs-5">{activeCharges.length}</div></div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 p-3" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 45, height: 45, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '1.2rem' }}><i className="bi bi-percent"></i></div>
                <div><div className="text-muted small">Total % Deduction</div><div className="fw-bold fs-5">{activeCharges.filter(c => isPercentage(c)).reduce((s, c) => s + Number(c.charge_value), 0)}%</div></div>
              </div>
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
                  <thead><tr>
                    <th style={thStyle}>Charge Name</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Value</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {charges.length > 0 ? charges.map((c) => (
                      <tr key={c.id}>
                        <td style={tdStyle} className="fw-bold">{c.charge_name}</td>
                        <td style={tdStyle}><span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: '0.7rem' }}>{c.charge_type}</span></td>
                        <td style={tdStyle} className="fw-bold">{isPercentage(c) ? `${c.charge_value}%` : `₹${Number(c.charge_value).toLocaleString()}`}</td>
                        <td style={tdStyle}>
                          <span className="badge px-3 py-2" style={Number(c.is_active) ? { background: 'rgba(25,135,84,0.1)', color: '#198754', fontWeight: 600 } : { background: 'rgba(220,53,69,0.1)', color: '#dc3545', fontWeight: 600 }}>
                            {Number(c.is_active) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end' }}>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => openEdit(c)}><i className="bi bi-pencil"></i></button>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => toggleActive(c)}><i className={`bi ${Number(c.is_active) ? 'bi-pause-circle' : 'bi-play-circle'}`}></i></button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => handleDelete(c.id)}><i className="bi bi-trash"></i></button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-5 text-muted">No charges configured yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-cash-coin me-2" style={{ color: '#ffc63a' }}></i>{editId ? 'Edit' : 'Add'} Charge</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="mb-3"><label style={labelStyle}>Charge Name</label><input className="form-control" style={inputStyle} placeholder="e.g. Platform Fee, GST, Convenience Fee" required value={form.charge_name} onChange={(e) => setForm({ ...form, charge_name: e.target.value })} /></div>
                  <div className="mb-3"><label style={labelStyle}>Charge Type</label>
                    <select className="form-select" style={inputStyle} value={form.charge_type} onChange={(e) => setForm({ ...form, charge_type: e.target.value })}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="mb-0"><label style={labelStyle}>Value</label><input type="number" step="0.01" min="0" className="form-control" style={inputStyle} placeholder={form.charge_type === 'percentage' ? 'e.g. 18' : 'e.g. 50'} required value={form.charge_value} onChange={(e) => setForm({ ...form, charge_value: e.target.value })} /></div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn" style={btnGold} disabled={submitting}>{submitting ? 'Saving...' : editId ? 'Update Charge' : 'Create Charge'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
