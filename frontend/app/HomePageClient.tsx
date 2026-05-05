'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCartCount } from '@/lib/cart';

interface Product {
  id: number;
  title: string;
  listing_type: string;
  original_price: string;
  selling_price?: string;
  rental_cost?: string;
  price?: string;
  seller_name: string;
  image?: string;
  primary_image?: string;
  brand_name?: string;
  brand?: string;
  status: string;
}

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
  category_name?: string;
  name?: string;
  product_type_id: number;
}

interface TaxonomyData {
  listing_types: ListingType[];
  product_types: ProductType[];
  categories: Category[];
}

interface BrowseData {
  products: Product[];
  categories: Array<{ id: number; name: string }>;
  pagination: { page: number; total: number; total_pages: number };
}

interface HeroSlide {
  badge: string;
  title1: string;
  title2: string;
  desc: string;
  btnText: string;
  btnHref: string;
  img: string;
}

interface DisplayCategory {
  name: string;
  img: string;
}

const defaultHeroSlides: HeroSlide[] = [
  {
    badge: 'NEW ARRIVALS',
    title1: 'Luxury',
    title2: 'Curated.',
    desc: 'Discover high-end fashion and lifestyle essentials reserved for the elite.',
    btnText: 'Explore Marketplace',
    btnHref: '/buyer/browse',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070',
  },
  {
    badge: 'RENT LUXURY',
    title1: 'Elite',
    title2: 'Rentals.',
    desc: 'Why buy when you can rent high-end fashion and home essentials for a fraction of the cost?',
    btnText: 'View Rental Plans',
    btnHref: '/buyer/browse?listing_type=rent',
    img: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=2070',
  },
];

