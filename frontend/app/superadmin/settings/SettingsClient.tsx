'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

export default function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Bulk delete
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Record<string, string>>('/superadmin/system-settings').then((r) => {
      if (r.success && r.data) setSettings(r.data);
      setLoading(false);
    });
  }, []);

  const update = (key: string, val: string) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.post('/superadmin/update-settings', settings);
    setSaving(false);
    if (res.success) {
      toast.success('Settings saved successfully!');
    } else {
      toast.error(res.message || 'Failed to save settings');
    }
  };

  const handleBulkDelete = () => {
    if (!fromDate || !toDate) { 
      toast.error('Please select both from and to dates'); 
      return; 
    }
    confirmToast('All rejected products and their images will be permanently deleted! Are you sure?', async () => {
      setDeleting(true);
      const fd = new FormData();
      fd.append('from_date', fromDate);
      fd.append('to_date', toDate);
      const res = await api.post('/superadmin/bulk-delete-rejected', fd);
      setDeleting(false);
      if (res.success) toast.success(res.message || 'Cleanup complete');
      else toast.error(res.message || 'Failed');
    }, 'Delete All');
  };

  if (loading) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        <div className="mb-4"><h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}><i className="bi bi-gear" style={{ color: '#ffc63a' }}></i> System Settings</h1></div>


        {/* System Maintenance */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem' }}>
          <div className="card-header bg-white py-3"><h5 className="mb-0 text-danger"><i className="bi bi-tools me-2"></i>System Maintenance</h5></div>
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 flex-wrap gap-3">
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-bold">Delete Rejected Products</h6>
                <p className="text-muted small mb-0">Permanently remove rejected products and their images based on rejection date range. <strong>This action cannot be undone.</strong></p>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <input type="date" className="form-control form-control-sm" style={{ ...inputStyle, width: 'auto' }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <span className="text-muted small">to</span>
                <input type="date" className="form-control form-control-sm" style={{ ...inputStyle, width: 'auto' }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button className="btn btn-danger px-4" onClick={handleBulkDelete} disabled={deleting}>
                  {deleting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-trash3 me-2"></i>}
                  Delete Selected Period
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0.75rem' }}>
          <div className="card-header bg-white py-3"><h5 className="mb-0" style={{ color: '#ffc63a' }}><i className="bi bi-gear-wide-connected me-2"></i>General Settings</h5></div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="row g-4">
                <div className="col-md-6"><label className="form-label">Site Name</label><input className="form-control" style={inputStyle} value={settings.site_name || 'Flex Market'} onChange={(e) => update('site_name', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label">Commission Rate (%)</label><input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.commission_rate || '10'} onChange={(e) => update('commission_rate', e.target.value)} /><small className="text-muted">Platform commission on each transaction</small></div>
                <div className="col-md-6"><label className="form-label">Delivery Charge (₹)</label><input type="number" className="form-control" style={inputStyle} value={settings.delivery_charge || '50'} onChange={(e) => update('delivery_charge', e.target.value)} /><small className="text-muted">Fixed delivery charge per order</small></div>
                <div className="col-md-6"><label className="form-label">Minimum Order Value (₹)</label><input type="number" className="form-control" style={inputStyle} value={settings.min_order_value || '100'} onChange={(e) => update('min_order_value', e.target.value)} /><small className="text-muted">Minimum amount for placing orders</small></div>
                <div className="col-md-6"><label className="form-label">Support Email</label><input type="email" className="form-control" style={inputStyle} value={settings.support_email || ''} onChange={(e) => update('support_email', e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label">Support Mobile</label><input className="form-control" style={inputStyle} value={settings.support_mobile || ''} onChange={(e) => update('support_mobile', e.target.value)} /></div>

                <div className="col-md-12">
                  <label className="form-label">Product Approval Flow</label>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" checked={settings.product_approval_required === '1' || settings.product_approval_required === 'true'} onChange={(e) => update('product_approval_required', e.target.checked ? '1' : '0')} style={{ width: 42, height: 22 }} />
                    <label className="form-check-label ms-2">Admin Review Required (New products will be &apos;Pending&apos; until approved)</label>
                  </div>
                </div>

                <div className="col-md-12">
                  <label className="form-label">Global System Lock</label>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" checked={settings.global_system_lock === '1' || settings.global_system_lock === 'true'} onChange={(e) => update('global_system_lock', e.target.checked ? '1' : '0')} style={{ width: 42, height: 22 }} />
                    <label className="form-check-label text-danger fw-bold ms-2">Enable Global System Lock (Disables new registrations and contact viewing)</label>
                  </div>
                  <small className="text-muted d-block mt-1">When enabled: No new users can register, and buyers cannot view seller contact details.</small>
                </div>

                <div className="col-md-12">
                  <button type="submit" className="btn sa-filter-btn" style={btnGold} disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-circle me-2"></i>Save Settings</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
