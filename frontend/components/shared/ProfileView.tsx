'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from './PageHeader';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

interface Props { role: string; }

export default function ProfileView({ role }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', address: '', pin_code: '', city: '', state: '' });
  const [kycForm, setKycForm] = useState({ pan_number: '', aadhar_number: '' });
  const [kycFiles, setKycFiles] = useState<{ pan_image?: File; aadhar_image?: File }>({});
  const [kycSaving, setKycSaving] = useState(false);

  useEffect(() => {
    api.get<Record<string, any>>('/auth/me').then((r) => {
      if (r.success && r.data) {
        setProfile(r.data);
        setForm({
          name: r.data.name || '',
          mobile: r.data.mobile || '',
          address: r.data.address || '',
          pin_code: r.data.pin_code || '',
          city: r.data.city || '',
          state: r.data.state || '',
        });
        setKycForm({
          pan_number: r.data.pan_number || '',
          aadhar_number: r.data.aadhar_number || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await api.post('/shared/update-profile', form);
    setSaving(false);
    if (res?.success) {
      setProfile({ ...profile, ...form });
      setEditing(false);
      toast.success('Profile updated successfully!');
    } else {
      toast.error(res?.message || 'Update failed');
    }
  };

  const handleKycUpload = async () => {
    setKycSaving(true);
    const formData = new FormData();
    if (kycForm.pan_number) formData.append('pan_number', kycForm.pan_number);
    if (kycForm.aadhar_number) formData.append('aadhar_number', kycForm.aadhar_number);
    if (kycFiles.pan_image) formData.append('pan_image', kycFiles.pan_image);
    if (kycFiles.aadhar_image) formData.append('aadhar_image', kycFiles.aadhar_image);

    const res = await api.upload('/shared/upload-kyc', formData);
    setKycSaving(false);
    if (res?.success) {
      toast.success('KYC documents uploaded!');
    } else {
      toast.error(res?.message || 'Upload failed');
    }
  };

  if (loading) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container">
        <PageHeader title="Profile" />

        <div className="row">
          <div className="col-md-4">
            <div className="card text-center">
              <div className="card-body py-5">
                <div className="mx-auto mb-3" style={{ width: 80, height: 80, background: '#ffc63a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700 }}>
                  {(profile?.name || '?')[0].toUpperCase()}
                </div>
                <h5 className="fw-bold">{profile?.name}</h5>
                <p className="normal_label_font">{profile?.email}</p>
                <span className={user?.role === 'seller' ? 'sell_typ' : user?.role === 'delivery' ? 'rent_typ' : 'buy_typ'}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="subsection_label_font mb-0">Account Details</h5>
                  {!editing ? (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                      <i className="bi bi-pencil me-1"></i>Edit
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-light" onClick={() => setEditing(false)}>Cancel</button>
                      <button className="btn btn-sm btn-success" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {!editing ? (
                  <>
                    {[
                      ['Full Name', profile?.name],
                      ['Email', profile?.email],
                      ['Mobile', profile?.mobile],
                      ['State', profile?.state],
                      ['City', profile?.city],
                      ['Address', profile?.address],
                      ['PIN Code', profile?.pin_code],
                      ['Account Type', profile?.user_type],
                      ['Role', profile?.role],
                      ['Reliability Score', profile?.reliability_score],
                      ['Referral Code', profile?.referral_code],
                      ['Verified', profile?.is_verified === '1' || profile?.is_verified === 1 ? 'Yes' : 'No'],
                    ].map(([label, value], i) => (
                      <div key={i} className="d-flex justify-content-between py-2 border-bottom">
                        <span className="fw-semibold">{label}</span>
                        <span className="normal_label_font">{String(value || '—')}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="row g-3">
                    {[
                      { key: 'name', label: 'Full Name' },
                      { key: 'mobile', label: 'Mobile' },
                      { key: 'state', label: 'State' },
                      { key: 'city', label: 'City' },
                      { key: 'address', label: 'Address' },
                      { key: 'pin_code', label: 'PIN Code' },
                    ].map((field) => (
                      <div className="col-md-6" key={field.key}>
                        <label className="form-label small fw-bold">{field.label}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={(form as any)[field.key]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* KYC Section */}
            <div className="card">
              <div className="card-body">
                <h5 className="subsection_label_font mb-4">KYC Documents</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">PAN Number</label>
                    <input type="text" className="form-control" value={kycForm.pan_number} onChange={(e) => setKycForm({ ...kycForm, pan_number: e.target.value })} placeholder="ABCDE1234F" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Aadhar Number</label>
                    <input type="text" className="form-control" value={kycForm.aadhar_number} onChange={(e) => setKycForm({ ...kycForm, aadhar_number: e.target.value })} placeholder="1234 5678 9012" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">PAN Card Image</label>
                    <input type="file" className="form-control" accept="image/*" onChange={(e) => setKycFiles({ ...kycFiles, pan_image: e.target.files?.[0] })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Aadhar Card Image</label>
                    <input type="file" className="form-control" accept="image/*" onChange={(e) => setKycFiles({ ...kycFiles, aadhar_image: e.target.files?.[0] })} />
                  </div>
                  <div className="col-12">
                    <button className="btn yellow_button" onClick={handleKycUpload} disabled={kycSaving}>
                      {kycSaving ? 'Uploading...' : 'Upload KYC Documents'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
