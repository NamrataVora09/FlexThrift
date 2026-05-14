'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdBanner from '@/components/shared/AdBanner';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

interface UserProfile {
  id: number;
  name: string;
  email: string;
  profile_image?: string;
  mobile: string;
  alternate_mobile?: string;
  gender?: string;
  address: string;
  pin_code: string;
  city: string;
  state: string;
  user_type: string;
  role: string;
  reliability_score: number;
  buyer_rating_avg?: number;
  buyer_rating_count?: number;
  seller_rating_avg?: number;
  seller_rating_count?: number;
  seller_reliability_score?: number;
  referral_code: string;
  is_verified: number;
  created_at: string;
}

interface Props {
  requiredRoles: string[];
}

export default function ProfilePageClient({ requiredRoles }: Props) {
  const { toastSuccess, toastError } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [form, setForm] = useState({
    name: '', mobile: '', alternate_mobile: '', gender: '',
    address: '', pin_code: '', city: '', state: '',
  });

  useEffect(() => {
    api.get<UserProfile>('/auth/me').then((res) => {
      if (res.success && res.data) {
        const u = res.data;
        setUser(u);
        setForm({
          name: u.name || '',
          mobile: u.mobile || '',
          alternate_mobile: u.alternate_mobile || '',
          gender: u.gender || '',
          address: u.address || '',
          pin_code: u.pin_code || '',
          city: u.city || '',
          state: u.state || '',
        });

        // Fetch seller stats if the user has a seller role
        if (u.user_type === 'seller' || u.user_type === 'both' || u.role === 'seller') {
          api.get<any>('/seller/dashboard').then((r) => {
            if (r.success && r.data) {
              setTotalDeals(r.data.total_deals ?? 0);
              setTotalProducts(r.data.stats?.ttl_products ?? 0);
            }
          });
        }

        // Fetch active subscription plan name
        const subType = (u.user_type === 'seller' || u.role === 'seller') ? 'seller' : 'buyer';
        api.get<{ active: { plan_name: string; is_active: string; expires_at: string } | null }>(`/shared/subscriptions/${subType}`).then((r) => {
          if (r.success && r.data?.active) {
            const a = r.data.active;
            if (String(a.is_active) === '1' && new Date(a.expires_at) > new Date()) {
              setActivePlanName(a.plan_name);
            }
          }
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
      toastSuccess('profile_update_success', 'Profile updated successfully!');
      setSuccess('Profile updated successfully!');
      setModalOpen(false);
      const refresh = await api.get<UserProfile>('/auth/me');
      if (refresh.success && refresh.data) setUser(refresh.data);
    } else {
      setError(res?.message || 'Failed to update profile');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setImgUploading(true);
    const fd = new FormData();
    fd.append('profile_image', file);
    const res = await api.upload<{ path: string }>('/shared/upload-profile-image', fd);
    setImgUploading(false);
    if (res.success && res.data) {
      setUser(u => u ? { ...u, profile_image: res.data!.path } : u);
      toastSuccess('profile_image_update_success', 'Profile image updated!');
    } else {
      toastError('profile_image_update_failed', res.message || 'Image upload failed');
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  };

  const isBuyer = user?.user_type === 'buyer' || user?.user_type === 'both';
  const isSeller = user?.user_type === 'seller' || user?.user_type === 'both' || user?.role === 'seller';
  const subsHref = isSeller && user?.role === 'seller' ? '/seller/subscriptions' : '/buyer/subscriptions';

  return (
    <DashboardLayout requiredRoles={requiredRoles}>
      <style jsx>{`
        /* ── Profile Header ── */
        .prof-header {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        
        @media (min-width: 768px) {
          .prof-header { padding: 2rem; }
        }
        
        @media (max-width: 640px) {
          .prof-header { flex-direction: column; align-items: center; text-align: center; }
          .prof-header .d-flex { flex-direction: column; align-items: center; }
          .prof-header .upgrade-btn { width: 100%; justify-content: center; }
        }

        .prof-avatar-wrap {
          position: relative;
          width: 90px; height: 90px;
          flex-shrink: 0;
          cursor: pointer;
        }
        .prof-avatar-wrap:hover .avatar-overlay { opacity: 1; }
        .avatar-overlay {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
          font-size: 1.1rem; color: #fff;
        }
        .prof-avatar {
          width: 90px; height: 90px;
          border-radius: 50%;
          background: #f9fafb;
          border: 4px solid #fef3c7;
          display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem;
          overflow: hidden;
          color: #FDB814;
          flex-shrink: 0;
        }
        .plan-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #D7B467;
          color: #fff;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 10px;
        }
        .upgrade-btn {
          background: #008080 !important;
          color: #fff !important;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: none !important;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .upgrade-btn:hover { opacity: 0.88; }

        /* ── Section Card ── */
        .section-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 1.25rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          height: 100%;
        }
        
        @media (min-width: 768px) {
          .section-card { padding: 2rem; }
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @media (max-width: 576px) {
          .section-title { justify-content: center; }
        }

        /* ── Info Grid ── */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 576px) { .info-grid { grid-template-columns: 1fr; text-align: center; } }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-label {
          font-size: 0.72rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .info-value { font-size: 0.95rem; color: #1f2937; font-weight: 600; }

        /* ── Edit button ── */
        .edit-profile-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ef4444;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: opacity 0.2s;
        }
        
        @media (max-width: 576px) {
          .edit-profile-btn { width: 100%; justify-content: center; }
        }

        /* ── Seller stats ── */
        .stat-mini {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 1.1rem 1.25rem;
          text-align: center;
        }
        .stat-mini-val { font-size: 1.6rem; font-weight: 800; color: #1f2937; }
        .stat-mini-lbl { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-top: 2px; }

        /* ── Rating Card ── */
        .rating-circle {
          width: 80px; height: 80px;
          border-radius: 50%;
          border: 6px solid #D7B467;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1f2937;
          background: #fff;
          margin: 0 auto 0.75rem;
        }
        .rating-title {
          font-size: 0.75rem; font-weight: 700; color: #1f2937;
          text-transform: uppercase; letter-spacing: 0.5px;
          margin-bottom: 4px; text-align: center;
        }
        .rating-desc { font-size: 0.72rem; color: #6b7280; line-height: 1.5; text-align: center; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .modal-box {
          background: #fff; border-radius: 12px; padding: 1.5rem;
          width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.18);
        }
        
        @media (min-width: 768px) {
          .modal-box { padding: 2rem; }
        }

        .modal-close {
          width: 30px; height: 30px; border-radius: 50%;
          border: none; background: #f3f4f6; color: #6b7280;
          font-size: 1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .modal-field label {
          display: block; font-size: 0.82rem; font-weight: 700;
          color: #1f2937; margin-bottom: 6px;
        }
        .modal-field input,
        .modal-field select,
        .modal-field textarea {
          width: 100%; padding: 10px 14px;
          border: 2px solid #e5e7eb; border-radius: 8px;
          font-size: 0.9rem; transition: border-color 0.2s;
          font-family: inherit; background: #fff;
        }
        .modal-field input:focus,
        .modal-field select:focus,
        .modal-field textarea:focus {
          outline: none; border-color: #FDB814;
          box-shadow: 0 0 0 3px rgba(253,184,20,0.1);
        }
        .btn-save {
          background: #FDB814; color: #fff; border: none;
          padding: 10px 28px; border-radius: 8px; font-weight: 700;
          cursor: pointer; transition: background 0.2s;
        }
        .btn-cancel {
          background: #f3f4f6; color: #1f2937; border: none;
          padding: 10px 28px; border-radius: 8px; font-weight: 600; cursor: pointer;
        }

        /* ── Referral ── */
        .referral-box {
          background: #f9fafb; border: 1px dashed #d1d5db;
          border-radius: 10px; padding: 1.25rem; text-align: center; margin-top: 1rem;
        }
        .referral-code {
          font-size: 1.4rem; font-weight: 800; letter-spacing: 4px;
          color: #1f2937; font-family: monospace;
        }
      `}</style>

      <div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#ffc63a' }} />
          </div>
        ) : user ? (
          <>
            {success && (
              <div className="alert alert-success border-0 rounded-3 mb-3 py-2">
                <i className="fa-solid fa-circle-check me-2" />{success}
              </div>
            )}

            {/* ── Profile Header ── */}
            <div className="prof-header">
              <div className="d-flex align-items-center gap-4 flex-wrap">
                {/* Avatar with upload on click */}
                <label style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="d-none"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    disabled={imgUploading}
                  />
                  <div className="prof-avatar-wrap">
                    <div className="prof-avatar">
                      {user.profile_image
                        ? <img src={`${BACKEND_URL}/${user.profile_image}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <i className="fa-regular fa-user" />
                      }
                    </div>
                    <div className="avatar-overlay">
                      {imgUploading
                        ? <i className="fa-solid fa-spinner fa-spin" />
                        : <i className="fa-solid fa-camera" />
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {imgUploading ? 'Uploading…' : 'Change Photo'}
                  </div>
                </label>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#1f2937', marginBottom: 6 }}>
                    {user.name}
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Member Since
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>
                    {formatDate(user.created_at)}
                  </div>
                  <span className="plan-badge">
                    <i className="fa-solid fa-gem" />
                    {activePlanName ?? 'No Active Plan'}
                  </span>
                </div>
              </div>
              <Link href={subsHref} className="upgrade-btn" style={{ background: '#008080', color: '#fff ', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none !important', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-arrow-up" />
                Upgrade My Plan
              </Link>
            </div>




            {/* Top Banner Ad */}
            <div className="mb-4">
              <AdBanner position="top_banner" page={user.role === 'seller' ? 'portal_seller_profile' : 'portal_buyer_profile'} />
            </div>

            {/* ── Main Grid ── */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
              {/* Left — Profile Details */}
              <div className="flex-1 min-w-0">
                <div className="section-card">
                  <div className="section-title" style={{ fontSize: "1.25rem" }}>
                    <i className="fa-regular fa-user" />
                    Profile Details
                  </div>
                  <div className="info-grid mb-5">
                    {[
                      ['Full Name', user.name || '—'],
                      ['Gender', user.gender || '—'],
                      ['Email', user.email || '—'],
                      ['Mobile Number', user.mobile || '—'],
                      ['State', user.state || '—'],
                      ['City', user.city || '—'],
                      ['Current Address', user.address || '—'],
                      ['PIN Code', user.pin_code || '—'],
                      ['Alternate Mobile', user.alternate_mobile || '—'],
                      ['Account Type', user.user_type === 'both' ? 'Buyer & Seller' : (user.user_type || user.role)],
                    ].map(([label, value], i) => (
                      <div key={i} className="info-item">
                        <div className="info-label">{label}</div>
                        <div className="info-value">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-left mb-2">
                    <button className="edit-profile-btn" onClick={() => setModalOpen(true)}>
                      <i className="fa-solid fa-pencil" />
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Right — Ratings + Referral */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="flex flex-col gap-4">
                  {/* Buyer Points */}
                  {isBuyer && (
                    <div className="section-card">
                      <div className="section-title justify-content-center">
                        <i className="fa-solid fa-star" />
                        Buyer Points
                      </div>
                      <div className="rating-circle">
                        {user.reliability_score ?? 0}
                      </div>
                      <div className="rating-title">Total Points Earned</div>
                      <div className="rating-desc">
                        Points are awarded by sellers for successful order completions and professional conduct.
                      </div>
                    </div>
                  )}

                  {/* Seller Points */}
                  {isSeller && (
                    <div className="section-card">
                      <div className="section-title justify-content-center">
                        <i className="fa-solid fa-star" />
                        Seller Points
                      </div>
                      <div className="rating-circle">
                        {user.seller_reliability_score ?? 0}
                      </div>
                      <div className="rating-title">Total Points Earned</div>
                      <div className="rating-desc">
                        Points are awarded by buyers for successful order completions and professional service.
                      </div>
                    </div>
                  )}

                  {/* Sidebar Ad */}
                  <div className="mt-3">
                    <AdBanner position="sidebar" page={user.role === 'seller' ? 'portal_seller_profile' : 'portal_buyer_profile'} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Edit Modal ── */}
            {modalOpen && (
              <div
                className="modal-overlay"
                onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
              >
                <div className="modal-box">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 style={{ fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>Edit Profile</h5>
                    <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6 modal-field">
                      <label>Full Name</label>
                      <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="col-md-6 modal-field">
                      <label>Gender</label>
                      <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-6 modal-field">
                      <label>Mobile Number</label>
                      <input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                    </div>
                    <div className="col-md-6 modal-field">
                      <label>Alternate Mobile</label>
                      <input type="tel" value={form.alternate_mobile} onChange={(e) => setForm({ ...form, alternate_mobile: e.target.value })} />
                    </div>
                    <div className="col-md-6 modal-field">
                      <label>State</label>
                      <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                    </div>
                    <div className="col-md-6 modal-field">
                      <label>City</label>
                      <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="col-12 modal-field">
                      <label>Current Address</label>
                      <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="col-md-4 modal-field">
                      <label>PIN Code</label>
                      <input type="text" value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-danger border-0 rounded-3 mt-3 py-2 mb-0">{error}</div>
                  )}

                  <div className="d-flex gap-2 mt-4">
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <p style={{ color: '#6b7280' }}>Could not load profile data.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
