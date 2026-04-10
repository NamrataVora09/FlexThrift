'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Ad {
  id: number; title: string; short_description: string; position: string;
  ad_type: string; media_type: string; media_path: string;
  payment_date: string | null; start_date: string | null; end_date: string | null;
  is_active: string; created_at: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

const POSITIONS = [
  { value: 'top_banner', label: 'Top Wide Banner' },
  { value: 'sidebar', label: 'Sidebar Square' },
  { value: 'footer', label: 'Footer Banner' },
  { value: 'popup', label: 'Entrance Popup' },
  { value: 'rows', label: 'In-Feed (Between Products)' },
];

const emptyForm = { title: '', short_description: '', position: 'top_banner', payment_date: '', start_date: '', end_date: '' };

export default function AdvertisementsClient() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.get<Ad[]>('/superadmin/advertisements').then((r) => {
      if (r.success && r.data) setAds(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm); setEditId(''); setPreviewUrl(''); setPreviewType(''); setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewType(file.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    if (editId) fd.append('ad_id', editId);
    fd.append('title', form.title);
    fd.append('short_description', form.short_description);
    fd.append('position', form.position);
    fd.append('payment_date', form.payment_date);
    fd.append('start_date', form.start_date);
    fd.append('end_date', form.end_date);
    if (selectedFile) fd.append('ad_media', selectedFile);

    const url = editId ? '/superadmin/update-advertisement' : '/superadmin/upload-advertisement';
    const res = await api.upload(url, fd);
    setSaving(false);
    if (res.success) {
      toast.success(editId ? 'Advertisement updated!' : 'Advertisement uploaded!');
      resetForm();
      load();
    }
    else toast.error(res.message || 'Failed');
  };

  const editAd = async (id: number) => {
    const res = await api.get<Ad>(`/superadmin/get-advertisement/${id}`);
    if (res.success && res.data) {
      const ad = res.data;
      setEditId(String(ad.id));
      setForm({ title: ad.title, short_description: ad.short_description || '', position: ad.position, payment_date: ad.payment_date || '', start_date: ad.start_date || '', end_date: ad.end_date || '' });
      if (ad.media_path) {
        setPreviewUrl(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}/uploads/advertisements/${ad.media_path}`);
        setPreviewType(ad.media_type || (ad.ad_type === 'video' ? 'video/mp4' : 'image/jpeg'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleAd = async (id: number) => { await api.post(`/superadmin/toggle-advertisement/${id}`); load(); };
  const deleteAd = (id: number) => {
    confirmToast('This advertisement will be permanently removed. Are you sure?', async () => {
      const res = await api.post(`/superadmin/delete-advertisement/${id}`);
      if (res.success) {
        toast.success('Advertisement deleted');
        load();
      } else {
        toast.error(res.message || 'Error deleting ad');
      }
    }, 'Delete');
  };

  const fmtDate = (d: string | null, fmt: 'short' | 'full' = 'full') => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', fmt === 'short' ? { month: 'short', day: '2-digit' } : { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-megaphone-fill" style={{ color: '#ffc63a' }}></i> Rich Media Advertisements
          </h1>
          <p className="text-muted small">Manage video and image banners with split-pane editing.</p>
        </div>

        {/* Split Pane: Form + Preview */}
        <div className="row g-4 mb-5">
          {/* Left: Form */}
          <div className="col-lg-7">
            <div className="card border-0 p-4" style={{ borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <h6 className="fw-bold mb-3" style={{ borderBottom: '2px solid #ffc63a', display: 'inline-block', paddingBottom: 5 }}>
                {editId ? `Edit Advertisement` : 'Create New Advertisement'}
              </h6>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label style={labelStyle}>Advertisement Title</label>
                    <input className="form-control" style={inputStyle} placeholder="e.g. Summer Mega Sale 2026" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="col-md-12">
                    <label style={labelStyle}>Short Description</label>
                    <textarea className="form-control" style={inputStyle} rows={2} placeholder="Tell viewers what this is about..." value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Position Slot</label>
                    <select className="form-select" style={inputStyle} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
                      {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Payment Date</label>
                    <input type="date" className="form-control" style={inputStyle} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>Start Date</label>
                    <input type="date" className="form-control" style={inputStyle} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>End Date</label>
                    <input type="date" className="form-control" style={inputStyle} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                  <div className="col-md-12">
                    <label style={labelStyle}>Media Upload (Video or Image)</label>
                    <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #ffc63a', background: 'rgba(255,198,58,0.05)', borderRadius: 12, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <i className="bi bi-cloud-arrow-up" style={{ fontSize: '1.8rem', color: '#ffc63a' }}></i>
                      <p className="mb-0 mt-1 fw-bold small">Click to upload file</p>
                      <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>MP4, JPG, PNG or WEBP (Max 20MB)</p>
                      <input type="file" ref={fileRef} className="d-none" accept="image/*,video/*" onChange={handleFileChange} />
                    </div>
                    {selectedFile && <div className="mt-2 small fw-bold" style={{ color: '#ffc63a' }}>Selected: {selectedFile.name}</div>}
                  </div>
                  <div className="col-12 mt-4 d-flex gap-2">
                    <button type="submit" className="btn sa-filter-btn" style={btnGold} disabled={saving}>
                      {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Advertisement'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Clear Form</button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="col-lg-5">
            <div style={{ position: 'sticky', top: 100 }}>
              <div style={{ background: '#e9ecef', borderRadius: '1rem', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '2px dashed #ced4da', overflow: 'hidden' }}>
                {/* Live preview label */}
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', zIndex: 10 }}>LIVE PREVIEW</div>

                {/* Media */}
                {previewUrl ? (
                  previewType.includes('video') ? (
                    <video src={previewUrl} controls autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  )
                ) : (
                  <div className="text-center p-5 text-muted">
                    <i className="bi bi-eye" style={{ fontSize: '2.5rem', opacity: 0.25, display: 'block', marginBottom: '0.75rem' }}></i>
                    <p className="small fw-bold text-uppercase">Wait for Upload</p>
                    <p className="small mb-0">Your advertisement banner or video will appear here as you create or edit.</p>
                  </div>
                )}

                {/* Text overlay */}
                {(form.title || form.short_description || previewUrl) && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 20px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff', zIndex: 11, textAlign: 'left' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 5, fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{form.title || 'Your Ad Title Here'}</h4>
                    <p style={{ marginBottom: 0, fontSize: '0.9rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{form.short_description || 'Your short description will appear here...'}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 card p-3 border-0 text-white" style={{ background: '#212529', borderRadius: '0.75rem' }}>
                <div className="d-flex align-items-center gap-2 small">
                  <i className="bi bi-info-circle text-warning"></i>
                  <span>Preview shows how the ad will look to users.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Placements Table */}
        <h6 className="fw-bold mb-3" style={{ borderBottom: '2px solid #ffc63a', display: 'inline-block', paddingBottom: 5 }}>Active Placements & History</h6>
        <div className="card border-0" style={{ borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead><tr>
                  <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Preview</th>
                  <th style={thStyle}>Title & Slot</th>
                  <th style={thStyle}>Schedule</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                </tr></thead>
                <tbody>
                  {ads.length > 0 ? ads.map((ad) => (
                    <tr key={ad.id}>
                      <td style={{ ...tdStyle, paddingLeft: '1.5rem' }}>
                        {ad.ad_type === 'video' ? (
                          <div className="rounded border d-flex align-items-center justify-content-center" style={{ width: 80, height: 45, background: '#000', cursor: 'pointer' }} onClick={() => editAd(ad.id)}>
                            <i className="bi bi-play-circle-fill text-white"></i>
                          </div>
                        ) : (
                          <img src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}/uploads/advertisements/${ad.media_path}`} className="rounded border" style={{ width: 80, height: 45, objectFit: 'cover', cursor: 'pointer' }} onClick={() => editAd(ad.id)} alt="" />
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div className="fw-bold">{ad.title}</div>
                        <span className="badge bg-light text-dark border py-1 px-2" style={{ fontSize: '0.65rem' }}>{ad.position.replace(/_/g, ' ').toUpperCase()}</span>
                      </td>
                      <td style={tdStyle}>
                        <div className="small">
                          {ad.start_date ? <span className="text-success"><i className="bi bi-calendar-check me-1"></i>{fmtDate(ad.start_date, 'short')}</span> : <span className="text-muted">Start: Immediate</span>}
                          {' · '}
                          {ad.end_date ? <span className="text-danger"><i className="bi bi-calendar-x me-1"></i>{fmtDate(ad.end_date)}</span> : <span className="text-muted">End: Never</span>}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" checked={Number(ad.is_active) === 1} onChange={() => toggleAd(ad.id)} style={{ cursor: 'pointer', width: 38, height: 20 }} />
                          <label className="form-check-label small">{Number(ad.is_active) ? 'Active' : 'Paused'}</label>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                        <div className="d-flex justify-content-end gap-1">
                          <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => editAd(ad.id)} title="Edit" style={{ width: 32, height: 32 }}>
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => deleteAd(ad.id)} title="Delete" style={{ width: 32, height: 32 }}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-5">
                      <i className="bi bi-megaphone" style={{ fontSize: '2.5rem', color: '#ddd', display: 'block', marginBottom: '0.75rem' }}></i>
                      <p className="text-muted mb-0">No advertisements found. Start by creating one above!</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
