'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { useSystem } from '@/lib/system-context';

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
  original_brands: Array<{ id: number; brand_name: string; brand_image?: string; listing_type_id?: number | string | null; listing_type_ids?: string | null }>;
  config: Record<string, string>;
  pricing_rules: PricingRule[];
  rental_pricing_rules: PricingRule[];
}

interface Props { role: string; apiBasePath: string; redirectPath: string; }

const sectionStyle: React.CSSProperties = { background: '#fff', padding: 25, borderRadius: 12, marginBottom: 25, border: '1px solid #eee' };
const sectionTitle: React.CSSProperties = { fontWeight: 700, borderBottom: '2px solid #ffc63a', paddingBottom: 10, marginBottom: 20, display: 'inline-block', fontSize: '1.1rem' };
const labelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.875rem', marginBottom: 4 };
const inputStyle: React.CSSProperties = { padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 };
const btnYellow: React.CSSProperties = { background: '#ffc63a', color: '#000', border: 'none', borderRadius: 10, padding: '14px 28px', fontWeight: 700 };
const priceSuggestion: React.CSSProperties = {
  background: '#ffc63a',
  color: '#000',
  padding: '24px 28px',
  borderRadius: 16,
  marginBottom: 20,
  boxShadow: '0 8px 30px rgba(255,198,58,0.15)',
  border: '1px solid rgba(0,0,0,0.05)'
};

const PRODUCT_CSV_TEMPLATE = `title,seller_email,listing_type,original_price,selling_price,rental_cost,rental_deposit,description,brand_name,color,size,gender,category,times_used,condition_description,status,images
Blue Denim Jacket,admin@example.com,sell,2500,1800,,,Stylish denim jacket,Levi's,Blue,L,Male,Jackets,3,Good condition,pending,"https://example.com/img1.jpg,https://example.com/img2.jpg"`;

