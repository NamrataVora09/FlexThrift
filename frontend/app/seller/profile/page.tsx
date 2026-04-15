'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface SellerProfile {
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
  seller_reliability_score: number;
  seller_rating_avg: number;
  seller_rating_count: number;
  products_uploaded_count: number;
  referral_code: string;
  is_verified: number;
  created_at: string;
}

export default function SellerProfilePage() {
  const [user, setUser] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', address: '', pin_code: '', city: '', state: '' });
  const [totalDeals, setTotalDeals] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    api.get<SellerProfile>('/auth/me').then((res) => {
      if (res.success && res.data) {
        const u = res.data;
        setUser(u);
        setForm({ name: u.name || '', mobile: u.mobile || '', address: u.address || '', pin_code: u.pin_code || '', city: u.city || '', state: u.state || '' });
      }
      setLoading(false);
    });

    api.get<any>('/seller/dashboard').then((res) => {
      if (res.success && res.data) {
        setTotalDeals(res.data.total_deals ?? 0);
        setTotalProducts(res.data.stats?.ttl_products ?? 0);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await api.post('/shared/update-profile', form);
    setSaving(false);
    if (res?.success) {
      setUser((u) => u ? { ...u, ...form } : u);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } else {
      toast.error(res?.message || 'Update failed');
    }
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <DashboardLayout requiredRoles={['seller', 'super_admin']}>
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
          pointer-events: none;
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
          flex-shrink: 0;
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
        .stat-card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
          padding: 20px 24px;
          text-align: center;
          transition: 0.3s;
        }
        .stat-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: #000; }
        .stat-label { font-size: 0.75rem; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
        .info-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eee;
          padding: 30px;
          margin-bottom: 20px;
          transition: 0.3s;
        }
        .info-card:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.04); }
        .info-card h5 { font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        .edit-form .form-control:focus { border-color: #ffc63a; box-shadow: 0 4px 12px rgba(255,198,58,0.15); }
        .edit-form label { font-weight: 800; font-size: 0.75rem; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
        .btn-save { background: #ffc63a; color: #000; border: none; padding: 12px 30px; border-radius: 12px; font-weight: 700; transition: 0.3s; cursor: pointer; }
        .btn-save:hover { background: #000; color: #ffc63a; }
        .referral-box { background: #f8f9fa; border: 1px dashed #ddd; border-radius: 12px; padding: 20px; text-align: center; }
        .referral-code { font-size: 1.5rem; font-weight: 800; letter-spacing: 3px; color: #000; font-family: monospace; }
      `}</style>

      <div className="container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
          </div>
        ) : user ? (
          <>
            {/* Header */}
            <div className="profile-header">
              <div className="d-flex align-items-center gap-4 flex-wrap">
                <div className="profile-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className="fw-bold mb-1">{user.name}</h2>
                  <p className="mb-2 opacity-75">{user.email}</p>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="profile-badge">
                      <i className="bi bi-shop me-1"></i>Seller
                    </span>
                    {user.is_verified ? (
                      <span className="profile-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                        <i className="bi bi-patch-check-fill me-1"></i>Verified
                      </span>
                    ) : (
                      <span className="profile-badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                        <i className="bi bi-patch-exclamation me-1"></i>Unverified
                      </span>
                    )}
                    {user.seller_rating_count > 0 && (
                      <span className="profile-badge" style={{ background: 'rgba(255,198,58,0.3)', color: '#ffc63a' }}>
                        <i className="bi bi-star-fill me-1"></i>
                        {Number(user.seller_rating_avg).toFixed(1)} ({user.seller_rating_count})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="row g-3 mb-4">
              {[
                { icon: 'bi-box-seam',      label: 'Products Listed',  value: totalProducts },
                { icon: 'bi-handshake',     label: 'Deals Closed',     value: totalDeals },
                { icon: 'bi-star-fill',     label: 'Seller Rating',    value: user.seller_rating_count > 0 ? `${Number(user.seller_rating_avg).toFixed(1)}★` : '—' },
                { icon: 'bi-graph-up-arrow',label: 'Reliability Score',value: user.seller_reliability_score || user.reliability_score || 0 },
              ].map((s, i) => (
                <div className="col-6 col-md-3" key={i}>
                  <div className="stat-card">
                    <i className={`bi ${s.icon} fs-4 mb-2`} style={{ color: '#ffc63a' }}></i>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-4">
              {/* Left column */}
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
                        <i className="bi bi-pencil me-1"></i>Edit
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
                        <button className="btn-save" onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button className="btn btn-light" style={{ borderRadius: '12px', fontWeight: 700, padding: '12px 30px' }} onClick={() => setEditing(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {[
                        ['Full Name',  user.name],
                        ['Email',      user.email],
                        ['Mobile',     user.mobile || '—'],
                        ['City',       user.city || '—'],
                        ['State',      user.state || '—'],
                        ['Address',    user.address || '—'],
                        ['PIN Code',   user.pin_code || '—'],
                      ].map(([label, value], i) => (
                        <div className="info-row" key={i}>
                          <span className="info-label">{label}</span>
                          <span className="info-value" style={{ maxWidth: '60%', wordBreak: 'break-word', textAlign: 'right' }}>{value}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="col-lg-4">
                <div className="info-card">
                  <h5>
                    <i className="bi bi-shield-check" style={{ color: '#ffc63a' }}></i>
                    Account Details
                  </h5>
                  {[
                    ['Account Type',    user.user_type === 'both' ? 'Buyer & Seller' : 'Seller'],
                    ['Member Since',    fmt(user.created_at)],
                    ['Seller Rating',   user.seller_rating_count > 0
                                          ? `${Number(user.seller_rating_avg).toFixed(1)} ★ (${user.seller_rating_count})`
                                          : 'No ratings yet'],
                    ['Products Listed', String(totalProducts)],
                    ['Verified',        user.is_verified ? 'Yes ✓' : 'No'],
                  ].map(([label, value], i) => (
                    <div className="info-row" key={i}>
                      <span className="info-label">{label}</span>
                      <span className="info-value">{value}</span>
                    </div>
                  ))}
                </div>

                {user.referral_code && (
                  <div className="info-card">
                    <h5>
                      <i className="bi bi-gift" style={{ color: '#ffc63a' }}></i>
                      Referral Program
                    </h5>
                    <div className="referral-box">
                      <p className="text-muted small mb-2">Share your code &amp; earn rewards</p>
                      <div className="referral-code">{user.referral_code}</div>
                      <button
                        className="btn btn-sm mt-3 fw-bold"
                        style={{ background: '#ffc63a', color: '#000', borderRadius: '8px', padding: '8px 20px' }}
                        onClick={() => { navigator.clipboard.writeText(user.referral_code); toast.success('Referral code copied!'); }}
                      >
                        <i className="bi bi-clipboard me-1"></i>Copy Code
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
