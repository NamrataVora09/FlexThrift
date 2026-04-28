'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import React from 'react';

interface Category { id: number; category_name?: string; name?: string; product_type_id: number; }
interface ProductType { id: number; name: string; listing_type_id: number; categories?: Category[]; }
interface ListingType { id: number; type_name: string; product_types?: ProductType[]; }
interface SearchResult { id: number; title: string; listing_type: string; selling_price?: string; rental_cost?: string; original_price?: string; primary_image?: string; image?: string; brand_name?: string; }

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

export default function LandingNavbar({ showAuth = false }: { showAuth?: boolean }) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [megaSearch, setMegaSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const megaRef = useRef<HTMLLIElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/taxonomy`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const { listing_types, product_types, categories } = res.data;
          setListingTypes((listing_types as ListingType[]).map(lt => ({
            ...lt,
            product_types: (product_types as ProductType[])
              .filter(pt => pt.listing_type_id === lt.id)
              .map(pt => ({ ...pt, categories: (categories as Category[]).filter(c => c.product_type_id === pt.id) })),
          })));
        }
      }).catch(() => { });
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setShowMegaMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (authRef.current && !authRef.current.contains(e.target as Node)) setShowAuthDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    fetch(`${API_BASE}/products?search=${encodeURIComponent(q)}&limit=6&status=approved`)
      .then(r => r.json())
      .then(res => { setSearchResults(res.success && res.data?.products ? res.data.products.slice(0, 6) : []); })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchOpen(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 320);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/buyer/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getImg = (p: SearchResult) => {
    const raw = p.primary_image || p.image || '';
    if (!raw) return null;
    if (raw.startsWith('http')) return raw;
    return `${BACKEND_URL}/uploads/${raw}`;
  };

  const getPrice = (p: SearchResult) => {
    const v = p.listing_type === 'rent' ? p.rental_cost : (p.selling_price || p.original_price);
    return v ? `₹${parseFloat(v).toLocaleString('en-IN')}` : '';
  };

  return (
    <nav className=' flex  px-28 py-3 left-0 font-semibold  text-black items-center justify-between  shadow-md fixed top-0 z-50 w-full bg-white'>

      {/* Brand */}
      <Link href="/" className=' text-[40px]   text-nowrap '>Flex Market</Link>

      {/* Mobile toggle */}
      <button className='md:hidden' onClick={() => setMobileNavOpen(v => !v)}>
        <i className="bi bi-list"></i>
      </button>

      {/* Desktop nav */}
      <div className={` flex w-full items-center grow ${showAuth ? 'justify-between' : 'justify-between'}`}>
        <ul className={`flex items-center grow pt-4 ${showAuth ? 'justify-start gap-6' : 'justify-start gap-6'}  ml-10`}>
          {/* Mega menu trigger */}
          <li ref={megaRef} className="relative">
            <a
              href="#"
              onClick={e => { e.preventDefault(); setShowMegaMenu(v => !v); }}
              onMouseEnter={() => setShowMegaMenu(true)}
              className="flex items-center gap-1 cursor-pointer hover:text-gold transition-colors duration-200"
            >
              All Products
              <i className="bi bi-chevron-down text-[0.65rem]"></i>
            </a>

            {showMegaMenu && (
              <div
                className="absolute -left-10 top-[58px] border w-[1200px] h-[560px] flex flex-col bg-white z-[1060] border-t border-gray-100 shadow-[0_25px_60px_rgba(0,0,0,0.1)]"
                onMouseEnter={() => setShowMegaMenu(true)}
                onMouseLeave={() => { setShowMegaMenu(false); setMegaSearch(''); }}
              >
                {/* Search bar — small, top-right corner */}
                <div className="w-full  px-10 pt-3 pb-2 mb-3 flex ">
                  <div className="relative w-full">
                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search…"
                      value={megaSearch}
                      onChange={e => setMegaSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg outline-none  transition-colors bg-gray-50"
                    />
                    {megaSearch && (
                      <button
                        onClick={() => setMegaSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable content grouped by listing type */}
                <div className="flex-1 overflow-x-auto overflow-y-auto px-10 pb-6">
                  {(() => {
                    const q = megaSearch.trim().toLowerCase();

                    const groups = listingTypes.map(lt => {
                      const ltMatch = !q || lt.type_name.toLowerCase().includes(q);
                      const pts = (lt.product_types || []).filter(pt =>
                        ltMatch || pt.name.toLowerCase().includes(q)
                      );
                      return { lt, pts };
                    }).filter(g => g.pts.length > 0);

                    if (groups.length === 0) {
                      return (
                        <div className="text-center py-10 text-gray-400 text-sm">
                          No results for &ldquo;{megaSearch}&rdquo;
                        </div>
                      );
                    }

                    return (
                      <div className=" grid grid-cols-6 gap-4" style={{ gridTemplateColumns: "repeat(6,minmax(100px))" }}>
                        {groups.map(({ lt, pts }, index) => (
                          <div key={lt.id} style={{ width: 160, minWidth: 160, maxWidth: 160, flexShrink: 0, flexGrow: 0 }}>
                            {/* Listing type header */}
                            <div className="flex items-center gap-3 mb-3">
                              <Link
                                href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                                className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#ef4444]! transition-colors"
                                onClick={() => { setShowMegaMenu(false); setMegaSearch(''); }}
                              >
                                {lt.type_name}
                              </Link>
                            </div>


                            <div className="flex flex-col gap-0.5">
                              {pts.map((pt, index) => (
                                <React.Fragment key={pt.id}>
                                  <Link
                                    href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}&product_type_id=${pt.id}`}
                                    className="text-[13px] text-gray-700 hover:text-black py-0.5 transition-all duration-200"
                                    onClick={() => { setShowMegaMenu(false); setMegaSearch(''); }}
                                  >
                                    {pt.name}
                                  </Link>

                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}

                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </li>

          {/* Listing type links */}
          {listingTypes.slice(0, 6).map(lt => (
            <li key={lt.id}>
              <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>
                {lt.type_name}
              </Link>
            </li>
          ))}

        </ul>

        {/* Auth dropdown */}
        {(
          <div className="relative" ref={authRef}>
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  className="flex items-center gap-3 border border-[#008080] rounded-full! px-2 py-1 pr-4 hover:border-[#008080] transition-all duration-300 bg-white shadow-sm"
                >
                  <div className='w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs'>
                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="text-sm font-bold text-gray-800 hidden md:block">{user.name}</span>
                  <i className={`bi bi-chevron-down text-[0.7rem] text-gray-400 transition-transform duration-300 ${showAuthDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showAuthDropdown && (
                  <div className="absolute right-0 top-8 mt-3 w-44 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden">
                    <Link
                      href={user.role === 'super_admin' ? '/superadmin' : user.role === 'admin' ? '/admin/profile' : user.role === 'seller' ? '/seller/profile' : user.role === 'delivery' ? '/delivery/profile' : '/buyer/profile'}
                      className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-person-fill"></i>
                      <span className="text-xs text-nowrap font-semibold text-gray-800">{user.name}</span>
                    </Link>
                    <Link
                      href="/wishlist"
                      className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-heart-fill"></i>
                      <span className="text-xs text-nowrap font-semibold">Wishlist</span>
                    </Link>
                    <button
                      onClick={() => { logout(); setShowAuthDropdown(false); router.push('/'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 transition-colors"
                      style={{ color: '#ef4444' }}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span className="text-xs text-nowrap font-semibold">Logout</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <button
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  className='flex items-center gap-3 border border-[#008080] rounded-full! px-2 py-1.5 pr-4 hover:border-[#008080] transition-all duration-300 bg-white shadow-sm'
                >
                  <div className='w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs'>
                    <i className="bi bi-person-fill"></i>
                  </div>
                  {showAuth ? <span>Login / Register</span> : <span>Register</span>}
                  <i className={`bi bi-chevron-down text-[0.7rem] transition-transform duration-300 ${showAuthDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showAuthDropdown && (
                  <div className="absolute right-0 top-10 mt-3 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden">
                    {showAuth && (
                      <>
                        <Link
                          href="/login"
                          className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                          onClick={() => setShowAuthDropdown(false)}
                        >
                          <i className="bi bi-box-arrow-in-right"></i>
                          <span className="font-medium">Login</span>
                        </Link>
                        <div className="h-[1px] bg-gray-100 mx-4 my-1"></div>
                      </>
                    )}
                    <Link
                      href="/register"
                      className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-person-plus"></i>
                      <span className="font-medium">Register</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
