'use client';

import { useEffect, useRef, useState } from 'react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Brand { id: number; brand_name: string; seller_id: number; seller_name: string | null; seller_mobile: string | null; is_blocked: string; rejection_reason: string | null; is_active?: string | number; description?: string; listing_type_id?: number | null; listing_type_name?: string | null; created_at: string; }
interface Seller { id: number; name: string; email: string; user_type: string; }
interface Product { id: number; title: string; product_number: string; brand_id: number | null; listing_type_id?: number | null; status: string; }
interface ListingType { id: number; type_name: string; }
interface RejectionTemplate { id: number; template_text: string; type: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1.1rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.875rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const avatarStyle: React.CSSProperties = { width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffc63a', color: '#fff', fontWeight: 600, fontSize: '1rem' };

export default function BrandsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTag, setShowTag] = useState(false);
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [createForm, setCreateForm] = useState({ seller_id: '', brand_name: '', description: '', listing_type_id: '' });
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit brand state
  const [showEdit, setShowEdit] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({ brand_name: '', seller_id: '', listing_type_id: '', description: '' });

  // Block brand modal state
  const [blockTarget, setBlockTarget] = useState<Brand | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [rejectionTemplates, setRejectionTemplates] = useState<RejectionTemplate[]>([]);
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Tag products state
  const [tagSellerId, setTagSellerId] = useState('');
  const [tagBrandId, setTagBrandId] = useState('');
  const [tagProducts, setTagProducts] = useState<Product[]>([]);
  const [tagSelected, setTagSelected] = useState<Set<number>>(new Set());
  const [tagLoading, setTagLoading] = useState(false);

