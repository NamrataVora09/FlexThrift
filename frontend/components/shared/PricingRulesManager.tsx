'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';
import BulkCsvUpload from './BulkCsvUpload';

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
  max_cost_cap_per_day: string;
  is_active: number;
}

interface TaxonomyItem { id: number; name: string; }

export default function PricingRulesManager() {
  const [loading, setLoading] = useState(true);
  const [saleRules, setSaleRules] = useState<PricingRule[]>([]);
  const [rentalRules, setRentalRules] = useState<RentalPricingRule[]>([]);
  const [taxonomy, setTaxonomy] = useState<{ listing_type: TaxonomyItem[]; category: TaxonomyItem[]; sub_category: TaxonomyItem[] }>({ listing_type: [], category: [], sub_category: [] });

  const [saleSearch, setSaleSearch] = useState('');
  const [rentalSearch, setRentalSearch] = useState('');

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [editingSaleRule, setEditingSaleRule] = useState<Partial<PricingRule> | null>(null);
  const [editingRentalRule, setEditingRentalRule] = useState<Partial<RentalPricingRule> | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [filterValues, setFilterValues] = useState<TaxonomyItem[]>([]);
  const [rentalFilterValues, setRentalFilterValues] = useState<TaxonomyItem[]>([]);
  const [saleDepRanges, setSaleDepRanges] = useState<Array<{ min: string; max: string; amount: string }>>([{ min: '', max: '', amount: '' }]);
  const [rentalDepRanges, setRentalDepRanges] = useState<Array<{ min: string; max: string; amount: string }>>([{ min: '', max: '', amount: '' }]);

  // Pagination
  const PAGE_SIZE = 10;
  const [salePage, setSalePage] = useState(1);
  const [rentalPage, setRentalPage] = useState(1);

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

  const filteredSaleRules = useMemo(() => {
    if (!saleSearch) return saleRules;
    const s = saleSearch.toLowerCase();
    return saleRules.filter(r => 
      r.filter_type.toLowerCase().includes(s) || 
      (r.filter_label || 'global').toLowerCase().includes(s) ||
      r.deduction_threshold.toString().includes(s)
    );
  }, [saleRules, saleSearch]);

  const filteredRentalRules = useMemo(() => {
    if (!rentalSearch) return rentalRules;
    const s = rentalSearch.toLowerCase();
    return rentalRules.filter(r => 
      r.filter_type.toLowerCase().includes(s) || 
      (r.filter_label || 'global').toLowerCase().includes(s) ||
      r.deposit_deduction_threshold.toString().includes(s)
    );
  }, [rentalRules, rentalSearch]);

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
    Promise.all([loadPricingRules(), loadTaxonomy()]).then(() => setLoading(false));
  }, [loadPricingRules, loadTaxonomy]);

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) => {
    const endA = maxA === 0 ? 999999999 : maxA;
    const endB = maxB === 0 ? 999999999 : maxB;
    return minA <= endB && minB <= endA;
  };

  const openSaleModal = (rule?: PricingRule) => {
    setEditingSaleRule(rule || { filter_type: '', filter_value: '', deduction_threshold: '', depreciation_range_min: '', depreciation_range_max: '', depreciation_amount: '' });
    setSaleDepRanges(rule ? [{ min: rule.depreciation_range_min || '', max: Number(rule.depreciation_range_max) > 0 ? rule.depreciation_range_max : '', amount: rule.depreciation_amount || '' }] : [{ min: '', max: '', amount: '' }]);
    setFilterValues(rule?.filter_type ? (taxonomy[rule.filter_type as keyof typeof taxonomy] || []) : []);
    setShowSaleModal(true);
  };

  const addSaleRange = () => {
    const lastRange = saleDepRanges[saleDepRanges.length - 1];
    const lastMax = lastRange?.max ? Number(lastRange.max) : 0;
    const nextMin = lastMax > 0 ? String(lastMax + 1) : '';
    setSaleDepRanges([...saleDepRanges, { min: nextMin, max: '', amount: '' }]);
  };

  const removeSaleRange = (index: number) => {
    setSaleDepRanges(saleDepRanges.filter((_, i) => i !== index));
  };

  const updateSaleRange = (index: number, field: 'min' | 'max' | 'amount', value: string) => {
    const newRanges = [...saleDepRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setSaleDepRanges(newRanges);
  };

  const saveSaleRule = async () => {
    if (!editingSaleRule) return;
    const { filter_type, filter_value, deduction_threshold } = editingSaleRule;
    if (!deduction_threshold) { showToast.warning('Deduction Threshold is required'); return; }
    // Validate no overlapping ranges
    for (let i = 0; i < saleDepRanges.length - 1; i++) {
      const cur = saleDepRanges[i];
      const nxt = saleDepRanges[i + 1];
      const curMax = Number(cur.max);
      const nxtMin = Number(nxt.min);
      if (curMax > 0 && nxtMin <= curMax) {
        showToast.warning(`Range ${i + 2}: Min must be greater than ${curMax} (end of previous range)`);
        return;
      }
    }
    try {
      // Check against existing rules (excluding the one being edited if applicable)
      for (let i = 0; i < saleDepRanges.length; i++) {
        const r = saleDepRanges[i];
        const min = Number(r.min);
        const max = Number(r.max) || 0;
        const endA = max === 0 ? 999999 : max;

        const overlap = saleRules.find(ex => {
          if (editingSaleRule.id && ex.id === editingSaleRule.id && saleDepRanges.length === 1) return false;
          // If we are doing bulk add (length > 1) and editingSaleRule.id exists, 
          // the old rule will be deleted first, but we still need to avoid overlapping with OTHER rules.
          if (editingSaleRule.id && ex.id === editingSaleRule.id) return false;

          if (ex.filter_type !== filter_type || String(ex.filter_value) !== String(filter_value)) return false;
          const minB = Number(ex.depreciation_range_min);
          const maxB = Number(ex.depreciation_range_max);
          const endB = maxB === 0 ? 999999 : maxB;
          return min <= endB && minB <= endA;
        });

        if (overlap) {
          showToast.warning(`Range ${i + 1} overlaps with existing rule (ID: ${overlap.id}, Range: ${overlap.depreciation_range_min}-${Number(overlap.depreciation_range_max) > 0 ? overlap.depreciation_range_max : '∞'})`);
          return;
        }
      }

      if (editingSaleRule.id && saleDepRanges.length === 1) {
        const res = await api.post('/superadmin/save-pricing-rule', {
          id: editingSaleRule.id, filter_type, filter_value, deduction_threshold,
          depreciation_range_min: saleDepRanges[0].min,
          depreciation_range_max: saleDepRanges[0].max || '0',
          depreciation_amount: saleDepRanges[0].amount,
        });
        if (!res.success) { showToast.error(res.message || 'Failed to save rule'); setModalSaving(false); return; }
      } else {
        if (editingSaleRule.id) await api.post(`/superadmin/delete-pricing-rule/${editingSaleRule.id}`, {});
        for (const r of saleDepRanges) {
          const res = await api.post('/superadmin/save-pricing-rule', {
            filter_type, filter_value, deduction_threshold,
            depreciation_range_min: r.min,
            depreciation_range_max: r.max || '0',
            depreciation_amount: r.amount,
          });
          if (!res.success) {
            showToast.error(res.message || 'Failed to save one or more ranges');
            setModalSaving(false);
            loadPricingRules();
            return;
          }
        }
      }
      showToast.success('Pricing rule(s) saved!');
      setShowSaleModal(false);
      loadPricingRules();
    } catch (e: any) { showToast.error(e?.message || 'Server error'); }
    setModalSaving(false);
  };

  const deleteSaleRule = (id: number) => {
    confirmToast('Delete this pricing rule?', async () => {
      const res = await api.post(`/superadmin/delete-pricing-rule/${id}`, {});
      if (res.success) { showToast.success('Deleted'); loadPricingRules(); }
    }, 'Delete');
  };

  const openRentalModal = (rule?: RentalPricingRule) => {
    setEditingRentalRule(rule || { filter_type: '', filter_value: '', deposit_deduction_threshold: '', depreciation_range_min: '', depreciation_range_max: '', depreciation_amount: '', max_cost_cap_per_day: '' });
    setRentalDepRanges(rule ? [{ min: rule.depreciation_range_min || '', max: Number(rule.depreciation_range_max) > 0 ? rule.depreciation_range_max : '', amount: rule.depreciation_amount || '' }] : [{ min: '', max: '', amount: '' }]);
    setRentalFilterValues(rule?.filter_type ? (taxonomy[rule.filter_type as keyof typeof taxonomy] || []) : []);
    setShowRentalModal(true);
  };

  const addRentalRange = () => {
    const lastRange = rentalDepRanges[rentalDepRanges.length - 1];
    const lastMax = lastRange?.max ? Number(lastRange.max) : 0;
    const nextMin = lastMax > 0 ? String(lastMax + 1) : '';
    setRentalDepRanges([...rentalDepRanges, { min: nextMin, max: '', amount: '' }]);
  };

  const removeRentalRange = (index: number) => {
    setRentalDepRanges(rentalDepRanges.filter((_, i) => i !== index));
  };

  const updateRentalRange = (index: number, field: 'min' | 'max' | 'amount', value: string) => {
    const newRanges = [...rentalDepRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setRentalDepRanges(newRanges);
  };

  const saveRentalRule = async () => {
    if (!editingRentalRule) return;
    const { filter_type, filter_value, deposit_deduction_threshold, max_cost_cap_per_day } = editingRentalRule;
    // Validate no overlapping ranges
    for (let i = 0; i < rentalDepRanges.length - 1; i++) {
      const cur = rentalDepRanges[i];
      const nxt = rentalDepRanges[i + 1];
      const curMax = Number(cur.max);
      const nxtMin = Number(nxt.min);
      if (curMax > 0 && nxtMin <= curMax) {
        showToast.warning(`Range ${i + 2}: Min must be greater than ${curMax} (end of previous range)`);
        return;
      }
    }
    try {
      // Check against existing rules
      for (let i = 0; i < rentalDepRanges.length; i++) {
        const r = rentalDepRanges[i];
        const min = Number(r.min);
        const max = Number(r.max) || 0;
        const endA = max === 0 ? 999999 : max;

        const overlap = rentalRules.find(ex => {
          if (editingRentalRule.id && ex.id === editingRentalRule.id && rentalDepRanges.length === 1) return false;
          if (editingRentalRule.id && ex.id === editingRentalRule.id) return false;

          if (ex.filter_type !== filter_type || String(ex.filter_value) !== String(filter_value)) return false;
          const minB = Number(ex.depreciation_range_min);
          const maxB = Number(ex.depreciation_range_max);
          const endB = maxB === 0 ? 999999 : maxB;
          return min <= endB && minB <= endA;
        });

        if (overlap) {
          showToast.warning(`Range ${i + 1} overlaps with existing rule (ID: ${overlap.id}, Range: ${overlap.depreciation_range_min}-${Number(overlap.depreciation_range_max) > 0 ? overlap.depreciation_range_max : '∞'})`);
          return;
        }
      }

      if (editingRentalRule.id && rentalDepRanges.length === 1) {
        const res = await api.post('/superadmin/save-rental-pricing-rule', {
          ...editingRentalRule,
          depreciation_range_min: rentalDepRanges[0].min,
          depreciation_range_max: rentalDepRanges[0].max || '0',
          depreciation_amount: rentalDepRanges[0].amount,
        });
        if (!res.success) { showToast.error(res.message || 'Failed to save rule'); setModalSaving(false); return; }
      } else {
        if (editingRentalRule.id) await api.post(`/superadmin/delete-rental-pricing-rule/${editingRentalRule.id}`, {});
        for (const r of rentalDepRanges) {
          const res = await api.post('/superadmin/save-rental-pricing-rule', {
            filter_type, filter_value, deposit_deduction_threshold, max_cost_cap_per_day,
            depreciation_range_min: r.min,
            depreciation_range_max: r.max || '0',
            depreciation_amount: r.amount,
          });
          if (!res.success) {
            showToast.error(res.message || 'Failed to save one or more ranges');
            setModalSaving(false);
            loadPricingRules();
            return;
          }
        }
      }
      showToast.success('Rental rule(s) saved!');
      setShowRentalModal(false);
      loadPricingRules();
    } catch (e: any) { showToast.error(e?.message || 'Server error'); }
    setModalSaving(false);
  };

  const deleteRentalRule = (id: number) => {
    confirmToast('Delete this rental rule?', async () => {
      const res = await api.post(`/superadmin/delete-rental-pricing-rule/${id}`, {});
      if (res.success) { showToast.success('Deleted'); loadPricingRules(); }
    }, 'Delete');
  };

  const toggleRuleStatus = async (id: number, type: 'sale' | 'rental') => {
    try {
      const endpoint = type === 'rental' ? `/superadmin/toggle-rental-pricing-rule/${id}` : `/superadmin/toggle-pricing-rule/${id}`;
      const res = await api.post(endpoint, {});
      if (res.success) {
        showToast.success('Status updated');
      } else {
        showToast.error(res.message || 'Failed to update status');
      }
    } catch { showToast.error('Failed to update status'); }
    finally { loadPricingRules(); }
  };

  const bulkAction = async (type: 'sale' | 'rental', action: 'activate' | 'deactivate' | 'delete') => {
    const confirmMsg = action === 'delete' ? `Delete all ${type} rules?` : `${action === 'activate' ? 'Activate' : 'Deactivate'} all ${type} rules?`;
    confirmToast(confirmMsg, async () => {
      try {
        const endpoint = action === 'delete' ? '/superadmin/bulk-delete-pricing-rules' : '/superadmin/bulk-toggle-pricing-rules';
        const res = await api.post(endpoint, { type, action });
        if (res.success) {
          showToast.success(res.message || 'Bulk action completed');
        } else {
          showToast.error(res.message || 'Action failed — check server logs');
        }
      } catch (e: any) {
        showToast.error('Network error: ' + (e?.message || 'Unknown error'));
      } finally {
        loadPricingRules();
      }
    }, action === 'delete' ? 'Delete All' : action.charAt(0).toUpperCase() + action.slice(1) + ' All');
  };

  const Paginator = ({ current, total, onPageChange }: { current: number; total: number; onPageChange: (p: number) => void }) => {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
      <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-top">
        <small className="text-muted">Showing {Math.min(total, (current - 1) * PAGE_SIZE + 1)} to {Math.min(total, current * PAGE_SIZE)} of {total}</small>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" disabled={current === 1} onClick={() => onPageChange(current - 1)}>Prev</button>
          {[...Array(pages)].map((_, i) => (
            <button key={i} className={`btn ${current === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onPageChange(i + 1)}>{i + 1}</button>
          ))}
          <button className="btn btn-outline-secondary" disabled={current === pages} onClick={() => onPageChange(current + 1)}>Next</button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center p-5"><div className="spinner-border text-warning" /></div>;

  return (
    <div className="pricing-rules-mgr">
      <style>{`
        .rules-table { font-size: 0.85rem; }
        .rules-table th { background: #f8f9fa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-filter { padding: 4px 8px; border-radius: 4px; font-weight: 600; }
        .search-box { position: relative; width: 300px; }
        .search-box i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #6c757d; }
        .search-box input { padding-left: 35px; border-radius: 20px; }
      `}</style>

      {/* Bulk Upload Section */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <BulkCsvUpload 
            title="Bulk Upload Sale Rules"
            endpoint="/superadmin/bulk-upload-pricing-rules"
            extraData={{ type: 'sale' }}
            onSuccess={loadPricingRules}
            templateCsv="filter_type,filter_label,threshold,min,max,amount\nlisting_type,Traditional,10,0,5,20"
            templateFilename="sale_pricing_rules_template.csv"
            formatGuide="Columns: filter_type (listing_type, category, sub_category), filter_label (Name of item), threshold (Base Deduction %), min (Min Usage), max (Max Usage, 0 for ∞), amount (Depreciation %). Overlaps will be skipped."
          />
        </div>
        <div className="col-lg-6">
          <BulkCsvUpload 
            title="Bulk Upload Rental Rules"
            endpoint="/superadmin/bulk-upload-pricing-rules"
            extraData={{ type: 'rental' }}
            onSuccess={loadPricingRules}
            templateCsv="filter_type,filter_label,threshold,min,max,amount,cap\nlisting_type,Traditional,5,0,5,10,14"
            templateFilename="rental_pricing_rules_template.csv"
            formatGuide="Columns: filter_type, filter_label, threshold (Deposit Ded. %), min, max, amount (Depreciation %), cap (Rental Cost Cap %, optional). Overlaps will be skipped."
          />
        </div>
      </div>

      {/* Sale Rules */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-tag-fill me-2 text-primary"></i>Sale Pricing Rules ({filteredSaleRules.length})</h6>
            <div className="search-box">
              <i className="bi bi-search"></i>
              <input type="text" className="form-control form-control-sm" placeholder="Search sale rules..." value={saleSearch} onChange={e => setSaleSearch(e.target.value)} />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-success" onClick={() => bulkAction('sale', 'activate')} title="Activate All"><i className="bi bi-check-circle-fill me-1"></i>Active All</button>
              <button className="btn btn-sm btn-outline-warning hover:text-white!" onClick={() => bulkAction('sale', 'deactivate')} title="Deactivate All"><i className="bi bi-slash-circle me-1"></i>Deactive All</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => bulkAction('sale', 'delete')} title="Delete All"><i className="bi bi-trash-fill me-1"></i>Delete All</button>
              <button className="btn btn-sm btn-primary" onClick={() => openSaleModal()}><i className="bi bi-plus-lg me-1"></i>Add Rule</button>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 rules-table">
              <thead>
                <tr>
                  <th>Filter Type</th><th>Value</th><th>Base Threshold (%)</th><th>Usage Range</th><th>Dep. (%)</th><th>Status</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSaleRules.length > 0 ? filteredSaleRules.slice((salePage - 1) * PAGE_SIZE, salePage * PAGE_SIZE).map(r => (
                  <tr key={r.id}>
                    <td><span className="badge bg-light text-dark border">{r.filter_type.replace('_', ' ')}</span></td>
                    <td>{r.filter_label || 'Global'}</td>
                    <td>{r.deduction_threshold}%</td>
                    <td>{r.depreciation_range_min} - {Number(r.depreciation_range_max) > 0 ? r.depreciation_range_max : '∞'}</td>
                    <td>{r.depreciation_amount}%</td>
                    <td>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={Number(r.is_active) === 1} onChange={() => toggleRuleStatus(r.id, 'sale')} />
                        <span className={`badge ${Number(r.is_active) === 1 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} ms-1`} style={{ fontSize: '0.7rem' }}>
                          {Number(r.is_active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openSaleModal(r)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSaleRule(r.id)}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No sale rules found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Paginator current={salePage} total={filteredSaleRules.length} onPageChange={setSalePage} />
      </div>

      {/* Rental Rules */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-calendar-event-fill me-2 text-success"></i>Rental Pricing Rules ({filteredRentalRules.length})</h6>
            <div className="search-box">
              <i className="bi bi-search"></i>
              <input type="text" className="form-control form-control-sm" placeholder="Search rental rules..." value={rentalSearch} onChange={e => setRentalSearch(e.target.value)} />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-success" onClick={() => bulkAction('rental', 'activate')} title="Activate All"><i className="bi bi-check-circle-fill me-1"></i>Active All</button>
              <button className="btn btn-sm btn-outline-warning hover:text-white!" onClick={() => bulkAction('rental', 'deactivate')} title="Deactivate All"><i className="bi bi-slash-circle me-1"></i>Deactive All</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => bulkAction('rental', 'delete')} title="Delete All"><i className="bi bi-trash-fill me-1"></i>Delete All</button>
              <button className="btn btn-sm btn-success" onClick={() => openRentalModal()}><i className="bi bi-plus-lg me-1"></i>Add Rule</button>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 rules-table">
              <thead>
                <tr>
                  <th>Filter Type</th><th>Value</th><th>Deposit Ded. (%)</th><th>Usage Range</th><th>Dep. (%)</th><th>Cost Cap (%)</th><th>Status</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRentalRules.length > 0 ? filteredRentalRules.slice((rentalPage - 1) * PAGE_SIZE, rentalPage * PAGE_SIZE).map(r => (
                  <tr key={r.id}>
                    <td><span className="badge bg-light text-dark border">{r.filter_type.replace('_', ' ')}</span></td>
                    <td>{r.filter_label || 'Global'}</td>
                    <td>{r.deposit_deduction_threshold}%</td>
                    <td>{r.depreciation_range_min} - {Number(r.depreciation_range_max) > 0 ? r.depreciation_range_max : '∞'}</td>
                    <td>{r.depreciation_amount}%</td>
                    <td>{Number(r.max_cost_cap_per_day) > 0 ? `${r.max_cost_cap_per_day}%` : <span className="text-muted small">Global Fallback</span>}</td>
                    <td>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={Number(r.is_active) === 1} onChange={() => toggleRuleStatus(r.id, 'rental')} />
                        <span className={`badge ${Number(r.is_active) === 1 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} ms-1`} style={{ fontSize: '0.7rem' }}>
                          {Number(r.is_active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openRentalModal(r)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteRentalRule(r.id)}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No rental rules found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Paginator current={rentalPage} total={filteredRentalRules.length} onPageChange={setRentalPage} />
      </div>

      {/* Sale Modal - simplified for the new location */}
      {showSaleModal && editingSaleRule && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingSaleRule.id ? 'Edit' : 'Add'} Sale Rule</h5>
                <button type="button" className="btn-close" onClick={() => setShowSaleModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Filter Type</label>
                    <select className="form-select" value={editingSaleRule.filter_type} onChange={e => {
                      const type = e.target.value;
                      setEditingSaleRule({ ...editingSaleRule, filter_type: type, filter_value: '', filter_label: '' });
                      setFilterValues(type ? (taxonomy[type as keyof typeof taxonomy] || []) : []);
                    }}>
                      <option value="">Global (All)</option>
                      <option value="listing_type">Listing Type</option>
                      <option value="category">Category</option>
                      <option value="sub_category">Sub-Category</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Filter Value</label>
                    <select className="form-select" value={editingSaleRule.filter_value} disabled={!editingSaleRule.filter_type} onChange={e => setEditingSaleRule({ ...editingSaleRule, filter_value: e.target.value, filter_label: e.target.options[e.target.selectedIndex].text })}>
                      <option value="">Select Value</option>
                      {filterValues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small fw-bold">Base Deduction Threshold (%)</label>
                    <input type="number" className="form-control" value={editingSaleRule.deduction_threshold} onChange={e => setEditingSaleRule({ ...editingSaleRule, deduction_threshold: e.target.value })} />
                  </div>
                  <div className="col-md-12"><hr /></div>
                  <div className="col-md-12 d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label small fw-bold mb-0">Depreciation Ranges</label>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addSaleRange}>
                      <i className="bi bi-plus-lg me-1"></i>Add Range
                    </button>
                  </div>

                  {saleDepRanges.map((range, index) => (
                    <div key={index} className="col-md-12">
                      <div className="row g-3 align-items-end mb-3 border-bottom pb-3">
                        <div className="col-md-3">
                          <label className="form-label small fw-bold">Min Usage</label>
                          <input type="number" className="form-control" value={range.min} onChange={e => updateSaleRange(index, 'min', e.target.value)} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-bold">Max Usage (0 for ∞)</label>
                          <input type="number" className="form-control" value={range.max} onChange={e => updateSaleRange(index, 'max', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-bold">Depreciation (%)</label>
                          <input type="number" className="form-control" value={range.amount} onChange={e => updateSaleRange(index, 'amount', e.target.value)} />
                        </div>
                        <div className="col-md-2 text-end">
                          {saleDepRanges.length > 1 && (
                            <button type="button" className="btn btn-outline-danger" onClick={() => removeSaleRange(index)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSaleModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveSaleRule} disabled={modalSaving}>{modalSaving ? 'Saving...' : 'Save Rule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rental Modal */}
      {showRentalModal && editingRentalRule && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingRentalRule.id ? 'Edit' : 'Add'} Rental Rule</h5>
                <button type="button" className="btn-close" onClick={() => setShowRentalModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Filter Type</label>
                    <select className="form-select" value={editingRentalRule.filter_type} onChange={e => {
                      const type = e.target.value;
                      setEditingRentalRule({ ...editingRentalRule, filter_type: type, filter_value: '', filter_label: '' });
                      setRentalFilterValues(type ? (taxonomy[type as keyof typeof taxonomy] || []) : []);
                    }}>
                      <option value="">Global (All)</option>
                      <option value="listing_type">Listing Type</option>
                      <option value="category">Category</option>
                      <option value="sub_category">Sub-Category</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Filter Value</label>
                    <select className="form-select" value={editingRentalRule.filter_value} disabled={!editingRentalRule.filter_type} onChange={e => setEditingRentalRule({ ...editingRentalRule, filter_value: e.target.value, filter_label: e.target.options[e.target.selectedIndex].text })}>
                      <option value="">Select Value</option>
                      {rentalFilterValues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small fw-bold">Deposit Ded. Threshold (%)</label>
                    <input type="number" className="form-control" value={editingRentalRule.deposit_deduction_threshold} onChange={e => setEditingRentalRule({ ...editingRentalRule, deposit_deduction_threshold: e.target.value })} />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small fw-bold">Max Rental Cost Cap (%)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="Leave empty or 0 to use Global Setting" value={editingRentalRule.max_cost_cap_per_day} onChange={e => setEditingRentalRule({ ...editingRentalRule, max_cost_cap_per_day: e.target.value })} />
                    <small className="text-muted">If set to 0 or empty, the global setting (14%) will be used.</small>
                  </div>
                  <div className="col-md-12"><hr /></div>
                  <div className="col-md-12 d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label small fw-bold mb-0">Depreciation Ranges</label>
                    <button type="button" className="btn btn-sm btn-outline-success" onClick={addRentalRange}>
                      <i className="bi bi-plus-lg me-1"></i>Add Range
                    </button>
                  </div>

                  {rentalDepRanges.map((range, index) => (
                    <div key={index} className="col-md-12">
                      <div className="row g-3 align-items-end mb-3 border-bottom pb-3">
                        <div className="col-md-3">
                          <label className="form-label small fw-bold">Min Usage</label>
                          <input type="number" className="form-control" value={range.min} onChange={e => updateRentalRange(index, 'min', e.target.value)} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small fw-bold">Max Usage (0 for ∞)</label>
                          <input type="number" className="form-control" value={range.max} onChange={e => updateRentalRange(index, 'max', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-bold">Depreciation (%)</label>
                          <input type="number" className="form-control" value={range.amount} onChange={e => updateRentalRange(index, 'amount', e.target.value)} />
                        </div>
                        <div className="col-md-2 text-end">
                          {rentalDepRanges.length > 1 && (
                            <button type="button" className="btn btn-outline-danger" onClick={() => removeRentalRange(index)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRentalModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={saveRentalRule} disabled={modalSaving}>{modalSaving ? 'Saving...' : 'Save Rule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
