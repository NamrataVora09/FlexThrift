'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getCartCount } from '@/lib/cart';
import { confirmToast } from '@/lib/toast-utils';

interface ListingType {
  id: number;
  type_name: string;
  image?: string;
  product_types?: ProductType[];
}

interface ProductType {
  id: number;
  name: string;
  listing_type_id: number;
  categories?: Category[];
}

interface Category {
  id: number;
  category_name: string;
  product_type_id: number;
}

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const API_PATH = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}${API_PATH}`;

export default function LandingNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    update();
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/taxonomy`)
      .then(r => r.json())
      .then(r => {
        if (r.success && r.data) {
          const { listing_types, product_types, categories } = r.data;
          const enriched = listing_types.map((lt: any) => ({
            ...lt,
            product_types: product_types
              .filter((pt: any) => pt.listing_type_id == lt.id)
              .map((pt: any) => ({
                ...pt,
                categories: categories.filter((c: any) => c.product_type_id == pt.id),
              })),
          }));
          setListingTypes(enriched);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/buyer/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --primary-yellow: #ffc63a;
          --primary-dark: #000;
        }
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1050;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .landing-nav-links {
          display: flex; align-items: center; gap: 4px; flex-shrink: 0;
        }
        .landing-nav-link {
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem;
          color: #333; text-decoration: none; padding: 8px 16px; border-radius: 10px;
          transition: all 0.2s ease; white-space: nowrap;
        }
        .landing-nav-link:hover { color: #000; background: #f4f4f4; }
        .landing-nav-catalog { position: relative; }
        .landing-nav-search { flex-shrink: 0; width: 260px; margin: 0 16px; }
        .landing-nav-actions {
          display: flex; align-items: center; gap: 20px; flex-shrink: 0;
        }
        .user-action-link { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: #000; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .user-action-link:hover { color: var(--primary-yellow); }

        .mobile-nav-toggle {
          display: none; width: 40px; height: 40px; border: none; background: #f4f4f4; border-radius: 10px;
          align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .mobile-nav-toggle:hover { background: var(--primary-yellow); }

        .mobile-nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1055; backdrop-filter: blur(2px); animation: lnFadeIn 0.2s ease; }
        .mobile-nav-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; width: 300px; max-width: 85vw;
          background: #fff; z-index: 1060; padding: 0; overflow-y: auto;
          transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -10px 0 40px rgba(0,0,0,0.15);
        }
        .mobile-nav-drawer.open { transform: translateX(0); }
        .mobile-nav-drawer-header {
          display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        .mobile-nav-drawer-close {
          width: 36px; height: 36px; border: none; background: #f4f4f4; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
        }
        .mobile-nav-drawer-close:hover { background: #fee2e2; color: #dc3545; }
        .mobile-nav-drawer-body { padding: 16px 20px; }
        .mobile-nav-drawer-body .mobile-nav-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
          color: #333; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: 0.2s;
          font-family: 'Inter', sans-serif; border: none; background: none; width: 100%; text-align: left; cursor: pointer;
        }
        .mobile-nav-drawer-body .mobile-nav-item:hover { background: #f8f9fa; color: #000; }
        .mobile-nav-drawer-body .mobile-nav-item.active { background: var(--primary-yellow); color: #000; }
        .mobile-nav-drawer-search { position: relative; margin-bottom: 16px; }
        .mobile-nav-drawer-search input {
          width: 100%; background: #f4f4f4; border: 1px solid transparent; border-radius: 12px;
          padding: 12px 16px 12px 42px; font-size: 0.9rem; outline: none; transition: 0.3s;
        }
        .mobile-nav-drawer-search input:focus { border-color: var(--primary-yellow); background: #fff; }
        .mobile-nav-drawer-search i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #999; }
        .mobile-nav-section-title {
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #999;
          padding: 16px 16px 6px; margin: 0;
        }
        .mobile-nav-divider { height: 1px; background: #f0f0f0; margin: 8px 0; }

        .mega-menu { position: absolute; left: 50%; transform: translateX(-50%); top: 100%; width: 90vw; max-width: 1200px; padding: 50px 40px; border: none; border-radius: 0 0 30px 30px; box-shadow: 0 30px 60px rgba(0,0,0,0.12); background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); border-top: 1px solid rgba(0,0,0,0.05); z-index: 1060; animation: lnMegaFadeIn 0.2s ease; }
        @keyframes lnMegaFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .mega-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; color: #000; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .mega-link { font-family: 'Inter', sans-serif; color: #666; text-decoration: none; font-size: 0.88rem; display: block; padding: 6px 0; transition: 0.2s ease; }
        .mega-link:hover { color: #000; transform: translateX(4px); }
        .mega-pt-label { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.85rem; color: #000; margin-bottom: 4px; display: block; text-decoration: none; }
        .mega-pt-label:hover { color: var(--primary-yellow); }

        .user-dropdown { position: relative; }
        .user-dropdown-menu { position: absolute; right: 0; left: auto; top: 100%; min-width: 250px; background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); padding: 8px; padding-top: 20px; z-index: 1060; animation: lnDdSlideDown 0.3s ease; }
        @keyframes lnDdSlideDown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .user-dropdown-menu .dd-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 12px; color: #333; text-decoration: none; font-size: 0.9rem; transition: 0.2s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .user-dropdown-menu .dd-item:hover { background: #f8f9fa; }
        .user-dropdown-menu .dd-item.text-danger { color: #dc3545 !important; }
        .user-dropdown-menu .dd-header { padding: 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; }

        @keyframes lnFadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 991px) {
          .mobile-nav-toggle { display: flex; }
          .landing-nav-links { display: none !important; }
          .landing-nav-search { display: none !important; }
          .mobile-nav-overlay { display: block; }
          .mega-menu { display: none !important; }
        }
        @media (max-width: 575px) {
          .user-action-link span { display: none; }
          .mobile-nav-drawer { width: 280px; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <nav className="landing-nav">
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 70 }}>
          {/* Logo */}
          <Link href="/" style={{ fontFamily: "'Maven Pro', sans-serif", fontWeight: 900, fontSize: '1.6rem', color: '#000', textDecoration: 'none', letterSpacing: '-0.5px', flexShrink: 0, marginRight: 32 }}>
            Flex<span style={{ color: '#ffc63a' }}>.</span>Market
          </Link>

          {/* Center Nav — desktop only */}
          <div className="landing-nav-links">
            {/* Catalog with mega menu */}
            <div
              className="landing-nav-catalog"
              onMouseEnter={() => { const el = document.getElementById('megaMenu'); if (el) el.style.display = 'block'; }}
              onMouseLeave={() => { const el = document.getElementById('megaMenu'); if (el) el.style.display = 'none'; }}
            >
              <a href="#" onClick={e => e.preventDefault()} className="landing-nav-link">
                Catalog <i className="bi bi-chevron-down" style={{ fontSize: '0.6rem', marginLeft: 4 }}></i>
              </a>
              <div id="megaMenu" className="mega-menu" style={{ display: 'none', position: 'fixed', left: 0, right: 0, top: 70, transform: 'none', width: '100vw', maxWidth: '100vw' }}>
                <div className="container">
                  <div className="row g-4 justify-content-center">
                    {listingTypes.map((lt) => (
                      <div key={lt.id} className="col-lg-2">
                        <span className="mega-title"><i className="bi bi-stars text-warning"></i> {lt.type_name}</span>
                        {lt.product_types?.map((pt) => (
                          <div key={pt.id} className="mb-3">
                            <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="mega-pt-label">{pt.name}</Link>
                            {pt.categories?.map((cat) => (
                              <Link key={cat.id} href={`/buyer/browse?category=${cat.id}`} className="mega-link">{cat.category_name}</Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="col-lg-3">
                      <div className="p-4 rounded-4 text-white text-center position-relative overflow-hidden h-100 d-flex flex-column justify-content-center" style={{ background: '#000' }}>
                        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" style={{ background: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
                        <h5 className="fw-bold mb-2 position-relative">Elite Services</h5>
                        <p className="small text-white-50 position-relative mb-4">Personalized luxury consultations.</p>
                        <Link href="/buyer/browse" className="btn btn-warning fw-bold btn-sm rounded-pill position-relative mx-auto" style={{ width: 'fit-content' }}>Learn More</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Listing type links */}
            {listingTypes.slice(0, 4).map((lt) => (
              <Link key={lt.id} className="landing-nav-link" href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>
                {lt.type_name}
              </Link>
            ))}
          </div>

          {/* Search — desktop only */}
          <div className="landing-nav-search">
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '0.95rem' }}></i>
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: '#f4f4f4', border: '1px solid transparent', borderRadius: 12, padding: '10px 16px 10px 40px', fontSize: '0.88rem', outline: 'none', transition: '0.3s' }}
              />
            </form>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right Actions */}
          <div className="landing-nav-actions">
            {/* Wishlist Icon */}
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
                <a
                  href="#"
                  className="d-flex align-items-center gap-2 text-decoration-none"
                  onClick={(e) => { e.preventDefault(); setShowUserDropdown(!showUserDropdown); }}
                >
                  <div
                    className="rounded-circle overflow-hidden shadow-sm"
                    style={{ width: 38, height: 38, border: '2px solid var(--primary-yellow)' }}
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=000&color=fff&bold=true`}
                      alt=""
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <div className="d-none d-xxl-block">
                    <span className="d-block text-dark fw-bold small" style={{ lineHeight: 1 }}>
                      {user.name?.split(' ')[0]}
                    </span>
                    <small className="text-muted" style={{ fontSize: 10 }}>
                      {user.role === 'seller' ? 'SELLER' : user.role === 'super_admin' ? 'SUPER ADMIN' : user.role === 'admin' ? 'ADMIN' : 'BUYER'}
                    </small>
                  </div>
                </a>

                {showUserDropdown && (
                  <div className="user-dropdown-menu">
                    <div className="dd-header">
                      <h6 className="mb-1 fw-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {user.name}
                      </h6>
                      <small className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                        {user.email}
                      </small>
                    </div>
                    <Link
                      href={
                        user.role === 'super_admin' ? '/superadmin'
                        : user.role === 'admin' ? '/admin'
                        : user.role === 'seller' ? '/seller'
                        : '/buyer'
                      }
                      className="dd-item"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <i className="bi bi-lightning-charge text-warning"></i> My Portal
                    </Link>
                    {!['admin', 'super_admin'].includes(user.role) && (
                      <>
                        <Link
                          href={user.role === 'seller' ? '/seller/offers' : '/buyer/my-offers'}
                          className="dd-item"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <i className="bi bi-handbag"></i> My Offers
                        </Link>
                        {user.role === 'seller' && (
                          <Link href="/buyer" className="dd-item" onClick={() => setShowUserDropdown(false)}>
                            <i className="bi bi-bag"></i> Buyer Portal
                          </Link>
                        )}
                        {user.role === 'buyer' && user.user_type === 'both' && (
                          <Link href="/seller" className="dd-item" onClick={() => setShowUserDropdown(false)}>
                            <i className="bi bi-shop"></i> Seller Hub
                          </Link>
                        )}
                      </>
                    )}
                    <hr style={{ margin: '4px 16px', borderColor: '#f0f0f0' }} />
                    <button
                      className="dd-item text-danger"
                      onClick={() => {
                        confirmToast('Are you sure you want to log out?', () => {
                          logout();
                          window.location.href = '/login';
                        }, 'Logout');
                      }}
                    >
                      <i className="bi bi-power"></i> Sign Out
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

            {/* Mobile Nav Toggle */}
            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <i className="bi bi-list" style={{ fontSize: '1.3rem' }}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Mobile Nav Drawer */}
      <div className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`}>
        <div className="mobile-nav-drawer-header">
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#000', textDecoration: 'none' }}
          >
            Flex Market<span style={{ color: 'var(--primary-yellow)' }}>.</span>
          </Link>
          <button className="mobile-nav-drawer-close" onClick={() => setMobileNavOpen(false)}>
            <i className="bi bi-x-lg" style={{ fontSize: '0.9rem' }}></i>
          </button>
        </div>
        <div className="mobile-nav-drawer-body">
          {/* Search */}
          <div className="mobile-nav-drawer-search">
            <i className="bi bi-search"></i>
            <form onSubmit={(e) => { e.preventDefault(); setMobileNavOpen(false); router.push(`/buyer/browse?search=${searchQuery}`); }}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          <p className="mobile-nav-section-title">Browse</p>
          <Link href="/buyer/browse" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
            <i className="bi bi-grid-3x3-gap" style={{ color: 'var(--primary-yellow)' }}></i>
            Catalog
          </Link>
          {listingTypes.slice(0, 4).map((lt) => (
            <Link
              key={lt.id}
              href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
              className="mobile-nav-item"
              onClick={() => setMobileNavOpen(false)}
            >
              <i className="bi bi-tag" style={{ color: '#6c757d' }}></i>
              {lt.type_name}
            </Link>
          ))}

          <div className="mobile-nav-divider" />
          <p className="mobile-nav-section-title">Account</p>

          {user ? (
            <>
              <Link
                href={
                  user.role === 'super_admin' ? '/superadmin'
                  : user.role === 'admin' ? '/admin'
                  : user.role === 'seller' ? '/seller'
                  : '/buyer'
                }
                className="mobile-nav-item"
                onClick={() => setMobileNavOpen(false)}
              >
                <i className="bi bi-speedometer2" style={{ color: 'var(--primary-yellow)' }}></i>
                My Portal
              </Link>
              {!['admin', 'super_admin'].includes(user.role) && (
                <Link
                  href={user.role === 'seller' ? '/seller/offers' : '/buyer/my-offers'}
                  className="mobile-nav-item"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <i className="bi bi-handbag" style={{ color: '#6c757d' }}></i>
                  My Offers
                </Link>
              )}
              <Link href="/cart" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                <i className="bi bi-heart" style={{ color: '#6c757d' }}></i>
                Wishlist {cartCount > 0 && <span className="badge rounded-pill" style={{ background: 'var(--primary-yellow)', color: '#000', fontSize: '0.7rem' }}>{cartCount}</span>}
              </Link>
              {user.role === 'seller' && (
                <Link href="/buyer" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                  <i className="bi bi-bag" style={{ color: '#6c757d' }}></i>
                  Buyer Portal
                </Link>
              )}
              {user.role === 'buyer' && user.user_type === 'both' && (
                <Link href="/seller" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                  <i className="bi bi-shop" style={{ color: '#6c757d' }}></i>
                  Seller Hub
                </Link>
              )}
              <div className="mobile-nav-divider" />
              <button
                className="mobile-nav-item"
                style={{ color: '#dc3545' }}
                onClick={() => {
                  setMobileNavOpen(false);
                  confirmToast('Are you sure you want to log out?', () => {
                    logout();
                    window.location.href = '/login';
                  }, 'Logout');
                }}
              >
                <i className="bi bi-power" style={{ color: '#dc3545' }}></i>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                <i className="bi bi-person-circle" style={{ color: 'var(--primary-yellow)' }}></i>
                Sign In
              </Link>
              <Link href="/register" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                <i className="bi bi-person-plus" style={{ color: '#6c757d' }}></i>
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
