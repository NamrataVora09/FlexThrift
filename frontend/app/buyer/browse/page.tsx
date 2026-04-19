'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { addToCart } from '@/lib/cart';

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
  category_name?: string;
  gender?: string;
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

function getProductPrice(p: Product): number {
  return Number(p.listing_type === 'sell'
    ? (p.selling_price || p.price || p.original_price || 0)
    : (p.rental_cost || p.price || 0));
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

  const buildUrl = (type: string, s: string, f: ActiveFilters): string => {
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
  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) { setSearch(headerSearch); setPage(1); navigate(activeType, headerSearch, filters); }
  };
  const handleTypeClick = (type: string) => { setActiveType(type); setPage(1); navigate(type, search, filters); };

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

  const subCatsForCategory = filterOptions?.sub_categories.filter(s => String(s.category_id) === filters.categoryId) || [];

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

        /* Card hover effects */
        .em-card { cursor: pointer; }
        .em-card-img-wrap { position: relative; aspect-ratio: 4/5; overflow: hidden; border-radius: 16px; background: #f0f1f1; margin-bottom: 16px; }
        .em-card .em-card-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
          transition: opacity 0.45s ease, transform 700ms ease;
        }
        .em-card:hover .em-card-img { transform: scale(1.07); }
        .em-card .em-card-overlay {
          position: absolute; inset: 0; z-index: 1;
          background-color: transparent;
          transition: background-color 300ms ease;
          pointer-events: none;
        }
        .em-card:hover .em-card-overlay { background-color: rgba(12,15,15,0.08); }

        /* Wishlist button */
        .em-card .em-wish-btn {
          position: absolute; bottom: 20px; left: 50%; z-index: 3;
          transform: translateX(-50%) translateY(12px);
          opacity: 0;
          transition: opacity 300ms ease, transform 300ms ease;
          background: rgba(12,15,15,0.88); color: #fff;
          padding: 10px 24px; border-radius: 9999px;
          font-size: 0.82rem; font-weight: 700;
          border: none; cursor: pointer;
          backdrop-filter: blur(8px);
          white-space: nowrap; font-family: 'Inter', sans-serif;
          display: flex; align-items: center; gap: 7px;
        }
        .em-card:hover .em-wish-btn { opacity: 1; transform: translateX(-50%) translateY(0); }
        .em-card .em-wish-btn.wishlisted { background: #FFC107; color: #3d2b00; }

        /* Listing type badge */
        .em-type-badge {
          position: absolute; top: 12px; left: 12px; z-index: 4;
          padding: 4px 10px; border-radius: 9999px;
          font-size: 0.62rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.06em;
          display: flex; align-items: center; gap: 4px;
          cursor: help; user-select: none;
          background: rgba(255,255,255,0.82);
          color: #0c0f0f;
          backdrop-filter: blur(6px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }

        /* Discount badge */
        .em-disc-badge {
          position: absolute; top: 12px; right: 12px; z-index: 4;
          background: #b02500; color: #fff;
          padding: 3px 9px; border-radius: 9999px;
          font-size: 0.62rem; font-weight: 800;
        }

        /* Image dots */
        .em-img-dots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 4; display: flex; gap: 5px; }
        .em-img-dot { height: 5px; border-radius: 9999px; background: rgba(255,255,255,0.6); transition: width 0.3s ease, background 0.3s ease; }
        .em-img-dot.active { background: #FFC107; }

        /* Product info */
        .em-prod-brand { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #FFC107; margin: 0 0 5px; }
        .em-title-price-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
        .em-prod-title { font-size: 1rem; font-weight: 800; color: #0c0f0f; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Manrope', sans-serif; letter-spacing: -0.02em; flex: 1; min-width: 0; }
        .em-prod-price-block { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
        .em-prod-price { font-size: 0.97rem; font-weight: 800; color: #0c0f0f; white-space: nowrap; }
        .em-prod-orig { font-size: 0.72rem; font-weight: 500; color: #acadad; text-decoration: line-through; white-space: nowrap; }
        .em-prod-per { font-size: 0.65rem; font-weight: 500; color: #5a5c5c; }
        .em-prod-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .em-prod-tag { padding: 3px 9px; border-radius: 9999px; font-size: 0.65rem; font-weight: 600; background: #f0f1f1; color: #5a5c5c; }
        .em-prod-tag.brand { background: #fff8e1; color: #755700; border: 1px solid #FFC107; }

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
        .em-select:focus { border-color: #FFC107; box-shadow: 0 0 0 2px rgba(255,193,7,0.15); }

        /* Range input */
        input[type="range"].em-range { accent-color: #FFC107; width: 100%; height: 4px; }

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
          background: #FFC107; border-color: #FFC107; color: #0c0f0f;
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

        /* Footer */
        .em-footer { background: #0c0f0f; width: 100%; }
        .em-footer a { color: rgba(255,255,255,0.5); text-decoration: none !important; font-size: 0.9rem; transition: color 0.2s; }
        .em-footer a:hover { color: #fff; }

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

      <div className="em-body" style={{ paddingTop: 100 }}>

        {/* ===== TOP NAVBAR — UNCHANGED ===== */}
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
                <input
                  className="search-input-premium-hdr"
                  type="text"
                  placeholder="Search curated collections..."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                />
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
        {/* ===== END TOP NAVBAR ===== */}

        {/* ===== MAIN CONTENT ===== */}
        <main style={{ paddingTop: 48, paddingBottom: 96, paddingLeft: 32, paddingRight: 32, maxWidth: 1440, margin: '0 auto' }}>

          {/* Hero Header */}
          <header style={{ marginBottom: 64 }}>
            <h1
              className="em-heading em-hero-title"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.375rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#0c0f0f', marginBottom: 16, lineHeight: 1.1 }}
            >
              Elite Collections
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#5a5c5c', fontWeight: 300, maxWidth: 640, margin: 0 }}>
              Discover our curated high-end selection. Every piece is chosen for its exceptional craftsmanship and timeless design.
            </p>
          </header>

          {/* Two-column layout */}
          <div className="em-layout" style={{ display: 'flex', gap: 48 }}>

            {/* ===== SIDEBAR (desktop) ===== */}
            <aside className="em-sidebar-desk" style={{ width: 256, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 132 }}>
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
                />
              </div>
            </aside>

            {/* ===== PRODUCT AREA ===== */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Type pills + sort row */}
              <section style={{ marginBottom: 48, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {/* Left: mobile filter btn + type pills */}
                <div className="em-type-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {/* Mobile filter toggle */}
                  <button
                    className="d-lg-none em-type-pill"
                    onClick={() => setShowFilters(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="bi bi-sliders"></i> Filters
                    {activeChips.length > 0 && (
                      <span style={{ background: '#0c0f0f', color: '#FFC107', borderRadius: 9999, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {activeChips.length}
                      </span>
                    )}
                  </button>

                  <button
                    className={`em-type-pill ${activeType === '' ? 'active' : ''}`}
                    onClick={() => handleTypeClick('')}
                  >
                    All Items
                  </button>
                  {listingTypes.map((lt) => (
                    <button
                      key={lt.id}
                      className={`em-type-pill ${activeType.toLowerCase() === lt.type_name.toLowerCase() ? 'active' : ''}`}
                      onClick={() => handleTypeClick(lt.type_name.toLowerCase())}
                    >
                      {lt.type_name}
                    </button>
                  ))}
                </div>

                {/* Right: Sort + result count */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {!loading && data && (
                    <p style={{ fontSize: '0.78rem', color: '#5a5c5c', margin: 0 }}>
                      <strong>{data.pagination.total}</strong> item{data.pagination.total !== 1 ? 's' : ''} found
                    </p>
                  )}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5a5c5c', display: 'block', marginBottom: 4, marginLeft: 16, fontWeight: 700 }}>
                      Sort By
                    </label>
                    <select
                      className="em-sort-sel"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="featured">Featured</option>
                      <option value="newest">Newest</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                    <span
                      className="material-symbols-outlined"
                      style={{ position: 'absolute', right: 16, bottom: 12, pointerEvents: 'none', color: '#5a5c5c', fontSize: 20 }}
                    >
                      expand_more
                    </span>
                  </div>
                </div>
              </section>

              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {activeChips.map(chip => (
                    <span key={chip.key} className="em-chip">
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
                    <button
                      onClick={clearAllFilters}
                      style={{ background: 'none', border: 'none', color: '#5a5c5c', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* Product Grid */}
              <section
                className="em-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '32px 32px',
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
        <div className={`em-drawer ${showFilters ? 'open' : ''}`}>
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
          />
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="em-footer" style={{ padding: '64px 32px 0' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="em-heading" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>Flex Market</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none', letterSpacing: 'normal', lineHeight: 1.7, maxWidth: 300, fontSize: '0.875rem' }}>
                Redefining high-end retail through curated excellence and minimalist design.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ color: '#FFC107', fontWeight: 700, marginBottom: 8, fontSize: '0.875rem' }}>Shop</h4>
              <Link href="/buyer/browse">New Arrivals</Link>
              <Link href="/buyer/browse">Bestsellers</Link>
              <Link href="/buyer/browse">Collections</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ color: '#FFC107', fontWeight: 700, marginBottom: 8, fontSize: '0.875rem' }}>Support</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Shipping &amp; Returns</a>
              <a href="#">Contact Us</a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ color: '#FFC107', fontWeight: 700, marginBottom: 8, fontSize: '0.875rem' }}>Newsletter</h4>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  placeholder="YOUR EMAIL"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: 9999,
                    padding: '16px 24px', color: '#fff', fontSize: '0.75rem',
                    outline: 'none', letterSpacing: '0.05em',
                  }}
                />
                <button
                  style={{
                    position: 'absolute', right: 8, top: 8, bottom: 8,
                    background: '#FFC107', color: '#0c0f0f',
                    border: 'none', borderRadius: 9999,
                    padding: '0 24px', fontWeight: 700, fontSize: '0.65rem',
                    cursor: 'pointer', letterSpacing: '0.05em',
                  }}
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1440, margin: '64px auto 0', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', paddingBottom: 32 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.625rem', margin: 0, letterSpacing: '0.05em' }}>
              © {new Date().getFullYear()} Flex Market. Curated Excellence.
            </p>
          </div>
        </footer>
      </div>
    </>
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
  const discountPct = hasDiscount ? Math.round((1 - sellingPrice / originalPrice) * 100) : 0;
  const brand = p.brand_name || p.brand;
  const slug = `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${p.id}`;
  const tooltipText = isRent ? 'This item is available for Rent' : 'This item is available for Sale';

  return (
    <div className="em-card" style={{ display: 'flex', flexDirection: 'column' }} onMouseEnter={startScroll} onMouseLeave={stopScroll}>
      <Link href={`/buyer/product/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>

        {/* ── Image carousel ── */}
        <div className="em-card-img-wrap">
          {images.length > 0 ? images.map((img, i) => (
            <img
              key={i}
              className="em-card-img"
              src={resolveImg(img)}
              alt={p.title}
              style={{ opacity: i === imgIdx ? 1 : 0 }}
            />
          )) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-image" style={{ fontSize: '3rem', color: '#acadad' }}></i>
            </div>
          )}

          <div className="em-card-overlay" />

          {/* Listing type badge with tooltip */}
          <div className="em-type-badge" title={tooltipText}>
            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
              {isRent ? 'schedule' : 'sell'}
            </span>
            {isRent ? 'Rent' : 'Buy'}
          </div>



          {/* Dot indicators */}
          {images.length > 1 && (
            <div className="em-img-dots">
              {images.map((_, i) => (
                <div key={i} className={`em-img-dot ${i === imgIdx ? 'active' : ''}`} style={{ width: i === imgIdx ? 14 : 5 }} />
              ))}
            </div>
          )}

          {/* Wishlist button */}
          <button className={`em-wish-btn ${wishlisted ? 'wishlisted' : ''}`} onClick={(e) => onWishlist(p, e)}>
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
        <div style={{ padding: '0 2px' }}>

          {/* Brand */}
          {brand && <p className="em-prod-brand">{brand}</p>}

          {/* Title + Price on one line */}
          <div className="em-title-price-row">
            <h3 className="em-prod-title">{p.title}</h3>
            <div className="em-prod-price-block">
              {isRent ? (
                <>
                  <span className="em-prod-price">₹{rentalPrice.toLocaleString('en-IN')}</span>
                  <span className="em-prod-per">/day</span>
                </>
              ) : (
                <>
                  <span className="em-prod-price">₹{sellingPrice.toLocaleString('en-IN')}</span>
                  {hasDiscount && (
                    <span className="em-prod-orig">₹{originalPrice.toLocaleString('en-IN')}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tags: category · gender · brand */}
          <div className="em-prod-tags">
            {p.category_name && <span className="em-prod-tag">{p.category_name}</span>}
            {p.gender && <span className="em-prod-tag">{p.gender}</span>}
            {brand && <span className="em-prod-tag brand">{brand}</span>}
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
}

function EliteSidebar({
  filters, priceInput, setPriceInput, filterOptions, dynamicAttrs,
  subCatsForCategory, setFilter, setSpecFilter, applyPriceFilter,
  clearAllFilters, activeChips,
}: EliteSidebarProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    price: true, category: true, brand: false, color: false, size: false, gender: false,
  });
  const toggle = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const SectionTitle = ({ id, label }: { id: string; label: string }) => (
    <div
      className="em-filter-title"
      onClick={() => toggle(id)}
      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <span>{label}</span>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#5a5c5c', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
        {open[id] ? 'expand_less' : 'expand_more'}
      </span>
    </div>
  );

  /* Radio pills — dropdown if > 5 options */
  const RadioPills = ({
    items, activeVal, onSelect, placeholder = 'All',
  }: {
    items: Array<{ value: string; label: string }>;
    activeVal: string;
    onSelect: (v: string) => void;
    placeholder?: string;
  }) => {
    if (items.length > 5) {
      return (
        <select className="em-select" value={activeVal} onChange={e => onSelect(e.target.value)}>
          <option value="">{placeholder}</option>
          {items.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      );
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(item => (
          <button
            key={item.value}
            className={`em-filter-pill ${activeVal === item.value ? 'active' : ''}`}
            onClick={() => onSelect(activeVal === item.value ? '' : item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #acadad', paddingBottom: 16, marginBottom: 8 }}>
        <strong className="em-heading" style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.1em', color: '#0c0f0f', textTransform: 'uppercase' }}>
          FILTERS
        </strong>
        {activeChips.length > 0 && (
          <button
            onClick={clearAllFilters}
            style={{ background: 'none', border: 'none', color: '#b02500', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="em-sidebar-section">
        <SectionTitle id="price" label="Price Range" />
        {open.price && (
          <div>
            <input
              type="range"
              className="em-range"
              min={filterOptions?.price_range?.min_price || 0}
              max={filterOptions?.price_range?.max_price || 100000}
              step={100}
              value={priceInput.max || filterOptions?.price_range?.max_price || 100000}
              onChange={(e) => setPriceInput({ ...priceInput, max: e.target.value })}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5c5c', fontSize: '0.75rem' }}>₹</span>
                <input
                  type="number" className="em-price-inp" placeholder="Min"
                  value={priceInput.min} onChange={(e) => setPriceInput({ ...priceInput, min: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()} min={0}
                />
              </div>
              <span style={{ color: '#5a5c5c' }}>to</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a5c5c', fontSize: '0.75rem' }}>₹</span>
                <input
                  type="number" className="em-price-inp" placeholder="Max"
                  value={priceInput.max} onChange={(e) => setPriceInput({ ...priceInput, max: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()} min={0}
                />
              </div>
            </div>
            <button
              onClick={applyPriceFilter}
              style={{ marginTop: 12, width: '100%', background: '#0c0f0f', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 0', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              Apply Price
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      {filterOptions && filterOptions.categories.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="category" label="Categories" />
          {open.category && (
            <div>
              <RadioPills
                items={filterOptions.categories.map(c => ({ value: String(c.id), label: c.name }))}
                activeVal={filters.categoryId}
                onSelect={(v) => setFilter('categoryId', v)}
                placeholder="All Categories"
              />
              {filters.categoryId && subCatsForCategory.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <RadioPills
                    items={subCatsForCategory.map(s => ({ value: String(s.id), label: s.name }))}
                    activeVal={filters.subCategoryId}
                    onSelect={(v) => setFilter('subCategoryId', v)}
                    placeholder="All Sub-categories"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Attributes */}
      {dynamicAttrs.map((attr) => (
        <div key={attr.name} className="em-sidebar-section">
          <div className="em-filter-title" style={{ cursor: 'default' }}>{attr.name}</div>
          {attr.options && attr.options.length > 0 ? (
            <RadioPills
              items={attr.options.map(o => ({ value: o, label: o }))}
              activeVal={filters.specs[attr.name] || ''}
              onSelect={(v) => setSpecFilter(attr.name, filters.specs[attr.name] === v ? '' : v)}
              placeholder={`Any ${attr.name}`}
            />
          ) : (
            <input
              type="text" className="em-price-inp"
              style={{ border: '1px solid #acadad', borderRadius: 10, paddingLeft: 12 }}
              placeholder={`Enter ${attr.name}`}
              value={filters.specs[attr.name] || ''}
              onChange={(e) => setSpecFilter(attr.name, e.target.value)}
            />
          )}
        </div>
      ))}

      {/* Brand */}
      {filterOptions && filterOptions.brands.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="brand" label="Brand" />
          {open.brand && (
            <RadioPills
              items={filterOptions.brands.map(b => ({ value: String(b.id), label: b.brand_name }))}
              activeVal={filters.brandId}
              onSelect={(v) => setFilter('brandId', v)}
              placeholder="All Brands"
            />
          )}
        </div>
      )}

      {/* Color */}
      {filterOptions && filterOptions.colors.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="color" label="Color" />
          {open.color && (
            <RadioPills
              items={filterOptions.colors.map(c => ({ value: c.name, label: c.name }))}
              activeVal={filters.color}
              onSelect={(v) => setFilter('color', v)}
              placeholder="All Colors"
            />
          )}
        </div>
      )}

      {/* Size */}
      {filterOptions && filterOptions.sizes.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="size" label="Size" />
          {open.size && (
            <RadioPills
              items={filterOptions.sizes.map(s => ({ value: s, label: s }))}
              activeVal={filters.size}
              onSelect={(v) => setFilter('size', v)}
              placeholder="Any Size"
            />
          )}
        </div>
      )}

      {/* Gender */}
      {filterOptions && filterOptions.genders.length > 0 && (
        <div className="em-sidebar-section">
          <SectionTitle id="gender" label="Gender" />
          {open.gender && (
            <RadioPills
              items={filterOptions.genders.map(g => ({ value: g.name, label: g.name }))}
              activeVal={filters.gender}
              onSelect={(v) => setFilter('gender', v)}
              placeholder="All Genders"
            />
          )}
        </div>
      )}
    </div>
  );
}
