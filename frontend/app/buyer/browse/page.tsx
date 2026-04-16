'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addToCart, isInCart } from '@/lib/cart';

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
  brand_name?: string;
  brand?: string;
  status: string;
}

interface ListingType {
  id: number;
  type_name: string;
}

interface FilterOptions {
  categories: Array<{ id: number; name: string; field_config?: string }>;
  sub_categories: Array<{ id: number; name: string; category_id: number; field_config?: string }>;
  brands: Array<{ id: number; brand_name: string }>;
  colors: Array<{ id: number; name: string }>;
  genders: Array<{ id: number; name: string }>;
  sizes: string[];
  price_range: { min_price: number; max_price: number };
}

interface DynamicAttribute {
  name: string;
  type: string;
  options?: string[];
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
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  color: string;
  size: string;
  gender: string;
  condition: string;
  specs: Record<string, string>;
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`).replace(/\/$/, '');

const emptyFilters: ActiveFilters = {
  minPrice: '', maxPrice: '', categoryId: '', subCategoryId: '',
  brandId: '', color: '', size: '', gender: '', condition: '', specs: {},
};

function filtersFromParams(sp: URLSearchParams): ActiveFilters {
  return {
    minPrice: sp.get('min_price') || '',
    maxPrice: sp.get('max_price') || '',
    categoryId: sp.get('category_id') || '',
    subCategoryId: sp.get('sub_category_id') || '',
    brandId: sp.get('brand_id') || '',
    color: sp.get('color') || '',
    size: sp.get('size') || '',
    gender: sp.get('gender') || '',
    condition: sp.get('condition') || '',
    specs: (() => { try { return JSON.parse(sp.get('specs') || '{}'); } catch { return {}; } })(),
  };
}

export default function BrowsePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BrowseData | null>(null);
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeType, setActiveType] = useState(searchParams.get('listing_type') || '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [cartUpdated, setCartUpdated] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(() => filtersFromParams(searchParams as unknown as URLSearchParams));
  const [priceInput, setPriceInput] = useState({ min: filters.minPrice, max: filters.maxPrice });
  const [dynamicAttrs, setDynamicAttrs] = useState<DynamicAttribute[]>([]);
  // ─────────────────────────────────────────────────────────────────────────

  // Fuzzy match scorer
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

  // Debounced suggestion fetcher
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

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Track cart count
  useEffect(() => {
    const update = () => {
      try { setCartCount(JSON.parse(localStorage.getItem('flex_cart') || '[]').length); } catch { setCartCount(0); }
    };
    update();
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/listing-types`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setListingTypes(res.data); })
      .catch(() => { });
  }, []);

  // Blocked admin or strict seller check
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

  // Load dynamic attributes when category/sub-category changes
  useEffect(() => {
    if (!filterOptions) { setDynamicAttrs([]); return; }
    // Sub-category takes precedence
    if (filters.subCategoryId) {
      const sub = filterOptions.sub_categories.find(s => String(s.id) === filters.subCategoryId);
      if (sub?.field_config) {
        try { const cfg = JSON.parse(sub.field_config); setDynamicAttrs(cfg.attributes || []); return; } catch { }
      }
    }
    if (filters.categoryId) {
      const cat = filterOptions.categories.find(c => String(c.id) === filters.categoryId);
      if (cat?.field_config) {
        try { const cfg = JSON.parse(cat.field_config); setDynamicAttrs(cfg.attributes || []); return; } catch { }
      }
    }
    setDynamicAttrs([]);
  }, [filters.categoryId, filters.subCategoryId, filterOptions]);

  // ── URL builder ───────────────────────────────────────────────────────────
  const buildUrl = (
    type: string, s: string, f: ActiveFilters
  ): string => {
    const p = new URLSearchParams();
    if (type) p.set('listing_type', type);
    if (s) p.set('search', s);
    if (f.minPrice) p.set('min_price', f.minPrice);
    if (f.maxPrice) p.set('max_price', f.maxPrice);
    if (f.categoryId) p.set('category_id', f.categoryId);
    if (f.subCategoryId) p.set('sub_category_id', f.subCategoryId);
    if (f.brandId) p.set('brand_id', f.brandId);
    if (f.color) p.set('color', f.color);
    if (f.size) p.set('size', f.size);
    if (f.gender) p.set('gender', f.gender);
    if (f.condition) p.set('condition', f.condition);
    const specsStr = JSON.stringify(f.specs);
    if (specsStr !== '{}') p.set('specs', specsStr);
    const qs = p.toString();
    return `/buyer/browse${qs ? `?${qs}` : ''}`;
  };
  // ─────────────────────────────────────────────────────────────────────────

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

  // Single source of truth: URL drives data loading
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
  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) { setSearch(headerSearch); setPage(1); navigate(activeType, headerSearch, filters); }
  };
  const handleTypeClick = (type: string) => { setActiveType(type); setPage(1); navigate(type, search, filters); };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const setFilter = (key: keyof Omit<ActiveFilters, 'specs'>, val: string) => {
    let newF = { ...filters, [key]: val };
    if (key === 'categoryId') { newF.subCategoryId = ''; newF.specs = {}; }
    if (key === 'subCategoryId') { newF.specs = {}; }
    setFilters(newF);
    setPage(1);
    navigate(activeType, search, newF);
  };

  const setSpecFilter = (attrName: string, val: string) => {
    const newSpecs = { ...filters.specs, [attrName]: val };
    if (!val) delete newSpecs[attrName];
    const newF = { ...filters, specs: newSpecs };
    setFilters(newF);
    setPage(1);
    navigate(activeType, search, newF);
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

  const removeFilter = (key: string) => {
    if (key.startsWith('spec:')) {
      const attrName = key.slice(5);
      const newSpecs = { ...filters.specs };
      delete newSpecs[attrName];
      const newF = { ...filters, specs: newSpecs };
      setFilters(newF); setPage(1); navigate(activeType, search, newF);
    } else {
      const newF = { ...filters, [key]: '' };
      if (key === 'minPrice' || key === 'maxPrice') setPriceInput(p => ({ ...p, [key === 'minPrice' ? 'min' : 'max']: '' }));
      setFilters(newF); setPage(1); navigate(activeType, search, newF);
    }
  };

  // Active filter chips data
  const activeChips: { label: string; key: string }[] = [];
  if (filters.minPrice || filters.maxPrice) {
    activeChips.push({ label: `₹${filters.minPrice || '0'} – ₹${filters.maxPrice || '∞'}`, key: 'price' });
  }
  if (filters.categoryId && filterOptions) {
    const cat = filterOptions.categories.find(c => String(c.id) === filters.categoryId);
    if (cat) activeChips.push({ label: cat.name, key: 'categoryId' });
  }
  if (filters.subCategoryId && filterOptions) {
    const sub = filterOptions.sub_categories.find(s => String(s.id) === filters.subCategoryId);
    if (sub) activeChips.push({ label: sub.name, key: 'subCategoryId' });
  }
  if (filters.brandId && filterOptions) {
    const brand = filterOptions.brands.find(b => String(b.id) === filters.brandId);
    if (brand) activeChips.push({ label: brand.brand_name, key: 'brandId' });
  }
  if (filters.color) activeChips.push({ label: filters.color, key: 'color' });
  if (filters.size) activeChips.push({ label: `Size: ${filters.size}`, key: 'size' });
  if (filters.gender) activeChips.push({ label: filters.gender, key: 'gender' });
  if (filters.condition) activeChips.push({ label: filters.condition === 'new' ? 'Brand New' : 'Pre-owned', key: 'condition' });
  Object.entries(filters.specs).forEach(([k, v]) => { if (v) activeChips.push({ label: `${k}: ${v}`, key: `spec:${k}` }); });
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddToCart = (p: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const price = p.listing_type === 'sell' ? (p.selling_price || p.price || p.original_price || '0') : (p.rental_cost || p.price || '0');
    addToCart({ id: p.id, title: p.title, listing_type: p.listing_type, price, image: p.image || p.primary_image || '', seller_name: p.seller_name });
    setCartUpdated(c => c + 1);
  };

  // Prevent rendering if blocked
  if (isAuthenticated && user) {
    if (user.role === 'admin' && Number(user.blocked_buyer) === 1) return null;
    if (user.user_type === 'seller' && !['admin', 'super_admin'].includes(user.role)) return null;
  }

  const subCatsForCategory = filterOptions?.sub_categories.filter(s => String(s.category_id) === filters.categoryId) || [];

  return (
    <>
      <style jsx global>{`
        :root { --primary-yellow: #ffc63a; --primary-dark: #000; --bg-light: #f8f9fa; --text-muted: #6f6f6f; }
        .browse-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #fff; color: #000; }
        .browse-page h1,.browse-page h2,.browse-page h3,.browse-page h4,.browse-page h5,.browse-page h6,.browse-page .btn { font-family: "Maven Pro", sans-serif; }
        .fw-800 { font-weight: 800 !important; }
        .fw-900 { font-weight: 900 !important; }
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
        @keyframes suggestFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .user-dropdown-menu .dd-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 12px; color: #333; text-decoration: none; font-size: 0.9rem; transition: 0.2s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .user-dropdown-menu .dd-item:hover { background: #f8f9fa; }
        .user-dropdown-menu .dd-item.text-danger { color: #dc3545 !important; }
        .user-dropdown-menu .dd-header { padding: 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; }
        .browse-hero { background: #fff; padding: 60px 0; border-bottom: 1px solid #eee; position: relative; overflow: visible; }
        .search-container { background: #fff; border: 2px solid #000; border-radius: 100px; padding: 8px; display: flex; align-items: center; max-width: 700px; margin: 20px auto 0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .search-input { border: none !important; box-shadow: none !important; padding: 10px 30px; font-size: 1.1rem; font-weight: 500; flex-grow: 1; outline: none; background: transparent; }
        .btn-search { background: #000; color: #fff; border-radius: 100px; padding: 12px 35px; font-weight: 700; border: none; transition: 0.3s; cursor: pointer; }
        .btn-search:hover { background: #333; }
        .cat-pills { display: flex; overflow-x: auto; gap: 12px; padding: 20px 0; scrollbar-width: none; }
        .cat-pills::-webkit-scrollbar { display: none; }
        .cat-pill { background: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; color: var(--text-muted); font-weight: 700; border: 1px solid #eee; transition: 0.3s; white-space: nowrap; cursor: pointer; font-size: 0.95rem; }
        .cat-pill:hover, .cat-pill.active { background: var(--primary-yellow); color: #000 !important; border-color: var(--primary-yellow); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255,198,58,0.2); }
        .premium-card { background: white; border-radius: 20px; border: 1px solid #eee; transition: all 0.3s ease; position: relative; overflow: hidden; height: 100%; cursor: pointer; }
        .premium-card:hover { transform: translateY(-8px); box-shadow: 0 15px 35px rgba(0,0,0,0.05); border-color: var(--primary-yellow); }
        .card-img-box { height: 300px; padding: 10px; }
        .card-img-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }
        .listing-badge { position: absolute; top: 20px; right: 20px; background: #fff; padding: 6px 14px; border-radius: 10px; font-weight: 800; font-size: 10px; text-transform: uppercase; color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #eee; }
        .price-tag { font-size: 1.4rem; font-weight: 800; color: #000; }
        .seller-badge { background: #f8f9fa; color: #000; font-size: 10px; font-weight: 800; padding: 5px 12px; border-radius: 8px; display: inline-block; margin-bottom: 10px; border: 1px solid #eee; }
        .btn-view { background: #f8f9fa; color: #000; border: 1px solid #eee; padding: 10px 20px; border-radius: 12px; font-weight: 700; transition: 0.3s; cursor: pointer; }
        .premium-card:hover .btn-view { background: var(--primary-yellow); border-color: var(--primary-yellow); }
        .btn-cart { background: transparent; border: 1px solid #eee; padding: 10px 14px; border-radius: 12px; font-weight: 700; transition: 0.3s; cursor: pointer; color: #000; }
        .btn-cart:hover { background: #000; color: #fff; border-color: #000; }
        .btn-cart.added { background: #000; color: #ffc63a; border-color: #000; }
        /* ── Filter Sidebar ── */
        .filter-sidebar { background: #fff; border: 1px solid #eee; border-radius: 20px; padding: 24px; position: sticky; top: 110px; max-height: calc(100vh - 130px); overflow-y: auto; scrollbar-width: thin; }
        .filter-sidebar::-webkit-scrollbar { width: 4px; }
        .filter-sidebar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
        .filter-section { border-bottom: 1px solid #f4f4f4; padding: 16px 0; }
        .filter-section:last-child { border-bottom: none; }
        .filter-section-title { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .filter-chip { display: inline-flex; align-items: center; gap: 6px; background: #000; color: #fff; border-radius: 20px; padding: 4px 12px; font-size: 0.78rem; font-weight: 700; margin: 3px; }
        .filter-chip button { background: none; border: none; color: #fff; cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1; opacity: 0.7; }
        .filter-chip button:hover { opacity: 1; }
        .filter-btn-pill { background: #f8f9fa; border: 1px solid #eee; border-radius: 20px; padding: 5px 14px; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .filter-btn-pill:hover, .filter-btn-pill.active { background: var(--primary-yellow); border-color: var(--primary-yellow); color: #000; }
        .filter-select { width: 100%; border: 1px solid #eee; border-radius: 10px; padding: 8px 12px; font-size: 0.88rem; outline: none; background: #fafafa; font-family: inherit; }
        .filter-select:focus { border-color: var(--primary-yellow); background: #fff; }
        .price-inputs { display: flex; gap: 8px; align-items: center; }
        .price-input { flex: 1; border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; font-size: 0.85rem; outline: none; background: #fafafa; width: 100%; }
        .price-input:focus { border-color: var(--primary-yellow); background: #fff; }
        .btn-apply-price { background: #000; color: #fff; border: none; border-radius: 10px; padding: 8px 14px; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .btn-apply-price:hover { background: #333; }
        .filter-toggle-btn { display: flex; align-items: center; gap: 8px; background: #f8f9fa; border: 1px solid #eee; border-radius: 12px; padding: 10px 18px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
        .filter-toggle-btn:hover { background: var(--primary-yellow); border-color: var(--primary-yellow); }
        .filter-drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 320px; background: #fff; z-index: 1100; box-shadow: 4px 0 30px rgba(0,0,0,0.15); padding: 24px; overflow-y: auto; transform: translateX(-100%); transition: transform 0.35s cubic-bezier(0.4,0,0.2,1); }
        .filter-drawer.open { transform: translateX(0); }
        .filter-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1090; display: none; }
        .filter-overlay.open { display: block; }
        .badge-count { background: #000; color: #ffc63a; border-radius: 20px; padding: 1px 8px; font-size: 0.72rem; font-weight: 800; }
        /* ── Footer ── */
        .main-footer { background-color: #3D3B3B; color: #b2bec3; padding: 66px 0 4px; width: 100%; margin-top: 80px; }
        .footer-brand { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 25px; }
        .footer-description { font-size: 1rem; line-height: 1.8; max-width: 380px; color: #b2bec3; }
        .footer-heading { font-weight: 600; font-size: 1.2rem; color: #fff; margin-bottom: 30px; }
        .footer-links { list-style: none; padding: 0; margin: 0; }
        .footer-links li { margin-bottom: 4px; }
        .footer-links a { color: #fff; text-decoration: none; font-size: 1rem; transition: color 0.3s ease; }
        .footer-links a:hover { color: #ffc63a; }
        .social-icons-box a { color: #fff; font-size: 1.1rem; margin-right: 25px; transition: color 0.3s ease; text-decoration: none; }
        .social-icons-box a:hover { color: #ffc63a; }
        .copyright-bar { text-align: center; padding: 10px 0; margin-top: 12px; border-top: 1px solid #444; font-size: 0.95rem; color: #636e72; background-color: #1e2124; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--primary-yellow); }
        @media (max-width: 991px) { .filter-sidebar { display: none; } }
        @media (max-width: 768px) { .browse-hero { padding: 30px 0; } .browse-hero .display-4 { font-size: 2rem; } .search-container { flex-direction: column; border-radius: 20px; gap: 8px; } .search-input { padding: 10px 15px; } .btn-search { width: 100%; border-radius: 14px; } .card-img-box { height: 200px; } .search-wrapper-hdr { width: 100% !important; margin: 10px 0 !important; } }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <div className="browse-page" style={{ paddingTop: 100 }}>
        {/* ===== HEADER ===== */}
        <nav className="navbar-main">
          <div className="container-fluid px-lg-5 d-flex align-items-center justify-content-between">
            <Link className="navbar-brand-main" href="/">Flex Market</Link>

            <div className="d-none d-lg-flex align-items-center gap-0">
              {listingTypes.slice(0, 4).map((lt) => (
                <Link key={lt.id} className="nav-link-main" href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>
                  {lt.type_name}
                </Link>
              ))}
            </div>

            <div className="search-wrapper-hdr d-none d-xl-block">
              <form onSubmit={handleHeaderSearch}>
                <i className="bi bi-search search-icon-fixed-hdr"></i>
                <input className="search-input-premium-hdr" type="text" placeholder="Search curated collections..." value={headerSearch} onChange={(e) => setHeaderSearch(e.target.value)} />
              </form>
            </div>

            <div className="d-flex align-items-center gap-4">
              <Link href="/cart" className="position-relative text-dark" style={{ fontSize: '1.3rem' }}>
                <i className="bi bi-heart"></i>
                {cartCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill" style={{ background: '#ffc63a', color: '#000', fontSize: '0.65rem' }}>
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="user-dropdown" onMouseLeave={() => setShowUserDropdown(false)}>
                  <a href="#" className="d-flex align-items-center gap-2 text-decoration-none" onClick={(e) => { e.preventDefault(); setShowUserDropdown(!showUserDropdown); }}>
                    {(user.role === 'super_admin' || user.role === 'admin') && (
                      <span style={{ background: user.role === 'super_admin' ? '#1e293b' : '#6366f1', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.5 }}>
                        {user.role === 'super_admin' ? 'SA' : 'Admin'}
                      </span>
                    )}
                    <div className="rounded-circle overflow-hidden shadow-sm" style={{ width: 38, height: 38, border: '2px solid var(--primary-yellow)' }}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=000&color=fff&bold=true`} alt="" style={{ width: '100%', height: '100%' }} />
                    </div>
                  </a>
                  {showUserDropdown && (
                    <div className="user-dropdown-menu">
                      <div className="dd-header">
                        {(user.role === 'super_admin' || user.role === 'admin') && (
                          <span style={{ background: user.role === 'super_admin' ? '#1e293b' : '#6366f1', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 800, display: 'inline-block', marginBottom: 6 }}>
                            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        )}
                        <h6 className="mb-1 fw-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{user.name}</h6>
                        <small className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>{user.email}</small>
                      </div>
                      <Link href={`/${user.role === 'super_admin' ? 'superadmin' : user.role === 'admin' ? 'admin' : 'buyer'}`} className="dd-item" onClick={() => setShowUserDropdown(false)}>
                        <i className="bi bi-speedometer2 text-warning"></i> My Portal
                      </Link>
                      {!['admin', 'super_admin'].includes(user.role) && (
                        <Link href="/cart" className="dd-item" onClick={() => setShowUserDropdown(false)}>
                          <i className="bi bi-cart3"></i> My Cart
                        </Link>
                      )}
                      <hr style={{ margin: '4px 16px', borderColor: '#f0f0f0' }} />
                      <button className="dd-item text-danger" onClick={() => { logout(); window.location.href = '/login'; }}>
                        <i className="bi bi-power"></i> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="user-action-link">
                  <i className="bi bi-person-circle" style={{ fontSize: '1.2rem' }}></i>
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* ===== BROWSE HERO ===== */}
        <section className="browse-hero text-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <h5 className="fw-bold text-muted mb-2 small" style={{ letterSpacing: 2 }}>MARKETPLACE</h5>
                <h2 className="display-4 fw-900 mb-1">Elite Collections</h2>
                <form onSubmit={(e) => { handleSearch(e); setShowSuggestions(false); }}>
                  <div className="search-container" ref={searchBoxRef} style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search high-end fashion, items or brands..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); fetchSuggestions(e.target.value); }}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      autoComplete="off"
                    />
                    <button type="submit" className="btn-search">Search</button>

                    {/* Fuzzy Search Suggestions */}
                    {showSuggestions && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                        background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        border: '1px solid #eee', zIndex: 1060, overflow: 'hidden',
                        animation: 'suggestFadeIn 0.2s ease',
                      }}>
                        <div style={{ padding: '10px 16px 6px', fontSize: '0.7rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {suggestLoading ? 'Searching...' : `${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}`}
                        </div>
                        {suggestions.map((p) => {
                          const slug = `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${p.id}`;
                          return (
                            <Link
                              key={p.id}
                              href={`/buyer/product/${slug}`}
                              onClick={() => setShowSuggestions(false)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textDecoration: 'none', color: '#333', transition: 'background 0.15s', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            >
                              <i className="bi bi-search" style={{ color: '#ccc', fontSize: '0.8rem' }}></i>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                            </Link>
                          );
                        })}
                        <div
                          style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#ffc63a', cursor: 'pointer', transition: 'background 0.15s' }}
                          onClick={() => { handleSearch(new Event('submit') as any); setShowSuggestions(false); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fffdf5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        >
                          View all results for &ldquo;{search}&rdquo; →
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CATEGORY PILLS ===== */}
        <div className="container mt-4">
          <div className="cat-pills">
            <button className={`cat-pill ${activeType === '' ? 'active' : ''}`} onClick={() => handleTypeClick('')}>All Editions</button>
            {listingTypes.map((lt) => (
              <button key={lt.id} className={`cat-pill ${activeType.toLowerCase() === lt.type_name.toLowerCase() ? 'active' : ''}`} onClick={() => handleTypeClick(lt.type_name.toLowerCase())}>{lt.type_name}</button>
            ))}
          </div>
        </div>

        {/* ===== FILTER BAR + LAYOUT ===== */}
        <div className="container my-4">

          {/* Mobile filter toggle + active chips bar */}
          <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
            <button className="filter-toggle-btn d-lg-none" onClick={() => setShowFilters(true)}>
              <i className="bi bi-sliders"></i> Filters
              {activeChips.length > 0 && <span className="badge-count">{activeChips.length}</span>}
            </button>
            {/* Active filter chips */}
            {activeChips.map(chip => (
              <span key={chip.key} className="filter-chip">
                {chip.label}
                <button onClick={() => {
                  if (chip.key === 'price') {
                    const newF = { ...filters, minPrice: '', maxPrice: '' };
                    setPriceInput({ min: '', max: '' });
                    setFilters(newF); setPage(1); navigate(activeType, search, newF);
                  } else removeFilter(chip.key);
                }}>×</button>
              </span>
            ))}
            {activeChips.length > 1 && (
              <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: '#999', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                Clear all
              </button>
            )}
          </div>

          <div className="row g-4">
            {/* ===== FILTER SIDEBAR (desktop) ===== */}
            <div className="col-lg-3 d-none d-lg-block">
              <FilterPanel
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
              />
            </div>

            {/* ===== PRODUCT GRID ===== */}
            <div className="col-lg-9">
              <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease', pointerEvents: loading ? 'none' : 'auto', position: 'relative', minHeight: 200 }}>
                {loading && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                    <div className="spinner-grow text-warning" role="status" style={{ width: '2.5rem', height: '2.5rem' }}><span className="visually-hidden">Loading...</span></div>
                  </div>
                )}

                {/* Result count */}
                {!loading && data && (
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
                      <strong>{data.pagination.total}</strong> product{data.pagination.total !== 1 ? 's' : ''} found
                    </p>
                  </div>
                )}

                <div className="row g-4">
                  {data?.products && data.products.length > 0 ? (
                    data.products.map((p) => {
                      const inCart = isInCart(p.id);
                      return (
                        <div key={p.id} className="col-md-6 col-xl-4">
                          <Link href={`/buyer/product/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="premium-card">
                              <div className="card-img-box">
                                {(p.image || p.primary_image) ? (
                                  <img src={(() => { const img = p.image || p.primary_image; if (!img) return ''; return img.startsWith('http') ? img : img.startsWith('uploads/') ? `${BACKEND_URL}/${img}` : `${BACKEND_URL}/uploads/products/${img}`; })()} alt={p.title} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', borderRadius: 16, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-image" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                                  </div>
                                )}
                                <div className="listing-badge">{p.listing_type}</div>
                              </div>
                              <div className="p-4 pt-0">
                                <div className="d-flex gap-2 flex-wrap">
                                  <span className="seller-badge"><i className="bi bi-patch-check-fill text-warning"></i> VERIFIED SELLER</span>
                                  {(p.brand_name || p.brand) && <span className="seller-badge"><i className="bi bi-award me-1" style={{ color: '#ffc63a' }}></i>{p.brand_name || p.brand}</span>}
                                </div>
                                <h5 className="fw-bold mb-3" style={{ height: 52, overflow: 'hidden' }}>{p.title}</h5>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div className="price-tag">
                                    &#8377;{Number(p.listing_type === 'sell' ? (p.selling_price || p.price || p.original_price || 0) : (p.rental_cost || p.price || 0)).toLocaleString('en-IN')}
                                    {p.listing_type === 'rent' && <small className="text-muted" style={{ fontSize: '0.85rem' }}>/day</small>}
                                  </div>
                                  <div className="d-flex gap-2">
                                    <button
                                      className={`btn-cart ${inCart ? 'added' : ''}`}
                                      onClick={(e) => handleAddToCart(p, e)}
                                      title={inCart ? 'Already in cart' : 'Add to cart'}
                                    >
                                      <i className={`bi ${inCart ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                                    </button>
                                    <span className="btn-view">View</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })
                  ) : !loading ? (
                    <div className="col-12 text-center py-5">
                      <i className="bi bi-search" style={{ fontSize: '4rem', opacity: 0.25 }}></i>
                      <h3 className="mt-4 fw-bold">No results found</h3>
                      <p className="text-muted">Try adjusting your search filters.</p>
                      {activeChips.length > 0 && (
                        <button onClick={clearAllFilters} style={{ background: '#000', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Pagination */}
                {data && data.pagination && data.pagination.total_pages > 1 && (
                  <div className="d-flex justify-content-center py-5">
                    <nav>
                      <ul className="pagination">
                        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left"></i></button></li>
                        {Array.from({ length: data.pagination.total_pages }, (_, i) => (
                          <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(i + 1)} style={page === i + 1 ? { background: 'var(--primary-yellow)', borderColor: 'var(--primary-yellow)', color: '#000' } : {}}>{i + 1}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page === data.pagination.total_pages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right"></i></button></li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== MOBILE FILTER DRAWER ===== */}
        <div className={`filter-overlay ${showFilters ? 'open' : ''}`} onClick={() => setShowFilters(false)} />
        <div className={`filter-drawer ${showFilters ? 'open' : ''}`}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0">Filters {activeChips.length > 0 && <span className="badge-count">{activeChips.length}</span>}</h5>
            <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }} onClick={() => setShowFilters(false)}>×</button>
          </div>
          <FilterPanel
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
          />
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="main-footer">
          <div className="container">
            <div className="row gx-5">
              <div className="col-lg-4 col-md-6 mb-4 mb-lg-0">
                <h2 className="footer-brand">Flex Market</h2>
                <p className="footer-description">Premium curated marketplace for the elite. Discover high-end fashion, electronics, and lifestyle essentials reserved for those who value quality.</p>
              </div>
              <div className="col-lg-2 col-md-6 mb-4 mb-lg-0">
                <h5 className="footer-heading">Quick Links</h5>
                <ul className="footer-links">
                  <li><Link href="/">Home</Link></li>
                  <li><Link href="/buyer/browse">Explore</Link></li>
                  <li><Link href="/cart">Cart</Link></li>
                  <li><Link href="/login">Sign In</Link></li>
                </ul>
              </div>
              <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
                <h5 className="footer-heading">Categories</h5>
                <ul className="footer-links">
                  <li><Link href="/buyer/browse">All Products</Link></li>
                  {listingTypes.slice(0, 5).map((lt) => (<li key={lt.id}><Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>{lt.type_name}</Link></li>))}
                </ul>
              </div>
              <div className="col-lg-3 col-md-6">
                <h5 className="footer-heading">Our policies</h5>
                <ul className="footer-links mb-5">
                  <li><a href="#">Return policies</a></li>
                  <li><a href="#">Cancellation policies</a></li>
                  <li><a href="#">Terms of use</a></li>
                </ul>
                <div className="social-icons-box d-flex" style={{ marginTop: -33 }}>
                  <a href="#"><i className="bi bi-facebook"></i></a>
                  <a href="#"><i className="bi bi-twitter"></i></a>
                  <a href="#"><i className="bi bi-instagram"></i></a>
                  <a href="#"><i className="bi bi-linkedin"></i></a>
                </div>
              </div>
            </div>
          </div>
          <div className="copyright-bar"><div className="container text-center">&copy; {new Date().getFullYear()} Flex Market. All rights reserved.</div></div>
        </footer>
      </div>
    </>
  );
}

// ── Filter Panel Component ─────────────────────────────────────────────────────
interface FilterPanelProps {
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
}

function FilterPanel({
  filters, priceInput, setPriceInput, filterOptions, dynamicAttrs,
  subCatsForCategory, setFilter, setSpecFilter, applyPriceFilter,
  clearAllFilters, activeChips,
}: FilterPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true, category: true, brand: false, color: false, size: false, gender: false, condition: false,
  });

  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="filter-sidebar">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-bold mb-0" style={{ fontFamily: "'Maven Pro', sans-serif" }}>
          <i className="bi bi-sliders me-2"></i>Filters
        </h6>
        {activeChips.length > 0 && (
          <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: '#999', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
            Clear all
          </button>
        )}
      </div>

      {/* ── Price Range ── */}
      <div className="filter-section">
        <div className="filter-section-title" onClick={() => toggleSection('price')}>
          Price Range <i className={`bi bi-chevron-${openSections.price ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
        </div>
        {openSections.price && (
          <div>
            <div className="price-inputs mb-2">
              <input
                type="number"
                className="price-input"
                placeholder="Min ₹"
                value={priceInput.min}
                onChange={(e) => setPriceInput({ ...priceInput, min: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()}
                min={0}
              />
              <span style={{ color: '#ccc', fontSize: '0.8rem' }}>—</span>
              <input
                type="number"
                className="price-input"
                placeholder="Max ₹"
                value={priceInput.max}
                onChange={(e) => setPriceInput({ ...priceInput, max: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()}
                min={0}
              />
            </div>
            <button className="btn-apply-price w-100" onClick={applyPriceFilter}>Apply Price</button>
            {filterOptions?.price_range && (
              <p style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 6, marginBottom: 0 }}>
                Range: ₹{Number(filterOptions.price_range.min_price).toLocaleString('en-IN')} – ₹{Number(filterOptions.price_range.max_price).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Category ── */}
      {filterOptions && filterOptions.categories.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title" onClick={() => toggleSection('category')}>
            Category <i className={`bi bi-chevron-${openSections.category ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {openSections.category && (
            <div>
              <select
                className="filter-select mb-2"
                value={filters.categoryId}
                onChange={(e) => setFilter('categoryId', e.target.value)}
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>

              {/* Sub-Category */}
              {filters.categoryId && subCatsForCategory.length > 0 && (
                <select
                  className="filter-select"
                  value={filters.subCategoryId}
                  onChange={(e) => setFilter('subCategoryId', e.target.value)}
                >
                  <option value="">All Sub-categories</option>
                  {subCatsForCategory.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Dynamic Attributes (from category field_config) ── */}
      {dynamicAttrs.length > 0 && dynamicAttrs.map((attr) => (
        <div key={attr.name} className="filter-section">
          <div className="filter-section-title" style={{ cursor: 'default' }}>{attr.name}</div>
          {attr.type === 'select' && attr.options && attr.options.length > 0 ? (
            <select
              className="filter-select"
              value={filters.specs[attr.name] || ''}
              onChange={(e) => setSpecFilter(attr.name, e.target.value)}
            >
              <option value="">Any {attr.name}</option>
              {attr.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : attr.type === 'checkbox' && attr.options && attr.options.length > 0 ? (
            <div className="d-flex flex-wrap gap-1">
              {attr.options.map(opt => (
                <button
                  key={opt}
                  className={`filter-btn-pill ${filters.specs[attr.name] === opt ? 'active' : ''}`}
                  onClick={() => setSpecFilter(attr.name, filters.specs[attr.name] === opt ? '' : opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              className="price-input"
              placeholder={`Enter ${attr.name}`}
              value={filters.specs[attr.name] || ''}
              onChange={(e) => setSpecFilter(attr.name, e.target.value)}
            />
          )}
        </div>
      ))}

      {/* ── Brand ── */}
      {filterOptions && filterOptions.brands.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title" onClick={() => toggleSection('brand')}>
            Brand <i className={`bi bi-chevron-${openSections.brand ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {openSections.brand && (
            <select
              className="filter-select"
              value={filters.brandId}
              onChange={(e) => setFilter('brandId', e.target.value)}
            >
              <option value="">All Brands</option>
              {filterOptions.brands.map(b => (
                <option key={b.id} value={String(b.id)}>{b.brand_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Color ── */}
      {filterOptions && filterOptions.colors.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title" onClick={() => toggleSection('color')}>
            Color <i className={`bi bi-chevron-${openSections.color ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {openSections.color && (
            <div className="d-flex flex-wrap gap-1">
              {filterOptions.colors.map(c => (
                <button
                  key={c.id}
                  className={`filter-btn-pill ${filters.color.toLowerCase() === c.name.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setFilter('color', filters.color.toLowerCase() === c.name.toLowerCase() ? '' : c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Size ── */}
      {filterOptions && filterOptions.sizes.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title" onClick={() => toggleSection('size')}>
            Size <i className={`bi bi-chevron-${openSections.size ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {openSections.size && (
            <div className="d-flex flex-wrap gap-1">
              {filterOptions.sizes.map(s => (
                <button
                  key={s}
                  className={`filter-btn-pill ${filters.size === s ? 'active' : ''}`}
                  onClick={() => setFilter('size', filters.size === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Gender ── */}
      {filterOptions && filterOptions.genders.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-title" onClick={() => toggleSection('gender')}>
            Gender <i className={`bi bi-chevron-${openSections.gender ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
          </div>
          {openSections.gender && (
            <div className="d-flex flex-wrap gap-1">
              {filterOptions.genders.map(g => (
                <button
                  key={g.id}
                  className={`filter-btn-pill ${filters.gender.toLowerCase() === g.name.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setFilter('gender', filters.gender.toLowerCase() === g.name.toLowerCase() ? '' : g.name)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Condition ── */}
      <div className="filter-section">
        <div className="filter-section-title" onClick={() => toggleSection('condition')}>
          Condition <i className={`bi bi-chevron-${openSections.condition ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
        </div>
        {openSections.condition && (
          <div className="d-flex gap-2 flex-wrap">
            {(['', 'new', 'used'] as const).map((c) => (
              <button
                key={c || 'all'}
                className={`filter-btn-pill ${filters.condition === c ? 'active' : ''}`}
                onClick={() => setFilter('condition', c)}
              >
                {c === '' ? 'All' : c === 'new' ? 'Brand New' : 'Pre-owned'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
