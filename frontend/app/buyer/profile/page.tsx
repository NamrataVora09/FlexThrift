'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  mobile: string;
  address: string;
  pin_code: string;
  city: string;
  state: string;
  user_type: string;
  role: string;
  reliability_score: number;
  buyer_rating_avg: number;
  buyer_rating_count: number;
  referral_code: string;
  is_verified: number;
  created_at: string;
}

export default function BuyerProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', mobile: '', address: '', pin_code: '', city: '', state: '',
  });

  useEffect(() => {
    api.get<UserProfile>('/auth/me').then((res) => {
      if (res.success && res.data) {
        const u = res.data;
        setUser(u);
        setForm({
          name: u.name || '',
          mobile: u.mobile || '',
          address: u.address || '',
          pin_code: u.pin_code || '',
          city: u.city || '',
          state: u.state || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    const res = await api.post('/shared/update-profile', form);
    setSaving(false);
    if (res?.success) {
      setSuccess('Profile updated successfully!');
      setEditing(false);
      // Refresh user data
      const refresh = await api.get<UserProfile>('/auth/me');
      if (refresh.success && refresh.data) setUser(refresh.data);
    } else {
      setError(res?.message || 'Failed to update profile');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout requiredRoles={['buyer', 'super_admin']}>
      <style jsx>{`
        .profile-header {
          background: #000;
          border-radius: 20px;
          padding: 40px;
          color: #fff;
          position: relative;
          overflow: hidden;
          margin-bottom: 30px;
        }
        .profile-header::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: rgba(255,198,58,0.1);
          border-radius: 50%;
        }
        .profile-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #ffc63a;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 800;
          border: 3px solid rgba(255,255,255,0.2);
        }
        .profile-badge {
          background: rgba(255,198,58,0.2);
          color: #ffc63a;
          padding: 6px 16px;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: inline-block;
        }
        .info-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eee;
          padding: 30px;
          margin-bottom: 20px;
          transition: 0.3s;
        }
        .info-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.04);
        }
        .info-card h5 {
          font-weight: 800;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f5f5f5;
          font-size: 0.95rem;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #6f6f6f; font-weight: 600; }
        .info-value { font-weight: 700; color: #000; text-align: right; }
        .edit-form .form-control {
          border-radius: 12px;
          border: 2px solid #eee;
          padding: 12px 16px;
          font-weight: 600;
          transition: 0.3s;
        }
        .edit-form .form-control:focus {
          border-color: #ffc63a;
          box-shadow: 0 4px 12px rgba(255,198,58,0.15);
        }
        .edit-form label {
          font-weight: 800;
          font-size: 0.75rem;
          color: #64748b;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .btn-edit {
          background: #ffc63a;
          color: #000;
          border: none;
          padding: 12px 30px;
          border-radius: 12px;
          font-weight: 700;
          transition: 0.3s;
          cursor: pointer;
        }
        .btn-edit:hover {
          background: #000;
          color: #ffc63a;
        }
        .referral-box {
          background: #f8f9fa;
          border: 1px dashed #ddd;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .referral-code {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 3px;
          color: #000;
          font-family: monospace;
        }
      `}</style>

      <div className="container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : user ? (
          <>
            {/* Profile Header */}
            <div className="profile-header">
              <div className="d-flex align-items-center gap-4">
                <div className="profile-avatar">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="fw-bold mb-1">{user.name}</h2>
                  <p className="mb-2 opacity-75">{user.email}</p>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="profile-badge">
                      <i className="bi bi-star-fill me-1"></i> {user.reliability_score ?? 100} Points
                    </span>
                    <span className="profile-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                      <i className="bi bi-patch-check-fill me-1"></i> {user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className="profile-badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                      {user.user_type === 'both' ? 'Buyer & Seller' : user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {success && (
              <div className="alert alert-success border-0 rounded-4 shadow-sm mb-4">
                <i className="bi bi-check-circle-fill me-2"></i>{success}
              </div>
            )}
            {error && (
              <div className="alert alert-danger border-0 rounded-4 shadow-sm mb-4">
                <i className="bi bi-exclamation-circle-fill me-2"></i>{error}
              </div>
            )}

            <div className="row">
              {/* Left: Info / Edit */}
              <div className="col-lg-8">
                <div className="info-card">
                  <h5>
                    <i className="bi bi-person-fill" style={{ color: '#ffc63a' }}></i>
                    Personal Information
                    {!editing && (
                      <button
                        className="btn btn-sm ms-auto"
                        style={{ background: '#f8f9fa', borderRadius: '8px', fontWeight: 700 }}
                        onClick={() => setEditing(true)}
                      >
                        <i className="bi bi-pencil me-1"></i> Edit
                      </button>
                    )}
                  </h5>

                  {editing ? (
                    <div className="edit-form">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label>Full Name</label>
                          <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="col-md-6">
                          <label>Mobile Number</label>
                          <input type="tel" className="form-control" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                        </div>
                        <div className="col-md-6">
                          <label>City</label>
                          <input type="text" className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        </div>
                        <div className="col-md-6">
                          <label>State</label>
                          <input type="text" className="form-control" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                        </div>
                        <div className="col-12">
                          <label>Address</label>
                          <textarea className="form-control" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className="col-md-4">
                          <label>PIN Code</label>
                          <input type="text" className="form-control" value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-4">
                        <button className="btn-edit" onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="btn btn-light" style={{ borderRadius: '12px', fontWeight: 700, padding: '12px 30px' }} onClick={() => setEditing(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="info-row">
                        <span className="info-label">Full Name</span>
                        <span className="info-value">{user.name}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value">{user.email}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Mobile</span>
                        <span className="info-value">{user.mobile || '—'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">City</span>
                        <span className="info-value">{user.city || '—'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">State</span>
                        <span className="info-value">{user.state || '—'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Address</span>
                        <span className="info-value" style={{ maxWidth: '60%' }}>{user.address || '—'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">PIN Code</span>
                        <span className="info-value">{user.pin_code || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Account Info */}
              <div className="col-lg-4">
                <div className="info-card">
                  <h5>
                    <i className="bi bi-shield-check" style={{ color: '#ffc63a' }}></i>
                    Account Details
                  </h5>
                  <div className="info-row">
                    <span className="info-label">Account Type</span>
                    <span className="info-value">{user.user_type === 'both' ? 'Buyer & Seller' : user.user_type}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Active Role</span>
                    <span className="info-value">{user.role}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Member Since</span>
                    <span className="info-value">{formatDate(user.created_at)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Reliability</span>
                    <span className="info-value">
                      {user.buyer_rating_count > 0 ? (
                        <>
                          <i className="bi bi-star-fill me-1" style={{ color: '#ffc63a' }}></i>
                          {user.buyer_rating_avg.toFixed(1)} <small className="text-muted">({user.buyer_rating_count} {user.buyer_rating_count === 1 ? 'rating' : 'ratings'})</small>
                        </>
                      ) : (
                        <span className="text-muted small">No ratings yet</span>
                      )}
                    </span>
                  </div>
                </div>

                {user.referral_code && (
                  <div className="info-card">
                    <h5>
                      <i className="bi bi-gift" style={{ color: '#ffc63a' }}></i>
                      Referral Program
                    </h5>
                    <div className="referral-box">
                      <p className="text-muted small mb-2">Share your code & earn rewards</p>
                      <div className="referral-code">{user.referral_code}</div>
                      <button
                        className="btn btn-sm mt-3"
                        style={{ background: '#ffc63a', color: '#000', fontWeight: 700, borderRadius: '8px', padding: '8px 20px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(user.referral_code);
                          setSuccess('Referral code copied!');
                          setTimeout(() => setSuccess(''), 2000);
                        }}
                      >
                        <i className="bi bi-clipboard me-1"></i> Copy Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">Could not load profile data.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
