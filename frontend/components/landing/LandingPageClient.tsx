'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const API_PATH = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}${API_PATH}`;

/* ─── Types ───────────────────────────────────────────────────────────── */
interface Category    { id: number; category_name: string; product_type_id: number; }
interface ProductType { id: number; name: string; listing_type_id: number; categories?: Category[]; }
interface ListingType { id: number; type_name: string; image?: string; product_types?: ProductType[]; }
interface Product     {
  id: number; title: string; price: number; rental_cost?: number;
  listing_type: string; primary_image?: string;
}

/* ─── Hero slides ─────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070',
    badge: 'NEW ARRIVALS',
    title: ['Luxury', 'Curated.'],
    desc: 'Discover high-end fashion and lifestyle essentials reserved for the elite.',
    btnText: 'Explore Marketplace',
    btnHref: '/buyer',
  },
  {
    img: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=2070',
    badge: 'RENT LUXURY',
    title: ['Elite', 'Rentals.'],
    desc: "Why buy when you can rent high-end fashion and home essentials for a fraction of the cost?",
    btnText: 'View Rental Plans',
    btnHref: '/buyer/browse?listing_type=rent',
  },
];


/* ═══════════════════════════════════════════════════════════════════════ */
export default function LandingPageClient() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [listingTypes,     setListingTypes]     = useState<ListingType[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [currentSlide,     setCurrentSlide]     = useState(0);
  const [showMegaMenu,     setShowMegaMenu]      = useState(false);
  const [showUserDropdown, setShowUserDropdown]  = useState(false);
  const [navOpen,          setNavOpen]           = useState(false);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [loaded,           setLoaded]            = useState(false);
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Access control ───────────────────────────────────────────────── */
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      if (user.role === 'admin' && user.blocked_buyer === 1) {
        router.replace('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

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

  /* ── Featured products ────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE}/products?status=approved&per_page=8&sort=latest`)
      .then(r => r.json())
      .then(res => {
        const list = res.data?.products || res.data || res.products || [];
        if (Array.isArray(list)) setFeaturedProducts(list.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  /* ── Carousel auto-play ───────────────────────────────────────────── */
  const nextSlide = useCallback(() => setCurrentSlide(s => (s + 1) % HERO_SLIDES.length), []);

  useEffect(() => {
    slideTimer.current = setInterval(nextSlide, 5000);
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [nextSlide]);

  const goToSlide = (i: number) => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    setCurrentSlide(i);
    slideTimer.current = setInterval(nextSlide, 5000);
  };
  const prevSlideClick = () => { if (slideTimer.current) clearInterval(slideTimer.current); setCurrentSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); slideTimer.current = setInterval(nextSlide, 5000); };
  const nextSlideClick = () => { if (slideTimer.current) clearInterval(slideTimer.current); setCurrentSlide(s => (s + 1) % HERO_SLIDES.length); slideTimer.current = setInterval(nextSlide, 5000); };

  /* ── Close dropdowns on outside click ────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.lp-user-dd'))   setShowUserDropdown(false);
      if (!t.closest('.lp-mega-wrap')) setShowMegaMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Preloader ────────────────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const isAdminOrSA = user?.role === 'super_admin' || user?.role === 'admin';
  const roleBadgeLabel = user?.role === 'super_admin' ? 'SA' : user?.role === 'admin' ? 'Admin' : null;
  const roleBadgeBg    = user?.role === 'super_admin' ? '#1e293b' : user?.role === 'admin' ? '#6366f1' : '#000';
  const portalHref     = user?.role === 'super_admin' ? '/superadmin' : user?.role === 'admin' ? '/admin' : '/buyer/dashboard';
  const avatarUrl      = user ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=000&color=fff&bold=true` : '';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/buyer/browse?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
        <div className="spinner-grow text-warning" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        :root { --py: #ffc63a; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #fff !important; color: #000; overflow-x: hidden;
          padding-top: 100px;
        }
        @media (max-width: 991px) { body { padding-top: 80px; } }
        a { text-decoration: none !important; }
        .fw-800 { font-weight: 800 !important; }
        .fw-900 { font-weight: 900 !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--py); }

        /* ── Preloader ────────────────────────── */
        #lp-preloader {
          position: fixed; inset: 0; background: #fff; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          transition: opacity 0.6s ease-out;
        }
        #lp-preloader.lp-hidden { opacity: 0; pointer-events: none; }

        /* ════════ NAVBAR ════════ */
        .lp-navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1050;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          padding: 0.7rem 0;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-brand {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem; font-weight: 800; color: #000 !important;
          letter-spacing: -1.5px; position: relative; white-space: nowrap;
        }
        .lp-brand::after {
          content: '.'; color: var(--py); font-size: 2.5rem;
          line-height: 0; position: absolute; bottom: 8px;
        }
        .lp-toggler { background: none; border: none; cursor: pointer; padding: 4px; }

        /* Nav links */
        .lp-nav-list { list-style: none; padding: 0; margin: 0 auto; display: flex; align-items: center; }
        .lp-nav-link {
          font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95rem;
          color: #000 !important; padding: 0.5rem 1.4rem; display: block;
          white-space: nowrap; transition: color 0.3s; letter-spacing: -0.2px;
          position: relative;
        }
        .lp-nav-link:hover { color: var(--py) !important; }
        .lp-nav-link.active::after {
          content: ''; position: absolute; bottom: 0; left: 1.2rem; right: 1.2rem;
          height: 2px; background: var(--py); border-radius: 2px;
        }

        /* Mega menu */
        .lp-mega-wrap { position: static; }
        .lp-mega-menu {
          position: fixed; left: 0; right: 0; top: 72px;
          padding: 50px 0; border: none;
          border-radius: 0 0 30px 30px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(0,0,0,0.05);
          z-index: 1060;
          animation: megaFadeIn 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes megaFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-mega-col-title {
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem;
          color: #000; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
        }
        .lp-mega-link {
          font-family: 'Inter', sans-serif; color: #666; font-size: 0.88rem;
          display: block; padding: 6px 0; transition: 0.2s ease;
        }
        .lp-mega-link:hover { color: #000 !important; transform: translateX(4px); }
        .lp-mega-pt {
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.88rem;
          color: #000 !important; display: block; margin-bottom: 4px;
        }
        .lp-mega-pt:hover { color: var(--py) !important; }

        /* Search */
        .lp-search-wrap { position: relative; width: 380px; margin: 0 30px; }
        @media (max-width: 1200px) { .lp-search-wrap { width: 250px; } }
        .lp-search-input {
          background: #f4f4f4; border: 1px solid transparent;
          border-radius: 14px; padding: 10px 15px 10px 45px;
          font-size: 0.9rem; font-family: 'Inter', sans-serif;
          width: 100%; transition: all 0.3s ease; outline: none;
        }
        .lp-search-input:focus {
          background: #fff; border-color: var(--py);
          box-shadow: 0 8px 20px rgba(255,198,58,0.15);
        }
        .lp-search-icon {
          position: absolute; left: 15px; top: 50%;
          transform: translateY(-50%); color: #888; font-size: 1.1rem; pointer-events: none;
        }

        /* User dropdown */
        .lp-user-dd { position: relative; }
        .lp-ud-toggle {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 8px; padding: 0;
        }
        .lp-avatar-ring {
          width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
          border: 2px solid var(--py); box-shadow: 0 2px 8px rgba(0,0,0,0.15); flex-shrink: 0;
        }
        .lp-avatar-ring img { width: 100%; height: 100%; object-fit: cover; }
        .lp-ud-menu {
          position: absolute; right: 0; top: calc(100% + 12px);
          min-width: 250px; background: #fff; border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.14); padding: 8px; z-index: 1070;
          animation: ddFade 0.2s ease;
        }
        @keyframes ddFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-ud-header { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 6px; }
        .lp-ud-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 10px; color: #333 !important;
          font-size: 0.9rem; transition: background 0.15s; cursor: pointer;
          border: none; background: none; width: 100%; text-align: left; font-family: inherit;
        }
        .lp-ud-item:hover { background: #f8f9fa; }
        .lp-ud-item.danger { color: #dc3545 !important; }
        .lp-signin-link {
          font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.85rem;
          text-transform: uppercase; letter-spacing: 0.5px; color: #000 !important;
          display: flex; align-items: center; gap: 8px; transition: 0.3s;
        }
        .lp-signin-link:hover { color: var(--py) !important; }

        /* Mobile drawer */
        .lp-mobile-drawer { border-top: 1px solid #eee; padding: 12px 0; background: rgba(255,255,255,0.98); }
        .lp-m-link {
          display: block; padding: 10px 20px;
          font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95rem;
          color: #000 !important; transition: color 0.2s;
        }
        .lp-m-link:hover { color: var(--py) !important; }

        /* ════════ HERO ════════ */
        .hero-carousel { margin-bottom: 80px; position: relative; overflow: hidden; }
        .hero-slide {
          height: 650px; border-radius: 40px; overflow: hidden;
          position: relative; background: #000;
          display: flex; align-items: center;
          margin-top: 15px; box-shadow: 0 40px 100px rgba(0,0,0,0.15);
        }
        .hero-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; z-index: 1;
          transition: transform 1.2s cubic-bezier(0.4,0,0.2,1);
        }
        .hero-slide:hover .hero-img { transform: scale(1.08); }
        .hero-overlay {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 80%);
        }
        .hero-content { padding: 0 80px; z-index: 10; max-width: 800px; position: relative; }
        .hero-badge {
          display: inline-block; padding: 10px 20px;
          background: var(--py); color: #000;
          font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 0.75rem;
          border-radius: 12px; margin-bottom: 30px;
          letter-spacing: 2px; text-transform: uppercase;
          box-shadow: 0 8px 20px rgba(255,198,58,0.4);
        }
        .hero-title {
          font-family: 'Outfit', sans-serif; font-size: 5rem; line-height: 0.95;
          margin-bottom: 30px; color: #fff; font-weight: 900; letter-spacing: -2px;
        }
        .hero-accent {
          background: linear-gradient(135deg, var(--py) 0%, #ff8c00 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .hero-desc {
          font-family: 'Inter', sans-serif; font-size: 1.2rem;
          color: rgba(255,255,255,0.7); line-height: 1.5;
          margin-bottom: 45px; font-weight: 500; max-width: 500px;
        }
        .hero-indicators {
          position: absolute; bottom: 40px; left: 80px;
          display: flex; gap: 8px; z-index: 15;
        }
        .hero-ind {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.3); border: none; cursor: pointer; transition: 0.4s; padding: 0;
        }
        .hero-ind.on { background: var(--py); width: 80px; }
        .hero-ctrl {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 60px; height: 60px; border-radius: 50%;
          background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1); color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 15; opacity: 0; transition: all 0.3s; font-size: 1.5rem;
        }
        .hero-ctrl-l { left: 40px; }
        .hero-ctrl-r { right: 40px; }
        .hero-carousel:hover .hero-ctrl { opacity: 1; }
        .hero-ctrl:hover {
          background: var(--py); border-color: var(--py); color: #000;
          transform: translateY(-50%) scale(1.1);
        }

        /* ════════ CATEGORY GRID ════════ */
        .premium-title {
          font-size: 2.5rem; margin-bottom: 40px;
          position: relative; display: inline-block;
          font-family: 'Outfit', sans-serif;
        }
        .premium-title::after {
          content: ''; position: absolute; bottom: -5px; left: 0;
          width: 60px; height: 4px; background: var(--py); border-radius: 2px;
        }
        .cat-card {
          height: 400px; border-radius: 20px; overflow: hidden;
          position: relative; cursor: pointer; display: block; transition: 0.4s ease;
        }
        .cat-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .cat-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cat-info {
          position: absolute; inset: 0; padding: 30px;
          display: flex; flex-direction: column; justify-content: flex-end;
          background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%);
          color: #fff;
        }

        /* ════════ ELITE DROPS ════════ */
        .product-card-elite {
          background: #fff; border-radius: 20px; padding: 15px;
          transition: 0.3s; border: 1px solid #f1f1f1; height: 100%; cursor: pointer;
        }
        .product-card-elite:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.05); border-color: var(--py); }
        .product-img-elite { height: 250px; border-radius: 15px; overflow: hidden; margin-bottom: 15px; background: #f8f9fa; }
        .product-img-elite img { width: 100%; height: 100%; object-fit: cover; }

        /* ════════ LISTING CTA ════════ */
        .listing-cta {
          background: #fff; border-radius: 30px; padding: 50px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
          border: 1px solid #f8f9fa; margin-top: 100px;
        }
        .btn-circle {
          width: 120px; height: 120px; border-radius: 50%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-weight: 800; transition: 0.3s; border: 2px solid #000;
          background: #fff; color: #000; font-family: 'Outfit', sans-serif; font-size: 0.9rem;
        }
        .btn-circle:hover {
          background: var(--py); border-color: var(--py); color: #000;
          transform: scale(1.1) rotate(5deg);
        }

        /* ════════ FOOTER ════════ */
        .lp-footer {
          background-color: #3D3B3B; color: #b2bec3;
          padding: 66px 0 4px; width: 100%; margin-top: 80px;
        }
        .lp-footer-brand { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 25px; }
        .lp-footer-desc  { font-size: 1rem; line-height: 1.8; max-width: 380px; color: #b2bec3; }
        .lp-footer-hdg   { font-weight: 600; font-size: 1.2rem; color: #fff; margin-bottom: 30px; }
        .lp-footer-links { list-style: none; padding: 0; margin: 0; }
        .lp-footer-links li { margin-bottom: 4px; }
        .lp-footer-links a { color: #fff !important; font-size: 1rem; transition: color 0.3s; font-family: Arial, sans-serif; }
        .lp-footer-links a:hover { color: var(--py) !important; }
        .lp-social { margin-top: -33px; margin-left: -11px; }
        .lp-social a { color: #fff !important; font-size: 1.1rem; margin-right: 25px; transition: color 0.3s; }
        .lp-social a:hover { color: var(--py) !important; }
        .lp-copyright {
          text-align: center; padding: 10px 0; margin-top: 12px;
          border-top: 1px solid #444; font-size: 0.95rem;
          color: #636e72; background-color: #1e2124;
        }

        /* ════════ RESPONSIVE ════════ */
        @media (max-width: 991px) {
          .hero-slide { height: 420px; border-radius: 24px; }
          .hero-title  { font-size: 3rem; }
          .hero-content { padding: 0 40px; }
          .hero-indicators { left: 40px; }
          .cat-card { height: 280px; }
          .listing-cta { padding: 30px; }
        }
        @media (max-width: 575px) {
          .hero-slide { height: 300px; border-radius: 16px; margin-top: 10px; }
          .hero-title  { font-size: 2rem; }
          .hero-content { padding: 0 24px; }
          .hero-badge  { font-size: 0.65rem; padding: 7px 14px; margin-bottom: 16px; }
          .hero-desc   { font-size: 0.95rem; margin-bottom: 24px; }
          .hero-indicators { left: 24px; bottom: 20px; }
          .cat-card { height: 200px; }
          .premium-title { font-size: 1.8rem; }
          .listing-cta { padding: 24px; margin-top: 50px; }
          .btn-circle { width: 90px; height: 90px; font-size: 0.78rem; }
        }
      `}</style>

      {/* ── Preloader ── */}
      <div id="lp-preloader" className={loaded ? 'lp-hidden' : ''}>
        <div className="spinner-grow text-warning" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>

      {/* ══════════════════════════════ NAVBAR ══════════════════════════════ */}
      <nav className="lp-navbar">
        <div className="container-fluid px-lg-5 d-flex align-items-center flex-wrap">

          {/* Brand */}
          <Link href="/buyer" className="lp-brand me-4">Flex Market</Link>

          {/* Mobile toggle */}
          <button className="lp-toggler d-lg-none ms-auto" onClick={() => setNavOpen(v => !v)} aria-label="Open menu">
            <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '1.5rem' }}></i>
          </button>

          {/* Desktop nav */}
          <div className="d-none d-lg-flex align-items-center flex-grow-1">
            <ul className="lp-nav-list">
              {/* Catalog mega dropdown */}
              <li className="lp-mega-wrap">
                <a
                  href="#"
                  className="lp-nav-link d-flex align-items-center gap-1"
                  onClick={e => { e.preventDefault(); setShowMegaMenu(v => !v); }}
                  onMouseEnter={() => setShowMegaMenu(true)}
                >
                  Catalog <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.7rem' }}></i>
                </a>
                {showMegaMenu && (
                  <div className="lp-mega-menu" onMouseLeave={() => setShowMegaMenu(false)}>
                    <div className="container">
                      <div className="row g-4 justify-content-center">
                        {listingTypes.map(lt => (
                          <div key={lt.id} className="col-lg-2">
                            <span className="lp-mega-col-title">
                              <i className="bi bi-stars text-warning"></i>
                              {lt.type_name}
                            </span>
                            {lt.product_types?.map(pt => (
                              <div key={pt.id} className="mb-3">
                                <Link
                                  href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}&product_type=${pt.id}`}
                                  className="lp-mega-pt"
                                  onClick={() => setShowMegaMenu(false)}
                                >{pt.name}</Link>
                                {pt.categories?.map(cat => (
                                  <Link key={cat.id} href={`/buyer/browse?category=${cat.id}`} className="lp-mega-link" onClick={() => setShowMegaMenu(false)}>
                                    {cat.category_name}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                        {/* Elite Services promo */}
                        <div className="col-lg-3">
                          <div className="p-4 rounded-4 bg-dark text-white text-center position-relative overflow-hidden h-100 d-flex flex-column justify-content-center" style={{ minHeight: 180 }}>
                            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25"
                              style={{ background: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
                            <h5 className="fw-bold mb-2 position-relative">Elite Services</h5>
                            <p className="small text-white-50 position-relative mb-4">Experience personalized luxury consultations. Only with Flex Market.</p>
                            <Link href="/buyer" className="btn btn-warning fw-bold btn-sm rounded-pill position-relative mx-auto" style={{ width: 'fit-content' }} onClick={() => setShowMegaMenu(false)}>
                              Learn More
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>

              {/* Listing type quick links (up to 4) */}
              {listingTypes.slice(0, 4).map(lt => (
                <li key={lt.id}>
                  <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="lp-nav-link">
                    {lt.type_name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Search */}
            <form className="lp-search-wrap d-none d-xl-block" onSubmit={handleSearch}>
              <i className="bi bi-search lp-search-icon"></i>
              <input
                type="text"
                className="lp-search-input"
                placeholder="Search curated collections..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Right actions */}
            <div className="d-flex align-items-center gap-4 ms-lg-auto flex-shrink-0">
              {isAuthenticated && user ? (
                <div className="lp-user-dd">
                  <button className="lp-ud-toggle" onClick={() => setShowUserDropdown(v => !v)}>
                    <div className="lp-avatar-ring">
                      <img src={avatarUrl} alt={user.name} />
                    </div>
                    <div className="d-none d-xxl-block text-start ms-1">
                      <span className="d-block text-dark fw-bold small" style={{ lineHeight: 1 }}>
                        {user.name?.split(' ')[0]}
                      </span>
                      <small className="text-muted" style={{ fontSize: 10 }}>
                        {isAdminOrSA ? (user.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN') : 'PRO BUYER'}
                      </small>
                    </div>
                  </button>

                  {showUserDropdown && (
                    <div className="lp-ud-menu">
                      <div className="lp-ud-header">
                        <h6 className="mb-1 fw-800" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {roleBadgeLabel && (
                            <span style={{ background: roleBadgeBg, color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800, marginRight: 6 }}>
                              {roleBadgeLabel === 'SA' ? 'Super Admin' : 'Admin'}
                            </span>
                          )}
                          {user.name}
                        </h6>
                        <small className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>{user.email}</small>
                      </div>

                      <Link href={portalHref} className="lp-ud-item" onClick={() => setShowUserDropdown(false)}>
                        <i className="bi bi-lightning-charge text-warning"></i>
                        <span>My Portal</span>
                      </Link>

                      {!isAdminOrSA && (
                        <Link href="/buyer/my-offers" className="lp-ud-item" onClick={() => setShowUserDropdown(false)}>
                          <i className="bi bi-handbag"></i>
                          <span>My Offers</span>
                        </Link>
                      )}

                      {!isAdminOrSA && user.user_type === 'both' && (
                        <Link href="/seller" className="lp-ud-item" onClick={() => setShowUserDropdown(false)}>
                          <i className="bi bi-shop"></i>
                          <span>Seller Hub</span>
                        </Link>
                      )}

                      <hr style={{ margin: '6px 16px', borderColor: '#f0f0f0' }} />

                      <button
                        className="lp-ud-item danger"
                        onClick={() => { setShowUserDropdown(false); logout(); window.location.href = '/login'; }}
                      >
                        <i className="bi bi-power"></i>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="lp-signin-link">
                  <i className="bi bi-person-circle" style={{ fontSize: '1.2rem' }}></i>
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="lp-mobile-drawer d-lg-none">
            <div className="px-3">
              <form className="mb-3 position-relative" onSubmit={handleSearch}>
                <i className="bi bi-search position-absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}></i>
                <input type="text" className="lp-search-input" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
              </form>
              <Link href="/buyer/browse" className="lp-m-link" onClick={() => setNavOpen(false)}>All Products</Link>
              {listingTypes.slice(0, 5).map(lt => (
                <Link key={lt.id} href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="lp-m-link" onClick={() => setNavOpen(false)}>
                  {lt.type_name}
                </Link>
              ))}
              <hr className="my-2" />
              {isAuthenticated && user ? (
                <>
                  <Link href={portalHref} className="lp-m-link" onClick={() => setNavOpen(false)}>My Portal</Link>
                  {!isAdminOrSA && <Link href="/buyer/my-offers" className="lp-m-link" onClick={() => setNavOpen(false)}>My Offers</Link>}
                  <button className="lp-m-link border-0 bg-transparent w-100 text-start" style={{ color: '#dc3545', cursor: 'pointer' }} onClick={() => { setNavOpen(false); logout(); window.location.href = '/login'; }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="lp-m-link" onClick={() => setNavOpen(false)}>Sign In</Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════ MAIN ══════════════════════════════ */}
      <div className="container">

        {/* ── Hero Carousel ── */}
        <div className="hero-carousel">
          <div className="hero-slide">
            <img key={currentSlide} src={HERO_SLIDES[currentSlide].img} className="hero-img" alt="" />
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <span className="hero-badge">{HERO_SLIDES[currentSlide].badge}</span>
              <h1 className="hero-title">
                {HERO_SLIDES[currentSlide].title[0]}<br />
                <span className="hero-accent">{HERO_SLIDES[currentSlide].title[1]}</span>
              </h1>
              <p className="hero-desc">{HERO_SLIDES[currentSlide].desc}</p>
              <Link href={HERO_SLIDES[currentSlide].btnHref} className="btn btn-warning btn-lg rounded-pill px-5 fw-bold py-3">
                {HERO_SLIDES[currentSlide].btnText}
              </Link>
            </div>
          </div>
          {/* Indicators */}
          <div className="hero-indicators">
            {HERO_SLIDES.map((_, i) => (
              <button key={i} className={`hero-ind${currentSlide === i ? ' on' : ''}`} onClick={() => goToSlide(i)} />
            ))}
          </div>
          {/* Controls */}
          <button className="hero-ctrl hero-ctrl-l" onClick={prevSlideClick}>
            <i className="bi bi-chevron-left fs-4"></i>
          </button>
          <button className="hero-ctrl hero-ctrl-r" onClick={nextSlideClick}>
            <i className="bi bi-chevron-right fs-4"></i>
          </button>
        </div>

        {/* ── Browse by Essence (Category Grid) ── */}
        <div className="row g-4 mb-5 pb-5">
          <div className="col-12">
            <h2 className="premium-title fw-900">Browse by Essence.</h2>
          </div>
          {listingTypes.map(lt => (
            <div key={lt.id} className="col-6 col-lg-3">
              <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`} className="cat-card">
                {lt.image ? (
                  <img
                    src={lt.image.startsWith('http') ? lt.image : `${BACKEND_URL}/${lt.image}`}
                    alt={lt.type_name}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a1a, #333)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-tags" style={{ fontSize: '4rem', color: 'rgba(255,198,58,0.3)' }}></i>
                  </div>
                )}
                <div className="cat-info">
                  <h4 className="fw-800 mb-0">{lt.type_name}</h4>
                  <small className="opacity-75">View Collections <i className="bi bi-arrow-right"></i></small>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* ── Elite Drops (Featured Products) ── */}
        {featuredProducts.length > 0 && (
          <div className="row g-4 mb-5">
            <div className="col-12 d-flex justify-content-between align-items-end">
              <h2 className="premium-title fw-900 mb-0">Elite Drops.</h2>
              <Link href="/buyer/browse" className="text-dark fw-bold">View All <i className="bi bi-arrow-right"></i></Link>
            </div>
            {featuredProducts.map(p => (
              <div key={p.id} className="col-md-6 col-lg-3">
                <div className="product-card-elite" onClick={() => router.push(`/buyer/product/${p.id}`)}>
                  <div className="product-img-elite">
                    <img
                      src={
                        p.primary_image
                          ? (p.primary_image.startsWith('http') ? p.primary_image : `${BACKEND_URL}/${p.primary_image}`)
                          : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop'
                      }
                      alt={p.title}
                    />
                  </div>
                  <div className="ps-2">
                    <span className="badge bg-light text-dark mb-2 text-uppercase fw-bold" style={{ fontSize: 10 }}>
                      {p.listing_type}
                    </span>
                    <h6 className="fw-800 mb-1 text-truncate">{p.title}</h6>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="fw-900 fs-5">
                        ₹{Number(p.listing_type === 'sell' ? p.price : (p.rental_cost ?? p.price)).toLocaleString('en-IN')}
                      </span>
                      <i className="bi bi-heart text-muted"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Start Listing CTA ── */}
        <div className="listing-cta">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h2 className="fw-900 mb-3 display-5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Start listing your <br /><span className="text-warning">product, it&apos;s free.</span>
              </h2>
              <p className="lead text-muted mb-0">Join our elite community of sellers and reach thousands of premium buyers.</p>
            </div>
            <div className="col-lg-4 d-flex justify-content-center justify-content-lg-end mt-4 mt-lg-0">
              <div className="d-flex gap-4">
                <Link href="/seller/upload-product" className="btn-circle">
                  <i className="bi bi-tag fs-2 mb-1"></i>
                  SELL
                </Link>
                <Link href="/seller/upload-product" className="btn-circle">
                  <i className="bi bi-clock-history fs-2 mb-1"></i>
                  RENT
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /container */}

      {/* ══════════════════════════════ FOOTER ══════════════════════════════ */}
      <footer className="lp-footer">
        <div className="container">
          <div className="row gx-5">
            <div className="col-lg-4 col-md-6 mb-4 mb-lg-0">
              <h2 className="lp-footer-brand">Flex Market</h2>
              <p className="lp-footer-desc">Premium curated marketplace for the elite. Discover high-end fashion, electronics, and lifestyle essentials reserved for those who value quality.</p>
            </div>
            <div className="col-lg-2 col-md-6 mb-4 mb-lg-0">
              <h5 className="lp-footer-hdg">Quick Links</h5>
              <ul className="lp-footer-links">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/buyer">About</Link></li>
                <li><Link href="/seller/upload-product">Sell</Link></li>
                <li><Link href="/buyer/browse?listing_type=rent">Rent</Link></li>
                <li><Link href="/buyer/browse">Explore</Link></li>
              </ul>
            </div>
            <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
              <h5 className="lp-footer-hdg">Categories</h5>
              <ul className="lp-footer-links">
                <li><Link href="/buyer/browse">All Products</Link></li>
                {listingTypes.slice(0, 5).map(lt => (
                  <li key={lt.id}><Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>{lt.type_name}</Link></li>
                ))}
              </ul>
            </div>
            <div className="col-lg-3 col-md-6">
              <h5 className="lp-footer-hdg">Our Policies</h5>
              <ul className="lp-footer-links mb-5">
                <li><a href="#">Return policies</a></li>
                <li><a href="#">Cancellation policies</a></li>
                <li><a href="#">Terms of use</a></li>
              </ul>
              <div className="lp-social d-flex">
                <a href="#"><i className="bi bi-facebook"></i></a>
                <a href="#"><i className="bi bi-twitter"></i></a>
                <a href="#"><i className="bi bi-instagram"></i></a>
                <a href="#"><i className="bi bi-linkedin"></i></a>
              </div>
            </div>
          </div>
        </div>
        <div className="lp-copyright">
          &copy; {new Date().getFullYear()} Flex Market. All rights reserved.
        </div>
      </footer>
    </>
  );
}