  // Fixed-position dropdown state
  const [openDropdown, setOpenDropdown] = useState<{ brandId: number; x: number; y: number } | null>(null);
  const dropdownOpenedAt = useRef(0);

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>, brandId: number) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (openDropdown?.brandId === brandId) {
      setOpenDropdown(null);
    } else {
      dropdownOpenedAt.current = Date.now();
      // position: fixed is viewport-relative, no scrollY needed
      setOpenDropdown({ brandId, x: rect.right, y: rect.bottom });
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Brand[]>('/superadmin/brands'),
      api.get<Seller[]>('/superadmin/sellers-list'),
      api.get<{ listing_types: ListingType[] }>('/shared/taxonomy'),
      api.get<RejectionTemplate[]>('/superadmin/rejection-templates?type=Brands'),
    ]).then(([br, sl, tx, rt]) => {
      if (br.success && br.data) setBrands(br.data);
      if (sl.success && sl.data) setSellers(sl.data);
      if (tx.success && tx.data) setListingTypes(tx.data.listing_types || []);
      if (rt.success && rt.data) setRejectionTemplates(rt.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  // Close dropdown on outside click — use mousedown + 50ms guard
  useEffect(() => {
    const handler = () => {
      if (Date.now() - dropdownOpenedAt.current > 50) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openBlockModal = (b: Brand) => { setBlockTarget(b); setBlockReason(''); };

  const handleBlock = async () => {
    if (!blockTarget) return;
    setBlockSubmitting(true);
    const fd = new FormData();
    fd.append('reason', blockReason || 'Brand Blocked');
    const res = await api.upload(`/superadmin/block-brand/${blockTarget.id}`, fd);
    setBlockSubmitting(false);
    if (res.success) {
      toast.success('Brand blocked and products rejected');
      setBlockTarget(null);
      load();
    } else {
      toast.error(res.message || 'Action failed');
    }
  };

  const handleUnblock = (id: number) => {
    confirmToast('Unblock this brand?', async () => {
      const res = await api.post(`/superadmin/unblock-brand/${id}`);
      if (res.success) {
        toast.success('Brand unblocked');
        load();
      } else {
        toast.error(res.message || 'Action failed');
      }
    }, 'Unblock');
  };

  const openEditBrand = (b: Brand) => {
    setShowEdit(b);
    setEditForm({ brand_name: b.brand_name, seller_id: String(b.seller_id || ''), listing_type_id: String(b.listing_type_id || ''), description: b.description || '' });
  };

  const handleEditBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('brand_name', editForm.brand_name);
    fd.append('seller_id', editForm.seller_id);
    fd.append('listing_type_id', editForm.listing_type_id);
    fd.append('description', editForm.description);
    const res = await api.upload(`/superadmin/update-brand/${showEdit.id}`, fd);
    setSubmitting(false);
    if (res.success) {
      toast.success('Brand updated');
      setShowEdit(null);
      load();
    } else {
      toast.error(res.message || 'Update failed');
    }
  };

  const handleDeleteBrand = (id: number) => {
    confirmToast('Delete this brand? Products will be untagged. This cannot be undone.', async () => {
      const res = await api.post(`/superadmin/delete-brand/${id}`);
      if (res.success) {
        toast.success('Brand deleted');
        load();
      } else {
        toast.error(res.message || 'Delete failed');
      }
    }, 'Delete');
  };

  const toggleDeactivate = (id: number, isActive: boolean) => {
    const action = isActive ? 'Deactivate' : 'Activate';
    confirmToast(`${action} this brand?${isActive ? ' Products remain visible without brand name.' : ''}`, async () => {
      const res = await api.post(`/superadmin/${isActive ? 'deactivate' : 'activate'}-brand/${id}`);
      if (res.success) {
        toast.success(`Brand ${action === 'Deactivate' ? 'deactivated' : 'activated'}`);
        load();
      } else {
        toast.error(res.message || 'Action failed');
      }
    }, action);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    fd.append('brand_name', createForm.brand_name);
    fd.append('seller_id', createForm.seller_id);
    fd.append('description', createForm.description);
    if (createForm.listing_type_id) fd.append('listing_type_id', createForm.listing_type_id);
    const res = await api.upload('/superadmin/create-brand', fd);
    setSubmitting(false);
    if (res.success) {
      toast.success('Brand created successfully!');
      setShowCreate(false);
      setCreateForm({ seller_id: '', brand_name: '', description: '', listing_type_id: '' });
      load();
    }
    else toast.error(res.message || 'Failed');
  };

  const openTagModal = (brandId: number, sellerId: number | null) => {
    const brand = brands.find((b) => b.id === brandId);
    const ltId = brand?.listing_type_id ? String(brand.listing_type_id) : undefined;
    setTagBrandId(String(brandId));
    setTagSellerId(sellerId ? String(sellerId) : '');
    setTagProducts([]);
    setTagSelected(new Set());
    setShowTag(true);
    if (sellerId) loadProducts(String(sellerId), String(brandId), ltId);
  };

  const loadProducts = async (uid: string, brandId?: string, listingTypeId?: string) => {
    setTagLoading(true);
    const qs = listingTypeId ? `?listing_type_id=${listingTypeId}` : '';
    const res = await api.get<any>(`/superadmin/get-products-by-user/${uid}${qs}`);
    const products = res.success && res.data?.products ? res.data.products
      : res.success && (res as any).products ? (res as any).products : [];
    setTagProducts(products);
    // Pre-select products already tagged with this brand
    const activeBrandId = brandId ?? tagBrandId;
    if (activeBrandId) {
      setTagSelected(new Set(products.filter((p: Product) => String(p.brand_id) === activeBrandId).map((p: Product) => p.id)));
    } else {
      setTagSelected(new Set());
    }
    setTagLoading(false);
  };

  const handleTagSellerChange = (uid: string) => {
    setTagSellerId(uid);
    setTagSelected(new Set());
    const brand = brands.find((b) => String(b.id) === tagBrandId);
    const ltId = brand?.listing_type_id ? String(brand.listing_type_id) : undefined;
    if (uid) loadProducts(uid, tagBrandId, ltId);
    else setTagProducts([]);
  };

  const toggleTagProduct = (id: number) => {
    setTagSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAllTag = () => {
    if (tagSelected.size === tagProducts.length) setTagSelected(new Set());
    else setTagSelected(new Set(tagProducts.map((p) => p.id)));
  };

  const applyTag = async () => {
    if (!tagBrandId) return;
    const fd = new FormData();
    fd.append('brand_id', tagBrandId);
    // Selected → tag
    tagSelected.forEach((id) => fd.append('product_ids[]', String(id)));
    // Deselected products that currently belong to this brand → untag
    tagProducts
      .filter((p) => !tagSelected.has(p.id) && String(p.brand_id) === tagBrandId)
      .forEach((p) => fd.append('untag_ids[]', String(p.id)));
    const res = await api.upload('/superadmin/bulk-tag-products', fd);
    if (res.success) {
      toast.success('Products tagged successfully');
      setShowTag(false);
      load();
    }
    else toast.error(res.message || 'Failed');
  };

  const filteredSellers = sellers.filter((s) => !sellerSearch || s.name.toLowerCase().includes(sellerSearch.toLowerCase()) || s.email.toLowerCase().includes(sellerSearch.toLowerCase()));

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-patch-check-fill" style={{ color: '#ffc63a' }}></i> Brand Management
            </h1>
            <p className="text-muted small mb-0">Manage official brands and assign them to sellers.</p>
          </div>
          <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={() => setShowCreate(true)}>
            <i className="bi bi-plus-lg"></i> Create Brand
          </button>
        </div>

        <BulkCsvUpload
          endpoint="/superadmin/bulk-upload-brands"
          templateCsv="brand_name,listing_type_id,seller_id,description\nNike,1,,Premium sportswear\nAdidas,1,,Sports & lifestyle"
          templateFilename="brands_template.csv"
          formatGuide="brand_name (required), listing_type_id, seller_id, description"
          title="Bulk Upload Brands"
        />

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Brand</th>
                    <th style={thStyle}>Listing Type</th>
                    <th style={thStyle}>Seller Assigned</th>
                    <th style={thStyle}>Created At</th>
                    <th style={thStyle}>Rejection Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {brands.length > 0 ? brands.map((b) => (
                      <tr key={b.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }}>
                          <div className="d-flex align-items-center gap-3">
                            <div style={avatarStyle}>{(b.brand_name || '?').charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="fw-bold">{b.brand_name}</div>
                              <small className="text-muted">ID: #{b.id}</small>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {b.listing_type_name ? (
                            <span className="badge px-3 py-2" style={{ background: 'rgba(255,198,58,0.15)', color: '#b8860b', fontWeight: 600 }}>{b.listing_type_name}</span>
                          ) : <span className="text-muted fst-italic">Not set</span>}
                        </td>
                        <td style={tdStyle}>
                          {b.seller_name ? (
                            <><div className="fw-semibold">{b.seller_name}</div><small className="text-muted"><i className="bi bi-phone me-1"></i>{b.seller_mobile}</small></>
                          ) : <span className="text-muted fst-italic">No seller linked</span>}
                        </td>
                        <td style={tdStyle}>
                          <small className="d-block fw-bold">{new Date(b.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
                          <small className="text-muted">{new Date(b.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                        </td>
                        <td style={tdStyle}>
                          {b.rejection_reason ? (
                            <div style={{ maxWidth: 200 }} className="text-danger small fw-medium">
                              <i className="bi bi-info-circle me-1"></i>{b.rejection_reason}
                            </div>
                          ) : '-'}
                        </td>
                        <td style={tdStyle}>
                          {Number(b.is_blocked) ? (
                            <span className="badge px-3 py-2" style={{ background: 'rgba(237,76,120,0.1)', color: '#ed4c78', fontWeight: 700 }}>Blocked</span>
                          ) : Number(b.is_active ?? 1) ? (
                            <span className="badge px-3 py-2" style={{ background: 'rgba(0,201,167,0.1)', color: '#00c9a7', fontWeight: 700 }}>Active</span>
                          ) : (
                            <span className="badge px-3 py-2" style={{ background: 'rgba(108,117,125,0.1)', color: '#6c757d', fontWeight: 700 }}>Inactive</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          <button
                            className="btn btn-light btn-sm border"
                            style={{ borderRadius: 8 }}
                            onClick={(e) => toggleDropdown(e, b.id)}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-5">
                        <i className="bi bi-patch-exclamation" style={{ fontSize: '2.5rem', color: '#ddd' }}></i>
                        <div className="fw-bold mt-2">No brands found</div>
                        <p className="text-muted small">You haven't created any brands yet.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Brand Modal */}
      {showCreate && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowCreate(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc63a', borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-patch-plus me-2" style={{ color: '#ffc63a' }}></i>Create Official Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body p-4" onClick={() => setSellerDropdownOpen(false)}>
                  <div className="mb-3" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <label style={labelStyle}>Select Owner (Seller/Hybrid)</label>
                    {/* Display box */}
                    <div
                      className="form-control d-flex align-items-center justify-content-between"
                      style={{ ...inputStyle, cursor: 'pointer', minHeight: 44, background: createForm.seller_id ? '#fff' : '#f8f9fa' }}
                      onClick={() => setSellerDropdownOpen(!sellerDropdownOpen)}
                    >
                      {createForm.seller_id ? (
                        <span className="fw-bold" style={{ color: '#ffc63a' }}>
                          {sellers.find((s) => String(s.id) === createForm.seller_id)?.name || 'Selected'}
                        </span>
                      ) : (
                        <span className="text-muted">Choose a user...</span>
                      )}
                      <i className={`bi bi-chevron-${sellerDropdownOpen ? 'up' : 'down'} text-muted`}></i>
                    </div>

                    {/* Dropdown */}
                    {sellerDropdownOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
                        background: '#fff', border: '1px solid #e7eaf3', borderRadius: '0.5rem',
                        marginTop: 4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: 250, overflowY: 'auto',
                      }}>
                        {/* Search */}
                        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: 8, borderBottom: '1px solid #eee', zIndex: 1 }}>
                          <input
                            className="form-control form-control-sm"
                            style={{ ...inputStyle, fontSize: '0.8rem' }}
                            placeholder="Search user..."
                            value={sellerSearch}
                            onChange={(e) => setSellerSearch(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Options */}
                        {filteredSellers.length > 0 ? filteredSellers.map((s) => (
                          <div
                            key={s.id}
                            className="px-3 py-2"
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              background: createForm.seller_id === String(s.id) ? 'rgba(255,198,58,0.12)' : undefined,
                              borderLeft: createForm.seller_id === String(s.id) ? '3px solid #ffc63a' : '3px solid transparent',
                            }}
                            onMouseEnter={(e) => { if (createForm.seller_id !== String(s.id)) e.currentTarget.style.background = '#f8f9fa'; }}
                            onMouseLeave={(e) => { if (createForm.seller_id !== String(s.id)) e.currentTarget.style.background = 'transparent'; }}
                            onClick={() => {
                              setCreateForm({ ...createForm, seller_id: String(s.id) });
                              setSellerDropdownOpen(false);
                              setSellerSearch('');
                            }}
                          >
                            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{s.name}</span>
                            <span className="d-block small text-muted">{s.email} — {s.user_type === 'both' ? 'Hybrid' : s.user_type}</span>
                          </div>
                        )) : (
                          <div className="px-3 py-3 text-center text-muted small">No sellers found</div>
                        )}
                      </div>
                    )}
                    <div className="form-text small mt-1">Assign this brand to a certified seller or hybrid user.</div>
                  </div>
                  <div className="mb-3"><label style={labelStyle}>Brand Name</label><input className="form-control" style={inputStyle} placeholder="Enter official brand name" required value={createForm.brand_name} onChange={(e) => setCreateForm({ ...createForm, brand_name: e.target.value })} /></div>
                  <div className="mb-3">
                    <label style={labelStyle}>Listing Type</label>
                    <select className="form-select" style={inputStyle} value={createForm.listing_type_id} onChange={(e) => setCreateForm({ ...createForm, listing_type_id: e.target.value })}>
                      <option value="">Select Listing Type</option>
                      {listingTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.type_name}</option>)}
                    </select>
                    <div className="form-text small mt-1">Which listing type does this brand belong to?</div>
                  </div>
                  <div className="mb-0"><label style={labelStyle}>Description (Optional)</label><textarea className="form-control" style={inputStyle} rows={3} placeholder="Brief about the brand..." value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} /></div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0" style={{ background: '#f8f9fa' }}>
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4 fw-bold" style={btnGold} disabled={submitting || !createForm.seller_id}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tag Products Modal */}
      {showTag && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowTag(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc63a', borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-tag-fill me-2" style={{ color: '#ffc63a' }}></i>Bulk Tag Products to Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowTag(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label style={labelStyle}>1. Select User (Seller/Hybrid)</label>
                    <select className="form-select" style={inputStyle} value={tagSellerId} onChange={(e) => handleTagSellerChange(e.target.value)}>
                      <option value="">Choose a user...</option>
                      {sellers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label style={labelStyle}>2. Select Target Brand</label>
                    <select className="form-select" style={inputStyle} value={tagBrandId} onChange={(e) => setTagBrandId(e.target.value)}>
                      <option value="">Choose a brand...</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                    </select>
                  </div>
                </div>

                {tagSellerId && (
                  tagLoading ? (
                    <div className="text-center py-4"><div className="spinner-border spinner-border-sm" style={{ color: '#ffc63a' }}></div> Loading products...</div>
                  ) : tagProducts.length > 0 ? (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label style={labelStyle} className="mb-0">3. Select Products</label>
                        <div className="form-check"><input className="form-check-input" type="checkbox" checked={tagSelected.size === tagProducts.length} onChange={selectAllTag} /><label className="form-check-label small">Select All</label></div>
                      </div>
                      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e7eaf3', borderRadius: 8 }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="table-light" style={{ position: 'sticky', top: 0 }}><tr><th style={{ width: 40, paddingLeft: 12 }}></th><th>Product Info</th><th>Status</th><th>Current Brand</th></tr></thead>
                          <tbody>
                            {tagProducts.map((p) => {
                              const isTaggedHere = String(p.brand_id) === tagBrandId;
                              const currentBrand = p.brand_id ? brands.find((b) => b.id == p.brand_id)?.brand_name || 'Unknown' : 'None';
                              return (
                                <tr key={p.id} style={isTaggedHere ? { background: 'rgba(255,198,58,0.08)', borderLeft: '3px solid #ffc63a' } : {}}>
                                  <td style={{ paddingLeft: 12 }}><input type="checkbox" className="form-check-input" checked={tagSelected.has(p.id)} onChange={() => toggleTagProduct(p.id)} /></td>
                                  <td>
                                    <div className="fw-semibold small">{p.title}</div>
                                    <div className="text-muted" style={{ fontSize: 10 }}>{p.product_number}</div>
                                  </td>
                                  <td>
                                    <span className={`badge ${p.status === 'approved' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border-0 px-2 py-1`} style={{ fontSize: 9 }}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td>
                                    {isTaggedHere
                                      ? <span className="badge" style={{ background: 'rgba(255,198,58,0.2)', color: '#b8860b', fontWeight: 600 }}><i className="bi bi-tag-fill me-1"></i>{currentBrand}</span>
                                      : <small className="text-muted">{currentBrand}</small>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : <div className="text-center py-4"><i className="bi bi-box-seam" style={{ fontSize: '2rem', color: '#ddd' }}></i><p className="text-muted mb-0 mt-2">No products found for this user.</p></div>
                )}
              </div>
              <div className="modal-footer border-0 p-4 pt-0" style={{ background: '#f8f9fa' }}>
                <button className="btn btn-light px-4" onClick={() => setShowTag(false)}>Cancel</button>
                <button className="btn sa-filter-btn px-4 fw-bold" style={btnGold} disabled={!tagBrandId || !tagSellerId} onClick={applyTag}>
                  Apply Tag ({tagSelected.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEdit && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowEdit(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc63a', borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-pencil-square me-2" style={{ color: '#ffc63a' }}></i>Edit Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowEdit(null)}></button>
              </div>
              <form onSubmit={handleEditBrand}>
                <div className="modal-body p-4">
                  <div className="mb-3"><label style={labelStyle}>Brand Name</label><input className="form-control" style={inputStyle} required value={editForm.brand_name} onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })} /></div>
                  <div className="mb-3">
                    <label style={labelStyle}>Listing Type</label>
                    <select className="form-select" style={inputStyle} value={editForm.listing_type_id} onChange={(e) => setEditForm({ ...editForm, listing_type_id: e.target.value })}>
                      <option value="">Select Listing Type</option>
                      {listingTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.type_name}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label style={labelStyle}>Seller</label>
                    <div className="form-control" style={{ ...inputStyle, background: '#f0f2f5', color: '#4b566b', cursor: 'not-allowed' }}>
                      {showEdit?.seller_name || <span className="text-muted fst-italic">No seller linked</span>}
                    </div>
                    <div className="form-text small mt-1 text-muted">Seller cannot be changed after brand creation.</div>
                  </div>
                  <div className="mb-0"><label style={labelStyle}>Description</label><textarea className="form-control" style={inputStyle} rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0" style={{ background: '#f8f9fa' }}>
                  <button type="button" className="btn btn-light px-4" onClick={() => setShowEdit(null)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4 fw-bold" style={btnGold} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Block Brand Modal */}
      {blockTarget && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setBlockTarget(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header" style={{ background: '#fff5f5', borderBottom: '2px solid #dc3545', borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.25rem' }}>
                <h5 className="modal-title fw-bold text-danger"><i className="bi bi-slash-circle me-2"></i>Block Brand — {blockTarget?.brand_name}</h5>
                <button type="button" className="btn-close" onClick={() => setBlockTarget(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-warning py-2 small mb-4">
                  <i className="bi bi-exclamation-triangle me-2"></i>All <strong>approved/listed</strong> products under this brand will be <strong>rejected</strong>. The reason below will be shown to the seller.
                </div>
                
                <div className="mb-3">
                  <label style={labelStyle}>Rejection Template (Optional)</label>
                  <select 
                    className="form-select" 
                    style={inputStyle} 
                    onChange={(e) => { 
                      const t = rejectionTemplates.find(r => String(r.id) === e.target.value); 
                      if (t) setBlockReason(t.template_text); 
                    }}
                  >
                    <option value="">— Select a saved template —</option>
                    {rejectionTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.template_text.substring(0, 60)}...</option>
                    ))}
                  </select>
                  <div className="form-text small mt-1">
                    {rejectionTemplates.length === 0 ? (
                      <span className="text-muted"><i className="bi bi-info-circle me-1"></i>No "Brands" templates found. Managed in Business Settings.</span>
                    ) : (
                      <span className="text-muted">Select a template to pre-fill the reason below.</span>
                    )}
                  </div>
                </div>

                <div className="mb-0">
                  <label style={labelStyle}>Reason shown to Seller</label>
                  <textarea 
                    className="form-control" 
                    style={inputStyle} 
                    rows={3} 
                    placeholder="e.g. Counterfeit items reported, Brand licensing expired" 
                    value={blockReason} 
                    onChange={(e) => setBlockReason(e.target.value)} 
                  />
                  <div className="form-text small mt-1 text-muted">
                    <i className="bi bi-info-circle me-1"></i>Leave blank to use default: <strong>"Brand Blocked"</strong>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button className="btn btn-light px-4" onClick={() => setBlockTarget(null)}>Cancel</button>
                <button className="btn btn-danger px-4 fw-bold" disabled={blockSubmitting} onClick={handleBlock}>
                  {blockSubmitting ? 'Blocking...' : 'Confirm Block'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Fixed-position action dropdown — renders outside table to avoid overflow clipping */}
      {openDropdown && (() => {
        const b = brands.find(br => br.id === openDropdown.brandId);
        if (!b) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: openDropdown.y + 6,
              left: openDropdown.x - 230,
              zIndex: 99999,
              background: '#fff',
              border: '1px solid #e7eaf3',
              borderRadius: '0.75rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              padding: '0.5rem',
              minWidth: 230,
            }}
          >
            {[
              { label: 'Edit Brand', icon: 'bi-pencil', color: '#f59e0b', onClick: () => { setOpenDropdown(null); openEditBrand(b); } },
              { label: 'Tag Products', icon: 'bi-tag-fill', color: '#ffc63a', onClick: () => { setOpenDropdown(null); openTagModal(b.id, b.seller_id); } },
            ].map((item) => (
              <button key={item.label} onClick={item.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#374151', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>
                {item.label}
              </button>
            ))}
            <div style={{ height: 1, background: '#f0f0f0', margin: '0.3rem 0.5rem' }} />
            <button onClick={() => { setOpenDropdown(null); toggleDeactivate(b.id, !Number(b.is_blocked) && Number(b.is_active ?? 1) === 1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#6c757d', textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className={`bi ${Number(b.is_active ?? 1) ? 'bi-pause-circle' : 'bi-play-circle'}`} style={{ fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>
              {Number(b.is_active ?? 1) ? 'Deactivate' : 'Activate'}
            </button>
            {Number(b.is_blocked) ? (
              <button onClick={() => { setOpenDropdown(null); handleUnblock(b.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#198754', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <i className="bi bi-check-circle" style={{ fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>Unblock
              </button>
            ) : (
              <button onClick={() => { setOpenDropdown(null); openBlockModal(b); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#dc3545', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <i className="bi bi-slash-circle" style={{ fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>Block (Reject Products)
              </button>
            )}
            <div style={{ height: 1, background: '#f0f0f0', margin: '0.3rem 0.5rem' }} />
            <button onClick={() => { setOpenDropdown(null); handleDeleteBrand(b.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#dc3545', textAlign: 'left', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="bi bi-trash" style={{ fontSize: '0.95rem', width: 18, textAlign: 'center' }}></i>Delete Brand
            </button>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
