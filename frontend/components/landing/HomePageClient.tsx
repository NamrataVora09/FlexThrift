'use client';

import { useEffect, useState, useCallback, createElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const STORAGE_KEY = 'flex_hp_v3';

/* ─── Types ───────────────────────────────────────────────── */
interface Category    { id: number; category_name: string; product_type_id: number; }
interface ProductType { id: number; name: string; listing_type_id: number; categories?: Category[]; }
interface ListingType { id: number; type_name: string; product_types?: ProductType[]; }
interface CatCard     { name: string; tag: string; img: string; }
interface Step        { icon: string; title: string; desc: string; }
interface Testimonial { quote: string; author: string; role: string; }
interface FaqItem     { q: string; a: string; }
interface Stat        { num: string; label: string; }

interface PageContent {
  heroEyebrow: string; heroH1: string; heroBody: string;
  heroCtaExplore: string; heroCtaList: string; heroBgImage: string;
  catTitle: string; catSubtitle: string; cats: CatCard[];
  transTitle: string; transSub: string;
  sellingSteps: Step[]; buyingSteps: Step[];
  testiTitle: string; testimonials: Testimonial[];
  rentalBadge: string; rentalTitle: string; rentalSub: string;
  rentalF1Title: string; rentalF1Desc: string;
  rentalF2Title: string; rentalF2Desc: string;
  rentalCta: string;
  faqTitle: string; faqItems: FaqItem[];
  footerDesc: string; stats: Stat[];
}

/* ─── Defaults ────────────────────────────────────────────── */
const DEFAULT: PageContent = {
  heroEyebrow: 'Elite Lifestyle Marketplace',
  heroH1: 'CURATED\nEXCELLENCE.',
  heroBody: 'Access a world of premium fashion, rare accessories, and elite electronics. Own, rent, or sell in our high-end ecosystem.',
  heroCtaExplore: 'EXPLORE COLLECTION',
  heroCtaList: 'START LISTING',
  heroBgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAX8ObUzHARD6Wv3Xi6moDskagxeO3-dBXOHEcUdfFDMzuBf3j9H7IsHgZ82WduVBBEHf6W_GVV1HKyhqSigia1LrbEHrl7RnLRVEW9bCJSSdQM3JYLZ8W6Z4Fy3RtaDqJ7EEI0cdJyQDUVeTWbxO1C89qpQ4QB-ckzd5mlrwhXL1c3LiTv0tZ2BkwTuXhRSjYCNxsbEvRTZiqIuMcR3knRvxeVvAPo2CuR3j7cPZCRRIJchw16rQf3upPyA-Tkg6kiZbTDYyO1KTEH',
  catTitle: 'THE WORLD OF FLEX',
  catSubtitle: 'Browse by curated universes. Every piece is vetted by our connoisseurs to ensure it meets the Flex standard of quality and prestige.',
  cats: [
    { name: 'Clothes',     tag: 'Couture & Daily',  img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1600' },
    { name: 'Accessories', tag: 'Style',             img: 'https://images.unsplash.com/photo-1596460107916-430662021049?q=80&w=1600' },
    { name: 'Footwear',    tag: 'Limited Edition',   img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1600' },
    { name: 'Electronics', tag: 'Premium Tech',      img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1600' },
  ],
  transTitle: 'THE ART OF THE TRANSACTION',
  transSub: 'Master the high-end exchange. Whether acquiring or liberating assets, our process is surgical.',
  sellingSteps: [
    { icon: 'edit_note',       title: '1. Add Details',    desc: 'Provide provenance and technical specifications of your elite asset.' },
    { icon: 'photo_camera',    title: '2. Upload Photos',  desc: 'High-resolution imagery capturing every meticulous detail and macro angle.' },
    { icon: 'payments',        title: '3. Set Price',      desc: "Leverage our valuation algorithms to find the market's optimal premium point." },
    { icon: 'local_shipping',  title: '4. Ship Securely',  desc: 'White-glove courier service ensures your asset arrives in pristine condition.' },
  ],
  buyingSteps: [
    { icon: 'search_insights', title: '1. Explore Curated', desc: 'Discover pieces that have survived our rigorous editorial selection process.' },
    { icon: 'shopping_cart',   title: '2. Buy or Rent',     desc: 'Choose permanent ownership or dynamic access via our flexible plans.' },
    { icon: 'verified',        title: '3. Authenticate',    desc: 'Every item is physically inspected by specialists before reaching your door.' },
    { icon: 'auto_awesome',    title: '4. Receive & Revel', desc: 'Unbox perfection. A new standard of excellence added to your collection.' },
  ],
  testiTitle: 'Voices of the Circle',
  testimonials: [
    { quote: '"The rental service changed how I approach my seasonal wardrobe. Efficiency meets absolute luxury."',       author: 'Julian V.',  role: 'Tech Founder'  },
    { quote: '"Authentication was my biggest fear. Flex Market\'s process is so transparent it removed all doubt."',     author: 'Elena K.',   role: 'Art Director'  },
    { quote: '"Finally, a marketplace that understands the value of rare electronics as much as couture."',               author: 'Marcus L.',  role: 'Audiophile'    },
  ],
  rentalBadge: 'Platinum Rental Services',
  rentalTitle: 'ELEVATED\nOWNERSHIP.',
  rentalSub: 'Experience luxury without commitment. Our rental plans provide exclusive access to rotating seasonal collections and top-tier technology.',
  rentalF1Title: 'Flexible Terms',    rentalF1Desc: 'Rent for a night or a quarter. Tailored to your lifestyle.',
  rentalF2Title: 'Concierge Care',    rentalF2Desc: 'Professional cleaning and maintenance included with every lease.',
  rentalCta: 'VIEW RENTAL PLANS',
  faqTitle: 'Frequently Asked',
  faqItems: [
    { q: 'How does the authentication process work?',       a: 'Every item is shipped to our central hub where master evaluators verify physical signatures, material composition, and provenance documents before release.' },
    { q: 'What are the rental durations for electronics?',  a: 'We offer short-term leases (3–7 days) for high-end events and long-term fractional ownership plans (up to 6 months) for creative professionals.' },
    { q: 'Is international shipping available?',            a: 'Yes, we partner with specialized high-value carriers for insured global delivery to over 45 countries, including customs management.' },
    { q: 'How do I list a vintage item?',                   a: "Select 'Start Listing' from the menu. You'll need high-res imagery and any available certificates of authenticity. Our team will review within 24 hours." },
  ],
  footerDesc: '© 2025 Flex Market. Curated Excellence.',
  stats: [
    { num: '10K+', label: 'Listings' },
    { num: '5K+',  label: 'Sellers'  },
    { num: '4.8★', label: 'Rating'   },
  ],
};

/* ─── DB mapping helpers ──────────────────────────────────── */
function toSettings(c: PageContent): Record<string, string> {
  const j = JSON.stringify;
  return {
    hero_slides:             j([{ eyebrow: c.heroEyebrow, h1: c.heroH1, body: c.heroBody, ctaExplore: c.heroCtaExplore, ctaList: c.heroCtaList, bgImage: c.heroBgImage }]),
    display_categories:      j(c.cats),
    section_title_categories:j({ title: c.catTitle, subtitle: c.catSubtitle }),
    how_it_works_steps:      j({ transTitle: c.transTitle, transSub: c.transSub, selling: c.sellingSteps, buying: c.buyingSteps }),
    testimonials:            j({ title: c.testiTitle, items: c.testimonials }),
    cta_title:               j({ badge: c.rentalBadge, title: c.rentalTitle, sub: c.rentalSub, cta: c.rentalCta }),
    trust_features:          j({ faqTitle: c.faqTitle, items: c.faqItems, features: [{ title: c.rentalF1Title, desc: c.rentalF1Desc }, { title: c.rentalF2Title, desc: c.rentalF2Desc }] }),
    footer_description:      c.footerDesc,
    stats_banner:            j(c.stats),
  };
}

function fromSettings(data: Record<string, string>): Partial<PageContent> {
  const p: Partial<PageContent> = {};
  try {
    if (data.hero_slides) {
      const s = JSON.parse(data.hero_slides);
      if (s[0]) { 
        if (s[0].eyebrow) p.heroEyebrow = s[0].eyebrow; 
        if (s[0].h1) p.heroH1 = s[0].h1; 
        if (s[0].body) p.heroBody = s[0].body; 
        if (s[0].ctaExplore) p.heroCtaExplore = s[0].ctaExplore; 
        if (s[0].ctaList) p.heroCtaList = s[0].ctaList; 
        if (s[0].bgImage) p.heroBgImage = s[0].bgImage; 
        
        if (!p.heroBgImage || p.heroBgImage === 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2400') {
          p.heroBgImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAX8ObUzHARD6Wv3Xi6moDskagxeO3-dBXOHEcUdfFDMzuBf3j9H7IsHgZ82WduVBBEHf6W_GVV1HKyhqSigia1LrbEHrl7RnLRVEW9bCJSSdQM3JYLZ8W6Z4Fy3RtaDqJ7EEI0cdJyQDUVeTWbxO1C89qpQ4QB-ckzd5mlrwhXL1c3LiTv0tZ2BkwTuXhRSjYCNxsbEvRTZiqIuMcR3knRvxeVvAPo2CuR3j7cPZCRRIJchw16rQf3upPyA-Tkg6kiZbTDYyO1KTEH';
        }
      }
    }
    if (data.display_categories) p.cats = JSON.parse(data.display_categories);
    if (data.section_title_categories) { const s = JSON.parse(data.section_title_categories); p.catTitle = s.title; p.catSubtitle = s.subtitle; }
    if (data.how_it_works_steps) { const s = JSON.parse(data.how_it_works_steps); p.transTitle = s.transTitle; p.transSub = s.transSub; p.sellingSteps = s.selling; p.buyingSteps = s.buying; }
    if (data.testimonials) { const s = JSON.parse(data.testimonials); p.testiTitle = s.title; p.testimonials = s.items; }
    if (data.cta_title) { const s = JSON.parse(data.cta_title); p.rentalBadge = s.badge; p.rentalTitle = s.title; p.rentalSub = s.sub; p.rentalCta = s.cta; }
    if (data.trust_features) { const s = JSON.parse(data.trust_features); p.faqTitle = s.faqTitle; p.faqItems = s.items; if (s.features) { p.rentalF1Title = s.features[0]?.title; p.rentalF1Desc = s.features[0]?.desc; p.rentalF2Title = s.features[1]?.title; p.rentalF2Desc = s.features[1]?.desc; } }
    if (data.footer_description) p.footerDesc = data.footer_description;
    if (data.stats_banner) p.stats = JSON.parse(data.stats_banner);
  } catch {}
  return p;
}

/* ─── Polymorphic contentEditable field ──────────────────── */
function CE({ value, onSave, tag = 'span', className, style, isEdit }: {
  value: string; onSave: (v: string) => void;
  tag?: string; className?: string; style?: React.CSSProperties; isEdit: boolean;
}) {
  const s: React.CSSProperties = isEdit
    ? { ...style, outline: '2px dashed rgba(253,192,3,0.8)', borderRadius: 3, cursor: 'text', minWidth: 10 }
    : (style ?? {});
  return createElement(tag as any, {
    className, style: s,
    contentEditable: isEdit || undefined, suppressContentEditableWarning: true,
    onBlur: isEdit ? (e: React.FocusEvent<HTMLElement>) => onSave(e.currentTarget.textContent ?? '') : undefined,
  }, value);
}

/* ─── FAQ item ────────────────────────────────────────────── */
function FaqRow({ item, idx, isEdit, onSave }: {
  item: FaqItem; idx: number; isEdit: boolean;
  onSave: (i: number, f: 'q' | 'a', v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hp3-faq-item">
      <button className="hp3-faq-summary" onClick={() => setOpen(o => !o)}>
        <CE value={item.q} tag="span" onSave={v => onSave(idx, 'q', v)} isEdit={isEdit} />
        <span className="material-symbols-outlined hp3-faq-arrow" style={{ transform: open ? 'rotate(180deg)' : undefined }}>expand_more</span>
      </button>
      {open && (
        <CE value={item.a} tag="p" className="hp3-faq-answer" onSave={v => onSave(idx, 'a', v)} isEdit={isEdit} />
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function HomePageClient() {
  const { user, token, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const isSA = user?.role === 'super_admin';

  const [listingTypes,  setListingTypes]  = useState<ListingType[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [content,       setContent]       = useState<PageContent>(DEFAULT);
  const [saveStatus,    setSaveStatus]    = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [imgModal,      setImgModal]      = useState<{ type: 'cat' | 'hero'; idx?: number; url: string } | null>(null);

  const isEdit = editMode && isSA;

  /* Load from API */
  useEffect(() => {
    fetch(`${API_BASE}/landing-content`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const merged = fromSettings(res.data as Record<string, string>);
          setContent(c => ({ ...c, ...merged }));
        }
      }).catch(() => {});
  }, []);

  /* Load listing types for nav */
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
      }).catch(() => {});
  }, []);

  /* Save to DB */
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const authToken = token || localStorage.getItem('flex_token');
      const res = await fetch(`${API_BASE}/superadmin/update-landing-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(toSettings(content)),
      });
      const data = await res.json();
      setSaveStatus(data.success ? 'saved' : 'error');
    } catch { setSaveStatus('error'); }
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, [content, token]);

  /* Field updaters */
  const sf    = useCallback((f: keyof PageContent, v: string) => setContent(c => ({ ...c, [f]: v })), []);
  const sCat  = useCallback((i: number, f: keyof CatCard, v: string) => setContent(c => { const cats = [...c.cats]; cats[i] = { ...cats[i], [f]: v }; return { ...c, cats }; }), []);
  const sStep = useCallback((arr: 'sellingSteps' | 'buyingSteps', i: number, f: keyof Step, v: string) =>
    setContent(c => { const steps = [...c[arr]]; steps[i] = { ...steps[i], [f]: v }; return { ...c, [arr]: steps }; }), []);
  const sTesti = useCallback((i: number, f: keyof Testimonial, v: string) =>
    setContent(c => { const t = [...c.testimonials]; t[i] = { ...t[i], [f]: v }; return { ...c, testimonials: t }; }), []);
  const sFaq  = useCallback((i: number, f: 'q' | 'a', v: string) =>
    setContent(c => { const faqItems = [...c.faqItems]; faqItems[i] = { ...faqItems[i], [f]: v }; return { ...c, faqItems }; }), []);
  const sStat = useCallback((i: number, f: keyof Stat, v: string) =>
    setContent(c => { const stats = [...c.stats]; stats[i] = { ...stats[i], [f]: v }; return { ...c, stats }; }), []);

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f6f6f6' }}>
      <div className="spinner-grow" style={{ width: '3rem', height: '3rem', color: '#fdc003' }} role="status">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );

  const navLinks = listingTypes.length > 0
    ? listingTypes.slice(0, 6).map(lt => ({ label: lt.type_name, href: `/buyer/browse?listing_type=${lt.type_name.toLowerCase()}` }))
    : [
        { label: 'Clothes',     href: '/buyer/browse?search=clothes'     },
        { label: 'Accessories', href: '/buyer/browse?search=accessories' },
        { label: 'Footwear',    href: '/buyer/browse?search=footwear'    },
        { label: 'Electronics', href: '/buyer/browse?search=electronics' },
        { label: 'Sell',        href: '/register'                        },
        { label: 'Rent',        href: '/buyer/browse?listing_type=rent'  },
      ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #f6f6f6 !important; color: #2d2f2f; overflow-x: hidden; -webkit-font-smoothing: antialiased; margin: 0; }
        a { text-decoration: none !important; }
        button { font-family: inherit; }

        /* ── Navbar ─────────────────────────────────── */
        .hp3-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1050;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: 0 40px 60px -15px rgba(0,0,0,0.06);
        }
        .hp3-nav {
          display: flex; justify-content: space-between; align-items: center;
          max-width: 1920px; margin: 0 auto;
          padding: 24px 48px;
          gap: 32px;
        }
        .hp3-brand {
          font-family: 'Manrope', sans-serif;
          font-size: 1.5rem; font-weight: 900;
          letter-spacing: -0.06em; color: #0c0f0f !important;
          white-space: nowrap; flex-shrink: 0;
        }
        .hp3-nav-links {
          display: flex; gap: 32px; list-style: none; margin: 0; padding: 0;
        }
        .hp3-nav-links a {
          font-family: 'Manrope', sans-serif; font-weight: 600;
          font-size: 0.875rem; letter-spacing: -0.02em;
          color: #5a5c5c !important; transition: color 0.3s;
        }
        .hp3-nav-links a:hover, .hp3-nav-links a.active { color: #fdc003 !important; }
        .hp3-nav-links a.active { border-bottom: 2px solid #fdc003; padding-bottom: 4px; }
        .hp3-search-wrap {
          display: flex; align-items: center; gap: 10px;
          background: #f0f1f1; padding: 8px 16px;
          border-radius: 9999px;
        }
        .hp3-search-wrap input {
          background: transparent; border: none; outline: none;
          font-family: 'Inter', sans-serif; font-size: 0.875rem;
          color: #2d2f2f; width: 192px;
        }
        .hp3-search-wrap input::placeholder { color: #acadad; }
        .hp3-nav-icons { display: flex; align-items: center; gap: 16px; }
        .hp3-icon-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #0c0f0f; display: flex; align-items: center;
          transition: transform 0.2s;
          font-size: 1.5rem;
        }
        .hp3-icon-btn:hover { transform: scale(1.05); }
        .hp3-get-started {
          background: #0c0f0f; color: #f6f6f6 !important;
          padding: 10px 24px; border-radius: 9999px;
          font-family: 'Manrope', sans-serif; font-weight: 600;
          font-size: 0.875rem; letter-spacing: -0.01em;
          transition: transform 0.2s; white-space: nowrap;
          display: inline-block;
        }
        .hp3-get-started:hover { transform: scale(1.02); }

        /* Mobile nav */
        .hp3-mobile-menu {
          background: #fff; border-top: 1px solid #e7e8e8;
          padding: 20px 48px 28px;
        }
        .hp3-mobile-link {
          display: block; font-family: 'Manrope', sans-serif;
          font-weight: 600; font-size: 1rem; color: #2d2f2f !important;
          padding: 10px 0; border-bottom: 1px solid #f0f1f1;
        }
        .hp3-mobile-link:hover { color: #fdc003 !important; }

        /* ── Hero ────────────────────────────────────── */
        .hp3-hero {
          position: relative; min-height: 921px;
          display: flex; align-items: center;
          padding: 96px 48px 0; overflow: hidden;
        }
        .hp3-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background-attachment: fixed;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }
        .hp3-hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(to right, rgba(246,246,246,0.6) 0%, transparent 60%);
        }
        .hp3-hero-content {
          position: relative; z-index: 2; max-width: 896px;
        }
        .hp3-hero-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.3em;
          color: #755700; margin-bottom: 24px; display: block;
        }
        .hp3-hero-h1 {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(3.75rem, 9vw, 6rem);
          font-weight: 900; letter-spacing: -0.05em;
          color: #2d2f2f; line-height: 0.9;
          margin-bottom: 32px; white-space: pre-line;
        }
        .hp3-hero-body {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.125rem, 2vw, 1.25rem); color: #5a5c5c;
          max-width: 512px; margin-bottom: 40px; line-height: 1.625;
        }
        .hp3-hero-ctas { display: flex; gap: 16px; flex-wrap: wrap; }
        .hp3-cta-primary {
          padding: 20px 40px; border-radius: 9999px;
          background: #fdc003; color: #3d2b00 !important;
          font-family: 'Manrope', sans-serif; font-weight: 800;
          font-size: 0.875rem; letter-spacing: 0.025em;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s; display: inline-flex; align-items: center; gap: 12px;
        }
        .hp3-cta-primary:hover { transform: scale(1.05); }
        .hp3-cta-glass {
          padding: 20px 40px; border-radius: 9999px;
          background: rgba(255,255,255,0.2); color: #2d2f2f !important;
          font-family: 'Manrope', sans-serif; font-weight: 800;
          font-size: 0.875rem; letter-spacing: 0.025em;
          border: 1px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(12px);
          transition: background 0.2s;
        }
        .hp3-cta-glass:hover { background: rgba(255,255,255,0.4); }
        .hp3-scroll-indicator {
          position: absolute; bottom: 48px; right: 48px;
          display: flex; align-items: center; gap: 16px;
          transform: rotate(90deg); transform-origin: right center;
          z-index: 2;
        }
        .hp3-scroll-indicator span {
          font-family: 'Inter', sans-serif;
          font-size: 0.625rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: #5a5c5c;
        }
        .hp3-scroll-line { width: 64px; height: 1px; background: #acadad; }

        /* ── Categories Section ───────────────────────── */
        .hp3-cat-section {
          padding: 128px 48px; max-width: 1920px; margin: 0 auto;
        }
        .hp3-cat-header {
          display: flex; flex-direction: row; justify-content: space-between;
          align-items: flex-end; margin-bottom: 80px; gap: 32px;
          flex-wrap: wrap;
        }
        .hp3-cat-header-left { max-width: 672px; }
        .hp3-cat-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(2rem, 5vw, 3.75rem);
          font-weight: 900; letter-spacing: -0.05em;
          color: #0c0f0f; margin-bottom: 24px; line-height: 1;
        }
        .hp3-cat-sub {
          color: #5a5c5c; font-size: 0.9rem; line-height: 1.6;
        }
        .hp3-cat-view-all {
          font-family: 'Manrope', sans-serif; font-weight: 700;
          font-size: 0.875rem; letter-spacing: 0.1em; text-transform: uppercase;
          color: #755700 !important; display: flex; align-items: center; gap: 8px;
          transition: gap 0.2s; white-space: nowrap;
          flex-shrink: 0;
        }
        .hp3-cat-view-all:hover { gap: 16px; }

        /* Bento Grid */
        .hp3-bento {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 24px; height: 800px;
        }
        .hp3-bento-item {
          position: relative; overflow: hidden;
          border-radius: 16px; cursor: pointer;
        }
        .hp3-bento-item img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 1000ms ease; display: block;
        }
        .hp3-bento-item:hover img { transform: scale(1.1); }
        .hp3-bento-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
          opacity: 0.6; transition: opacity 0.3s;
        }
        .hp3-bento-item:hover .hp3-bento-overlay { opacity: 0.9; }
        .hp3-bento-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 40px; }
        .hp3-bento-tag { font-size: 0.625rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 8px; display: block; }
        .hp3-bento-name { font-family: 'Manrope', sans-serif; font-weight: 900; letter-spacing: -0.04em; color: #fff; }
        .hp3-bento-clothes     { grid-column: 1/3; grid-row: 1/3; }
        .hp3-bento-accessories { grid-column: 3/5; grid-row: 1/2; }
        .hp3-bento-footwear    { grid-column: 3/4; grid-row: 2/3; }
        .hp3-bento-electronics { grid-column: 4/5; grid-row: 2/3; }
        .hp3-bento-clothes .hp3-bento-name    { font-size: 2.5rem; }
        .hp3-bento-accessories .hp3-bento-name { font-size: 1.875rem; }
        .hp3-bento-footwear .hp3-bento-name    { font-size: 1.5rem; }
        .hp3-bento-electronics .hp3-bento-name { font-size: 1.5rem; }

        /* ── Transaction Section ──────────────────────── */
        .hp3-trans-section {
          padding: 128px 48px;
          background: #f0f1f1;
          overflow: hidden;
        }
        .hp3-trans-inner { max-width: 1920px; margin: 0 auto; }
        .hp3-trans-header { text-align: center; margin-bottom: 96px; }
        .hp3-trans-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(2rem, 5vw, 3.75rem);
          font-weight: 900; letter-spacing: -0.05em;
          color: #0c0f0f; margin-bottom: 16px; line-height: 1;
        }
        .hp3-trans-sub { color: #5a5c5c; font-size: 0.9rem; max-width: 512px; margin: 0 auto; line-height: 1.6; }
        .hp3-trans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 96px; }
        .hp3-trans-col-title {
          font-family: 'Manrope', sans-serif; font-size: 1.5rem; font-weight: 900;
          margin-bottom: 48px; display: flex; align-items: center; gap: 16px; color: #0c0f0f;
        }
        .hp3-trans-col-title::before { content: ''; display: block; width: 40px; height: 1px; background: #755700; flex-shrink: 0; }
        .hp3-step-list { display: flex; flex-direction: column; gap: 48px; }
        .hp3-step-item { display: flex; gap: 32px; align-items: flex-start; }
        .hp3-step-icon-wrap {
          flex-shrink: 0; width: 64px; height: 64px; border-radius: 9999px;
          background: #fff; display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(172,173,173,0.2);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: background 0.3s, color 0.3s; color: #2d2f2f;
          font-size: 1.5rem;
        }
        .hp3-step-item:hover .hp3-step-icon-wrap { background: #755700; color: #fff1db; }
        .hp3-step-title { font-weight: 700; font-size: 1.125rem; margin-bottom: 8px; color: #0c0f0f; }
        .hp3-step-desc  { color: #5a5c5c; font-size: 0.875rem; line-height: 1.7; }

        /* ── Testimonials ─────────────────────────────── */
        .hp3-testi-section {
          padding: 128px 48px; background: #fff;
        }
        .hp3-testi-inner { max-width: 1440px; margin: 0 auto; }
        .hp3-testi-title {
          font-family: 'Manrope', sans-serif; font-size: 1.875rem; font-weight: 900;
          letter-spacing: -0.04em; text-transform: uppercase; text-align: center;
          margin-bottom: 80px; color: #0c0f0f;
        }
        .hp3-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 64px; }
        .hp3-testi-card { display: flex; flex-direction: column; gap: 24px; }
        .hp3-testi-stars { display: flex; color: #755700; }
        .hp3-testi-stars .material-symbols-outlined { font-size: 1rem; }
        .hp3-testi-quote { font-size: 1.25rem; font-weight: 500; font-style: italic; color: #0c0f0f; line-height: 1.6; }
        .hp3-testi-author-row { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
        .hp3-testi-avatar { width: 40px; height: 40px; border-radius: 9999px; background: #e7e8e8; flex-shrink: 0; }
        .hp3-testi-name  { font-weight: 700; font-size: 0.875rem; color: #0c0f0f; }
        .hp3-testi-role  { font-size: 0.625rem; color: #5a5c5c; text-transform: uppercase; letter-spacing: 0.15em; }

        /* ── Rental / Elite Services Dark Banner ──────── */
        .hp3-rental-section {
          padding: 96px 48px; background: #0c0f0f; overflow: hidden; position: relative;
        }
        .hp3-rental-bg-art {
          position: absolute; right: 0; top: 0; width: 50%; height: 100%;
          opacity: 0.2; pointer-events: none;
          background-attachment: fixed;
          background-position: center; background-repeat: no-repeat; background-size: cover;
        }
        .hp3-rental-inner { max-width: 1920px; margin: 0 auto; position: relative; z-index: 1; }
        .hp3-rental-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .hp3-rental-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 9999px;
          background: rgba(253,192,3,0.1); border: 1px solid rgba(253,192,3,0.2);
          margin-bottom: 32px;
        }
        .hp3-rental-badge-dot { width: 8px; height: 8px; border-radius: 9999px; background: #fdc003; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .hp3-rental-badge-text { color: #fdc003; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
        .hp3-rental-h2 {
          font-family: 'Manrope', sans-serif; font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900; letter-spacing: -0.05em; color: #fff;
          margin-bottom: 32px; white-space: pre-line; line-height: 0.95;
        }
        .hp3-rental-sub { color: #9c9d9d; font-size: 1.125rem; margin-bottom: 40px; max-width: 512px; line-height: 1.7; }
        .hp3-rental-features { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 48px; }
        .hp3-rental-feature { border-left: 1px solid rgba(253,192,3,0.3); padding-left: 24px; }
        .hp3-rental-feat-title { color: #fff; font-weight: 700; margin-bottom: 8px; }
        .hp3-rental-feat-desc  { color: #9c9d9d; font-size: 0.875rem; line-height: 1.6; }
        .hp3-rental-cta {
          background: #fdc003; color: #3d2b00 !important;
          padding: 20px 48px; border-radius: 9999px;
          font-family: 'Manrope', sans-serif; font-weight: 900;
          font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase;
          box-shadow: 0 20px 40px -10px rgba(253,192,3,0.3);
          transition: transform 0.2s; display: inline-block;
        }
        .hp3-rental-cta:hover { transform: scale(1.05); }
        .hp3-rental-images {
          position: relative; display: none;
        }
        @media (min-width: 1024px) { .hp3-rental-images { display: block; } }
        .hp3-rental-img-main {
          aspect-ratio: 4/5; background: #1a1d1d; border-radius: 16px; overflow: hidden;
          transform: rotate(2deg); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .hp3-rental-img-main img { width: 100%; height: 100%; object-fit: cover; }
        .hp3-rental-img-sec {
          position: absolute; bottom: -40px; left: -40px;
          width: 66%; aspect-ratio: 4/5; background: #111; border-radius: 16px; overflow: hidden;
          transform: rotate(-6deg); box-shadow: 0 25px 50px rgba(0,0,0,0.5);
          border: 4px solid #0c0f0f;
        }
        .hp3-rental-img-sec img { width: 100%; height: 100%; object-fit: cover; }

        /* ── FAQ ──────────────────────────────────────── */
        .hp3-faq-section { padding: 128px 48px; background: #f6f6f6; }
        .hp3-faq-inner { max-width: 896px; margin: 0 auto; }
        .hp3-faq-title {
          font-family: 'Manrope', sans-serif; font-size: 2.5rem; font-weight: 900;
          letter-spacing: -0.04em; text-transform: uppercase; text-align: center;
          margin-bottom: 80px; color: #0c0f0f;
        }
        .hp3-faq-item { border-bottom: 1px solid rgba(172,173,173,0.3); padding-bottom: 16px; margin-bottom: 0; }
        .hp3-faq-summary {
          display: flex; justify-content: space-between; align-items: center;
          font-weight: 700; font-size: 1.125rem; cursor: pointer;
          padding: 16px 0; width: 100%; background: none; border: none;
          color: #0c0f0f; text-align: left;
        }
        .hp3-faq-summary:hover { color: #755700; }
        .hp3-faq-arrow { transition: transform 0.3s; font-size: 1.5rem; flex-shrink: 0; margin-left: 16px; color: #5a5c5c; }
        .hp3-faq-answer { color: #5a5c5c; line-height: 1.7; font-size: 0.875rem; padding: 0 0 16px; margin: 0; }

        /* ── Footer ───────────────────────────────────── */
        .hp3-footer {
          background: #0a0a0a; display: flex;
          flex-direction: column; align-items: stretch;
          padding: 80px 48px;
        }
        .hp3-footer-inner {
          max-width: 1920px; margin: 0 auto; width: 100%;
          display: flex; flex-wrap: wrap; justify-content: space-between;
          align-items: center; gap: 32px;
        }
        .hp3-footer-brand { color: #fdc003 !important; font-weight: 700; font-size: 1.25rem; font-family: 'Manrope', sans-serif; }
        .hp3-footer-copy  { font-family: 'Manrope', sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; color: #5a5c5c; }
        .hp3-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px; list-style: none; margin: 0; padding: 0; }
        .hp3-footer-links a { color: #5a5c5c !important; font-family: 'Manrope', sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; transition: color 0.3s, opacity 0.3s; opacity: 0.9; }
        .hp3-footer-links a:hover { color: #fdc003 !important; opacity: 1; }
        .hp3-footer-social { display: flex; gap: 24px; }
        .hp3-footer-social a { color: #fff !important; transition: color 0.2s; }
        .hp3-footer-social a:hover { color: #fdc003 !important; }

        /* ── Superadmin Edit System ───────────────────── */
        .hp3-edit-banner {
          position: fixed; top: 78px; left: 0; right: 0; z-index: 1049;
          background: rgba(253,192,3,0.96); color: #3d2b00; backdrop-filter: blur(4px);
          text-align: center; padding: 8px 16px;
          font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em;
        }
        .hp3-edit-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 9999;
          display: flex; align-items: center; gap: 12px;
        }
        .hp3-edit-toggle {
          width: 52px; height: 52px; border-radius: 9999px;
          background: #0c0f0f; color: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 28px rgba(0,0,0,0.3); transition: all 0.2s;
        }
        .hp3-edit-toggle.active { background: #fdc003; color: #3d2b00; }
        .hp3-edit-toggle:hover  { transform: scale(1.08); }
        .hp3-edit-action {
          padding: 12px 24px; border-radius: 9999px; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 700;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15); transition: all 0.2s;
        }
        .hp3-edit-save   { background: #fdc003; color: #3d2b00; }
        .hp3-edit-save:hover:not(:disabled) { background: #ecb200; }
        .hp3-edit-save:disabled { opacity: 0.65; cursor: not-allowed; }
        .hp3-edit-reset  { background: #fff; color: #5a5c5c; }
        .hp3-edit-reset:hover { color: #0c0f0f; }
        .hp3-edit-save.error { background: #f95630; color: #fff; }

        /* Image change overlay on bento cells */
        .hp3-img-change-btn {
          position: absolute; inset: 0; z-index: 10;
          background: rgba(12,15,15,0.55);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; border: none; cursor: pointer; border-radius: inherit;
          opacity: 0; transition: opacity 0.2s;
        }
        .hp3-bento-item:hover .hp3-img-change-btn { opacity: 1; }
        .hp3-img-change-btn span.material-symbols-outlined { font-size: 32px; color: #fdc003; }
        .hp3-img-change-btn span.label { font-size: 0.75rem; font-weight: 700; color: #fff; letter-spacing: 0.08em; text-transform: uppercase; }

        /* Image + Hero bg modal */
        .hp3-modal-overlay {
          position: fixed; inset: 0; z-index: 9998; padding: 20px;
          background: rgba(12,15,15,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
        }
        .hp3-modal {
          background: #fff; border-radius: 20px; padding: 36px;
          width: 480px; max-width: 100%;
          box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        }
        .hp3-modal h4 { font-family: 'Manrope', sans-serif; font-weight: 900; font-size: 1.15rem; margin-bottom: 20px; letter-spacing: -0.03em; color: #0c0f0f; }
        .hp3-modal-preview { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 12px; margin-bottom: 16px; background: #f0f1f1; display: block; }
        .hp3-modal-lbl { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5a5c5c; margin-bottom: 8px; display: block; }
        .hp3-modal-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 2px solid #e7e8e8; font-size: 0.875rem; font-family: 'Inter', sans-serif; outline: none; color: #0c0f0f; margin-bottom: 20px; transition: border-color 0.2s; }
        .hp3-modal-input:focus { border-color: #fdc003; }
        .hp3-modal-btns { display: flex; gap: 12px; }
        .hp3-modal-apply  { flex: 1; background: #0c0f0f; color: #fff; border: none; border-radius: 10px; padding: 13px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; font-family: 'Inter', sans-serif; }
        .hp3-modal-apply:hover { background: #fdc003; color: #3d2b00; }
        .hp3-modal-cancel { flex: 1; background: #f0f1f1; color: #5a5c5c; border: none; border-radius: 10px; padding: 13px; font-weight: 700; font-size: 0.875rem; cursor: pointer; font-family: 'Inter', sans-serif; }
        .hp3-modal-cancel:hover { background: #e7e8e8; }

        /* ── Responsive ──────────────────────────────── */
        @media (max-width: 1280px) {
          .hp3-bento { grid-template-columns: 1fr 1fr; grid-template-rows: auto; height: auto; min-height: 600px; }
          .hp3-bento-clothes     { grid-column: 1/2; grid-row: 1/2; aspect-ratio: 4/3; }
          .hp3-bento-accessories { grid-column: 2/3; grid-row: 1/2; aspect-ratio: 4/3; }
          .hp3-bento-footwear    { grid-column: 1/2; grid-row: 2/3; aspect-ratio: 4/3; }
          .hp3-bento-electronics { grid-column: 2/3; grid-row: 2/3; aspect-ratio: 4/3; }
          .hp3-trans-grid { grid-template-columns: 1fr; gap: 64px; }
          .hp3-rental-grid { grid-template-columns: 1fr; }
          .hp3-testi-grid { grid-template-columns: 1fr; gap: 48px; }
        }
        @media (max-width: 768px) {
          .hp3-nav { padding: 16px 20px; }
          .hp3-hero { padding: 96px 24px 0; min-height: 640px; }
          .hp3-hero-h1 { font-size: 3rem; }
          .hp3-cat-section, .hp3-trans-section, .hp3-testi-section, .hp3-faq-section { padding: 80px 20px; }
          .hp3-rental-section { padding: 80px 20px; }
          .hp3-footer { padding: 60px 20px; }
          .hp3-footer-inner { flex-direction: column; align-items: center; text-align: center; }
          .hp3-scroll-indicator { display: none !important; }
          .hp3-rental-features { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Edit Mode Banner ── */}
      {isEdit && (
        <div className="hp3-edit-banner">
          ✏ Edit Mode — Click any amber-outlined element to edit. Click category images to change URL.
        </div>
      )}

      {/* ════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════ */}
      <header className="hp3-header">
        <nav className="hp3-nav">
          <Link href="/" className="hp3-brand">Flex Market</Link>

          {/* Desktop links */}
          <ul className="hp3-nav-links d-none d-md-flex">
            {navLinks.map((nl, i) => (
              <li key={i}><Link href={nl.href} className={i === 0 ? 'active' : ''}>{nl.label}</Link></li>
            ))}
          </ul>

          <div className="hp3-nav-icons">
            {/* Search */}
            <div className="hp3-search-wrap d-none d-lg-flex">
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#757777' }}>search</span>
              <input
                type="text"
                placeholder="Search curated list..."
                onKeyDown={e => { if (e.key === 'Enter') router.push(`/buyer/browse?search=${(e.target as HTMLInputElement).value}`); }}
              />
            </div>
            <button className="hp3-icon-btn" onClick={() => router.push('/cart')} title="Cart">
              <span className="material-symbols-outlined">shopping_bag</span>
            </button>
            <button className="hp3-icon-btn" title="Account"
              onClick={() => {
                if (isAuthenticated && user) router.push(user.role === 'super_admin' ? '/superadmin' : user.role === 'admin' ? '/admin' : '/buyer/dashboard');
                else router.push('/login');
              }}
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>
            <Link href={isAuthenticated ? (user?.role === 'super_admin' ? '/superadmin' : '/buyer/dashboard') : '/register'} className="hp3-get-started d-none d-md-inline-block">
              {isAuthenticated ? 'My Portal' : 'Get Started'}
            </Link>
            {/* Mobile hamburger */}
            <button className="hp3-icon-btn d-md-none" onClick={() => setMobileNavOpen(v => !v)}>
              <span className="material-symbols-outlined">{mobileNavOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </nav>

        {mobileNavOpen && (
          <div className="hp3-mobile-menu d-md-none">
            {navLinks.map((nl, i) => (
              <Link key={i} href={nl.href} className="hp3-mobile-link" onClick={() => setMobileNavOpen(false)}>{nl.label}</Link>
            ))}
            <hr style={{ borderColor: '#f0f1f1', margin: '12px 0' }} />
            <Link href={isAuthenticated ? '/buyer/dashboard' : '/register'} className="hp3-mobile-link" onClick={() => setMobileNavOpen(false)}>
              {isAuthenticated ? 'My Portal' : 'Get Started'}
            </Link>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="hp3-hero" style={isEdit ? { marginTop: 36 } : {}}>
        <div
          className="hp3-hero-bg"
          style={{ backgroundImage: `url('${content.heroBgImage}')` }}
        >
          <div className="hp3-hero-overlay" />
        </div>

        {/* Hero bg change button for superadmin */}
        {isEdit && (
          <button
            onClick={() => setImgModal({ type: 'hero', url: content.heroBgImage })}
            style={{
              position: 'absolute', top: 120, right: 40,
              background: 'rgba(253,192,3,0.9)', border: 'none', borderRadius: 9999,
              padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
              fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
              zIndex: 5,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>wallpaper</span>
            Change Hero Image
          </button>
        )}

        <div className="hp3-hero-content">
          <CE
            value={content.heroEyebrow} tag="span" className="hp3-hero-eyebrow"
            onSave={v => sf('heroEyebrow', v)} isEdit={isEdit}
          />
          <CE
            value={content.heroH1} tag="h1" className="hp3-hero-h1"
            onSave={v => sf('heroH1', v)} isEdit={isEdit}
          />
          <CE
            value={content.heroBody} tag="p" className="hp3-hero-body"
            onSave={v => sf('heroBody', v)} isEdit={isEdit}
          />
          <div className="hp3-hero-ctas">
            <Link href="/buyer/browse" className="hp3-cta-primary">
              <CE value={content.heroCtaExplore} onSave={v => sf('heroCtaExplore', v)} isEdit={isEdit} />
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_outward</span>
            </Link>
            <Link href="/register" className="hp3-cta-glass">
              <CE value={content.heroCtaList} onSave={v => sf('heroCtaList', v)} isEdit={isEdit} />
            </Link>
          </div>
        </div>

        <div className="hp3-scroll-indicator d-none d-md-flex">
          <span>Scroll to Discover</span>
          <div className="hp3-scroll-line" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CATEGORIES — BENTO GALLERY
      ════════════════════════════════════════════════ */}
      <section>
        <div className="hp3-cat-section">
          <div className="hp3-cat-header">
            <div className="hp3-cat-header-left">
              <CE value={content.catTitle} tag="h2" className="hp3-cat-title" onSave={v => sf('catTitle', v)} isEdit={isEdit} />
              <CE value={content.catSubtitle} tag="p" className="hp3-cat-sub" onSave={v => sf('catSubtitle', v)} isEdit={isEdit} />
            </div>
            <Link href="/buyer/browse" className="hp3-cat-view-all">
              View All Categories
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>trending_flat</span>
            </Link>
          </div>

          <div className="hp3-bento">
            {content.cats.map((cat, i) => {
              const classes = ['hp3-bento-clothes', 'hp3-bento-accessories', 'hp3-bento-footwear', 'hp3-bento-electronics'];
              return (
                <div
                  key={i}
                  className={`hp3-bento-item ${classes[i] || ''}`}
                  onClick={isEdit ? undefined : () => router.push(`/buyer/browse?search=${cat.name.toLowerCase()}`)}
                  style={{ cursor: isEdit ? 'default' : 'pointer' }}
                >
                  <img src={cat.img} alt={cat.name} />
                  <div className="hp3-bento-overlay" />
                  <div className="hp3-bento-info">
                    <CE value={cat.tag} tag="span" className="hp3-bento-tag" onSave={v => sCat(i, 'tag', v)} isEdit={isEdit} />
                    <CE value={cat.name} tag="h3" className="hp3-bento-name" onSave={v => sCat(i, 'name', v)} isEdit={isEdit} />
                  </div>
                  {isEdit && (
                    <button
                      className="hp3-img-change-btn"
                      onClick={e => { e.stopPropagation(); setImgModal({ type: 'cat', idx: i, url: cat.img }); }}
                    >
                      <span className="material-symbols-outlined">image</span>
                      <span className="label">Change Image</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          ART OF THE TRANSACTION
      ════════════════════════════════════════════════ */}
      <section className="hp3-trans-section">
        <div className="hp3-trans-inner">
          <div className="hp3-trans-header">
            <CE value={content.transTitle} tag="h2" className="hp3-trans-title" onSave={v => sf('transTitle', v)} isEdit={isEdit} />
            <CE value={content.transSub}   tag="p"  className="hp3-trans-sub"   onSave={v => sf('transSub', v)}   isEdit={isEdit} />
          </div>

          <div className="hp3-trans-grid">
            {/* Selling */}
            <div>
              <h3 className="hp3-trans-col-title">SELLING</h3>
              <div className="hp3-step-list">
                {content.sellingSteps.map((step, i) => (
                  <div key={i} className="hp3-step-item">
                    <div className="hp3-step-icon-wrap">
                      <span className="material-symbols-outlined">{step.icon}</span>
                    </div>
                    <div>
                      <CE value={step.title} tag="h4" className="hp3-step-title" onSave={v => sStep('sellingSteps', i, 'title', v)} isEdit={isEdit} />
                      <CE value={step.desc}  tag="p"  className="hp3-step-desc"  onSave={v => sStep('sellingSteps', i, 'desc', v)}  isEdit={isEdit} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buying */}
            <div>
              <h3 className="hp3-trans-col-title">BUYING &amp; RENTING</h3>
              <div className="hp3-step-list">
                {content.buyingSteps.map((step, i) => (
                  <div key={i} className="hp3-step-item">
                    <div className="hp3-step-icon-wrap">
                      <span className="material-symbols-outlined">{step.icon}</span>
                    </div>
                    <div>
                      <CE value={step.title} tag="h4" className="hp3-step-title" onSave={v => sStep('buyingSteps', i, 'title', v)} isEdit={isEdit} />
                      <CE value={step.desc}  tag="p"  className="hp3-step-desc"  onSave={v => sStep('buyingSteps', i, 'desc', v)}  isEdit={isEdit} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════ */}
      <section className="hp3-testi-section">
        <div className="hp3-testi-inner">
          <CE value={content.testiTitle} tag="h2" className="hp3-testi-title" onSave={v => sf('testiTitle', v)} isEdit={isEdit} />
          <div className="hp3-testi-grid">
            {content.testimonials.map((t, i) => (
              <div key={i} className="hp3-testi-card">
                <div className="hp3-testi-stars">
                  {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                </div>
                <CE value={t.quote}  tag="p"    className="hp3-testi-quote"  onSave={v => sTesti(i, 'quote', v)}  isEdit={isEdit} />
                <div className="hp3-testi-author-row">
                  <div className="hp3-testi-avatar" />
                  <div>
                    <CE value={t.author} tag="span" className="hp3-testi-name" style={{ display: 'block' }} onSave={v => sTesti(i, 'author', v)} isEdit={isEdit} />
                    <CE value={t.role}   tag="span" className="hp3-testi-role" style={{ display: 'block' }} onSave={v => sTesti(i, 'role', v)}   isEdit={isEdit} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          ELITE SERVICES — RENTAL DARK BANNER
      ════════════════════════════════════════════════ */}
      <section className="hp3-rental-section">
        <div
          className="hp3-rental-bg-art"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1560243563-062bfc001d68?q=80&w=1600')` }}
        />
        <div className="hp3-rental-inner">
          <div className="hp3-rental-grid">
            <div>
              <div className="hp3-rental-badge">
                <span className="hp3-rental-badge-dot" />
                <CE value={content.rentalBadge} tag="span" className="hp3-rental-badge-text" onSave={v => sf('rentalBadge', v)} isEdit={isEdit} />
              </div>
              <CE value={content.rentalTitle} tag="h2" className="hp3-rental-h2" onSave={v => sf('rentalTitle', v)} isEdit={isEdit} />
              <CE value={content.rentalSub}   tag="p"  className="hp3-rental-sub"  onSave={v => sf('rentalSub', v)}   isEdit={isEdit} />
              <div className="hp3-rental-features">
                <div className="hp3-rental-feature">
                  <CE value={content.rentalF1Title} tag="h5" className="hp3-rental-feat-title" onSave={v => sf('rentalF1Title', v)} isEdit={isEdit} />
                  <CE value={content.rentalF1Desc}  tag="p"  className="hp3-rental-feat-desc"  onSave={v => sf('rentalF1Desc', v)}  isEdit={isEdit} />
                </div>
                <div className="hp3-rental-feature">
                  <CE value={content.rentalF2Title} tag="h5" className="hp3-rental-feat-title" onSave={v => sf('rentalF2Title', v)} isEdit={isEdit} />
                  <CE value={content.rentalF2Desc}  tag="p"  className="hp3-rental-feat-desc"  onSave={v => sf('rentalF2Desc', v)}  isEdit={isEdit} />
                </div>
              </div>
              <Link href="/buyer/browse?listing_type=rent" className="hp3-rental-cta">
                <CE value={content.rentalCta} onSave={v => sf('rentalCta', v)} isEdit={isEdit} />
              </Link>
            </div>

            {/* Stacked images */}
            <div className="hp3-rental-images">
              <div className="hp3-rental-img-main">
                <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800" alt="Premium fashion" />
              </div>
              <div className="hp3-rental-img-sec">
                <img src="https://images.unsplash.com/photo-1526406915894-7bcd65f60845?q=80&w=800" alt="Luxury gadgets" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════════ */}
      <section className="hp3-faq-section">
        <div className="hp3-faq-inner">
          <CE value={content.faqTitle} tag="h2" className="hp3-faq-title" onSave={v => sf('faqTitle', v)} isEdit={isEdit} />
          {content.faqItems.map((item, i) => (
            <FaqRow key={i} item={item} idx={i} isEdit={isEdit} onSave={sFaq} />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════ */}
      <footer className="hp3-footer">
        <div className="hp3-footer-inner">
          <div>
            <span className="hp3-footer-brand">Flex Market</span>
            <CE value={content.footerDesc} tag="p" className="hp3-footer-copy" style={{ marginTop: 16 }} onSave={v => sf('footerDesc', v)} isEdit={isEdit} />
          </div>

          <nav>
            <ul className="hp3-footer-links">
              <li><a href="#">The Process</a></li>
              <li><Link href="/buyer/browse">Browse</Link></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Shipping</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </nav>

          <div className="hp3-footer-social">
            <a href="#"><span className="material-symbols-outlined">public</span></a>
            <a href="#"><span className="material-symbols-outlined">alternate_email</span></a>
            <a href="#"><span className="material-symbols-outlined">rss_feed</span></a>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════
          SUPERADMIN EDIT FAB
      ════════════════════════════════════════════════ */}
      {isSA && (
        <div className="hp3-edit-fab">
          {editMode && (
            <>
              <button
                className={`hp3-edit-action hp3-edit-save${saveStatus === 'error' ? ' error' : ''}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved to DB' : saveStatus === 'error' ? '✗ Error' : 'Save to DB'}
              </button>
              <button
                className="hp3-edit-action hp3-edit-reset"
                onClick={() => setContent(DEFAULT)}
              >
                Reset
              </button>
            </>
          )}
          <button
            className={`hp3-edit-toggle ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(v => !v)}
            title={editMode ? 'Exit Edit Mode' : 'Edit Page (Superadmin only)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {editMode ? 'edit_off' : 'edit'}
            </span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          IMAGE URL MODAL
      ════════════════════════════════════════════════ */}
      {imgModal && (
        <div className="hp3-modal-overlay" onClick={() => setImgModal(null)}>
          <div className="hp3-modal" onClick={e => e.stopPropagation()}>
            <h4>{imgModal.type === 'hero' ? 'Change Hero Background' : `Change Image — ${imgModal.idx !== undefined ? content.cats[imgModal.idx]?.name : ''}`}</h4>
            <img
              src={imgModal.url}
              alt="preview"
              className="hp3-modal-preview"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
            />
            <label className="hp3-modal-lbl">Image URL</label>
            <input
              type="text"
              className="hp3-modal-input"
              value={imgModal.url}
              placeholder="https://…"
              onChange={e => setImgModal(m => m ? { ...m, url: e.target.value } : null)}
            />
            <div className="hp3-modal-btns">
              <button
                className="hp3-modal-apply"
                onClick={() => {
                  if (imgModal.type === 'hero') {
                    sf('heroBgImage', imgModal.url);
                  } else if (imgModal.idx !== undefined) {
                    sCat(imgModal.idx, 'img', imgModal.url);
                  }
                  setImgModal(null);
                }}
              >
                Apply
              </button>
              <button className="hp3-modal-cancel" onClick={() => setImgModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
