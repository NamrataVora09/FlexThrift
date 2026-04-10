'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';

// ==================== TYPES ====================
interface PricingRule {
  id: number;
  filter_type: string;
  filter_value: string;
  filter_label: string;
  deduction_threshold: string;
  depreciation_range_min: string;
  depreciation_range_max: string;
  depreciation_amount: string;
  is_active: number;
}

interface RentalPricingRule {
  id: number;
  filter_type: string;
  filter_value: string;
  filter_label: string;
  deposit_deduction_threshold: string;
  depreciation_range_min: string;
  depreciation_range_max: string;
  depreciation_amount: string;
  deposit_percentage: string;
  max_cost_cap_per_day: string;
  is_active: number;
}

interface TaxonomyItem { id: number; name: string; }

interface AppMessage {
  id: number;
  message_key: string;
  message_value: string;
  category: string;
}

interface RejectionTemplate {
  id: number;
  template_text: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface SettingsData {
  config: Record<string, string>;
  groups: Record<string, string[]>;
  app_messages?: AppMessage[];
}

// ==================== CONSTANTS ====================
const TABS = [
  { key: 'pricing',   label: 'Pricing Rules',        icon: 'bi-currency-dollar' },
  { key: 'offers',    label: 'Offer Settings',        icon: 'bi-chat-left-quote' },
  { key: 'images',    label: 'Image Settings',        icon: 'bi-images' },
  { key: 'smtp',      label: 'SMTP Settings',         icon: 'bi-envelope-at' },
  { key: 'messages',  label: 'App Messages',          icon: 'bi-chat-dots' },
  { key: 'payment',   label: 'Payment Integration',   icon: 'bi-phone' },
  { key: 'charges',   label: 'Fee Management',        icon: 'bi-receipt' },
  { key: 'referral',  label: 'Referral System',       icon: 'bi-person-plus' },
  { key: 'rejection', label: 'Rejection Templates',   icon: 'bi-x-circle' },
];

const FIELD_MAP: Record<string, { label: string; hint?: string; type?: string }> = {
  sale_base_discount: { label: 'Deduction Threshold for Sale (%)', hint: 'Minimum discount from original price for sales.' },
  usage_no_dep_max: { label: 'No Depreciation Limit (Uses)', hint: 'Usage count up to which 0% extra depreciation is applied.' },
  sale_depreciation_per_use: { label: 'Depreciation Per Use (%)', hint: 'Extra depreciation applied per additional use.' },
  sale_max_additional_depreciation: { label: 'Max Additional Depreciation (%)', hint: 'Maximum additional depreciation cap.' },
  pricing_tiers: { label: 'Usage-Based Pricing Tiers (JSON)', type: 'textarea', hint: 'JSON array of {min, max, dep} objects.' },
  rental_base_deposit_deduction: { label: 'Base Deposit Deduction (%)', hint: 'Base deduction for deposit calculation.' },
  rental_suggested_cost_percent: { label: 'Suggested Cost (%)', hint: 'Suggested rental cost as % of deposit.' },
  rental_deposit_percentage: { label: 'Deposit Percentage (%)', hint: '% of depreciated value that becomes rental deposit.' },
  rental_max_cost_cap_per_day: { label: 'Max Cost Cap/Day (%)', hint: 'Max rental cost per day as % of deposit.' },
  min_rental_days: { label: 'Min Rental Days' },
  rental_pricing_tiers: { label: 'Rental Pricing Tiers (JSON)', type: 'textarea', hint: 'JSON array of rental tier objects.' },
  offer_acceptance_limit_days: { label: 'Offer Acceptance Window (Days)', hint: 'Seller window to accept/reject an offer.' },
  seller_rating_period_days: { label: 'Seller Rating Window (Days)', hint: 'Days an accepted seller has to rate a buyer.' },
  seller_rejection_window_hours: { label: 'Seller Rejection Window (Hours)', hint: 'Hours a seller has to reject after accepting.' },
  buyer_rating_period_days: { label: 'Buyer Rating Window (Days)', hint: 'Days an accepted buyer has to rate a seller.' },
  max_product_images: { label: 'Max Images Per Product', hint: 'Maximum images allowed per product (1-20).' },
  max_image_size_mb: { label: 'Max Image Size (MB)', hint: 'Maximum file size in MB (0.5-10).' },
  image_upload_guidelines: { label: 'Image Upload Guidelines', type: 'textarea', hint: 'Guidelines shown to sellers during upload.' },
  smtp_host: { label: 'SMTP Host' },
  smtp_port: { label: 'SMTP Port' },
  smtp_crypto: { label: 'Encryption', type: 'select' },
  smtp_user: { label: 'SMTP Username' },
  smtp_pass: { label: 'SMTP Password', type: 'password' },
  smtp_from_email: { label: 'From Email Address' },
  smtp_from_name: { label: 'From Name' },
  phonepe_env: { label: 'Environment', type: 'select' },
  phonepe_merchant_id: { label: 'Merchant ID', hint: 'Your unique Merchant ID from PhonePe.' },
  phonepe_client_id: { label: 'Client ID', hint: 'From PhonePe Business Dashboard → Developer Settings.' },
  phonepe_client_secret: { label: 'Client Secret', type: 'password' },
  phonepe_client_version: { label: 'Client Version', hint: 'Default is 1 unless specified by PhonePe.' },
  commission_rate: { label: 'Commission Rate (%)', hint: 'Platform commission on each transaction.' },
  delivery_charge: { label: 'Delivery Charge (₹)', hint: 'Fixed delivery charge per order.' },
  min_order_value: { label: 'Min Order Value (₹)', hint: 'Minimum amount for placing orders.' },
  platform_fee: { label: 'Platform Fee (%)', hint: 'Global platform service fee.' },
  referral_reward_amount: { label: 'Referral Reward (₹)' },
  referral_expiry_days: { label: 'Referral Expiry (Days)' },
  referral_min_purchase: { label: 'Min Purchase for Reward (₹)', hint: 'Minimum purchase to activate referral reward.' },
  referral_enabled: { label: 'Referral System Enabled', type: 'toggle' },
};

const TAB_FIELDS: Record<string, string[]> = {
  pricing: [],
  offers: ['offer_acceptance_limit_days', 'seller_rating_period_days', 'seller_rejection_window_hours', 'buyer_rating_period_days'],
  images: ['max_product_images', 'max_image_size_mb', 'image_upload_guidelines'],
  smtp: ['smtp_host', 'smtp_port', 'smtp_crypto', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name'],
  messages: [],
  payment: ['phonepe_env', 'phonepe_merchant_id', 'phonepe_client_id', 'phonepe_client_secret', 'phonepe_client_version'],
  referral: ['referral_reward_amount', 'referral_expiry_days', 'referral_min_purchase', 'referral_enabled'],
  rejection: [],
};

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.875rem', color: '#4b566b', marginBottom: '0.5rem' };

// ==================== COMPONENT ====================
export default function BusinessSettingsView() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pricing');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});

  // PhonePe test connection
  const [testingPhonePe, setTestingPhonePe] = useState(false);
  const [phonePeTestResult, setPhonePeTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const testPhonePeConn = async () => {
    setTestingPhonePe(true);
    setPhonePeTestResult(null);
    // Must save first so PHP reads fresh credentials from DB
    const saveRes = await api.post('/shared/business-settings', config);
    if (!saveRes.success) { setTestingPhonePe(false); showToast.error('Save settings first'); return; }
    const res = await api.post('/superadmin/test-phonepe');
    setPhonePeTestResult({ ok: !!res.success, msg: res.message || (res.success ? 'Connected!' : 'Failed') });
    setTestingPhonePe(false);
  };

  // Platform Charges (Fee Management)
  interface PlatformCharge { id: number; charge_name: string; charge_type: 'percentage' | 'fixed'; charge_value: string; is_active: number; }
  const [charges, setCharges] = useState<PlatformCharge[]>([]);
  const [chargeModal, setChargeModal] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Partial<PlatformCharge> | null>(null);
  const [chargeSaving, setChargeSaving] = useState(false);

  const loadCharges = useCallback(async () => {
    const res = await api.get<PlatformCharge[]>('/superadmin/platform-charges');
    if (res.success) setCharges(res.data || []);
  }, []);

  const openChargeModal = (charge?: PlatformCharge) => {
    setEditingCharge(charge ? { ...charge } : { charge_name: '', charge_type: 'percentage', charge_value: '', is_active: 1 });
    setChargeModal(true);
  };

  const saveCharge = async () => {
    if (!editingCharge?.charge_name || !editingCharge?.charge_value) { showToast.warning('Name and value are required'); return; }
    setChargeSaving(true);
    const res = editingCharge.id
      ? await api.post(`/superadmin/update-charge/${editingCharge.id}`, editingCharge)
      : await api.post('/superadmin/create-charge', editingCharge);
    if (res.success) { showToast.success(editingCharge.id ? 'Charge updated!' : 'Charge created!'); setChargeModal(false); loadCharges(); }
    else showToast.error(res.message || 'Failed to save');
    setChargeSaving(false);
  };

  const deleteCharge = (id: number) => {
    confirmToast('Delete this charge?', async () => {
      const res = await api.post(`/superadmin/delete-charge/${id}`, {});
      if (res.success) { showToast.success('Charge deleted'); loadCharges(); }
      else showToast.error('Failed to delete');
    }, 'Delete');
  };

  const toggleCharge = async (charge: PlatformCharge) => {
    const res = await api.post(`/superadmin/update-charge/${charge.id}`, { ...charge, is_active: charge.is_active ? 0 : 1 });
    if (res.success) loadCharges();
    else showToast.error('Failed to toggle');
  };

  // App Messages
  const [appMessages, setAppMessages] = useState<AppMessage[]>([]);
  const [msgFilter, setMsgFilter] = useState('');
  const [showAddMsg, setShowAddMsg] = useState(false);
  const [newMsg, setNewMsg] = useState({ message_key: '', message_value: '', category: 'general' });

  // Rejection Templates
  const [rejTemplates, setRejTemplates] = useState<RejectionTemplate[]>([]);
  const [rejLoading, setRejLoading] = useState(false);
  const [showRejModal, setShowRejModal] = useState(false);
  const [editingRej, setEditingRej] = useState<RejectionTemplate | null>(null);
  const [rejText, setRejText] = useState('');
  const [rejType, setRejType] = useState('Products');
  const [rejSaving, setRejSaving] = useState(false);

  // Pricing Rules state
  const [saleRules, setSaleRules] = useState<PricingRule[]>([]);
  const [rentalRules, setRentalRules] = useState<RentalPricingRule[]>([]);
  const [taxonomy, setTaxonomy] = useState<{ listing_type: TaxonomyItem[]; category: TaxonomyItem[]; sub_category: TaxonomyItem[] }>({ listing_type: [], category: [], sub_category: [] });

  // Modal state
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [editingSaleRule, setEditingSaleRule] = useState<Partial<PricingRule> | null>(null);
  const [editingRentalRule, setEditingRentalRule] = useState<Partial<RentalPricingRule> | null>(null);
  const [modalSaving, setModalSaving] = useState(false);


  // Filter dropdown values
  const [filterValues, setFilterValues] = useState<TaxonomyItem[]>([]);
  const [rentalFilterValues, setRentalFilterValues] = useState<TaxonomyItem[]>([]);

  // Multiple depreciation ranges for modal
  const [saleDepRanges, setSaleDepRanges] = useState<Array<{ min: string; max: string; amount: string }>>([{ min: '', max: '', amount: '' }]);

  // ==================== DATA LOADING ====================
  const loadPricingRules = useCallback(async () => {
    try {
      const [saleRes, rentalRes] = await Promise.all([
        api.get<any>('/superadmin/all-pricing-rules'),
        api.get<any>('/superadmin/all-rental-pricing-rules'),
      ]);
      if (saleRes.success) setSaleRules(saleRes.data || []);
      if (rentalRes.success) setRentalRules(rentalRes.data || []);
    } catch { /* ignore */ }
  }, []);

    const loadRejectionTemplates = useCallback(async () => {
    setRejLoading(true);
    const res = await api.get<RejectionTemplate[]>('/superadmin/rejection-templates');
    if (res.success) setRejTemplates(res.data || []);
    setRejLoading(false);
  }, []);

  const loadTaxonomy = useCallback(async () => {
    try {
      const res = await api.get<any>('/shared/taxonomy');
      if (res.success && res.data) {
        setTaxonomy({
          listing_type: (res.data.listing_types || []).map((lt: any) => ({ id: lt.id, name: lt.type_name })),
          category: (res.data.categories || []).map((c: any) => ({ id: c.id, name: c.category_name })),
          sub_category: (res.data.sub_categories || []).map((sc: any) => ({ id: sc.id, name: sc.name })),
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    api.get<SettingsData>('/shared/business-settings').then((r) => {
      if (r.success && r.data) {
        setConfig(r.data.config);
        // Load app messages
        if (r.data.app_messages) setAppMessages(r.data.app_messages);
      }
      setLoading(false);
    });
    loadPricingRules();
    loadTaxonomy();
    loadRejectionTemplates();
    loadCharges();
  }, [loadPricingRules, loadTaxonomy, loadRejectionTemplates, loadCharges]);

  // ==================== SETTINGS SAVE ====================
  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, string> = { ...config };
    const res = await api.post('/shared/business-settings', payload);
    setSaving(false);
    if (res.success) {
      showToast.success('Settings saved successfully!');
    } else {
      showToast.error(res.message || 'Failed to save settings');
    }
  };

  const update = (key: string, val: string) => setConfig((c) => ({ ...c, [key]: val }));

  // ==================== SALE PRICING RULES CRUD ====================
  const openSaleModal = (rule?: PricingRule) => {
    setEditingSaleRule(rule || { filter_type: '', filter_value: '', deduction_threshold: '', depreciation_range_min: '', depreciation_range_max: '', depreciation_amount: '' });
    if (rule) {
      setSaleDepRanges([{ min: rule.depreciation_range_min || '', max: Number(rule.depreciation_range_max) > 0 ? rule.depreciation_range_max : '', amount: rule.depreciation_amount || '' }]);
    } else {
      setSaleDepRanges([{ min: '', max: '', amount: '' }]);
    }
    if (rule?.filter_type) {
      setFilterValues(taxonomy[rule.filter_type as keyof typeof taxonomy] || []);
    } else {
      setFilterValues([]);
    }
    setShowSaleModal(true);
  };

  // Returns true if [minA, maxA] overlaps [minB, maxB] (0 means ∞)
  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) => {
    const endA = maxA === 0 ? Infinity : maxA;
    const endB = maxB === 0 ? Infinity : maxB;
    return minA < endB && minB < endA;
  };

  const saveSaleRule = async () => {
    if (!editingSaleRule) return;
    const { filter_type, filter_value, deduction_threshold } = editingSaleRule;
    if (!deduction_threshold) {
      showToast.warning('Deduction Threshold is required'); return;
    }
    if (filter_type && !filter_value) {
      showToast.warning('Please select a Filter Value'); return;
    }
    for (let i = 0; i < saleDepRanges.length; i++) {
      const r = saleDepRanges[i];
      if (!r.min || !r.amount) {
        showToast.warning(`Range ${i + 1}: Min and Depreciation % are required`); return;
      }
      if (r.max && Number(r.max) < Number(r.min)) {
        showToast.warning(`Range ${i + 1}: Max cannot be less than Min`); return;
      }
    }
    const normFv = (v: any) => (!v || v === '0' || Number(v) === 0) ? '' : String(v);
    const ft = filter_type || '';
    const fv = normFv(filter_value);
    const sameGroup = (r: PricingRule) => (r.filter_type || '') === ft && normFv(r.filter_value) === fv && r.id !== editingSaleRule.id;

    // Only 1 record per group can have open-ended Used To (range_max = 0/blank)
    for (const newRange of saleDepRanges) {
      if (!Number(newRange.max)) {
        const duplicate = saleRules.find(r => sameGroup(r) && !Number(r.depreciation_range_max));
        if (duplicate) {
          showToast.warning(`Only 1 rule per sub-type can have an open-ended "Used To". A rule for this group already has no end range.`); return;
        }
      }
    }
    // Check overlap within the new ranges being added
    for (let i = 0; i < saleDepRanges.length; i++) {
      for (let j = i + 1; j < saleDepRanges.length; j++) {
        if (rangesOverlap(Number(saleDepRanges[i].min), Number(saleDepRanges[i].max) || 0, Number(saleDepRanges[j].min), Number(saleDepRanges[j].max) || 0)) {
          showToast.warning(`Range ${i + 1} and Range ${j + 1} overlap each other`); return;
        }
      }
    }
    // Check overlap and sequence against existing rules in the same group
    const existingForSameValue = saleRules.filter(sameGroup);
    
    // Sort existing rules by min to find the total coverage
    const sortedExisting = [...existingForSameValue].sort((a,b) => Number(a.depreciation_range_min) - Number(b.depreciation_range_min));
    const currentMax = sortedExisting.length > 0 ? Math.max(...sortedExisting.map(r => Number(r.depreciation_range_max) === 0 ? 999999 : Number(r.depreciation_range_max))) : -1;

    for (const newRange of saleDepRanges) {
      const nMin = Number(newRange.min);
      const nMax = Number(newRange.max) || 0;

      // Ensure sequential consistency: new ranges should generally start after existing ones if adding new
      if (!editingSaleRule.id && nMin <= currentMax) {
        showToast.warning(`New rule min (${nMin}) must be greater than the current maximum range (${currentMax === 999999 ? '∞' : currentMax}) for this category.`);
        return;
      }

      for (const existing of existingForSameValue) {
        if (rangesOverlap(nMin, nMax, Number(existing.depreciation_range_min), Number(existing.depreciation_range_max))) {
          showToast.warning(`Range ${nMin}–${nMax || '∞'} overlaps existing rule (${existing.depreciation_range_min}–${Number(existing.depreciation_range_max) === 0 ? '∞' : existing.depreciation_range_max})`); return;
        }
      }
    }
    setModalSaving(true);
    try {
      if (editingSaleRule.id && saleDepRanges.length === 1) {
        const res = await api.post('/superadmin/save-pricing-rule', {
          id: editingSaleRule.id, filter_type, filter_value,
          deduction_threshold,
          depreciation_range_min: saleDepRanges[0].min,
          depreciation_range_max: saleDepRanges[0].max || '0',
          depreciation_amount: saleDepRanges[0].amount,
        });
        if (!res.success) { showToast.error(res.message || 'Failed to save'); setModalSaving(false); return; }
      } else {
        if (editingSaleRule.id) {
          await api.post(`/superadmin/delete-pricing-rule/${editingSaleRule.id}`, {});
        }
        for (const r of saleDepRanges) {
          const res = await api.post('/superadmin/save-pricing-rule', {
            filter_type, filter_value, deduction_threshold,
            depreciation_range_min: r.min,
            depreciation_range_max: r.max || '0',
            depreciation_amount: r.amount,
          });
          if (!res.success) { showToast.error(res.message || 'Failed to save range'); setModalSaving(false); return; }
        }
      }
      // Sync deduction_threshold to all other rules with the same group (including default blank group)
      const otherSameType = saleRules.filter(sameGroup);
      for (const r of otherSameType) {
        await api.post('/superadmin/save-pricing-rule', {
          id: r.id,
          filter_type: r.filter_type,
          filter_value: r.filter_value,
          deduction_threshold,
          depreciation_range_min: r.depreciation_range_min,
          depreciation_range_max: r.depreciation_range_max,
          depreciation_amount: r.depreciation_amount,
        });
      }
      showToast.success(editingSaleRule?.id ? 'Pricing rule updated!' : `${saleDepRanges.length} pricing rule(s) created!`);
      setShowSaleModal(false);
      loadPricingRules();
    } catch { showToast.error('Server error — please try again'); }
    setModalSaving(false);
  };

  const deleteSaleRule = (id: number) => {
    confirmToast('Delete this pricing rule? This cannot be undone.', async () => {
      const res = await api.post(`/superadmin/delete-pricing-rule/${id}`, {});
      if (res.success) { showToast.success('Pricing rule deleted'); loadPricingRules(); }
      else showToast.error('Failed to delete rule');
    }, 'Delete');
  };

  const toggleSaleRule = async (id: number) => {
    const res = await api.post(`/superadmin/toggle-pricing-rule/${id}`, {});
    if (res.success) { showToast.success('Rule status toggled'); loadPricingRules(); }
    else showToast.error(res.message || 'Failed to toggle rule');
  };

  const bulkSaleAction = (action: 'delete' | 'deactivate' | 'activate') => {
    const msg = action === 'delete' ? 'Delete ALL sale pricing rules?' : `${action === 'deactivate' ? 'Deactivate' : 'Activate'} ALL sale rules?`;
    confirmToast(msg, async () => {
      const endpoint = action === 'delete' ? '/superadmin/bulk-delete-pricing-rules' : '/superadmin/bulk-toggle-pricing-rules';
      await api.post(endpoint, { type: 'sale', ...(action !== 'delete' ? { action } : {}) });
      showToast.success(`All sale rules ${action === 'delete' ? 'deleted' : action + 'd'}`);
      loadPricingRules();
    }, action.charAt(0).toUpperCase() + action.slice(1));
  };

  // ==================== RENTAL PRICING RULES CRUD ====================
  const openRentalModal = (rule?: RentalPricingRule) => {
    setEditingRentalRule(rule || { filter_type: '', filter_value: '', deposit_deduction_threshold: '', depreciation_range_min: '', depreciation_range_max: '', depreciation_amount: '', deposit_percentage: '', max_cost_cap_per_day: '' });
    if (rule?.filter_type) {
      setRentalFilterValues(taxonomy[rule.filter_type as keyof typeof taxonomy] || []);
    } else {
      setRentalFilterValues([]);
    }
    setShowRentalModal(true);
  };

  const saveRentalRule = async () => {
    if (!editingRentalRule) return;
    const { filter_type, filter_value, deposit_deduction_threshold, deposit_percentage, max_cost_cap_per_day } = editingRentalRule;
    if (!deposit_deduction_threshold || !deposit_percentage || !max_cost_cap_per_day) {
      showToast.warning('Please fill all required fields'); return;
    }
    if (filter_type && !filter_value) {
      showToast.warning('Please select a Filter Value'); return;
    }
    const normRFv = (v: any) => (!v || v === '0' || Number(v) === 0) ? '' : String(v);
    const rft = filter_type || '';
    const rfv = normRFv(filter_value);
    const rentalSameGroup = (r: RentalPricingRule) => (r.filter_type || '') === rft && normRFv(r.filter_value) === rfv && r.id !== editingRentalRule.id;
    // Only 1 record per group can have open-ended Used To (range_max = 0/blank)
    if (!Number(editingRentalRule.depreciation_range_max)) {
      const duplicate = rentalRules.find(r => rentalSameGroup(r) && !Number(r.depreciation_range_max));
      if (duplicate) {
        showToast.warning(`Only 1 rule per sub-type can have an open-ended "Used To". A rule for this group already has no end range.`); return;
      }
    }
    // Check overlap and sequence against existing rental rules in the same group
    const existingRentalSameValue = rentalRules.filter(rentalSameGroup);
    const newMin = Number(editingRentalRule.depreciation_range_min) || 0;
    const newMax = Number(editingRentalRule.depreciation_range_max) || 0;

    const sortedExistingRental = [...existingRentalSameValue].sort((a,b) => Number(a.depreciation_range_min) - Number(b.depreciation_range_min));
    const currentRentalMax = sortedExistingRental.length > 0 ? Math.max(...sortedExistingRental.map(r => Number(r.depreciation_range_max) === 0 ? 999999 : Number(r.depreciation_range_max))) : -1;

    if (!editingRentalRule.id && newMin <= currentRentalMax) {
      showToast.warning(`New rule min (${newMin}) must be greater than current maximum range (${currentRentalMax === 999999 ? '∞' : currentRentalMax})`);
      return;
    }

    for (const existing of existingRentalSameValue) {
      if (rangesOverlap(newMin, newMax, Number(existing.depreciation_range_min), Number(existing.depreciation_range_max))) {
        showToast.warning(`Range ${newMin}–${newMax === 0 ? '∞' : newMax} overlaps existing rule (${existing.depreciation_range_min}–${Number(existing.depreciation_range_max) === 0 ? '∞' : existing.depreciation_range_max})`); return;
      }
    }
    setModalSaving(true);
    try {
      const payload: Record<string, any> = { ...editingRentalRule };
      const res = await api.post('/superadmin/save-rental-pricing-rule', payload);
      if (res.success) {
        // Sync deposit_deduction_threshold to all other rules in the same group
        const otherRentalSameType = rentalRules.filter(rentalSameGroup);
        for (const r of otherRentalSameType) {
          await api.post('/superadmin/save-rental-pricing-rule', {
            ...r,
            deposit_deduction_threshold,
          });
        }
        showToast.success(editingRentalRule?.id ? 'Rental rule updated!' : 'Rental rule created!');
        setShowRentalModal(false);
        loadPricingRules();
      } else { showToast.error(res.message || 'Failed to save'); }
    } catch { showToast.error('Server error — please try again'); }
    setModalSaving(false);
  };

  const deleteRentalRule = (id: number) => {
    confirmToast('Delete this rental rule? This cannot be undone.', async () => {
      const res = await api.post(`/superadmin/delete-rental-pricing-rule/${id}`, {});
      if (res.success) { showToast.success('Rental rule deleted'); loadPricingRules(); }
      else showToast.error('Failed to delete rental rule');
    }, 'Delete');
  };

  const toggleRentalRule = async (id: number) => {
    const res = await api.post(`/superadmin/toggle-rental-pricing-rule/${id}`, {});
    if (res.success) { showToast.success('Rental rule status toggled'); loadPricingRules(); }
    else showToast.error(res.message || 'Failed to toggle rental rule');
  };

  const bulkRentalAction = (action: 'delete' | 'deactivate' | 'activate') => {
    const msg = action === 'delete' ? 'Delete ALL rental pricing rules?' : `${action === 'deactivate' ? 'Deactivate' : 'Activate'} ALL rental rules?`;
    confirmToast(msg, async () => {
      const endpoint = action === 'delete' ? '/superadmin/bulk-delete-pricing-rules' : '/superadmin/bulk-toggle-pricing-rules';
      await api.post(endpoint, { type: 'rental', ...(action !== 'delete' ? { action } : {}) });
      showToast.success(`All rental rules ${action === 'delete' ? 'deleted' : action + 'd'}`);
      loadPricingRules();
    }, action.charAt(0).toUpperCase() + action.slice(1));
  };

  // ==================== REJECTION TEMPLATES CRUD ====================
  const openRejModal = (tpl?: RejectionTemplate) => {
    setEditingRej(tpl || null);
    setRejText(tpl ? tpl.template_text : '');
    setRejType(tpl ? (tpl.type || 'Products') : 'Products');
    setShowRejModal(true);
  };

  const saveRejTemplate = async () => {
    if (!rejText.trim()) { showToast.warning('Template text cannot be empty'); return; }
    setRejSaving(true);
    const payload = { template_text: rejText.trim(), type: rejType };
    let res;
    if (editingRej) {
      res = await api.post(`/superadmin/update-rejection-template/${editingRej.id}`, payload);
    } else {
      res = await api.post('/superadmin/add-rejection-template', payload);
    }
    setRejSaving(false);
    if (res.success) {
      showToast.success(editingRej ? 'Template updated!' : 'Template added!');
      setShowRejModal(false);
      loadRejectionTemplates();
    } else {
      showToast.error(res.message || 'Failed to save template');
    }
  };

  const deleteRejTemplate = (id: number) => {
    confirmToast('Delete this rejection template? This cannot be undone.', async () => {
      const res = await api.post(`/superadmin/delete-rejection-template/${id}`, {});
      if (res.success) { showToast.success('Template deleted'); loadRejectionTemplates(); }
      else showToast.error(res.message || 'Failed to delete');
    }, 'Delete');
  };

  // ==================== FILTER VALUE LOADER ====================
  const onFilterTypeChange = (type: string, setter: (vals: TaxonomyItem[]) => void) => {
    setter(type ? (taxonomy[type as keyof typeof taxonomy] || []) : []);
  };

  // ==================== FIELD RENDERER (non-pricing tabs) ====================
  const renderField = (key: string) => {
    const field = FIELD_MAP[key] || { label: key };
    const val = config[key] || '';

    if (field.type === 'textarea') return (
      <div className="col-md-12 mb-3" key={key}>
        <label className="form-label" style={labelStyle}>{field.label}</label>
        <textarea className="form-control" style={inputStyle} rows={4} value={val} onChange={(e) => update(key, e.target.value)} />
        {field.hint && <div className="form-text small">{field.hint}</div>}
      </div>
    );
    if (field.type === 'password') return (
      <div className="col-md-6 mb-3" key={key}>
        <label className="form-label" style={labelStyle}>{field.label}</label>
        <div className="input-group">
          <input type={showPw[key] ? 'text' : 'password'} className="form-control" style={inputStyle} value={val} onChange={(e) => update(key, e.target.value)} />
          <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}>
            <i className={`bi bi-eye${showPw[key] ? '-slash' : ''}`}></i>
          </button>
        </div>
      </div>
    );
    if (field.type === 'select' && key === 'smtp_crypto') return (
      <div className="col-md-3 mb-3" key={key}>
        <label className="form-label" style={labelStyle}>{field.label}</label>
        <select className="form-select" style={inputStyle} value={val} onChange={(e) => update(key, e.target.value)}>
          <option value="ssl">SSL (Port 465)</option><option value="tls">TLS (Port 587)</option><option value="">None</option>
        </select>
      </div>
    );
    if (field.type === 'toggle') return (
      <div className="col-md-4 mb-3" key={key}>
        <label className="form-label" style={labelStyle}>{field.label}</label>
        <div className="form-check form-switch mt-1">
          <input className="form-check-input" type="checkbox" checked={val === '1' || val === 'true'} onChange={(e) => update(key, e.target.checked ? '1' : '0')} style={{ width: 42, height: 22 }} />
          <label className="form-check-label small ms-2">{val === '1' || val === 'true' ? 'Enabled' : 'Disabled'}</label>
        </div>
      </div>
    );
    const colSize = key.includes('smtp_port') || key.includes('smtp_crypto') ? 3 : key.includes('smtp') ? 6 : 4;
    return (
      <div className={`col-md-${colSize} mb-3`} key={key}>
        <label className="form-label" style={labelStyle}>{field.label}</label>
        <input type={key.includes('days') || key.includes('hours') || key.includes('rate') || key.includes('charge') || key.includes('value') || key.includes('amount') || key.includes('max') || key.includes('min') || key.includes('port') || key.includes('fee') || key.includes('discount') || key.includes('dep') || key.includes('percent') ? 'number' : 'text'}
          className="form-control" style={inputStyle} value={val} step="0.1" onChange={(e) => update(key, e.target.value)} />
        {field.hint && <div className="form-text small">{field.hint}</div>}
      </div>
    );
  };

  // ==================== BADGE HELPER ====================
  const filterBadgeColor = (type: string) => type === 'listing_type' ? 'primary' : type === 'category' ? 'success' : 'warning text-dark';

  // ==================== RENDER ====================
  if (loading) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  // ==================== PRICING TAB CONTENT ====================
  const renderPricingTab = () => (
    <>
      {/* ===== Filter-Based Sale Pricing Rules ===== */}
      <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
        <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-funnel" style={{ color: '#0d6efd' }}></i>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Filter-Based Pricing Rules</h5>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={() => openSaleModal()}>
              <i className="bi bi-plus-lg me-1"></i>Add Rule
            </button>
            <button className="btn btn-sm btn-outline-success" onClick={() => bulkSaleAction('activate')}>
              <i className="bi bi-play-circle me-1"></i>Activate All
            </button>
            <button className="btn btn-sm btn-outline-warning" onClick={() => bulkSaleAction('deactivate')}>
              <i className="bi bi-pause-circle me-1"></i>Deactivate All
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => bulkSaleAction('delete')}>
              <i className="bi bi-trash me-1"></i>Delete All
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: '1.25rem' }}>
          <div className="alert alert-info py-2 small mb-3">
            <i className="bi bi-info-circle me-1"></i>
            <strong>How it works:</strong> Define deduction rules per Listing Type, Category or Sub-Category.
            When a product matches multiple rules, the <strong>highest</strong> deduction threshold (base) always applies,
            and the <strong>highest</strong> depreciation amount (among rules where usage falls in range) is picked — they are <strong>not</strong> summed.
            <br /><strong>Formula:</strong> Suggested Price = Original Price - (Original x Base Threshold%) - (Original x Max Depreciation%)
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Filter Type</th><th>Filtered Value</th><th>Deduction Threshold (%)</th>
                  <th>Depreciation Range</th><th>Depreciation Amt (%)</th><th>Status</th><th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {saleRules.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">
                    <i className="bi bi-inbox" style={{ fontSize: '1.5rem' }}></i><br />
                    No pricing rules yet. Click <strong>Add Rule</strong> to create one.
                  </td></tr>
                )}
                {saleRules.map(rule => (
                  <tr key={rule.id}>
                    <td><span className={`badge bg-${filterBadgeColor(rule.filter_type)}`}>{rule.filter_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
                    <td>{rule.filter_label}</td>
                    <td><strong>{rule.deduction_threshold}%</strong></td>
                    <td>{Number(rule.depreciation_range_max) > 0 ? `${rule.depreciation_range_min} – ${rule.depreciation_range_max}` : `${rule.depreciation_range_min}+`}</td>
                    <td><strong>{rule.depreciation_amount}%</strong></td>
                    <td>
                      <span className={`badge bg-${Number(rule.is_active) ? 'success' : 'secondary'}`}>
                        {Number(rule.is_active) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openSaleModal(rule)} title="Edit"><i className="bi bi-pencil"></i></button>
                      <button
                        className={`btn btn-sm me-1 ${Number(rule.is_active) ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => toggleSaleRule(rule.id)}
                        title={Number(rule.is_active) ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`bi ${Number(rule.is_active) ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSaleRule(rule.id)} title="Delete"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== Filter-Based Rental & Deposit Rules ===== */}
      <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
        <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar2-range text-info"></i>
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Filter-Based Rental & Deposit Rules</h5>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-info" onClick={() => openRentalModal()}>
              <i className="bi bi-plus-lg me-1"></i>Add Rental Rule
            </button>
            <button className="btn btn-sm btn-outline-success" onClick={() => bulkRentalAction('activate')}>
              <i className="bi bi-play-circle me-1"></i>Activate All
            </button>
            <button className="btn btn-sm btn-outline-warning" onClick={() => bulkRentalAction('deactivate')}>
              <i className="bi bi-pause-circle me-1"></i>Deactivate All
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => bulkRentalAction('delete')}>
              <i className="bi bi-trash me-1"></i>Delete All
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: '1.25rem' }}>
          <div className="alert alert-info py-2 small mb-3">
            <i className="bi bi-info-circle me-1"></i>
            <strong>How it works:</strong> Rules match by Listing Type / Category / Sub-Category.
            When multiple rules match, pick <strong>MAX</strong> values (not sum).
            Each rule defines its own deposit deduction %, depreciation, deposit % and max rental cap.
            When multiple rules match, the highest values apply (not summed).
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Filter</th><th>Value</th><th>Deposit Deduction %</th><th>Depreciation Range</th>
                  <th>Depreciation %</th><th>Deposit %</th><th>Max Rental/Day %</th><th>Status</th><th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rentalRules.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-4">
                    <i className="bi bi-inbox" style={{ fontSize: '1.5rem' }}></i><br />
                    No rental pricing rules defined yet.
                  </td></tr>
                )}
                {rentalRules.map(rule => (
                  <tr key={rule.id}>
                    <td><span className={`badge bg-${filterBadgeColor(rule.filter_type)}`}>{rule.filter_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
                    <td>{rule.filter_label || rule.filter_value}</td>
                    <td className="text-center">{rule.deposit_deduction_threshold}%</td>
                    <td className="text-center">{Number(rule.depreciation_range_max) > 0 ? `${rule.depreciation_range_min} – ${rule.depreciation_range_max}` : `${rule.depreciation_range_min}+`}</td>
                    <td className="text-center">{rule.depreciation_amount}%</td>
                    <td className="text-center">{rule.deposit_percentage}%</td>
                    <td className="text-center">{rule.max_cost_cap_per_day}%</td>
                    <td className="text-center">
                      <span className={`badge bg-${Number(rule.is_active) ? 'success' : 'secondary'}`}>
                        {Number(rule.is_active) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openRentalModal(rule)} title="Edit"><i className="bi bi-pencil-square"></i></button>
                      <button
                        className={`btn btn-sm me-1 ${Number(rule.is_active) ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => toggleRentalRule(rule.id)}
                        title={Number(rule.is_active) ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`bi ${Number(rule.is_active) ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteRentalRule(rule.id)} title="Delete"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </>
  );

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid" style={{ marginBottom: 80 }}>
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-gear-fill" style={{ color: '#ffc63a' }}></i> Business Settings
          </h1>
          <p className="text-muted small">Configure global application rules, pricing factors, and transactional limits.</p>
        </div>

        {/* Tabs */}
        <div className="d-flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: 5 }}>
          {TABS.map((t) => (
            <button key={t.key} className="btn" onClick={() => setActiveTab(t.key)}
              style={{
                border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500,
                whiteSpace: 'nowrap', fontSize: '0.85rem',
                background: activeTab === t.key ? '#ffc63a' : '#fff',
                color: activeTab === t.key ? '#212529' : '#677788',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              }}>
              <i className={`bi ${t.icon} me-1`}></i>{t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'pricing' ? renderPricingTab() : activeTab === 'charges' ? (
          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-receipt" style={{ color: '#ffc63a' }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Platform Charges</h5>
                <span className="badge bg-dark rounded-pill" style={{ fontSize: '0.7rem' }}>{charges.length}</span>
              </div>
              <button className="btn btn-sm btn-warning fw-bold" onClick={() => openChargeModal()}>
                <i className="bi bi-plus-lg me-1"></i>Add New Charge
              </button>
            </div>
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div className="alert alert-info py-2 small mb-4">
                <i className="bi bi-info-circle me-1"></i>
                These charges are applied during subscription checkout. Enable or disable them as needed.
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#677788' }}>Charge Name</th>
                      <th style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#677788' }}>Type</th>
                      <th style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#677788' }}>Value</th>
                      <th style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: '#677788' }}>Status</th>
                      <th style={{ width: 110 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted py-5">
                        <i className="bi bi-receipt" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                        <p className="mt-2 mb-0">No platform charges configured. Click <strong>Add New Charge</strong> to create one.</p>
                      </td></tr>
                    )}
                    {charges.map(charge => (
                      <tr key={charge.id}>
                        <td className="fw-semibold">{charge.charge_name}</td>
                        <td>
                          <span className={`badge bg-${charge.charge_type === 'percentage' ? 'info' : 'secondary'}-subtle text-${charge.charge_type === 'percentage' ? 'info' : 'secondary'} border`} style={{ fontSize: '0.72rem' }}>
                            {charge.charge_type === 'percentage' ? 'Percentage' : 'Fixed'}
                          </span>
                        </td>
                        <td className="fw-bold">
                          {charge.charge_type === 'percentage' ? `${charge.charge_value}%` : `₹${parseFloat(charge.charge_value).toFixed(2)}`}
                        </td>
                        <td>
                          <button
                            className={`badge border-0 bg-${charge.is_active ? 'success' : 'danger'}-subtle text-${charge.is_active ? 'success' : 'danger'} border border-${charge.is_active ? 'success' : 'danger'}`}
                            style={{ cursor: 'pointer', fontSize: '0.72rem', padding: '5px 10px' }}
                            onClick={() => toggleCharge(charge)}
                          >
                            {charge.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openChargeModal(charge)} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCharge(charge.id)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add / Edit Charge Modal */}
            {chargeModal && editingCharge && (
              <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setChargeModal(false)}>
                <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                  <div className="modal-content" style={{ borderRadius: '0.75rem' }}>
                    <div className="modal-header border-0 pb-0">
                      <h5 className="modal-title fw-bold">
                        <i className="bi bi-receipt me-2" style={{ color: '#ffc63a' }}></i>
                        {editingCharge.id ? 'Edit Charge' : 'Add New Charge'}
                      </h5>
                      <button type="button" className="btn-close" onClick={() => setChargeModal(false)}></button>
                    </div>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label fw-bold small">Charge Name <span className="text-danger">*</span></label>
                        <input className="form-control" placeholder="e.g. GST, Service Fee" value={editingCharge.charge_name || ''}
                          onChange={e => setEditingCharge(p => ({ ...p!, charge_name: e.target.value }))} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold small">Type <span className="text-danger">*</span></label>
                        <select className="form-select" value={editingCharge.charge_type || 'percentage'}
                          onChange={e => setEditingCharge(p => ({ ...p!, charge_type: e.target.value as 'percentage' | 'fixed' }))}>
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold small">
                          Value <span className="text-danger">*</span>
                          <span className="text-muted fw-normal ms-1">({editingCharge.charge_type === 'percentage' ? '%' : '₹'})</span>
                        </label>
                        <input type="number" step="0.01" className="form-control" placeholder="e.g. 18"
                          value={editingCharge.charge_value || ''}
                          onChange={e => setEditingCharge(p => ({ ...p!, charge_value: e.target.value }))} />
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={!!editingCharge.is_active}
                          onChange={e => setEditingCharge(p => ({ ...p!, is_active: e.target.checked ? 1 : 0 }))}
                          style={{ width: 40, height: 22 }} />
                        <label className="form-check-label small fw-semibold ms-2">Active</label>
                      </div>
                    </div>
                    <div className="modal-footer border-0">
                      <button className="btn btn-light" onClick={() => setChargeModal(false)}>Cancel</button>
                      <button className="btn btn-warning fw-bold" disabled={chargeSaving} onClick={saveCharge}>
                        {chargeSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : <><i className="bi bi-check-lg me-1"></i>Save Charge</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'rejection' ? (
          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-x-circle" style={{ color: '#dc3545' }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Rejection Templates</h5>
                <span className="badge bg-dark rounded-pill" style={{ fontSize: '0.7rem' }}>{rejTemplates.length}</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => openRejModal()}>
                <i className="bi bi-plus-lg me-1"></i>Add Template
              </button>
            </div>
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div className="alert alert-info py-2 small mb-3">
                <i className="bi bi-info-circle me-1"></i>
                These templates appear as quick-pick rejection reasons when an Admin or SuperAdmin rejects a product. Select one to pre-fill the rejection remarks field.
              </div>
              {rejLoading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm" style={{ color: '#dc3545' }}></div></div>
              ) : rejTemplates.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-x-circle" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                  <p className="mt-2 mb-0">No rejection templates yet. Click <strong>Add Template</strong> to create one.</p>
                </div>
              ) : (
                  <div className="row g-3">
                    {rejTemplates.map((tpl) => (
                      <div key={tpl.id} className="col-12">
                        <div className="d-flex align-items-start gap-3 p-3 rounded border" style={{ background: '#fff8f8', borderColor: '#f5c6cb !important' }}>
                          <div className="flex-shrink-0 mt-1">
                            <i className="bi bi-chat-left-text text-danger" style={{ fontSize: '1.1rem' }}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className={`badge rounded-pill ${tpl.type === 'Brands' ? 'bg-info' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                                {tpl.type || 'Products'}
                              </span>
                              <p className="mb-0 fw-semibold" style={{ fontSize: '0.9rem', color: '#1e2022' }}>{tpl.template_text}</p>
                            </div>
                            <small className="text-muted">Created: {new Date(tpl.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                          </div>
                          <div className="d-flex gap-2 flex-shrink-0">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openRejModal(tpl)} title="Edit">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteRejTemplate(tpl.id)} title="Delete">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
        ) : activeTab === 'messages' ? (
          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-chat-dots" style={{ color: '#ffc63a' }}></i>
                <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>Application Messages</h5>
                <span className="badge bg-dark rounded-pill" style={{ fontSize: '0.7rem' }}>{appMessages.length}</span>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => { setShowAddMsg(true); setNewMsg({ message_key: '', message_value: '', category: 'general' }); }}>
                <i className="bi bi-plus-lg me-1"></i>Add Message
              </button>
            </div>
            <div className="card-body" style={{ padding: '1.25rem' }}>
              {/* Filter */}
              <div className="d-flex gap-2 mb-3">
                {['', 'general', 'error', 'success'].map(cat => (
                  <button key={cat} className={`btn btn-sm ${msgFilter === cat ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => setMsgFilter(cat)} style={{ borderRadius: 20, fontSize: '0.78rem', padding: '4px 14px' }}>
                    {cat || 'All'}
                  </button>
                ))}
              </div>
              <div className="table-responsive" style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                  <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: '#677788', width: 180 }}>Key</th>
                      <th style={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: '#677788', width: 80 }}>Category</th>
                      <th style={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: '#677788' }}>Message</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appMessages.filter(m => !msgFilter || m.category === msgFilter).map(m => (
                      <tr key={m.id}>
                        <td><code className="small" style={{ color: '#ffc63a', fontWeight: 700 }}>{m.message_key}</code></td>
                        <td><span className={`badge bg-${m.category === 'error' ? 'danger' : m.category === 'success' ? 'success' : 'secondary'}`} style={{ fontSize: '0.65rem' }}>{m.category}</span></td>
                        <td>
                          <textarea className="form-control form-control-sm" style={{ ...inputStyle, fontSize: '0.82rem' }} rows={1} value={m.message_value}
                            onChange={e => setAppMessages(prev => prev.map(p => p.id === m.id ? { ...p, message_value: e.target.value } : p))}
                            onBlur={async () => {
                              await api.post(`/shared/update-app-message/${m.id}`, { message_value: m.message_value });
                            }} />
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => {
                            confirmToast(`Delete "${m.message_key}"?`, async () => {
                              const res = await api.post(`/shared/delete-app-message/${m.id}`);
                              if (res.success) setAppMessages(prev => prev.filter(p => p.id !== m.id));
                            }, 'Delete');
                          }}><i className="bi bi-trash3"></i></button>
                        </td>
                      </tr>
                    ))}
                    {appMessages.filter(m => !msgFilter || m.category === msgFilter).length === 0 && (
                      <tr><td colSpan={4} className="text-center text-muted py-4">
                        <i className="bi bi-chat-square-text" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                        <p className="mt-2 mb-0">No messages found. Click "Add Message" to create one.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Message Modal */}
            {showAddMsg && (
              <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowAddMsg(false)}>
                <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                  <div className="modal-content" style={{ borderRadius: '0.75rem' }}>
                    <div className="modal-header">
                      <h5 className="modal-title fw-bold">Add Application Message</h5>
                      <button type="button" className="btn-close" onClick={() => setShowAddMsg(false)}></button>
                    </div>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label fw-bold small">Message Key <span className="text-danger">*</span></label>
                        <input className="form-control" placeholder="e.g. auth_login_required" value={newMsg.message_key}
                          onChange={e => setNewMsg(p => ({ ...p, message_key: e.target.value }))} />
                        <div className="form-text">Unique identifier, use snake_case.</div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold small">Category</label>
                        <select className="form-select" value={newMsg.category} onChange={e => setNewMsg(p => ({ ...p, category: e.target.value }))}>
                          <option value="general">General</option>
                          <option value="error">Error</option>
                          <option value="success">Success</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold small">Message <span className="text-danger">*</span></label>
                        <textarea className="form-control" rows={3} placeholder="The message text..." value={newMsg.message_value}
                          onChange={e => setNewMsg(p => ({ ...p, message_value: e.target.value }))} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowAddMsg(false)}>Cancel</button>
                      <button className="btn btn-primary" disabled={!newMsg.message_key || !newMsg.message_value} onClick={async () => {
                        const res = await api.post<{ id: number }>('/shared/add-app-message', newMsg);
                        if (res.success) {
                          setAppMessages(prev => [...prev, { id: res.data?.id || Date.now(), ...newMsg }]);
                          setShowAddMsg(false);
                          showToast.success('Message added!');
                        } else {
                          showToast.error(res.message || 'Failed to add');
                        }
                      }}><i className="bi bi-plus-lg me-1"></i>Add Message</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'payment' ? (
          /* ─── PhonePe Payment Integration ─── */
          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white d-flex align-items-center gap-2" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <i className="bi bi-phone" style={{ color: '#5f259f', fontSize: '1.2rem' }}></i>
              <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>PhonePe Integration Settings</h5>
            </div>
            <div className="card-body" style={{ padding: '1.5rem' }}>
              <div className="alert alert-info py-2 small mb-4">
                <i className="bi bi-info-circle me-1"></i>
                <strong>Note:</strong> Get your API credentials from the{' '}
                <strong>PhonePe Business Dashboard</strong> under Developer Settings.
                Use <em>Sandbox</em> for testing and <em>Production</em> for live payments.
              </div>

              <div className="row g-4">
                {/* Environment */}
                <div className="col-md-6">
                  <label style={labelStyle}>PhonePe Environment <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    style={inputStyle}
                    value={config['phonepe_env'] || 'sandbox'}
                    onChange={e => setConfig(p => ({ ...p, phonepe_env: e.target.value }))}
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                  <div className="form-text">
                    {config['phonepe_env'] === 'production'
                      ? <span className="text-danger fw-bold"><i className="bi bi-exclamation-triangle me-1"></i>LIVE mode — real payments will be processed!</span>
                      : <span className="text-muted">Safe for testing — no real payments.</span>}
                  </div>
                </div>

                {/* Merchant ID */}
                <div className="col-md-6">
                  <label style={labelStyle}>Merchant ID</label>
                  <input
                    type="text"
                    className="form-control"
                    style={inputStyle}
                    placeholder="e.g. PGMMKT000000"
                    value={config['phonepe_merchant_id'] || ''}
                    onChange={e => setConfig(p => ({ ...p, phonepe_merchant_id: e.target.value }))}
                  />
                  <div className="form-text">Your unique Merchant ID from PhonePe dashboard.</div>
                </div>

                {/* Client ID */}
                <div className="col-md-6">
                  <label style={labelStyle}>Client ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    style={inputStyle}
                    placeholder="Enter PhonePe Client ID"
                    value={config['phonepe_client_id'] || ''}
                    onChange={e => setConfig(p => ({ ...p, phonepe_client_id: e.target.value }))}
                  />
                </div>

                {/* Client Secret */}
                <div className="col-md-6">
                  <label style={labelStyle}>Client Secret <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type={showPw['phonepe_client_secret'] ? 'text' : 'password'}
                      className="form-control"
                      style={{ ...inputStyle, borderRadius: '0.5rem 0 0 0.5rem' }}
                      placeholder="Enter Client Secret"
                      value={config['phonepe_client_secret'] || ''}
                      onChange={e => setConfig(p => ({ ...p, phonepe_client_secret: e.target.value }))}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setShowPw(p => ({ ...p, phonepe_client_secret: !p['phonepe_client_secret'] }))}
                      style={{ borderRadius: '0 0.5rem 0.5rem 0', borderLeft: 'none' }}
                    >
                      <i className={`bi ${showPw['phonepe_client_secret'] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Client Version */}
                <div className="col-md-6">
                  <label style={labelStyle}>Client Version</label>
                  <input
                    type="number"
                    className="form-control"
                    style={inputStyle}
                    placeholder="1"
                    value={config['phonepe_client_version'] || '1'}
                    onChange={e => setConfig(p => ({ ...p, phonepe_client_version: e.target.value }))}
                  />
                  <div className="form-text">Default is 1 unless PhonePe specifies otherwise.</div>
                </div>

                {/* Test Connection */}
                <div className="col-12 mt-2">
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <button
                      className="btn btn-outline-primary px-4"
                      onClick={testPhonePeConn}
                      disabled={testingPhonePe}
                    >
                      {testingPhonePe
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Testing…</>
                        : <><i className="bi bi-shield-check me-2"></i>Test PhonePe Connection</>}
                    </button>
                    {phonePeTestResult && (
                      <div className={`alert py-2 px-3 mb-0 small fw-semibold ${phonePeTestResult.ok ? 'alert-success' : 'alert-danger'}`}>
                        <i className={`bi ${phonePeTestResult.ok ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                        {phonePeTestResult.msg}
                      </div>
                    )}
                  </div>
                  <div className="form-text mt-1">
                    Saves current credentials then attempts to get a PhonePe auth token.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="card-header bg-white d-flex align-items-center gap-2" style={{ borderBottom: '1px solid #f1f2f4', padding: '0.75rem 1.25rem', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <i className={`bi ${TABS.find((t) => t.key === activeTab)?.icon}`} style={{ color: '#ffc63a' }}></i>
              <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#1e2022' }}>{TABS.find((t) => t.key === activeTab)?.label}</h5>
            </div>
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div className="row">
                {(TAB_FIELDS[activeTab] || []).map((key) => renderField(key))}
                {(TAB_FIELDS[activeTab] || []).length === 0 && (
                  <div className="text-center text-muted py-4"><i className="bi bi-gear" style={{ fontSize: '2rem', color: '#ddd' }}></i><p className="mt-2">No configurable fields in this section yet.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fixed Save Footer */}
        <div className="save-footer" style={{
          position: 'fixed', bottom: 0, right: 0,
          background: '#fff', borderTop: '1px solid #f1f2f4', padding: '1rem 2rem',
          zIndex: 1030, boxShadow: '0 -5px 15px rgba(0,0,0,0.05)',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          left: 260, transition: 'left 0.3s ease',
        }}>
          <button className="btn px-4 px-md-5 py-2" onClick={handleSave} disabled={saving}
            style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', width: '100%', maxWidth: 280 }}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-circle me-2"></i>Save All Settings</>}
          </button>
        </div>
      </div>

      {/* ==================== SALE RULE MODAL ==================== */}
      {showSaleModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowSaleModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{editingSaleRule?.id ? 'Edit' : 'Add'} Pricing Rule</h5>
                <button type="button" className="btn-close" onClick={() => setShowSaleModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Filter Type <span className="text-danger">*</span></label>
                  <select className="form-select" value={editingSaleRule?.filter_type || ''} onChange={e => {
                    const ft = e.target.value;
                    setEditingSaleRule(r => ({ ...r!, filter_type: ft, filter_value: '' }));
                    onFilterTypeChange(ft, setFilterValues);
                  }}>
                    <option value="">Select Type</option>
                    <option value="listing_type">Listing Type</option>
                    <option value="category">Category</option>
                    <option value="sub_category">Sub-Category</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Filtered Value <span className="text-danger">*</span></label>
                  <select className="form-select" value={editingSaleRule?.filter_value || ''} disabled={!editingSaleRule?.filter_type}
                    onChange={e => setEditingSaleRule(r => ({ ...r!, filter_value: e.target.value }))}>
                    <option value="">{editingSaleRule?.filter_type ? 'Select Value' : 'Select Filter Type first'}</option>
                    {filterValues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Deduction Threshold (%) <span className="text-danger">*</span></label>
                  <input type="number" step="0.1" className="form-control" value={editingSaleRule?.deduction_threshold || ''} min={0} max={100} placeholder="e.g. 5"
                    onChange={e => setEditingSaleRule(r => ({ ...r!, deduction_threshold: e.target.value }))} />
                  <div className="form-text">Base deduction % that always applies (primary).</div>
                </div>
                {/* Multiple Depreciation Ranges */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0 fw-bold">Depreciation Ranges</label>
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => setSaleDepRanges(prev => [...prev, { min: '', max: '', amount: '' }])}>
                      <i className="bi bi-plus-lg me-1"></i>Add Range
                    </button>
                  </div>
                  <div className="form-text mb-2">Min is required. Leave Max empty to apply for all usage &ge; Min.</div>
                  {saleDepRanges.map((range, idx) => (
                    <div key={idx} className="d-flex gap-2 align-items-start mb-2" style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: 10, border: '1px solid #eee' }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label small mb-1">Min <span className="text-danger">*</span></label>
                        <input type="number" className="form-control form-control-sm" value={range.min} min={0} placeholder="e.g. 3"
                          onChange={e => { const v = [...saleDepRanges]; v[idx].min = e.target.value; setSaleDepRanges(v); }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label small mb-1">Max <small className="text-muted">(optional)</small></label>
                        <input type="number" className="form-control form-control-sm" value={range.max} min={0} placeholder="No limit"
                          onChange={e => { const v = [...saleDepRanges]; v[idx].max = e.target.value; setSaleDepRanges(v); }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label small mb-1">Dep % <span className="text-danger">*</span></label>
                        <input type="number" step="0.1" className="form-control form-control-sm" value={range.amount} min={0} max={100} placeholder="e.g. 10"
                          onChange={e => { const v = [...saleDepRanges]; v[idx].amount = e.target.value; setSaleDepRanges(v); }} />
                      </div>
                      {saleDepRanges.length > 1 && (
                        <button type="button" className="btn btn-sm btn-outline-danger mt-4" style={{ flexShrink: 0 }}
                          onClick={() => setSaleDepRanges(prev => prev.filter((_, i) => i !== idx))}>
                          <i className="bi bi-trash3"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSaleModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveSaleRule} disabled={modalSaving}>
                  {modalSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Rule</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== RENTAL RULE MODAL ==================== */}
      {showRentalModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowRentalModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{editingRentalRule?.id ? 'Edit' : 'Add'} Rental Pricing Rule</h5>
                <button type="button" className="btn-close" onClick={() => setShowRentalModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Filter Type <span className="text-danger">*</span></label>
                  <select className="form-select" value={editingRentalRule?.filter_type || ''} onChange={e => {
                    const ft = e.target.value;
                    setEditingRentalRule(r => ({ ...r!, filter_type: ft, filter_value: '' }));
                    onFilterTypeChange(ft, setRentalFilterValues);
                  }}>
                    <option value="">Select Filter Type</option>
                    <option value="listing_type">Listing Type</option>
                    <option value="category">Category</option>
                    <option value="sub_category">Sub Category</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Filter Value <span className="text-danger">*</span></label>
                  <select className="form-select" value={editingRentalRule?.filter_value || ''} disabled={!editingRentalRule?.filter_type}
                    onChange={e => setEditingRentalRule(r => ({ ...r!, filter_value: e.target.value }))}>
                    <option value="">{editingRentalRule?.filter_type ? 'Select Value' : 'Select Filter Type first'}</option>
                    {rentalFilterValues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Deposit Deduction Threshold (%) <span className="text-danger">*</span></label>
                  <input type="number" step="0.1" className="form-control" value={editingRentalRule?.deposit_deduction_threshold || ''} min={0} max={100} placeholder="e.g. 10"
                    onChange={e => setEditingRentalRule(r => ({ ...r!, deposit_deduction_threshold: e.target.value }))} />
                  <div className="form-text">Base % deduction from original price for deposit calculation.</div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label">Depreciation Range Min</label>
                    <input type="number" className="form-control" value={editingRentalRule?.depreciation_range_min || ''} min={0} placeholder="e.g. 3"
                      onChange={e => setEditingRentalRule(r => ({ ...r!, depreciation_range_min: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Depreciation Range Max</label>
                    <input type="number" className="form-control" value={editingRentalRule?.depreciation_range_max || ''} min={0} placeholder="e.g. 5"
                      onChange={e => setEditingRentalRule(r => ({ ...r!, depreciation_range_max: e.target.value }))} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Depreciation Amount (%)</label>
                  <input type="number" step="0.1" className="form-control" value={editingRentalRule?.depreciation_amount || ''} min={0} max={100} placeholder="e.g. 10"
                    onChange={e => setEditingRentalRule(r => ({ ...r!, depreciation_amount: e.target.value }))} />
                  <div className="form-text">Additional depreciation % if usage count falls within the range above.</div>
                </div>
                <hr />
                <div className="mb-3">
                  <label className="form-label">Deposit Percentage (%) <span className="text-danger">*</span></label>
                  <input type="number" step="0.1" className="form-control" value={editingRentalRule?.deposit_percentage || ''} min={0} max={100} placeholder="e.g. 40"
                    onChange={e => setEditingRentalRule(r => ({ ...r!, deposit_percentage: e.target.value }))} />
                  <div className="form-text">% of depreciated value that becomes the rental deposit.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Max Rental Cost Per Day (%) <span className="text-danger">*</span></label>
                  <input type="number" step="0.1" className="form-control" value={editingRentalRule?.max_cost_cap_per_day || ''} min={0} max={100} placeholder="e.g. 14"
                    onChange={e => setEditingRentalRule(r => ({ ...r!, max_cost_cap_per_day: e.target.value }))} />
                  <div className="form-text">Max rental cost per day as % of deposit.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRentalModal(false)}>Cancel</button>
                <button className="btn btn-info text-white" onClick={saveRentalRule} disabled={modalSaving}>
                  {modalSaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Rental Rule</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REJECTION TEMPLATE MODAL ==================== */}
      {showRejModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowRejModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ borderBottom: '2px solid #dc3545' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-x-circle me-2 text-danger"></i>
                  {editingRej ? 'Edit' : 'Add'} Rejection Template
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRejModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                 <div className="mb-3">
                  <label className="form-label fw-semibold">Template Type <span className="text-danger">*</span></label>
                  <select className="form-select" style={inputStyle} value={rejType} onChange={e => setRejType(e.target.value)}>
                    <option value="Products">Products</option>
                    <option value="Brands">Brands</option>
                  </select>
                </div>
                <label className="form-label fw-semibold">
                  Template Text <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="e.g. Product images are blurry or do not meet quality standards. Please re-upload clear, well-lit photos."
                  value={rejText}
                  onChange={e => setRejText(e.target.value)}
                  style={{ fontSize: '0.9rem', resize: 'vertical' }}
                />
                <div className="form-text mt-1">
                  This text will appear as a quick-pick option when admins reject a product or block a brand.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-secondary" onClick={() => setShowRejModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={saveRejTemplate} disabled={rejSaving}>
                  {rejSaving
                    ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                    : <><i className="bi bi-check-lg me-1"></i>{editingRej ? 'Update Template' : 'Add Template'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
