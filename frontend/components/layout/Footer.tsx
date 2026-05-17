'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSystem } from '@/lib/system-context';
import { api } from '@/lib/api';
import AdBanner from '@/components/shared/AdBanner';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

interface FooterLink { label?: string; icon?: string; href: string; }
interface FooterSection {
  id: string;
  title: string;
  type: 'links' | 'social';
  links: FooterLink[];
  isTaxonomy?: boolean;
}
interface ListingType { id: number; type_name: string; }

function uid() { return Math.random().toString(36).slice(2, 9); }

const DEFAULT_DESC = 'Premium curated marketplace for the elite. Discover high-end fashion, electronics, and lifestyle essentials reserved for those who value quality.';

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    id: 'quick-links',
    title: 'Quick Links',
    type: 'links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Website Process', href: '/process' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    type: 'links',
    links: [],
    isTaxonomy: true,
  },
  {
    id: 'policies',
    title: 'Policies',
    type: 'links',
    links: [
      { label: 'Cancellation', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms Of Use', href: '#' },
      { label: 'FAQ', href: '#' },
      { label: 'T&C', href: '#' },
    ],
  },
  {
    id: 'social',
    title: 'Keep In Touch',
    type: 'social',
    links: [
      { icon: 'bi-facebook', href: '#' },
      { icon: 'bi-twitter', href: '#' },
      { icon: 'bi-instagram', href: '#' },
      { icon: 'bi-linkedin', href: '#' },
    ],
  },
];

