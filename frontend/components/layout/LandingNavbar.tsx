'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import React from 'react';
import ProfileDropdown from '@/components/shared/ProfileDropdown';

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

  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const megaRef = useRef<HTMLLIElement>(null);

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
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);







  return (
    <>
      <nav className='flex px-6 md:px-4 xl:px-28 py-3 left-0 font-semibold text-black items-center justify-between shadow-md fixed top-0 z-50 w-full bg-white'>
        {/* Brand */}
        <Link href="/" className='text-2xl md:text-3xl lg:text-[40px] text-nowrap'>Flex Market</Link>

        {/* Mobile toggle & Profile (Mobile) */}
        <div className="flex items-center gap-4 lg:hidden">
          {isAuthenticated && user ? (
            <ProfileDropdown
              user={user}
              profileHref={
                user.role === 'super_admin' ? '/superadmin' :
                  user.role === 'admin' ? '/admin/profile' :
                    user.role === 'seller' ? '/seller/profile' :
                      user.role === 'delivery' ? '/delivery/profile' : '/buyer/profile'
              }
              profileLabel={user.name}
              onLogout={() => { logout(); router.push('/'); }}
            />
          ) : null}
          <button className='p-2' onClick={() => setMobileNavOpen(true)}>
            <i className="bi bi-list text-2xl"></i>
          </button>
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center grow justify-between xl:ml-6!  ml-0">
          <ul className="flex items-center gap-4 lg:gap-6 pt-1">
            {/* Mega menu trigger */}
            <li ref={megaRef} className="relative">
              <a
                href="#"
                onClick={e => { e.preventDefault(); setShowMegaMenu(v => !v); }}
                onMouseEnter={() => setShowMegaMenu(true)}
                className="flex items-center gap-1 cursor-pointer hover:text-gold transition-colors duration-200 py-2"
              >
                All Products
                <i className="bi bi-chevron-down text-[0.65rem]"></i>
              </a>

              {showMegaMenu && (
                <div
                  className="absolute -left-10 top-[52px] border w-[90vw] max-w-[1200px] h-[70vh] max-h-[560px] flex flex-col bg-white z-[1060] border-t border-gray-100 shadow-[0_25px_60px_rgba(0,0,0,0.1)] rounded-b-xl"
                  onMouseEnter={() => setShowMegaMenu(true)}
                  onMouseLeave={() => { setShowMegaMenu(false); setMegaSearch(''); }}
                >
                  {/* Search bar */}
                  <div className="w-full px-10 pt-4 pb-2 mb-3 flex">
                    <div className="relative w-full">
                      <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search categories…"
                        value={megaSearch}
                        onChange={e => setMegaSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg outline-none transition-colors bg-gray-50 focus:bg-white focus:border-gold"
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

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto px-10 pb-6 custom-scrollbar">
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
                        return <div className="text-center py-10 text-gray-400 text-sm">No results for &ldquo;{megaSearch}&rdquo;</div>;
                      }

                      return (
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8 pt-4">
                          {groups.map(({ lt, pts }) => (
                            <div key={lt.id} className="flex flex-col gap-3">
                              <Link
                                href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                                className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-600 transition-colors"
                                onClick={() => { setShowMegaMenu(false); setMegaSearch(''); }}
                              >
                                {lt.type_name}
                              </Link>
                              <div className="flex flex-col gap-1.5">
                                {pts.map((pt) => (
                                  <Link
                                    key={pt.id}
                                    href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}&product_type_id=${pt.id}`}
                                    className="text-[13px] text-gray-600 hover:text-black transition-colors"
                                    onClick={() => { setShowMegaMenu(false); setMegaSearch(''); }}
                                  >
                                    {pt.name}
                                  </Link>
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
            {listingTypes.slice(0, 4).map(lt => (
              <li key={lt.id}>
                <Link
                  href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                  className="hover:text-gold transition-colors whitespace-nowrap"
                >
                  {lt.type_name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <ProfileDropdown
                user={user}
                profileHref={
                  user.role === 'super_admin' ? '/superadmin' :
                    user.role === 'admin' ? '/admin/profile' :
                      user.role === 'seller' ? '/seller/profile' :
                        user.role === 'delivery' ? '/delivery/profile' : '/buyer/profile'
                }
                profileLabel={user.name}
                extraItems={
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-gold transition-colors"
                  >
                    <i className="bi bi-heart-fill text-sm" />
                    <span className="text-xs font-semibold whitespace-nowrap">Wishlist</span>
                  </Link>
                }
                onLogout={() => { logout(); router.push('/'); }}
              />
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  className='flex items-center gap-3 border border-[#008080] rounded-full px-2 py-1.5 pr-4 hover:bg-gray-50 transition-all duration-300 bg-white shadow-sm'
                >
                  <div className='w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs'>
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <span className="text-sm whitespace-nowrap">{showAuth ? 'Login / Register' : 'Account'}</span>
                  <i className={`bi bi-chevron-down text-[0.7rem] transition-transform duration-300 ${showAuthDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {showAuthDropdown && (
                  <div className="absolute right-0 top-full mt-3 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-2 z-[1070] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[100] transition-all duration-300 lg:hidden ${mobileNavOpen ? 'visible' : 'invisible'}`}>
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileNavOpen(false)}
        />
        {/* Content */}
        <div className={`absolute right-0 top-0 h-full w-[280px] bg-white shadow-2xl transition-transform duration-300 flex flex-col ${mobileNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b flex items-center justify-between">
            <span className="font-bold text-xl">Menu</span>
            <button onClick={() => setMobileNavOpen(false)} className="p-2 -mr-2">
              <i className="bi bi-x-lg text-xl"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Primary Links */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-4">Marketplace</p>
              <div className="space-y-4">
                <Link href="/buyer/browse" className="block text-lg font-bold hover:text-gold transition-colors" onClick={() => setMobileNavOpen(false)}>
                  All Products
                </Link>
                {listingTypes.map(lt => (
                  <Link
                    key={lt.id}
                    href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                    className="block text-lg font-bold hover:text-gold transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {lt.type_name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Account section for mobile (if not authenticated) */}
            {!isAuthenticated && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-4">Account</p>
                <div className="space-y-4">
                  <Link href="/login" className="block text-lg font-bold hover:text-gold transition-colors" onClick={() => setMobileNavOpen(false)}>Login</Link>
                  <Link href="/register" className="block text-lg font-bold hover:text-gold transition-colors" onClick={() => setMobileNavOpen(false)}>Register</Link>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-4">Navigation</p>
                <div className="space-y-4">
                  <Link href="/wishlist" className="block text-lg font-bold hover:text-gold transition-colors" onClick={() => setMobileNavOpen(false)}>My Wishlist</Link>
                  <button
                    className="block text-lg font-bold text-red-500 hover:text-red-600 transition-colors text-left w-full"
                    onClick={() => { logout(); setMobileNavOpen(false); router.push('/'); }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t">
            <p className="text-xs text-center text-gray-400 font-medium">© 2024 Flex Market</p>
          </div>
        </div>
      </div>

      {/* Spacing for fixed navbar */}
      <div className="h-[72px] md:h-[84px] lg:h-[96px]"></div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </>
  );
}
