'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

import { confirmToast } from '@/lib/toast-utils';

interface Sub {
  id: number; user_id: string; user_name: string; email: string; user_type: string;
  plan_id: string; plan_name: string; plan_type: string; plan_for: string; price: string;
  usage_count: string; is_active: string; starts_at: string; expires_at: string;
}
interface Plan { id: number; name: string; user_type: string; plan_type: string; limit_value: string; duration_hours: string; price: string; base_price: string; is_active: string; }
interface User { id: number; name: string; email: string; user_type: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1.1rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', marginBottom: '0.5rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const filterPill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '2rem', background: 'rgba(255,198,58,0.08)', color: '#ffc63a', border: '1px solid rgba(255,198,58,0.2)' };

const AVATAR_COLORS: Record<string, string> = { buyer: 'linear-gradient(135deg,#f59e0b,#d97706)', seller: 'linear-gradient(135deg,#3b82f6,#2563eb)', both: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', delivery: 'linear-gradient(135deg,#10b981,#059669)' };
const ROLE_BADGE: Record<string, React.CSSProperties> = {
  buyer: { background: '#fef3c7', color: '#92400e' }, seller: { background: '#dbeafe', color: '#1e40af' },
  both: { background: '#ede9fe', color: '#5b21b6' }, delivery: { background: '#d1fae5', color: '#065f46' },
};

function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(); }

export default function UserSubscriptionsClient() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPlanId, setFilterPlanId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [planSearchInput, setPlanSearchInput] = useState('');
  const planDropdownRef = useRef<HTMLDivElement>(null);

  // View modal
  const [viewSub, setViewSub] = useState<Sub | null>(null);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignStep, setAssignStep] = useState(1);
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assignPlanSearch, setAssignPlanSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Sub[]>('/superadmin/user-subscriptions'),
      api.get<Plan[]>('/shared/admin-subscription-plans'),
      api.get<User[]>('/superadmin/users'),
    ]).then(([sr, pr, ur]) => {
      if (sr.success && sr.data) setSubs(sr.data);
      if (pr.success && pr.data) setPlans(pr.data);
      if (ur.success && ur.data) setUsers(ur.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target as Node)) {
        setPlanDropdownOpen(false);
      }
    };
    if (planDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [planDropdownOpen]);

  const filtered = useMemo(() => subs.filter((s) => {
    if (search && !s.user_name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && s.user_type !== filterRole) return false;
    if (filterPlanId && String(s.plan_id ?? '') !== filterPlanId) return false;
    if (filterStatus !== '') {
      const isExpired = s.expires_at && new Date(s.expires_at) < new Date() && new Date(s.expires_at).getFullYear() < 2099;
      const isActive = Number(s.is_active) && !isExpired;
      if (filterStatus === '1' && !isActive) return false;
      if (filterStatus === '0' && isActive) return false;
    }
    return true;
  }), [subs, search, filterRole, filterPlanId, filterStatus]);

  const hasFilters = search || filterRole || filterPlanId || filterStatus !== '';
  const resetFilters = () => { setSearch(''); setFilterRole(''); setFilterPlanId(''); setFilterStatus(''); };

  // Assign modal
  const openAssign = () => { setShowAssign(true); setAssignStep(1); setSelectedUser(null); setSelectedPlanId(null); setAssignUserSearch(''); setAssignPlanSearch(''); };
  const goStep2 = (u: User) => { setSelectedUser(u); setAssignStep(2); setAssignPlanSearch(''); };
  const goStep1 = () => { setAssignStep(1); setSelectedPlanId(null); };

  const filteredUsers = useMemo(() => {
    const q = assignUserSearch.toLowerCase();
    return users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.user_type.includes(q));
  }, [users, assignUserSearch]);

  const filteredPlans = useMemo(() => {
    const q = assignPlanSearch.toLowerCase();
    const active = plans.filter(p => Number(p.is_active));
    return active.filter(p => !q || p.name.toLowerCase().includes(q));
  }, [plans, assignPlanSearch]);

  // Group plans by user_type
  const groupedPlans = useMemo(() => {
    const groups: Record<string, Plan[]> = {};
    filteredPlans.forEach(p => { (groups[p.user_type] = groups[p.user_type] || []).push(p); });
    return groups;
  }, [filteredPlans]);

  const handleAssign = async () => {
    if (!selectedUser || !selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    confirmToast(`Assign ${plan?.name} to ${selectedUser.name}?`, async () => {
      setAssigning(true);
      const res = await api.post('/superadmin/assign-subscription', { user_id: selectedUser.id, plan_id: selectedPlanId });
      setAssigning(false);
      if (res.success) {
        toast.success('Subscription assigned successfully!');
        setShowAssign(false);
        load();
      } else {
        toast.error(res.message || 'Failed');
      }
    }, 'Assign');
  };


  const isNoExpiry = (d: string) => new Date(d) > new Date('2099-01-01');

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-person-check-fill" style={{ color: '#ffc63a' }}></i> User Subscriptions
            </h1>
            <p className="text-muted small mb-0">Monitor and assign membership plans to users.</p>
          </div>
          <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={openAssign}>
            <i className="bi bi-plus-lg"></i> Assign Plan
          </button>
        </div>

        {/* Filter Card */}
        <div className="card mb-4 border-0" style={{ borderRadius: '1rem', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f2f4' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label style={labelStyle}>Search User</label>
              <div className="input-group">
                <span className="input-group-text" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRight: 0, color: '#999' }}><i className="bi bi-search"></i></span>
                <input className="form-control shadow-none" style={{ ...inputStyle, borderLeft: 0, borderRadius: '0 0.5rem 0.5rem 0' }} placeholder="Name, Email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-2">
              <label style={labelStyle}>User Role</label>
              <select className="form-select shadow-none" style={inputStyle} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="col-md-3">
              <label style={labelStyle}>Subscription Plan</label>
              <div style={{ position: 'relative' }} ref={planDropdownRef}>
                <div 
                  onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                  }}
                >
                  <span>{filterPlanId ? plans.find(p => String(p.id) === filterPlanId)?.name : 'All Plans'}</span>
                  <i className={`bi bi-chevron-down`} style={{ fontSize: '0.75rem', transform: planDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}></i>
                </div>

                {planDropdownOpen && (
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
                      maxHeight: 300,
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid #e7eaf3', position: 'sticky', top: 0, background: '#fff' }}>
                      <input
                        type="text"
                        placeholder="Search plans..."
                        value={planSearchInput}
                        onChange={(e) => setPlanSearchInput(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #e7eaf3',
                          borderRadius: '0.4rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#ffc63a'}
                        onBlur={(e) => e.target.style.borderColor = '#e7eaf3'}
                        autoFocus
                      />
                    </div>

                    <div>
                      <div
                        onClick={() => {
                          setFilterPlanId('');
                          setPlanSearchInput('');
                          setPlanDropdownOpen(false);
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          background: filterPlanId === '' ? '#f0faf9' : 'transparent',
                          borderLeft: filterPlanId === '' ? '3px solid #ffc63a' : '3px solid transparent',
                          fontSize: '0.875rem',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (filterPlanId !== '') e.currentTarget.style.background = '#f8f9fa';
                        }}
                        onMouseLeave={(e) => {
                          if (filterPlanId !== '') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        All Plans
                      </div>

                      {plans
                        .filter(p =>
                          !planSearchInput ||
                          p.name.toLowerCase().includes(planSearchInput.toLowerCase()) ||
                          p.user_type.toLowerCase().includes(planSearchInput.toLowerCase())
                        )
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setFilterPlanId(String(p.id));
                              setPlanSearchInput('');
                              setPlanDropdownOpen(false);
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              background: String(filterPlanId) === String(p.id) ? '#f0faf9' : 'transparent',
                              borderLeft: String(filterPlanId) === String(p.id) ? '3px solid #ffc63a' : '3px solid transparent',
                              fontSize: '0.875rem',
                              transition: 'all 0.15s',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (String(filterPlanId) !== String(p.id)) e.currentTarget.style.background = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              if (String(filterPlanId) !== String(p.id)) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span>{p.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '0.5rem' }}>
                              ({p.user_type.charAt(0).toUpperCase() + p.user_type.slice(1)})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
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
                <button className="sa-filter-btn" style={{ ...btnGold, padding: '0.6rem 1rem', height: 42, display: 'flex', alignItems: 'center' }}><i className="bi bi-funnel"></i></button>
                <button className="sa-filter-reset-btn" onClick={resetFilters} style={{ background: '#fff', color: '#677788', fontWeight: 600, padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #e7eaf3', height: 42, display: 'flex', alignItems: 'center', cursor: 'pointer' }}><i className="bi bi-arrow-counterclockwise"></i></button>
              </div>
            </div>
          </div>
          {hasFilters && (
            <div className="d-flex flex-wrap gap-1 mt-3 align-items-center">
              <small className="text-muted fw-bold me-1" style={{ fontSize: '0.7rem', lineHeight: 1.8 }}>ACTIVE:</small>
              {search && <span style={filterPill}><i className="bi bi-search"></i> &quot;{search}&quot;</span>}
              {filterRole && <span style={filterPill}><i className="bi bi-person"></i> {filterRole.charAt(0).toUpperCase() + filterRole.slice(1)}</span>}
              {filterPlanId && <span style={filterPill}><i className="bi bi-tag"></i> {plans.find(p => String(p.id) === filterPlanId)?.name}</span>}
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
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>User</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Active Plan</th>
                    <th style={thStyle}>Plan For</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Usage</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Expires</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length > 0 ? filtered.map((s) => (
                      <tr key={s.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }}>
                          <div className="fw-bold">{s.user_name}</div>
                          <small className="text-muted">ID: #{s.user_id}</small>
                        </td>
                        <td style={tdStyle}><span className="badge bg-light text-dark text-uppercase">{s.user_type}</span></td>
                        <td style={tdStyle}><span className="fw-bold" style={{ color: '#ffc63a' }}>{s.plan_name}</span></td>
                        <td style={tdStyle}><span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: '0.7rem' }}>{s.plan_for}</span></td>
                        <td style={tdStyle}>{s.plan_type.charAt(0).toUpperCase() + s.plan_type.slice(1)}</td>
                        <td style={tdStyle}><span className="fw-bold">{s.usage_count}</span> <small className="text-muted">views/uploads</small></td>
                        <td style={tdStyle}>
                          {(() => {
                            const isExpired = s.expires_at && new Date(s.expires_at) < new Date() && new Date(s.expires_at).getFullYear() < 2099;
                            const isActive = Number(s.is_active) && !isExpired;
                            return (
                              <span className="badge px-3 py-2" style={isActive ? { background: 'rgba(25,135,84,0.1)', color: '#198754', fontWeight: 600 } : { background: 'rgba(220,53,69,0.1)', color: '#dc3545', fontWeight: 600 }}>
                                {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={tdStyle}>
                          {isNoExpiry(s.expires_at) ? (
                            <span className="badge bg-light text-dark">No Expiry</span>
                          ) : (
                            <><small className="d-block fw-bold">{new Date(s.expires_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
                            <small className="text-muted">{new Date(s.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small></>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          <button className="btn btn-sm btn-light border" style={{ borderRadius: 8 }} title="View Details" onClick={() => setViewSub(s)}>
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={9} className="text-center py-5 text-muted">No user subscriptions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Assign Plan Modal (2-Step) ══ */}
      {showAssign && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowAssign(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
              {/* Header with gradient + step dots */}
              <div style={{ background: 'linear-gradient(135deg, #ffc63a 0%, #00786e 100%)', color: '#fff', padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5 className="fw-bold mb-1"><i className="bi bi-rocket-takeoff me-2"></i>Assign Subscription</h5>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: assignStep === 1 ? '#fff' : 'rgba(255,255,255,0.25)', color: assignStep === 1 ? '#ffc63a' : '#fff', border: assignStep === 1 ? '2px solid #fff' : '2px solid rgba(255,255,255,0.35)', boxShadow: assignStep === 1 ? '0 0 0 4px rgba(255,255,255,0.2)' : undefined }}>1</span>
                    <span style={{ width: 32, height: 2, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }}></span>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: assignStep === 2 ? '#fff' : 'transparent', color: assignStep === 2 ? '#ffc63a' : 'rgba(255,255,255,0.5)', border: assignStep === 2 ? '2px solid #fff' : '2px solid rgba(255,255,255,0.35)', boxShadow: assignStep === 2 ? '0 0 0 4px rgba(255,255,255,0.2)' : undefined }}>2</span>
                    <small className="ms-2" style={{ opacity: 0.75 }}>{assignStep === 1 ? 'Select User' : 'Select Plan'}</small>
                  </div>
                </div>
                <button type="button" className="btn-close" style={{ filter: 'brightness(0) invert(1)', opacity: 0.8 }} onClick={() => setShowAssign(false)}></button>
              </div>

              {/* Step 1: Select User */}
              {assignStep === 1 && (
                <div className="p-4">
                  <div style={{ position: 'relative' }} className="mb-3">
                    <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: '0.9rem' }}></i>
                    <input className="form-control" style={{ paddingLeft: '2.5rem', borderRadius: '0.75rem', border: '2px solid #e9ecef', height: 48, fontSize: '0.9rem' }} placeholder="Search by name, email, or role..." value={assignUserSearch} onChange={(e) => setAssignUserSearch(e.target.value)} autoFocus />
                  </div>
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                      <div key={u.id} onClick={() => goStep2(u)} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s', marginBottom: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0faf9'; e.currentTarget.style.borderColor = '#b2dfdb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent'; }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0, background: AVATAR_COLORS[u.user_type] || AVATAR_COLORS.buyer }}>{getInitials(u.name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{u.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{u.email}</div>
                        </div>
                        <span style={{ ...(ROLE_BADGE[u.user_type] || ROLE_BADGE.buyer), fontSize: '0.6rem', padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{u.user_type}</span>
                      </div>
                    )) : (
                      <div className="text-center py-5" style={{ color: '#adb5bd' }}>
                        <i className="bi bi-person-x" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', opacity: 0.5 }}></i>
                        <div className="fw-bold mb-1">No users found</div>
                        <small>Try a different search term</small>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Select Plan */}
              {assignStep === 2 && selectedUser && (
                <div className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <button className="btn btn-sm btn-light border rounded-pill px-3" onClick={goStep1}><i className="bi bi-arrow-left me-1"></i> Back</button>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#e0f2f1', border: '1px solid #b2dfdb', borderRadius: '2rem', padding: '0.35rem 0.75rem 0.35rem 0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: AVATAR_COLORS[selectedUser.user_type] || AVATAR_COLORS.buyer }}>{getInitials(selectedUser.name)}</div>
                      {selectedUser.name}
                    </div>
                  </div>

                  <div style={{ position: 'relative' }} className="mb-3">
                    <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: '0.9rem' }}></i>
                    <input className="form-control" style={{ paddingLeft: '2.5rem', borderRadius: '0.75rem', border: '2px solid #e9ecef', height: 48, fontSize: '0.9rem' }} placeholder="Search by plan name..." value={assignPlanSearch} onChange={(e) => setAssignPlanSearch(e.target.value)} autoFocus />
                  </div>

                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {Object.entries(groupedPlans).map(([type, pls]) => (
                      <div key={type}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6c757d', padding: '0.5rem 0 0.25rem', borderBottom: '1px solid #f1f3f5', marginBottom: '0.5rem' }}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} Plans
                        </div>
                        <div className="row g-2 mb-3">
                          {pls.map((p) => {
                            const isSel = selectedPlanId === p.id;
                            const discount = Number(p.base_price) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.base_price)) * 100) : 0;
                            return (
                              <div className="col-6" key={p.id}>
                                <div onClick={() => setSelectedPlanId(p.id)} style={{ border: `2px solid ${isSel ? '#ffc63a' : '#e9ecef'}`, borderRadius: '1rem', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.25s', position: 'relative', overflow: 'hidden', background: isSel ? '#f0faf9' : '#fff', boxShadow: isSel ? '0 4px 16px rgba(255,198,58,0.15)' : undefined }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'linear-gradient(90deg, #ffc63a, #00c9be)', opacity: isSel ? 1 : 0, transition: 'opacity 0.25s' }}></div>
                                  <div className="d-flex align-items-start justify-content-between mb-2">
                                    <div>
                                      <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{p.name}</div>
                                      <span style={{ ...(ROLE_BADGE[p.user_type] || ROLE_BADGE.buyer), fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{p.user_type}</span>
                                    </div>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isSel ? '#ffc63a' : '#dee2e6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSel ? '#ffc63a' : 'transparent', color: '#fff', transition: 'all 0.2s', flexShrink: 0 }}>
                                      {isSel && <i className="bi bi-check" style={{ fontSize: '0.75rem' }}></i>}
                                    </div>
                                  </div>
                                  <div className="d-flex align-items-end gap-2 mt-2">
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, verticalAlign: 'super', marginRight: 1 }}>₹</span>{Number(p.price).toFixed(0)}
                                    </div>
                                    {discount > 0 && <span style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', fontWeight: 700 }}>{discount}% OFF</span>}
                                  </div>
                                  <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                                    {p.plan_type === 'duration' ? `${p.duration_hours}h unlimited` : `${p.limit_value} ${p.user_type === 'seller' ? 'uploads' : 'contacts'}`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {filteredPlans.length === 0 && (
                      <div className="text-center py-5" style={{ color: '#adb5bd' }}>
                        <i className="bi bi-tag" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem', opacity: 0.5 }}></i>
                        <div className="fw-bold">No plans found</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: '1px solid #f1f3f5', padding: '1rem 1.75rem' }}>
                <div className="d-flex justify-content-end gap-2">
                  <button className="btn btn-light px-4 rounded-pill" onClick={() => setShowAssign(false)}>Cancel</button>
                  <button className="btn rounded-pill px-4 fw-bold sa-filter-btn" style={btnGold} disabled={!selectedUser || !selectedPlanId || assigning} onClick={handleAssign}>
                    {assigning ? <><span className="spinner-border spinner-border-sm me-2"></span>Assigning...</> : <><i className="bi bi-check2-circle me-1"></i> Assign Plan</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ View Subscription Modal ══ */}
      {viewSub && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setViewSub(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-0 px-4 pt-4 pb-2">
                <h5 className="modal-title fw-bold">Subscription Details</h5>
                <button className="btn-close" onClick={() => setViewSub(null)}></button>
              </div>
              <div className="modal-body px-4 pb-4">
                {/* User */}
                <div className="d-flex align-items-center gap-3 mb-4 p-3 rounded-3" style={{ background: '#f8f9fa' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: AVATAR_COLORS[viewSub.user_type] || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                    {getInitials(viewSub.user_name)}
                  </div>
                  <div>
                    <div className="fw-bold">{viewSub.user_name}</div>
                    <div className="text-muted small">{viewSub.email}</div>
                    <span className="badge mt-1 text-capitalize" style={{ ...ROLE_BADGE[viewSub.user_type], fontSize: '0.7rem' }}>{viewSub.user_type}</span>
                  </div>
                </div>

                {/* Plan details */}
                <div className="row g-3">
                  {[
                    { label: 'Plan', value: viewSub.plan_name, bold: true },
                    { label: 'Plan For', value: viewSub.plan_for },
                    { label: 'Type', value: viewSub.plan_type.charAt(0).toUpperCase() + viewSub.plan_type.slice(1) },
                    { label: 'Price', value: `₹${viewSub.price}` },
                    { label: 'Usage', value: `${viewSub.usage_count} views/uploads` },
                    { label: 'Status', value: Number(viewSub.is_active) === 1 ? 'Active' : 'Inactive' },
                    { label: 'Starts At', value: viewSub.starts_at ? new Date(viewSub.starts_at).toLocaleString('en-IN') : '—' },
                    { label: 'Expires At', value: isNoExpiry(viewSub.expires_at) ? 'No Expiry' : viewSub.expires_at ? new Date(viewSub.expires_at).toLocaleString('en-IN') : '—' },
                  ].map(({ label, value, bold }) => (
                    <div className="col-6" key={label}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: bold ? 700 : 400, color: bold ? '#ffc63a' : '#212529' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0">
                <button className="btn btn-light px-4 rounded-pill" onClick={() => setViewSub(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
