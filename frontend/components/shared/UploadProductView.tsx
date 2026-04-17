'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

interface Attribute { name: string; type: string; required?: boolean; options?: string; }

interface PricingRule {
  id: number;
  filter_type: string;       // '', 'sub_category', 'category', 'listing_type'
  filter_value: number | string; // ID of the sub_category / category / listing_type
  filter_label: string;
  is_active: number;
  depreciation_range_min: number; // used_times lower bound
  depreciation_range_max: number; // used_times upper bound (0 = unlimited)
  depreciation_amount: number;    // additional % for depreciation
  // Sale specific
  deduction_threshold?: number;    // % — used for max allowed price
  // Rental specific
  deposit_deduction_threshold?: number;
  deposit_percentage?: number;
  max_cost_cap_per_day?: number;
}

interface FormMeta {
  listing_types: Array<{ id: number; type_name: string; usage_label?: string; field_config?: string }>;
  product_types: Array<{ id: number; name: string; listing_type_id: number }>;
  categories: Array<{ id: number; name: string; product_type_id?: number; product_type_ids?: string; applies_to?: string; field_config?: string }>;
  sub_categories: Array<{ id: number; name: string; category_id?: number; category_ids?: string; field_config?: string }>;
  colors: Array<{ id: number; name: string; hex_code: string }>;
  genders: Array<{ id: number; name: string }>;
  brands: Array<{ id: number; brand_name: string; brand_image?: string; listing_type_id?: number | string | null; listing_type_ids?: string | null }>;
  config: Record<string, string>;
  pricing_rules: PricingRule[];
  rental_pricing_rules: PricingRule[];
}

interface Props { role: string; apiBasePath: string; redirectPath: string; }

const sectionStyle: React.CSSProperties = { background: '#fff', padding: 25, borderRadius: 12, marginBottom: 25, border: '1px solid #eee' };
const sectionTitle: React.CSSProperties = { fontWeight: 700, borderBottom: '2px solid #ffc63a', paddingBottom: 10, marginBottom: 20, display: 'inline-block', fontSize: '1.1rem' };
const labelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.875rem', marginBottom: 4 };
const inputStyle: React.CSSProperties = { padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 };
const btnYellow: React.CSSProperties = { background: '#ffc63a', color: '#000', border: 'none', borderRadius: 10, padding: '14px 28px', fontWeight: 700, transition: 'all 0.3s' };
const priceSuggestion: React.CSSProperties = { background: 'linear-gradient(135deg, #ffc63a 0%, #ffb800 100%)', color: '#000', padding: 20, borderRadius: 12, marginBottom: 15, boxShadow: '0 4px 10px rgba(255,198,58,0.2)' };

