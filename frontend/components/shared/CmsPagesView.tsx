'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface CmsPage { id: number; slug: string; title: string; content: string; status: string; updated_at: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.8rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

export default function CmsPagesView() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ slug: '', title: '', content: '' });
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<CmsPage[]>('/superadmin/cms-pages').then((r) => {
      if (r.success && r.data) setPages(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await api.post('/superadmin/create-cms-page', createForm);
    setCreating(false);
    if (res.success) {
      toast.success('CMS Page created successfully!');
      setShowCreate(false);
      setCreateForm({ slug: '', title: '', content: '' });
      load();
    } else {
      toast.error(res.message || 'Failed to create page');
    }
  };

  // Edit
  const startEdit = async (slug: string) => {
    const res = await api.get<CmsPage>(`/superadmin/cms-page/${slug}`);
    if (res.success && res.data) {
      setEditing(res.data);
      setEditTitle(res.data.title);
      setEditContent(res.data.content || '');
      setEditStatus(res.data.status || 'active');
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await api.post(`/superadmin/update-cms-page/${editing.slug}`, { 
      title: editTitle, 
      content: editContent,
      status: editStatus
    });
    setSaving(false);
    if (res.success) {
      toast.success('CMS Page updated successfully!');
      setEditing(null);
      load();
    } else {
      toast.error(res.message || 'Failed to update page');
    }
  };

  // Delete
  const handleDelete = (id: number, title: string) => {
    confirmToast(`Delete "${title}"? This cannot be undone.`, async () => {
      const res = await api.post(`/superadmin/delete-cms-page/${id}`);
      if (res.success) {
        toast.success('Page deleted');
        load();
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    }, 'Delete');
  };

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setCreateForm({
      ...createForm,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'),
    });
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-file-earmark-richtext" style={{ color: '#ffc63a' }}></i> CMS Pages Management
            </h1>
            <p className="text-muted small mb-0">Create and manage dynamic content pages for the website.</p>
          </div>
          <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={() => setShowCreate(true)}>
            <i className="bi bi-plus-lg"></i> Add New Page
          </button>
        </div>

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Slug</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Last Updated</th>
                    <th style={{ ...thStyle, textAlign: 'end' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {pages.length > 0 ? pages.map((p) => (
                      <tr key={p.id}>
                        <td style={tdStyle}><strong>{p.title}</strong></td>
                        <td style={tdStyle}><code className="bg-light px-2 py-1 rounded" style={{ fontSize: '0.8rem' }}>{p.slug}</code></td>
                        <td style={tdStyle}>
                          <span className="badge px-3 py-2" style={(p.status || 'active') === 'active' ? { background: 'rgba(25,135,84,0.1)', color: '#198754', fontWeight: 600 } : { background: 'rgba(108,117,125,0.1)', color: '#6c757d', fontWeight: 600 }}>
                            {p.status ? (p.status.charAt(0).toUpperCase() + p.status.slice(1)) : 'Active'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {p.updated_at ? (
                            <>{new Date(p.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(p.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                          ) : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end' }}>
                          <div className="d-flex justify-content-end gap-1">
                            <button className="btn btn-sm sa-filter-btn" style={{ ...btnGold, padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => startEdit(p.slug)}>
                              <i className="bi bi-pencil-square me-1"></i>Edit
                            </button>
                            <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => handleDelete(p.id, p.title)} title="Delete">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-5">
                        <i className="bi bi-file-earmark-richtext" style={{ fontSize: '2.5rem', color: '#ddd' }}></i>
                        <p className="text-muted mt-2">No CMS pages found. Click &quot;Add New Page&quot; to get started.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Info Alert */}
        <div className="mt-4">
          <div className="alert alert-info border-0 shadow-sm" style={{ borderRadius: '0.75rem' }}>
            <i className="bi bi-info-circle-fill me-2"></i>
            These pages contain dynamic content used in the Privacy Policy, Terms of Use, About Us, and other sections of the website.
          </div>
        </div>
      </div>

      {/* ══ Create Page Modal ══ */}
      {showCreate && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowCreate(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-plus-circle me-2" style={{ color: '#ffc63a' }}></i>Create New CMS Page</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label style={labelStyle}>Page Title <span className="text-danger">*</span></label>
                      <input className="form-control" style={inputStyle} placeholder="e.g. Privacy Policy" required
                        value={createForm.title} onChange={(e) => handleTitleChange(e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label style={labelStyle}>URL Slug <span className="text-danger">*</span></label>
                      <input className="form-control" style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. privacy-policy" required
                        value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                      <small className="text-muted">Auto-generated from title. Only lowercase letters, numbers, and hyphens.</small>
                    </div>
                  </div>
                  <div className="mb-0">
                    <label style={labelStyle}>Page Content (HTML)</label>
                    <textarea className="form-control" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }} rows={12}
                      placeholder="Enter page content here... HTML is supported."
                      value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn" style={btnGold} disabled={creating}>
                    {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="bi bi-plus-circle me-2"></i>Create Page</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Page Modal ══ */}
      {editing && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setEditing(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-pencil-square me-2" style={{ color: '#ffc63a' }}></i>Edit: {editing.title}</h5>
                <button type="button" className="btn-close" onClick={() => setEditing(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label style={labelStyle}>Page Title</label>
                  <input className="form-control" style={inputStyle} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label style={labelStyle}>Slug</label>
                  <input className="form-control" style={{ ...inputStyle, fontFamily: 'monospace' }} value={editing.slug} disabled />
                  <small className="text-muted">Slug cannot be changed after creation.</small>
                </div>
                <div className="mb-3">
                  <label style={labelStyle}>Status</label>
                  <select className="form-select" style={inputStyle} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="mb-0">
                  <label style={labelStyle}>Content (HTML)</label>
                  <textarea className="form-control" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }} rows={15}
                    value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn sa-filter-btn" style={btnGold} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-circle me-2"></i>Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
