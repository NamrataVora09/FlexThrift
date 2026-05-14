'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BulkCsvUpload from '@/components/shared/BulkCsvUpload';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface OBrand {
  id: number;
  brand_name: string;
  brand_image: string | null;
  description: string | null;
  is_active: string;
  created_at: string;
  listing_type_id?: number | null;
  listing_type_ids?: number[];
  listing_type_names?: string[];
}

interface ListingType {
  id: number;
  type_name: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', borderBottom: '2px solid #eef2f5', color: '#677788', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, padding: '1.1rem 1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.8rem', color: '#4b566b', marginBottom: 6, display: 'block' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const logoStyle: React.CSSProperties = { width: 50, height: 50, objectFit: 'contain', background: '#fff', padding: 5, borderRadius: 8, border: '1px solid #eee' };
const logoPlaceholder: React.CSSProperties = { ...logoStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '1.2rem' };

export default function OriginalBrandsClient() {
  const [brands, setBrands] = useState<OBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<OBrand | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Table search
  const [brandSearch, setBrandSearch] = useState('');

  // Pagination
  const PAGE_SIZE = 10;
  const [brandPage, setBrandPage] = useState(1);

  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);

  // Add form states
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addLtIds, setAddLtIds] = useState<number[]>([]);
  const [addLtSearch, setAddLtSearch] = useState('');
  const [addShowLtDropdown, setAddShowLtDropdown] = useState(false);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState('1');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editLtIds, setEditLtIds] = useState<number[]>([]);
  const [editLtSearch, setEditLtSearch] = useState('');
  const [editShowLtDropdown, setEditShowLtDropdown] = useState(false);

  // Refs for outside click detection
  const addLtRef = useRef<HTMLDivElement>(null);
  const editLtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addLtRef.current && !addLtRef.current.contains(event.target as Node)) {
        setAddShowLtDropdown(false);
      }
      if (editLtRef.current && !editLtRef.current.contains(event.target as Node)) {
        setEditShowLtDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<OBrand[]>('/superadmin/original-brands'),
      api.get<{ listing_types: ListingType[] }>('/shared/taxonomy'),
    ]).then(([br, tx]) => {
      if (br.success && br.data) setBrands(br.data);
      if (tx.success && tx.data) setListingTypes(tx.data.listing_types || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  // Filter listing types based on search
  const filteredAddLt = listingTypes.filter(lt =>
    lt.type_name.toLowerCase().includes(addLtSearch.toLowerCase()) &&
    !addLtIds.includes(lt.id)
  );

  const filteredEditLt = listingTypes.filter(lt =>
    lt.type_name.toLowerCase().includes(editLtSearch.toLowerCase()) &&
    !editLtIds.includes(lt.id)
  );

  // Add listing type to selection (Add modal)
  const addListingType = (id: number) => {
    if (!addLtIds.includes(id)) {
      setAddLtIds([...addLtIds, id]);
      setAddLtSearch('');
    }
  };

  // Remove listing type from selection (Add modal)
  const removeAddListingType = (id: number) => {
    setAddLtIds(addLtIds.filter(ltId => ltId !== id));
  };

  // Add listing type to selection (Edit modal)
  const addEditListingType = (id: number) => {
    if (!editLtIds.includes(id)) {
      setEditLtIds([...editLtIds, id]);
      setEditLtSearch('');
    }
  };

  // Remove listing type from selection (Edit modal)
  const removeEditListingType = (id: number) => {
    setEditLtIds(editLtIds.filter(ltId => ltId !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addLtIds.length === 0) {
      toast.error('Please select at least one listing type');
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('brand_name', addName);
    fd.append('description', addDesc);
    fd.append('listing_type_ids', JSON.stringify(addLtIds));
    if (addFile) fd.append('brand_image', addFile);

    try {
      const res = await api.upload('/superadmin/add-original-brand', fd);
      setSubmitting(false);
      if (res.success) {
        toast.success('Brand created successfully!');
        setShowAdd(false);
        setAddName('');
        setAddDesc('');
        setAddFile(null);
        setAddLtIds([]);
        setAddLtSearch('');
        load();
      } else {
        toast.error(res.message || 'Failed');
      }
    } catch (err) {
      setSubmitting(false);
      toast.error('Error creating brand');
    }
  };

  const openEdit = (b: OBrand) => {
    setShowEdit(b);
    setEditName(b.brand_name);
    setEditDesc(b.description || '');
    setEditActive(String(b.is_active));

    // Handle listing_type_ids being string (JSON from PHP) or array
    let ltIds: number[] = [];
    if (Array.isArray(b.listing_type_ids)) {
      ltIds = b.listing_type_ids;
    } else if (typeof b.listing_type_ids === 'string') {
      try { ltIds = JSON.parse(b.listing_type_ids); } catch { ltIds = []; }
    } else if (b.listing_type_id) {
      ltIds = [Number(b.listing_type_id)];
    }
    setEditLtIds(ltIds.map(Number));

    setEditFile(null);
    setEditLtSearch('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    if (editLtIds.length === 0) {
      toast.error('Please select at least one listing type');
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('brand_name', editName);
    fd.append('description', editDesc);
    fd.append('is_active', editActive);
    fd.append('listing_type_ids', JSON.stringify(editLtIds));
    if (editFile) fd.append('brand_image', editFile);

    try {
      const res = await api.upload(`/superadmin/update-original-brand/${showEdit.id}`, fd);
      setSubmitting(false);
      if (res.success) {
        toast.success('Brand updated successfully!');
        setShowEdit(null);
        load();
      } else {
        toast.error(res.message || 'Failed');
      }
    } catch (err) {
      setSubmitting(false);
      toast.error('Error updating brand');
    }
  };

  const handleDelete = (id: number) => {
    confirmToast('Are you sure you want to delete this brand? Products will be untagged. This cannot be undone.', async () => {
      try {
        const res = await api.post(`/superadmin/delete-original-brand/${id}`);
        if (res.success) {
          toast.success('Brand deleted successfully');
          load();
        } else {
          toast.error(res.message || 'Delete failed');
        }
      } catch (err) {
        toast.error('Error deleting brand');
      }
    }, 'Delete');
  };

  const Paginator = ({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex align-items-center justify-content-between mt-3 px-3 pb-3">
        <small className="text-muted">Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</small>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page - 1)} style={{ color: '#ffc63a', borderColor: '#e7eaf3' }}>&#8249;</button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)} style={p === page ? { background: '#ffc63a', borderColor: '#ffc63a', color: '#fff' } : { color: '#ffc63a', borderColor: '#e7eaf3' }}>{p}</button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page + 1)} style={{ color: '#ffc63a', borderColor: '#e7eaf3' }}>&#8250;</button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-shield-check" style={{ color: '#ffc63a' }}></i> Original Brands
            </h1>
            <p className="text-muted small mb-0">Manage official brands by listing type (Clothing brands, Electronics brands, etc.)</p>
          </div>
          <button className="btn sa-filter-btn d-flex align-items-center gap-2" style={btnGold} onClick={() => setShowAdd(true)}>
            <i className="bi bi-plus-lg"></i> Add New Brand
          </button>
        </div>

        <BulkCsvUpload
          endpoint="/superadmin/bulk-upload-original-brands"
          templateCsv={'brand_name,listing_types,brand_image,description\nNike,"Clothing, Footwear",https://example.com/nike.png,Premium sportswear\nZara,Clothing,,Fashion brand'}
          templateFilename="original_brands_template.csv"
          formatGuide="brand_name (required), listing_types (Listing Type Names, comma separated), brand_image (URL or path), description"
          title="Bulk Upload Original Brands"
          onSuccess={load}
        />

        {/* Table */}
        <div className="card border-0" style={{ borderRadius: '1rem', boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.05)' }}>
          <div className="card-body p-0">
            {/* Search bar */}
            <div className="p-3 border-bottom" style={{ background: '#fafbfc' }}>
              <div className="position-relative">
                <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
                <input
                  className="form-control"
                  style={{ ...inputStyle, paddingLeft: 40 }}
                  placeholder="Search brands by name, listing type, or description..."
                  value={brandSearch}
                  onChange={(e) => { setBrandSearch(e.target.value); setBrandPage(1); }}
                />
              </div>
              {brandSearch && <small className="text-muted mt-1 d-block">{brands.filter(b => (b.brand_name + ' ' + (b.listing_type_names?.join(' ') || '') + ' ' + (b.description || '')).toLowerCase().includes(brandSearch.toLowerCase())).length} result(s)</small>}
            </div>
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Logo</th>
                      <th style={thStyle}>Brand Name</th>
                      <th style={thStyle}>Listing Types</th>
                      <th style={thStyle}>Description</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => { 
                      const filtered = brands.filter(b => (b.brand_name + ' ' + (b.listing_type_names?.join(' ') || '') + ' ' + (b.description || '')).toLowerCase().includes(brandSearch.toLowerCase())); 
                      const paged = filtered.slice((brandPage - 1) * PAGE_SIZE, brandPage * PAGE_SIZE);
                      return paged.length > 0 ? paged.map((b) => (
                      <tr key={b.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }}>
                          {b.brand_image ? (
                            <img src={`http://localhost:8080/${b.brand_image}`} alt={b.brand_name} style={logoStyle} />
                          ) : (
                            <div style={logoPlaceholder}><i className="bi bi-image"></i></div>
                          )}
                        </td>
                        <td style={tdStyle} className="fw-bold">{b.brand_name}</td>
                        <td style={tdStyle}>
                          {b.listing_type_names && b.listing_type_names.length > 0 ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {b.listing_type_names.map((name, idx) => (
                                <span key={idx} className="badge px-3 py-2" style={{ background: 'rgba(255,198,58,0.15)', color: '#b8860b', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted fst-italic">Not set</span>
                          )}
                        </td>
                        <td style={tdStyle} className="text-muted small">
                          {(b.description || '').length > 50 ? b.description!.substring(0, 50) + '...' : b.description || '—'}
                        </td>
                        <td style={tdStyle}>
                          <span className="badge rounded-pill px-3 py-2" style={Number(b.is_active) ? { background: 'rgba(25,135,84,0.1)', color: '#198754', fontWeight: 600 } : { background: 'rgba(220,53,69,0.1)', color: '#dc3545', fontWeight: 600 }}>
                            {Number(b.is_active) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => openEdit(b)} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => handleDelete(b.id)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">{brandSearch ? `No results for "${brandSearch}"` : 'No brands found.'}</td>
                      </tr>
                    ); })()}
                  </tbody>
                </table>
              </div>
            )}
            <Paginator 
              total={brands.filter(b => (b.brand_name + ' ' + (b.listing_type_names?.join(' ') || '') + ' ' + (b.description || '')).toLowerCase().includes(brandSearch.toLowerCase())).length} 
              page={brandPage} 
              setPage={setBrandPage} 
            />
          </div>
        </div>
      </div>

      {/* Add Brand Modal */}
      {showAdd && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowAdd(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">Add Original Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body py-4 px-4">
                  <div className="mb-3">
                    <label style={labelStyle}>Brand Name</label>
                    <input className="form-control" style={inputStyle} placeholder="e.g. Nike, Zara" required value={addName} onChange={(e) => setAddName(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label style={labelStyle}>Applicable Listing Types <span style={{ color: '#dc3545' }}>*</span></label>
                    <p className="small text-muted mb-2">Select which listing types this brand applies to. Example: Zara for Clothing/Footwear/Accessories, HP for Electronics.</p>

                    {/* Search Input with Radio Buttons */}
                    <div ref={addLtRef} style={{ position: 'relative', marginBottom: 10 }}>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        placeholder="Search listing types..."
                        value={addLtSearch}
                        onChange={(e) => setAddLtSearch(e.target.value)}
                        onFocus={() => setAddShowLtDropdown(true)}
                      />
                      <i className="bi bi-search" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '0.875rem' }}></i>

                      {/* Dropdown with Radio Options */}
                      {addShowLtDropdown && filteredAddLt.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#fff',
                          border: '1px solid #e7eaf3',
                          borderRadius: '0.5rem',
                          marginTop: 4,
                          zIndex: 1000,
                          maxHeight: 200,
                          overflowY: 'auto',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {filteredAddLt.map((lt) => (
                            <label key={lt.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              userSelect: 'none'
                            }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <input
                                type="checkbox"
                                style={{ cursor: 'pointer', marginRight: 8 }}
                                checked={addLtIds.includes(lt.id)}
                                onChange={() => addListingType(lt.id)}
                              />
                              <span style={{ fontSize: '0.875rem' }}>{lt.type_name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Types */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {addLtIds.map((id) => {
                        const lt = listingTypes.find(l => String(l.id) === String(id));
                        return (
                          <span key={id} className="badge px-3 py-2" style={{ background: 'rgba(255,198,58,0.2)', color: '#b8860b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lt?.type_name || `Type #${id}`}
                            <button
                              type="button"
                              onClick={() => removeAddListingType(id)}
                              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    {addLtIds.length === 0 && <small style={{ color: '#dc3545' }}>⚠ Please select at least one listing type</small>}
                  </div>

                  <div className="mb-3">
                    <label style={labelStyle}>Brand Logo</label>
                    <input type="file" className="form-control" style={inputStyle} accept="image/*" onChange={(e) => setAddFile(e.target.files?.[0] || null)} />
                  </div>

                  <div className="mb-0">
                    <label style={labelStyle}>Description</label>
                    <textarea className="form-control" style={inputStyle} rows={2} value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
                  </div>
                </div>

                <div className="modal-footer border-0 px-4 pb-4">
                  <button type="button" className="btn btn-light" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4" style={btnGold} disabled={submitting || addLtIds.length === 0}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEdit && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setShowEdit(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">Edit Original Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowEdit(null)}></button>
              </div>
              <form onSubmit={handleEdit}>
                <div className="modal-body py-4 px-4">
                  {showEdit.brand_image && (
                    <div className="text-center mb-3">
                      <img src={`http://localhost:8080/${showEdit.brand_image}`} alt="" style={{ width: 80, height: 80, objectFit: 'contain', background: '#fff', padding: 5, borderRadius: 10, border: '1px solid #eee' }} />
                    </div>
                  )}

                  <div className="mb-3">
                    <label style={labelStyle}>Brand Name</label>
                    <input className="form-control" style={inputStyle} required value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label style={labelStyle}>Applicable Listing Types <span style={{ color: '#dc3545' }}>*</span></label>
                    <p className="small text-muted mb-2">Select which listing types this brand applies to.</p>

                    {/* Search Input with Radio Buttons */}
                    <div ref={editLtRef} style={{ position: 'relative', marginBottom: 10 }}>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        placeholder="Search listing types..."
                        value={editLtSearch}
                        onChange={(e) => setEditLtSearch(e.target.value)}
                        onFocus={() => setEditShowLtDropdown(true)}
                      />
                      <i className="bi bi-search" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '0.875rem' }}></i>

                      {/* Dropdown with Radio Options */}
                      {editShowLtDropdown && filteredEditLt.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#fff',
                          border: '1px solid #e7eaf3',
                          borderRadius: '0.5rem',
                          marginTop: 4,
                          zIndex: 1000,
                          maxHeight: 200,
                          overflowY: 'auto',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {filteredEditLt.map((lt) => (
                            <label key={lt.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              userSelect: 'none'
                            }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <input
                                type="checkbox"
                                style={{ cursor: 'pointer', marginRight: 8 }}
                                checked={editLtIds.includes(lt.id)}
                                onChange={() => addEditListingType(lt.id)}
                              />
                              <span style={{ fontSize: '0.875rem' }}>{lt.type_name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Types */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {editLtIds.map((id) => {
                        const lt = listingTypes.find(l => String(l.id) === String(id));
                        return (
                          <span key={id} className="badge px-3 py-2" style={{ background: 'rgba(255,198,58,0.2)', color: '#b8860b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lt?.type_name || `Type #${id}`}
                            <button
                              type="button"
                              onClick={() => removeEditListingType(id)}
                              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    {editLtIds.length === 0 && <small style={{ color: '#dc3545' }}>⚠ Please select at least one listing type</small>}
                  </div>

                  <div className="mb-3">
                    <label style={labelStyle}>Change Logo</label>
                    <input type="file" className="form-control" style={inputStyle} accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
                  </div>

                  <div className="mb-3">
                    <label style={labelStyle}>Status</label>
                    <select className="form-select" style={inputStyle} value={editActive} onChange={(e) => setEditActive(e.target.value)}>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="mb-0">
                    <label style={labelStyle}>Description</label>
                    <textarea className="form-control" style={inputStyle} rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </div>
                </div>

                <div className="modal-footer border-0 px-4 pb-4">
                  <button type="button" className="btn btn-light" onClick={() => setShowEdit(null)}>Cancel</button>
                  <button type="submit" className="btn sa-filter-btn px-4" style={btnGold} disabled={submitting || editLtIds.length === 0}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal removed in favor of confirmToast */}
    </DashboardLayout>
  );
}
