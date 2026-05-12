'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface SettingsData { config: Record<string, string>; }

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.85rem', fontFamily: "'Fira Code', 'Courier New', monospace" };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '2rem', padding: '0.6rem 2.5rem' };

const DISPLAY_PAGES = [
  { value: 'all', label: 'All Pages' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'browse', label: 'Browse Market' },
  { value: 'product_detail', label: 'Product Detail' },
  { value: 'portal_seller_dashboard', label: 'Seller Portal: Dashboard' },
  { value: 'portal_buyer_dashboard', label: 'Buyer Portal: Dashboard' },
  { value: 'portal_admin_dashboard', label: 'Admin Portal: Dashboard' },
  { value: 'portal_seller_profile', label: 'Seller Portal: Profile' },
  { value: 'portal_buyer_profile', label: 'Buyer Portal: Profile' },
];

const AD_SLOTS = [
  { key: 'ad_slot_sidebar', label: 'Sidebar Ad Slot', tag: "render_ad('sidebar')", placeholder: 'AdSense sidebar unit code...' },
  { key: 'ad_slot_top_banner', label: 'Top Banner Slot', tag: "render_ad('top_banner')", placeholder: 'AdSense top banner code...' },
  { key: 'ad_slot_footer', label: 'Footer Slot', tag: "render_ad('footer')", placeholder: 'AdSense footer unit code...' },
  { key: 'ad_slot_rows', label: 'Between Rows Slot', tag: "render_ad('rows')", placeholder: 'AdSense in-feed unit code...' },
];

export default function AdSettingsClient() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<SettingsData>('/shared/business-settings').then((r) => {
      if (r.success && r.data) setConfig(r.data.config);
      setLoading(false);
    });
  }, []);

  const update = (key: string, val: string) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    // Only save ad-related keys (slots + their page targeting)
    const adKeys = ['ad_slot_header_script'];
    AD_SLOTS.forEach(s => {
      adKeys.push(s.key);
      adKeys.push(`${s.key}_page`);
    });
    const payload: Record<string, string> = {};
    adKeys.forEach(k => { payload[k] = config[k] || ''; });
    const res = await api.post('/shared/business-settings', payload);
    setSaving(false);
    setMsg(res.success ? 'Ad configuration saved successfully!' : (res.message || 'Failed to save'));
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-code-square" style={{ color: '#ffc63a' }}></i> Ad Management
          </h1>
          <p className="text-muted small">Manage Google AdSense scripts and custom ad units across the platform.</p>
        </div>

        {msg && (
          <div className={`alert ${msg.includes('success') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4 border-0 shadow-sm`}>
            <i className={`bi ${msg.includes('success') ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'} me-2`}></i>{msg}
            <button type="button" className="btn-close" onClick={() => setMsg('')}></button>
          </div>
        )}

        {/* Global Ad Scripts */}
        <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-white border-bottom py-3" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold"><i className="bi bi-google me-2" style={{ color: '#ffc63a' }}></i> Global Ad Scripts</h5>
          </div>
          <div className="card-body p-4">
            <div className="mb-0">
              <label className="form-label fw-bold">Header Script (Auto-Ads / Global JS)</label>
              <textarea className="form-control" style={inputStyle} rows={5} placeholder='Paste your <script> tags here...'
                value={config['ad_slot_header_script'] || ''} onChange={(e) => update('ad_slot_header_script', e.target.value)} />
              <small className="text-muted">This script will be injected into the <code>&lt;head&gt;</code> section of all public pages. Useful for AdSense Auto-Ads or Analytics.</small>
            </div>
          </div>
        </div>

        {/* Placement Units */}
        <div className="card mb-4 border-0 overflow-hidden" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold"><i className="bi bi-layout-three-columns me-2 text-success"></i> Placement Units (Designer Slots)</h5>
            <span className="badge bg-light text-dark border">Available for Placement</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-4">
              {AD_SLOTS.map((slot) => (
                <div className="col-md-6" key={slot.key}>
                  <div className="p-3 border rounded" style={{ background: 'rgba(248,249,250,0.5)' }}>
                    <label className="form-label fw-bold">{slot.label}</label>
                    <textarea className="form-control mb-3" style={inputStyle} rows={4} placeholder={slot.placeholder}
                      value={config[slot.key] || ''} onChange={(e) => update(slot.key, e.target.value)} />
                    
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Display Page Targeting</label>
                      <select 
                        className="form-select form-select-sm" 
                        style={{ ...inputStyle, padding: '0.4rem 0.8rem' }}
                        value={config[`${slot.key}_page`] || 'all'}
                        onChange={(e) => update(`${slot.key}_page`, e.target.value)}
                      >
                        {DISPLAY_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>

                    <div className="mt-2 d-flex justify-content-between align-items-center">
                      <small className="text-muted">Designer Tag:</small>
                      <code className="bg-dark text-white p-1 rounded small">{slot.tag}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Save Footer */}
        <div className="card border-0 shadow-lg mb-4" style={{ position: 'sticky', bottom: '2rem', zIndex: 1000, borderRadius: '2rem' }}>
          <div className="card-body py-3 d-flex justify-content-between align-items-center bg-white rounded-pill border">
            <div className="ps-3">
              <i className="bi bi-info-circle me-2" style={{ color: '#ffc63a' }}></i>
              <span className="text-muted small">Changes will reflect instantly on the public site after saving.</span>
            </div>
            <button className="btn sa-filter-btn shadow-sm" style={btnGold} onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-cloud-arrow-up-fill me-2"></i>Save Ad Configuration</>}
            </button>
          </div>
        </div>

        {/* Developer Guide */}
        <div className="card border-0 overflow-hidden" style={{ borderRadius: '0.75rem', background: '#212529' }}>
          <div className="card-header bg-transparent py-3" style={{ borderBottom: '1px solid #495057' }}>
            <h5 className="mb-0 fw-bold text-white"><i className="bi bi-code-square me-2 text-warning"></i> Developer & Designer Guide</h5>
          </div>
          <div className="card-body p-4">
            <p className="small" style={{ color: '#6c757d' }}>To display ads in your views, use the following PHP tags. These codes automatically fetch the scripts entered above.</p>
            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold text-white mb-2 small">Displaying an Ad unit:</h6>
                <pre className="p-3 rounded" style={{ background: '#000', border: '1px solid #495057', color: '#10b981', margin: 0 }}>
                  <code>{`<?= render_ad('sidebar', 'browse'); ?>`}</code>
                </pre>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold text-white mb-2 small">Adding custom slots:</h6>
                <p className="small" style={{ color: '#6c757d' }}>
                  You can create any new slot by simply adding a textarea with a name starting with <code className="text-warning">ad_slot_</code>.
                  For example, <code className="text-warning">{`<textarea name="ad_slot_vibrating">`}</code> can be rendered using <code className="text-warning">{`render_ad('vibrating')`}</code>.
                  You can also pass an optional second parameter to filter by page: <code className="text-warning">{`render_ad('slot', 'landing')`}</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
