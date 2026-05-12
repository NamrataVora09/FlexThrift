'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import LandingNavbar from '../layout/LandingNavbar';
import Footer from '../layout/Footer';
import AdBanner from '../shared/AdBanner';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

interface AotStep { icon: string; title: string; desc: string; }
interface AotGuide { id: string; label: string; videoUrl: string; steps: AotStep[]; reversed?: boolean; }
interface AotSection { id: string; headline: string; subtitle: string; guides: AotGuide[]; }
interface CategoryCard {
  name: string;
  slug: string;
  label: string;
  desc: string;
  reverse: boolean;
  imgs: string[];
}

const DEFAULT_AOT: AotSection[] = [
  {
    id: 'aot-1',
    headline: 'The Art of the Transaction',
    subtitle: 'Master the high-end exchange. Whether acquiring or liberating assets, our process is surgical.',
    guides: [
      {
        id: 'guide-2',
        label: 'How to buy',
        videoUrl: '',
        steps: [
          { icon: 'bi-search-heart', title: 'Explore Curated', desc: 'Discover pieces that have survived our rigorous editorial selection process.' },
          { icon: 'bi-cart-check', title: 'Buy or Rent', desc: 'Choose permanent ownership or dynamic access via our flexible plans.' },
          { icon: 'bi-patch-check', title: 'Authenticate', desc: 'Every item is physically inspected by specialists before reaching your door.' },
        ],
      },
    ],
  },
];

function uid() { return Math.random().toString(36).slice(2); }

const videoPlaceholder = (isSuperAdmin: boolean) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
    <i className="bi bi-play-circle text-4xl text-[#D7B467]" />
    <span className="text-sm">{isSuperAdmin ? 'Add video URL in Edit' : 'Video coming soon'}</span>
  </div>
);

