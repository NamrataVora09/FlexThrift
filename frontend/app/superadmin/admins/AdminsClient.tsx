'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Admin {
  id: number; name: string; email: string; mobile: string; role: string;
  is_blocked: string; is_verified: string; blocked_from_approvals: string;
  blocked_from_user_management: string; blocked_seller?: string; blocked_buyer?: string; created_at: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', borderTop: 'none', padding: '1.25rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', color: '#1e2022', fontSize: '0.875rem' };
const badgeSoftSuccess: React.CSSProperties = { background: 'rgba(0,201,167,0.1)', color: '#00c9a7', padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' };
const badgeSoftDanger: React.CSSProperties = { background: 'rgba(237,76,120,0.1)', color: '#ed4c78', padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' };
const badgeSoftWarning: React.CSSProperties = { background: 'rgba(255,157,0,0.1)', color: '#ff9d00', padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', marginBottom: '0.5rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', fontSize: '0.875rem', padding: '0.6rem 1rem', borderRadius: '0.5rem' };

export default function AdminsClient() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [userMgmtFilter, setUserMgmtFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = () => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString() ? `?${params}` : '';
    api.get<Admin[]>(`/superadmin/admins${qs}`).then((r) => {
      if (r.success && r.data) setAdmins(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); load(); };
  const handleReset = () => { setSearch(''); setStatusFilter(''); setApprovalFilter(''); setUserMgmtFilter(''); setTimeout(load, 0); };

  // Client-side filtering for approval/user_mgmt rights
  const filtered = admins.filter((a) => {
    if (approvalFilter === 'allowed' && Number(a.blocked_from_approvals)) return false;
    if (approvalFilter === 'blocked' && !Number(a.blocked_from_approvals)) return false;
    if (userMgmtFilter === 'allowed' && Number(a.blocked_from_user_management)) return false;
    if (userMgmtFilter === 'blocked' && !Number(a.blocked_from_user_management)) return false;
    return true;
  });

  // Selection
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleStatus = (id: number, isBlocked: string) => {
    const action = Number(isBlocked) ? 'activate' : 'suspend';
    confirmToast(`Are you sure you want to ${action} this admin?`, async () => {
      const res = await api.post(`/superadmin/toggle-admin-status/${id}`);
      if (res.success) {
        toast.success(`Admin ${action}d successfully`);
        load();
      } else {
        toast.error(res.message || 'Action failed');
      }
    }, action.charAt(0).toUpperCase() + action.slice(1));
  };

  const toggleRoleBlock = (id: number, role: string) => {
    const roleLabel = role === 'seller' ? 'seller' : 'buyer';
    const action = Number(admins.find(a => a.id === id)?.[role === 'seller' ? 'blocked_seller' : 'blocked_buyer']) ? 'unblock' : 'block';
    const message = `Are you sure you want to ${action} this admin from operating as a ${roleLabel}?`;
    confirmToast(message, async () => {
      const res = await api.post(`/superadmin/toggle-admin-rights/${id}/${role}`);
      if (res.success) {
        toast.success(`Admin ${action}ed from ${roleLabel} operations`);
        load();
      } else {
        toast.error(res.message || 'Action failed');
      }
    }, action.charAt(0).toUpperCase() + action.slice(1));
  };

  const deleteAdmin = (id: number) => {
    confirmToast('Are you sure you want to delete this admin? This cannot be undone.', async () => {
      const res = await api.post(`/superadmin/delete-admin/${id}`);
      if (res.success) {
        toast.success('Admin deleted successfully');
        load();
      } else {
        toast.error(res.message || 'Delete failed');
      }
    }, 'Delete');
  };

  const toggleRights = async (id: number, type: string) => {
    await api.post(`/superadmin/toggle-admin-rights/${id}/${type}`);
    load();
  };

  const bulkToggleRights = (type: string, action: string) => {
    const typeLabel = type === 'approval' ? 'approval' : 'user management';
    const actionLabel = action === 'grant' ? 'grant' : 'revoke';
    confirmToast(`This will ${actionLabel} ${typeLabel} rights for ALL administrators. Continue?`, async () => {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('action', action);
      const res = await api.post('/superadmin/bulk-toggle-admin-rights', fd);
      if (res.success) {
        toast.success(`Broad access ${actionLabel}ed successfully`);
        load();
      } else {
        toast.error(res.message || 'Bulk update failed');
      }
    }, actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1));
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api.post('/superadmin/create-admin', {
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      password: form.password
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Administrator created!');
      setShowModal(false);
      setForm({ name: '', email: '', mobile: '', password: '' });
      load();
    } else {
      toast.error(res.message || 'Failed to create admin');
    }
  };

  const getStatusBadge = (a: Admin) => {
    if (Number(a.is_blocked)) return <span style={badgeSoftDanger}><i className="bi bi-slash-circle me-1"></i>Suspended</span>;
    if (Number(a.is_verified)) return <span style={badgeSoftSuccess}><i className="bi bi-check-circle-fill me-1"></i>Active</span>;
    return <span style={badgeSoftWarning}><i className="bi bi-clock-history me-1"></i>Not Verified</span>;
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e2022', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-person-badge-fill" style={{ color: '#ffc63a' }}></i> Admin Management
            </h1>
            <p className="text-muted small mb-0">Manage administrative staff and their system access.</p>
          </div>
          <div className="d-flex gap-2">
            {/* Bulk Actions Dropdown */}
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle d-inline-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown"
                style={{ borderRadius: '0.5rem', fontWeight: 600, padding: '0.6rem 1.2rem' }}>
                <i className="bi bi-stack"></i> Bulk Actions
              </button>
              <ul className="dropdown-menu shadow-lg border-0" style={{ borderRadius: '0.75rem', padding: '0.5rem' }}>
                <li><h6 className="dropdown-header" style={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>Approval Rights</h6></li>
                <li><button className="dropdown-item rounded-2 py-2" onClick={() => bulkToggleRights('approval', 'grant')}><i className="bi bi-check-circle me-2 text-success"></i>Grant All</button></li>
                <li><button className="dropdown-item rounded-2 py-2 text-danger" onClick={() => bulkToggleRights('approval', 'revoke')}><i className="bi bi-x-circle me-2"></i>Revoke All</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><h6 className="dropdown-header" style={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>User Management</h6></li>
                <li><button className="dropdown-item rounded-2 py-2" onClick={() => bulkToggleRights('user_mgmt', 'grant')}><i className="bi bi-check-circle me-2 text-success"></i>Grant All</button></li>
                <li><button className="dropdown-item rounded-2 py-2 text-danger" onClick={() => bulkToggleRights('user_mgmt', 'revoke')}><i className="bi bi-x-circle me-2"></i>Revoke All</button></li>
              </ul>
            </div>

            <button className="btn d-inline-flex align-items-center gap-2 sa-filter-btn"
              style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, borderRadius: '0.5rem', padding: '0.6rem 1.5rem', border: 'none' }}
              onClick={() => setShowModal(true)}>
              <i className="bi bi-plus-circle"></i> Create New Admin
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f2f4' }}>
          <form onSubmit={handleFilter} className="row g-3 align-items-end">
            <div className="col-md-3">
              <label style={labelStyle}>Search Admin</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRight: 0, color: '#999' }}><i className="bi bi-search"></i></span>
                <input type="text" className="form-control shadow-none" placeholder="Name, Email, Mobile..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, borderLeft: 0, borderRadius: '0 0.5rem 0.5rem 0' }} />
              </div>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>Status</label>
              <select className="form-select shadow-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="unverified">Not Verified</option>
              </select>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>Approvals</label>
              <select className="form-select shadow-none" value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} style={inputStyle}>
                <option value="">All Rights</option>
                <option value="allowed">Allowed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>User Mgmt</label>
              <select className="form-select shadow-none" value={userMgmtFilter} onChange={(e) => setUserMgmtFilter(e.target.value)} style={inputStyle}>
                <option value="">All Rights</option>
                <option value="allowed">Allowed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="col-md-auto ms-auto">
              <div className="d-flex gap-2">
                <button type="submit" className="sa-filter-btn" style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                  <i className="bi bi-funnel"></i>
                </button>
                <button type="button" onClick={handleReset} className="sa-filter-reset-btn" style={{ background: '#fff', color: '#677788', fontWeight: 600, padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #e7eaf3', cursor: 'pointer' }}>
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Admins Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-white d-flex align-items-center justify-content-between" style={{ borderBottom: '1px solid #f1f2f4', padding: '1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Active Administrators</h5>
            {selected.size > 0 && (
              <span className="badge rounded-pill" style={{ background: '#ffc63a', color: '#212529', fontWeight: 700, padding: '0.4rem 0.8rem' }}>
                {selected.size} selected
              </span>
            )}
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 45, paddingLeft: '1.25rem' }}>
                        <input type="checkbox" className="form-check-input" checked={allSelected} onChange={toggleSelectAll}
                          style={{ cursor: 'pointer', width: 18, height: 18 }} />
                      </th>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Admin Info</th>
                      <th style={thStyle}>Mobile</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Approval Rights</th>
                      <th style={thStyle}>User Management</th>
                      <th style={thStyle}>Joined On</th>
                      <th style={{ ...thStyle, textAlign: 'end' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((a) => (
                      <tr key={a.id} style={{ background: selected.has(a.id) ? 'rgba(255,198,58,0.06)' : undefined }}>
                        <td style={{ ...tdStyle, paddingLeft: '1.25rem' }}>
                          <input type="checkbox" className="form-check-input" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)}
                            style={{ cursor: 'pointer', width: 18, height: 18 }} />
                        </td>
                        <td style={tdStyle}>#{a.id}</td>
                        <td style={tdStyle}>
                          <div className="d-flex align-items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1rem' }}>
                              {a.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-bold">{a.name}</div>
                              <div className="text-muted small">{a.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>{a.mobile}</td>
                        <td style={tdStyle}>{getStatusBadge(a)}</td>

                        {/* Approval Rights */}
                        <td style={tdStyle}>
                          {Number(a.blocked_from_approvals) ? (
                            <>
                              <span style={badgeSoftDanger}><i className="bi bi-x-octagon-fill me-1"></i>Revoked</span>
                              <button onClick={() => toggleRights(a.id, 'approval')} className="btn btn-sm btn-link p-0 small text-success ms-2">Restore</button>
                            </>
                          ) : (
                            <>
                              <span style={badgeSoftSuccess}><i className="bi bi-shield-check me-1"></i>Full Rights</span>
                              <button onClick={() => toggleRights(a.id, 'approval')} className="btn btn-sm btn-link p-0 small text-danger ms-2">Block</button>
                            </>
                          )}
                        </td>

                        {/* User Management */}
                        <td style={tdStyle}>
                          {Number(a.blocked_from_user_management) ? (
                            <>
                              <span style={badgeSoftDanger}><i className="bi bi-person-x-fill me-1"></i>Revoked</span>
                              <button onClick={() => toggleRights(a.id, 'user_mgmt')} className="btn btn-sm btn-link p-0 small text-success ms-2">Restore</button>
                            </>
                          ) : (
                            <>
                              <span style={badgeSoftSuccess}><i className="bi bi-person-check-fill me-1"></i>Allowed</span>
                              <button onClick={() => toggleRights(a.id, 'user_mgmt')} className="btn btn-sm btn-link p-0 small text-danger ms-2">Block</button>
                            </>
                          )}
                        </td>

                        <td style={tdStyle}>{new Date(a.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>

                        {/* Actions */}
                        <td style={{ ...tdStyle, textAlign: 'end' }}>
                          <div className="d-flex justify-content-end gap-1 flex-wrap">
                            <button onClick={() => toggleRoleBlock(a.id, 'seller')} 
                              className={`btn btn-sm rounded-pill px-2 fw-bold ${Number(a.blocked_seller) ? 'btn-danger' : 'btn-outline-danger'}`} 
                              title={Number(a.blocked_seller) ? 'Click to unblock from seller operations' : 'Click to block from seller operations'}>
                              <i className={`bi bi-shop${Number(a.blocked_seller) ? '-x' : ''} me-1`}></i>
                              {Number(a.blocked_seller) ? 'Unblock Seller' : 'Block Seller'}
                            </button>
                            <button onClick={() => toggleRoleBlock(a.id, 'buyer')} 
                              className={`btn btn-sm rounded-pill px-2 fw-bold ${Number(a.blocked_buyer) ? 'btn-danger' : 'btn-outline-danger'}`}
                              title={Number(a.blocked_buyer) ? 'Click to unblock from buyer operations' : 'Click to block from buyer operations'}>
                              <i className={`bi bi-bag${Number(a.blocked_buyer) ? '-x' : ''} me-1`}></i>
                              {Number(a.blocked_buyer) ? 'Unblock Buyer' : 'Block Buyer'}
                            </button>
                            <button onClick={() => toggleStatus(a.id, a.is_blocked)}
                              className={`btn btn-sm ${Number(a.is_blocked) ? 'btn-outline-success' : 'btn-outline-warning'} rounded-pill px-2`}>
                              <i className={`bi bi-${Number(a.is_blocked) ? 'person-check' : 'person-x'} me-1`}></i>
                              {Number(a.is_blocked) ? 'Activate' : 'Suspend'}
                            </button>
                            <button onClick={() => deleteAdmin(a.id)} className="btn btn-sm btn-outline-danger rounded-pill px-2">
                              <i className="bi bi-trash3 me-1"></i>Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} className="text-center py-5 text-muted small">No administrators found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f2f4', padding: '1.25rem' }}>
                <h5 className="modal-title fw-bold">Create New Admin</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={createAdmin}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.875rem', color: '#4b566b' }}>Full Name</label>
                    <input type="text" className="form-control" style={inputStyle} placeholder="Enter admin name" required
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.875rem', color: '#4b566b' }}>Email Address</label>
                    <input type="email" className="form-control" style={inputStyle} placeholder="admin@example.com" required
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.875rem', color: '#4b566b' }}>Mobile Number</label>
                    <input type="text" className="form-control" style={inputStyle} placeholder="+91 XXXXXXXXXX" required
                      value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.875rem', color: '#4b566b' }}>Password</label>
                    <input type="password" className="form-control" style={inputStyle} placeholder="••••••••" required
                      value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button type="button" className="btn btn-light py-2 px-4 rounded-pill" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn py-2 px-4 rounded-pill sa-filter-btn" disabled={submitting}
                    style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none' }}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Administrator'}
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
