'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface Category    { id: number; category_name: string; product_type_id: number; }
interface ProductType { id: number; name: string; listing_type_id: number; categories?: Category[]; }
interface ListingType { id: number; type_name: string; product_types?: ProductType[]; }

const CATEGORY_CARDS = [
  { name: 'Clothes',     img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200', reverse: false },
  { name: 'Accessories', img: 'https://images.unsplash.com/photo-1596460107916-430662021049?q=80&w=1200', reverse: true  },
  { name: 'Footwear',    img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200', reverse: false },
  { name: 'Electronics', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200', reverse: true  },
];

export default function HomePageClient() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [listingTypes,   setListingTypes]   = useState<ListingType[]>([]);
  const [showMegaMenu,   setShowMegaMenu]   = useState(false);
  const [sidebarMode,    setSidebarMode]    = useState<'sell' | 'rent'>('sell');
  const [sidebarName,    setSidebarName]    = useState('');
  const [sidebarEmail,   setSidebarEmail]   = useState('');
  const [mobileNavOpen,  setMobileNavOpen]  = useState(false);

  /* ── Taxonomy ─────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/taxonomy`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const { listing_types, product_types, categories } = res.data;
          const enriched = (listing_types as ListingType[]).map(lt => ({
            ...lt,
            product_types: (product_types as ProductType[])
              .filter(pt => pt.listing_type_id === lt.id)
              .map(pt => ({
                ...pt,
                categories: (categories as Category[]).filter(c => c.product_type_id === pt.id),
              })),
          }));
          setListingTypes(enriched);
        }
      })
      .catch(() => {});
  }, []);

  /* ── Close mega menu on outside click ───────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.hp-mega-wrap')) setShowMegaMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff' }}>
        <div className="spinner-grow text-warning" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #ffffff !important;
          color: #000;
          overflow-x: hidden;
        }
        a { text-decoration: none !important; }

        /* ── Wide container (matching PHP) ── */
        @media (min-width: 1400px) {
          .container, .container-lg, .container-md, .container-sm, .container-xl, .container-xxl {
            max-width: 1457px !important;
          }
        }
        @media (min-width: 1200px) {
          .container, .container-lg, .container-md, .container-sm, .container-xl {
            max-width: 1366px !important;
          }
        }

        /* ════════ NAVBAR ════════ */
        .hp-navbar {
          background: #fff;
          padding: 1.2rem 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 1050;
        }
        .hp-brand {
          font-family: "Maven Pro", sans-serif;
          font-weight: 700;
          font-size: 40px;
          color: #000 !important;
          line-height: 1.3;
        }
        .hp-nav-link {
          font-weight: 600;
          color: #000 !important;
          font-size: 16px;
          font-family: "Maven Pro", sans-serif;
          padding: 4px 15px;
          transition: color 0.3s;
          display: block;
          white-space: nowrap;
        }
        .hp-nav-link:hover { color: #D7B467 !important; }

        /* Mega menu */
        .hp-mega-wrap { position: static; }
        .hp-mega-menu {
          position: fixed;
          left: 0; right: 0;
          top: 80px;
          width: 100vw;
          border: none;
          border-radius: 0 0 15px 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          padding: 40px 100px;
          background-color: #fff;
          z-index: 1060;
          animation: hmFadeIn 0.25s ease;
        }
        @keyframes hmFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hp-mega-title {
          font-weight: 700;
          font-size: 1.1rem;
          color: #000;
          font-family: "Maven Pro", sans-serif;
          border-bottom: 2px solid #ffc63a;
          padding-bottom: 8px;
          margin-bottom: 20px;
          display: inline-block;
        }
        .hp-mega-pt {
          font-weight: 700;
          color: #000 !important;
          font-size: 0.95rem;
          font-family: "Maven Pro", sans-serif;
          display: block;
          margin-bottom: 4px;
        }
        .hp-mega-pt:hover { color: #ffc63a !important; }
        .hp-mega-cat {
          color: #666;
          font-size: 0.9rem;
          font-family: "Maven Pro", sans-serif;
          display: block;
          padding: 2px 0;
          transition: color 0.3s;
        }
        .hp-mega-cat:hover { color: #ffc63a !important; }

        /* Search / login icons */
        .hp-search-icon { font-size: 1.3rem; color: #000; }
        .hp-login-link {
          font-weight: 700;
          color: #000 !important;
          font-size: 16px;
          font-family: Arial, sans-serif;
          white-space: nowrap;
          transition: color 0.3s;
        }
        .hp-login-link:hover { color: #ffbe6e !important; }

        /* ════════ CATEGORY CARDS ════════ */
        .hp-cat-card {
          height: 380px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          display: flex;
          margin-bottom: 40px;
        }
        .hp-cat-bg {
          background-color: #e7efe5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 30.666667%;
        }
        .hp-cat-title {
          font-family: "Maven Pro", sans-serif;
          font-weight: 500;
          font-size: 20px;
          color: #000;
        }
        .hp-cat-photo {
          background-size: cover;
          background-position: center;
          flex: 1;
        }

        /* ════════ SIDEBAR ════════ */
        .hp-sidebar-wrap {
          position: sticky;
          top: 100px;
          align-self: flex-start;
          height: fit-content;
          margin-left: -4px;
        }
        .hp-sidebar-box {
          background-color: #fff;
          border-radius: 14px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .hp-fw-semi { font-weight: 500 !important; font-size: 18px !important; }
        .hp-sub-text { color: #302e2e; font-size: 15px; font-weight: 400; }
        .hp-sec-label { font-weight: 500 !important; margin-bottom: 10px; color: #000; font-size: 15px; }
        .hp-btn-sell {
          background-color: #ffc63a; color: #fff;
          padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px;
          font-size: 14px; cursor: pointer; transition: all 0.3s; font-weight: 600;
        }
        .hp-btn-sell.inactive { background-color: #fff; color: #000; }
        .hp-btn-rent {
          background-color: #fff; color: #000;
          padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px;
          font-size: 13px; cursor: pointer; transition: all 0.3s;
        }
        .hp-btn-rent.active { background-color: #ffc63a; color: #fff; }
        .hp-btn-sell:hover, .hp-btn-rent:hover { background-color: #000; color: #fff; }
        .hp-input {
          width: 100%; border-radius: 8px; padding: 10px 12px;
          border: 1px solid #ddd; font-size: 13px; height: 40px;
          outline: none; transition: border-color 0.2s; display: block;
        }
        .hp-input:focus { border-color: #ffc63a; }
        .hp-btn-start {
          background-color: #ffc63a; color: #fff; border: none;
          border-radius: 10px; padding: 15px; font-weight: 500;
          width: 100%; font-size: 14px; cursor: pointer;
          transition: all 0.3s; line-height: 1;
        }
        .hp-btn-start:hover { background-color: #000; color: #fff; transform: translateY(-2px); }
        .hp-login-note { color: #302e2e; font-size: 15px; font-weight: 400; text-align: center; margin-top: 16px; }
        .hp-login-lnk { color: #ffc107 !important; text-decoration: underline !important; }

        /* ════════ HOW TO SELL ════════ */
        .hp-section-title {
          text-align: center;
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 60px;
          letter-spacing: 1px;
        }
        .hp-step-icon { font-size: 3rem; color: #2c3e50; margin-bottom: 20px; display: block; }
        .hp-step-title { font-weight: 600; font-size: 1.3rem; color: #2c3e50; margin-bottom: 15px; }
        .hp-step-desc { font-size: 1rem; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto; }

        /* Timeline (replaces number.png) */
        .hp-timeline {
          position: relative;
          max-width: 70%;
          margin: 10px auto 0;
          height: 40px;
        }
        .hp-timeline-line {
          position: absolute;
          top: 50%; left: 0; width: 100%;
          height: 1px; background: #999;
        }
        .hp-dot-1 { position: absolute; top: 50%; transform: translate(-50%, -50%); left: 0%; }
        .hp-dot-2 { position: absolute; top: 50%; transform: translate(-50%, -50%); left: 50%; }
        .hp-dot-3 { position: absolute; top: 50%; transform: translate(-50%, -50%); left: 100%; }
        .hp-dot {
          width: 36px; height: 36px; background: #d6b06b; color: #fff;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-weight: 600; position: relative; z-index: 2;
        }

        /* ════════ FOOTER ════════ */
        .hp-footer {
          background-color: #3D3B3B;
          color: #b2bec3;
          padding: 66px 0 4px;
          width: 100%;
          margin-top: 60px;
        }
        .hp-footer-brand { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 25px; }
        .hp-footer-desc  { font-size: 1rem; line-height: 1.8; max-width: 380px; color: #b2bec3; }
        .hp-footer-hdg   { font-weight: 600; font-size: 1.2rem; color: #fff; margin-bottom: 30px; }
        .hp-footer-links { list-style: none; padding: 0; margin: 0; }
        .hp-footer-links li { margin-bottom: 4px; }
        .hp-footer-links a { color: #fff !important; font-size: 1rem; transition: color 0.3s; font-family: Arial, sans-serif; }
        .hp-footer-links a:hover { color: #ffc63a !important; }
        .hp-social { margin-top: -33px; margin-left: -11px; }
        .hp-social a { color: #fff !important; font-size: 1.1rem; margin-right: 25px; transition: color 0.3s; }
        .hp-social a:hover { color: #ffc63a !important; }
        .hp-copyright {
          text-align: center; padding: 10px 0; margin-top: 12px;
          border-top: 1px solid #444; font-size: 0.95rem;
          color: #636e72; background-color: #1e2124;
        }

        /* ════════ RESPONSIVE ════════ */
        @media (max-width: 991px) {
          .hp-brand { font-size: 28px; }
          .hp-sidebar-wrap { position: static; }
          .hp-cat-card { height: 220px; margin-bottom: 20px; }
          .hp-mega-menu { padding: 20px 20px; }
          .hp-section-title { font-size: 24px; margin-bottom: 30px; }
        }
        @media (max-width: 575px) {
          .hp-cat-card { height: 160px; }
          .hp-cat-title { font-size: 15px; }
        }
      `}</style>

      {/* ══════════════════ NAVBAR ══════════════════ */}
      <nav className="hp-navbar">
        <div className="container d-flex align-items-center justify-content-between">

          {/* Brand */}
          <Link href="/" className="hp-brand">Flex Market</Link>

          {/* Mobile toggle */}
          <button
            className="d-lg-none border-0 bg-transparent ms-auto me-2"
            style={{ cursor: 'pointer' }}
            onClick={() => setMobileNavOpen(v => !v)}
          >
            <i className="bi bi-list" style={{ fontSize: '1.6rem' }}></i>
          </button>

          {/* Desktop nav */}
          <div className="d-none d-lg-flex align-items-center flex-grow-1 ps-3 gap-0">
            <ul className="list-unstyled d-flex align-items-center m-0 p-0 flex-grow-1">

              {/* All Products mega dropdown */}
              <li className="hp-mega-wrap">
                <a
                  href="#"
                  className="hp-nav-link d-flex align-items-center gap-1"
                  onClick={e => { e.preventDefault(); setShowMegaMenu(v => !v); }}
                  onMouseEnter={() => setShowMegaMenu(true)}
                >
                  All Products
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.65rem' }}></i>
                </a>
                {showMegaMenu && (
                  <div className="hp-mega-menu" onMouseLeave={() => setShowMegaMenu(false)}>
                    <div className="container-fluid">
                      <div className="row">
                        {listingTypes.slice(0, 3).map(lt => (
                          <div key={lt.id} className="col-lg-4">
                            <span className="hp-mega-title">{lt.type_name}</span>
                            <ul className="list-unstyled p-0">
                              {lt.product_types?.map(pt => (
                                <li key={pt.id} className="mb-3">
                                  <Link
                                    href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}&product_type=${pt.id}`}
                                    className="hp-mega-pt"
                                    onClick={() => setShowMegaMenu(false)}
                                  >
                                    {pt.name}
                                  </Link>
                                  <ul className="list-unstyled ps-2 mt-1">
                                    {pt.categories?.slice(0, 4).map(cat => (
                                      <li key={cat.id}>
                                        <Link
                                          href={`/buyer/browse?category=${cat.id}`}
                                          className="hp-mega-cat"
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
                  </div>
                )}
              </li>

              {/* Listing type links (up to 6) */}
              {listingTypes.slice(0, 6).map(lt => (
                <li key={lt.id}>
                  <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="hp-nav-link">
                    {lt.type_name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Right actions */}
            <div className="d-flex align-items-center gap-3 flex-shrink-0">
              <Link href="/buyer/browse" className="text-dark">
                <i className="bi bi-search hp-search-icon"></i>
              </Link>
              {isAuthenticated && user ? (
                <Link href={
                  user.role === 'super_admin' ? '/superadmin' :
                  user.role === 'admin'       ? '/admin'       : '/buyer/dashboard'
                } className="hp-login-link">
                  <i className="bi bi-person-fill me-1"></i>
                  MY PORTAL
                </Link>
              ) : (
                <Link href="/login" className="hp-login-link">
                  <i className="bi bi-person-fill me-1"></i>
                  LOGIN / REGISTER
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="container mt-2 pb-3 border-top d-lg-none" style={{ borderColor: '#eee' }}>
            <Link href="/buyer/browse" className="hp-nav-link d-block py-2" onClick={() => setMobileNavOpen(false)}>All Products</Link>
            {listingTypes.slice(0, 6).map(lt => (
              <Link key={lt.id} href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="hp-nav-link d-block py-2" onClick={() => setMobileNavOpen(false)}>
                {lt.type_name}
              </Link>
            ))}
            <hr className="my-2" />
            {isAuthenticated && user ? (
              <Link href={user.role === 'super_admin' ? '/superadmin' : user.role === 'admin' ? '/admin' : '/buyer/dashboard'} className="hp-nav-link d-block py-2" onClick={() => setMobileNavOpen(false)}>My Portal</Link>
            ) : (
              <Link href="/login" className="hp-nav-link d-block py-2" onClick={() => setMobileNavOpen(false)}>Login / Register</Link>
            )}
          </div>
        )}
      </nav>

      {/* ══════════════════ MAIN CONTENT ══════════════════ */}
      <div className="container my-5">
        <div className="row g-5">

          {/* ── Left: Category Cards ── */}
          <div className="col-lg-8">
            {CATEGORY_CARDS.map(cat => (
              <Link
                key={cat.name}
                href={`/buyer/browse?search=${cat.name.toLowerCase()}`}
                className="hp-cat-card"
                style={{ flexDirection: cat.reverse ? 'row-reverse' : 'row' }}
              >
                <div className="hp-cat-bg">
                  <h2 className="hp-cat-title">{cat.name}</h2>
                </div>
                <div className="hp-cat-photo" style={{ backgroundImage: `url('${cat.img}')` }} />
              </Link>
            ))}
          </div>

          {/* ── Right: Sticky Sidebar ── */}
          <div className="col-lg-4">
            <div className="hp-sidebar-wrap">
              <div className="hp-sidebar-box">
                <h5 className="hp-fw-semi mb-2">Start listing your product, it&apos;s free</h5>
                <p className="hp-sub-text mb-4">You&apos;re looking to ...</p>

                <div className="d-flex gap-3 mb-4">
                  <button
                    className={`hp-btn-sell${sidebarMode === 'sell' ? '' : ' inactive'}`}
                    onClick={() => setSidebarMode('sell')}
                  >
                    Sell
                  </button>
                  <button
                    className={`hp-btn-rent${sidebarMode === 'rent' ? ' active' : ''}`}
                    onClick={() => setSidebarMode('rent')}
                  >
                    Rent
                  </button>
                </div>

                <h6 className="hp-sec-label">Your contact details</h6>
                <input
                  type="text"
                  className="hp-input mb-3"
                  placeholder="Your Name"
                  value={sidebarName}
                  onChange={e => setSidebarName(e.target.value)}
                />
                <input
                  type="email"
                  className="hp-input mb-4"
                  placeholder="Enter Your Email"
                  value={sidebarEmail}
                  onChange={e => setSidebarEmail(e.target.value)}
                />

                <button className="hp-btn-start" onClick={() => router.push('/register')}>
                  Start now
                </button>

                <p className="hp-login-note">
                  Are you a registered user?{' '}
                  <Link href="/login" className="hp-login-lnk">Login</Link>
                </p>
              </div>
            </div>
          </div>

          {/* ── HOW TO SELL ── */}
          <div className="col-12">
            <h1 className="hp-section-title">HOW TO SELL</h1>

            <div className="row text-center justify-content-center">
              <div className="col-lg-4 col-md-4 mb-5">
                <i className="bi bi-clipboard2-data hp-step-icon"></i>
                <h5 className="hp-step-title">Add Product Details</h5>
                <p className="hp-step-desc">
                  Start by entering basic information like product name, and specifications to help buyers
                  understand your product better
                </p>
              </div>
              <div className="col-lg-4 col-md-4 mb-5">
                <i className="bi bi-cloud-arrow-up-fill hp-step-icon"></i>
                <h5 className="hp-step-title">Upload Photos &amp; Videos</h5>
                <p className="hp-step-desc">
                  Upload clear images and videos of your product from your mobile or desktop to attract more
                  genuine buyers.
                </p>
              </div>
              <div className="col-lg-4 col-md-4 mb-5">
                <i className="bi bi-tag-fill hp-step-icon"></i>
                <h5 className="hp-step-title">Set Price &amp; Publish</h5>
                <p className="hp-step-desc">
                  Add your selling price, stock details, and publish your product to start receiving enquiries
                  instantly.
                </p>
              </div>
            </div>

            {/* Timeline – replaces number.png */}
            <div className="hp-timeline">
              <div className="hp-timeline-line"></div>
              <div className="hp-dot-1"><div className="hp-dot">1</div></div>
              <div className="hp-dot-2"><div className="hp-dot">2</div></div>
              <div className="hp-dot-3"><div className="hp-dot">3</div></div>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="hp-footer">
        <div className="container">
          <div className="row gx-5">
            <div className="col-lg-4 col-md-6 mb-4 mb-lg-0">
              <h2 className="hp-footer-brand">Flex Market</h2>
              <p className="hp-footer-desc">
                Premium curated marketplace for the elite. Discover high-end fashion, electronics, and
                lifestyle essentials reserved for those who value quality.
              </p>
            </div>
            <div className="col-lg-2 col-md-6 mb-4 mb-lg-0">
              <h5 className="hp-footer-hdg">Quick Links</h5>
              <ul className="hp-footer-links">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/">About</Link></li>
                <li><Link href="/seller/upload-product">Sell</Link></li>
                <li><Link href="/buyer/browse?listing_type=rent">Rent</Link></li>
                <li><Link href="/buyer/browse">Explore</Link></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <h5 className="hp-footer-hdg">Categories</h5>
              <ul className="hp-footer-links">
                <li><Link href="/buyer/browse">All Products</Link></li>
                {listingTypes.slice(0, 5).map(lt => (
                  <li key={lt.id}>
                    <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>{lt.type_name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-lg-3 col-md-6">
              <h5 className="hp-footer-hdg">Our Policies</h5>
              <ul className="hp-footer-links mb-5">
                <li><a href="#">Return policies</a></li>
                <li><a href="#">Cancellation policies</a></li>
                <li><a href="#">Terms of use</a></li>
              </ul>
              <div className="hp-social d-flex">
                <a href="#"><i className="bi bi-facebook"></i></a>
                <a href="#"><i className="bi bi-twitter"></i></a>
                <a href="#"><i className="bi bi-instagram"></i></a>
                <a href="#"><i className="bi bi-linkedin"></i></a>
              </div>
            </div>
          </div>
        </div>
        <div className="hp-copyright">
          &copy; {new Date().getFullYear()} Flex Market. All rights reserved.
        </div>
      </footer>
    </>
  );
}
