'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';
import { useAuth } from '@/lib/auth-context';

interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  pin_code?: string;
  user_type: string;
  role: string;
  is_blocked: number;
  is_verified: number;
  reliability_score: number;
  buyer_rating_avg: number;
  buyer_rating_count: number;
  seller_rating_avg: number;
  seller_rating_count: number;
  blocked_seller: number;
  blocked_buyer: number;
  products_uploaded_count: number;
  created_at: string;
}

interface AuditLog {
  action_type: string;
  action_details: string;
  admin_name: string | null;
  created_at: string;
}

interface Props {
  role: string;
  apiPath: string;
  searchable?: boolean;
}

const AVATAR_COLORS = ['#377dff', '#ffc63a', '#7000ff', '#ed4c78', '#ff9d00'];

export default function UsersView({ role, apiPath, searchable = false }: Props) {
  const { toastSuccess, toastError } = useToast();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Check permissions for admin
  const isBlockedFromMgmt = authUser?.role === 'admin' && Number(authUser?.blocked_from_user_management) === 1;

  // Audit modal state
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditUser, setAuditUser] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    params.set('_t', Date.now().toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.get<User[]>(`${apiPath}${qs}`).then((r) => {
      if (r.success && r.data) setUsers(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { 
    if (!isBlockedFromMgmt) {
      load(); 
    }
  }, [apiPath, isBlockedFromMgmt]);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); load(); };
  const handleReset = () => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setTimeout(load, 0); };

  const apiBase = apiPath.substring(0, apiPath.lastIndexOf('/'));

  const toggleStatus = async (id: number) => {
    confirmToast('Are you sure you want to toggle this user\'s status?', async () => {
      const res = await api.post(`${apiBase}/toggle-user-status/${id}`);
      if (res.success) {
        toastSuccess('user_status_update_success', 'Status updated');
        load();
      } else {
        toastError('user_status_update_failed', res.message || 'Failed');
      }
    });
  };

  const toggleRoleBlock = async (id: number, r: string) => {
    confirmToast(`Toggle ${r} role access for this user?`, async () => {
      const res = await api.post(`${apiBase}/toggle-role-block/${id}/${r}`);
      if (res.success) {
        toastSuccess('user_role_access_update_success', 'Role access updated');
        load();
      } else {
        toastError('user_role_access_update_failed', res.message || 'Failed');
      }
    });
  };

  const viewAuditLogs = async (userId: number, name: string) => {
    setAuditUser(name);
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditLogs([]);
    const res = await api.get<AuditLog[]>(`${apiBase}/user-audit-logs/${userId}`);
    if (res.success && res.data) setAuditLogs(res.data);
    setAuditLoading(false);
  };

  const getStatusBadge = (u: User) => {
    if (Number(u.is_blocked)) return (
      <span style={{ padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(237,76,120,0.1)', color: '#ed4c78' }}>
        <i className="bi bi-slash-circle me-1"></i>Suspended
      </span>
    );
    if (!Number(u.is_verified)) return (
      <span style={{ padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(255,157,0,0.1)', color: '#ff9d00' }}>
        <i className="bi bi-clock-history me-1"></i>Not Verified
      </span>
    );
    return (
      <span style={{ padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(0,201,167,0.1)', color: '#00c9a7' }}>
        <i className="bi bi-check-circle-fill me-1"></i>Active
      </span>
    );
  };

  const getAuditBadgeColor = (type: string) => {
    if (type.includes('block')) return 'danger';
    if (type.includes('unblock') || type.includes('cleared')) return 'success';
    if (type.includes('switch')) return 'primary';
    return 'secondary';
  };

  const parseAuditDetails = (raw: string) => {
    try {
      const d = JSON.parse(raw);
      return d.details || d.summary || raw;
    } catch { return raw; }
  };

  if (isBlockedFromMgmt) {
    return (
      <DashboardLayout requiredRoles={[role]}>
        <div className="container-fluid d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="text-center p-5 bg-white shadow-sm" style={{ borderRadius: 20, maxWidth: 500 }}>
            <div className="mb-4">
              <i className="bi bi-shield-lock-fill" style={{ fontSize: '4rem', color: '#ed4c78' }}></i>
            </div>
            <h2 className="fw-bold mb-3" style={{ color: '#1a202c' }}>Access Restricted</h2>
            <p className="text-muted mb-4">
              Your administrative account has been restricted from accessing User Management by the Super Admin.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button onClick={() => window.history.back()} className="btn px-4 py-2" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: 10, fontWeight: 600 }}>
                Go Back
              </button>
              <button onClick={() => window.location.href = '/admin'} className="btn px-4 py-2" style={{ background: '#ffc63a', color: '#212529', borderRadius: 10, fontWeight: 600 }}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #ffc63a, #e6b035)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 15, marginBottom: '0.5rem' }}>
            <i className="bi bi-people-fill" style={{ WebkitTextFillColor: '#ffc63a' }}></i> User Management
          </h1>
          <p className="text-muted">Monitor, filter, and manage all users across the Flex platform.</p>
        </div>

        {/* Filter Card */}
        {searchable && (
          <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
            <form onSubmit={handleFilter} className="row g-3 align-items-end">
              <div className="col-md-4">
                <label style={{ color: '#677788', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.5rem', display: 'block' }}>Search User</label>
                <div className="input-group">
                  <span className="input-group-text" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRight: 0, color: '#999' }}><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control shadow-none" placeholder="Name, Email or Mobile..." value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderLeft: 0, color: '#1a202c', borderRadius: '0 10px 10px 0', padding: '0.65rem 1rem' }} />
                </div>
              </div>
              <div className="col-md-2">
                <label style={{ color: '#677788', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.5rem', display: 'block' }}>User Role</label>
                <select className="form-select shadow-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', color: '#1a202c', borderRadius: 10, padding: '0.65rem 1rem' }}>
                  <option value="">All Roles</option>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="col-md-2">
                <label style={{ color: '#677788', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.5rem', display: 'block' }}>Status</label>
                <select className="form-select shadow-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', color: '#1a202c', borderRadius: 10, padding: '0.65rem 1rem' }}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="unverified">Not Verified</option>
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn w-100 sa-filter-btn" style={{ fontWeight: 700, borderRadius: 10, padding: '0.65rem 1.5rem', background: '#ffc63a', color: '#212529', border: 'none' }}>
                  <i className="bi bi-funnel-fill me-2"></i>Apply
                </button>
              </div>
              <div className="col-md-2">
                <button type="button" onClick={handleReset} className="btn w-100 sa-filter-reset-btn" style={{ borderRadius: 10, padding: '0.65rem 1.5rem', fontWeight: 600, background: '#fff', color: '#677788', border: '1px solid #e7eaf3' }}>
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table Card */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold">User Records</h5>
            <span className="badge rounded-pill bg-light text-dark px-3 py-2" style={{ fontWeight: 800 }}>Total: {users.length}</span>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      {['User Details', 'Role & Type', 'Ratings', 'Activity', 'Status', ''].map((h, i) => (
                        <th key={i} className={i === 0 ? 'ps-4' : i === 5 ? 'text-end pe-4' : ''}
                          style={{ backgroundColor: '#f7fafc', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1, color: '#4a5568', border: 'none', padding: '1.25rem 1rem' }}>
                          {h === '' ? 'Actions' : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? users.map((u) => {
                      const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
                      const isActive = !Number(u.is_blocked) && Number(u.is_verified);
                      return (
                        <tr key={u.id}>
                          {/* User Details */}
                          <td className="ps-4" style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            <div className="d-flex align-items-center gap-3">
                              <div style={{ width: 45, height: 45, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '1.1rem', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', background: color }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-bold" style={{ fontSize: '1rem' }}>{u.name}</div>
                                <div className="text-muted small"><i className="bi bi-envelope me-1"></i>{u.email}</div>
                                <div className="text-muted small"><i className="bi bi-phone me-1"></i>{u.mobile}</div>
                                {u.address && (
                                  <div className="text-muted small text-truncate" style={{ maxWidth: 200 }} title={u.address}>
                                    <i className="bi bi-geo-alt me-1"></i>{u.address} {u.pin_code && `(${u.pin_code})`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role & Type */}
                          <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            <div className="mb-1">
                              <span style={{ padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(55,125,255,0.1)', color: '#377dff' }}>
                                {u.user_type}
                              </span>
                            </div>
                            <span style={{ padding: '0.5rem 0.85rem', borderRadius: 8, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(112,0,255,0.1)', color: '#7000ff' }}>
                              {u.role || u.user_type}
                            </span>
                            <div className="mt-2 d-flex flex-wrap gap-1">
                              {Number(u.blocked_seller) === 1 && (
                                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, fontSize: '0.65rem', background: 'rgba(237,76,120,0.1)', color: '#ed4c78', border: '1px solid rgba(237,76,120,0.2)' }}>
                                  <i className="bi bi-shop me-1"></i>Seller Role Blocked
                                </span>
                              )}
                              {Number(u.blocked_buyer) === 1 && (
                                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, fontSize: '0.65rem', background: 'rgba(237,76,120,0.1)', color: '#ed4c78', border: '1px solid rgba(237,76,120,0.2)' }}>
                                  <i className="bi bi-bag me-1"></i>Buyer Role Blocked
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ratings */}
                          <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            {(u.user_type === 'buyer' || u.user_type === 'both') && (
                              <div className="d-flex align-items-center gap-1 mb-1" style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2d3748' }}>
                                <i className="bi bi-star-fill text-warning"></i>
                                B: {Number(u.buyer_rating_avg || 0).toFixed(1)} ({u.buyer_rating_count || 0})
                              </div>
                            )}
                            {(u.user_type === 'seller' || u.user_type === 'both') && (
                              <div className="d-flex align-items-center gap-1" style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2d3748' }}>
                                <i className="bi bi-shop" style={{ color: '#ffc63a' }}></i>
                                S: {Number(u.seller_rating_avg || 0).toFixed(1)} ({u.seller_rating_count || 0})
                              </div>
                            )}
                          </td>

                          {/* Activity */}
                          <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            <div className="small fw-semibold mb-1">
                              <i className="bi bi-box-seam me-1 text-muted"></i>
                              {u.products_uploaded_count ?? 0} Products
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-calendar-event me-1"></i>
                              Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            {getStatusBadge(u)}
                          </td>

                          {/* Actions */}
                          <td className="text-end pe-4" style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #edf2f7' }}>
                            <div className="d-flex justify-content-end gap-2">
                              {/* Role management dropdown */}
                              <div className="dropdown d-inline-block">
                                <button className="btn btn-sm" type="button" data-bs-toggle="dropdown" title="Role Management"
                                  style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #edf2f7', background: '#fff', color: '#718096', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                  <i className="bi bi-shield-check"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0">
                                  <li className="dropdown-header fw-bold">Manage Role Switching</li>
                                  {(u.user_type === 'seller' || u.user_type === 'both') && (
                                    <li>
                                      <button className="dropdown-item py-2" onClick={() => toggleRoleBlock(u.id, 'seller')}>
                                        <i className="bi bi-shop me-2" style={{ color: '#ffc63a' }}></i>
                                        {Number(u.blocked_seller) ? 'Unblock' : 'Block'} Seller Role
                                      </button>
                                    </li>
                                  )}
                                  {(u.user_type === 'buyer' || u.user_type === 'both') && (
                                    <li>
                                      <button className="dropdown-item py-2" onClick={() => toggleRoleBlock(u.id, 'buyer')}>
                                        <i className="bi bi-bag me-2 text-info"></i>
                                        {Number(u.blocked_buyer) ? 'Unblock' : 'Block'} Buyer Role
                                      </button>
                                    </li>
                                  )}
                                </ul>
                              </div>

                              {/* Toggle status */}
                              <button onClick={() => toggleStatus(u.id)} title={isActive ? 'Suspend' : 'Activate'}
                                style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #edf2f7', background: '#fff', color: '#718096', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                                <i className={`bi bi-${isActive ? 'person-x' : 'person-check'}`}></i>
                              </button>

                              {/* Audit logs */}
                              <button onClick={() => viewAuditLogs(u.id, u.name)} title="System Logs"
                                style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #edf2f7', background: '#fff', color: '#718096', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                                <i className="bi bi-list-columns-reverse"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="text-center py-5">
                          <i className="bi bi-people" style={{ fontSize: '3rem', color: '#ddd' }}></i>
                          <p className="text-muted fw-bold mt-2">No users match your criteria.</p>
                          <button onClick={handleReset} className="btn btn-sm" style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, borderRadius: 20, padding: '0.5rem 1.5rem' }}>
                            Clear All Filters
                          </button>
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

      {/* Audit Logs Modal */}
      {auditOpen && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setAuditOpen(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="modal-title" style={{ fontWeight: 800 }}>
                  <i className="bi bi-clock-history me-2" style={{ color: '#ffc63a' }}></i>
                  Activity Logs: <span className="text-dark">{auditUser}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setAuditOpen(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="table-responsive" style={{ maxHeight: 450, overflowY: 'auto' }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light" style={{ position: 'sticky', top: 0 }}>
                      <tr>
                        <th className="ps-4">Action</th>
                        <th>Summary</th>
                        <th>Admin</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLoading ? (
                        <tr><td colSpan={4} className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></td></tr>
                      ) : auditLogs.length > 0 ? auditLogs.map((log, i) => (
                        <tr key={i}>
                          <td className="ps-4">
                            <span className={`badge bg-${getAuditBadgeColor(log.action_type)} rounded-pill`} style={{ fontSize: '0.65rem' }}>
                              {log.action_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td><div className="small fw-semibold">{parseAuditDetails(log.action_details)}</div></td>
                          <td className="small">{log.admin_name || <span className="text-muted">System</span>}</td>
                          <td className="small text-muted">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="text-center py-5 text-muted">No system logs available for this user.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