export default function UploadProductView({ role, apiBasePath, redirectPath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const imgRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [existingBills, setExistingBills] = useState<string[]>([]);

  // Images
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [billFiles, setBillFiles] = useState<File[]>([]);

  // Form state
  const [f, setF] = useState({
    listing_type: 'sell', title: '', gender: '', listing_type_category: '', product_type: '',
    category_id: '', sub_category_id: '', orignal_brand_id: '', description: '',
    color: '', used_times: '0', original_price: '', price: '', rental_deposit: '',
    rental_cost: '', allow_alter_fitting: false, dispatch_address: '', dispatch_state: '',
    dispatch_city: '', dispatch_pin_code: '', has_bill: false,
    admin_remarks: '', status: 'pending'
  });
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [dynamicAttributes, setDynamicAttributes] = useState<Attribute[]>([]);

  // Brand search
  const [brandSearch, setBrandSearch] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<{ id: number; name: string } | null>(null);

  // Cascading options
  const [productTypes, setProductTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [subCategories, setSubCategories] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    api.get<FormMeta>(`${apiBasePath}/upload-form-data`).then((r) => {
      if (r.success && r.data) setMeta(r.data);
      setLoading(false);
    });
  }, [apiBasePath]);

  // Check for edit parameter and load product data
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && meta) {
      setIsEditMode(true);
      setEditingProductId(parseInt(editId));

      // Load product data for editing
      api.get(`${apiBasePath}/product/${editId}`).then((r) => {
        if (r.success && r.data) {
          const product = r.data as any;

          // Resolve IDs from Names (DB stores names, but dropdowns use IDs)
          const ltId = meta.listing_types.find(lt => lt.type_name === product.listing_type_category)?.id || '';
          const ptId = meta.product_types.find(pt => pt.name === product.product_type)?.id || '';
          const cId = meta.categories.find(c => c.name === product.category)?.id || '';
          const scId = meta.sub_categories.find(sc => sc.name === product.sub_category)?.id || '';

          // Populate form with existing product data
          setF({
            listing_type: product.listing_type || 'sell',
            title: product.title || '',
            gender: product.gender || '',
            listing_type_category: String(ltId),
            product_type: String(ptId),
            category_id: String(cId),
            sub_category_id: String(scId),
            orignal_brand_id: product.orignal_brand_id || '',
            description: product.description || product.condition_description || '',
            color: product.color || '',
            used_times: String(product.used_times || product.times_used || '0'),
            original_price: String(product.original_price || ''),
            price: String(product.price || ''),
            rental_deposit: String(product.rental_deposit || ''),
            rental_cost: String(product.rental_cost || ''),
            allow_alter_fitting: Boolean(Number(product.allow_alter_fitting)),
            dispatch_address: product.dispatch_address || '',
            dispatch_state: product.dispatch_state || '',
            dispatch_city: product.dispatch_city || '',
            dispatch_pin_code: product.dispatch_pin_code || '',
            has_bill: Boolean(Number(product.has_bill)),
            admin_remarks: product.admin_remarks || '',
            status: product.status || 'pending',
          });

          // Helper to resolve media URLs (handles both old filename-only and new prefixed paths)
          const resolveUrl = (path: string, type: 'product' | 'bill' = 'product') => {
            if (!path || path.startsWith('http')) return path;
            let cleanPath = path;
            if (!cleanPath.includes('uploads/')) {
              const prefix = type === 'product' ? 'uploads/products/' : 'uploads/bills/';
              cleanPath = prefix + cleanPath;
            }
            return `http://localhost:8080/${cleanPath}`;
          };

          // Load existing images
          if (product.images && Array.isArray(product.images)) {
            setPreviews(product.images.map((img: any) => resolveUrl(img.image_path, 'product')));
          }

          // Handle existing bills
          if (product.bill_image) {
            try {
              const parsed = JSON.parse(product.bill_image);
              setExistingBills(Array.isArray(parsed) ? parsed : [product.bill_image]);
            } catch {
              setExistingBills([product.bill_image]);
            }
          }

          // Set selected brand if exists
          if (product.orignal_brand_id) {
            const brand = meta.brands.find(b => String(b.id) === String(product.orignal_brand_id));
            if (brand) {
              setSelectedBrand({ id: brand.id, name: brand.brand_name });
            }
          }

          // Load existing specifications
          if (product.specifications) {
            try {
              const parsed = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications;
              if (parsed && typeof parsed === 'object') {
                setAttributeValues(parsed);
              }
            } catch (err) {
              console.error('Failed to parse specifications:', err);
            }
          }
        }
      }).catch((err) => {
        console.error('Failed to load product for editing:', err);
        setError('Failed to load product data for editing');
      });
    }
  }, [searchParams, meta, apiBasePath]);

  // Cascade: listing_type_category → product_types
  useEffect(() => {
    if (!meta || !f.listing_type_category) { setProductTypes([]); return; }
    setProductTypes(meta.product_types.filter(pt => String(pt.listing_type_id) === f.listing_type_category));
  }, [f.listing_type_category, meta]);

  // Cascade: product_type → categories
  useEffect(() => {
    if (!meta || !f.product_type) { setCategories([]); return; }
    setCategories(meta.categories.filter(c => {
      // Support both single product_type_id and JSON array product_type_ids
      if (c.product_type_id != null) {
        return String(c.product_type_id) === String(f.product_type);
      }
      try {
        const ids = JSON.parse(c.product_type_ids || '[]');
        return ids.includes(Number(f.product_type)) || ids.includes(f.product_type);
      } catch { return false; }
    }));
  }, [f.product_type, meta]);

  // Cascade: category → sub_categories + filter genders by applies_to
  const [filteredGenders, setFilteredGenders] = useState<Array<{ id: number; name: string }>>([]);
  useEffect(() => {
    if (!meta || !f.category_id) { setSubCategories([]); setFilteredGenders(meta?.genders || []); return; }
    setSubCategories(meta.sub_categories.filter(sc => {
      // Support both single category_id and JSON array category_ids
      if (sc.category_id != null) {
        return String(sc.category_id) === String(f.category_id);
      }
      try {
        const ids = JSON.parse(sc.category_ids || '[]');
        return ids.includes(Number(f.category_id)) || ids.includes(f.category_id);
      } catch { return false; }
    }));
    // Filter genders by category's applies_to
    const selectedCat = meta.categories.find(c => String(c.id) === String(f.category_id));
    if (selectedCat && selectedCat.applies_to && selectedCat.applies_to !== 'all') {
      try {
        const appliesTo = JSON.parse(selectedCat.applies_to);
        if (Array.isArray(appliesTo) && appliesTo.length > 0) {
          setFilteredGenders(meta.genders.filter(g => appliesTo.map((a: string) => a.toLowerCase()).includes(g.name.toLowerCase())));
        } else {
          setFilteredGenders(meta.genders);
        }
      } catch { setFilteredGenders(meta.genders); }
    } else {
      setFilteredGenders(meta.genders);
    }
  }, [f.category_id, meta]);

  // Aggregate dynamic attributes from Listing Type, Category, and Sub-Category
  useEffect(() => {
    if (!meta) return;
    const attrs: Attribute[] = [];
    const seen = new Set<string>();

    const add = (fc?: string) => {
      if (!fc) return;
      try {
        const config = JSON.parse(fc);
        const list = config.attributes || [];
        list.forEach((a: any) => {
          const attr = typeof a === 'string' ? { name: a, type: 'text' } : a;
          if (attr.name && !seen.has(attr.name.toLowerCase())) {
            attrs.push(attr);
            seen.add(attr.name.toLowerCase());
          }
        });
      } catch { }
    };

    if (f.listing_type_category) add(meta.listing_types.find(lt => String(lt.id) === f.listing_type_category)?.field_config);
    if (f.category_id) add(meta.categories.find(c => String(c.id) === f.category_id)?.field_config);
    if (f.sub_category_id) add(meta.sub_categories.find(sc => String(sc.id) === f.sub_category_id)?.field_config);

    setDynamicAttributes(attrs);
    // Initialize/clean attribute values
    setAttributeValues(prev => {
      const next: Record<string, string> = {};
      attrs.forEach(a => { if (prev[a.name] !== undefined) next[a.name] = prev[a.name]; else next[a.name] = ''; });
      return next;
    });
  }, [f.listing_type_category, f.category_id, f.sub_category_id, meta]);

  /**
   * Find the best matching pricing rule for the current product.
   * Priority: sub_category → category → listing_type → default (empty filter_type)
   * Within each level, match by used_times falling in [depreciation_range_min, depreciation_range_max]
   * (range_max === 0 means no upper bound)
   */
  const findPricingRule = (rules: PricingRule[], usedTimes: number): { rule: PricingRule; source: string } | null => {
    const match = (filterType: string, filterValue: number | string): PricingRule | null => {
      const pool = rules.filter(r =>
        r.filter_type === filterType && String(r.filter_value) === String(filterValue)
      );
      return pool.find(r =>
        usedTimes >= Number(r.depreciation_range_min) &&
        (Number(r.depreciation_range_max) === 0 || usedTimes <= Number(r.depreciation_range_max))
      ) ?? null;
    };

    if (f.sub_category_id) {
      const r = match('sub_category', f.sub_category_id);
      if (r) return { rule: r, source: 'Sub-Category' };
    }
    if (f.category_id) {
      const r = match('category', f.category_id);
      if (r) return { rule: r, source: 'Category' };
    }
    if (f.listing_type_category) {
      const r = match('listing_type', f.listing_type_category);
      if (r) return { rule: r, source: 'Listing Type' };
    }
    // Default: filter_type is empty string or 'default'
    const defaults = rules.filter(r => !r.filter_type || r.filter_type === 'default');
    const r = defaults.find(d =>
      usedTimes >= Number(d.depreciation_range_min) &&
      (Number(d.depreciation_range_max) === 0 || usedTimes <= Number(d.depreciation_range_max))
    ) ?? null;
    return r ? { rule: r, source: 'Default' } : null;
  };
  
  const getFieldConfigs = () => {
    const lt = meta?.listing_types?.find(l => String(l.id) === f.listing_type_category);
    if (!lt?.field_config) return { gender: 'optional' };
    try {
      const config = JSON.parse(lt.field_config);
      return {
        gender: config.gender || 'optional'
      };
    } catch {
      return { gender: 'optional' };
    }
  };
  const fieldConfigs = getFieldConfigs();

  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isEditMode && isInitialLoad.current && f.price) {
      isInitialLoad.current = false;
      return;
    }
    if (!meta || f.listing_type !== 'sell') return;
    const origPrice = parseFloat(f.original_price);
    if (!origPrice || origPrice <= 0) return;

    const usedTimes = parseInt(f.used_times || '0');
    const found = findPricingRule(meta.pricing_rules || [], usedTimes);

    let deductionThreshold = parseFloat(meta.config.sale_base_discount || '0');
    let depreciationAmount = 0;
    if (found) {
      deductionThreshold = Number(found.rule.deduction_threshold);
      depreciationAmount = Number(found.rule.depreciation_amount);
    }

    // Suggested = original × (1 - (deductionThreshold + depreciationAmount) / 100)
    const suggested = Math.round(origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
    setF(prev => ({ ...prev, price: String(suggested > 0 ? suggested : 1) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.original_price, f.used_times, f.listing_type, f.sub_category_id, f.category_id, f.listing_type_category, meta, isEditMode]);

  // Auto-fill rental deposit & rental cost when original_price / used_times changes
  const isInitialRentalLoad = useRef(true);
  useEffect(() => {
    if (isEditMode && isInitialRentalLoad.current && f.rental_deposit) {
      isInitialRentalLoad.current = false;
      return;
    }
    if (!meta || f.listing_type !== 'rent') return;
    const origPrice = parseFloat(f.original_price);
    if (!origPrice || origPrice <= 0) return;

    const usedTimes = parseInt(f.used_times || '0');

    // Find rental pricing rule
    const found = findPricingRule(meta.rental_pricing_rules || [], usedTimes);
    let deposit = 0;
    let rental = 0;

    if (found) {
      const deductionThreshold = Number(found.rule.deposit_deduction_threshold ?? found.rule.deduction_threshold ?? 10);
      const depreciationAmount = Number(found.rule.depreciation_amount ?? 0);
      const maxCapPct = found.rule.max_cost_cap_per_day ? Number(found.rule.max_cost_cap_per_day) : 14;

      deposit = Math.round(origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
      rental = Math.round(deposit * (maxCapPct / 100));
    } else {
      // Use fallback settings: Deposit = Original Price, Rental = Deposit * (FallbackMaxCap%)
      const fallbackMaxCap = parseFloat(meta.config.rental_max_cost_cap_per_day || '14');
      deposit = origPrice;
      rental = Math.round(deposit * (fallbackMaxCap / 100));
    }

    setF(prev => ({
      ...prev,
      rental_deposit: String(deposit > 0 ? deposit : ''),
      rental_cost: String(rental > 0 ? rental : ''),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.original_price, f.used_times, f.listing_type, f.sub_category_id, f.category_id, f.listing_type_category, meta, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setF(prev => {
      const next = { ...prev, [name]: val };

      // Cascading Resets - Only trigger when user manually changes values
      if (name === 'listing_type_category') {
        next.product_type = '';
        next.category_id = '';
        next.sub_category_id = '';
        next.orignal_brand_id = '';
        setSelectedBrand(null);
        setBrandSearch('');
      } else if (name === 'product_type') {
        next.category_id = '';
        next.sub_category_id = '';
      } else if (name === 'category_id') {
        next.sub_category_id = '';
        next.gender = '';
      } else if (name === 'sub_category_id') {
        next.gender = '';
      }

      return next;
    });
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const max = parseInt(meta?.config?.max_product_images || '7');
    const combined = [...files, ...selected].slice(0, max);
    setFiles(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const selectBrand = (b: { id: number; brand_name: string }) => {
    setSelectedBrand({ id: b.id, name: b.brand_name });
    setF(prev => ({ ...prev, orignal_brand_id: String(b.id) }));
    setBrandOpen(false);
    setBrandSearch('');
  };

  const clearBrand = () => {
    setSelectedBrand(null);
    setF(prev => ({ ...prev, orignal_brand_id: '' }));
  };

  const filteredBrands = (meta?.brands || []).filter(b => {
    if (brandSearch && !b.brand_name.toLowerCase().includes(brandSearch.toLowerCase())) return false;
    if (f.listing_type_category) {
      const ltId = Number(f.listing_type_category);
      if (b.listing_type_ids) {
        // Has explicit multi-type config — filter strictly by it
        const ids: number[] = (typeof b.listing_type_ids === 'string' ? JSON.parse(b.listing_type_ids) : b.listing_type_ids).map(Number);
        if (!ids.includes(ltId)) return false;
      } else if (b.listing_type_id != null && b.listing_type_id !== '') {
        // Legacy single listing type — filter by it (coerce to number for safe comparison)
        if (Number(b.listing_type_id) !== ltId) return false;
      }
      // Both null/empty → show for all listing types
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configs = getFieldConfigs();
    if (configs.gender === 'mandatory' && !f.gender) { setError('Gender is required'); setSubmitting(false); return; }

    // Validate sale price doesn't exceed max allowed (based on pricing rule)
    if (f.listing_type === 'sell' && f.original_price && f.price && meta) {
      const origPrice = parseFloat(f.original_price);
      const usedTimes = parseInt(f.used_times || '0');
      const found = findPricingRule(meta.pricing_rules || [], usedTimes);
      const deductionThreshold = found ? Number(found.rule.deduction_threshold) : parseFloat(meta.config.sale_base_discount || '0');
      // Maximum Allowed Price = original × (1 - deductionThreshold / 100)
      const maxPrice = Math.round(origPrice * (1 - deductionThreshold / 100));
      if (parseFloat(f.price) > maxPrice) {
        const src = found ? found.source : 'Global';
        setError(`Sale price cannot exceed ₹${maxPrice.toLocaleString('en-IN')} (Original ₹${origPrice.toLocaleString('en-IN')} minus ${deductionThreshold}% deduction threshold — ${src} rule)`);
        setSubmitting(false);
        return;
      }
    }

    // Validate rental cost doesn't exceed max allowed (based on pricing rule)
    if (f.listing_type === 'rent' && f.rental_cost && meta) {
      const origPrice = parseFloat(f.original_price || '0');
      const usedTimes = parseInt(f.used_times || '0');
      const found = findPricingRule(meta.rental_pricing_rules || [], usedTimes);
      
      // dynamic values from settings
      let deductionThreshold = found ? parseFloat(meta.config.rental_base_deposit_deduction || '10') : 0;
      let maxCapPct = parseFloat(meta.config.rental_max_cost_cap_per_day || '14');

      if (found) {
        deductionThreshold = Number(found.rule.deposit_deduction_threshold ?? found.rule.deduction_threshold ?? deductionThreshold);
        maxCapPct = Number(found.rule.max_cost_cap_per_day || maxCapPct);
      }

      // 1. Validate Deposit Amount based on base deduction threshold
      const enteredDeposit = parseFloat(f.rental_deposit || '0');
      const maxDepositAllowed = Math.round(origPrice * (1 - deductionThreshold / 100));
      if (enteredDeposit > maxDepositAllowed) {
          setError(`Deposit cannot exceed ₹${maxDepositAllowed.toLocaleString('en-IN')} (based on ${deductionThreshold}% base deduction rule)`);
          setSubmitting(false);
          return;
      }

      // 2. Validate Rental Cost based on ENTERED deposit
      const maxRentalAllowed = Math.round(enteredDeposit * maxCapPct / 100);
      
      if (parseFloat(f.rental_cost) > maxRentalAllowed) {
        const src = found ? found.source : 'Global Default';
        setError(`Rental cost cannot exceed ₹${maxRentalAllowed.toLocaleString('en-IN')} per day (${maxCapPct}% cap based on ${src})`);
        setSubmitting(false);
        return;
      }
    }
    try {
      setError(''); setSuccess(''); setSubmitting(true);
      const fd = new FormData();
      // Map frontend field names to backend expected names
      const fieldMap: Record<string, string> = { used_times: 'times_used', description: 'condition_description' };
      Object.entries(f).forEach(([k, v]) => {
        const key = fieldMap[k] || k;
        if (typeof v === 'boolean') { if (v) fd.append(key, '1'); } else fd.append(key, v);
      });
      files.forEach(file => fd.append('product_images[]', file));
      billFiles.forEach(file => fd.append('bill_images[]', file));

      // Include dynamic attributes
      fd.append('specifications', JSON.stringify(attributeValues));

      let res;
      if (isEditMode && editingProductId) {
        // For admins/super_admins, update directly; for regular sellers, create edit request
        if (user?.role === 'super_admin' || user?.role === 'admin') {
          res = await api.upload(`${apiBasePath}/update-product/${editingProductId}`, fd);
        } else {
          // For regular sellers, create edit request
          const editData: Record<string, string | File> = {};
          Object.entries(f).forEach(([k, v]) => {
            const key = fieldMap[k] || k;
            if (typeof v === 'boolean') { if (v) editData[key] = '1'; } else editData[key] = v;
          });
          res = await api.post(`${apiBasePath}/edit-product/${editingProductId}`, editData);
        }
      } else {
        // Create new product
        res = await api.upload(`${apiBasePath}/upload-product`, fd);
      }

      if (res.success) {
        const successMessage = isEditMode
          ? (['super_admin', 'admin'].includes(user?.role || '') ? 'Product updated successfully!' : 'Edit request submitted for admin approval!')
          : 'Product uploaded!';
        setSuccess(res.message || successMessage);
        setTimeout(() => router.push(redirectPath), 1500);
      }
      else setError(res.message || (isEditMode ? 'Update failed' : 'Upload failed'));
    } catch (err) {
      console.error('Upload Error:', err);
      setError('An unexpected error occurred during upload. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !meta) return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const cfg = meta.config;
  const isSell = f.listing_type === 'sell';
  const origPrice = parseFloat(f.original_price || '0');

  // ── Sale Price Suggestion Calculator (uses pricing_rules table) ──
  const salePriceSuggestion = (() => {
    const origPrice = parseFloat(f.original_price);
    if (!origPrice || origPrice <= 0) return null;

    const usedTimes = parseInt(f.used_times || '0');
    const found = findPricingRule(meta.pricing_rules || [], usedTimes);

    const deductionThreshold = found ? Number(found.rule.deduction_threshold) : parseFloat(cfg.sale_base_discount || '0');
    const depreciationAmount = found ? Number(found.rule.depreciation_amount) : 0;
    const source = found ? found.source : 'Default';

    // Suggested = original × (1 - (deductionThreshold + depreciationAmount) / 100)
    const suggestedPrice = Math.round(origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
    // Maximum Allowed = original × (1 - deductionThreshold / 100)
    const maxAllowedPrice = Math.round(origPrice * (1 - deductionThreshold / 100));

    return { deductionThreshold, depreciationAmount, suggestedPrice, maxAllowedPrice, source, ruleLabel: found?.rule.filter_label || '' };
  })();

  // ── Rental Price Suggestion Calculator (uses rental_pricing_rules table) ──
  const rentalPriceSuggestion = (() => {
    if (isSell) return null;
    const origPrice = parseFloat(f.original_price);
    if (!origPrice || origPrice <= 0) return null;

    const usedTimes = parseInt(f.used_times || '0');

    // Find rental pricing rule
    const found = findPricingRule(meta.rental_pricing_rules || [], usedTimes);
    
    // dynamic values from settings
    let deductionThreshold = parseFloat(cfg.rental_base_deposit_deduction || '10'); 
    let depreciationAmount = 0;
    let maxCapPct = parseFloat(cfg.rental_max_cost_cap_per_day || '14');
    let suggestedPct = parseFloat(cfg.rental_suggested_cost_percent || '10');
    
    let suggestedRental = 0;
    let source = found ? found.source : 'System Fallback';

    if (found) {
      deductionThreshold = Number(found.rule.deposit_deduction_threshold ?? found.rule.deduction_threshold ?? deductionThreshold);
      depreciationAmount = Number(found.rule.depreciation_amount ?? 0);
      maxCapPct = Number(found.rule.max_cost_cap_per_day || maxCapPct);
      
      const suggestedDeposit = Math.round(origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
      const maxDeposit = Math.round(origPrice * (1 - deductionThreshold / 100));
      
      const suggestedRental = Math.round(suggestedDeposit * (maxCapPct / 100));
      const maxRental = Math.round(maxDeposit * (maxCapPct / 100));
      
      return { 
        deductionThreshold, 
        depreciationAmount, 
        depositPct: 100, 
        suggestedDeposit, 
        maxDeposit,
        suggestedRental, 
        maxRental,
        maxCapPct,
        source,
        ruleLabel: found.rule.filter_label || ''
      };
    } else {
      // Use fallback settings: Suggested/Max Deposit = Original (0% deduction for fallback), Rental = Deposit * (FallbackMaxCap%)
      const fallbackMaxCap = parseFloat(cfg.rental_max_cost_cap_per_day || '14');
      const suggestedDeposit = origPrice;
      const maxDeposit = origPrice;
      const suggestedRental = Math.round(suggestedDeposit * (fallbackMaxCap / 100));
      const maxRental = Math.round(maxDeposit * (fallbackMaxCap / 100));

      return { 
        deductionThreshold: 0, 
        depreciationAmount: 0, 
        depositPct: 100, 
        suggestedDeposit, 
        maxDeposit,
        suggestedRental, 
        maxRental,
        maxCapPct: fallbackMaxCap,
        source,
        ruleLabel: 'Global Default'
      };
    }
  })();

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 style={{ fontWeight: 700 }}>
              <i className={isEditMode ? "bi bi-pencil-square" : "bi bi-cloud-upload"} style={{ color: '#ffc63a' }}></i>
              {isEditMode ? 'Edit Product' : 'Upload New Product'}
            </h2>
            <p className="text-muted mb-0">
              {isEditMode ? 'Update your product details' : 'List your item on Flex Market'}
            </p>
          </div>
          <a href={redirectPath} className="btn" style={{ border: '2px solid #ffc63a', color: '#000', borderRadius: 10, padding: '10px 20px', fontWeight: 600 }}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </a>
        </div>

        {role === 'super_admin' && (
          <BulkCsvUpload
            endpoint="/superadmin/bulk-upload-products"
            templateCsv="title,seller_id,listing_type,original_price,selling_price,rental_cost,rental_deposit,description,brand,color,size,gender,category,times_used,condition_description,status\nBlue Denim Jacket,5,sell,2500,1800,,,Stylish denim jacket,Levi's,Blue,L,Male,Jackets,3,Good condition,pending"
            templateFilename="products_template.csv"
            formatGuide="title (required), seller_id (required), listing_type (sell/rent), original_price (required), selling_price, rental_cost, rental_deposit, description, brand, color, size, gender, category, times_used, condition_description, status"
            title="Bulk Upload Products from CSV"
          />
        )}

        {error && <div className="alert alert-danger border-0 shadow-sm" style={{ borderRadius: 12 }}><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</div>}
        {success && <div className="alert alert-success border-0 shadow-sm" style={{ borderRadius: 12 }}><i className="bi bi-check-circle-fill me-2"></i>{success}</div>}

        {isEditMode && f.status === 'rejected' && f.admin_remarks && (
          <div className="alert border-0 shadow-sm mb-4" style={{ borderRadius: 12, background: 'rgba(237,76,120,0.1)', borderLeft: '5px solid #ed4c78' }}>
            <h6 className="fw-bold text-danger mb-1 mt-1">
              <i className="bi bi-x-circle-fill me-2"></i>Product Rejected
            </h6>
            <p className="mb-1 text-dark" style={{ fontSize: '0.9rem' }}>
              <strong>Reason:</strong> {f.admin_remarks}
            </p>
            <small className="text-muted">Please correct the issues mentioned above and save your changes for re-approval.</small>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 15, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', border: 'none', overflow: 'hidden', padding: 30 }}>

          {/* ── Listing Type ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-tag me-2"></i>Listing Type</h5>
            <div className="btn-group w-100" role="group">
              <input type="radio" className="btn-check" name="listing_type_radio" id="sell" value="sell" checked={isSell} onChange={() => setF(p => ({ ...p, listing_type: 'sell' }))} />
              <label className="btn" htmlFor="sell" style={{ border: '1px solid #ddd', color: isSell ? '#000' : '#666', background: isSell ? '#ffc63a' : '#fff', borderColor: isSell ? '#ffc63a' : '#ddd', fontWeight: 600 }}>
                <i className="bi bi-currency-rupee me-1"></i> Sell
              </label>
              <input type="radio" className="btn-check" name="listing_type_radio" id="rent" value="rent" checked={!isSell} onChange={() => setF(p => ({ ...p, listing_type: 'rent' }))} />
              <label className="btn" htmlFor="rent" style={{ border: '1px solid #ddd', color: !isSell ? '#000' : '#666', background: !isSell ? '#0dcaf0' : '#fff', borderColor: !isSell ? '#0dcaf0' : '#ddd', fontWeight: 600 }}>
                <i className="bi bi-clock-history me-1"></i> Rent
              </label>
            </div>
          </div>

          {/* ── Basic Details ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-info-circle me-2"></i>Basic Details</h5>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label" style={labelStyle}>Product Title <span className="text-danger">*</span></label><input className="form-control" style={inputStyle} name="title" value={f.title} onChange={handleChange} required /></div>
              <div className="col-md-6"><label className="form-label" style={labelStyle}>Listing Type <span className="text-danger">*</span></label>
                <select className="form-select" style={inputStyle} name="listing_type_category" value={f.listing_type_category} onChange={handleChange} required>
                  <option value="">Select Type</option>
                  {meta.listing_types.map(lt => <option key={lt.id} value={lt.id}>{lt.type_name}</option>)}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label" style={labelStyle}>Product Type <span className="text-danger">*</span></label>
                <select className="form-select" style={inputStyle} name="product_type" value={f.product_type} onChange={handleChange} required disabled={!productTypes.length}>
                  <option value="">{productTypes.length ? 'Select' : 'Select Listing Type first'}</option>
                  {productTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label" style={labelStyle}>Category <span className="text-danger">*</span></label>
                <select className="form-select" style={inputStyle} name="category_id" value={f.category_id} onChange={handleChange} required disabled={!categories.length}>
                  <option value="">{categories.length ? 'Select' : 'Select Product Type first'}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="col-md-3"><label className="form-label" style={labelStyle}>Sub-Category <small>(Optional)</small></label>
                <select className="form-select" style={inputStyle} name="sub_category_id" value={f.sub_category_id} onChange={handleChange} disabled={!subCategories.length}>
                  <option value="">{subCategories.length ? 'Select' : 'Select Category first'}</option>
                  {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>
              {fieldConfigs.gender !== 'hidden' && (
                <div className="col-md-3">
                  <label className="form-label" style={labelStyle}>
                    Gender {fieldConfigs.gender === 'mandatory' && <span className="text-danger">*</span>}
                  </label>
                  <select className="form-select" style={inputStyle} name="gender" value={f.gender} onChange={handleChange} 
                    required={fieldConfigs.gender === 'mandatory'} disabled={!f.category_id}>
                    <option value="">{f.category_id ? 'Select Gender' : 'Select Category first'}</option>
                    {filteredGenders.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
              )}
              <div className="col-md-3"><label className="form-label" style={labelStyle}>Original Brand <small>(e.g. Adidas)</small></label>
                <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                    <input className="form-control border-start-0 border-end-0" style={inputStyle} placeholder="Search brands..." value={brandSearch} onChange={(e) => { setBrandSearch(e.target.value); setBrandOpen(true); }} onFocus={() => setBrandOpen(true)} />
                    <span className="input-group-text bg-white border-start-0 text-muted"><i className="bi bi-chevron-down small"></i></span>
                  </div>
                  {brandOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ced4da', borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 1050, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {filteredBrands.map(b => (
                        <div key={b.id} onClick={() => selectBrand(b)} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #f1f3f5', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333' }}>{b.brand_name}</span>
                        </div>
                      ))}
                      {filteredBrands.length === 0 && <div className="text-center text-muted py-3 small">No brands found</div>}
                    </div>
                  )}
                  {selectedBrand && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#f1f3f5', border: '1px solid #dee2e6', borderRadius: 6, marginTop: 6, fontSize: '0.85rem', color: '#495057' }}>
                      <span>{selectedBrand.name}</span>
                      <button type="button" onClick={clearBrand} style={{ background: 'none', border: 'none', color: '#adb5bd', padding: 0, lineHeight: 1, fontSize: '1.1rem', cursor: 'pointer' }}><i className="bi bi-x"></i></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-12"><label className="form-label" style={labelStyle}>Description <span className="text-danger">*</span></label><textarea className="form-control" style={inputStyle} name="description" rows={4} value={f.description} onChange={handleChange} required /></div>
            </div>
          </div>


          {/* ── Specifications ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-rulers me-2"></i>Specifications</h5>
            <div className="row g-3">
              <div className="col-md-3"><label className="form-label" style={labelStyle}>Color <span className="text-danger">*</span></label>
                <select className="form-select" style={inputStyle} name="color" value={f.color} onChange={handleChange} required>
                  <option value="">Select Color</option>
                  {meta.colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label" style={labelStyle}>{(() => {
                const lt = meta?.listing_types?.find(l => String(l.id) === f.listing_type_category);
                if (lt?.usage_label) return lt.usage_label;
                const ltName = (lt?.type_name || '').toLowerCase();
                if (['electronics', 'furniture', 'appliances', 'home'].some(k => ltName.includes(k))) return 'Months used';
                return 'Number of times used';
              })()} <span className="text-danger">*</span></label>
                <input type="number" className="form-control" style={inputStyle} name="used_times" min="0" value={f.used_times} onChange={handleChange} required />
                <small className="text-muted">Enter 0 if brand new</small>
              </div>
              <div className="col-md-3"><label className="form-label" style={labelStyle}>Original Price <span className="text-danger">*</span></label>
                <div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" style={inputStyle} name="original_price" step="0.01" value={f.original_price} onChange={handleChange} required /></div>
              </div>

              {/* Dynamic taxonomy attributes */}
              {dynamicAttributes.map((attr, i) => (
                <div key={i} className="col-md-3">
                  <label className="form-label" style={labelStyle}>
                    {attr.name} {attr.required && <span className="text-danger">*</span>}
                  </label>
                  {attr.type === 'picklist' ? (
                    <select
                      className="form-select" style={inputStyle} required={attr.required}
                      value={attributeValues[attr.name] || ''}
                      onChange={(e) => setAttributeValues(prev => ({ ...prev, [attr.name]: e.target.value }))}
                    >
                      <option value="">Select {attr.name}</option>
                      {(attr.options || '').split(',').map((o: string) => o.trim()).filter(Boolean).map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={attr.type === 'number' ? 'number' : 'text'}
                      className="form-control" style={inputStyle} required={attr.required}
                      placeholder={attr.name}
                      value={attributeValues[attr.name] || ''}
                      onChange={(e) => setAttributeValues(prev => ({ ...prev, [attr.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Sale Pricing ── */}
          {isSell && (
            <div style={sectionStyle}>
              <h5 style={sectionTitle}><i className="bi bi-currency-rupee me-2"></i>Sale Pricing</h5>
              <div className="row g-3">
                <div className="col-md-12">
                  {salePriceSuggestion && (
                    <div style={priceSuggestion}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <small>Suggested Sale Price</small>
                          <h4 className="mb-0">₹{salePriceSuggestion.suggestedPrice.toLocaleString('en-IN')}</h4>
                          {salePriceSuggestion.ruleLabel && (
                            <div className="mt-2 small" style={{ opacity: 0.9 }}>
                              <i className="bi bi-info-circle me-1"></i>
                              {salePriceSuggestion.ruleLabel} ({salePriceSuggestion.source} Rule)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={labelStyle}>Sale Price <span className="text-danger">*</span></label>
                  <div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" style={inputStyle} name="price" step="0.01" value={f.price} onChange={handleChange} /></div>
                  <small className={parseFloat(f.price) > (salePriceSuggestion?.maxAllowedPrice || 0) ? "text-danger fw-bold" : "text-muted"}>
                    Must be at least {salePriceSuggestion ? salePriceSuggestion.deductionThreshold : (cfg.sale_base_discount || '0')}% less than original price
                    {salePriceSuggestion && ` (Max: ₹${salePriceSuggestion.maxAllowedPrice.toLocaleString('en-IN')})`}
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* ── Rental Pricing ── */}
          {!isSell && (
            <div style={sectionStyle}>
              <h5 style={sectionTitle}><i className="bi bi-clock-history me-2"></i>Rental Pricing</h5>
              <div className="row g-3">
                <div className="col-md-12">
                  {rentalPriceSuggestion && (
                    <div style={priceSuggestion}>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <small>Suggested (Deposit + Rent/Day)</small>
                          <h5 className="mb-0">₹{rentalPriceSuggestion.suggestedDeposit.toLocaleString('en-IN')} + ₹{rentalPriceSuggestion.suggestedRental.toLocaleString('en-IN')}</h5>
                        </div>
                        <div className="col-md-6 mb-2">
                          <small>Maximum (Deposit + Rent/Day)</small>
                          <h5 className="mb-0">₹{rentalPriceSuggestion.maxDeposit.toLocaleString('en-IN')} + ₹{rentalPriceSuggestion.maxRental.toLocaleString('en-IN')}</h5>
                        </div>
                        {rentalPriceSuggestion.ruleLabel && (
                          <div className="col-12 mt-1 small" style={{ opacity: 0.9 }}>
                            <i className="bi bi-info-circle me-1"></i>
                            {rentalPriceSuggestion.ruleLabel} ({rentalPriceSuggestion.source} Rule)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={labelStyle}>Deposit Amount</label>
                  <div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" style={inputStyle} name="rental_deposit" step="0.01" value={f.rental_deposit} onChange={handleChange} /></div>
                  <small className={(parseFloat(f.rental_deposit) > (origPrice - (origPrice * (rentalPriceSuggestion?.deductionThreshold ?? 0) / 100))) ? "text-danger fw-bold" : "text-muted"}>
                    {rentalPriceSuggestion?.deductionThreshold ? `At least ${rentalPriceSuggestion.deductionThreshold}% less than original` : 'Maximum allowed is original price'}
                    {origPrice > 0 && ` (Max: ₹${Math.round(origPrice - (origPrice * (rentalPriceSuggestion?.deductionThreshold ?? 0) / 100)).toLocaleString('en-IN')})`}
                  </small>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={labelStyle}>Rental Cost (per day)</label>
                  <div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" style={inputStyle} name="rental_cost" step="0.01" value={f.rental_cost} onChange={handleChange} /></div>
                  <small className={(parseFloat(f.rental_cost) > Math.round(parseFloat(f.rental_deposit || '0') * (rentalPriceSuggestion?.maxCapPct || 14) / 100)) ? "text-danger fw-bold" : "text-muted"}>
                    {rentalPriceSuggestion?.source === 'System Fallback' ? 'Recommended daily rate' : `Max ${rentalPriceSuggestion?.maxCapPct || '14'}% of deposit per day`}
                  </small>
                </div>
                <div className="col-md-12">
                  <div className="form-check"><input className="form-check-input" type="checkbox" name="allow_alter_fitting" checked={f.allow_alter_fitting as boolean} onChange={handleChange} /><label className="form-check-label">Allow buyer to alter the fitting</label></div>
                </div>
              </div>
            </div>
          )}

          {/* ── Dispatch Address ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-geo-alt me-2"></i>Dispatch Address</h5>
            <div className="row g-3">
              <div className="col-md-12"><label className="form-label" style={labelStyle}>Dispatch From <span className="text-danger">*</span></label><textarea className="form-control" style={inputStyle} name="dispatch_address" rows={2} value={f.dispatch_address} onChange={handleChange} required autoComplete="off" /><small className="text-muted">Full address from where the product will be dispatched</small></div>
              <div className="col-md-4"><label className="form-label" style={labelStyle}>State <span className="text-danger">*</span></label><input className="form-control" style={inputStyle} name="dispatch_state" placeholder="e.g., Delhi" value={f.dispatch_state} onChange={handleChange} required autoComplete="off" /></div>
              <div className="col-md-4"><label className="form-label" style={labelStyle}>City <span className="text-danger">*</span></label><input className="form-control" style={inputStyle} name="dispatch_city" placeholder="e.g., New Delhi" value={f.dispatch_city} onChange={handleChange} required autoComplete="off" /></div>
              <div className="col-md-4"><label className="form-label" style={labelStyle}>PIN Code <span className="text-danger">*</span></label><input className="form-control" style={inputStyle} name="dispatch_pin_code" pattern="[0-9]{6}" maxLength={6} placeholder="e.g., 110034" value={f.dispatch_pin_code} onChange={handleChange} required autoComplete="off" /><small className="text-muted">6-digit pin code</small></div>
            </div>
          </div>

          {/* ── Product Images ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-images me-2"></i>Product Images <span className="text-danger">*</span></h5>
            {cfg.image_upload_guidelines && (
              <div className="alert alert-info small mb-3" style={{ borderRadius: 12 }}><i className="bi bi-info-circle me-2"></i><strong>Image Guidelines:</strong><div className="mt-2" style={{ whiteSpace: 'pre-line' }}>{cfg.image_upload_guidelines}</div></div>
            )}
            <input ref={imgRef} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
            <button type="button" className="btn" style={{ border: '2px dashed #ffc63a', background: 'rgba(255,198,58,0.05)', borderRadius: 12, padding: '20px', width: '100%', textAlign: 'center', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }} onClick={() => !submitting && imgRef.current?.click()} disabled={submitting}>
              <i className="bi bi-cloud-arrow-up" style={{ fontSize: '2rem', color: '#ffc63a' }}></i>
              <p className="mb-0 mt-1 fw-bold small">Click to upload images</p>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Up to {cfg.max_product_images || '7'} images (Max {cfg.max_image_size_mb || '2'}MB each)</p>
            </button>
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 15, marginTop: 20 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: '#f8f9fa' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 14, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bill Upload ── */}
          <div style={sectionStyle}>
            <h5 style={sectionTitle}><i className="bi bi-receipt me-2"></i>Bill (Optional)</h5>
            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" name="has_bill" checked={f.has_bill as boolean} onChange={handleChange} />
              <label className="form-check-label">I have the original bill/invoice</label>
            </div>
            {f.has_bill && (
              <>
                {existingBills.length > 0 && (
                  <div className="mb-3">
                    <p className="small fw-bold mb-2">Current Bill(s):</p>
                    <div className="d-flex flex-wrap gap-2">
                      {existingBills.map((path, idx) => (
                        <a key={idx} href={path.startsWith('http') ? path : `http://localhost:8080/${path}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                          <i className="bi bi-file-earmark-text me-1"></i> Bill {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <input ref={billRef} type="file" accept="image/*,application/pdf,.doc,.docx" multiple onChange={(e) => setBillFiles(Array.from(e.target.files || []).slice(0, 2))} style={{ display: 'none' }} />
                <button type="button" className="btn btn-outline-secondary" onClick={() => !submitting && billRef.current?.click()} disabled={submitting}><i className="bi bi-paperclip me-1"></i>Upload New Bill</button>
                {billFiles.length > 0 && <small className="ms-2 text-muted">{billFiles.map(f => f.name).join(', ')}</small>}
                <small className="text-muted d-block mt-1">Upload up to 2 files to replace current bill (Images, PDF, Word)</small>
              </>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-lg sa-filter-btn" style={{ ...btnYellow, opacity: (submitting || success) ? 0.7 : 1, cursor: (submitting || success) ? 'not-allowed' : 'pointer' }} disabled={submitting || !!success}>
              {submitting ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>{isEditMode ? 'Updating...' : 'Uploading...'}</>
              ) : success ? (
                <><i className="bi bi-check-circle me-2"></i>{isEditMode ? 'Updated!' : 'Uploaded!'}</>
              ) : (
                <><i className="bi bi-cloud-upload me-2"></i>{isEditMode ? 'Save Changes' : 'Upload Product'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
