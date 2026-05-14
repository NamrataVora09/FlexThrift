'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';

interface ListingType { id: number; type_name?: string; name?: string; usage_label?: string; image?: string; field_config?: string; created_at?: string; }
interface Gender { id: number; name: string; created_at?: string; }
interface ProductType { id: number; name: string; listing_type_id: number; created_at?: string; }
interface Category { id: number; category_name?: string; name?: string; product_type_ids?: string; product_type_id?: number; applies_to?: string; field_config?: string; created_at?: string; }
interface SubCategory { id: number; name: string; category_ids?: string; category_id?: number; applies_to?: string; field_config?: string; created_at?: string; }
interface Color { id: number; name: string; hex_code: string; created_at?: string; }
interface Attribute { name: string; type: string; required?: boolean; options?: string; }
interface TaxData { listing_types: ListingType[]; genders: Gender[]; product_types: ProductType[]; categories: Category[]; sub_categories: SubCategory[]; colors: Color[]; }

const cardHeaderStyle: React.CSSProperties = { background: '#fff', borderBottom: '2px solid #ffc63a', borderRadius: '12px 12px 0 0', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 };
const cardHeaderIcon: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, background: 'rgba(255,198,58,0.15)', color: '#ffc63a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' };
const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#ffff', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const editBadge: React.CSSProperties = { cursor: 'pointer', background: 'rgba(255,198,58,0.15)', color: '#b8860b', fontWeight: 600, marginRight: 6 };
const deleteBadge: React.CSSProperties = { cursor: 'pointer', background: 'rgba(237,76,120,0.1)', color: '#ed4c78', fontWeight: 600 };
const genderBadge: React.CSSProperties = { background: 'rgba(255,198,58,0.15)', color: '#b8860b', fontWeight: 600 };
const modalInputStyle: React.CSSProperties = { ...inputStyle, width: '100%' };
const modalLabelStyle: React.CSSProperties = { fontWeight: 500, fontSize: '0.875rem', color: '#4b566b', marginBottom: 6, display: 'block' };

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
const getGenderConfig = (fc?: string) => { try { return JSON.parse(fc || '{}').gender || 'optional'; } catch { return 'optional'; } };
const getAttributes = (fc?: string): Attribute[] => {
  try {
    const config = JSON.parse(fc || '{}');
    const attrs = config.attributes || [];
    return attrs.map((a: any) => typeof a === 'string' ? { name: a, type: 'text', required: false } : a);
  } catch { return []; }
};
const parseJson = (val?: string): any[] => { try { const r = JSON.parse(val || '[]'); return Array.isArray(r) ? r : []; } catch { return []; } };