const videoBlock = (url: string, label: string, isSuperAdmin: boolean) => (
  <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
    {url
      ? <iframe className="w-full h-full" src={url} title={label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      : videoPlaceholder(isSuperAdmin)
    }
  </div>
);

function AotSectionBlock({ section, isSuperAdmin, onEdit, onDelete }: {
  section: AotSection; isSuperAdmin: boolean; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <section className="relative pb-16  bg-white w-full  ">

      {/* Superadmin controls */}
      {isSuperAdmin && (
        <div className="absolute top-4 right-6 flex gap-2">
          <button onClick={onEdit} className="bg-[#ffc63a] text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-[#e6b035] transition-colors">
            ✏️ Edit Section
          </button>
          <button onClick={onDelete} className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
            🗑 Delete
          </button>
        </div>
      )}

      <div className="w-full mx-auto px-2 sm:px-0 overflow-hidden">
        {/* Heading */}
        <h2 className="text-3xl font-bold  text-[80px]!  text-black text-center mb-3">{section.headline}</h2>
        <p className="text-gray-500 text-center text-[20px]! mb-[100px]! max-w-xl mx-auto mb-12">{section.subtitle}</p>

        {/* All guides have no steps → show videos in a row */}
        {section.guides.every(g => g.steps.length === 0) ? (
          <div className={`grid gap-5 w-full`} style={{ gridTemplateColumns: `repeat(${Math.min(section.guides.length, 3)}, 1fr)` }}>
            {section.guides.map(guide => (
              <div key={guide.id}>
                {guide.label && (
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-[50px] h-[1.5px] bg-[#D7B467]"></div>
                    <p className="text-center  font-semibold text-[30px] text-[#D7B467] uppercase tracking-widest"> {guide.label}</p>
                    <div className="w-[50px] h-[1.5px] bg-[#D7B467]"></div>
                  </div>
                )}
                {videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {section.guides.map((guide) => (
              <div key={guide.id} className=' mb-10'>
                {guide.label && (
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-[50px] h-[2px] bg-[#d6b06b]"></div>
                    <p className="text-center  font-semibold md:text-[30px] text-[18px] text-[#d6b06b] uppercase tracking-widest">{guide.label}</p>
                    <div className="w-[50px] h-[2px] bg-[#d6b06b]"></div>
                  </div>
                )}

                {guide.steps.length > 0 ? (
                  <div className={`grid grid-cols-1 gap-12 w-full items-center ${guide.reversed ? 'lg:grid-cols-[5fr_4fr]' : 'lg:grid-cols-[4fr_5fr]'}`}>
                    {guide.reversed ? (
                      <>
                        <div className="flex flex-col w-full">
                          {guide.steps.map((s, idx) => (
                            <div key={idx} className="flex gap-4 justify-start items-start text-left w-full min-w-0">
                              <div className="flex flex-col items-center shrink-0">
                                <p className="bg-[#d6b06b] text-[18px]! text-white rounded-full py-2.5 px-3 leading-none m-0!">{idx + 1}</p>
                                {idx < guide.steps.length - 1 && <div className="w-[2px] flex-1 min-h-[48px] bg-black opacity-40 my-1" />}
                              </div>
                              <h4 className="md:text-[16px]! text-[10px]!  text-black! font-[poppins]! font-light! leading-[1.7] flex-1 break-words" dangerouslySetInnerHTML={{ __html: s.desc }}></h4>
                            </div>
                          ))}
                        </div>
                        <div className="min-w-0">{videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}</div>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">{videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}</div>
                        <div className="flex flex-col w-full">
                          {guide.steps.map((s, idx) => (
                            <div key={idx} className="flex gap-4 justify-start items-start text-left w-full min-w-0">
                              <div className="flex flex-col items-center shrink-0">
                                <p className="bg-[#d6b06b] text-[18px]! text-white rounded-full py-2.5 px-3 leading-none m-0!">{idx + 1}</p>
                                {idx < guide.steps.length - 1 && <div className="w-[2px] flex-1 min-h-[48px] bg-black opacity-40 my-1" />}
                              </div>
                              <h4 className=" md:text-[16px]! text-[10px]! font-[poppins]!  text-black! font-light! leading-[1.7] flex-1 break-words" dangerouslySetInnerHTML={{ __html: s.desc }}></h4>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto min-w-0">{videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}</div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}

function AotEditModal({ section, onClose, onSave }: {
  section: AotSection; onClose: () => void; onSave: (s: AotSection) => void;
}) {
  const [draft, setDraft] = useState<AotSection>(JSON.parse(JSON.stringify(section)));
  const [activeGuide, setActiveGuide] = useState(0);

  const setField = (f: 'headline' | 'subtitle', v: string) => setDraft(d => ({ ...d, [f]: v }));
  const setGuideField = (gi: number, f: 'label' | 'videoUrl', v: string) =>
    setDraft(d => ({ ...d, guides: d.guides.map((g, i) => i === gi ? { ...g, [f]: v } : g) }));
  const addGuide = () => {
    const next: AotGuide = { id: uid(), label: 'New guide', videoUrl: '', steps: [] };
    setDraft(d => ({ ...d, guides: [...d.guides, next] }));
    setActiveGuide(draft.guides.length);
  };
  const removeGuide = (gi: number) => {
    setDraft(d => ({ ...d, guides: d.guides.filter((_, i) => i !== gi) }));
    setActiveGuide(Math.max(0, activeGuide - 1));
  };
  const addStep = (gi: number) =>
    setDraft(d => ({ ...d, guides: d.guides.map((g, i) => i === gi ? { ...g, steps: [...g.steps, { icon: 'bi-star', title: 'New step', desc: 'Description.' }] } : g) }));
  const removeStep = (gi: number, si: number) =>
    setDraft(d => ({ ...d, guides: d.guides.map((g, i) => i === gi ? { ...g, steps: g.steps.filter((_, j) => j !== si) } : g) }));
  const setStep = (gi: number, si: number, f: keyof AotStep, v: string) =>
    setDraft(d => ({ ...d, guides: d.guides.map((g, i) => i === gi ? { ...g, steps: g.steps.map((s, j) => j === si ? { ...s, [f]: v } : s) } : g) }));

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ffc63a] transition-colors";
  const labelCls = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h5 className="font-bold text-base text-white">Edit Section</h5>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          <div>
            <label className={labelCls}>Headline</label>
            <input className={inputCls} value={draft.headline} onChange={e => setField('headline', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <textarea className={inputCls} rows={2} value={draft.subtitle} onChange={e => setField('subtitle', e.target.value)} />
          </div>

          {/* Guide tabs */}
          <div className="flex flex-wrap gap-2">
            {draft.guides.map((g, gi) => (
              <button
                key={g.id}
                onClick={() => setActiveGuide(gi)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${activeGuide === gi ? 'bg-[#ffc63a] border-[#ffc63a] font-bold text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-[#ffc63a]'}`}
              >
                {g.label || `Guide ${gi + 1}`}
              </button>
            ))}
            <button onClick={addGuide} className="px-4 py-1.5 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:border-[#ffc63a] hover:text-[#ffc63a] transition-colors">
              + Add Guide
            </button>
          </div>

          {/* Active guide editor */}
          {draft.guides[activeGuide] && (
            <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h6 className="font-bold text-sm">Guide: {draft.guides[activeGuide].label}</h6>
                {draft.guides.length > 1 && (
                  <button onClick={() => removeGuide(activeGuide)} className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50 transition-colors">
                    Remove guide
                  </button>
                )}
              </div>
              <div>
                <label className={labelCls}>Guide Label</label>
                <input className={inputCls} value={draft.guides[activeGuide].label} onChange={e => setGuideField(activeGuide, 'label', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Video Embed URL</label>
                <input className={inputCls} placeholder="https://www.youtube.com/embed/VIDEO_ID" value={draft.guides[activeGuide].videoUrl} onChange={e => setGuideField(activeGuide, 'videoUrl', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft.guides[activeGuide].reversed}
                  onChange={e => setDraft(d => ({
                    ...d,
                    guides: d.guides.map((g, i) => i === activeGuide ? { ...g, reversed: e.target.checked } : g),
                  }))}
                  className="accent-[#ffc63a]"
                />
                Reverse layout (steps left, video right)
              </label>

              <label className={labelCls + " mt-1"}>Steps</label>
              {draft.guides[activeGuide].steps.map((s, si) => (
                <div key={si} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">Step {si + 1}</span>
                    {draft.guides[activeGuide].steps.length > 0 && (
                      <button onClick={() => removeStep(activeGuide, si)} className="text-xs text-red-400 hover:text-red-600 transition-colors">✕ Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Icon class</label>
                      <input className={inputCls} placeholder="bi-star" value={s.icon} onChange={e => setStep(activeGuide, si, 'icon', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Title</label>
                      <input className={inputCls} value={s.title} onChange={e => setStep(activeGuide, si, 'title', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <label className={labelCls}>Description</label>
                      <textarea className={inputCls} rows={2} value={s.desc} onChange={e => setStep(activeGuide, si, 'desc', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => addStep(activeGuide)} className="text-sm border border-dashed border-gray-300 rounded-lg py-2 text-gray-400 hover:border-[#ffc63a] hover:text-[#ffc63a] transition-colors">
                + Add Step
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => onSave(draft)} className="px-5 py-2 rounded-lg bg-[#ffc63a] hover:bg-[#e6b035] text-white font-bold text-sm transition-colors">Save Section</button>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_CARDS = [
  {
    name: 'Clothes',
    slug: 'clothes',
    label: 'Explore Clothing',
    desc: 'Curated fashion from top brands',
    reverse: false,
    imgs: [
      'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1200',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=1200',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200',
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    label: 'Shop Accessories',
    desc: 'Watches, bags & more',
    reverse: true,
    imgs: [
      'https://images.unsplash.com/photo-1596460107916-430662021049?q=80&w=1200',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200',
      'https://images.unsplash.com/photo-1509941943102-10c232535736?q=80&w=1200',
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    label: 'Find Your Fit',
    desc: 'Sneakers, heels & boots',
    reverse: false,
    imgs: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200',
      'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?q=80&w=1200',
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    label: 'Shop Electronics',
    desc: 'Gadgets & premium tech',
    reverse: true,
    imgs: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200',
      'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=1200',
      'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?q=80&w=1200',
    ],
  },
];



export default function HomePageClient() {
  const { user, isLoading, isAuthenticated, login, register, verifyOtp, sendOtp } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else if (user.user_type === 'buyer' || user.role === 'both') router.replace('/buyer/browse');
    }
  }, [isLoading, isAuthenticated, user]);

  const [sidebarMode, setSidebarMode] = useState<'buy' | 'sell'>('buy');
  const [sidebarView, setSidebarView] = useState<'listing' | 'login' | 'otp'>('listing');
  const [sidebarName, setSidebarName] = useState('');
  const [sidebarEmail, setSidebarEmail] = useState('');
  const [sidebarMobile, setSidebarMobile] = useState('');
  const [sidebarPassword, setSidebarPassword] = useState('');
  const [sidebarAddress, setSidebarAddress] = useState('');
  const [sidebarPinCode, setSidebarPinCode] = useState('');
  const [sidebarOtp, setSidebarOtp] = useState('');
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess('');
    setSidebarError('');
    const res = await sendOtp(sidebarEmail);
    setResendLoading(false);
    if (res.success) { setResendSuccess('OTP resent!'); startCooldown(); }
    else setSidebarError(res.message || 'Failed to resend OTP');
  };

  const handleRegister = async () => {
    setSidebarError('');
    setSidebarLoading(true);
    const res = await register({
      name: sidebarName,
      email: sidebarEmail,
      mobile: sidebarMobile,
      password: sidebarPassword,
      address: sidebarAddress,
      pin_code: sidebarPinCode,
      user_type: sidebarMode === 'sell' ? 'seller' : 'buyer',
    });
    setSidebarLoading(false);
    if (res.success) {
      setSidebarView('otp');
    } else {
      setSidebarError(res.message || 'Registration failed');
    }
  };

  const handleVerifyOtp = async () => {
    setSidebarError('');
    setSidebarLoading(true);
    const res = await verifyOtp(sidebarEmail, sidebarOtp);
    setSidebarLoading(false);
    if (!res.success) setSidebarError(res.message || 'Invalid OTP');
  };

  const handleLogin = async () => {
    setSidebarError('');
    setSidebarLoading(true);
    const res = await login(sidebarEmail, sidebarPassword);
    setSidebarLoading(false);
    if (!res.success) { setSidebarError(res.message || 'Login failed'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('flex_user') || '{}');
      const role = u.role || u.user_type || '';
      if (role === 'seller') router.push('/seller');
      else if (role === 'admin') router.push('/admin');
      else if (role === 'superadmin') router.push('/superadmin');
      else router.push('/buyer/browse');
    } catch {
      router.push('/buyer/browse');
    }
  };

  // Sidebar login: redirects based on Buy / Sell selection
  const handleSidebarLogin = async () => {
    setSidebarError('');
    setSidebarLoading(true);
    const res = await login(sidebarEmail, sidebarPassword);
    setSidebarLoading(false);
    if (!res.success) { setSidebarError(res.message || 'Login failed'); return; }
    router.push(sidebarMode === 'sell' ? '/seller' : '/buyer/browse');
  };
  const [catImgIdx, setCatImgIdx] = useState<number[]>(CATEGORY_CARDS.map(() => 0));
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>(CATEGORY_CARDS);
  const [editingCards, setEditingCards] = useState(false);
  const [cardUploadLoading, setCardUploadLoading] = useState<Record<string, boolean>>({});

  const [aotSections, setAotSections] = useState<AotSection[]>(DEFAULT_AOT);
  const [editingSection, setEditingSection] = useState<AotSection | null>(null);
  const [savingAot, setSavingAot] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/landing-content`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.aot_sections) {
          try { setAotSections(JSON.parse(res.data.aot_sections)); } catch { }
        }
        if (res.success && res.data?.category_cards) {
          try {
            const cards = JSON.parse(res.data.category_cards);
            setCategoryCards(cards);
            setCatImgIdx(cards.map(() => 0));
          } catch { }
        }
      })
      .catch(() => { });
  }, []);

  const persistSections = async (next: AotSection[]) => {
    setSavingAot(true);
    setAotSections(next); // update UI immediately regardless of API result
    try {
      await api.post('/superadmin/update-landing-content', { aot_sections: JSON.stringify(next) });
    } catch {
      // API save failed — UI already updated, changes persist until page refresh
    }
    setSavingAot(false);
  };

  const handleSaveSection = async (updated: AotSection) => {
    await persistSections(aotSections.map(s => s.id === updated.id ? updated : s));
    setEditingSection(null);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    await persistSections(aotSections.filter(s => s.id !== id));
  };

  const handleAddSection = async () => {
    const fresh: AotSection = {
      id: uid(),
      headline: 'New Section',
      subtitle: 'Section subtitle goes here.',
      guides: [{ id: uid(), label: 'New guide', videoUrl: '', steps: [] }],
    };
    const next = [...aotSections, fresh];
    setSavingAot(true);
    await api.post('/superadmin/update-landing-content', { aot_sections: JSON.stringify(next) });
    setAotSections(next);
    setSavingAot(false);
    setEditingSection(fresh);
  };

  const persistCards = async (next: CategoryCard[]) => {
    setCategoryCards(next);
    try {
      await api.post('/superadmin/update-landing-content', { category_cards: JSON.stringify(next) });
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadCardImg = async (cardIdx: number, file: File, existingImgIdx?: number) => {
    setUploadError(null);
    const localUrl = URL.createObjectURL(file);

    // Show preview immediately
    setCategoryCards(prev => {
      const next = [...prev];
      const card = { ...next[cardIdx] };
      const nextImgs = [...card.imgs];
      if (existingImgIdx !== undefined) {
        nextImgs[existingImgIdx] = localUrl;
      } else {
        nextImgs.push(localUrl);
      }
      card.imgs = nextImgs;
      next[cardIdx] = card;
      return next;
    });

    const loadingKey = `${cardIdx}-${existingImgIdx !== undefined ? existingImgIdx : categoryCards[cardIdx].imgs.length}`;
    setCardUploadLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.upload<{ path: string; url: string }>('/superadmin/upload-landing-card-image', formData);

      if (res.success && res.data) {
        const serverUrl = res.data.url || `${API_BASE.replace('/api/v1', '')}/${res.data.path}`;

        // Replace localUrl with serverUrl
        setCategoryCards(prev => {
          const next = prev.map((c, i) => {
            if (i !== cardIdx) return c;
            const updatedImgs = c.imgs.map(img => img === localUrl ? serverUrl : img);
            const updatedCard = { ...c, imgs: updatedImgs };

            // Trigger persistence with the fresh 'next' array
            // We do it here to ensure we have the absolute latest state
            const fullNext = prev.map((pC, pI) => pI === i ? updatedCard : pC);
            persistCards(fullNext);

            return updatedCard;
          });
          return next;
        });
      } else {
        setUploadError(res.message || 'Upload failed');
        // Keep the local preview but show error? 
        // Actually, better to remove if it failed to save, but let's keep it for a moment so they see the error
        setTimeout(() => {
          setCategoryCards(prev => prev.map((c, i) => i === cardIdx ? { ...c, imgs: c.imgs.filter(img => img !== localUrl) } : c));
        }, 3000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Network error during upload');
      setTimeout(() => {
        setCategoryCards(prev => prev.map((c, i) => i === cardIdx ? { ...c, imgs: c.imgs.filter(img => img !== localUrl) } : c));
      }, 3000);
    } finally {
      setCardUploadLoading(prev => ({ ...prev, [loadingKey]: false }));
      // Revoke after a delay to ensure it's replaced
      setTimeout(() => URL.revokeObjectURL(localUrl), 5000);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCatImgIdx(prev => prev.map((idx, i) => {
        const card = categoryCards[i];
        if (!card || !card.imgs || card.imgs.length === 0) return 0;
        return (idx + 1) % card.imgs.length;
      }));
    }, 3500);
    return () => clearInterval(interval);
  }, [categoryCards]); // Depend on categoryCards to stay in sync

  if (isLoading) {
    return <div><span>Loading…</span></div>;
  }

  return (
    <>
      <main className=' sm:pt-10 sm:px-2  xl:px-28 '>
        <LandingNavbar />

        {/* Category Cards + Sidebar */}
        <div className='flex lg:flex-row flex-col relative justify-end px-2     py-5 xl:gap-34 gap-10 items-start'>

          {/* Left: Category Cards */}

          <div className="w-full lg:w-2/3   flex flex-col gap-16 relative">
            {isSuperAdmin && (
              <button
                onClick={() => setEditingCards(true)}
                className="absolute -top-12 left-0 bg-black text-[#ffc63a] px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-900 transition-all z-20"
              >
                <i className="bi bi-pencil-square"></i> Edit Category Cards
              </button>
            )}
            {categoryCards.map((cat, i) => (
              <Fragment key={cat.name}>
                <Link
                  href={`/buyer/browse?listing_type=${cat.slug}`}
                  className={`flex sm:flex-row flex-col  ${i % 2 == 1 ? 'sm:flex-row-reverse flex-col' : ''} h-[390px] rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] group relative`}
                >
                  {/* Left: category name — centered vertically & horizontally */}
                  <div className="sm:w-[30%] w-full shrink-0 flex  py-4 sm:py-0  items-center justify-center bg-[#e7efe5] z-10 px-4">
                    <h2 className="text-xl font-[Maven Pro] text-[20px]! font-bold text-black text-center">{cat.name}</h2>
                  </div>

                  {/* Right: single auto-scrolling image */}
                  <div className="relative  w-full h-full flex-1 overflow-hidden">
                    <img
                      src={cat.imgs[catImgIdx[i]]}
                      alt={cat.name}
                      className="w-full h-full min-h-[400px] object-cover transition-opacity duration-500"
                    />

                    {/* Dot indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {cat.imgs.map((_, j) => (
                        <div
                          key={j}
                          onClick={e => { e.preventDefault(); setCatImgIdx(prev => prev.map((v, k) => k === i ? j : v)); }}
                          className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${catImgIdx[i] === j ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>

                    {/* Prev / Next arrows */}
                    <button
                      onClick={e => { e.preventDefault(); setCatImgIdx(prev => prev.map((idx, k) => k === i ? (idx - 1 + cat.imgs.length) % cat.imgs.length : idx)); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors"
                    >
                      <i className="bi bi-chevron-left text-sm"></i>
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); setCatImgIdx(prev => prev.map((idx, k) => k === i ? (idx + 1) % cat.imgs.length : idx)); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors"
                    >
                      <i className="bi bi-chevron-right text-sm"></i>
                    </button>
                  </div>
                </Link>
                {i === 1 && (
                  <div className="w-full my-8">
                    <AdBanner position="rows" page="landing" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>


          <div className=' xl:w-[419px] lg:w-1/3 w-full xl:max-w-[419px]  sticky top-37.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] bg-white flex flex-col xl:p-[30px] lg:p-[15px] p-[30px] rounded-[15px] justify-start'>

            {/* ── Login form ── */}
            {sidebarView === 'listing' && (
              <>
                <h5 style={{ fontWeight: 500, fontSize: 18, fontFamily: 'Segoe UI, sans-serif', marginBottom: 8 }}>
                  Start listing your product, it&apos;s free
                </h5>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#000', marginBottom: 16, fontFamily: "Segoe UI, sans-serif" }}>
                  You&apos;re looking to ...
                </p>

                {/* Buy / Sell toggle — Buy is default & first */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                  <button
                    onClick={() => setSidebarMode('buy')}
                    style={{
                      background: sidebarMode === 'buy' ? '#ffc63a' : '#fff',
                      color: sidebarMode === 'buy' ? '#fff' : '#000',
                      border: '1px solid #ddd',
                      borderRadius: 20,
                      padding: '8px 14px',
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Segoe UI, sans-serif',
                    }}
                    onMouseEnter={e => { if (sidebarMode !== 'buy') { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={e => { if (sidebarMode !== 'buy') { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; } }}
                  >Buy</button>
                  <button
                    onClick={() => setSidebarMode('sell')}
                    style={{
                      background: sidebarMode === 'sell' ? '#ffc63a' : '#fff',
                      color: sidebarMode === 'sell' ? '#fff' : '#000',
                      border: '1px solid #ddd',
                      borderRadius: 20,
                      padding: '8px 14px',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Segoe UI, sans-serif',
                    }}
                    onMouseEnter={e => { if (sidebarMode !== 'sell') { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={e => { if (sidebarMode !== 'sell') { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; } }}
                  >Sell</button>
                </div>

                {/* Login details */}
                <h6 style={{ fontWeight: 500, marginBottom: 10, color: '#000', fontSize: 15, fontFamily: 'Segoe UI, sans-serif' }}>
                  Your login details
                </h6>
                <input
                  type="text"
                  placeholder="Your username"
                  value={sidebarEmail}
                  onChange={e => setSidebarEmail(e.target.value)}
                  style={{ width: '100%', borderRadius: 8, padding: '0 12px', border: '1px solid #ddd', fontSize: 13, height: 40, marginBottom: 18, outline: 'none', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box' }}
                />
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={sidebarPassword}
                    onChange={e => setSidebarPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSidebarLogin()}
                    style={{ width: '100%', borderRadius: 8, padding: '15px 12px', paddingRight: 40, border: '1px solid #ddd', fontSize: 13, height: 40, outline: 'none', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowRegisterPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 10, display: 'flex', alignItems: 'center' }}
                  >
                    {showRegisterPassword
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>

                {sidebarError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{sidebarError}</p>}

                <button
                  onClick={handleSidebarLogin}
                  disabled={sidebarLoading}
                  style={{
                    background: '#ffc63a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: 15,
                    fontWeight: 500,
                    width: '100%',
                    fontSize: 14,
                    lineHeight: 1,
                    marginBottom: 12,
                    cursor: sidebarLoading ? 'not-allowed' : 'pointer',
                    opacity: sidebarLoading ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    fontFamily: 'Segoe UI, sans-serif',
                  }}
                >
                  {sidebarLoading ? 'Logging in…' : 'Login'}
                </button>
                <p style={{ fontSize: 16, fontFamily: 'Segoe UI' }} className='text-center'>
                  Are you a registered user?
                </p>
              </>
            )}

            {/* ── Login form ── */}
            {sidebarView === 'login' && (
              <>
                <h5 className='font-semibold mb-1' style={{ fontSize: 18, fontFamily: 'Segoe UI' }}>Welcome back</h5>
                <p style={{ fontSize: 14, fontFamily: 'Segoe UI' }} className='font-semibold mb-4'>Login to your account</p>
                <div className='flex flex-col gap-2'>
                  <input type="email" placeholder="Email Address *" value={sidebarEmail}
                    className='border rounded-md! px-3 py-1.5 text-sm placeholder:text-[13px]'
                    onChange={e => setSidebarEmail(e.target.value)} />
                  <div className='relative'>
                    <input type={showLoginPassword ? 'text' : 'password'} placeholder="Password *" value={sidebarPassword}
                      className='border rounded-md! px-3 py-1.5 text-sm placeholder:text-[13px] w-full pr-10'
                      onChange={e => setSidebarPassword(e.target.value)} />
                    <button type='button' tabIndex={-1} onClick={() => setShowLoginPassword(v => !v)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}>
                      {showLoginPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {sidebarError && <p className='text-red-500 text-xs mt-2'>{sidebarError}</p>}

                <button
                  className='bg-[#ffc63a] rounded-lg! text-white px-4 py-2.5 text-[14px]! hover:bg-black mt-4 mb-3 disabled:opacity-60'
                  onClick={handleLogin}
                  disabled={sidebarLoading}
                >
                  {sidebarLoading ? 'Logging in…' : 'Login'}
                </button>
                <p className='text-center text-sm'>
                  New here?{' '}
                  <button className='font-bold bg-transparent border-none cursor-pointer underline text-sm'
                    onClick={() => { setSidebarError(''); setSidebarView('listing'); }}>Register</button>
                </p>
              </>
            )}

          </div>
        </div>


        {/* AoT Sections */}
        {aotSections.map(section => (
          <AotSectionBlock
            key={section.id}
            section={section}
            isSuperAdmin={isSuperAdmin}
            onEdit={() => setEditingSection(section)}
            onDelete={() => handleDeleteSection(section.id)}
          />
        ))}

        {isSuperAdmin && (
          <div className="flex justify-center py-10 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleAddSection}
              disabled={savingAot}
              className="flex items-center gap-2 bg-[#ffc63a] hover:bg-[#e6b035] disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              {savingAot ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg" />
                  Add New Section
                </>
              )}
            </button>
          </div>
        )}


        {editingSection && (
          <AotEditModal
            section={editingSection}
            onClose={() => setEditingSection(null)}
            onSave={handleSaveSection}
          />
        )}
      </main>
      <Footer />

      {editingCards && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h5 className="font-bold text-lg text-black">Edit Category Cards</h5>
              <button onClick={() => setEditingCards(false)} className="text-gray-400 hover:text-black text-2xl">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-8">
              {uploadError && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <p className="text-sm font-medium">{uploadError}</p>
                  <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              )}
              {categoryCards.map((card, ci) => (
                <div key={ci} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <h6 className="font-bold text-gray-900">Card {ci + 1}: {card.name}</h6>
                    <button
                      onClick={() => persistCards(categoryCards.filter((_, i) => i !== ci))}
                      className="text-red-500 text-sm font-semibold hover:text-red-700"
                    >
                      Delete Card
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ffc63a]"
                        value={card.name}
                        onChange={e => {
                          setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, name: e.target.value } : c));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug</label>
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#ffc63a]"
                        value={card.slug}
                        onChange={e => {
                          setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, slug: e.target.value } : c));
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Images (Slideshow)</label>
                    <div className="grid grid-cols-3 gap-4">
                      {card.imgs.map((img, ii) => (
                        <div key={ii} className="relative group aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-white shadow-sm hover:border-[#ffc63a] transition-all">
                          {img ? (
                            <img src={img} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                              <i className="bi bi-image text-2xl"></i>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer bg-white text-black p-2 rounded-full hover:bg-[#ffc63a] transition-colors shadow-lg">
                              <i className={`bi ${cardUploadLoading[`${ci}-${ii}`] ? 'animate-spin bi-arrow-repeat' : 'bi-camera'}`}></i>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={e => e.target.files?.[0] && uploadCardImg(ci, e.target.files[0], ii)}
                                disabled={cardUploadLoading[`${ci}-${ii}`]}
                              />
                            </label>
                            <button
                              onClick={() => {
                                setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, imgs: c.imgs.filter((_, j) => j !== ii) } : c));
                              }}
                              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          {cardUploadLoading[`${ci}-${ii}`] && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-[#ffc63a] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Direct Upload "Add Image" button */}
                      <label className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#ffc63a] hover:text-[#ffc63a] hover:bg-[#ffc63a]/5 transition-all cursor-pointer group relative">
                        {cardUploadLoading[`${ci}-${card.imgs.length}`] ? (
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-3 border-[#ffc63a] border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-[10px] font-bold uppercase">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <i className="bi bi-plus-lg text-2xl mb-1 group-hover:scale-110 transition-transform"></i>
                            <span className="text-xs font-bold uppercase tracking-wider">Add Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && uploadCardImg(ci, e.target.files[0])}
                          disabled={cardUploadLoading[`${ci}-${card.imgs.length}`]}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => persistCards(categoryCards)}
                      className="bg-black text-[#ffc63a] text-xs font-bold px-4 py-2 rounded-lg"
                    >
                      Save this card
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const next: CategoryCard = { name: 'New Cat', slug: 'new', label: '', desc: '', reverse: false, imgs: [] };
                  setCategoryCards([...categoryCards, next]);
                }}
                className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-8 text-gray-400 hover:border-[#ffc63a] hover:text-[#ffc63a] transition-all flex flex-col items-center"
              >
                <i className="bi bi-plus-circle text-2xl mb-2"></i>
                <span className="font-bold uppercase tracking-wider">Add New Category Card</span>
              </button>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingCards(false)} className="px-6 py-2 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-all">Close</button>
              <button onClick={() => { persistCards(categoryCards); setEditingCards(false); }} className="px-8 py-2 rounded-xl bg-[#ffc63a] font-bold text-black hover:bg-[#e6b035] transition-all shadow-lg shadow-[#ffc63a]/20">Save All Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
