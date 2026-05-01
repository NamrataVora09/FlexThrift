'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Plan {
  id: number; name: string; user_type: string; plan_type: string;
  limit_value: string; duration_hours: string; price: string; base_price: string; is_active: string; is_featured: string; is_most_selected: string; created_at: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1.1rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', marginBottom: '0.4rem' };
const modalLabel: React.CSSProperties = { fontWeight: 700, fontSize: '0.8rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const filterPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '2rem', background: 'rgba(255,198,58,0.08)', color: '#ffc63a', border: '1px solid rgba(255,198,58,0.2)' };

const emptyForm = { name: '', user_type: 'seller', plan_type: 'quantity', limit_value: '', duration_hours: '', price: '', base_price: '', is_featured: '0', is_most_selected: '0' };

export default function SubscriptionPlansAdmin() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Plan[]>('/shared/admin-subscription-plans').then((r) => {
      if (r.success && r.data) setPlans(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // Client-side filtering
  const filtered = useMemo(() => plans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && p.user_type !== filterRole) return false;
    if (filterType && p.plan_type !== filterType) return false;
    if (filterStatus !== '' && String(Number(p.is_active)) !== filterStatus) return false;
    return true;
  }), [plans, search, filterRole, filterType, filterStatus]);

  const hasFilters = search || filterRole || filterType || filterStatus !== '';

  const resetFilters = () => { setSearch(''); setFilterRole(''); setFilterType(''); setFilterStatus(''); };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (p: Plan) => {
    setEditId(p.id);
    setForm({ name: p.name, user_type: p.user_type, plan_type: p.plan_type, limit_value: p.limit_value, duration_hours: p.duration_hours, price: p.price, base_price: p.base_price, is_featured: String(p.is_featured ?? '0'), is_most_selected: String(p.is_most_selected ?? '0') });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    const basePrice = parseFloat(form.base_price) || price;
    if (basePrice < price) { toast.error('Base Original price cannot be less than Final price.'); return; }

    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
      base_price: parseFloat(form.base_price) || parseFloat(form.price),
      duration_hours: parseFloat(form.duration_hours) || 0,
      limit_value: parseInt(form.limit_value) || 0,
      is_featured: parseInt(form.is_featured) || 0,
    };
    if (editId) {
      await api.post(`/shared/admin-subscription-plans/${editId}/update`, payload);
    } else {
      await api.post('/shared/admin-subscription-plans', payload);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const togglePlan = async (id: number) => {
    await api.post(`/shared/admin-subscription-plans/${id}/toggle`);
    load();
  };

  const toggleFeatured = async (id: number) => {
    await api.post(`/shared/admin-subscription-plans/${id}/toggle-featured`, {});
    load();
  };

  const toggleMostSelected = async (id: number) => {
    await api.post(`/shared/admin-subscription-plans/${id}/toggle-most-selected`, {});
    load();
  };

  const deletePlan = async (id: number) => {
    confirmToast('Deleting this plan might affect users currently on it! Are you sure?', async () => {
      const res = await api.post(`/shared/admin-subscription-plans/${id}/delete`);
      if (res.success) {
        toast.success('Plan deleted');
        load();
      } else {
        toast.error(res.message || 'Delete failed');
      }
    }, 'Delete');
  };

  const limitLabel = form.user_type === 'seller' ? 'Upload Limit (Qty)' : 'Contact View Limit (Qty)';

  return (
    <DashboardLayout requiredRoles={['super_admin', 'admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-card-checklist" style={{ color: '#ffc63a' }}></i> Subscription Models
            </h1>
            <p className="text-muted small mb-0">Define flexible pricing and limits for Buyers and Sellers.</p>
          </div>
          <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={openCreate}>
            <i className="bi bi-plus-lg"></i> Create New Plan
          </button>
        </div>

        <BulkCsvUpload
          endpoint="/superadmin/bulk-upload-subscription-plans"
          templateCsv="name,user_type,plan_type,limit_value,duration_hours,price,base_price\nStarter Buyer,buyer,duration,5,720,99,149\nPro Seller,seller,limit,20,0,299,399"
          templateFilename="subscription_plans_template.csv"
          formatGuide="name (required), user_type (required: buyer/seller), plan_type (duration/limit), limit_value, duration_hours, price (required), base_price"
          title="Bulk Upload Subscription Plans"
        />

        {/* Filter Card */}
        <div className="card mb-4 border-0" style={{ borderRadius: '1rem', padding: '1.25rem 1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f2f4' }}>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label style={labelStyle}>Search Plan</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRight: 0, color: '#999', fontSize: '0.85rem' }}><i className="bi bi-search"></i></span>
                <input className="form-control shadow-none" style={{ ...inputStyle, borderLeft: 0, borderRadius: '0 0.5rem 0.5rem 0' }} placeholder="Plan name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>Target Role</label>
              <select className="form-select shadow-none" style={inputStyle} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>Plan Type</label>
              <select className="form-select shadow-none" style={inputStyle} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="quantity">Quantity</option>
                <option value="duration">Duration</option>
              </select>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>Status</label>
              <select className="form-select shadow-none" style={inputStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="col-md-auto ms-auto">
              <div className="d-flex gap-2">
                <button className="sa-filter-btn" style={{ ...btnGold, padding: '0.55rem 1rem', height: 40, display: 'flex', alignItems: 'center' }}>
                  <i className="bi bi-funnel me-1"></i> Filter
                </button>
                <button className="sa-filter-reset-btn" onClick={resetFilters} style={{ background: '#fff', color: '#677788', fontWeight: 600, padding: '0.55rem 1rem', borderRadius: '0.5rem', border: '1px solid #e7eaf3', height: 40, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>
            </div>
          </div>
          {hasFilters && (
            <div className="d-flex flex-wrap gap-1 mt-3" style={{ alignItems: 'center' }}>
              <small className="text-muted fw-bold me-1" style={{ fontSize: '0.7rem', lineHeight: 1.8 }}>ACTIVE:</small>
              {search && <span style={filterPill}><i className="bi bi-search"></i> &quot;{search}&quot;</span>}
              {filterRole && <span style={filterPill}><i className="bi bi-person"></i> {filterRole.charAt(0).toUpperCase() + filterRole.slice(1)}</span>}
              {filterType && <span style={filterPill}><i className="bi bi-tag"></i> {filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>}
              {filterStatus !== '' && <span style={filterPill}><i className="bi bi-toggle-on"></i> {filterStatus === '1' ? 'Active' : 'Inactive'}</span>}
            </div>
          )}
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
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Plan Name</th>
                    <th style={thStyle}>Target Role</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Limit</th>
                    <th style={thStyle}>Duration</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Base Price</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((p) => (
                      <tr key={p.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }} className="fw-bold">
                          {p.name}
                          {String(p.is_featured) === '1' && (
                            <span style={{ marginLeft: 6, background: '#D7B467', color: '#fff', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '9999px' }}>
                              Premium
                            </span>
                          )}
                          {String(p.is_most_selected) === '1' && (
                            <span style={{ marginLeft: 4, background: '#1a1a1a', color: '#ffc63a', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '9999px' }}>
                              Most Selected
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span className="badge px-3 py-2" style={p.user_type === 'seller' ? { background: 'rgba(13,202,240,0.1)', color: '#0dcaf0', fontWeight: 600 } : { background: 'rgba(255,193,7,0.1)', color: '#ffc107', fontWeight: 600 }}>
                            {p.user_type.charAt(0).toUpperCase() + p.user_type.slice(1)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className="badge px-3 py-2" style={{ background: 'rgba(255,198,58,0.1)', color: '#ffc63a', fontWeight: 600 }}>
                            {p.plan_type.charAt(0).toUpperCase() + p.plan_type.slice(1)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {p.plan_type === 'duration' ? (
                            <span className="text-muted">Unlimited</span>
                          ) : (
                            <span className="fw-bold text-dark">{p.limit_value}</span>
                          )}
                          {' '}<small className="text-muted">{p.user_type === 'seller' ? 'Uploads' : 'Contacts'}</small>
                        </td>
                        <td style={tdStyle}>
                          {p.plan_type === 'quantity' ? (
                            Number(p.duration_hours) > 0 ? <>{Number(p.duration_hours).toFixed(2)} Hours</> : <span className="badge bg-light text-dark">No Expiry</span>
                          ) : (
                            <>{Number(p.duration_hours).toFixed(2)} Hours</>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: '#ffc63a', fontWeight: 700 }}>
                          ₹{Number(p.price).toFixed(2)}
                        </td>
                        <td style={tdStyle} className="text-muted">
                          <del>₹{Number(p.base_price).toFixed(2)}</del>
                        </td>
                        <td style={tdStyle}>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" checked={Number(p.is_active) === 1}
                              onChange={() => togglePlan(p.id)} style={{ cursor: 'pointer', width: 38, height: 20 }} />
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          {isSuperAdmin && (
                            <>
                              <button
                                className="btn btn-sm border me-1"
                                style={{ borderRadius: 8, background: String(p.is_featured) === '1' ? '#D7B467' : '#f8f9fa', color: String(p.is_featured) === '1' ? '#fff' : '#D7B467', borderColor: '#D7B467' }}
                                onClick={() => toggleFeatured(p.id)}
                                title={String(p.is_featured) === '1' ? 'Remove Premium' : 'Mark as Premium'}
                              >
                                <i className="bi bi-gem"></i>
                              </button>
                              <button
                                className="btn btn-sm border me-1"
                                style={{ borderRadius: 8, background: String(p.is_most_selected) === '1' ? '#1a1a1a' : '#f8f9fa', color: String(p.is_most_selected) === '1' ? '#ffc63a' : '#6c757d', borderColor: String(p.is_most_selected) === '1' ? '#1a1a1a' : '#dee2e6' }}
                                onClick={() => toggleMostSelected(p.id)}
                                title={String(p.is_most_selected) === '1' ? 'Remove Most Selected' : 'Mark as Most Selected'}
                              >
                                <i className={`bi ${String(p.is_most_selected) === '1' ? 'bi-star-fill' : 'bi-star'}`}></i>
                              </button>
                            </>
                          )}
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => openEdit(p)} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => deletePlan(p.id)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} className="text-center py-5">
                          <i className="bi bi-card-checklist" style={{ fontSize: '2.5rem', color: '#ddd' }}></i>
                          <p className="text-muted mt-2">No subscription plans {hasFilters ? 'match your filters' : 'created yet'}.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#f8f9fa', borderRadius: '0.75rem 0.75rem 0 0' }}>
                <h5 className="modal-title fw-bold">{editId ? 'Edit' : 'Create'} Subscription Plan</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {/* Plan Name */}
                  <div className="mb-3">
                    <label style={modalLabel}>Plan Name</label>
                    <input className="form-control" style={inputStyle} placeholder="e.g. Starter Pack, Pro Seller" required
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>

                  {/* User Role + Plan Type */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label style={modalLabel}>User Role</label>
                      <select className="form-select" style={inputStyle} value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })}>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="both">Both</option>
                        <option value="delivery">Delivery</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label style={modalLabel}>Plan Type</label>
                      <select className="form-select" style={inputStyle} value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}>
                        <option value="quantity">Quantity Based</option>
                        <option value="duration">Fixed Duration (Unlimited)</option>
                      </select>
                    </div>
                  </div>

                  {/* Limit + Validity */}
                  <div className="row g-3 mb-3">
                    {form.plan_type !== 'duration' && (
                      <div className="col-6">
                        <label style={modalLabel}>{limitLabel}</label>
                        <input type="number" className="form-control" style={inputStyle} placeholder="e.g. 4" min="0"
                          value={form.limit_value} onChange={(e) => setForm({ ...form, limit_value: e.target.value })} />
                      </div>
                    )}
                    <div className={form.plan_type === 'duration' ? 'col-12' : 'col-6'}>
                      <label style={modalLabel}>Validity (Hours)</label>
                      <input type="number" step="0.5" className="form-control" style={inputStyle} placeholder="e.g. 720 or 0.5" min="0"
                        value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
                    </div>
                  </div>

                  {/* Price + Base Price */}
                  <div className="row g-3">
                    <div className="col-6">
                      <label style={modalLabel}>Final Price (₹)</label>
                      <div className="input-group">
                        <span className="input-group-text" style={{ background: '#f8f9fa' }}>₹</span>
                        <input type="number" step="0.01" className="form-control" style={inputStyle} placeholder="0.00" required min="0"
                          value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-6">
                      <label style={modalLabel}>Base Price (₹)</label>
                      <div className="input-group">
                        <span className="input-group-text" style={{ background: '#f8f9fa' }}>₹</span>
                        <input type="number" step="0.01" className="form-control" style={inputStyle} placeholder="0.00" min="0"
                          value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Premium + Most Selected — super_admin only */}
                  {isSuperAdmin && (
                    <div className="mt-3 d-flex flex-column gap-2">
                      <div className="p-3 rounded-3" style={{ background: '#fffdf0', border: '1px solid #fde68a' }}>
                        <div className="form-check form-switch d-flex align-items-center gap-2 mb-0">
                          <input className="form-check-input" type="checkbox" role="switch" id="isFeaturedSwitch"
                            checked={form.is_featured === '1'}
                            onChange={(e) => setForm({ ...form, is_featured: e.target.checked ? '1' : '0' })}
                            style={{ width: '2.5rem', height: '1.3rem', cursor: 'pointer' }} />
                          <label className="form-check-label fw-bold small" htmlFor="isFeaturedSwitch" style={{ cursor: 'pointer' }}>
                            <i className="bi bi-gem me-1" style={{ color: '#D7B467' }} />
                            Mark as <span style={{ color: '#D7B467' }}>Premium</span>
                            <span className="d-block text-muted fw-normal" style={{ fontSize: '0.72rem' }}>Only one plan per user type can be Premium.</span>
                          </label>
                        </div>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
                        <div className="form-check form-switch d-flex align-items-center gap-2 mb-0">
                          <input className="form-check-input" type="checkbox" role="switch" id="isMostSelectedSwitch"
                            checked={form.is_most_selected === '1'}
                            onChange={(e) => setForm({ ...form, is_most_selected: e.target.checked ? '1' : '0' })}
                            style={{ width: '2.5rem', height: '1.3rem', cursor: 'pointer' }} />
                          <label className="form-check-label fw-bold small" htmlFor="isMostSelectedSwitch" style={{ cursor: 'pointer' }}>
                            <i className="bi bi-star-fill me-1" style={{ color: '#ffc63a' }} />
                            Mark as <span style={{ color: '#1a1a1a' }}>Most Selected</span>
                            <span className="d-block text-muted fw-normal" style={{ fontSize: '0.72rem' }}>Multiple plans per user type can have this badge.</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-0" style={{ background: '#f8f9fa' }}>
                  <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4" style={btnGold} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Plan'}
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