// Attribute editor component
function AttributeEditor({ attributes, onChange }: { attributes: Attribute[]; onChange: (attrs: Attribute[]) => void }) {
  const update = (i: number, field: string, value: any) => {
    const next = [...attributes];
    (next[i] as any)[field] = value;
    onChange(next);
  };
  const remove = (i: number) => onChange(attributes.filter((_, idx) => idx !== i));
  const add = () => onChange([...attributes, { name: '', type: 'text', required: false }]);

  return (
    <div className="mb-3">
      <label style={modalLabelStyle}>Custom Attributes (Specifications)</label>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {attributes.map((attr, i) => (
          <div key={i} className="card mb-2" style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: 8 }}>
            <div className="card-body p-2">
              <div className="row g-2 align-items-center">
                <div className="col-5">
                  <input className="form-control form-control-sm" style={inputStyle} placeholder="Name (e.g., Sleeves)" value={attr.name}
                    onChange={(e) => update(i, 'name', e.target.value)} />
                </div>
                <div className="col-4">
                  <select className="form-select form-select-sm" style={inputStyle} value={attr.type} onChange={(e) => update(i, 'type', e.target.value)}>
                    <option value="text">Text</option>
                    <option value="number">Numeric</option>
                    <option value="alphabet">Alphabet</option>
                    <option value="picklist">Picklist (Dropdown)</option>
                  </select>
                </div>
                <div className="col-3 text-end">
                  <button type="button" className="btn btn-sm" style={{ ...deleteBadge, border: 'none', padding: '4px 8px', borderRadius: 6 }} onClick={() => remove(i)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
                {attr.type === 'picklist' && (
                  <div className="col-12 mt-1">
                    <input className="form-control form-control-sm" style={inputStyle} placeholder="Options (comma-separated, e.g. Full, Half, Short)"
                      value={attr.options || ''} onChange={(e) => update(i, 'options', e.target.value)} />
                  </div>
                )}
                <div className="col-12 mt-1">
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" checked={!!attr.required} onChange={(e) => update(i, 'required', e.target.checked)} />
                    <label className="form-check-label small">Required</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={add}>
        <i className="bi bi-plus-circle me-1"></i> Add Attribute
      </button>
    </div>
  );
}

// Reusable modal wrapper
function EditModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '0.75rem' }}>
          <div className="modal-header" style={{ borderBottom: '2px solid #ffc63a', padding: '1rem 1.25rem' }}>
            <h5 className="modal-title fw-bold"><i className="bi bi-pencil-square me-2" style={{ color: '#ffc63a' }}></i>{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Multi-checkbox select for modal
function CheckboxGroup({ label, items, selected, onChange }: { label: string; items: { id: number; name: string }[]; selected: (number | string)[]; onChange: (v: (number | string)[]) => void }) {
  return (
    <div className="mb-3">
      <label style={modalLabelStyle}>{label}</label>
      <div className="form-control" style={{ ...modalInputStyle, height: 110, overflowY: 'auto' }}>
        {items.map((it) => (
          <div className="form-check" key={it.id}>
            <input className="form-check-input" type="checkbox" checked={selected.includes(it.id) || selected.includes(String(it.id))}
              onChange={(e) => onChange(e.target.checked ? [...selected, it.id] : selected.filter((v) => v != it.id))} />
            <label className="form-check-label small">{it.name}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TaxonomyView() {
  const { toastSuccess, toastError } = useToast();
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModal, setEditModal] = useState<{ type: string; item: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Bulk CSV upload state
  const [csvType, setCsvType] = useState('genders');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ message: string; errors?: string[] } | null>(null);

  const PAGE_SIZE = 10;
  const [ltPage, setLtPage] = useState(1);
  const [gPage, setGPage] = useState(1);
  const [ptPage, setPtPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [scPage, setScPage] = useState(1);
  const [colPage, setColPage] = useState(1);

  // Search states (search over ALL data, not just current page)
  const [ltSearch, setLtSearch] = useState('');
  const [gSearch, setGSearch] = useState('');
  const [ptSearch, setPtSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [scSearch, setScSearch] = useState('');
  const [colSearch, setColSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get<TaxData>('/shared/taxonomy').then((r) => { if (r.success && r.data) setData(r.data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (table: string, id: number) => {
    confirmToast('Are you sure? This action cannot be undone.', async () => {
      await api.post(`/superadmin/remove-taxonomy/${table}/${id}`);
      load();
    });
  };

  const submitForm = async (url: string, fd: FormData) => {
    const res = await api.upload(url, fd);
    if (res.success) {
      toastSuccess('taxonomy_update_success', 'Successfully updated!');
      load();
    } else {
      toastError('taxonomy_update_failed', res.message || 'Error');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);
    const fd = new FormData();
    fd.append('type', csvType);
    fd.append('csv_file', csvFile);
    const res = await api.upload<{ message: string; inserted: number; skipped: number; errors: string[] }>('/superadmin/bulk-upload-catalogue', fd);
    setCsvUploading(false);
    if (res.success) {
      setCsvResult({ message: res.data?.message || res.message || 'Upload complete', errors: res.data?.errors });
      setCsvFile(null);
      const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      load();
    } else {
      setCsvResult({ message: res.message || 'Upload failed' });
    }
  };

  const downloadTemplate = () => {
    const templates: Record<string, string> = {
      listing_types: 'name,gender_config,image\nClothing,mandatory,uploads/listing-types/clothing.jpg\nElectronics,hidden,',
      genders: 'name\nMale\nFemale\nUnisex\nKids',
      product_types: 'name,listing_type\nShirts,Clothing\nPants,Clothing',
      categories: 'category_name,product_types,applies_to\nCasual Wear,"Shirts,Pants","[""Male"",""Female""]"',
      sub_categories: 'name,categories,applies_to\nT-Shirts,Casual Wear,"[""Male"",""Unisex""]"',
      colors: 'name,hex_code\nCrimson,#dc143c\nNavy Blue,#000080\nForest Green,#228b22',
    };
    const csv = templates[csvType] || '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${csvType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (type: string, item: any) => {
    setEditModal({ type, item });
    if (type === 'listing_type') {
      setEditForm({ name: item.type_name || item.name || '', usage_label: item.usage_label || 'Times Used', gender_config: getGenderConfig(item.field_config), attributes: getAttributes(item.field_config), image: null, currentImage: item.image || '' });
    } else if (type === 'gender') {
      setEditForm({ name: item.name });
    } else if (type === 'product_type') {
      setEditForm({ name: item.name, listing_type_id: item.listing_type_id });
    } else if (type === 'category') {
      const ptIds = item.product_type_ids ? parseJson(item.product_type_ids) : (item.product_type_id ? [item.product_type_id] : []);
      setEditForm({ name: item.category_name || item.name || '', product_type_ids: ptIds, applies_to: parseJson(item.applies_to), attributes: getAttributes(item.field_config) });
    } else if (type === 'sub_category') {
      const catIds = item.category_ids ? parseJson(item.category_ids) : (item.category_id ? [item.category_id] : []);
      setEditForm({ name: item.name, category_ids: catIds, applies_to: parseJson(item.applies_to), attributes: getAttributes(item.field_config) });
    } else if (type === 'color') {
      setEditForm({ name: item.name, hex_code: item.hex_code });
    }
  };

  const saveEdit = async () => {
    if (!editModal) return;
    const { type, item } = editModal;
    const fd = new FormData();

    if (type === 'listing_type') {
      fd.append('type_name', editForm.name);
      fd.append('usage_label', editForm.usage_label || 'Times Used');
      fd.append('gender_config', editForm.gender_config);
      fd.append('attributes', JSON.stringify(editForm.attributes || []));
      if (editForm.image) fd.append('image', editForm.image);
      await api.upload(`/superadmin/update-listing-type/${item.id}`, fd);
    } else if (type === 'gender') {
      fd.append('name', editForm.name);
      await api.upload(`/superadmin/update-gender/${item.id}`, fd);
    } else if (type === 'product_type') {
      fd.append('name', editForm.name);
      fd.append('listing_type_id', editForm.listing_type_id);
      await api.upload(`/superadmin/update-product-type/${item.id}`, fd);
    } else if (type === 'category') {
      fd.append('category_name', editForm.name);
      (editForm.product_type_ids || []).forEach((id: number) => fd.append('product_type_ids[]', String(id)));
      (editForm.applies_to || []).forEach((g: string) => fd.append('applies_to[]', g));
      fd.append('attributes', JSON.stringify(editForm.attributes || []));
      await api.upload(`/superadmin/update-category/${item.id}`, fd);
    } else if (type === 'sub_category') {
      fd.append('name', editForm.name);
      (editForm.category_ids || []).forEach((id: number) => fd.append('category_ids[]', String(id)));
      (editForm.applies_to || []).forEach((g: string) => fd.append('applies_to[]', g));
      fd.append('attributes', JSON.stringify(editForm.attributes || []));
      await api.upload(`/superadmin/update-sub-category/${item.id}`, fd);
    } else if (type === 'color') {
      fd.append('name', editForm.name);
      fd.append('hex_code', editForm.hex_code);
      await api.upload(`/superadmin/update-color/${item.id}`, fd);
    }

    setEditModal(null);
    load();
  };

  if (loading || !data) return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
    </DashboardLayout>
  );

  const { listing_types, genders, product_types, categories, sub_categories, colors } = data;

  const ActionBtns = ({ table, id, item, type }: { table: string; id: number; item: any; type: string }) => (
    <div className="d-flex gap-1">
      <span className="badge" style={editBadge} onClick={() => openEdit(type, item)}><i className="bi bi-pencil me-1"></i>Edit</span>
      <span className="badge" style={deleteBadge} onClick={() => deleteItem(table, id)}><i className="bi bi-trash me-1"></i>Delete</span>
    </div>
  );

  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <div style={cardHeaderStyle}><div style={cardHeaderIcon}><i className={icon}></i></div><h5 className="mb-0 fw-bold" style={{ color: '#1e2022' }}>{title}</h5></div>
  );

  const Paginator = ({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return null;
    return (
      <div className="d-flex align-items-center justify-content-between mt-3 px-1">
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
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-tags" style={{ color: '#ffc63a' }}></i> Catalogue Management
          </h1>
          <p className="text-muted small">Manage Listing Types, Genders, Product Types, Categories, Sub-Categories & Colors</p>
        </div>

        {/* Bulk CSV Upload */}
        <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ ...cardHeaderStyle, background: '#f8f9fa' }}>
            <div style={{ ...cardHeaderIcon, background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}><i className="bi bi-cloud-upload"></i></div>
            <h5 className="mb-0 fw-bold" style={{ color: '#1e2022' }}>Bulk Upload from CSV</h5>
          </div>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-bold">Catalogue Type</label>
                <select className="form-select" style={inputStyle} value={csvType} onChange={(e) => { setCsvType(e.target.value); setCsvResult(null); }}>
                  <option value="listing_types">Listing Types</option>
                  <option value="genders">Genders</option>
                  <option value="product_types">Product Types</option>
                  <option value="categories">Categories</option>
                  <option value="sub_categories">Sub-Categories</option>
                  <option value="colors">Colors</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">CSV File</label>
                <input id="csvFileInput" type="file" accept=".csv" className="form-control" style={inputStyle} onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvResult(null); }} />
              </div>
              <div className="col-md-2">
                <button className="btn w-100" style={btnGold} disabled={!csvFile || csvUploading} onClick={handleCsvUpload}>
                  {csvUploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</> : <><i className="bi bi-upload me-2"></i>Upload</>}
                </button>
              </div>
              <div className="col-md-3">
                <button className="btn w-100 btn-outline-secondary" style={{ borderRadius: '0.5rem', fontWeight: 600 }} onClick={downloadTemplate}>
                  <i className="bi bi-download me-2"></i>Download Template
                </button>
              </div>
            </div>

            {csvResult && (
              <div className={`alert ${csvResult.errors && csvResult.errors.length > 0 ? 'alert-warning' : 'alert-success'} mt-3 mb-0 border-0`} style={{ borderRadius: 10 }}>
                <div className="fw-bold"><i className={`bi ${csvResult.errors && csvResult.errors.length > 0 ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`}></i>{csvResult.message}</div>
                {csvResult.errors && csvResult.errors.length > 0 && (
                  <ul className="mb-0 mt-2 small">
                    {csvResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-3 p-3 rounded-3" style={{ background: '#f8f9fa', fontSize: '0.8rem', color: '#677788' }}>
              <strong>CSV Format Guide:</strong>
              <div className="row mt-2">
                <div className="col-md-6">
                  <div><strong>Listing Types:</strong> name, gender_config (mandatory/optional/hidden), image (path/URL)</div>
                  <div><strong>Genders:</strong> name</div>
                  <div><strong>Product Types:</strong> name, listing_type (Name)</div>
                </div>
                <div className="col-md-6">
                  <div><strong>Categories:</strong> category_name, product_types (Names, comma separated), applies_to (JSON array)</div>
                  <div><strong>Sub-Categories:</strong> name, categories (Names, comma separated), applies_to (JSON array)</div>
                  <div><strong>Colors:</strong> name, hex_code</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Listing Types */}
        <div className="card mb-4"><SectionHeader icon="bi bi-tag" title="Listing Types" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-listing-type', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-3"><input name="name" className="form-control" style={inputStyle} placeholder="Name (e.g. Clothing)" required /></div>
              <div className="col-md-3">
                <select name="gender_config" className="form-select" style={inputStyle}>
                  <option value="mandatory">Gender: Mandatory</option><option value="optional">Gender: Optional</option><option value="hidden">Gender: Hidden</option>
                </select>
              </div>
              <div className="col-md-2">
                <select name="usage_label" className="form-select" style={inputStyle}>
                  <option value="Times Used">Times Used</option>
                  <option value="Months Used">Months Used</option>
                  <option value="Years Used">Years Used</option>
                </select>
              </div>
              <div className="col-md-2"><input name="image" type="file" accept="image/*" className="form-control" style={inputStyle} /></div>
              <div className="col-md-2"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add Listing Type</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search listing types..." value={ltSearch} onChange={(e) => { setLtSearch(e.target.value); setLtPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Image</th><th style={thStyle}>Name & Config</th><th style={thStyle}>Usage Label</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = listing_types.filter(lt => (lt.type_name || lt.name || '').toLowerCase().includes(ltSearch.toLowerCase())); const paged = filtered.slice((ltPage - 1) * PAGE_SIZE, ltPage * PAGE_SIZE); return paged.length > 0 ? paged.map((lt) => { const gender = getGenderConfig(lt.field_config); const bcForGender = gender === 'mandatory' ? '#dc3545' : gender === 'hidden' ? '#6c757d' : '#0dcaf0'; return (<tr key={lt.id}><td style={tdStyle}>{lt.id}</td><td style={tdStyle}>{lt.image ? <img src={`http://localhost:8080/${lt.image}`} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} /> : <div style={{ width: 50, height: 50, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}><i className="bi bi-image"></i></div>}</td><td style={tdStyle}><strong>{lt.type_name || lt.name}</strong><div className="small text-muted mt-1">Gender: <span className="badge" style={{ background: bcForGender }}>{gender}</span></div></td><td style={tdStyle}><span className="badge bg-light text-dark border">{lt.usage_label || 'Times Used'}</span></td><td style={tdStyle}>{fmtDate(lt.created_at)}</td><td style={tdStyle}><ActionBtns table="listing_types" id={lt.id} item={lt} type="listing_type" /></td></tr>); }) : <tr><td colSpan={6} className="text-center text-muted py-4">{ltSearch ? `No results for "${ltSearch}"` : 'No listing types yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={listing_types.filter(lt => (lt.type_name || lt.name || '').toLowerCase().includes(ltSearch.toLowerCase())).length} page={ltPage} setPage={setLtPage} />
          </div>
        </div>

        {/* 2. Genders */}
        <div className="card mb-4"><SectionHeader icon="bi bi-gender-ambiguous" title="Genders" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-gender', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-9"><input name="name" className="form-control" style={inputStyle} placeholder="Gender Name (e.g., Male, Women, Unisex)" required /></div>
              <div className="col-md-3"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add Gender</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search genders..." value={gSearch} onChange={(e) => { setGSearch(e.target.value); setGPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Name</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = genders.filter(g => g.name.toLowerCase().includes(gSearch.toLowerCase())); const paged = filtered.slice((gPage - 1) * PAGE_SIZE, gPage * PAGE_SIZE); return paged.length > 0 ? paged.map((g) => (<tr key={g.id}><td style={tdStyle}>{g.id}</td><td style={tdStyle}><strong>{g.name}</strong></td><td style={tdStyle}>{fmtDate(g.created_at)}</td><td style={tdStyle}><ActionBtns table="genders" id={g.id} item={g} type="gender" /></td></tr>)) : <tr><td colSpan={4} className="text-center text-muted py-4">{gSearch ? `No results for "${gSearch}"` : 'No genders yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={genders.filter(g => g.name.toLowerCase().includes(gSearch.toLowerCase())).length} page={gPage} setPage={setGPage} />
          </div>
        </div>

        {/* 3. Product Types */}
        <div className="card mb-4"><SectionHeader icon="bi bi-box" title="Product Types" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-product-type', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-4"><select name="listing_type_id" className="form-select" style={inputStyle} required><option value="">Select Listing Type</option>{listing_types.map((lt) => <option key={lt.id} value={lt.id}>{lt.type_name || lt.name}</option>)}</select></div>
              <div className="col-md-4"><input name="name" className="form-control" style={inputStyle} placeholder="Product Type Name" required /></div>
              <div className="col-md-4"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add Product Type</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search product types..." value={ptSearch} onChange={(e) => { setPtSearch(e.target.value); setPtPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Product Type</th><th style={thStyle}>Listing Type</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = product_types.filter(pt => pt.name.toLowerCase().includes(ptSearch.toLowerCase())); const paged = filtered.slice((ptPage - 1) * PAGE_SIZE, ptPage * PAGE_SIZE); return paged.length > 0 ? paged.map((pt) => { const lt = listing_types.find((l) => l.id == pt.listing_type_id); return (<tr key={pt.id}><td style={tdStyle}>{pt.id}</td><td style={tdStyle}><strong>{pt.name}</strong></td><td style={tdStyle}>{lt ? (lt.type_name || lt.name) : 'N/A'}</td><td style={tdStyle}>{fmtDate(pt.created_at)}</td><td style={tdStyle}><ActionBtns table="product_types" id={pt.id} item={pt} type="product_type" /></td></tr>); }) : <tr><td colSpan={5} className="text-center text-muted py-4">{ptSearch ? `No results for "${ptSearch}"` : 'No product types yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={product_types.filter(pt => pt.name.toLowerCase().includes(ptSearch.toLowerCase())).length} page={ptPage} setPage={setPtPage} />
          </div>
        </div>

        {/* 4. Categories */}
        <div className="card mb-4"><SectionHeader icon="bi bi-grid" title="Categories" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-category', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-4"><label className="small text-muted mb-1 d-block">Select Product Types (Multiple)</label><div className="form-control" style={{ ...inputStyle, height: 100, overflowY: 'auto' }}>{product_types.map((pt) => (<div className="form-check" key={pt.id}><input className="form-check-input" type="checkbox" name="product_type_ids[]" value={pt.id} /><label className="form-check-label small">{pt.name}</label></div>))}</div></div>
              <div className="col-md-3 mt-auto"><input name="category_name" className="form-control" style={inputStyle} placeholder="Category Name" required /></div>
              <div className="col-md-3"><label className="small text-muted mb-1 d-block">Applies To</label><div className="form-control" style={{ ...inputStyle, height: 100, overflowY: 'auto' }}>{genders.map((g) => (<div className="form-check" key={g.id}><input className="form-check-input" type="checkbox" name="applies_to[]" value={g.name} /><label className="form-check-label small">{g.name}</label></div>))}</div></div>
              <div className="col-md-2 mt-auto"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search categories..." value={catSearch} onChange={(e) => { setCatSearch(e.target.value); setCatPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Category</th><th style={thStyle}>Product Type</th><th style={thStyle}>Applies To</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = categories.filter(c => (c.category_name || c.name || '').toLowerCase().includes(catSearch.toLowerCase())); const paged = filtered.slice((catPage - 1) * PAGE_SIZE, catPage * PAGE_SIZE); return paged.length > 0 ? paged.map((c) => { const ptIds = parseJson(c.product_type_ids); const ptNames = ptIds.map((pid: number) => product_types.find((p) => p.id == pid)?.name).filter(Boolean).join(', ') || 'All'; const applies = parseJson(c.applies_to); return (<tr key={c.id}><td style={tdStyle}>{c.id}</td><td style={tdStyle}><strong>{c.category_name || c.name}</strong></td><td style={tdStyle}>{ptNames}</td><td style={tdStyle}>{applies.length > 0 ? applies.map((g: string, i: number) => <span key={i} className="badge me-1" style={genderBadge}>{g}</span>) : <span className="badge" style={genderBadge}>All</span>}</td><td style={tdStyle}>{fmtDate(c.created_at)}</td><td style={tdStyle}><ActionBtns table="categories" id={c.id} item={c} type="category" /></td></tr>); }) : <tr><td colSpan={6} className="text-center text-muted py-4">{catSearch ? `No results for "${catSearch}"` : 'No categories yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={categories.filter(c => (c.category_name || c.name || '').toLowerCase().includes(catSearch.toLowerCase())).length} page={catPage} setPage={setCatPage} />
          </div>
        </div>

        {/* 5. Sub-Categories */}
        <div className="card mb-4"><SectionHeader icon="bi bi-list-nested" title="Sub-Categories" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-sub-category', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-4"><label className="small text-muted mb-1 d-block">Select Categories (Multiple)</label><div className="form-control" style={{ ...inputStyle, height: 100, overflowY: 'auto' }}>{categories.map((c) => (<div className="form-check" key={c.id}><input className="form-check-input" type="checkbox" name="category_ids[]" value={c.id} /><label className="form-check-label small">{c.category_name || c.name}</label></div>))}</div></div>
              <div className="col-md-3 mt-auto"><input name="name" className="form-control" style={inputStyle} placeholder="Sub-Category Name" required /></div>
              <div className="col-md-3"><label className="small text-muted mb-1 d-block">Applies To</label><div className="form-control" style={{ ...inputStyle, height: 100, overflowY: 'auto' }}>{genders.map((g) => (<div className="form-check" key={g.id}><input className="form-check-input" type="checkbox" name="applies_to[]" value={g.name} /><label className="form-check-label small">{g.name}</label></div>))}</div></div>
              <div className="col-md-2 mt-auto"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search sub-categories..." value={scSearch} onChange={(e) => { setScSearch(e.target.value); setScPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Sub-Category</th><th style={thStyle}>Category</th><th style={thStyle}>Applies To</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = sub_categories.filter(sc => sc.name.toLowerCase().includes(scSearch.toLowerCase())); const paged = filtered.slice((scPage - 1) * PAGE_SIZE, scPage * PAGE_SIZE); return paged.length > 0 ? paged.map((sc) => { const catIds = parseJson(sc.category_ids); const catNames = catIds.map((cid: number) => { const c = categories.find((x) => x.id == cid); return c ? (c.category_name || c.name) : null; }).filter(Boolean).join(', ') || 'N/A'; const applies = parseJson(sc.applies_to); return (<tr key={sc.id}><td style={tdStyle}>{sc.id}</td><td style={tdStyle}><strong>{sc.name}</strong></td><td style={tdStyle}>{catNames}</td><td style={tdStyle}>{applies.length > 0 ? applies.map((g: string, i: number) => <span key={i} className="badge me-1" style={genderBadge}>{g}</span>) : <span className="badge" style={genderBadge}>All</span>}</td><td style={tdStyle}>{fmtDate(sc.created_at)}</td><td style={tdStyle}><ActionBtns table="sub_categories" id={sc.id} item={sc} type="sub_category" /></td></tr>); }) : <tr><td colSpan={6} className="text-center text-muted py-4">{scSearch ? `No results for "${scSearch}"` : 'No sub-categories yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={sub_categories.filter(sc => sc.name.toLowerCase().includes(scSearch.toLowerCase())).length} page={scPage} setPage={setScPage} />
          </div>
        </div>

        {/* 6. Colors */}
        <div className="card mb-4"><SectionHeader icon="bi bi-palette" title="Color Management" />
          <div className="card-body">
            <form className="row g-3 mb-3" onSubmit={(e) => { e.preventDefault(); submitForm('/superadmin/add-color', new FormData(e.currentTarget)); e.currentTarget.reset(); }}>
              <div className="col-md-5"><input name="name" className="form-control" style={inputStyle} placeholder="Color Name (e.g., Crimson)" required /></div>
              <div className="col-md-4 d-flex align-items-center gap-2"><label className="mb-0 small text-muted">Picker:</label><input type="color" name="hex_code" className="form-control form-control-color" defaultValue="#563d7c" style={{ width: '100%' }} /></div>
              <div className="col-md-3"><button type="submit" className="btn w-100 sa-filter-btn" style={btnGold}><i className="bi bi-plus-circle me-2"></i>Add Color</button></div>
            </form>
            <div className="mb-3 position-relative">
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#677788', fontSize: '0.9rem' }}></i>
              <input className="form-control" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search colors..." value={colSearch} onChange={(e) => { setColSearch(e.target.value); setColPage(1); }} />
            </div>
            <div className="table-responsive"><table className="table table-hover mb-0">
              <thead><tr><th style={thStyle}>ID</th><th style={thStyle}>Color</th><th style={thStyle}>Hex</th><th style={thStyle}>Preview</th><th style={thStyle}>Created</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>{(() => { const filtered = colors.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()) || c.hex_code.toLowerCase().includes(colSearch.toLowerCase())); const paged = filtered.slice((colPage - 1) * PAGE_SIZE, colPage * PAGE_SIZE); return paged.length > 0 ? paged.map((c) => (<tr key={c.id}><td style={tdStyle}>{c.id}</td><td style={tdStyle}><strong>{c.name}</strong></td><td style={tdStyle}><code>{c.hex_code}</code></td><td style={tdStyle}><div style={{ width: 30, height: 30, borderRadius: 6, background: c.hex_code, border: '1px solid #ddd' }}></div></td><td style={tdStyle}>{fmtDate(c.created_at)}</td><td style={tdStyle}><ActionBtns table="colors" id={c.id} item={c} type="color" /></td></tr>)) : <tr><td colSpan={6} className="text-center text-muted py-4">{colSearch ? `No results for "${colSearch}"` : 'No colors yet'}</td></tr>; })()}</tbody>
            </table></div>
            <Paginator total={colors.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()) || c.hex_code.toLowerCase().includes(colSearch.toLowerCase())).length} page={colPage} setPage={setColPage} />
          </div>
        </div>
      </div>

      {/* ── EDIT MODALS ── */}

      {/* Edit Listing Type */}
      <EditModal title="Edit Listing Type" open={editModal?.type === 'listing_type'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Listing Type Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div className="mb-3"><label style={modalLabelStyle}>Gender Field Requirement</label>
            <select className="form-select" style={modalInputStyle} value={editForm.gender_config || 'optional'} onChange={(e) => setEditForm({ ...editForm, gender_config: e.target.value })}>
              <option value="mandatory">Mandatory</option><option value="optional">Optional</option><option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="mb-3">
            <label style={modalLabelStyle}>Usage Display Unit</label>
            <select className="form-select" style={modalInputStyle} value={editForm.usage_label || 'Times Used'} onChange={(e) => setEditForm({ ...editForm, usage_label: e.target.value })}>
              <option value="Times Used">Times Used (e.g. 5 Times Used)</option>
              <option value="Months Used">Months Used (e.g. 5 Months Used)</option>
              <option value="Years Used">Years Used (e.g. 5 Years Used)</option>
            </select>
            <small className="text-muted">How the usage/age of products in this category will be displayed.</small>
          </div>
          <div className="mb-3">
            <label style={modalLabelStyle}>Image</label>
            {editForm.currentImage && (
              <div className="mb-2"><img src={`http://localhost:8080/${editForm.currentImage}`} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }} /></div>
            )}
            <input type="file" accept="image/*" className="form-control" style={modalInputStyle} onChange={(e) => setEditForm({ ...editForm, image: e.target.files?.[0] || null })} />
          </div>
          <AttributeEditor attributes={editForm.attributes || []} onChange={(attrs) => setEditForm({ ...editForm, attributes: attrs })} />
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>

      {/* Edit Gender */}
      <EditModal title="Edit Gender" open={editModal?.type === 'gender'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Gender Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>

      {/* Edit Product Type */}
      <EditModal title="Edit Product Type" open={editModal?.type === 'product_type'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Product Type Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div className="mb-3"><label style={modalLabelStyle}>Listing Type</label>
            <select className="form-select" style={modalInputStyle} value={editForm.listing_type_id || ''} onChange={(e) => setEditForm({ ...editForm, listing_type_id: e.target.value })}>
              <option value="">Select Listing Type</option>{listing_types.map((lt) => <option key={lt.id} value={lt.id}>{lt.type_name || lt.name}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>

      {/* Edit Category */}
      <EditModal title="Edit Category" open={editModal?.type === 'category'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Category Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <CheckboxGroup label="Product Types" items={product_types.map((pt) => ({ id: pt.id, name: pt.name }))} selected={editForm.product_type_ids || []} onChange={(v) => setEditForm({ ...editForm, product_type_ids: v })} />
          <CheckboxGroup label="Applies To" items={genders.map((g) => ({ id: g.name as any, name: g.name }))} selected={editForm.applies_to || []} onChange={(v) => setEditForm({ ...editForm, applies_to: v })} />
          <AttributeEditor attributes={editForm.attributes || []} onChange={(attrs) => setEditForm({ ...editForm, attributes: attrs })} />
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>

      {/* Edit Sub-Category */}
      <EditModal title="Edit Sub-Category" open={editModal?.type === 'sub_category'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Sub-Category Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <CheckboxGroup label="Categories" items={categories.map((c) => ({ id: c.id, name: (c.category_name || c.name) as string }))} selected={editForm.category_ids || []} onChange={(v) => setEditForm({ ...editForm, category_ids: v })} />
          <CheckboxGroup label="Applies To" items={genders.map((g) => ({ id: g.name as any, name: g.name }))} selected={editForm.applies_to || []} onChange={(v) => setEditForm({ ...editForm, applies_to: v })} />
          <AttributeEditor attributes={editForm.attributes || []} onChange={(attrs) => setEditForm({ ...editForm, attributes: attrs })} />
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>

      {/* Edit Color */}
      <EditModal title="Edit Color" open={editModal?.type === 'color'} onClose={() => setEditModal(null)}>
        <div className="modal-body p-4">
          <div className="mb-3"><label style={modalLabelStyle}>Color Name</label><input className="form-control" style={modalInputStyle} value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div className="mb-3"><label style={modalLabelStyle}>Color Picker</label><input type="color" className="form-control form-control-color" style={{ width: '100%', height: 45 }} value={editForm.hex_code || '#000000'} onChange={(e) => setEditForm({ ...editForm, hex_code: e.target.value })} /></div>
        </div>
        <div className="modal-footer border-0 p-4 pt-0"><button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button><button className="btn sa-filter-btn" style={btnGold} onClick={saveEdit}>Save Changes</button></div>
      </EditModal>
    </DashboardLayout>
  );
}