export default function UploadProductView({ role, apiBasePath, redirectPath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { settings } = useSystem();
  const { toastSuccess, toastError, toastWarning } = useToast();
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
  const [billPreviews, setBillPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

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

  // Original Brand search
  const [obSearch, setObSearch] = useState('');
  const [obOpen, setObOpen] = useState(false);
  const [selectedOb, setSelectedOb] = useState<{ id: number; name: string } | null>(null);

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

          // Load existing images
          if (product.images && Array.isArray(product.images)) {
            setExistingImages(product.images);
            setPreviews(product.images.map((img: any) => resolveUrl(img.image_path, 'product')));
          }

          // Handle existing bills
          if (product.bill_image) {
            try {
              const parsed = JSON.parse(product.bill_image);
              setExistingBills(Array.isArray(parsed) ? parsed.map((p: any) => resolveUrl(p, 'bill')) : [resolveUrl(product.bill_image, 'bill')]);
            } catch {
              setExistingBills([resolveUrl(product.bill_image, 'bill')]);
            }
          }

          // Set selected original brand if exists
          if (product.orignal_brand_id) {
            const brand = meta.original_brands.find(b => String(b.id) === String(product.orignal_brand_id));
            if (brand) {
              setSelectedOb({ id: brand.id, name: brand.brand_name });
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
    const suggested = (origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
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
      const globalMaxCap = parseFloat(meta.config.rental_max_cost_cap_per_day || '0');
      const maxCapPct = Number(found.rule.max_cost_cap_per_day) > 0 ? Number(found.rule.max_cost_cap_per_day) : globalMaxCap;

      deposit = (origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
      rental = (deposit * (maxCapPct / 100));
    } else {
      // Use fallback settings: Deposit = Original Price, Rental = Deposit * (FallbackMaxCap%)
      const fallbackMaxCap = parseFloat(meta.config.fallback_rental_cost_per_day || '0');
      deposit = origPrice;
      rental = (deposit * (fallbackMaxCap / 100));
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
        setSelectedOb(null);
        setObSearch('');
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

    const currentTotal = existingImages.length + files.length;
    const remaining = max - currentTotal;

    if (remaining <= 0) {
      toastWarning('product_max_images', `Maximum ${max} images allowed.`, { max: String(max) });
      return;
    }

    const newToSelect = selected.slice(0, remaining);
    const newFiles = [...files, ...newToSelect];
    setFiles(newFiles);

    const existingPreviews = existingImages.map(img => resolveUrl(img.image_path, 'product'));
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setPreviews([...existingPreviews, ...newPreviews]);
  };

  const removeImage = (idx: number) => {
    if (idx < existingImages.length) {
      const removed = existingImages[idx];
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
      if (removed.id) setDeletedImageIds(prev => [...prev, removed.id]);
    } else {
      const fileIdx = idx - existingImages.length;
      const nextFiles = files.filter((_, i) => i !== fileIdx);
      setFiles(nextFiles);
    }
  };

  // Sync previews whenever files or existingImages change
  useEffect(() => {
    const ep = existingImages.map(img => resolveUrl(img.image_path, 'product'));
    const np = files.map(f => URL.createObjectURL(f));
    setPreviews([...ep, ...np]);
  }, [existingImages, files]);

  const handleBills = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const max = 2; // Fixed limit for bills
    const currentTotal = existingBills.length + billFiles.length;
    const remaining = max - currentTotal;

    if (remaining <= 0) {
      toastWarning('product_max_bills', `Maximum ${max} bill uploads allowed.`, { max: String(max) });
      return;
    }

    const newToSelect = selected.slice(0, remaining);
    setBillFiles(prev => [...prev, ...newToSelect]);
  };

  const removeBill = (idx: number) => {
    if (idx < existingBills.length) {
      setExistingBills(prev => prev.filter((_, i) => i !== idx));
    } else {
      const fileIdx = idx - existingBills.length;
      setBillFiles(prev => prev.filter((_, i) => i !== fileIdx));
    }
  };

  // Sync bill previews
  useEffect(() => {
    const eb = existingBills.map(b => b.startsWith('http') ? b : `http://localhost:8080/${b}`);
    const nb = billFiles.map(f => {
      if (f.type.startsWith('image/')) return URL.createObjectURL(f);
      return ''; // For PDF/Word we might show an icon
    });
    setBillPreviews([...eb, ...nb]);
  }, [existingBills, billFiles]);

  const filterBrandByListingType = (b: { listing_type_ids?: string | null; listing_type_id?: number | string | null }, ltId: number): boolean => {
    let ids: number[] | null = null;
    if (b.listing_type_ids) {
      try {
        const parsed = typeof b.listing_type_ids === 'string' ? JSON.parse(b.listing_type_ids) : b.listing_type_ids;
        if (Array.isArray(parsed) && parsed.length > 0) ids = parsed.map(Number);
      } catch { }
    }
    if (ids !== null) return ids.includes(ltId);
    if (b.listing_type_id != null && b.listing_type_id !== '') return Number(b.listing_type_id) === ltId;
    return true;
  };

  const filteredOriginalBrands = (meta?.original_brands || []).filter(b => {
    if (obSearch && !b.brand_name.toLowerCase().includes(obSearch.toLowerCase())) return false;
    if (f.listing_type_category) return filterBrandByListingType(b, Number(f.listing_type_category));
    return true;
  });

  const selectOb = (b: { id: number; brand_name: string }) => {
    setSelectedOb({ id: b.id, name: b.brand_name });
    setF(prev => ({ ...prev, orignal_brand_id: String(b.id) }));
    setObOpen(false);
    setObSearch('');
  };

  const clearOb = () => { setSelectedOb(null); setF(prev => ({ ...prev, orignal_brand_id: '' })); };

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
      const maxPrice = (origPrice * (1 - deductionThreshold / 100));
      if (parseFloat(f.price) > maxPrice) {
        const src = found ? found.source : 'Global';
        setError(`Sale price cannot exceed ₹${maxPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Original ₹${origPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })} minus ${deductionThreshold}% deduction threshold — ${src} rule)`);
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
      let deductionThreshold = parseFloat(meta.config.rental_base_deposit_deduction || '0');

      if (found) {
        deductionThreshold = Number(found.rule.deposit_deduction_threshold ?? found.rule.deduction_threshold ?? deductionThreshold);
      }

      // 1. Validate Deposit Amount based on base deduction threshold
      const enteredDeposit = parseFloat(f.rental_deposit || '0');
      const maxDepositAllowed = (origPrice * (1 - deductionThreshold / 100));
      if (enteredDeposit > maxDepositAllowed) {
        setError(`Deposit cannot exceed ₹${maxDepositAllowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (based on ${deductionThreshold}% base deduction rule)`);
        setSubmitting(false);
        return;
      }

      // 2. Validate Rental Cost based on ENTERED deposit
      const globalMaxCap = parseFloat(meta.config.rental_max_cost_cap_per_day || '0');
      const maxCapPct = (found && Number(found.rule.max_cost_cap_per_day) > 0) ? Number(found.rule.max_cost_cap_per_day) : globalMaxCap;
      const maxRentalAllowed = (enteredDeposit * maxCapPct / 100);

      if (parseFloat(f.rental_cost) > maxRentalAllowed) {
        const src = found ? found.source : 'Global Default';
        setError(`Rental cost cannot exceed ₹${maxRentalAllowed.toLocaleString('en-IN', { minimumFractionDigits: 2 })} per day (${maxCapPct}% cap based on ${src})`);
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
        // Prepare data
        const fieldMap: Record<string, string> = { used_times: 'times_used', description: 'condition_description' };

        // Add deleted images if any
        if (deletedImageIds.length > 0) {
          fd.append('deleted_images_ids', JSON.stringify(deletedImageIds));
        }

        // For sellers, use update-product directly if review is not required
        if (['super_admin', 'admin', 'superadmin'].includes(user?.role || '') || meta?.config.product_approval_required !== '1') {
          res = await api.upload(`${apiBasePath}/update-product/${editingProductId}`, fd);
        } else {
          // Otherwise, create an edit request
          res = await api.upload(`${apiBasePath}/edit-product/${editingProductId}`, fd);
        }
      } else {
        // Create new product
        res = await api.upload(`${apiBasePath}/upload-product`, fd);
      }
      
      if (res.success) {
        const isAutoApproved = ['super_admin', 'admin', 'superadmin'].includes(user?.role || '') || meta?.config.product_approval_required !== '1';
        const successMessage = isEditMode
          ? (isAutoApproved ? 'Product updated successfully!' : 'Edit request submitted for admin approval!')
          : (isAutoApproved ? 'Product uploaded!' : 'Product uploaded and pending admin approval!');
        
        toastSuccess('product_upload_success', res.message || successMessage);
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
    const suggestedPrice = (origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
    // Maximum Allowed = original × (1 - deductionThreshold / 100)
    const maxAllowedPrice = (origPrice * (1 - deductionThreshold / 100));

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
    let deductionThreshold = parseFloat(cfg.rental_base_deposit_deduction || '0');
    let depreciationAmount = 0;

    let suggestedRental = 0;
    let source = found ? found.source : 'System Fallback';

    if (found) {
      deductionThreshold = Number(found.rule.deposit_deduction_threshold ?? found.rule.deduction_threshold ?? deductionThreshold);
      depreciationAmount = Number(found.rule.depreciation_amount ?? 0);

      const suggestedDeposit = (origPrice * (1 - (deductionThreshold + depreciationAmount) / 100));
      const maxDeposit = (origPrice * (1 - deductionThreshold / 100));

      const globalMaxCap = parseFloat(cfg.rental_max_cost_cap_per_day || '0');
      const maxCapPct = Number(found.rule.max_cost_cap_per_day) > 0 ? Number(found.rule.max_cost_cap_per_day) : globalMaxCap;
      const suggestedRental = (suggestedDeposit * (maxCapPct / 100));
      const maxRental = (maxDeposit * (maxCapPct / 100));

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
      // Use Global Defaults (when no specific rule matches)
      const baseDedPct = parseFloat(cfg.rental_base_deposit_deduction || '0');
      const maxCapPct = parseFloat(cfg.rental_max_cost_cap_per_day || '0');

      const suggestedDeposit = (origPrice * (1 - baseDedPct / 100));
      const maxDeposit = suggestedDeposit;
      const suggestedRental = (suggestedDeposit * (maxCapPct / 100));
      const maxRental = suggestedRental;

      return {
        deductionThreshold: baseDedPct,
        depreciationAmount: 0,
        depositPct: 100,
        suggestedDeposit,
        maxDeposit,
        suggestedRental,
        maxRental,
        maxCapPct,
        source: 'Global Default',
        ruleLabel: 'Global Default'
      };
    }
  })();

  if (user && Number(user.blocked_seller) === 1) {
    return (
      <DashboardLayout requiredRoles={[role]}>
        <div className="container-fluid p-4 p-md-5 d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
          <div className="text-center p-5 shadow-sm" style={{ maxWidth: 500, background: '#fff', borderRadius: 24, border: '1px solid #fee2e2' }}>
            <div className="mb-4" style={{ width: 80, height: 80, background: '#fee2e2', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-shield-lock-fill" style={{ fontSize: '2.5rem', color: '#ef4444' }}></i>
            </div>
            <h3 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: 15 }}>Seller Access Restricted</h3>
            <p className="text-muted mb-4" style={{ lineHeight: 1.6 }}>
              Your seller privileges have been restricted by the administrator. You are currently unable to upload new products or manage existing listings.
            </p>
            <div className="p-3 mb-4" style={{ background: '#f9fafb', borderRadius: 12, border: '1px solid #eee', fontSize: '0.9rem' }}>
              <i className="bi bi-info-circle me-2" style={{ color: '#6b7280' }}></i>
              Please contact platform support for more information or to request a review of your account status.
            </div>
            <button
              onClick={() => router.push(redirectPath.includes('superadmin') ? '/superadmin' : '/seller')}
              className="btn btn-dark px-4 py-2"
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRoles={[role]}>
      <div className="container-fluid px-2 py-4 px-md-3 py-md-5">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 style={{ fontWeight: 800, margin: 0, color: '#1a1a1a' }}>
                <i className={isEditMode ? "bi bi-pencil-square" : "bi bi-cloud-upload"} style={{ color: '#ffc63a', marginRight: 15 }}></i>
                {isEditMode ? 'Edit Product' : 'Upload New Product'}
              </h2>
              <p className="text-muted mb-0">
                {isEditMode ? 'Update your product details' : `List your item on ${settings.site_name}`}
              </p>
            </div>
          </div>





          {error && (
            <div className="alert alert-danger mb-4 shadow-sm border-0 d-flex align-items-center" style={{ borderRadius: 12, background: '#fee2e2', color: '#991b1b', padding: '12px 20px' }}>
              <i className="bi bi-exclamation-circle-fill me-2" style={{ fontSize: '1.1rem' }}></i>
              <span className="fw-medium">{error}</span>
            </div>
          )}
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

            {/* ── Basic Details ── */}
            <div style={sectionStyle}>
              <h5 style={sectionTitle}><i className="bi bi-info-circle me-2"></i>Basic Details</h5>

              <div className="mb-4">
                <div className="btn-group w-100" role="group">
                  <input type="radio" className="btn-check" name="listing_type_radio" id="sell" value="sell" checked={isSell} onChange={() => setF(p => ({ ...p, listing_type: 'sell' }))} />
                  <label className="btn" htmlFor="sell" style={{ border: '1px solid #ddd', color: isSell ? '#fff' : '#666', background: isSell ? '#d96459' : '#fff', borderColor: isSell ? '#d96459' : '#ddd', fontWeight: 600 }}>
                    <i className="bi bi-currency-rupee me-1"></i> Sell
                  </label>
                  <input type="radio" className="btn-check" name="listing_type_radio" id="rent" value="rent" checked={!isSell} onChange={() => setF(p => ({ ...p, listing_type: 'rent' }))} />
                  <label className="btn" htmlFor="rent" style={{ border: '1px solid #ddd', color: !isSell ? '#fff' : '#666', background: !isSell ? '#008080' : '#fff', borderColor: !isSell ? '#008080' : '#ddd', fontWeight: 600 }}>
                    <i className="bi bi-clock-history me-1"></i> Rent
                  </label>
                </div>
              </div>

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
                <div className="col-md-3">
                  <label className="form-label" style={labelStyle}>Original Brand</label>
                  <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                      <input className="form-control border-start-0 border-end-0" style={inputStyle} placeholder="Search brands..." value={obSearch} onChange={(e) => { setObSearch(e.target.value); setObOpen(true); }} onFocus={() => setObOpen(true)} />
                      <span className="input-group-text bg-white border-start-0 text-muted"><i className="bi bi-chevron-down small"></i></span>
                    </div>
                    {obOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ced4da', borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 1050, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {filteredOriginalBrands.map(b => (
                          <div key={b.id} onClick={() => selectOb(b)} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #f1f3f5', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333' }}>{b.brand_name}</span>
                          </div>
                        ))}
                        {filteredOriginalBrands.length === 0 && <div className="text-center text-muted py-3 small">No brands found</div>}
                      </div>
                    )}
                    {selectedOb && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#f1f3f5', border: '1px solid #dee2e6', borderRadius: 6, marginTop: 6, fontSize: '0.85rem', color: '#495057' }}>
                        <span>{selectedOb.name}</span>
                        <button type="button" onClick={clearOb} style={{ background: 'none', border: 'none', color: '#adb5bd', padding: 0, lineHeight: 1, fontSize: '1.1rem', cursor: 'pointer' }}><i className="bi bi-x"></i></button>
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
                          <div className="col-md-6 mb-3 mb-md-0">
                            <div className="text-dark opacity-75 small fw-semibold mb-1">Suggested (Deposit + Rent/Day)</div>
                            <div className="h4 mb-0 fw-bold">₹{rentalPriceSuggestion.suggestedDeposit.toLocaleString('en-IN')} + ₹{rentalPriceSuggestion.suggestedRental.toLocaleString('en-IN')}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-dark opacity-75 small fw-semibold mb-1">Maximum (Deposit + Rent/Day)</div>
                            <div className="h4 mb-0 fw-bold">₹{rentalPriceSuggestion.maxDeposit.toLocaleString('en-IN')} + ₹{rentalPriceSuggestion.maxRental.toLocaleString('en-IN')}</div>
                          </div>
                          <div className="col-12 mt-3 pt-3 border-top border-dark border-opacity-10 d-flex align-items-center gap-2 small">
                            <i className="bi bi-info-circle"></i>
                            <span className="fw-medium">
                              {rentalPriceSuggestion.source === 'System Fallback'
                                ? 'Global Default (System Fallback Rule)'
                                : `${rentalPriceSuggestion.ruleLabel || 'Specific Match'} (${rentalPriceSuggestion.source} Rule)`}
                            </span>
                          </div>
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
                    <small className={(parseFloat(f.rental_cost) > Math.round(parseFloat(f.rental_deposit || '0') * (rentalPriceSuggestion?.maxCapPct || 0) / 100)) ? "text-danger fw-bold" : "text-muted"}>
                      {rentalPriceSuggestion?.source === 'System Fallback' ? 'Recommended daily rate' : `Max ${rentalPriceSuggestion?.maxCapPct || '0'}% of deposit per day`}
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

            {cfg.image_upload_guidelines && (
              <div className="alert alert-info small mb-3 shadow-sm border-0" style={{ borderRadius: 12, background: '#e0f2fe', color: '#0369a1' }}>
                <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '1.1rem' }}></i>
                <strong>Image Guidelines:</strong>
                <div className="mt-2 ms-4" style={{ whiteSpace: 'pre-line' }}>{cfg.image_upload_guidelines}</div>
              </div>
            )}

            {/* ── Product Images ── */}
            <div style={sectionStyle}>
              <h5 style={sectionTitle}><i className="bi bi-images me-2"></i>Product Images <span className="text-danger">*</span></h5>
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
              <div className="form-check mb-3" >
                <input className="form-check-input" type="checkbox" name="has_bill" checked={f.has_bill as boolean} onChange={handleChange} />
                <label className="form-check-label">I have the original bill/invoice</label>
              </div>
              {f.has_bill && (
                <>
                  <input ref={billRef} type="file" accept="image/*,application/pdf,.doc,.docx" multiple onChange={handleBills} style={{ display: 'none' }} />
                  <button type="button" className="btn" style={{ border: '2px dashed #ffc63a', background: 'rgba(255,198,58,0.05)', borderRadius: 12, padding: '20px', width: '100%', textAlign: 'center', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }} onClick={() => !submitting && billRef.current?.click()} disabled={submitting}>
                    <i className="bi bi-paperclip" style={{ fontSize: '2rem', color: '#ffc63a' }}></i>
                    <p className="mb-0 mt-1 fw-bold small">Click to upload bill</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Up to 2 files (Images, PDF, Word)</p>
                  </button>

                  {billPreviews.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 15, marginTop: 20 }}>
                      {billPreviews.map((src, i) => (
                        <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: '#f8f9fa' }}>
                          {src ? (
                            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                              <i className="bi bi-file-earmark-text" style={{ fontSize: '1.5rem' }}></i>
                              <span style={{ fontSize: '0.65rem' }}>DOC/PDF</span>
                            </div>
                          )}
                          <button type="button" onClick={() => removeBill(i)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 14, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
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
      </div>
    </DashboardLayout>
  );
}
