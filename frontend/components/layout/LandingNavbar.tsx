'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface Category { id: number; category_name: string; product_type_id: number; }
interface ProductType { id: number; name: string; listing_type_id: number; categories?: Category[]; }
interface ListingType { id: number; type_name: string; product_types?: ProductType[]; }
interface SearchResult { id: number; title: string; listing_type: string; selling_price?: string; rental_cost?: string; original_price?: string; primary_image?: string; image?: string; brand_name?: string; }

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');

export default function LandingNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
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
      <div className=' flex w-full items-center grow justify-between'>
        <ul className=' flex items-center grow pt-4  justify-start gap-6 ml-10'>
          {/* Mega menu trigger */}
          <li ref={megaRef}>
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
                className="fixed left-0 right-0 top-[90px] w-screen bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-b-2xl px-28 py-10 z-[1060]"
                onMouseLeave={() => setShowMegaMenu(false)}
              >
                <div className="grid grid-cols-3 gap-10">
                  {listingTypes.slice(0, 3).map(lt => (
                    <div key={lt.id}>
                      <span className="font-bold text-base text-black border-b-2 border-gold pb-2 mb-4 inline-block">
                        {lt.type_name}
                      </span>
                      <ul className="list-none p-0 space-y-3">
                        {lt.product_types?.map(pt => (
                          <li key={pt.id}>
                            <Link
                              href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                              className="font-bold text-[0.95rem] text-black hover:text-gold transition-colors duration-200 block mb-1"
                              onClick={() => setShowMegaMenu(false)}
                            >
                              {pt.name}
                            </Link>
                            <ul className="list-none pl-2 mt-1 space-y-1">
                              {pt.categories?.slice(0, 4).map(cat => (
                                <li key={cat.id}>
                                  <Link
                                    href={`/buyer/browse?category=${cat.id}`}
                                    className="text-[0.88rem] text-gray-500 hover:text-gold transition-colors duration-200 block py-0.5"
                                    onClick={() => setShowMegaMenu(false)}
                                  >
                                    {cat.category_name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
        {/* Right: search + login */}
        <div>


          {/* Login / Portal */}
          {/* User Auth Dropdown */}
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
                  <span className="text-sm font-bold text-gray-800 hidden md:block">
                    {user.name}
                  </span>
                  <i className={`bi bi-chevron-down text-[0.7rem] text-gray-400 transition-transform duration-300 ${showAuthDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showAuthDropdown && (
                  <div className="absolute right-0 top-8 mt-3 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href={user.role === 'super_admin' ? '/admin/profile' : user.role === 'admin' ? '/admin/profile' : user.role === 'seller' ? '/seller/profile' : user.role === 'delivery' ? '/delivery/profile' : '/buyer/profile'}
                      className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-person-fill"></i>
                      <span className="text-xs text-nowrap font-semibold text-gray-800 hidden md:block">
                        {user.name}
                      </span>
                    </Link>

                    <Link
                      href="/wishlist"
                      className="flex   items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-heart-fill"></i>
                      <span className="text-xs text-nowrap font-semibold">Wishlist</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setShowAuthDropdown(false);
                        router.push('/');
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                  className='text-[#008080] border-2 flex items-center gap-2 border-[#008080] rounded-full! px-4 py-2 hover:bg-[#008080] hover:text-white transition-all duration-300'
                >
                  <i className="bi bi-person-fill"></i>
                  <span>Login / Register</span>
                  <i className={`bi bi-chevron-down text-[0.7rem] transition-transform duration-300 ${showAuthDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showAuthDropdown && (
                  <div className="absolute right-0 top-8 mt-3 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/login"
                      className="flex items-center gap-3 px-5 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
                      onClick={() => setShowAuthDropdown(false)}
                    >
                      <i className="bi bi-box-arrow-in-right"></i>
                      <span className="font-medium">Login</span>
                    </Link>
                    <div className="h-[1px] bg-gray-100 mx-4 my-1"></div>
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
        </div>

      </div>


      {/* Mobile drawer
      {mobileNavOpen && (
        <div>
          <form onSubmit={handleSearchSubmit}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </form>
          <Link href="/buyer/browse" onClick={() => setMobileNavOpen(false)}>All Products</Link>
          {listingTypes.slice(0, 6).map(lt => (
            <Link
              key={lt.id}
              href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
              onClick={() => setMobileNavOpen(false)}
            >
              {lt.type_name}
            </Link>
          ))}
          <hr />
          {isAuthenticated && user ? (
            <Link
              href={user.role === 'super_admin' ? '/superadmin' : user.role === 'admin' ? '/admin' : '/buyer/dashboard'}
              onClick={() => setMobileNavOpen(false)}
            >
              My Portal
            </Link>
          ) : (
            <Link href="/login" onClick={() => setMobileNavOpen(false)}>Login / Register</Link>
          )}
        </div>
      )} */}
    </nav>
  );
}