const defaultDisplayCategories: DisplayCategory[] = [
  { name: 'Clothing', img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1471' },
  { name: 'Accessories', img: 'https://images.unsplash.com/photo-1596460107916-430662021049?q=80&w=1470' },
  { name: 'Footwear', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1412' },
  { name: 'Electronics', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1470' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface ISRData {
  featuredProducts?: Product[];
  landingContent?: Record<string, string>;
  listingTypes?: ListingType[];
}

export default function HomePageClient({ isrData }: { isrData?: ISRData }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(isrData?.featuredProducts || []);
  const [listingTypes, setListingTypes] = useState<ListingType[]>(isrData?.listingTypes || []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    update();
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  // Editable content state
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(defaultHeroSlides);
  const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>(defaultDisplayCategories);
  const [ctaTitle, setCtaTitle] = useState('Start listing your <br /><span class="text-warning">product, it\'s free.</span>');
  const [ctaSubtitle, setCtaSubtitle] = useState('Join our elite community of sellers and reach thousands of premium buyers.');
  const [footerDescription, setFooterDescription] = useState('Premium curated marketplace for the elite. Discover high-end fashion, electronics, and lifestyle essentials reserved for those who value quality.');
  const [sectionTitleCategories, setSectionTitleCategories] = useState('Browse by Essence.');
  const [sectionTitleProducts, setSectionTitleProducts] = useState('Elite Drops.');
  const [footerQuickLinks, setFooterQuickLinks] = useState<{label:string;href:string}[]>([
    {label:'Home',href:'/'},{label:'About',href:'/'},{label:'Sell',href:'/seller/upload-product'},{label:'Rent',href:'/buyer/browse?listing_type=rent'},{label:'Explore',href:'/buyer/browse'}
  ]);
  const [footerPolicyLinks, setFooterPolicyLinks] = useState<{label:string;href:string}[]>([
    {label:'Return policies',href:'#'},{label:'Cancellation policies',href:'#'},{label:'Terms of use',href:'#'}
  ]);
  const [footerSocialLinks, setFooterSocialLinks] = useState<{icon:string;href:string}[]>([
    {icon:'bi-facebook',href:'#'},{icon:'bi-twitter',href:'#'},{icon:'bi-instagram',href:'#'},{icon:'bi-linkedin',href:'#'}
  ]);
  const [howSteps, setHowSteps] = useState<{num:string;icon:string;title:string;desc:string}[]>([
    {num:'01',icon:'bi-search',title:'Discover',desc:'Browse thousands of curated products from verified sellers across all categories.'},
    {num:'02',icon:'bi-heart',title:'Wishlist',desc:'Save your favorite items to your wishlist. No account needed to explore and shortlist.'},
    {num:'03',icon:'bi-person-check',title:'Sign In & Offer',desc:'Create an account or sign in when you\'re ready. Make an offer on the product.'},
    {num:'04',icon:'bi-box-seam',title:'Get It Delivered',desc:'Once the seller accepts, your item is on its way. Track and confirm delivery.'},
  ]);
  const [statsBanner, setStatsBanner] = useState<{value:string;label:string}[]>([
    {value:'10K+',label:'Products Listed'},{value:'5K+',label:'Happy Buyers'},{value:'2K+',label:'Verified Sellers'},{value:'98%',label:'Satisfaction Rate'},
  ]);
  const [trustFeatures, setTrustFeatures] = useState<{icon:string;title:string;desc:string}[]>([
    {icon:'bi-shield-check',title:'Verified Sellers',desc:'Every seller is verified for authenticity and reliability.'},
    {icon:'bi-lock',title:'Secure Payments',desc:'Your transactions are protected with industry-grade encryption.'},
    {icon:'bi-arrow-repeat',title:'Easy Returns',desc:'Hassle-free returns within the policy period, no questions asked.'},
    {icon:'bi-headset',title:'24/7 Support',desc:'Our dedicated team is always ready to help you out.'},
  ]);
  const [testimonials, setTestimonials] = useState<{name:string;role:string;avatar:string;text:string;stars:number}[]>([
    {name:'Priya Sharma',role:'Buyer',avatar:'PS',text:'Flex Market made it so easy to find exactly what I was looking for. The quality of sellers here is unmatched. I rented a designer dress for my event and it was flawless!',stars:5},
    {name:'Arjun Mehta',role:'Seller',avatar:'AM',text:'As a seller, the platform gives me incredible visibility. My products get seen by the right audience and the offer system is brilliant. Revenue has been consistently growing.',stars:5},
    {name:'Sneha Patel',role:'Buyer & Seller',avatar:'SP',text:'I love the dual functionality. I can sell items I no longer need and find amazing deals from other sellers. The whole experience feels premium and trustworthy.',stars:4},
  ]);

  // Edit modal state
  const [editModal, setEditModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editTemp, setEditTemp] = useState<any>(null);
  const [imgUploading, setImgUploading] = useState<Record<number, boolean>>({});

  const isSuperAdmin = user?.role === 'super_admin';

  // Upload a card image file to the server, return the public URL
  const uploadCardImage = async (file: File, idx: number): Promise<string | null> => {
    setImgUploading(prev => ({ ...prev, [idx]: true }));
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('flex_token') : null;
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/superadmin/upload-landing-card-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json();
      if (json.success) return json.url || `http://localhost:8080/${json.path}`;
      return null;
    } catch { return null; }
    finally { setImgUploading(prev => ({ ...prev, [idx]: false })); }
  };

  // Load landing content — use ISR pre-fetched data if available, otherwise client-fetch
  useEffect(() => {
    if (isrData?.landingContent) {
      const d = isrData.landingContent;
      if (d.hero_slides) try { setHeroSlides(JSON.parse(d.hero_slides)); } catch {}
      if (d.display_categories) try { setDisplayCategories(JSON.parse(d.display_categories)); } catch {}
      if (d.cta_title) setCtaTitle(d.cta_title);
      if (d.cta_subtitle) setCtaSubtitle(d.cta_subtitle);
      if (d.footer_description) setFooterDescription(d.footer_description);
      if (d.section_title_categories) setSectionTitleCategories(d.section_title_categories);
      if (d.section_title_products) setSectionTitleProducts(d.section_title_products);
      if (d.how_it_works_steps) try { setHowSteps(JSON.parse(d.how_it_works_steps)); } catch {}
      if (d.stats_banner) try { setStatsBanner(JSON.parse(d.stats_banner)); } catch {}
      if (d.trust_features) try { setTrustFeatures(JSON.parse(d.trust_features)); } catch {}
      if (d.testimonials) try { setTestimonials(JSON.parse(d.testimonials)); } catch {}
      if (d.footer_quick_links) try { setFooterQuickLinks(JSON.parse(d.footer_quick_links)); } catch {}
      if (d.footer_policy_links) try { setFooterPolicyLinks(JSON.parse(d.footer_policy_links)); } catch {}
      if (d.footer_social_links) try { setFooterSocialLinks(JSON.parse(d.footer_social_links)); } catch {}
      return;
    }
    fetch(`${API_BASE}/landing-content`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.hero_slides) try { setHeroSlides(JSON.parse(d.hero_slides)); } catch {}
          if (d.display_categories) try { setDisplayCategories(JSON.parse(d.display_categories)); } catch {}
          if (d.cta_title) setCtaTitle(d.cta_title);
          if (d.cta_subtitle) setCtaSubtitle(d.cta_subtitle);
          if (d.footer_description) setFooterDescription(d.footer_description);
          if (d.section_title_categories) setSectionTitleCategories(d.section_title_categories);
          if (d.section_title_products) setSectionTitleProducts(d.section_title_products);
          if (d.how_it_works_steps) try { setHowSteps(JSON.parse(d.how_it_works_steps)); } catch {}
          if (d.stats_banner) try { setStatsBanner(JSON.parse(d.stats_banner)); } catch {}
          if (d.trust_features) try { setTrustFeatures(JSON.parse(d.trust_features)); } catch {}
          if (d.testimonials) try { setTestimonials(JSON.parse(d.testimonials)); } catch {}
          if (d.footer_quick_links) try { setFooterQuickLinks(JSON.parse(d.footer_quick_links)); } catch {}
          if (d.footer_policy_links) try { setFooterPolicyLinks(JSON.parse(d.footer_policy_links)); } catch {}
          if (d.footer_social_links) try { setFooterSocialLinks(JSON.parse(d.footer_social_links)); } catch {}
        }
      })
      .catch(() => {});
  }, [isrData]);

  useEffect(() => {
    // Skip client fetch if ISR already provided products
    if (isrData?.featuredProducts && isrData.featuredProducts.length > 0) return;
    // Fetch featured products (public endpoint, no auth)
    fetch(`${API_BASE}/featured-products`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setFeaturedProducts(res.data.slice(0, 8));
        }
      })
      .catch(() => {});
    // Fetch taxonomy — skip if ISR already provided enriched data with product_types
    if (isrData?.listingTypes && isrData.listingTypes.length > 0 && isrData.listingTypes[0]?.product_types) {
      // ISR already provided full taxonomy — no client fetch needed
    } else {
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
    }
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/buyer/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Save content to backend
  const saveContent = useCallback(async (data: Record<string, string>) => {
    setSaving(true);
    await api.post('/superadmin/update-landing-content', data);
    setSaving(false);
    setEditModal(null);
  }, []);

  // Edit button component (only visible to superadmin)
  const EditBtn = ({ onClick, label }: { onClick: () => void; label?: string }) => {
    if (!isSuperAdmin) return null;
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 100,
          background: 'rgba(255,198,58,0.95)', color: '#000', border: 'none',
          borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem',
          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <i className="bi bi-pencil-square"></i> {label || 'Edit'}
      </button>
    );
  };

  // Inline edit button (non-absolute)
  const EditBtnInline = ({ onClick, label }: { onClick: () => void; label?: string }) => {
    if (!isSuperAdmin) return null;
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        style={{
          background: 'rgba(255,198,58,0.95)', color: '#000', border: 'none',
          borderRadius: 8, padding: '4px 12px', fontSize: '0.75rem',
          fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginLeft: 10, verticalAlign: 'middle',
        }}
      >
        <i className="bi bi-pencil-square"></i> {label || 'Edit'}
      </button>
    );
  };

  // Modal wrapper
  const Modal = ({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.6)', zIndex: 99999 }} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
            <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.5rem' }}>
              <h5 className="modal-title fw-bold"><i className="bi bi-pencil-square me-2" style={{ color: '#ffc63a' }}></i>{title}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  };

  const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.875rem' };
  const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 700, border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem' };

  return (
    <>
      <style jsx global>{`
        :root {
          --primary-yellow: #ffc63a;
          --primary-dark: #000;
          --bg-light: #f8f9fa;
          --text-muted: #6f6f6f;
        }
        .buyer-landing { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #fff; color: #000; }
        .buyer-landing h1,.buyer-landing h2,.buyer-landing h3,.buyer-landing h4,.buyer-landing h5,.buyer-landing h6,.buyer-landing .btn { font-family: "Maven Pro", sans-serif; }
        .fw-800 { font-weight: 800 !important; }
        .fw-900 { font-weight: 900 !important; }

        /* Header */
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
          transition: none; white-space: nowrap;
        }
        .landing-nav-catalog { position: relative; }
        .landing-nav-search { flex-shrink: 0; width: 260px; margin: 0 16px; }
        .landing-nav-actions {
          display: flex; align-items: center; gap: 20px; flex-shrink: 0;
        }
        .navbar-main { background: rgba(255,255,255,0.85); backdrop-filter: blur(25px) saturate(180%); -webkit-backdrop-filter: blur(25px) saturate(180%); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 0.7rem 0; z-index: 1050; position: fixed; top: 0; left: 0; right: 0; }
        .navbar-brand-main { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #000 !important; letter-spacing: -1.5px; position: relative; text-decoration: none; }
        .navbar-brand-main::after { content: '.'; color: var(--primary-yellow); font-size: 2.5rem; line-height: 0; position: absolute; bottom: 8px; }
        .nav-link-main { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95rem; color: #000 !important; padding: 0.5rem 1.4rem !important; transition: none; position: relative; letter-spacing: -0.2px; text-decoration: none; }
        .search-wrapper { position: relative; width: 380px; margin: 0 30px; }
        .search-input-premium { background: #f4f4f4; border: 1px solid transparent; border-radius: 14px; padding: 10px 15px 10px 45px; font-size: 0.9rem; font-family: 'Inter', sans-serif; width: 100%; transition: all 0.3s ease; outline: none; }
        .search-input-premium:focus { background: #fff; border-color: var(--primary-yellow); box-shadow: 0 8px 20px rgba(255,198,58,0.15); }
        .search-icon-fixed { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888; font-size: 1.1rem; }
        .user-action-link { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: #000; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: none; }

        /* Mobile Nav Toggle */
        .mobile-nav-toggle {
          display: none; width: 40px; height: 40px; border: none; background: #f4f4f4; border-radius: 10px;
          align-items: center; justify-content: center; cursor: pointer; transition: none; flex-shrink: 0;
        }

        /* Mobile Nav Drawer */
        .mobile-nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1055; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease; }
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
          display: flex; align-items: center; justify-content: center; cursor: pointer; transition: none;
        }
        .mobile-nav-drawer-body { padding: 16px 20px; }
        .mobile-nav-drawer-body .mobile-nav-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
          color: #333; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: none;
          font-family: 'Inter', sans-serif; border: none; background: none; width: 100%; text-align: left; cursor: pointer;
        }
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

        @media (max-width: 991px) {
          .mobile-nav-toggle { display: flex; }
          .desktop-nav-center { display: none !important; }
          .landing-nav-links { display: none !important; }
          .landing-nav-search { display: none !important; }
          .search-wrapper { display: none !important; }
          .desktop-right-actions { gap: 12px !important; }
          .navbar-brand-main { font-size: 1.5rem; }
          .navbar-main { padding: 0.6rem 0; }
          .mobile-nav-overlay { display: block; }
        }
        @media (max-width: 575px) {
          .navbar-brand-main { font-size: 1.3rem; }
          .navbar-main .container-fluid { padding-left: 12px !important; padding-right: 12px !important; }
          .user-action-link span { display: none; }
          .mobile-nav-drawer { width: 280px; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Mega Menu */
        .dropdown-mega { position: relative; }
        .mega-menu { position: absolute; left: 50%; transform: translateX(-50%); top: 100%; width: 90vw; max-width: 1200px; padding: 50px 40px; border: none; border-radius: 0 0 30px 30px; box-shadow: 0 30px 60px rgba(0,0,0,0.12); background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); border-top: 1px solid rgba(0,0,0,0.05); z-index: 1060; animation: megaFadeIn 0.2s ease; }
        @keyframes megaFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .mega-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; color: #000; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .mega-link { font-family: 'Inter', sans-serif; color: #666; text-decoration: none; font-size: 0.88rem; display: block; padding: 6px 0; transition: none; }
        .mega-pt-label { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.85rem; color: #000; margin-bottom: 4px; display: block; text-decoration: none; }

        /* User Dropdown */
        .user-dropdown { position: relative; }
        .user-dropdown-menu { position: absolute; right: 0; left: auto; top: 100%; min-width: 250px; background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); padding: 8px; padding-top: 20px; z-index: 1060; animation: ddSlideDown 0.3s ease; }
        @keyframes ddSlideDown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .user-dropdown-menu .dd-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 12px; color: #333; text-decoration: none; font-size: 0.9rem; transition: none; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .user-dropdown-menu .dd-item.text-danger { color: #dc3545 !important; }
        .user-dropdown-menu .dd-header { padding: 16px; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; }

        /* Sell Button */
        .btn-sell-premium { background: linear-gradient(135deg, var(--primary-yellow) 0%, #ffb300 100%); color: #000; border: none; padding: 10px 24px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.9rem; transition: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(255,198,58,0.3); text-decoration: none; }

        /* Hero */
        .hero-carousel { margin-bottom: 0; padding-bottom: 40px; }
        .hero-slide { height: 650px; border-radius: 40px; overflow: hidden; position: relative; background: #000; display: flex; align-items: center; margin-top: 15px; box-shadow: 0 40px 100px rgba(0,0,0,0.15); }
        .hero-content { padding: 0 80px; z-index: 10; max-width: 800px; position: relative; }
        .hero-badge { display: inline-block; padding: 10px 20px; background: var(--primary-yellow); color: #000; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 0.75rem; border-radius: 12px; margin-bottom: 30px; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 8px 20px rgba(255,198,58,0.4); }
        .hero-title { font-family: 'Outfit', sans-serif; font-size: 5rem; line-height: 0.95; margin-bottom: 30px; color: #fff; font-weight: 900; letter-spacing: -2px; }
        .hero-title .text-warning-gradient { color: var(--primary-yellow) !important; background: linear-gradient(135deg, var(--primary-yellow) 0%, #ff8c00 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; transition: transform 1.2s cubic-bezier(0.4,0,0.2,1); }
        .hero-slide:hover .hero-img { transform: scale(1.08); }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 80%); z-index: 2; }
        .hero-desc { font-family: 'Inter', sans-serif; font-size: 1.2rem; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 45px; font-weight: 500; max-width: 500px; }
        .carousel-indicators-custom { position: absolute; bottom: 40px; left: 80px; display: flex; gap: 8px; z-index: 15; }
        .carousel-indicator { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3); border: none; cursor: pointer; transition: 0.4s; }
        .carousel-indicator.active { background: var(--primary-yellow); width: 80px; }
        .carousel-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 60px; height: 60px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; cursor: pointer; z-index: 15; opacity: 0; transition: none; }
        .hero-slide:hover .carousel-nav { opacity: 1; }
        .carousel-nav.prev { left: 40px; }
        .carousel-nav.next { right: 40px; }

        /* Category Grid */
        .cat-card { height: 400px; border-radius: 20px; overflow: hidden; position: relative; cursor: pointer; transition: none; }
        .cat-card img { width: 100%; height: 100%; object-fit: cover; }
        .cat-info { position: absolute; inset: 0; padding: 30px; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 50%); color: #fff; }

        /* Premium Title */
        .premium-title { font-size: 2.5rem; margin-bottom: 40px; position: relative; display: inline-block; }
        .premium-title::after { content: ''; position: absolute; bottom: -5px; left: 0; width: 60px; height: 4px; background: var(--primary-yellow); }

        /* Product Card */
        .product-card-elite { background: #fff; border-radius: 20px; padding: 15px; transition: none; border: 1px solid #f1f1f1; height: 100%; cursor: pointer; }
        .product-img-elite { height: 250px; border-radius: 15px; overflow: hidden; margin-bottom: 15px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; }
        .product-img-elite img { width: 100%; height: 100%; object-fit: cover; }

        /* Listing CTA */
        .listing-cta { background: #f8f9fa; border-radius: 30px; padding: 50px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #eee; }

        /* ===== Landing Page Responsive ===== */
        @media (max-width: 991px) {
          .buyer-landing { padding-top: 80px !important; }
          .hero-slide { height: 450px; border-radius: 24px; margin-top: 10px; }
          .hero-content { padding: 0 40px; }
          .hero-title { font-size: 3rem; letter-spacing: -1px; margin-bottom: 20px; }
          .hero-desc { font-size: 1rem; margin-bottom: 30px; }
          .hero-badge { padding: 8px 16px; margin-bottom: 20px; }
          .carousel-indicators-custom { left: 40px; bottom: 25px; }
          .carousel-nav { width: 44px; height: 44px; font-size: 1rem; }
          .carousel-nav.prev { left: 15px; }
          .carousel-nav.next { right: 15px; }
          .cat-card { height: 280px; border-radius: 16px; }
          .premium-title { font-size: 2rem; margin-bottom: 30px; }
          .product-img-elite { height: 200px; }
          .listing-cta { padding: 35px 25px; border-radius: 20px; }
          .mega-menu { display: none !important; }
        }
        @media (max-width: 767px) {
          .buyer-landing { padding-top: 70px !important; }
          .hero-slide { height: 380px; border-radius: 18px; }
          .hero-content { padding: 0 24px; }
          .hero-title { font-size: 2.2rem; }
          .hero-desc { font-size: 0.9rem; margin-bottom: 20px; max-width: 100%; }
          .hero-overlay { background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 100%); }
          .carousel-indicators-custom { left: 24px; bottom: 20px; }
          .carousel-indicator { width: 28px; height: 3px; }
          .carousel-indicator.active { width: 56px; }
          .carousel-nav { display: none; }
          .cat-card { height: 220px; border-radius: 14px; }
          .cat-info { padding: 16px; }
          .premium-title { font-size: 1.6rem; margin-bottom: 24px; }
          .product-card-elite { border-radius: 14px; padding: 10px; }
          .product-img-elite { height: 170px; border-radius: 10px; }
          .listing-cta { padding: 28px 18px; border-radius: 16px; }
        }
        @media (max-width: 575px) {
          .hero-slide { height: 320px; border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
          .hero-content { padding: 0 18px; max-width: 100%; }
          .hero-title { font-size: 1.8rem; margin-bottom: 12px; }
          .hero-desc { font-size: 0.82rem; margin-bottom: 16px; line-height: 1.4; }
          .hero-badge { font-size: 0.65rem; padding: 6px 12px; letter-spacing: 1.5px; }
          .hero-carousel { padding-bottom: 20px; }
          .cat-card { height: 180px; }
          .premium-title { font-size: 1.4rem; }
          .product-img-elite { height: 150px; }
          .listing-cta { padding: 24px 16px; }
          .listing-cta h2 { font-size: 1.4rem !important; }
        }
        .btn-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; transition: none; border: 2px solid #000; background: #fff; color: #000; text-decoration: none; }

        /* How It Works */
        .how-it-works { padding: 100px 0; background: #000; color: #fff; position: relative; overflow: hidden; }
        .how-it-works::before { content: ''; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255,198,58,0.08) 0%, transparent 70%); border-radius: 50%; }
        .step-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px 30px; text-align: center; transition: none; height: 100%; position: relative; }
        .step-number { width: 60px; height: 60px; border-radius: 16px; background: var(--primary-yellow); color: #000; font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; box-shadow: 0 10px 30px rgba(255,198,58,0.3); }
        .step-icon { font-size: 2.5rem; margin-bottom: 20px; display: block; }

        /* Testimonials */
        .testimonials { padding: 100px 0; background: #fff; }
        .testimonial-card { background: #fff; border: 1px solid #eee; border-radius: 24px; padding: 40px; transition: none; height: 100%; position: relative; }
        .testimonial-card::before { content: '\u201C'; position: absolute; top: 20px; left: 25px; font-size: 5rem; color: rgba(255,198,58,0.2); font-family: Georgia, serif; line-height: 1; }
        .testimonial-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-yellow); }
        .star-rating { color: var(--primary-yellow); font-size: 0.85rem; letter-spacing: 2px; }

        /* Stats Banner */
        .stats-banner { padding: 80px 0; background: linear-gradient(135deg, #000 0%, #1a1a1a 100%); color: #fff; position: relative; overflow: hidden; }
        .stats-banner::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, var(--primary-yellow), transparent); }
        .stat-item { text-align: center; padding: 20px; }
        .stat-value { font-family: 'Outfit', sans-serif; font-size: 3.5rem; font-weight: 900; color: var(--primary-yellow); line-height: 1; margin-bottom: 8px; }
        .stat-label { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 2px; }

        /* Trust / Features Strip */
        .trust-strip { padding: 80px 0; background: #fff; }
        .trust-item { text-align: center; padding: 20px; }
        .trust-icon { width: 70px; height: 70px; border-radius: 20px; background: #fff; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.8rem; color: var(--primary-yellow); transition: none; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }

        /* Footer */
        .main-footer { background-color: #3D3B3B; color: #b2bec3; padding: 66px 0 4px; width: 100%; margin-top: 0; }
        .footer-brand { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 25px; }
        .footer-description { font-size: 1rem; line-height: 1.8; max-width: 380px; color: #b2bec3; }
        .footer-heading { font-weight: 600; font-size: 1.2rem; color: #fff; margin-bottom: 30px; }
        .footer-links { list-style: none; padding: 0; margin: 0; }
        .footer-links li { margin-bottom: 4px; }
        .footer-links a { color: #fff; text-decoration: none; font-size: 1rem; transition: none; }
        .social-icons-box a { color: #fff; font-size: 1.1rem; margin-right: 25px; transition: none; text-decoration: none; }
        .copyright-bar { text-align: center; padding: 10px 0; margin-top: 12px; border-top: 1px solid #444; font-size: 0.95rem; color: #636e72; background-color: #1e2124; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #ccc; }

        @media (max-width: 768px) {
          .hero-slide { height: 400px; border-radius: 20px; }
          .hero-content { padding: 0 30px; }
          .hero-title { font-size: 2.5rem; }
          .hero-desc { font-size: 1rem; }
          .cat-card { height: 250px; }
          .premium-title { font-size: 1.8rem; }
          .listing-cta { padding: 30px; }
          .btn-circle { width: 90px; height: 90px; font-size: 0.8rem; }
          .search-wrapper { width: 100% !important; margin: 10px 0 !important; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <div className="buyer-landing" style={{ paddingTop: 70 }}>
        {/* ===== HEADER ===== */}
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
                                <Link key={cat.id} href={`/buyer/browse?category=${cat.id}`} className="mega-link">{cat.name || cat.category_name}</Link>
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
              {/* Cart Icon */}
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
                      <small className="text-muted" style={{ fontSize: 10 }}>PRO BUYER</small>
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
                        href={`/${user.role === 'super_admin' ? 'superadmin' : user.role === 'admin' ? 'admin' : 'buyer'}`}
                        className="dd-item"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <i className="bi bi-lightning-charge text-warning"></i> My Portal
                      </Link>
                      {!['admin', 'super_admin'].includes(user.role) && (
                        <>
                          <Link href="/buyer/my-offers" className="dd-item" onClick={() => setShowUserDropdown(false)}>
                            <i className="bi bi-handbag"></i> My Offers
                          </Link>
                          {user.user_type === 'both' && (
                            <Link href="/seller" className="dd-item" onClick={() => setShowUserDropdown(false)}>
                              <i className="bi bi-shop"></i> Seller Hub
                            </Link>
                          )}
                        </>
                      )}
                      <hr style={{ margin: '4px 16px', borderColor: '#f0f0f0' }} />
                      <button
                        className="dd-item text-danger"
                        onClick={() => { logout(); window.location.href = '/login'; }}
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
                <Link href={`/${user.role === 'super_admin' ? 'superadmin' : user.role === 'admin' ? 'admin' : 'buyer'}`} className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                  <i className="bi bi-speedometer2" style={{ color: 'var(--primary-yellow)' }}></i>
                  My Portal
                </Link>
                <Link href="/buyer/my-offers" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                  <i className="bi bi-handbag" style={{ color: '#6c757d' }}></i>
                  My Offers
                </Link>
                <Link href="/cart" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
              <i className="bi bi-heart"></i>
                  Wishlist {cartCount > 0 && <span className="badge rounded-pill" style={{ background: 'var(--primary-yellow)', color: '#000', fontSize: '0.7rem' }}>{cartCount}</span>}
                </Link>
                {user.user_type === 'both' && (
                  <Link href="/seller" className="mobile-nav-item" onClick={() => setMobileNavOpen(false)}>
                    <i className="bi bi-shop" style={{ color: '#6c757d' }}></i>
                    Seller Hub
                  </Link>
                )}
                <div className="mobile-nav-divider" />
                <button
                  className="mobile-nav-item"
                  style={{ color: '#dc3545' }}
                  onClick={() => { setMobileNavOpen(false); logout(); window.location.href = '/login'; }}
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

        {/* ===== HERO SECTION ===== */}
        <div className="container">
          <div className="hero-carousel" style={{ position: 'relative' }}>
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                className="hero-slide"
                style={{
                  display: activeSlide === idx ? 'flex' : 'none',
                  animation: activeSlide === idx ? 'fadeIn 0.6s ease' : undefined,
                }}
              >
                <div className="hero-overlay"></div>
                <img src={slide.img} className="hero-img" alt="Hero" />
                <div className="hero-content">
                  <span className="hero-badge">{slide.badge}</span>
                  <h1 className="hero-title">
                    {slide.title1} <br />
                    <span className="text-warning-gradient">{slide.title2}</span>
                  </h1>
                  <p className="hero-desc">{slide.desc}</p>
                  <Link
                    href={slide.btnHref}
                    className="btn btn-warning btn-lg rounded-pill px-5 fw-bold py-3"
                  >
                    {slide.btnText}
                  </Link>
                </div>

                {/* Nav buttons */}
                <button
                  className="carousel-nav prev"
                  onClick={() => setActiveSlide((activeSlide - 1 + heroSlides.length) % heroSlides.length)}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button
                  className="carousel-nav next"
                  onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>

                {/* Edit button for superadmin */}
                <EditBtn label="Edit Slides" onClick={() => { setEditTemp([...heroSlides]); setEditModal('heroSlides'); }} />
              </div>
            ))}

            {/* Indicators */}
            <div className="carousel-indicators-custom">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  className={`carousel-indicator ${activeSlide === idx ? 'active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ===== BROWSE BY ESSENCE (Dynamic Category Cards) ===== */}
        <section style={{ padding: '80px 0', background: '#fff', position: 'relative' }}>

          {/* ── Superadmin Toolbar (full-width, always visible) ── */}
          {isSuperAdmin && (
            <div style={{
              background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
              padding: '14px 0',
              marginBottom: 0,
              borderBottom: '3px solid #ffc63a',
            }}>
              <div className="container">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      background: '#ffc63a', color: '#000', borderRadius: 6,
                      padding: '3px 10px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 1,
                    }}>
                      SUPERADMIN
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
                      <i className="bi bi-grid-3x3-gap me-1" style={{ color: '#ffc63a' }}></i>
                      Category Cards — loaded from database
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => {
                        setEditTemp(JSON.parse(JSON.stringify(displayCategories)));
                        setEditModal('displayCategories');
                      }}
                      style={{
                        background: '#ffc63a', color: '#000', border: 'none',
                        borderRadius: 8, padding: '8px 18px', fontSize: '0.85rem',
                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <i className="bi bi-pencil-square"></i> Edit Cards
                    </button>
                    <button
                      onClick={() => {
                        const newCard = { name: 'New Category', img: '' };
                        const updated = [...displayCategories, newCard];
                        setDisplayCategories(updated);
                        setEditTemp(JSON.parse(JSON.stringify(updated)));
                        setEditModal('displayCategories');
                      }}
                      style={{
                        background: 'transparent', color: '#ffc63a', border: '2px solid #ffc63a',
                        borderRadius: 8, padding: '8px 18px', fontSize: '0.85rem',
                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <i className="bi bi-plus-circle"></i> Add New Card
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="container" style={{ paddingTop: 40 }}>
            <div className="row g-4">
              <div className="col-lg-12" style={{ position: 'relative' }}>
                <h2 className="premium-title fw-900">{sectionTitleCategories}</h2>
                <EditBtnInline label="Edit Title" onClick={() => { setEditTemp(sectionTitleCategories); setEditModal('sectionTitleCategories'); }} />
              </div>

              {/* Category Cards */}
              {displayCategories.map((cat, i) => (
                <div key={i} className="col-6 col-lg-3">
                  <div style={{ position: 'relative' }}>
                    <Link href={`/buyer/browse?search=${encodeURIComponent(cat.name.toLowerCase())}`} style={{ textDecoration: 'none' }}>
                      <div className="cat-card">
                        {cat.img ? (
                          <img
                            src={cat.img.startsWith('http') ? cat.img : `http://localhost:8080/${cat.img}`}
                            alt={cat.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a1a, #333)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                            <i className="bi bi-image" style={{ fontSize: '3rem', color: 'rgba(255,198,58,0.4)' }}></i>
                            <span style={{ color: 'rgba(255,198,58,0.5)', fontSize: '0.75rem', fontWeight: 600 }}>No image set</span>
                          </div>
                        )}
                        <div className="cat-info">
                          <h4 className="fw-800 mb-0">{cat.name}</h4>
                          <small className="opacity-75">View Collections <i className="bi bi-arrow-right"></i></small>
                        </div>
                      </div>
                    </Link>

                    {/* Per-card edit button for superadmin */}
                    {isSuperAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditTemp(JSON.parse(JSON.stringify(displayCategories)));
                          setEditModal('displayCategories');
                        }}
                        title={`Edit "${cat.name}" card`}
                        style={{
                          position: 'absolute', top: 10, right: 10, zIndex: 20,
                          background: 'rgba(255,198,58,0.95)', color: '#000', border: 'none',
                          borderRadius: 8, padding: '5px 10px', fontSize: '0.72rem',
                          fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                        }}
                      >
                        <i className="bi bi-pencil-fill"></i> Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty state for superadmin */}
              {displayCategories.length === 0 && isSuperAdmin && (
                <div className="col-12">
                  <div style={{
                    border: '2px dashed #ffc63a', borderRadius: 20, padding: '60px 30px',
                    textAlign: 'center', background: '#fffef5',
                  }}>
                    <i className="bi bi-grid-3x3-gap" style={{ fontSize: '3rem', color: '#ffc63a' }}></i>
                    <p className="fw-bold mt-3 mb-2">No category cards yet</p>
                    <p className="text-muted small mb-4">Click "Add New Card" above to create your first landing page category card.</p>
                    <button
                      onClick={() => { setEditTemp([{ name: 'New Category', img: '' }]); setEditModal('displayCategories'); }}
                      style={{ background: '#ffc63a', color: '#000', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Add First Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== FEATURED PRODUCTS ===== */}
        <section style={{ padding: '80px 0', background: '#fafafa' }}>
          <div className="container">
            <div className="row g-4">
              <div className="col-lg-12 d-flex justify-content-between align-items-end mb-2">
                <div style={{ position: 'relative' }}>
                  <h2 className="premium-title fw-900 mb-0">{sectionTitleProducts}</h2>
                  <EditBtnInline label="Edit Title" onClick={() => { setEditTemp(sectionTitleProducts); setEditModal('sectionTitleProducts'); }} />
                </div>
                <Link href="/buyer/browse" className="text-dark fw-bold" style={{ textDecoration: 'none' }}>
                  View All <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            {featuredProducts.map((p) => (
              <div key={p.id} className="col-md-6 col-lg-3">
                <Link href={`/buyer/product/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="product-card-elite">
                    <div className="product-img-elite">
                      {(p.image || p.primary_image) ? (
                        <img
                          src={(() => { const img = p.image || p.primary_image; if (!img) return ''; return img.startsWith('http') ? img : img.startsWith('uploads/') ? `http://localhost:8080/${img}` : `http://localhost:8080/uploads/products/${img}`; })()}
                          alt={p.title}
                        />
                      ) : (
                        <i className="bi bi-image" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                      )}
                    </div>
                    <div className="ps-2">
                      <span
                        className="badge bg-light text-dark mb-2 text-uppercase fw-bold"
                        style={{ fontSize: 10 }}
                      >
                        {p.listing_type}
                      </span>
                      <div className="d-flex gap-2 flex-wrap mb-1">
                        {(p.brand_name || p.brand) && (
                          <span className="badge bg-white text-dark border text-uppercase" style={{ fontSize: 9 }}>
                            <i className="bi bi-award me-1" style={{ color: '#ffc63a' }}></i>
                            {p.brand_name || p.brand}
                          </span>
                        )}
                      </div>
                      <h6 className="fw-800 mb-1 text-truncate">{p.title}</h6>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <span className="fw-900" style={{ fontSize: '1.25rem' }}>
                          &#8377;{Number(
                            p.listing_type === 'sell'
                              ? (p.selling_price || p.price || p.original_price || 0)
                              : (p.rental_cost || p.price || 0)
                          ).toLocaleString('en-IN')}
                        </span>
                        <i className="bi bi-heart text-muted"></i>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {featuredProducts.length === 0 && (
              <div className="col-12 text-center py-5">
                <i className="bi bi-search" style={{ fontSize: '3rem', color: '#ddd' }}></i>
                <p className="text-muted mt-3">No products available yet.</p>
              </div>
            )}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="how-it-works" style={{ position: 'relative' }}>
          <EditBtn label="Edit Steps" onClick={() => { setEditTemp([...howSteps]); setEditModal('howSteps'); }} />
          <div className="container">
            <div className="text-center mb-5">
              <span style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(255,198,58,0.15)', color: '#ffc63a', borderRadius: 50, fontSize: '0.8rem', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>SIMPLE PROCESS</span>
              <h2 className="fw-900" style={{ fontSize: '3rem', fontFamily: "'Outfit', sans-serif" }}>How Flex Market Works</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>Buy, sell, or rent in just a few steps. It&apos;s that simple.</p>
            </div>
            <div className="row g-4">
              {howSteps.map((step, i) => (
                <div key={i} className="col-md-6 col-lg-3">
                  <div className="step-card">
                    <div className="step-number">{step.num}</div>
                    <i className={`bi ${step.icon} step-icon`} style={{ color: '#ffc63a' }}></i>
                    <h5 className="fw-800 mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>{step.title}</h5>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== STATS BANNER ===== */}
        <section className="stats-banner" style={{ position: 'relative' }}>
          <EditBtn label="Edit Stats" onClick={() => { setEditTemp([...statsBanner]); setEditModal('statsBanner'); }} />
          <div className="container">
            <div className="row">
              {statsBanner.map((stat, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="stat-item">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TRUST FEATURES ===== */}
        <section className="trust-strip" style={{ position: 'relative' }}>
          <EditBtn label="Edit Features" onClick={() => { setEditTemp([...trustFeatures]); setEditModal('trustFeatures'); }} />
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="premium-title fw-900" style={{ display: 'inline-block' }}>Why Choose Us.</h2>
            </div>
            <div className="row">
              {trustFeatures.map((item, i) => (
                <div key={i} className="col-6 col-lg-3">
                  <div className="trust-item">
                    <div className="trust-icon"><i className={`bi ${item.icon}`}></i></div>
                    <h6 className="fw-800" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.title}</h6>
                    <p className="text-muted small mb-0">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="testimonials" style={{ position: 'relative' }}>
          <EditBtn label="Edit Reviews" onClick={() => { setEditTemp([...testimonials]); setEditModal('testimonials'); }} />
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="premium-title fw-900">What Our Users Say.</h2>
            </div>
            <div className="row g-4">
              {testimonials.map((t, i) => (
                <div key={i} className="col-md-4">
                  <div className="testimonial-card">
                    <div className="star-rating mb-3">
                      {Array.from({ length: 5 }, (_, j) => (
                        <i key={j} className={`bi bi-star${j < t.stars ? '-fill' : ''}`}></i>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#444', marginBottom: 25, minHeight: 120 }}>{t.text}</p>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#000', color: '#ffc63a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem' }}>
                        {t.avatar}
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.name}</div>
                        <small className="text-muted">{t.role}</small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== START SELLING CTA ===== */}
        <section style={{ padding: '80px 0', background: '#fff' }}>
          <div className="container">
            <div className="listing-cta" style={{ position: 'relative' }}>
              <EditBtn label="Edit CTA" onClick={() => { setEditTemp({ title: ctaTitle, subtitle: ctaSubtitle }); setEditModal('cta'); }} />
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <h2 className="fw-900 mb-3 display-5" dangerouslySetInnerHTML={{ __html: ctaTitle }}></h2>
                  <p className="lead text-muted mb-0">{ctaSubtitle}</p>
                </div>
                <div className="col-lg-4 d-flex justify-content-center justify-content-lg-end mt-4 mt-lg-0">
                  <div className="d-flex gap-4">
                    <Link href="/seller" className="btn-circle">
                      <i className="bi bi-tag" style={{ fontSize: '2rem', marginBottom: 4 }}></i>
                      SELL
                    </Link>
                    <Link href="/buyer" className="btn-circle">
                      <i className="bi bi-clock-history" style={{ fontSize: '2rem', marginBottom: 4 }}></i>
                      RENT
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="main-footer" style={{ position: 'relative' }}>
          <EditBtn label="Edit Footer" onClick={() => {
            setEditTemp({ description: footerDescription, quickLinks: [...footerQuickLinks], policyLinks: [...footerPolicyLinks], socialLinks: [...footerSocialLinks] });
            setEditModal('footer');
          }} />
          <div className="container">
            <div className="row gx-5">
              <div className="col-lg-4 col-md-6 mb-4 mb-lg-0">
                <h2 className="footer-brand">Flex Market</h2>
                <p className="footer-description">{footerDescription}</p>
              </div>
              <div className="col-lg-2 col-md-6 mb-4 mb-lg-0">
                <h5 className="footer-heading">Quick Links</h5>
                <ul className="footer-links">
                  {footerQuickLinks.map((lnk, i) => (
                    <li key={i}><Link href={lnk.href}>{lnk.label}</Link></li>
                  ))}
                </ul>
              </div>
              <div className="col-lg-3 col-md-6 mb-4 mb-lg-0">
                <h5 className="footer-heading">Categories</h5>
                <ul className="footer-links">
                  <li><Link href="/buyer/browse">All Products</Link></li>
                  {listingTypes.slice(0, 5).map((lt) => (
                    <li key={lt.id}>
                      <Link href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}>{lt.type_name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-lg-3 col-md-6">
                <h5 className="footer-heading">Our Policies</h5>
                <ul className="footer-links mb-4">
                  {footerPolicyLinks.map((lnk, i) => (
                    <li key={i}><a href={lnk.href}>{lnk.label}</a></li>
                  ))}
                </ul>
                <div className="social-icons-box d-flex">
                  {footerSocialLinks.map((s, i) => (
                    <a key={i} href={s.href}><i className={`bi ${s.icon}`}></i></a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="copyright-bar">
            <div className="container text-center">
              &copy; {new Date().getFullYear()} Flex Market. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* ===== EDIT MODALS (superadmin only) ===== */}

      {/* Hero Slides Editor */}
      <Modal title="Edit Hero Slides" open={editModal === 'heroSlides'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((slide: HeroSlide, i: number) => (
            <div key={i} className="card mb-3 border" style={{ borderRadius: 12 }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">Slide {i + 1}</h6>
                  {editTemp.length > 1 && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setEditTemp((prev: HeroSlide[]) => prev.filter((_: any, idx: number) => idx !== i))}>
                      <i className="bi bi-trash"></i>
                    </button>
                  )}
                </div>
                <div className="row g-2">
                  <div className="col-6"><label className="form-label small fw-bold">Badge</label><input className="form-control" style={inputStyle} value={slide.badge} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], badge: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-6"><label className="form-label small fw-bold">Title Line 1</label><input className="form-control" style={inputStyle} value={slide.title1} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], title1: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-6"><label className="form-label small fw-bold">Title Line 2 (highlighted)</label><input className="form-control" style={inputStyle} value={slide.title2} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], title2: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-6"><label className="form-label small fw-bold">Button Text</label><input className="form-control" style={inputStyle} value={slide.btnText} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], btnText: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-12"><label className="form-label small fw-bold">Description</label><textarea className="form-control" style={inputStyle} rows={2} value={slide.desc} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], desc: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-6"><label className="form-label small fw-bold">Button Link</label><input className="form-control" style={inputStyle} value={slide.btnHref} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], btnHref: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-6"><label className="form-label small fw-bold">Image URL</label><input className="form-control" style={inputStyle} value={slide.img} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], img: e.target.value }; setEditTemp(n); }} /></div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditTemp((prev: HeroSlide[]) => [...prev, { badge: 'NEW', title1: 'Title', title2: 'Highlight.', desc: 'Description', btnText: 'Explore', btnHref: '/buyer/browse', img: '' }])}>
            <i className="bi bi-plus-circle me-1"></i> Add Slide
          </button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setHeroSlides(editTemp); saveContent({ hero_slides: JSON.stringify(editTemp) }); }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Display Categories Editor — with image upload */}
      <Modal title="Edit Category Cards" open={editModal === 'displayCategories'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((cat: DisplayCategory, i: number) => (
            <div key={i} className="card mb-3 border" style={{ borderRadius: 14, overflow: 'hidden' }}>
              {/* Image preview strip */}
              {cat.img && (
                <div style={{ height: 120, background: '#111', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={cat.img.startsWith('http') ? cat.img : `http://localhost:8080/${cat.img}`}
                    alt={cat.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                  <span style={{ position: 'absolute', bottom: 10, left: 14, color: '#fff', fontWeight: 700, fontSize: '1rem', fontFamily: "'Outfit', sans-serif" }}>{cat.name || 'Card ' + (i + 1)}</span>
                </div>
              )}
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0" style={{ fontFamily: "'Outfit', sans-serif" }}>Card {i + 1}</h6>
                  {editTemp.length > 1 && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setEditTemp((prev: DisplayCategory[]) => prev.filter((_: any, idx: number) => idx !== i))}
                    >
                      <i className="bi bi-trash"></i> Remove
                    </button>
                  )}
                </div>

                {/* Name field */}
                <div className="mb-3">
                  <label className="form-label small fw-bold">Card Name</label>
                  <input
                    className="form-control"
                    style={inputStyle}
                    placeholder="e.g. Clothing, Electronics…"
                    value={cat.name}
                    onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], name: e.target.value }; setEditTemp(n); }}
                  />
                </div>

                {/* Image upload */}
                <div className="mb-2">
                  <label className="form-label small fw-bold">Card Image</label>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    {/* File upload button */}
                    <label
                      htmlFor={`card-img-upload-${i}`}
                      style={{
                        background: imgUploading[i] ? '#aaa' : '#000', color: '#ffc63a',
                        border: 'none', borderRadius: 8, padding: '7px 16px',
                        fontSize: '0.8rem', fontWeight: 700, cursor: imgUploading[i] ? 'wait' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                      }}
                    >
                      {imgUploading[i] ? <><i className="bi bi-hourglass-split"></i> Uploading…</> : <><i className="bi bi-cloud-upload"></i> Upload Image</>}
                    </label>
                    <input
                      id={`card-img-upload-${i}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadCardImage(file, i);
                        if (url) { const n = [...editTemp]; n[i] = { ...n[i], img: url }; setEditTemp(n); }
                        else alert('Image upload failed. Please try again.');
                        e.target.value = '';
                      }}
                    />
                    <span style={{ color: '#999', fontSize: '0.75rem' }}>or paste URL:</span>
                  </div>
                  <input
                    className="form-control mt-2"
                    style={{ ...inputStyle, fontSize: '0.8rem' }}
                    placeholder="https://… or leave blank after uploading"
                    value={cat.img}
                    onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], img: e.target.value }; setEditTemp(n); }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setEditTemp((prev: DisplayCategory[]) => [...prev, { name: 'New Category', img: '' }])}
          >
            <i className="bi bi-plus-circle me-1"></i> Add Card
          </button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button
            className="btn"
            style={btnGold}
            disabled={saving || Object.values(imgUploading).some(Boolean)}
            onClick={() => {
              setDisplayCategories(editTemp);
              saveContent({ display_categories: JSON.stringify(editTemp) });
            }}
          >
            {saving ? 'Saving…' : 'Save Cards'}
          </button>
        </div>
      </Modal>

      {/* Section Title - Categories */}
      <Modal title="Edit Section Title" open={editModal === 'sectionTitleCategories'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <label className="form-label fw-bold">Categories Section Title</label>
          <input className="form-control" style={inputStyle} value={editTemp || ''} onChange={(e) => setEditTemp(e.target.value)} />
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setSectionTitleCategories(editTemp); saveContent({ section_title_categories: editTemp }); }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* Section Title - Products */}
      <Modal title="Edit Section Title" open={editModal === 'sectionTitleProducts'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <label className="form-label fw-bold">Products Section Title</label>
          <input className="form-control" style={inputStyle} value={editTemp || ''} onChange={(e) => setEditTemp(e.target.value)} />
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setSectionTitleProducts(editTemp); saveContent({ section_title_products: editTemp }); }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* CTA Editor */}
      <Modal title="Edit Call-to-Action Section" open={editModal === 'cta'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3">
            <label className="form-label fw-bold">Title (HTML allowed)</label>
            <textarea className="form-control" style={inputStyle} rows={3} value={editTemp?.title || ''} onChange={(e) => setEditTemp({ ...editTemp, title: e.target.value })} />
            <small className="text-muted">Use &lt;span class=&quot;text-warning&quot;&gt;...&lt;/span&gt; for yellow highlight, &lt;br /&gt; for line break</small>
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">Subtitle</label>
            <textarea className="form-control" style={inputStyle} rows={2} value={editTemp?.subtitle || ''} onChange={(e) => setEditTemp({ ...editTemp, subtitle: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setCtaTitle(editTemp.title); setCtaSubtitle(editTemp.subtitle); saveContent({ cta_title: editTemp.title, cta_subtitle: editTemp.subtitle }); }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* Footer Editor */}
      <Modal title="Edit Footer" open={editModal === 'footer'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="mb-4">
            <label className="form-label fw-bold">Footer Description</label>
            <textarea className="form-control" style={inputStyle} rows={3} value={editTemp?.description || ''} onChange={(e) => setEditTemp({ ...editTemp, description: e.target.value })} />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Quick Links</label>
            {editTemp?.quickLinks?.map((lnk: any, i: number) => (
              <div key={i} className="row g-2 mb-2 align-items-center">
                <div className="col-5"><input className="form-control form-control-sm" style={inputStyle} placeholder="Label" value={lnk.label} onChange={(e) => { const n = [...editTemp.quickLinks]; n[i] = { ...n[i], label: e.target.value }; setEditTemp({ ...editTemp, quickLinks: n }); }} /></div>
                <div className="col-5"><input className="form-control form-control-sm" style={inputStyle} placeholder="URL" value={lnk.href} onChange={(e) => { const n = [...editTemp.quickLinks]; n[i] = { ...n[i], href: e.target.value }; setEditTemp({ ...editTemp, quickLinks: n }); }} /></div>
                <div className="col-2"><button className="btn btn-sm btn-outline-danger w-100" onClick={() => setEditTemp({ ...editTemp, quickLinks: editTemp.quickLinks.filter((_: any, idx: number) => idx !== i) })}><i className="bi bi-trash"></i></button></div>
              </div>
            ))}
            <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => setEditTemp({ ...editTemp, quickLinks: [...(editTemp.quickLinks || []), { label: '', href: '/' }] })}><i className="bi bi-plus me-1"></i>Add Link</button>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Policy Links</label>
            {editTemp?.policyLinks?.map((lnk: any, i: number) => (
              <div key={i} className="row g-2 mb-2 align-items-center">
                <div className="col-5"><input className="form-control form-control-sm" style={inputStyle} placeholder="Label" value={lnk.label} onChange={(e) => { const n = [...editTemp.policyLinks]; n[i] = { ...n[i], label: e.target.value }; setEditTemp({ ...editTemp, policyLinks: n }); }} /></div>
                <div className="col-5"><input className="form-control form-control-sm" style={inputStyle} placeholder="URL" value={lnk.href} onChange={(e) => { const n = [...editTemp.policyLinks]; n[i] = { ...n[i], href: e.target.value }; setEditTemp({ ...editTemp, policyLinks: n }); }} /></div>
                <div className="col-2"><button className="btn btn-sm btn-outline-danger w-100" onClick={() => setEditTemp({ ...editTemp, policyLinks: editTemp.policyLinks.filter((_: any, idx: number) => idx !== i) })}><i className="bi bi-trash"></i></button></div>
              </div>
            ))}
            <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => setEditTemp({ ...editTemp, policyLinks: [...(editTemp.policyLinks || []), { label: '', href: '#' }] })}><i className="bi bi-plus me-1"></i>Add Link</button>
          </div>

          <div className="mb-0">
            <label className="form-label fw-bold">Social Links</label>
            {editTemp?.socialLinks?.map((s: any, i: number) => (
              <div key={i} className="row g-2 mb-2 align-items-center">
                <div className="col-5">
                  <select className="form-select form-select-sm" style={inputStyle} value={s.icon} onChange={(e) => { const n = [...editTemp.socialLinks]; n[i] = { ...n[i], icon: e.target.value }; setEditTemp({ ...editTemp, socialLinks: n }); }}>
                    <option value="bi-facebook">Facebook</option><option value="bi-twitter">Twitter / X</option><option value="bi-instagram">Instagram</option><option value="bi-linkedin">LinkedIn</option><option value="bi-youtube">YouTube</option><option value="bi-tiktok">TikTok</option><option value="bi-pinterest">Pinterest</option><option value="bi-whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="col-5"><input className="form-control form-control-sm" style={inputStyle} placeholder="URL" value={s.href} onChange={(e) => { const n = [...editTemp.socialLinks]; n[i] = { ...n[i], href: e.target.value }; setEditTemp({ ...editTemp, socialLinks: n }); }} /></div>
                <div className="col-2"><button className="btn btn-sm btn-outline-danger w-100" onClick={() => setEditTemp({ ...editTemp, socialLinks: editTemp.socialLinks.filter((_: any, idx: number) => idx !== i) })}><i className="bi bi-trash"></i></button></div>
              </div>
            ))}
            <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => setEditTemp({ ...editTemp, socialLinks: [...(editTemp.socialLinks || []), { icon: 'bi-facebook', href: '#' }] })}><i className="bi bi-plus me-1"></i>Add Social</button>
          </div>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => {
            setFooterDescription(editTemp.description);
            setFooterQuickLinks(editTemp.quickLinks);
            setFooterPolicyLinks(editTemp.policyLinks);
            setFooterSocialLinks(editTemp.socialLinks);
            saveContent({
              footer_description: editTemp.description,
              footer_quick_links: JSON.stringify(editTemp.quickLinks),
              footer_policy_links: JSON.stringify(editTemp.policyLinks),
              footer_social_links: JSON.stringify(editTemp.socialLinks),
            });
          }}>
            {saving ? 'Saving...' : 'Save Footer'}
          </button>
        </div>
      </Modal>

      {/* How It Works Editor */}
      <Modal title="Edit How It Works Steps" open={editModal === 'howSteps'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((step: any, i: number) => (
            <div key={i} className="card mb-3 border" style={{ borderRadius: 12 }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">Step {i + 1}</h6>
                  {editTemp.length > 1 && <button className="btn btn-sm btn-outline-danger" onClick={() => setEditTemp(editTemp.filter((_: any, idx: number) => idx !== i))}><i className="bi bi-trash"></i></button>}
                </div>
                <div className="row g-2">
                  <div className="col-3"><label className="form-label small fw-bold">Number</label><input className="form-control" style={inputStyle} value={step.num} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], num: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-4"><label className="form-label small fw-bold">Icon (bi-*)</label><input className="form-control" style={inputStyle} value={step.icon} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], icon: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-5"><label className="form-label small fw-bold">Title</label><input className="form-control" style={inputStyle} value={step.title} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], title: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-12"><label className="form-label small fw-bold">Description</label><textarea className="form-control" style={inputStyle} rows={2} value={step.desc} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], desc: e.target.value }; setEditTemp(n); }} /></div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditTemp([...(editTemp || []), { num: String((editTemp?.length || 0) + 1).padStart(2, '0'), icon: 'bi-star', title: '', desc: '' }])}><i className="bi bi-plus-circle me-1"></i> Add Step</button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setHowSteps(editTemp); saveContent({ how_it_works_steps: JSON.stringify(editTemp) }); }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Stats Banner Editor */}
      <Modal title="Edit Stats Banner" open={editModal === 'statsBanner'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((stat: any, i: number) => (
            <div key={i} className="row g-2 mb-3 align-items-end">
              <div className="col-4"><label className="form-label small fw-bold">Value</label><input className="form-control" style={inputStyle} value={stat.value} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], value: e.target.value }; setEditTemp(n); }} placeholder="e.g. 10K+" /></div>
              <div className="col-6"><label className="form-label small fw-bold">Label</label><input className="form-control" style={inputStyle} value={stat.label} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], label: e.target.value }; setEditTemp(n); }} placeholder="e.g. Products Listed" /></div>
              <div className="col-2">{editTemp.length > 1 && <button className="btn btn-sm btn-outline-danger w-100" onClick={() => setEditTemp(editTemp.filter((_: any, idx: number) => idx !== i))}><i className="bi bi-trash"></i></button>}</div>
            </div>
          ))}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditTemp([...(editTemp || []), { value: '', label: '' }])}><i className="bi bi-plus-circle me-1"></i> Add Stat</button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setStatsBanner(editTemp); saveContent({ stats_banner: JSON.stringify(editTemp) }); }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Trust Features Editor */}
      <Modal title="Edit Trust Features" open={editModal === 'trustFeatures'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((item: any, i: number) => (
            <div key={i} className="card mb-3 border" style={{ borderRadius: 12 }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">Feature {i + 1}</h6>
                  {editTemp.length > 1 && <button className="btn btn-sm btn-outline-danger" onClick={() => setEditTemp(editTemp.filter((_: any, idx: number) => idx !== i))}><i className="bi bi-trash"></i></button>}
                </div>
                <div className="row g-2">
                  <div className="col-4"><label className="form-label small fw-bold">Icon (bi-*)</label><input className="form-control" style={inputStyle} value={item.icon} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], icon: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-8"><label className="form-label small fw-bold">Title</label><input className="form-control" style={inputStyle} value={item.title} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], title: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-12"><label className="form-label small fw-bold">Description</label><textarea className="form-control" style={inputStyle} rows={2} value={item.desc} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], desc: e.target.value }; setEditTemp(n); }} /></div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditTemp([...(editTemp || []), { icon: 'bi-star', title: '', desc: '' }])}><i className="bi bi-plus-circle me-1"></i> Add Feature</button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => { setTrustFeatures(editTemp); saveContent({ trust_features: JSON.stringify(editTemp) }); }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Testimonials Editor */}
      <Modal title="Edit Testimonials" open={editModal === 'testimonials'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {Array.isArray(editTemp) && editTemp.map((t: any, i: number) => (
            <div key={i} className="card mb-3 border" style={{ borderRadius: 12 }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0">Review {i + 1}</h6>
                  {editTemp.length > 1 && <button className="btn btn-sm btn-outline-danger" onClick={() => setEditTemp(editTemp.filter((_: any, idx: number) => idx !== i))}><i className="bi bi-trash"></i></button>}
                </div>
                <div className="row g-2">
                  <div className="col-5"><label className="form-label small fw-bold">Name</label><input className="form-control" style={inputStyle} value={t.name} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], name: e.target.value }; setEditTemp(n); }} /></div>
                  <div className="col-4"><label className="form-label small fw-bold">Role</label><input className="form-control" style={inputStyle} value={t.role} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], role: e.target.value }; setEditTemp(n); }} placeholder="Buyer / Seller" /></div>
                  <div className="col-3"><label className="form-label small fw-bold">Stars (1-5)</label><input type="number" min="1" max="5" className="form-control" style={inputStyle} value={t.stars} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], stars: Number(e.target.value) }; setEditTemp(n); }} /></div>
                  <div className="col-12"><label className="form-label small fw-bold">Review Text</label><textarea className="form-control" style={inputStyle} rows={3} value={t.text} onChange={(e) => { const n = [...editTemp]; n[i] = { ...n[i], text: e.target.value }; setEditTemp(n); }} /></div>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditTemp([...(editTemp || []), { name: '', role: 'Buyer', avatar: '', text: '', stars: 5 }])}><i className="bi bi-plus-circle me-1"></i> Add Review</button>
        </div>
        <div className="modal-footer border-0 p-4 pt-0">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn" style={btnGold} disabled={saving} onClick={() => {
            const withAvatars = editTemp.map((t: any) => ({ ...t, avatar: t.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) }));
            setTestimonials(withAvatars); saveContent({ testimonials: JSON.stringify(withAvatars) });
          }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
