'use client';

import { useEffect, useState, useCallback, createElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import LandingNavbar from '../layout/LandingNavbar';
import Footer from '../layout/Footer';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const STORAGE_KEY = 'flex_hp_v3';

interface AotStep { icon: string; title: string; desc: string; }
interface AotGuide { id: string; label: string; videoUrl: string; steps: AotStep[]; }
interface AotSection { id: string; headline: string; subtitle: string; guides: AotGuide[]; reversed?: boolean; }

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
    <section className="relative pb-16 pt-20 bg-white w-full  ">

      {/* Superadmin controls */}
      {isSuperAdmin && (
        <div className="absolute top-4 right-6 flex gap-2">
          <button onClick={onEdit} className="bg-[#ffc63a] text-black text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-[#e6b035] transition-colors">
            ✏️ Edit Section
          </button>
          <button onClick={onDelete} className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
            🗑 Delete
          </button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto  overflow-hidden">
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
                    <p className="text-center pt-2 text-sm font-semibold text-[#D7B467] uppercase tracking-widest"> {guide.label}</p>
                    <div className="w-[50px] h-[1.5px] bg-[#D7B467]"></div>
                  </div>
                )}
                {videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {section.guides.map((guide, gi) => (
              <div key={guide.id} className=' mb-10'>
                {guide.label && (
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-[50px] h-[2px] bg-[#D7B467]"></div>
                    <p className="text-center text-sm font-semibold text-[30px] text-[#D7B467] uppercase tracking-widest">{guide.label}</p>
                    <div className="w-[50px] h-[2px] bg-[#D7B467]"></div>
                  </div>
                )}

                {guide.steps.length > 0 ? (
                  <div className={`grid grid-cols-1 lg:grid-cols-[4fr_5fr] gap-12 w-full items-center ${section.reversed ? 'lg:direction-rtl' : ''}`}>
                    {/* Video — 40% */}
                    <div className="min-w-0">{videoBlock(guide.videoUrl, guide.label, isSuperAdmin)}</div>

                    {/* Steps — 50% */}
                    <div className="flex flex-col gap-3 w-full min-w-0" >
                      {guide.steps.map((s, idx) => (
                        <div key={idx} className="flex gap-4 justify-start items-start text-left w-full min-w-0">
                          <h4 className="font-bold text-[18px]! text-black shrink-0 pt-1.5">
                            {idx + 1})
                          </h4>
                          <p className="text-[16px]! text-gray-500 leading-relaxed flex-1 break-words">
                            {s.desc}
                          </p>
                        </div>
                      ))}
                    </div>
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
          <h5 className="font-bold text-base text-black">Edit Section</h5>
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
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              id="reversedToggle"
              checked={!!draft.reversed}
              onChange={e => setDraft(d => ({ ...d, reversed: e.target.checked }))}
              className="accent-[#ffc63a]"
            />
            Reverse layout (steps left, video right)
          </label>

          {/* Guide tabs */}
          <div className="flex flex-wrap gap-2">
            {draft.guides.map((g, gi) => (
              <button
                key={g.id}
                onClick={() => setActiveGuide(gi)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${activeGuide === gi ? 'bg-[#ffc63a] border-[#ffc63a] font-bold' : 'bg-white border-gray-200 text-gray-500 hover:border-[#ffc63a]'}`}
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
          <button onClick={() => onSave(draft)} className="px-5 py-2 rounded-lg bg-[#ffc63a] hover:bg-[#e6b035] text-black font-bold text-sm transition-colors">Save Section</button>
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
  const { user, token, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'delivery') router.replace('/delivery');
      else if (user.user_type === 'seller') router.replace('/seller');
      else if (user.user_type === 'buyer' || user.role === 'both') router.replace('/buyer/dashboard');
    }
  }, [isLoading, isAuthenticated, user]);

  const [sidebarMode, setSidebarMode] = useState<'sell' | 'rent'>('sell');
  const [sidebarName, setSidebarName] = useState('');
  const [sidebarEmail, setSidebarEmail] = useState('');
  const [catImgIdx, setCatImgIdx] = useState<number[]>(CATEGORY_CARDS.map(() => 0));

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCatImgIdx(prev => prev.map((idx, i) => (idx + 1) % CATEGORY_CARDS[i].imgs.length));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div><span>Loading…</span></div>;
  }

  return (
    <>
      <main className=' pt-25 px-28'>
        <LandingNavbar />

        {/* Category Cards + Sidebar */}
        <div className='flex relative justify-end px-2 py-10 gap-30 items-start'>

          {/* Left: Category Cards */}

          <div className="w-2/3   flex flex-col gap-16">
            {CATEGORY_CARDS.map((cat, i) => (
              <Link
                key={cat.name}
                href={`/buyer/browse?listing_type=${cat.slug}`}
                className={`flex ${i % 2 == 1 ? 'flex-row-reverse' : ''} h-[380px] rounded-lg overflow-hidden shadow group relative`}
              >
                {/* Left: category name — centered vertically & horizontally */}
                <div className="w-[30%] shrink-0 flex items-center justify-center bg-[#e7efe5] z-10 px-4">
                  <h2 className="text-xl font-[Maven Pro] text-[20px]! font-bold text-black text-center">{cat.name}</h2>
                </div>

                {/* Right: single auto-scrolling image */}
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={cat.imgs[catImgIdx[i]]}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-opacity duration-500"
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
            ))}
          </div>


          <div className='w-[33%] h-fit sticky top-37.5 shadow bg-white flex flex-col px-6 py-10 rounded-[15px] justify-start'>
            <h5 className=' font-semibold' style={{ fontSize: 18, fontFamily: 'Segoe UI' }} >Start listing your product, it&apos;s free</h5>
            <p style={{ fontSize: 14, fontFamily: 'Segoe UI' }} className=' font-semibold  '>You&apos;re looking to ...</p>
            <div className=' flex gap-4 pb-2 mb-3'>
              <button className='  rounded-[20px]! hover:text-white!  text-[14px]!  border text-black! px-2.5 py-2  hover:bg-black' onClick={() => setSidebarMode('sell')}>Sell</button>
              <button className=' rounded-[20px]! hover:text-white!  text-[14px]!  border text-black! px-2.5  py-2  hover:bg-black' onClick={() => setSidebarMode('rent')}>Rent</button>
            </div>
            <div className=' flex-col flex  justify-start'>
              <label className=' font-semibold mb-2' style={{ fontFamily: 'Segoe UI' }}>Your contact details</label>
              <div className=' flex  flex-col gap-2.5 '>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={sidebarName}
                  className='border rounded-md!  px-2 py-1 mb-2 placeholder:text-[14px]    placeholder:font-[Segoe UI]'
                  onChange={e => setSidebarName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  className='border rounded-md!  px-2 py-1 mb-4 placeholder:text-[14px]    placeholder:font-[Segoe UI]'

                  value={sidebarEmail}
                  onChange={e => setSidebarEmail(e.target.value)}
                />
              </div>
              <button className='bg-[#ffc63a] rounded-lg! text-white px-4 py-2.5 font-[Segoe UI] text-[14px]!  hover:bg-black mb-4 ' onClick={() => router.push('/register')}>Start now</button>
            </div>
            <p className=' text-center'>
              Are you a registered user?{' '}
              <Link className=' font-bold text-[18px] ' href="/login">Login</Link>
            </p>
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
              className="flex items-center gap-2 bg-[#ffc63a] hover:bg-[#e6b035] disabled:opacity-50 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
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

    </>
  );
}
