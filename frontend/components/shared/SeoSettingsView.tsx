'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface SeoSetting {
  id: number;
  page_key: string;
  page_name: string;
  route: string;
  title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  updated_at: string;
}

export default function SeoSettingsView() {
  const { toastSuccess, toastError } = useToast();
  const [settings, setSettings] = useState<SeoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'needs_opt' | 'optimized'>('all');

  // Editing state
  const [editing, setEditing] = useState<SeoSetting | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editOgTitle, setEditOgTitle] = useState('');
  const [editOgDescription, setEditOgDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = () => {
    setLoading(true);
    api.get<SeoSetting[]>('/superadmin/seo-settings').then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Filter & Search Settings
  const filteredSettings = useMemo(() => {
    return settings.filter((s) => {
      const matchesSearch =
        s.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.meta_keywords || '').toLowerCase().includes(searchQuery.toLowerCase());

      const titleLen = (s.title || '').length;
      const descLen = (s.meta_description || '').length;
      const needsOptimization =
        titleLen < 30 || titleLen > 65 || descLen < 80 || descLen > 165 || !s.meta_keywords;

      if (filterType === 'needs_opt') {
        return matchesSearch && needsOptimization;
      }
      if (filterType === 'optimized') {
        return matchesSearch && !needsOptimization;
      }
      return matchesSearch;
    });
  }, [settings, searchQuery, filterType]);

  // Statistics calculations
  const stats = useMemo(() => {
    const total = settings.length;
    if (total === 0) return { total: 0, optimized: 0, needsOpt: 0, healthScore: 100 };

    let optimizedCount = 0;
    settings.forEach((s) => {
      const titleLen = (s.title || '').length;
      const descLen = (s.meta_description || '').length;
      const hasKeywords = !!(s.meta_keywords || '').trim();
      const isGood =
        titleLen >= 30 && titleLen <= 65 && descLen >= 80 && descLen <= 165 && hasKeywords;
      if (isGood) optimizedCount++;
    });

    const needsOptCount = total - optimizedCount;
    const healthScore = Math.round((optimizedCount / total) * 100);

    return {
      total,
      optimized: optimizedCount,
      needsOpt: needsOptCount,
      healthScore,
    };
  }, [settings]);

  // Edit Handlers
  const startEdit = (setting: SeoSetting) => {
    setEditing(setting);
    setEditTitle(setting.title || '');
    setEditDescription(setting.meta_description || '');
    setEditKeywords(setting.meta_keywords || '');
    setEditOgTitle(setting.og_title || '');
    setEditOgDescription(setting.og_description || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    const res = await api.post(`/superadmin/seo-settings/${editing.id}`, {
      title: editTitle,
      meta_description: editDescription,
      meta_keywords: editKeywords,
      og_title: editOgTitle,
      og_description: editOgDescription,
    });
    setSaving(false);

    if (res.success) {
      toastSuccess('seo_setting_update_success', 'SEO settings updated successfully!');
      setEditing(null);
      fetchSettings();
    } else {
      toastError('seo_setting_update_failed', res.message || 'Failed to update SEO settings.');
    }
  };

  // Length Checker Helpers
  const getTitleStatusColor = (len: number) => {
    if (len === 0) return '#ef4444'; // Red (Missing)
    if (len >= 30 && len <= 65) return '#10b981'; // Green (Perfect)
    return '#f59e0b'; // Amber (Short / Long)
  };

  const getDescStatusColor = (len: number) => {
    if (len === 0) return '#ef4444';
    if (len >= 80 && len <= 165) return '#10b981';
    return '#f59e0b';
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid" style={{ paddingBottom: '3rem' }}>
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignContent: 'center', alignItems: 'center', gap: 10, marginBottom: '0.4rem', color: '#1e2022' }}>
              <i className="bi bi-search" style={{ color: '#ffc63a', fontSize: '1.4rem' }}></i> SEO Configuration Panel
            </h1>
            <p className="text-muted small mb-0">Configure metadata, titles, custom Open Graph sharing settings, and search engine optimization parameters for all platform routes.</p>
          </div>
        </div>

        {/* Dynamic Stats Banner */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '0.75rem', background: '#fff' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 198, 58, 0.1)', color: '#ffc63a' }}>
                  <i className="bi bi-file-earmark-code-fill" style={{ fontSize: '1.3rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0 small fw-semibold">Total Site Routes</h6>
                  <h4 className="fw-bold mb-0 mt-1" style={{ color: '#1e2022' }}>{stats.total}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '0.75rem', background: '#fff' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <i className="bi bi-check-circle-fill" style={{ fontSize: '1.3rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0 small fw-semibold">Fully Optimized</h6>
                  <h4 className="fw-bold mb-0 mt-1" style={{ color: '#10b981' }}>{stats.optimized}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '0.75rem', background: '#fff' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.3rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0 small fw-semibold">Needs Attention</h6>
                  <h4 className="fw-bold mb-0 mt-1" style={{ color: '#ef4444' }}>{stats.needsOpt}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '0.75rem', background: '#fff' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <i className="bi bi-heart-pulse-fill" style={{ fontSize: '1.3rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0 small fw-semibold">SEO Health Score</h6>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <h4 className="fw-bold mb-0" style={{ color: '#1e2022' }}>{stats.healthScore}%</h4>
                    <div className="progress w-100" style={{ height: 6, width: 60, borderRadius: 3 }}>
                      <div className="progress-bar" style={{ background: stats.healthScore > 75 ? '#10b981' : stats.healthScore > 40 ? '#f59e0b' : '#ef4444', width: `${stats.healthScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem' }}>
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              <div className="col-lg-4">
                <div className="input-group" style={{ background: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e7eaf3' }}>
                  <span className="input-group-text border-0 bg-transparent" id="search-addon-seo"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    id="seo-search-input"
                    className="form-control border-0 bg-transparent py-2"
                    placeholder="Search pages by name, route, titles, keywords..."
                    style={{ outline: 'none', boxShadow: 'none', fontSize: '0.875rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-lg-8">
                <div className="d-flex gap-2 justify-content-lg-end flex-wrap">
                  <button
                    id="filter-btn-all"
                    type="button"
                    className={`btn btn-sm ${filterType === 'all' ? 'btn-dark' : 'btn-light border'}`}
                    onClick={() => setFilterType('all')}
                    style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    All Pages ({settings.length})
                  </button>
                  <button
                    id="filter-btn-needs-opt"
                    type="button"
                    className={`btn btn-sm ${filterType === 'needs_opt' ? 'btn-dark text-white' : 'btn-light border'}`}
                    onClick={() => setFilterType('needs_opt')}
                    style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '0.8rem', color: filterType === 'needs_opt' ? '#fff' : '#ef4444' }}
                  >
                    🚨 Needs Attention ({settings.filter(s => ((s.title || '').length < 30 || (s.title || '').length > 65 || (s.meta_description || '').length < 80 || (s.meta_description || '').length > 165 || !(s.meta_keywords || '').trim())).length})
                  </button>
                  <button
                    id="filter-btn-optimized"
                    type="button"
                    className={`btn btn-sm ${filterType === 'optimized' ? 'btn-dark text-white' : 'btn-light border'}`}
                    onClick={() => setFilterType('optimized')}
                    style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: '0.8rem', color: filterType === 'optimized' ? '#fff' : '#10b981' }}
                  >
                    ✅ Perfect Pages ({settings.filter(s => ((s.title || '').length >= 30 && (s.title || '').length <= 65 && (s.meta_description || '').length >= 80 && (s.meta_description || '').length <= 165 && (s.meta_keywords || '').trim())).length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Cards Grid */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
        ) : (
          <div className="row g-4">
            {filteredSettings.length > 0 ? (
              filteredSettings.map((s) => {
                const titleLen = (s.title || '').length;
                const descLen = (s.meta_description || '').length;
                const keywordCount = (s.meta_keywords || '').trim() ? s.meta_keywords!.split(',').length : 0;

                const isTitleGood = titleLen >= 30 && titleLen <= 65;
                const isDescGood = descLen >= 80 && descLen <= 165;

                return (
                  <div className="col-xl-4 col-md-6" key={s.id}>
                    <div className="card border-0 h-100 position-relative hover-shadow" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', background: '#fff', transition: 'all 0.2s ease-in-out' }}>
                      <div className="card-body p-4 d-flex flex-column h-100">
                        {/* Page Badge & Route */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="badge" style={{ background: '#f8f9fa', color: '#6c757d', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {s.page_name}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' }} className="fw-semibold">{s.route}</span>
                        </div>

                        {/* Title Display */}
                        <h6 className="fw-bold mb-2 text-truncate" style={{ fontSize: '0.95rem', color: '#1e2022' }} title={s.title || 'Untitled Page'}>
                          {s.title || <em className="text-danger">Title Missing</em>}
                        </h6>

                        {/* Description Display */}
                        <p className="text-muted small text-clamp-3 mb-4" style={{ flexGrow: 1, minHeight: 48, fontSize: '0.8rem', lineHeight: '1.4' }}>
                          {s.meta_description || <em className="text-danger">No meta description configured for this page. Add one to optimize CTR.</em>}
                        </p>

                        {/* SEO Metrics Row */}
                        <div className="d-flex gap-2 mb-3 flex-wrap">
                          <span className="badge border d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: '6px', color: getTitleStatusColor(titleLen), borderColor: `${getTitleStatusColor(titleLen)}30`, background: `${getTitleStatusColor(titleLen)}10`, fontWeight: 700 }}>
                            <i className={isTitleGood ? "bi bi-check-circle-fill" : "bi bi-exclamation-circle-fill"}></i> Title: {titleLen}ch
                          </span>
                          <span className="badge border d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: '6px', color: getDescStatusColor(descLen), borderColor: `${getDescStatusColor(descLen)}30`, background: `${getDescStatusColor(descLen)}10`, fontWeight: 700 }}>
                            <i className={isDescGood ? "bi bi-check-circle-fill" : "bi bi-exclamation-circle-fill"}></i> Desc: {descLen}ch
                          </span>
                          <span className="badge border d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: '6px', color: keywordCount > 0 ? '#8b5cf6' : '#ef4444', borderColor: keywordCount > 0 ? '#8b5cf630' : '#ef444430', background: keywordCount > 0 ? '#8b5cf610' : '#ef444410', fontWeight: 700 }}>
                            <i className="bi bi-tag-fill"></i> Keywords: {keywordCount}
                          </span>
                        </div>

                        {/* Tags Preview */}
                        {s.meta_keywords && (
                          <div className="mb-4 text-truncate" style={{ fontSize: '0.72rem', color: '#6c757d' }}>
                            <span className="fw-semibold">Tags:</span> {s.meta_keywords.split(',').slice(0, 4).join(', ')}{s.meta_keywords.split(',').length > 4 ? '...' : ''}
                          </div>
                        )}

                        {/* Configure Trigger */}
                        <button
                          type="button"
                          id={`config-btn-${s.page_key}`}
                          className="btn btn-sm btn-light border w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                          onClick={() => startEdit(s)}
                          style={{ borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', background: '#fff', color: '#1e2022' }}
                        >
                          <i className="bi bi-sliders text-warning"></i> Configure Page SEO
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-12 text-center py-5">
                <i className="bi bi-emoji-frown text-muted" style={{ fontSize: '2.5rem' }}></i>
                <h5 className="mt-3 fw-bold">No pages found</h5>
                <p className="text-muted small">No matches found for &quot;{searchQuery}&quot;. Please refine your search query.</p>
              </div>
            )}
          </div>
        )}

        {/* Immersive Edit Modal */}
        {editing && (
          <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setEditing(null)}>
            <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                <div className="modal-header bg-dark p-3 text-white border-0" style={{ borderBottom: '2px solid #ffc63a !important' }}>
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><i className="bi bi-pencil-square" style={{ color: '#ffc63a' }}></i> Configure SEO: <span className="text-warning">{editing.page_name}</span></h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setEditing(null)}></button>
                </div>
                <form onSubmit={handleSave}>
                  <div className="modal-body p-4 bg-light" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                    <div className="row g-4">
                      {/* Left Column: Form Fields */}
                      <div className="col-lg-6">
                        <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '0.75rem' }}>
                          <h6 className="fw-bold mb-3 border-bottom pb-2" style={{ color: '#1e2022' }}>SEO Details</h6>

                          {/* SEO Page Title */}
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <label htmlFor="seo-title-field" className="form-label small fw-bold" style={{ color: '#4b566b' }}>SEO Meta Title <span className="text-danger">*</span></label>
                              <span className="small fw-semibold" style={{ color: getTitleStatusColor(editTitle.length) }}>{editTitle.length} / 60 characters</span>
                            </div>
                            <input
                              id="seo-title-field"
                              type="text"
                              className="form-control"
                              required
                              placeholder="Recommended: 50-60 characters for best Google display."
                              style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            {/* Length Progress Meter */}
                            <div className="progress mt-2" style={{ height: 4, borderRadius: 2 }}>
                              <div className="progress-bar" style={{ background: getTitleStatusColor(editTitle.length), width: `${Math.min((editTitle.length / 65) * 100, 100)}%` }}></div>
                            </div>
                          </div>

                          {/* Meta Description */}
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <label htmlFor="seo-desc-field" className="form-label small fw-bold" style={{ color: '#4b566b' }}>Meta Description <span className="text-danger">*</span></label>
                              <span className="small fw-semibold" style={{ color: getDescStatusColor(editDescription.length) }}>{editDescription.length} / 160 characters</span>
                            </div>
                            <textarea
                              id="seo-desc-field"
                              className="form-control"
                              rows={4}
                              required
                              placeholder="Recommended: 120-160 characters. A high-quality description summarizes what the page is about to encourage user clicks."
                              style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                            {/* Length Progress Meter */}
                            <div className="progress mt-2" style={{ height: 4, borderRadius: 2 }}>
                              <div className="progress-bar" style={{ background: getDescStatusColor(editDescription.length), width: `${Math.min((editDescription.length / 165) * 100, 100)}%` }}></div>
                            </div>
                          </div>

                          {/* Meta Keywords */}
                          <div className="mb-4">
                            <label htmlFor="seo-keywords-field" className="form-label small fw-bold" style={{ color: '#4b566b' }}>Meta Keywords (Comma-separated)</label>
                            <input
                              id="seo-keywords-field"
                              type="text"
                              className="form-control"
                              placeholder="e.g. fashion, thrift, second hand, sustainable, vintage"
                              style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                              value={editKeywords}
                              onChange={(e) => setEditKeywords(e.target.value)}
                            />
                            <small className="text-muted small d-block mt-1">Include 5-10 key search terms users might search on Google to find this page.</small>
                          </div>

                          <h6 className="fw-bold mb-3 border-bottom pb-2 pt-2" style={{ color: '#1e2022' }}>Social Sharing (Open Graph)</h6>

                          {/* OG Title */}
                          <div className="mb-3">
                            <label htmlFor="seo-ogtitle-field" className="form-label small fw-bold" style={{ color: '#4b566b' }}>OG Title (Facebook/X Custom Link Title)</label>
                            <input
                              id="seo-ogtitle-field"
                              type="text"
                              className="form-control"
                              placeholder="Defaults to SEO Title if empty"
                              style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                              value={editOgTitle}
                              onChange={(e) => setEditOgTitle(e.target.value)}
                            />
                          </div>

                          {/* OG Description */}
                          <div className="mb-0">
                            <label htmlFor="seo-ogdesc-field" className="form-label small fw-bold" style={{ color: '#4b566b' }}>OG Description (Facebook/X Custom Link Description)</label>
                            <textarea
                              id="seo-ogdesc-field"
                              className="form-control"
                              rows={3}
                              placeholder="Defaults to SEO Meta Description if empty"
                              style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                              value={editOgDescription}
                              onChange={(e) => setEditOgDescription(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Live Real-Time Previews (Wow Factor!) */}
                      <div className="col-lg-6">
                        <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '0.75rem' }}>
                          {/* Google Snippet Preview */}
                          <h6 className="fw-bold mb-3 border-bottom pb-2" style={{ color: '#1e2022' }}>Google Desktop Snippet Simulator</h6>
                          <div className="p-3 mb-4 rounded border shadow-inner" style={{ background: '#fff', fontFamily: 'Arial, sans-serif' }}>
                            <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '0.85rem', color: '#202124' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#ffc63a' }}>F</div>
                              <div>
                                <span className="fw-normal" style={{ fontSize: '0.8rem' }}>FlexMarket</span>
                                <div style={{ fontSize: '0.72rem', color: '#5f6368', marginTop: '-2px' }}>https://flexmarket.com{editing.route}</div>
                              </div>
                            </div>
                            <h5 className="mb-1 text-primary text-clamp-1" style={{ fontSize: '1.25rem', fontFamily: 'Roboto, sans-serif', color: '#1a0dab', fontWeight: 'normal', cursor: 'pointer', margin: 0, textDecoration: 'none' }}>
                              {editTitle || 'Please enter an SEO Meta Title'}
                            </h5>
                            <p className="small mb-0 text-clamp-2" style={{ color: '#4d5156', fontSize: '0.85rem', lineHeight: '1.43', fontFamily: 'Roboto, sans-serif' }}>
                              {editDescription || 'Provide a comprehensive meta description of your page here so search engines and buyers can understand what your page deals with...'}
                            </p>
                          </div>

                          {/* Social Media Card Simulator */}
                          <h6 className="fw-bold mb-3 border-bottom pb-2" style={{ color: '#1e2022' }}>Social Sharing Card Preview (Facebook/X/LinkedIn)</h6>
                          <div className="rounded border overflow-hidden bg-white shadow-sm hover-shadow" style={{ transition: 'all 0.2s', maxWidth: 450, margin: '0 auto', width: '100%' }}>
                            {/* Card Media (Mock) */}
                            <div className="position-relative d-flex align-items-center justify-content-center bg-dark" style={{ height: 210 }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4))', zIndex: 1 }}></div>
                              <i className="bi bi-globe" style={{ fontSize: '3rem', color: 'rgba(255,198,58,0.7)', zIndex: 2 }}></i>
                              <div className="position-absolute bottom-0 start-0 m-3 text-white fw-bold" style={{ fontSize: '0.8rem', zIndex: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>FLEXMARKET PREVIEW</div>
                            </div>
                            {/* Card Content */}
                            <div className="p-3 border-top" style={{ background: '#f8f9fa' }}>
                              <div className="text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem', letterSpacing: 1, fontWeight: 700 }}>FLEXMARKET.COM</div>
                              <h6 className="fw-bold mb-1 text-clamp-1" style={{ fontSize: '0.88rem', color: '#1e2022' }}>
                                {editOgTitle || editTitle || 'Please configure a title'}
                              </h6>
                              <p className="text-muted small text-clamp-2 mb-0" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                                {editOgDescription || editDescription || 'Provide a social card description to capture users\' attention in social sharing links.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Modal Footer */}
                  <div className="modal-footer bg-white border-top p-4 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light" style={{ borderRadius: '0.5rem', fontWeight: 600, padding: '0.6rem 1.5rem' }} onClick={() => setEditing(null)}>Cancel</button>
                    <button
                      type="submit"
                      id="save-seo-btn"
                      className="btn fw-bold"
                      disabled={saving}
                      style={{ background: '#ffc63a', color: '#212529', fontWeight: 700, borderRadius: '0.5rem', padding: '0.6rem 2rem', border: 'none' }}
                    >
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving Changes...</>
                      ) : (
                        <><i className="bi bi-check-circle-fill me-2"></i> Save SEO Settings</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
