'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

interface ListingType { id: number; type_name: string; }
interface QuickLink { label: string; href: string; }
interface SocialLink { icon: string; href: string; }

const DEFAULT_DESC = 'Premium curated marketplace for the elite. Discover high-end fashion, electronics, and lifestyle essentials reserved for those who value quality.';
const DEFAULT_QUICK: QuickLink[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/' },
  { label: 'Sell', href: '/seller/upload-product' },
  { label: 'Rent', href: '/buyer/browse?listing_type=rent' },
  { label: 'Explore', href: '/buyer/browse' },
];
const DEFAULT_POLICY: QuickLink[] = [
  { label: 'Return policies', href: '#' },
  { label: 'Cancellation policies', href: '#' },
  { label: 'Terms of use', href: '#' },
];
const DEFAULT_SOCIAL: SocialLink[] = [
  { icon: 'bi-facebook', href: '#' },
  { icon: 'bi-twitter', href: '#' },
  { icon: 'bi-instagram', href: '#' },
  { icon: 'bi-linkedin', href: '#' },
];

export default function Footer() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [desc, setDesc] = useState(DEFAULT_DESC);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(DEFAULT_QUICK);
  const [policyLinks, setPolicyLinks] = useState<QuickLink[]>(DEFAULT_POLICY);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ desc, quickLinks, policyLinks, socialLinks });

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
        if (d.footer_quick_links) try { setQuickLinks(JSON.parse(d.footer_quick_links)); } catch { }
        if (d.footer_policy_links) try { setPolicyLinks(JSON.parse(d.footer_policy_links)); } catch { }
        if (d.footer_social_links) try { setSocialLinks(JSON.parse(d.footer_social_links)); } catch { }
      })
      .catch(() => { });
  }, []);

  const openEditor = () => {
    setDraft({ desc, quickLinks: [...quickLinks], policyLinks: [...policyLinks], socialLinks: [...socialLinks] });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    await api.post('/superadmin/update-landing-content', {
      footer_description: draft.desc,
      footer_quick_links: JSON.stringify(draft.quickLinks),
      footer_policy_links: JSON.stringify(draft.policyLinks),
      footer_social_links: JSON.stringify(draft.socialLinks),
    });
    setDesc(draft.desc);
    setQuickLinks(draft.quickLinks);
    setPolicyLinks(draft.policyLinks);
    setSocialLinks(draft.socialLinks);
    setSaving(false);
    setShowModal(false);
  };

  const updateQuickLink = (i: number, field: 'label' | 'href', val: string) =>
    setDraft(d => ({ ...d, quickLinks: d.quickLinks.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const addQuickLink = () => setDraft(d => ({ ...d, quickLinks: [...d.quickLinks, { label: '', href: '/' }] }));
  const removeQuickLink = (i: number) => setDraft(d => ({ ...d, quickLinks: d.quickLinks.filter((_, idx) => idx !== i) }));

  const updatePolicyLink = (i: number, field: 'label' | 'href', val: string) =>
    setDraft(d => ({ ...d, policyLinks: d.policyLinks.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const addPolicyLink = () => setDraft(d => ({ ...d, policyLinks: [...d.policyLinks, { label: '', href: '#' }] }));
  const removePolicyLink = (i: number) => setDraft(d => ({ ...d, policyLinks: d.policyLinks.filter((_, idx) => idx !== i) }));

  const updateSocialLink = (i: number, field: 'icon' | 'href', val: string) =>
    setDraft(d => ({ ...d, socialLinks: d.socialLinks.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const addSocialLink = () => setDraft(d => ({ ...d, socialLinks: [...d.socialLinks, { icon: 'bi-globe', href: '#' }] }));
  const removeSocialLink = (i: number) => setDraft(d => ({ ...d, socialLinks: d.socialLinks.filter((_, idx) => idx !== i) }));

  return (
    <>
      <footer className="relative bg-[#3D3B3B] text-white">
        {isSuperAdmin && (
          <button
            onClick={openEditor}
            className="absolute top-4 right-4 bg-gold text-black font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer z-10 hover:bg-gold-dark transition-colors"
          >
            ✏️ Edit Footer
          </button>
        )}

        <div className=" px-28 py-5 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <h2 className="text-3xl font-bold text-white mb-4">Flex Market</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>

          {/* Quick Links */}
          <div className=' w-full flex md:col-span-3 gap-10 md:gap-20 lg:gap-32 justify-start md:justify-evenly flex-wrap'>
            <div >
              <h5 className="text-gold font-bold uppercase tracking-widest text-xs mb-5">Quick Links</h5>
              <ul className="space-y-2 p-0!">
                {quickLinks.map((l, i) => (
                  <li key={i}>
                    <Link href={l.href} className="text-gray-400 text-sm hover:text-gold transition-colors duration-200">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div >
              <h5 className="text-gold font-bold uppercase tracking-widest text-xs mb-5">Categories</h5>
              <ul className="space-y-2 p-0!">
                <li>
                  <Link href="/buyer/browse" className="text-gray-400 text-sm hover:text-gold transition-colors duration-200">
                    All Products
                  </Link>
                </li>
                {listingTypes.slice(0, 5).map(lt => (
                  <li key={lt.id}>
                    <Link
                      href={`/buyer/browse?listing_type=${lt.type_name.toLowerCase()}`}
                      className="text-gray-400 text-sm hover:text-gold transition-colors duration-200"
                    >
                      {lt.type_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social & Policy */}
            <div>
              <h5 className="text-gold font-bold uppercase tracking-widest text-xs mb-5">Connect</h5>
              <ul className="space-y-2 mb-6 flex flex-col items-start">
                {policyLinks.map((l, i) => (
                  <li key={i}>
                    <a href={l.href} className="text-gray-400 text-sm hover:text-gold transition-colors duration-200">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex  flex-col gap-4">
                {socialLinks.map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    className="w-9 h-9 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:border-gold hover:text-gold transition-colors duration-200"
                  >
                    <i className={`bi ${s.icon} text-base`}></i>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 py-4 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} Flex Market. All rights reserved.
        </div>
      </footer>

      {/* Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h5 className="font-bold text-lg text-gray-900">Edit Footer</h5>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer bg-transparent border-none">
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Footer Description</label>
                <textarea
                  rows={3}
                  value={draft.desc}
                  onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                />
              </div>

              {/* Quick Links */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Quick Links</label>
                <div className="space-y-2">
                  {draft.quickLinks.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="Label"
                        value={l.label}
                        onChange={e => updateQuickLink(i, 'label', e.target.value)}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="URL"
                        value={l.href}
                        onChange={e => updateQuickLink(i, 'href', e.target.value)}
                      />
                      <button
                        onClick={() => removeQuickLink(i)}
                        className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors cursor-pointer"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={addQuickLink} className="mt-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  + Add Link
                </button>
              </div>

              {/* Policy Links */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Policy Links</label>
                <div className="space-y-2">
                  {draft.policyLinks.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="Label"
                        value={l.label}
                        onChange={e => updatePolicyLink(i, 'label', e.target.value)}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="URL"
                        value={l.href}
                        onChange={e => updatePolicyLink(i, 'href', e.target.value)}
                      />
                      <button
                        onClick={() => removePolicyLink(i)}
                        className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors cursor-pointer"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={addPolicyLink} className="mt-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  + Add Link
                </button>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Social Links</label>
                <p className="text-xs text-gray-400 mb-2">Use Bootstrap icon class names, e.g. <code className="bg-gray-100 px-1 rounded">bi-facebook</code></p>
                <div className="space-y-2">
                  {draft.socialLinks.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="Icon (bi-facebook)"
                        value={s.icon}
                        onChange={e => updateSocialLink(i, 'icon', e.target.value)}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        placeholder="URL"
                        value={s.href}
                        onChange={e => updateSocialLink(i, 'href', e.target.value)}
                      />
                      <button
                        onClick={() => removeSocialLink(i)}
                        className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors cursor-pointer"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={addSocialLink} className="mt-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  + Add Link
                </button>
              </div>
            </div>

            {/* Modal Footer */}
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
                className="px-5 py-2 rounded-lg bg-gold font-bold text-sm text-black hover:bg-gold-dark transition-colors cursor-pointer disabled:opacity-60"
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
