'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addToCart } from '@/lib/cart';
import LandingNavbar from '@/components/layout/LandingNavbar';
import Footer from '@/components/layout/Footer';

interface Product {
  id: number;
  title: string;
  listing_type: string;
  original_price: string;
  selling_price?: string;
  rental_cost?: string;
  price?: string;
  seller_name: string;
  seller_rating_avg?: string;
  image?: string;
  primary_image?: string;
  images?: string | string[];
  brand_name?: string;
  brand?: string;
  category?: string;
  gender?: string;
  status: string;
  orignal_brand?: string;
  seller_brand?: string;
}

interface ListingType {
  id: number;
  type_name: string;
}

interface FilterOptions {
  categories: Array<{ id: number; name: string; field_config?: string }>;
  sub_categories: Array<{ id: number; name: string; category_id: number; field_config?: string }>;
  brands: Array<{ id: number; brand_name: string }>;
  original_brands: Array<{ id: number; brand_name: string }>;
  colors: Array<{ id: number; name: string }>;
  genders: Array<{ id: number; name: string }>;
  sizes: string[];
  price_range: { min_price: number; max_price: number };
}

interface DynamicAttribute {
  name: string;
  type: string;
  options?: string[] | string;
  required?: boolean;
}

interface BrowseData {
  products: Product[];
  categories: Array<{ id: number; name: string }>;
  pagination: { page: number; total: number; total_pages: number };
  filter_options?: FilterOptions;
}

