'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem' }}>
      <div className="card-header bg-white py-3 border-bottom">
        <h5 className="mb-0 fw-bold" style={{ color: '#212529' }}>
          <i className={`bi ${icon} me-2`} style={{ color: '#ffc63a' }}></i>{title}
        </h5>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}







function Toggle({ label, desc, settingKey, settings, update }: { label: string; desc?: string; settingKey: string; settings: Record<string, string>; update: (k: string, v: string) => void }) {
  const checked = settings[settingKey] === '1' || settings[settingKey] === 'true';
  return (
    <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: '#f8f9fa', border: '1px solid #eee' }}>
      <div className="form-check form-switch mb-0 mt-1">
        <input className="form-check-input" type="checkbox" checked={checked} onChange={(e) => update(settingKey, e.target.checked ? '1' : '0')} style={{ width: 42, height: 22, cursor: 'pointer' }} />
      </div>
      <div>
        <div className="fw-semibold">{label}</div>
        {desc && <small className="text-muted">{desc}</small>}
      </div>
    </div>
  );
}

export default function SettingsClient() {
  const { toastSuccess, toastError } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      toastSuccess('settings_save_success', 'Settings saved successfully!');
    } else {
      toastError('settings_save_error', res.message || 'Failed to save settings');
    }
  };

  const handleBulkDelete = () => {
    if (!fromDate || !toDate) {
      toastError('settings_date_required', 'Please select both from and to dates');
      return;
    }
    confirmToast('All rejected products and their images will be permanently deleted! Are you sure?', async () => {
      setDeleting(true);
      const fd = new FormData();
      fd.append('from_date', fromDate);
      fd.append('to_date', toDate);
      const res = await api.post('/superadmin/bulk-delete-rejected', fd);
      setDeleting(false);
      if (res.success) toastSuccess('generic_success', res.message || 'Cleanup complete');
      else toastError('generic_error', res.message || 'Failed');
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
        <div className="mb-4 d-flex justify-content-between align-items-center">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}><i className="bi bi-gear" style={{ color: '#ffc63a' }}></i> System Settings</h1>
            <p className="text-muted small mb-0">Configure all platform-wide settings from one place.</p>
          </div>
        </div>

        <form onSubmit={handleSave}>

          <Section title="General" icon="bi-globe">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Site Name</label>
                <input className="form-control" style={inputStyle} value={settings.site_name || ''} onChange={(e) => update('site_name', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Support Email</label>
                <input type="email" className="form-control" style={inputStyle} value={settings.support_email || ''} onChange={(e) => update('support_email', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Support Phone</label>
                <input className="form-control" style={inputStyle} value={settings.support_phone || ''} onChange={(e) => update('support_phone', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Support Hours</label>
                <input className="form-control" style={inputStyle} value={settings.support_hours || ''} onChange={(e) => update('support_hours', e.target.value)} placeholder="e.g. 9:00 AM - 6:00 PM (Mon-Sat)" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Currency</label>
                <select className="form-select" style={inputStyle} value={settings.currency || 'INR'} onChange={(e) => update('currency', e.target.value)}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ── Platform Rules ── */}
          <Section title="Platform Rules" icon="bi-sliders">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Commission Rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" className="form-control" style={inputStyle} value={settings.commission_rate || '10'} onChange={(e) => update('commission_rate', e.target.value)} />
                <small className="text-muted">Platform fee on each transaction</small>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Default Delivery Charge (₹)</label>
                <input type="number" min="0" className="form-control" style={inputStyle} value={settings.default_delivery_charge || settings.delivery_charge || '50'} onChange={(e) => update('default_delivery_charge', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Minimum Order Value (₹)</label>
                <input type="number" min="0" className="form-control" style={inputStyle} value={settings.min_order_value || '100'} onChange={(e) => update('min_order_value', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Max Images per Product</label>
                <input type="number" min="1" max="20" className="form-control" style={inputStyle} value={settings.max_images_per_product || '8'} onChange={(e) => update('max_images_per_product', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">OTP Expiry (minutes)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.otp_expiry_minutes || '10'} onChange={(e) => update('otp_expiry_minutes', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Blocked from Approvals (days)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.blocked_from_approvals_days || '30'} onChange={(e) => update('blocked_from_approvals_days', e.target.value)} />
                <small className="text-muted">Days a seller stays blocked from approvals after violations</small>
              </div>
              <div className="col-12">
                <Toggle
                  label="Admin Review Required for New Products"
                  desc="When enabled, all new product listings will be 'Pending' until an admin approves them."
                  settingKey="product_approval_required"
                  settings={settings}
                  update={update}
                />
              </div>
              <div className="col-12">
                <Toggle
                  label="Enable Zone Restriction"
                  desc="Restrict registrations and contact viewing to allowed geographic zones only."
                  settingKey="enable_zone_restriction"
                  settings={settings}
                  update={update}
                />
              </div>
              <div className="col-12">
                <Toggle
                  label="Global System Lock"
                  desc="When enabled: no new users can register and buyers cannot view seller contact details."
                  settingKey="global_system_lock"
                  settings={settings}
                  update={update}
                />
              </div>
            </div>
          </Section>

          {/* ── Offer & Rating Rules ── */}
          <Section title="Offer & Rating Rules" icon="bi-handshake">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Offer Acceptance Limit (days)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.offer_acceptance_limit_days || '7'} onChange={(e) => update('offer_acceptance_limit_days', e.target.value)} />
                <small className="text-muted">Days before an unaccepted offer auto-expires</small>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Seller Rejection Window (hours)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.seller_rejection_window_hours || '7'} onChange={(e) => update('seller_rejection_window_hours', e.target.value)} />
                <small className="text-muted">Hours seller has to reject after acceptance</small>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Buyer Rating Period (days)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.buyer_rating_period_days || '7'} onChange={(e) => update('buyer_rating_period_days', e.target.value)} />
                <small className="text-muted">Days a seller has to rate the buyer</small>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Seller Rating Period (days)</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.seller_rating_period_days || '7'} onChange={(e) => update('seller_rating_period_days', e.target.value)} />
                <small className="text-muted">Days a buyer has to rate the seller</small>
              </div>
            </div>
          </Section>

          {/* ── Pricing & Rental Defaults ── */}
          <Section title="Pricing & Rental Defaults" icon="bi-currency-dollar">
            <div className="row g-3">
              <div className="col-12"><h6 className="fw-bold mb-0 text-muted small uppercase">Global Sale Defaults</h6></div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Base Discount (%)</label>
                <input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.sale_base_discount || '0'} onChange={(e) => update('sale_base_discount', e.target.value)} />
                <small className="text-muted">Min discount from original price for sales.</small>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">No Dep. Limit (Uses)</label>
                <input type="number" className="form-control" style={inputStyle} value={settings.usage_no_dep_max || '0'} onChange={(e) => update('usage_no_dep_max', e.target.value)} />
                <small className="text-muted">Usage count up to which 0% extra dep is applied.</small>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Dep. Per Use (%)</label>
                <input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.sale_depreciation_per_use || '0'} onChange={(e) => update('sale_depreciation_per_use', e.target.value)} />
                <small className="text-muted">Extra depreciation per additional use.</small>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Max Extra Dep. (%)</label>
                <input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.sale_max_additional_depreciation || '0'} onChange={(e) => update('sale_max_additional_depreciation', e.target.value)} />
                <small className="text-muted">Max additional depreciation cap.</small>
              </div>

              <div className="col-12 mt-3"><h6 className="fw-bold mb-0 text-muted small uppercase">Global Rental Defaults</h6></div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Base Deposit Ded. (%)</label>
                <input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.rental_base_deposit_deduction || '0'} onChange={(e) => update('rental_base_deposit_deduction', e.target.value)} />
                <small className="text-muted">Base deduction for deposit calculation.</small>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Min Rental Days</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.min_rental_days || '3'} onChange={(e) => update('min_rental_days', e.target.value)} />
                <small className="text-muted">Min days a buyer must rent a product.</small>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Max Rental Cost Cap (%)</label>
                <input type="number" step="0.1" className="form-control" style={inputStyle} value={settings.rental_max_cost_cap_per_day || '14'} onChange={(e) => update('rental_max_cost_cap_per_day', e.target.value)} />
                <small className="text-muted">Max rental cost allowed as % of deposit.</small>
              </div>
              <div className="col-md-9">
                <label className="form-label fw-semibold">Fallback Rental Cost Per Day (%)</label>
                <input type="number" min="0" max="100" className="form-control" style={inputStyle} value={settings.fallback_rental_cost_per_day || '0'} onChange={(e) => update('fallback_rental_cost_per_day', e.target.value)} />
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1 text-warning"></i>
                  When no pricing rules exist: <strong>Deposit = Original Price</strong>, and <strong>Daily Rent = Deposit - {settings.fallback_rental_cost_per_day || '0'}%</strong>.
                </small>
              </div>
            </div>
          </Section>


          {/* ── PhonePe Payment ── */}
          <Section title="PhonePe Payment Gateway" icon="bi-credit-card">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Environment</label>
                <select className="form-select" style={inputStyle} value={settings.phonepe_env || 'sandbox'} onChange={(e) => update('phonepe_env', e.target.value)}>
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Client ID</label>
                <input className="form-control" style={inputStyle} value={settings.phonepe_client_id || ''} onChange={(e) => update('phonepe_client_id', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Merchant ID</label>
                <input className="form-control" style={inputStyle} value={settings.phonepe_merchant_id || ''} onChange={(e) => update('phonepe_merchant_id', e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Client Secret</label>
                <input type="password" className="form-control" style={inputStyle} value={settings.phonepe_client_secret || ''} onChange={(e) => update('phonepe_client_secret', e.target.value)} placeholder="••••••••••••" />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Client Version</label>
                <input type="number" min="1" className="form-control" style={inputStyle} value={settings.phonepe_client_version || '1'} onChange={(e) => update('phonepe_client_version', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Callback URL</label>
                <input className="form-control" style={inputStyle} value={settings.phonepe_callback_url || ''} onChange={(e) => update('phonepe_callback_url', e.target.value)} placeholder="https://yourdomain.com/buyer/payment-callback" />
              </div>
            </div>
          </Section>

          {/* ── SMTP Email ── */}
          <Section title="SMTP Email Settings" icon="bi-envelope">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">SMTP Host</label>
                <input className="form-control" style={inputStyle} value={settings.smtp_host || ''} onChange={(e) => update('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">SMTP Port</label>
                <input type="number" className="form-control" style={inputStyle} value={settings.smtp_port || '587'} onChange={(e) => update('smtp_port', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Encryption</label>
                <select className="form-select" style={inputStyle} value={settings.smtp_encryption || 'tls'} onChange={(e) => update('smtp_encryption', e.target.value)}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="">None</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">SMTP Username</label>
                <input className="form-control" style={inputStyle} value={settings.smtp_username || ''} onChange={(e) => update('smtp_username', e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">SMTP Password</label>
                <input type="password" className="form-control" style={inputStyle} value={settings.smtp_password || ''} onChange={(e) => update('smtp_password', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">From Email</label>
                <input type="email" className="form-control" style={inputStyle} value={settings.smtp_from_email || ''} onChange={(e) => update('smtp_from_email', e.target.value)} placeholder="noreply@flexmarket.com" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">From Name</label>
                <input className="form-control" style={inputStyle} value={settings.smtp_from_name || ''} onChange={(e) => update('smtp_from_name', e.target.value)} placeholder="Flex Market" />
              </div>
            </div>
          </Section>

          {/* ── Save Button ── */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem' }}>
            <div className="card-body d-flex justify-content-end gap-3 align-items-center">
              <small className="text-muted">All sections are saved together.</small>
              <button type="submit" className="btn" style={btnGold} disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
                  : <><i className="bi bi-check-circle me-2"></i>Save All Settings</>}
              </button>
            </div>
          </div>
        </form>

        {/* ── Maintenance ── */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem' }}>
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 fw-bold text-danger"><i className="bi bi-tools me-2"></i>System Maintenance</h5>
          </div>
          <div className="card-body d-flex flex-column gap-3">



            {/* Delete rejected products */}
            <div className="p-3 rounded-3" style={{ background: '#fff5f5', border: '1px solid #ffeaea' }}>
              <h6 className="fw-bold mb-1">Delete Rejected Products</h6>
              <p className="text-muted small mb-3">Permanently remove rejected products and all their images for a selected date range. <strong>This cannot be undone.</strong></p>
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
      </div>
    </DashboardLayout>
  );
}