export default function Footer() {
  const { user } = useAuth();
  const { settings } = useSystem();
  const isSuperAdmin = user?.role === 'super_admin';

  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [desc, setDesc] = useState(DEFAULT_DESC);
  const [sections, setSections] = useState<FooterSection[]>(DEFAULT_SECTIONS);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftDesc, setDraftDesc] = useState(DEFAULT_DESC);
  const [draftSections, setDraftSections] = useState<FooterSection[]>(DEFAULT_SECTIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/taxonomy`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data?.listing_types) setListingTypes(res.data.listing_types); })
      .catch(() => { });

    fetch(`${API_BASE}/landing-content`)
      .then(r => r.json())
      .then(res => {
        if (!res.success || !res.data) return;
        const d = res.data;
        if (d.footer_description) setDesc(d.footer_description);

        // Try new unified sections key first
        if (d.footer_sections) {
          try { setSections(JSON.parse(d.footer_sections)); return; } catch { }
        }

        // Fall back to legacy individual keys
        const legacySections: FooterSection[] = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
        if (d.footer_quick_links) try {
          legacySections[0].links = JSON.parse(d.footer_quick_links).map((l: { label: string; href: string }) => ({ label: l.label, href: l.href }));
        } catch { }
        if (d.footer_category_links) try {
          const cats = JSON.parse(d.footer_category_links);
          if (cats.length > 0) { legacySections[1].links = cats; legacySections[1].isTaxonomy = false; }
        } catch { }
        if (d.footer_policy_links) try {
          legacySections[2].links = JSON.parse(d.footer_policy_links).map((l: { label: string; href: string }) => ({ label: l.label, href: l.href }));
        } catch { }
        if (d.footer_social_links) try {
          legacySections[3].links = JSON.parse(d.footer_social_links).map((l: { icon: string; href: string }) => ({ icon: l.icon, href: l.href }));
        } catch { }
        if (d.footer_section_titles) try {
          const t = JSON.parse(d.footer_section_titles);
          if (t.quickLinks) legacySections[0].title = t.quickLinks;
          if (t.categories) legacySections[1].title = t.categories;
          if (t.policies) legacySections[2].title = t.policies;
          if (t.socialLinks) legacySections[3].title = t.socialLinks;
        } catch { }
        setSections(legacySections);
      })
      .catch(() => { });
  }, []);

  const openEditor = () => {
    setDraftDesc(desc);
    setDraftSections(JSON.parse(JSON.stringify(sections)));
    setExpandedId(null);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    await api.post('/superadmin/update-landing-content', {
      footer_description: draftDesc,
      footer_sections: JSON.stringify(draftSections),
    });
    setDesc(draftDesc);
    setSections(draftSections);
    setSaving(false);
    setShowModal(false);
  };

  // ── Section CRUD ──────────────────────────────────────────────
  const addSection = () => {
    const s: FooterSection = { id: uid(), title: 'New Section', type: 'links', links: [] };
    setDraftSections(prev => [...prev, s]);
    setExpandedId(s.id);
  };

  const deleteSection = (id: string) => {
    setDraftSections(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateSection = (id: string, changes: Partial<FooterSection>) =>
    setDraftSections(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));

  // ── Link CRUD within a section ─────────────────────────────────
  const addLink = (sectionId: string, type: 'links' | 'social') => {
    const link: FooterLink = type === 'social' ? { icon: 'bi-globe', href: '#' } : { label: '', href: '/' };
    setDraftSections(prev => prev.map(s => s.id === sectionId ? { ...s, links: [...s.links, link] } : s));
  };

  const updateLink = (sectionId: string, li: number, changes: Partial<FooterLink>) =>
    setDraftSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, links: s.links.map((l, i) => i === li ? { ...l, ...changes } : l) } : s
    ));

  const deleteLink = (sectionId: string, li: number) =>
    setDraftSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, links: s.links.filter((_, i) => i !== li) } : s
    ));

  // ── Resolve taxonomy fallback ──────────────────────────────────
  const resolveLinks = (s: FooterSection): FooterLink[] => {
    if (s.isTaxonomy && s.links.length === 0) {
      return [
        { label: 'All Products', href: '/buyer/browse' },
        ...listingTypes.slice(0, 5).map(lt => ({
          label: lt.type_name,
          href: `/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`,
        })),
      ];
    }
    return s.links;
  };

  const inputCls = 'flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold';

  return (
    <>
      <footer className="relative bg-[#3D3B3B] text-white">
        {isSuperAdmin && (
          <button
            onClick={openEditor}
            className="absolute top-4 right-4 bg-gold text-white font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer z-10 hover:bg-gold-dark transition-colors"
          >
            ✏️ Edit Footer
          </button>
        )}

        <div className="  xl:px-28! lg:px-28! md:px-28 sm:px-8 px-4  py-5 grid grid-cols-1 justify-center lg:grid-cols-4  gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <h2 className="text-3xl font-bold text-white mb-2.5">{settings.site_name}</h2>
            <p className="text-white m-0! text-sm leading-relaxed">{desc}</p>
          </div>

          {/* Dynamic sections */}
          <div className="w-full flex md:col-span-3 sm:flex-row flex-col gap-10 md:gap-20 lg:gap-32 justify-start  flex-wrap">
            {sections.map(section => (
              <div key={section.id}>
                <h5 className="text-white font-bold uppercase tracking-widest text-xs mb-[18px]!">{section.title}</h5>
                {section.type === 'social' ? (
                  <div className="flex flex-wrap gap-3">
                    {resolveLinks(section).map((l, i) => (
                      <a
                        key={i}
                        href={l.href}
                        className="w-10 h-10 flex items-start justify-start text-gray-400 hover:text-gold transition-colors duration-200"
                      >
                        <i className={`bi ${l.icon} text-[17.6px]`}></i>
                      </a>
                    ))}
                  </div>
                ) : (
                  <ul className="p-0!">
                    {resolveLinks(section).map((l, i) => (
                      <li key={i}>
                        <Link
                          href={l.href}
                          className="text-gray-400 text-sm leading-relaxed hover:text-gold transition-colors duration-200"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

       

        <div className="border-t border-gray-700 py-4 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} {settings.site_name}. All rights reserved.
        </div>
      </footer>

      {/* ── Edit Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h5 className="font-bold text-lg text-gray-900">Edit Footer</h5>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer bg-transparent border-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Footer Description</label>
                <textarea
                  rows={3}
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                />
              </div>

              {/* Sections CRUD */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">Footer Sections</label>
                  <span className="text-xs text-gray-400">{draftSections.length} section{draftSections.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {draftSections.map((section, si) => (
                    <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden">

                      {/* Section row — click to expand */}
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {si + 1}
                          </span>
                          <span className="font-semibold text-sm text-gray-800">{section.title || 'Untitled'}</span>
                          <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-2 py-0.5 uppercase tracking-wide">
                            {section.type === 'social' ? 'Social Icons' : `${resolveLinks(section).length} links`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm(`Delete "${section.title}"?`)) deleteSection(section.id); }}
                            className="text-red-400 hover:text-red-600 text-sm border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                          <i className={`bi bi-chevron-${expandedId === section.id ? 'up' : 'down'} text-gray-400 text-xs`}></i>
                        </div>
                      </div>

                      {/* Expanded editor */}
                      {expandedId === section.id && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50 space-y-4">

                          {/* Title + Type */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 font-semibold mb-1">Section Title</label>
                              <input
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white"
                                placeholder="Section title"
                                value={section.title}
                                onChange={e => updateSection(section.id, { title: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 font-semibold mb-1">Type</label>
                              <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white"
                                value={section.type}
                                onChange={e => updateSection(section.id, { type: e.target.value as 'links' | 'social' })}
                              >
                                <option value="links">Links</option>
                                <option value="social">Social Icons</option>
                              </select>
                            </div>
                          </div>

                          {/* Taxonomy toggle */}
                          {section.isTaxonomy !== undefined && (
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-gold"
                                checked={!!section.isTaxonomy}
                                onChange={e => updateSection(section.id, { isTaxonomy: e.target.checked, links: e.target.checked ? [] : section.links })}
                              />
                              Auto-populate from product taxonomy when links list is empty
                            </label>
                          )}

                          {/* Links list */}
                          <div>
                            <label className="block text-xs text-gray-500 font-semibold mb-2">
                              {section.type === 'social' ? 'Social Icons' : 'Links'}
                            </label>

                            {section.links.length === 0 && section.isTaxonomy ? (
                              <p className="text-xs text-gray-400 italic mb-2">
                                Showing taxonomy categories — add a link below to override.
                              </p>
                            ) : null}

                            <div className="space-y-2">
                              {section.links.map((link, li) => (
                                <div key={li} className="flex gap-2 items-center">
                                  {section.type === 'social' ? (
                                    <input
                                      className={inputCls}
                                      placeholder="Icon class (bi-facebook)"
                                      value={link.icon || ''}
                                      onChange={e => updateLink(section.id, li, { icon: e.target.value })}
                                    />
                                  ) : (
                                    <input
                                      className={inputCls}
                                      placeholder="Label"
                                      value={link.label || ''}
                                      onChange={e => updateLink(section.id, li, { label: e.target.value })}
                                    />
                                  )}
                                  <input
                                    className={inputCls}
                                    placeholder="URL"
                                    value={link.href}
                                    onChange={e => updateLink(section.id, li, { href: e.target.value })}
                                  />
                                  <button
                                    onClick={() => deleteLink(section.id, li)}
                                    className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => addLink(section.id, section.type)}
                              className="mt-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              + Add {section.type === 'social' ? 'Icon' : 'Link'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add section */}
                <button
                  onClick={addSection}
                  className="mt-3 w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-gold hover:text-gold transition-colors cursor-pointer"
                >
                  + Add Section
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-gold font-bold text-sm text-white hover:bg-gold-dark transition-colors cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Footer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
