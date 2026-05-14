'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  endpoint: string;
  templateCsv: string;
  templateFilename: string;
  formatGuide: string;
  title?: string;
  onSuccess?: () => void;
  extraData?: Record<string, string>;
}

const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#ffff', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem' };

export default function BulkCsvUpload({ endpoint, templateCsv, templateFilename, formatGuide, title, onSuccess, extraData }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ message: string; errors?: string[] } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('csv_file', file);
    if (extraData) {
      Object.entries(extraData).forEach(([key, value]) => {
        fd.append(key, value);
      });
    }
    const res = await api.upload<{ message: string; inserted: number; skipped: number; errors: string[] }>(endpoint, fd);
    setUploading(false);
    if (res.success) {
      toast.success(res.data?.message || res.message || 'Upload complete');
      setResult({ message: res.data?.message || res.message || 'Upload complete', errors: res.data?.errors });
      setFile(null);
      const input = document.getElementById(`csvInput-${templateFilename}`) as HTMLInputElement;
      if (input) input.value = '';
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.message || 'Upload failed');
      setResult({ message: res.message || 'Upload failed' });
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ background: '#f8f9fa', borderBottom: '2px solid #6366f1', borderRadius: '0.75rem 0.75rem 0 0', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
          <i className="bi bi-cloud-upload"></i>
        </div>
        <h6 className="mb-0 fw-bold" style={{ color: '#1e2022' }}>{title || 'Bulk Upload from CSV'}</h6>
      </div>
      <div className="card-body py-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label className="form-label small fw-bold mb-1">CSV File</label>
            <input
              id={`csvInput-${templateFilename}`}
              type="file"
              accept=".csv"
              className="form-control"
              style={inputStyle}
              onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
            />
          </div>
          <div className="col-md-3">
            <button className="btn w-100" style={btnGold} disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</> : <><i className="bi bi-upload me-2"></i>Upload</>}
            </button>
          </div>
          <div className="col-md-4">
            <button className="btn w-100 btn-outline-secondary" style={{ borderRadius: '0.5rem', fontWeight: 600 }} onClick={downloadTemplate}>
              <i className="bi bi-download me-2"></i>Download Template
            </button>
          </div>
        </div>

        {result && (
          <div className={`alert ${result.errors && result.errors.length > 0 ? 'alert-warning' : 'alert-success'} mt-3 mb-0 border-0`} style={{ borderRadius: 10 }}>
            <div className="fw-bold"><i className={`bi ${result.errors && result.errors.length > 0 ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`}></i>{result.message}</div>
            {result.errors && result.errors.length > 0 && (
              <ul className="mb-0 mt-2 small">{result.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            )}
          </div>
        )}

        <div className="mt-2 small text-muted"><strong>Format:</strong> {formatGuide}</div>
      </div>
    </div>
  );
}