interface ActiveFilters {
  minPrice: string;
  maxPrice: string;
  categoryIds: string[];
  subCategoryIds: string[];
  brandIds: string[];
  originalBrandIds: string[];
  colors: string[];
  sizes: string[];
  genders: string[];
  condition: string;
  specs: Record<string, string[]>;
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`).replace(/\/$/, '');

const emptyFilters: ActiveFilters = {
  minPrice: '', maxPrice: '', categoryIds: [], subCategoryIds: [],
  brandIds: [], originalBrandIds: [], colors: [], sizes: [], genders: [], condition: '', specs: {},
};

function filtersFromParams(sp: URLSearchParams): ActiveFilters {
  const getArr = (key: string) => {
    const val = sp.get(key) || sp.get(key + '_id');
    return val ? val.split(',').filter(Boolean) : [];
  };
  return {
    minPrice: sp.get('min_price') || '',
    maxPrice: sp.get('max_price') || '',
    categoryIds: getArr('category'),
    subCategoryIds: getArr('sub_category'),
    brandIds: getArr('brand'),
    originalBrandIds: getArr('original_brand'),
    colors: getArr('color'),
    sizes: getArr('size'),
    genders: getArr('gender'),
    condition: sp.get('condition') || '',
    specs: (() => { try { return JSON.parse(sp.get('specs') || '{}'); } catch { return {}; } })(),
  };
}

function getProductPrice(p: Product): number {
  return Number(p.listing_type === 'sell'
    ? (p.selling_price || p.price || p.original_price || 0)
    : (p.rental_cost || p.price || 0));
}



export default function BrowsePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BrowseData | null>(null);
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeType, setActiveType] = useState(searchParams.get('listing_type') || '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cartUpdated, setCartUpdated] = useState(0);
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('flex_wishlist') || '[]'); } catch { return []; }
  });
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(() => filtersFromParams(searchParams as unknown as URLSearchParams));
  const [priceInput, setPriceInput] = useState({ min: filters.minPrice, max: filters.maxPrice });
  const [dynamicAttrs, setDynamicAttrs] = useState<DynamicAttribute[]>([]);
  const [modalConfig, setModalConfig] = useState<{
    type: 'brand' | 'color' | 'spec' | 'category' | 'size' | 'gender';
    title: string;
    items: Array<{ id: string | number; name: string }>;
    selectedIds: string[];
    specKey?: string;
  } | null>(null);

  const fuzzyMatch = (text: string, query: string): number => {
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    if (t.includes(q)) return 100;
    let score = 0, qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) { score += 10; qi++; }
    }
    return qi === q.length ? score : 0;
  };

  const fetchSuggestions = useCallback((query: string) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query || query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(() => {
      setSuggestLoading(true);
      fetch(`${API_BASE}/browse?search=${encodeURIComponent(query)}&page=1`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.products) {
            const scored = res.data.products
              .map((p: Product) => ({ ...p, _score: Math.max(fuzzyMatch(p.title, query), fuzzyMatch(p.brand_name || '', query)) }))
              .filter((p: Product & { _score: number }) => p._score > 0)
              .sort((a: { _score: number }, b: { _score: number }) => b._score - a._score)
              .slice(0, 6);
            setSuggestions(scored);
            setShowSuggestions(scored.length > 0);
          }
          setSuggestLoading(false);
        })
        .catch(() => setSuggestLoading(false));
    }, 300);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);



  useEffect(() => {
    fetch(`${API_BASE}/listing-types`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setListingTypes(res.data); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' && Number(user.blocked_buyer) === 1) {
        router.replace('/admin');
        return;
      }
      if (user.user_type === 'seller' && !['admin', 'super_admin'].includes(user.role)) {
        router.replace('/seller');
        return;
      }
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!filterOptions) { setDynamicAttrs([]); return; }

    const catId = filters.categoryIds[filters.categoryIds.length - 1];
    const subId = filters.subCategoryIds[filters.subCategoryIds.length - 1];

    // Selected sub-category → use its attrs only
    if (subId) {
      const sub = filterOptions.sub_categories.find(s => String(s.id) === subId);
      if (sub?.field_config) {
        try { const cfg = JSON.parse(sub.field_config); if (cfg.attributes?.length) { setDynamicAttrs(cfg.attributes); return; } } catch { }
      }
    }
    // Selected category → use its attrs only
    if (catId) {
      const cat = filterOptions.categories.find(c => String(c.id) === catId);
      if (cat?.field_config) {
        try { const cfg = JSON.parse(cat.field_config); if (cfg.attributes?.length) { setDynamicAttrs(cfg.attributes); return; } } catch { }
      }
    }

    // Nothing selected → aggregate all unique attrs from every category & sub-category
    const merged: Record<string, DynamicAttribute> = {};
    const parseOpts = (o: string[] | string | undefined): string[] => {
      if (!o) return [];
      if (Array.isArray(o)) return o;
      return o.split(',').map(s => s.trim()).filter(Boolean);
    };
    [...filterOptions.categories, ...filterOptions.sub_categories].forEach(item => {
      if (!item.field_config) return;
      try {
        const cfg = JSON.parse(item.field_config);
        (cfg.attributes || []).forEach((attr: DynamicAttribute) => {
          if (!merged[attr.name]) {
            merged[attr.name] = { ...attr };
          } else {
            const existOpts = parseOpts(merged[attr.name].options);
            const newOpts = parseOpts(attr.options);
            merged[attr.name] = { ...merged[attr.name], options: Array.from(new Set([...existOpts, ...newOpts])) };
          }
        });
      } catch { }
    });
    setDynamicAttrs(Object.values(merged));
  }, [filters.categoryIds, filters.subCategoryIds, filterOptions]);

  const buildUrl = (type: string, s: string, f: ActiveFilters): string => {
    const p = new URLSearchParams();
    if (type) p.set('listing_type', type);
    if (s) p.set('search', s);
    if (f.minPrice) p.set('min_price', f.minPrice);
    if (f.maxPrice) p.set('max_price', f.maxPrice);
    if (f.categoryIds.length) p.set('category_id', f.categoryIds.join(','));
    if (f.subCategoryIds.length) p.set('sub_category_id', f.subCategoryIds.join(','));
    if (f.brandIds.length) p.set('brand_id', f.brandIds.join(','));
    if (f.originalBrandIds.length) p.set('original_brand_id', f.originalBrandIds.join(','));
    if (f.colors.length) p.set('color', f.colors.join(','));
    if (f.sizes.length) p.set('size', f.sizes.join(','));
    if (f.genders.length) p.set('gender', f.genders.join(','));
    if (f.condition) p.set('condition', f.condition);
    const specsStr = JSON.stringify(f.specs);
    if (specsStr !== '{}') p.set('specs', specsStr);
    const qs = p.toString();
    return `/buyer/browse${qs ? `?${qs}` : ''}`;
  };

  const load = (p: number, sp: URLSearchParams) => {
    setLoading(true);
    const apiParams = new URLSearchParams(sp.toString());
    apiParams.set('page', String(p));
    fetch(`${API_BASE}/browse?${apiParams}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data);
          if (res.data.filter_options) {
            setFilterOptions(prev => prev ?? res.data.filter_options);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const s = searchParams.get('search') || '';
    const t = searchParams.get('listing_type') || '';
    const f = filtersFromParams(searchParams as unknown as URLSearchParams);
    setSearch(s);
    setActiveType(t);
    setFilters(f);
    setPriceInput({ min: f.minPrice, max: f.maxPrice });
    load(page, new URLSearchParams(searchParams.toString()));
  }, [searchParams, page]);

  const navigate = (type: string, s: string, f: ActiveFilters) => {
    router.push(buildUrl(type, s, f), { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); navigate(activeType, search, filters); };
  const handleTypeClick = (type: string) => { setActiveType(type); setPage(1); navigate(type, search, filters); };

  const setFilter = (key: keyof Omit<ActiveFilters, 'specs'>, val: string) => {
    setFilters(prev => {
      const current = prev[key];
      let updated: any;
      if (Array.isArray(current)) {
        updated = current.includes(val) ? current.filter(x => x !== val) : [...current, val];
      } else {
        updated = val;
      }
      const next = { ...prev, [key]: updated };
      if (key === 'categoryIds') { next.subCategoryIds = []; next.specs = {}; }
      if (key === 'subCategoryIds') { next.specs = {}; }
      setPage(1);
      navigate(activeType, search, next);
      return next;
    });
  };

  const setSpecFilter = (attrName: string, val: string) => {
    setFilters(prev => {
      const current = prev.specs[attrName] || [];
      const updated = current.includes(val) ? current.filter(x => x !== val) : [...current, val];
      const next = { ...prev, specs: { ...prev.specs, [attrName]: updated } };
      if (updated.length === 0) delete (next.specs as any)[attrName];
      setPage(1);
      navigate(activeType, search, next);
      return next;
    });
  };

  const applyPriceFilter = () => {
    const newF = { ...filters, minPrice: priceInput.min, maxPrice: priceInput.max };
    setFilters(newF);
    setPage(1);
    navigate(activeType, search, newF);
  };

  const clearAllFilters = () => {
    setFilters(emptyFilters);
    setPriceInput({ min: '', max: '' });
    setPage(1);
    navigate(activeType, search, emptyFilters);
  };

  const removeFilter = (key: string, val?: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (key.startsWith('spec:')) {
        const attrName = key.slice(5);
        if (val) {
          next.specs[attrName] = (next.specs[attrName] || []).filter(x => x !== val);
          if (next.specs[attrName].length === 0) delete next.specs[attrName];
        } else {
          delete next.specs[attrName];
        }
      } else if (Array.isArray((next as any)[key])) {
        if (val) {
          (next as any)[key] = ((next as any)[key] as string[]).filter(x => x !== val);
        } else {
          (next as any)[key] = [];
        }
      } else {
        (next as any)[key] = '';
        if (key === 'minPrice' || key === 'maxPrice') setPriceInput(p => ({ ...p, [key === 'minPrice' ? 'min' : 'max']: '' }));
      }
      setPage(1);
      navigate(activeType, search, next);
      return next;
    });
  };

  const activeChips: { label: string; key: string; val?: string }[] = [];
  if (filters.minPrice || filters.maxPrice) {
    activeChips.push({ label: `₹${filters.minPrice || '0'} – ₹${filters.maxPrice || '∞'}`, key: 'price' });
  }
  if (filterOptions) {
    filters.categoryIds.forEach(id => {
      const cat = filterOptions.categories.find(c => String(c.id) === id);
      if (cat) activeChips.push({ label: cat.name, key: 'categoryIds', val: id });
    });
    filters.subCategoryIds.forEach(id => {
      const sub = filterOptions.sub_categories.find(s => String(s.id) === id);
      if (sub) activeChips.push({ label: sub.name, key: 'subCategoryIds', val: id });
    });
    filters.brandIds.forEach(id => {
      const brand = filterOptions.brands.find(b => String(b.id) === id);
      if (brand) activeChips.push({ label: brand.brand_name, key: 'brandIds', val: id });
    });
    filters.originalBrandIds.forEach(id => {
      const ob = filterOptions.original_brands?.find(b => String(b.id) === id);
      if (ob) activeChips.push({ label: `OB: ${ob.brand_name}`, key: 'originalBrandIds', val: id });
    });
  }
  filters.colors.forEach(c => activeChips.push({ label: c, key: 'colors', val: c }));
  filters.sizes.forEach(s => activeChips.push({ label: `Size: ${s}`, key: 'sizes', val: s }));
  filters.genders.forEach(g => activeChips.push({ label: g, key: 'genders', val: g }));
  if (filters.condition) activeChips.push({ label: filters.condition === 'new' ? 'Brand New' : 'Pre-owned', key: 'condition' });

  Object.entries(filters.specs).forEach(([k, vals]) => {
    vals.forEach(v => activeChips.push({ label: `${k}: ${v}`, key: `spec:${k}`, val: v }));
  });

  const handleWishlist = (p: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist(prev => {
      const next = prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id];
      try { localStorage.setItem('flex_wishlist', JSON.stringify(next)); } catch { }
      return next;
    });
  };

  if (isAuthenticated && user) {
    if (user.role === 'admin' && Number(user.blocked_buyer) === 1) return null;
    if (user.user_type === 'seller' && !['admin', 'super_admin'].includes(user.role)) return null;
  }

  const subCatsForCategory = filterOptions?.sub_categories.filter(s => filters.categoryIds.includes(String(s.category_id))) || [];

  const sortedProducts = useMemo(() => {
    if (!data?.products) return [];
    const prods = [...data.products];
    if (sortBy === 'price_asc') return prods.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    if (sortBy === 'price_desc') return prods.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    if (sortBy === 'newest') return prods.sort((a, b) => b.id - a.id);
    return prods;
  }, [data?.products, sortBy]);


  return (
    <>
      <style jsx global>{`
        /* ── Navbar styles (preserved from original) ── */
        :root { --primary-yellow: #ffc63a; --primary-dark: #000; }
        .navbar-main { background: rgba(255,255,255,0.85); backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 0.7rem 0; z-index: 1050; position: fixed; top: 0; left: 0; right: 0; }
        .navbar-brand-main { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #000 !important; letter-spacing: -1.5px; position: relative; text-decoration: none; }
        .navbar-brand-main::after { content: '.'; color: var(--primary-yellow); font-size: 2.5rem; line-height: 0; position: absolute; bottom: 8px; }
        .nav-link-main { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95rem; color: #000 !important; padding: 0.5rem 1.4rem !important; transition: 0.3s; position: relative; letter-spacing: -0.2px; text-decoration: none; }
        .nav-link-main:hover { color: var(--primary-yellow) !important; }
        .search-wrapper-hdr { position: relative; width: 380px; margin: 0 30px; }
        .search-input-premium-hdr { background: #f4f4f4; border: 1px solid transparent; border-radius: 14px; padding: 10px 15px 10px 45px; font-size: 0.9rem; font-family: 'Inter', sans-serif; width: 100%; transition: all 0.3s ease; outline: none; }
        .search-input-premium-hdr:focus { background: #fff; border-color: var(--primary-yellow); box-shadow: 0 8px 20px rgba(255,198,58,0.15); }
        .search-icon-fixed-hdr { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888; font-size: 1.1rem; }
        .user-action-link { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: #000; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .user-action-link:hover { color: var(--primary-yellow); }
        .user-dropdown { position: relative; }
        .user-dropdown-menu { position: absolute; right: 0; left: auto; top: 100%; min-width: 250px; background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); padding: 8px; padding-top: 20px; z-index: 1060; animation: ddSlideDown 0.3s ease; }
        @keyframes ddSlideDown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .user-dropdown-menu .dd-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 12px; color: #333; text-decoration: none; font-size: 0.9rem; transition: 0.2s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .user-dropdown-menu .dd-item:hover { background: #f8f9fa; }
        .user-dropdown-menu .dd-item.text-danger { color: #dc3545 !important; }
        .user-dropdown-menu .dd-header { padding: 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; }

        /* ── Elite Browse Design ── */
        .em-body { font-family: 'Inter', sans-serif; background: #f6f6f6; color: #2d2f2f; }
        .em-heading { font-family: 'Manrope', sans-serif !important; }

        /* Product card wish button hover */
        .product-card .wish-btn {
          opacity: 0;
          transform: translateX(-50%) translateY(12px);
          transition: opacity 300ms ease, transform 300ms ease;
        }
        .product-card:hover .wish-btn {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .product-card:hover .card-img { transform: scale(1.1); }
        .product-card:hover .card-overlay { background-color: rgba(12,15,15,0.08); }

        /* Checkbox Filters */
        .em-checkbox-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer; user-select: none; }
        .em-checkbox { width: 18px; height: 18px; border: 1px solid #acadad; border-radius: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: #fff; flex-shrink: 0; }
        .em-checkbox.active { background: #fff; border-color: #ef4444; }
        .em-checkbox-inner { width: 10px; height: 10px; background: #ef4444; border-radius: 1px; }
        .em-label-text { font-size: 0.875rem; color: #5a5c5c; }
        .em-label-text.active { color: #0c0f0f; font-weight: 700; }
        .em-count { color: #acadad; font-size: 0.75rem; margin-left: 4px; }
        .em-more-link { color: #ff3f6c; font-size: 0.875rem; font-weight: 700; cursor: pointer; margin-top: 8px; display: block; border: none; background: none; padding: 0; }

        /* Filter Modal */
        .em-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .em-modal-card { background: #fff; width: 90%; max-width: 1000px; height: 85vh; border-radius: 4px; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
        .em-modal-header { padding: 20px 30px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
        .em-modal-search-wrap { display: flex; align-items: center; gap: 15px; flex: 1; }
        .em-modal-search { border: 1px solid #acadad; border-radius: 2px; padding: 8px 12px; width: 250px; font-size: 0.875rem; outline: none; }
        .em-modal-search:focus { border-color: #ef4444; }
        .em-alpha-index { display: flex; gap: 10px; flex-wrap: wrap; margin-left: 20px; }
        .em-alpha-btn { background: none; border: none; color: #acadad; font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 4px 6px; transition: color 0.2s; }
        .em-alpha-btn.active { color: #ef4444; }
        .em-modal-body::-webkit-scrollbar { width: 6px; }
        .em-modal-body::-webkit-scrollbar-track { background: #f9f9f9; }
        .em-modal-body::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 9999px; }
        .em-modal-body { 
          flex: 1; overflow-y: auto; padding: 30px; display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
          gap: 15px; align-content: start; 
          scrollbar-width: thin; scrollbar-color: #ef4444 #f9f9f9; 
        }
        .em-modal-close { background: none; border: none; cursor: pointer; color: #5a5c5c; font-size: 24px; }
        .em-group-title { grid-column: 1 / -1; font-size: 0.875rem; font-weight: 800; color: #0c0f0f; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; margin-top: 15px; }

        /* Filter section title */
        .em-filter-title {
          font-size: 0.75rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #0c0f0f; margin-bottom: 1rem;
          font-family: 'Manrope', sans-serif;
        }

        /* Checkbox */
        input[type="checkbox"].em-chk {
          width: 20px; height: 20px;
          accent-color: #FFC107; border-radius: 4px;
          cursor: pointer; flex-shrink: 0;
        }

        /* Select / dropdown */
        .em-select {
          width: 100%; background: #fff;
          border: 1px solid #acadad; border-radius: 12px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; outline: none; cursor: pointer;
          color: #2d2f2f;
        }
        .em-select:focus { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(176,37,0,0.15); }

        /* Range input */
        input[type="range"].em-range {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 9999px;
          background: #f0f0f0; outline: none; cursor: pointer;
          margin-bottom: 16px;
        }
        input[type="range"].em-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: #ef4444; cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
          box-shadow: 0 1px 4px rgba(239,68,68,0.35);
          border: 2px solid #fff;
        }
        input[type="range"].em-range:hover::-webkit-slider-thumb {
          background: #b91c1c;
          transform: scale(1.15);
        }
        input[type="range"].em-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff;
          background: #ef4444; cursor: pointer;
          transition: background 0.2s ease;
          box-shadow: 0 1px 4px rgba(239,68,68,0.35);
        }

        /* Price inputs */
        .em-price-inp {
          background: #fff; border: none; border-radius: 10px;
          padding: 8px 8px 8px 22px; font-size: 0.75rem; font-weight: 700;
          width: 100%; outline: none; box-shadow: inset 0 0 0 1px transparent;
          font-family: 'Inter', sans-serif;
        }
        .em-price-inp:focus { box-shadow: inset 0 0 0 1px #FFC107; }

        /* Pill buttons (for filter) */
        .em-filter-pill {
          background: #f8f9fa; border: 1px solid #eee;
          border-radius: 9999px; padding: 5px 14px;
          font-size: 0.82rem; font-weight: 700; cursor: pointer;
          transition: background 0.2s, border-color 0.2s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .em-filter-pill:hover, .em-filter-pill.active {
          background: #fff; border-color: #ef4444; color: #ef4444;
        }

        /* Type pills in product area */
        .em-type-pill {
          background: #e7e8e8; color: #2d2f2f;
          padding: 12px 24px; border-radius: 9999px; border: none;
          font-weight: 500; font-size: 0.875rem; cursor: pointer;
          transition: background 0.2s; font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .em-type-pill:hover { background: #d2d5d5; }
        .em-type-pill.active {
          background: #FFC107; color: #3d2b00; font-weight: 700;
        }

        /* Sort select */
        .em-sort-sel {
          appearance: none; background: #fff; border: none;
          border-radius: 9999px; padding: 12px 48px 12px 24px;
          font-size: 0.875rem; font-weight: 700;
          box-shadow: 0 4px 6px rgba(0,0,0,0.04);
          cursor: pointer; outline: none;
          font-family: 'Inter', sans-serif; color: #2d2f2f;
        }
        .em-sort-sel:focus { box-shadow: 0 0 0 2px rgba(255,193,7,0.35); }

        /* Pagination */
        .em-pg-num {
          width: 40px; height: 40px; border-radius: 9999px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-weight: 700; font-size: 0.875rem;
          background: transparent; color: #2d2f2f; transition: background 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .em-pg-num:hover { background: #e7e8e8; }
        .em-pg-num.active { background: #0c0f0f; color: #fff; }
        .em-pg-arrow {
          width: 48px; height: 48px; border-radius: 9999px;
          border: 1px solid #acadad; background: transparent;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s;
        }
        .em-pg-arrow:hover { background: #e7e8e8; }
        .em-pg-arrow:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Active filter chips */
        .em-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: #0c0f0f; color: #fff;
          border-radius: 9999px; padding: 4px 12px;
          font-size: 0.78rem; font-weight: 700;
        }
        .em-chip button {
          background: none; border: none; color: rgba(255,255,255,0.7);
          cursor: pointer; font-size: 1rem; line-height: 1; padding: 0;
        }
        .em-chip button:hover { color: #fff; }

        /* Sidebar section */
        .em-sidebar-section { border-bottom: 1px solid #e7e8e8; padding: 20px 0; }
        .em-sidebar-section:last-child { border-bottom: none; }

        /* Sidebar scrollbar */
        .em-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .em-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .em-sidebar-scroll::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 9999px; }
        .em-sidebar-scroll { scrollbar-width: thin; scrollbar-color: #ef4444 transparent; }

        /* Mobile drawer */
        .em-drawer {
          position: fixed; left: 0; top: 0; bottom: 0; width: 320px;
          background: #fff; z-index: 1100;
          box-shadow: 4px 0 30px rgba(0,0,0,0.15);
          padding: 24px; overflow-y: auto;
          transform: translateX(-100%);
          transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
        }
        .em-drawer.open { transform: translateX(0); }
        .em-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1090; display: none; }
        .em-overlay.open { display: block; }


        /* Responsive */
        @media (max-width: 991px) { .em-sidebar-desk { display: none !important; } }
        @media (max-width: 768px) {
          .em-hero-title { font-size: 2.5rem !important; }
          .em-layout { flex-direction: column !important; }
          .em-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px 16px !important; }
          .em-type-bar { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; }
        }
        @media (max-width: 480px) { .em-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
        rel="stylesheet"
      />

      <div className="" >

        <LandingNavbar showAuth />

        {/* ===== MAIN CONTENT ===== */}
        <main className=' pt-37.5 px-28'>



          {/* Two-column layout */}
          <div className="em-layout" style={{ display: 'flex', gap: 100 }}>

            {/* ===== SIDEBAR (desktop) ===== */}
            <aside className="em-sidebar-desk" style={{ width: 256, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 132, maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }} className="em-sidebar-scroll">
                <EliteSidebar
                  filters={filters}
                  priceInput={priceInput}
                  setPriceInput={setPriceInput}
                  filterOptions={filterOptions}
                  dynamicAttrs={dynamicAttrs}
                  subCatsForCategory={subCatsForCategory}
                  setFilter={setFilter}
                  setSpecFilter={setSpecFilter}
                  applyPriceFilter={applyPriceFilter}
                  clearAllFilters={clearAllFilters}
                  activeChips={activeChips}
                  onShowMore={(cfg) => setModalConfig(cfg as any)}
                  listingTypes={listingTypes}
                  activeType={activeType}
                  onTypeChange={handleTypeClick}
                />
              </div>
            </aside>

            {/* ===== PRODUCT AREA ===== */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Breadcrumb + sort row */}
              <section style={{ marginBottom: 48 }}>
                {/* Row 1: mobile filter + breadcrumbs + sort */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  {/* Left: mobile filter btn + breadcrumbs — all on one line */}
                  <div className="em-type-bar" style={{ display: 'flex', flexWrap: 'nowrap', gap: 12, alignItems: 'center', overflow: 'hidden' }}>
                    {/* Mobile filter toggle */}
                    <button
                      className="d-lg-none em-type-pill"
                      onClick={() => setShowFilters(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    >
                      <i className="bi bi-sliders"></i> Filters
                      {activeChips.length > 0 && (
                        <span style={{ background: '#0c0f0f', color: '#FFC107', borderRadius: 9999, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                          {activeChips.length}
                        </span>
                      )}
                    </button>

                    {/* Breadcrumbs — single line, no wrap */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: '#0c0f0f', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
                      <Link href="/buyer/browse" style={{ color: '#5a5c5c', textDecoration: 'none' }}>Home</Link>

                      {activeType && (
                        <>
                          <span style={{ color: '#acadad' }}>/</span>
                          <span
                            style={{ color: filters.categoryIds.length === 0 ? '#0c0f0f' : '#5a5c5c', cursor: 'pointer', textTransform: 'capitalize' }}
                            onClick={() => setFilter('categoryIds', '')}
                          >
                            {activeType}
                          </span>
                        </>
                      )}

                      {filters.categoryIds.length > 0 && filterOptions?.categories.find(c => String(c.id) === filters.categoryIds[0]) && (
                        <>
                          <span style={{ color: '#acadad' }}>/</span>
                          <span
                            style={{ color: filters.subCategoryIds.length === 0 ? '#0c0f0f' : '#5a5c5c', cursor: 'pointer' }}
                            onClick={() => setFilter('subCategoryIds', '')}
                          >
                            {filterOptions.categories.find(c => String(c.id) === filters.categoryIds[0])?.name}
                          </span>
                        </>
                      )}

                      {filters.subCategoryIds.length > 0 && filterOptions?.sub_categories.find(c => String(c.id) === filters.subCategoryIds[0]) && (
                        <>
                          <span style={{ color: '#acadad' }}>/</span>
                          <span style={{ color: '#0c0f0f' }}>
                            {filterOptions.sub_categories.find(c => String(c.id) === filters.subCategoryIds[0])?.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Sort only */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="em-sort-sel"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{ padding: '8px 36px 8px 16px', border: '1px solid #e7e8e8', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: '#0c0f0f', boxShadow: 'none' }}
                    >
                      <option value="featured">Sort by: Recommended</option>
                      <option value="newest">Sort by: Newest</option>
                      <option value="price_asc">Sort by: Price (Low to High)</option>
                      <option value="price_desc">Sort by: Price (High to Low)</option>
                    </select>
                    <span
                      className="material-symbols-outlined"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#0c0f0f', fontSize: 20 }}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Row 2: result count — centered */}
                {!loading && data && (
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#5a5c5c', margin: 0, fontWeight: 500 }}>
                    {data.pagination.total > 0
                      ? <>Showing <strong>{(page - 1) * 12 + 1}–{Math.min(page * 12, data.pagination.total)}</strong> of <strong>{data.pagination.total}</strong> results</>
                      : <>Showing <strong>0</strong> results</>}
                  </p>
                )}
              </section>

              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {activeChips.map(chip => (
                    <span key={chip.key + (chip.val || '')} className="em-chip">
                      {chip.label}
                      <button onClick={() => {
                        if (chip.key === 'price') {
                          const newF = { ...filters, minPrice: '', maxPrice: '' };
                          setPriceInput({ min: '', max: '' });
                          setFilters(newF); setPage(1); navigate(activeType, search, newF);
                        } else removeFilter(chip.key, chip.val);
                      }}>×</button>
                    </span>
                  ))}

                  <button
                    onClick={clearAllFilters}
                    style={{ background: 'none', border: 'none', color: '#5a5c5c', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear all
                  </button>

                </div>
              )}

              {/* Product Grid */}
              <section
                className="em-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '70px 45px',
                  position: 'relative',
                  minHeight: 200,
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: loading ? 'none' : 'auto',
                }}
              >
                {loading && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
                    <div className="spinner-grow text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                      <span className="visually-hidden">Loading…</span>
                    </div>
                  </div>
                )}

                {sortedProducts.length > 0 ? sortedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    wishlisted={wishlist.includes(p.id)}
                    onWishlist={handleWishlist}
                  />
                )) : !loading ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 0' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#acadad', display: 'block', marginBottom: 16 }}>search</span>
                    <h3 className="em-heading" style={{ fontWeight: 700, color: '#0c0f0f', marginBottom: 8 }}>No results found</h3>
                    <p style={{ color: '#5a5c5c' }}>Try adjusting your search or filters.</p>
                    {activeChips.length > 0 && (
                      <button
                        onClick={clearAllFilters}
                        style={{ background: '#0c0f0f', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : null}
              </section>


              {/* Pagination */}
              {data && data.pagination && data.pagination.total_pages > 1 && (
                <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                  <button
                    className="em-pg-arrow"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Array.from({ length: data.pagination.total_pages }, (_, i) => (
                      <button
                        key={i}
                        className={`em-pg-num ${page === i + 1 ? 'active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    className="em-pg-arrow"
                    disabled={page === data.pagination.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>


        {/* ===== MOBILE FILTER DRAWER ===== */}
        <div className={`em-overlay ${showFilters ? 'open' : ''}`} onClick={() => setShowFilters(false)} />
        <div className={`em-drawer em-sidebar-scroll ${showFilters ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h5 className="em-heading" style={{ fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>
              Filters {activeChips.length > 0 && (
                <span style={{ background: '#0c0f0f', color: '#FFC107', borderRadius: 9999, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800, marginLeft: 6 }}>
                  {activeChips.length}
                </span>
              )}
            </h5>
            <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#0c0f0f' }} onClick={() => setShowFilters(false)}>×</button>
          </div>
          <EliteSidebar
            filters={filters}
            priceInput={priceInput}
            setPriceInput={setPriceInput}
            filterOptions={filterOptions}
            dynamicAttrs={dynamicAttrs}
            subCatsForCategory={subCatsForCategory}
            setFilter={setFilter}
            setSpecFilter={setSpecFilter}
            applyPriceFilter={applyPriceFilter}
            clearAllFilters={clearAllFilters}
            activeChips={activeChips}
            onShowMore={(cfg) => setModalConfig(cfg as any)}
            listingTypes={listingTypes}
            activeType={activeType}
            onTypeChange={handleTypeClick}
          />
        </div>

        <Footer />
      </div>
      {modalConfig && (
        <FilterModal
          title={modalConfig.title}
          items={modalConfig.items.map(it => ({ id: Number(it.id) || String(it.id), name: it.name }))}
          selectedIds={modalConfig.selectedIds}
          onSelect={(id) => {
            if (modalConfig.type === 'brand') setFilter('brandIds', id);
            else if (modalConfig.type === 'color') setFilter('colors', id);
            else if (modalConfig.type === 'spec' && modalConfig.specKey) setSpecFilter(modalConfig.specKey, id);
            else if (modalConfig.type === 'category') setFilter('categoryIds', id);
            else if (modalConfig.type === 'size') setFilter('sizes', id);
            else if (modalConfig.type === 'gender') setFilter('genders', id);
          }}
          onClose={() => setModalConfig(null)}
        />
      )}
    </>
  );
}

function FilterModal({
  title, items, selectedIds, onSelect, onClose
}: {
  title: string;
  items: Array<{ id: number | string; name: string }>;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState('');

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (activeLetter ? item.name.toUpperCase().startsWith(activeLetter) : true)
  );

  const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const grouped = filtered.reduce((acc, item) => {
    const first = item.name.charAt(0).toUpperCase();
    const group = /[A-Z]/.test(first) ? first : '#';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === '#') return -1;
    if (b === '#') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="em-modal-overlay" onClick={onClose}>
      <div className="em-modal-card" onClick={e => e.stopPropagation()}>
        <div className="em-modal-header">
          <div className="em-modal-search-wrap">
            <input
              className="em-modal-search"
              placeholder={`Search ${title}`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className="em-alpha-index">
              {alphabet.map(l => (
                <button
                  key={l}
                  className={`em-alpha-btn ${activeLetter === (l === 'All' ? '' : l) ? 'active' : ''}`}
                  onClick={() => setActiveLetter(prev => prev === (l === 'All' ? '' : l) ? '' : (l === 'All' ? '' : l))}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button className="em-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="em-modal-body">
          {sortedGroups.map(group => (
            <div key={group} style={{ display: 'contents' }}>
              <div className="em-group-title">{group}</div>
              {grouped[group].map(item => (
                <div
                  key={item.id}
                  className="em-checkbox-item"
                  onClick={() => onSelect(String(item.id))}
                  style={{ margin: 0 }}
                >
                  <div className={`em-checkbox ${selectedIds.includes(String(item.id)) ? 'active' : ''}`}>
                    {selectedIds.includes(String(item.id)) && <div className="em-checkbox-inner" />}
                  </div>
                  <span className={`em-label-text ${selectedIds.includes(String(item.id)) ? 'active' : ''}`}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#acadad' }}>
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── ProductCard ────────────────────────────────────────────────────────────────
function resolveImg(img: string): string {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  if (img.startsWith('uploads/')) return `${BACKEND_URL}/${img}`;
  return `${BACKEND_URL}/uploads/products/${img}`;
}

function parseImages(p: Product): string[] {
  const arr: string[] = [];
  if (p.images) {
    if (Array.isArray(p.images)) {
      arr.push(...p.images.filter(Boolean));
    } else {
      try {
        const parsed = JSON.parse(p.images as string);
        if (Array.isArray(parsed)) arr.push(...parsed.filter(Boolean));
        else arr.push(p.images as string);
      } catch {
        arr.push(p.images as string);
      }
    }
  }
  if (arr.length === 0 && p.primary_image) arr.push(p.primary_image);
  if (arr.length === 0 && p.image) arr.push(p.image);
  return arr.filter(Boolean);
}

interface ProductCardProps {
  p: Product;
  wishlisted: boolean;
  onWishlist: (p: Product, e: React.MouseEvent) => void;
}

function ProductCard({ p, wishlisted, onWishlist }: ProductCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const images = useMemo(() => parseImages(p), [p]);

  const startScroll = () => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setImgIdx(i => (i + 1) % images.length), 1600);
  };
  const stopScroll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setImgIdx(0);
  };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const isRent = p.listing_type === 'rent';
  const originalPrice = Number(p.original_price || 0);
  const sellingPrice = Number(p.selling_price || p.price || p.original_price || 0);
  const rentalPrice = Number(p.rental_cost || p.price || 0);
  const hasDiscount = !isRent && sellingPrice < originalPrice && originalPrice > 0;
  const slug = `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${p.id}`;
  const tooltipText = isRent ? 'This item is available for Rent' : 'This item is available for Sale';

  return (
    <div className="product-card  rounded-2xl flex flex-col cursor-pointer" onMouseEnter={startScroll} onMouseLeave={stopScroll}>
      <Link href={`/buyer/product/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>

        {/* ── Image wrapper ── */}
        <div className="relative w-full overflow-hidden rounded-2xl mb-3">
          {images.length > 0 ? images.map((img, i) => (
            <img
              key={i}
              src={resolveImg(img)}
              alt={p.title}
              className="card-img w-full aspect-[4/5] object-cover rounded-2xl transition-[opacity,transform] duration-700"
              style={{ opacity: i === imgIdx ? 1 : 0, position: i === 0 ? 'relative' : 'absolute', top: 0, left: 0 }}
            />
          )) : (
            <div className="w-full aspect-[4/5] rounded-2xl bg-[#f0f1f1] flex items-center justify-center">
              <i className="bi bi-image text-5xl text-[#acadad]"></i>
            </div>
          )}

          {/* Listing type badge */}
          <div
            className="absolute top-3 left-3 z-[4] flex items-center gap-1 px-[10px] py-1 rounded-full bg-white/80 text-[#0c0f0f] backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-help select-none"
            style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            title={tooltipText}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
              {isRent ? 'schedule' : 'sell'}
            </span>
            {isRent ? 'Rent' : 'Buy'}
          </div>

          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 z-[4] flex gap-[5px]">
              {images.map((_, i) => (
                <div
                  key={i}
                  className="h-[5px] rounded-full transition-all duration-300"
                  style={{ width: i === imgIdx ? 14 : 5, background: i === imgIdx ? '#FFC107' : 'rgba(255,255,255,0.6)' }}
                />
              ))}
            </div>
          )}

          {/* Wishlist button */}
          <button
            className={`wish-btn absolute bottom-4 left-1/2 z-[3] flex items-center gap-[7px] px-5 py-[9px] rounded-full! text-[0.82rem] font-bold border-none cursor-pointer whitespace-nowrap backdrop-blur-sm shadow-xl ${wishlisted ? 'bg-[#FFC107] text-[#3d2b00]' : 'bg-[rgba(12,15,15,0.88)] text-white'}`}
            onClick={(e) => onWishlist(p, e)}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}
            >
              favorite
            </span>
            {wishlisted ? 'Wishlisted' : 'Wishlist'}
          </button>
        </div>

        {/* ── Product info ── */}
        <div className="flex justify-between items-start px-2  ">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-lg font-bold! text-[#0c0f0f] text-[1.125rem]! mb-1 truncate" style={{ fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em' }}>
              {p.title}
            </h3>
            <p className="text-sm text-[#5a5c5c]">
              {p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : '\u00A0'}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col  items-end">
            {isRent ? (
              <span className="font-bold text-[#FFC107]">
                ₹{rentalPrice.toLocaleString('en-IN')}<span className="text-xs ml-2 text-[#5a5c5c] font-medium">/day</span>
              </span>
            ) : (
              <>
                <span className="font-bold text-[#FFC107]">₹{sellingPrice.toLocaleString('en-IN')}</span>
                {hasDiscount && (
                  <span className="text-xs text-[#acadad] line-through">₹{originalPrice.toLocaleString('en-IN')}</span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Elite Sidebar Component ────────────────────────────────────────────────────
interface EliteSidebarProps {
  filters: ActiveFilters;
  priceInput: { min: string; max: string };
  setPriceInput: (v: { min: string; max: string }) => void;
  filterOptions: FilterOptions | null;
  dynamicAttrs: DynamicAttribute[];
  subCatsForCategory: Array<{ id: number; name: string; category_id: number; field_config?: string }>;
  setFilter: (key: keyof Omit<ActiveFilters, 'specs'>, val: string) => void;
  setSpecFilter: (attrName: string, val: string) => void;
  applyPriceFilter: () => void;
  clearAllFilters: () => void;
  activeChips: { label: string; key: string }[];
  onShowMore: (config: { type: 'brand' | 'color' | 'spec' | 'category' | 'size' | 'gender'; title: string; items: any[]; selectedIds: string[]; specKey?: string }) => void;
  listingTypes: ListingType[];
  activeType: string;
  onTypeChange: (type: string) => void;
}

function EliteSidebar({
  filters, priceInput, setPriceInput, filterOptions, dynamicAttrs,
  subCatsForCategory, setFilter, setSpecFilter, applyPriceFilter,
  clearAllFilters, activeChips, onShowMore, listingTypes = [], activeType, onTypeChange,
}: EliteSidebarProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    productType: true, price: true, category: true, subCategory: true,
    gender: true, color: true, brand: true, originalBrand: true, size: false,
  });
  const [focusedField, setFocusedField] = useState<'min' | 'max'>('max');
  const toggle = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // Per-section inline search state
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const setSSearch = (section: string, val: string) =>
    setSectionSearch(p => ({ ...p, [section]: val }));
  const getSSearch = (section: string) => sectionSearch[section] || '';

  const SectionTitle = ({ id, label, count }: { id: string; label: string; count?: number }) => (
    <div
      className="em-filter-title"
      onClick={() => toggle(id)}
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open[id] ? 10 : 0 }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {count !== undefined && count > 0 && (
          <span style={{ background: '#FFC107', color: '#3d2b00', borderRadius: 9999, padding: '1px 7px', fontSize: '0.65rem', fontWeight: 800 }}>{count}</span>
        )}
      </span>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#5a5c5c', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
        {open[id] ? 'expand_less' : 'expand_more'}
      </span>
    </div>
  );

  const InlineSearch = ({ section, placeholder }: { section: string; placeholder: string }) => (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#acadad', pointerEvents: 'none' }}>search</span>
      <input
        type="text"
        placeholder={placeholder}
        value={getSSearch(section)}
        onChange={e => setSSearch(section, e.target.value)}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', border: '1px solid #e7e8e8', borderRadius: 8, padding: '6px 10px 6px 28px', fontSize: '0.8rem', outline: 'none', fontFamily: 'Inter, sans-serif', color: '#2d2f2f', background: '#fafafa' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#FFC107'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e7e8e8'; }}
      />
      {getSSearch(section) && (
        <button onClick={() => setSSearch(section, '')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#acadad', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
      )}
    </div>
  );

  const CheckboxGroup = ({
    items, activeVals, onSelect, onShowMore: onMore,
  }: {
    items: Array<{ value: string; label: string }>;
    activeVals: string[];
    onSelect: (v: string) => void;
    onShowMore?: () => void;
  }) => {
    const displayItems = items.slice(0, 8);
    const remaining = items.length - 8;
    return (
      <div>
        {displayItems.map(item => (
          <div key={item.value} className="em-checkbox-item" onClick={() => onSelect(item.value)}>
            <div className={`em-checkbox ${activeVals.includes(item.value) ? 'active' : ''}`}>
              {activeVals.includes(item.value) && <div className="em-checkbox-inner" />}
            </div>
            <span className={`em-label-text ${activeVals.includes(item.value) ? 'active' : ''}`}>{item.label}</span>
          </div>
        ))}
        {onMore && remaining > 0 && (
          <button className="em-more-link" onClick={(e) => { e.stopPropagation(); onMore(); }}>
            + {remaining} more
          </button>
        )}
      </div>
    );
  };

  // Filtered items helper
  const filterBySearch = (items: Array<{ value: string; label: string }>, section: string) => {
    const q = getSSearch(section).toLowerCase();
    return q ? items.filter(i => i.label.toLowerCase().includes(q)) : items;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #acadad', paddingBottom: 16, marginBottom: 8 }}>
        <strong className="em-heading" style={{ fontFamily: "'Maven Pro', sans-serif", fontSize: '16px', fontWeight: 800, letterSpacing: '0.1em', color: '#0c0f0f', textTransform: 'uppercase' }}>
          FILTERS
        </strong>
        <button 
          onClick={clearAllFilters}
          className='font-bold!'
          style={{ fontFamily: "'Maven Pro', sans-serif", background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
        >
          CLEAR ALL
        </button>
      </div>

      {/* ── 1. Product Type ── */}
      {listingTypes.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="productType" label="Product Type" />
          {open.productType && (
            <>
              <InlineSearch section="productType" placeholder="Search type…" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filterBySearch(
                  listingTypes.map(t => ({ value: t.type_name, label: t.type_name.charAt(0).toUpperCase() + t.type_name.slice(1) })),
                  'productType'
                ).map(item => (
                  <button
                    key={item.value}
                    className={`em-filter-pill ${activeType === item.value ? 'active' : ''}`}
                    onClick={() => onTypeChange(activeType === item.value ? '' : item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 2. Category ── */}
      {filterOptions && filterOptions.categories.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="category" label="Category" count={filters.categoryIds.length} />
          {open.category && (
            <CheckboxGroup
              items={filterOptions.categories.map(c => ({ value: String(c.id), label: c.name }))}
              activeVals={filters.categoryIds}
              onSelect={(v) => setFilter('categoryIds', v)}
              onShowMore={() => onShowMore({
                type: 'category', title: 'CATEGORIES',
                items: filterOptions.categories.map(c => ({ id: c.id, name: c.name })),
                selectedIds: filters.categoryIds,
              })}
            />
          )}
        </div>
      )}

      {/* ── 3. Sub-Category ── */}
      {filterOptions && filterOptions.sub_categories.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="subCategory" label="Sub-Category" count={filters.subCategoryIds.length} />
          {open.subCategory && (
            <>
              <InlineSearch section="subCategory" placeholder="Search sub-category…" />
              {(() => {
                const pool = filters.categoryIds.length > 0 ? subCatsForCategory : filterOptions.sub_categories;
                const items = filterBySearch(pool.map(s => ({ value: String(s.id), label: s.name })), 'subCategory');
                return (
                  <CheckboxGroup
                    items={items}
                    activeVals={filters.subCategoryIds}
                    onSelect={(v) => setFilter('subCategoryIds', v)}
                    onShowMore={() => onShowMore({
                      type: 'category', title: 'SUB-CATEGORIES',
                      items: pool.map(s => ({ id: s.id, name: s.name })),
                      selectedIds: filters.subCategoryIds,
                    })}
                  />
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── 4. Gender ── */}
      {filterOptions && filterOptions.genders.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="gender" label="Gender" count={filters.genders.length} />
          {open.gender && (
            <CheckboxGroup
              items={filterOptions.genders.map(g => ({ value: g.name, label: g.name }))}
              activeVals={filters.genders}
              onSelect={(v) => setFilter('genders', v)}
            />
          )}
        </div>
      )}

      {/* ── 5. Color ── */}
      {filterOptions && filterOptions.colors.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="color" label="Color" count={filters.colors.length} />
          {open.color && (
            <CheckboxGroup
              items={filterOptions.colors.map(c => ({ value: c.name, label: c.name }))}
              activeVals={filters.colors}
              onSelect={(v) => setFilter('colors', v)}
              onShowMore={() => onShowMore({
                type: 'color', title: 'COLOR',
                items: filterOptions.colors.map(c => ({ id: c.name, name: c.name })),
                selectedIds: filters.colors,
              })}
            />
          )}
        </div>
      )}

      <div className="em-sidebar-section">
        <SectionTitle id="price" label="Price" />
        {open.price && (
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adjusting {focusedField === 'min' ? 'Minimum' : 'Maximum'} Price
            </div>
            <input
              type="range" className="em-range"
              min={filterOptions?.price_range?.min_price || 0}
              max={filterOptions?.price_range?.max_price || 100000}
              step={100}
              value={focusedField === 'min' 
                ? (priceInput.min || filterOptions?.price_range?.min_price || 0)
                : (priceInput.max || filterOptions?.price_range?.max_price || 100000)
              }
              onChange={(e) => {
                if (focusedField === 'min') {
                  const val = Math.min(Number(e.target.value), Number(priceInput.max || filterOptions?.price_range?.max_price || 100000));
                  setPriceInput({ ...priceInput, min: String(val) });
                } else {
                  const val = Math.max(Number(e.target.value), Number(priceInput.min || filterOptions?.price_range?.min_price || 0));
                  setPriceInput({ ...priceInput, max: String(val) });
                }
              }}
              onMouseUp={applyPriceFilter} onTouchEnd={applyPriceFilter}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5c5c', fontSize: '0.75rem' }}>₹</span>
                <input type="number" className="em-price-inp" placeholder="Min" value={priceInput.min}
                  onFocus={() => setFocusedField('min')}
                  onChange={(e) => setPriceInput({ ...priceInput, min: e.target.value })}
                  onBlur={applyPriceFilter} onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()} min={0}
                  style={{ border: focusedField === 'min' ? '1px solid #FFC107' : 'none' }}
                />
              </div>
              <span style={{ color: '#5a5c5c' }}>to</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5c5c', fontSize: '0.75rem' }}>₹</span>
                <input type="number" className="em-price-inp" placeholder="Max" value={priceInput.max}
                  onFocus={() => setFocusedField('max')}
                  onChange={(e) => setPriceInput({ ...priceInput, max: e.target.value })}
                  onBlur={applyPriceFilter} onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()} min={0}
                  style={{ border: focusedField === 'max' ? '1px solid #FFC107' : 'none' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Brand ── */}
      {filterOptions && filterOptions.brands.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="brand" label="Brand" count={filters.brandIds.length} />
          {open.brand && (
            <>
              <InlineSearch section="brand" placeholder="Search brand…" />
              <CheckboxGroup
                items={filterBySearch(filterOptions.brands.map(b => ({ value: String(b.id), label: b.brand_name })), 'brand')}
                activeVals={filters.brandIds}
                onSelect={(v) => setFilter('brandIds', v)}
                onShowMore={() => onShowMore({
                  type: 'brand', title: 'BRAND',
                  items: filterOptions.brands.map(b => ({ id: b.id, name: b.brand_name })),
                  selectedIds: filters.brandIds,
                })}
              />
            </>
          )}
        </div>
      )}

      {/* ── 8. Original Brand ── */}
      {filterOptions && filterOptions.original_brands?.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="originalBrand" label="Original Brand" count={filters.originalBrandIds.length} />
          {open.originalBrand && (
            <>
              <InlineSearch section="originalBrand" placeholder="Search original brand…" />
              <CheckboxGroup
                items={filterBySearch(filterOptions.original_brands.map(b => ({ value: String(b.id), label: b.brand_name })), 'originalBrand')}
                activeVals={filters.originalBrandIds}
                onSelect={(v) => setFilter('originalBrandIds', v)}
                onShowMore={() => onShowMore({
                  type: 'brand', title: 'ORIGINAL BRAND',
                  items: filterOptions.original_brands.map(b => ({ id: b.id, name: b.brand_name })),
                  selectedIds: filters.originalBrandIds,
                })}
              />
            </>
          )}
        </div>
      )}

      {/* ── 9. Dynamic Attributes ── */}
      {dynamicAttrs.map((attr) => {
        const opts = Array.isArray(attr.options)
          ? attr.options
          : (typeof attr.options === 'string' ? attr.options.split(',').map(s => s.trim()).filter(Boolean) : []);
        const section = `dyn_${attr.name}`;
        const allItems = opts.map((o: string) => ({ value: o, label: o }));
        const filtered = filterBySearch(allItems, section);
        return (
          <div key={attr.name} className="em-sidebar-section">
            <SectionTitle id={section} label={attr.name} count={(filters.specs[attr.name] || []).length} />
            {open[section] !== false && (
              opts.length > 0 ? (
                <>
                  <InlineSearch section={section} placeholder={`Search ${attr.name}…`} />
                  <CheckboxGroup
                    items={filtered}
                    activeVals={filters.specs[attr.name] || []}
                    onSelect={(v) => setSpecFilter(attr.name, v)}
                    onShowMore={() => onShowMore({
                      type: 'spec', title: attr.name, specKey: attr.name,
                      items: opts.map(o => ({ id: o, name: o })),
                      selectedIds: filters.specs[attr.name] || [],
                    })}
                  />
                </>
              ) : (
                <input
                  type="text" className="em-price-inp"
                  style={{ border: '1px solid #acadad', borderRadius: 10, paddingLeft: 12 }}
                  placeholder={`Enter ${attr.name}`}
                  value={filters.specs[attr.name]?.[0] || ''}
                  onChange={(e) => setSpecFilter(attr.name, e.target.value)}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
