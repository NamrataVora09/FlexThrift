'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { confirmToast } from '@/lib/toast-utils';
import dynamic from 'next/dynamic';
const ZoneMap = dynamic(() => import('./ZoneMap'), { ssr: false });
import DashboardLayout from '@/components/layout/DashboardLayout';

export type Zone = {
  id: number;
  zone_name: string;
  zone_polygon?: string | null;
  is_active: number;
  created_at: string;
};

const thStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  fontWeight: 600,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  letterSpacing: 0.5,
  color: '#677788',
  borderTop: 'none',
  padding: '1.25rem 1rem',
};
const tdStyle: React.CSSProperties = {
  padding: '1rem',
  verticalAlign: 'middle',
  color: '#1e2022',
  fontSize: '0.875rem',
};
const badgeSoftSuccess: React.CSSProperties = {
  background: 'rgba(0,201,167,0.1)',
  color: '#00c9a7',
  padding: '0.4rem 0.8rem',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
const badgeSoftDanger: React.CSSProperties = {
  background: 'rgba(237,76,120,0.1)',
  color: '#ed4c78',
  padding: '0.4rem 0.8rem',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};



export default function ZonesView() {
  const { toastSuccess, toastError, resolveMsg } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const loadZones = async () => {
    setLoading(true);
    const res = await api.get<Zone[]>('/zones');
    if (res.success && res.data) {
      const sanitized = res.data.map((z) => ({
        ...z,
        id: Number(z.id),
        is_active: Number(z.is_active),
      }));
      setZones(sanitized);
    }
    setLoading(false);
  };

  useEffect(() => { loadZones(); }, []);

  const handleDelete = (id: number) => {
    confirmToast(resolveMsg('zone_delete_confirm', 'Delete this zone? This cannot be undone.'), async () => {
      const res = await api.delete(`/zones/${id}`);
      if (res.success) {
        toastSuccess('zone_deleted', 'Zone deleted successfully');
        loadZones();
      } else {
        toastError('zone_delete_failed', res.message || 'Failed to delete zone');
      }
    }, 'Delete');
  };

  const toggleActive = (zone: Zone) => {
    const action = zone.is_active ? 'disable' : 'enable';
    confirmToast(resolveMsg('zone_toggle_status_confirm', `Are you sure you want to ${action} this zone?`), async () => {
      const res = await api.put(`/zones/${zone.id}`, { is_active: zone.is_active ? 0 : 1 });
      if (res.success) {
        toastSuccess('zone_status_updated', `Zone ${action}d successfully`);
        loadZones();
      } else {
        toastError('zone_status_failed', res.message || 'Failed to update zone');
      }
    }, action.charAt(0).toUpperCase() + action.slice(1));
  };

  const filtered = zones.filter((z) => {
    if (statusFilter === 'active' && !z.is_active) return false;
    if (statusFilter === 'inactive' && z.is_active) return false;
    return true;
  });

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <div className="container-fluid">

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e2022', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <i className="bi bi-geo-alt-fill" style={{ color: '#ffc63a' }}></i> Zone Management
            </h1>
            <p className="text-muted small mb-0">Configure service zones to restrict or allow registrations by location.</p>
          </div>
          <button
            className="btn d-inline-flex align-items-center gap-2"
            style={{ background: '#ffc63a', color: '#212529', fontWeight: 600, borderRadius: '0.5rem', padding: '0.6rem 1.5rem', border: 'none' }}
            onClick={() => {
              setShowMap((v) => !v);
              setEditingZone(null);
            }}
          >
            <i className={`bi ${showMap ? 'bi-x-circle' : 'bi-plus-circle'}`}></i>
            {showMap ? 'Hide Map' : 'Add New Zone'}
          </button>
        </div>

        {/* Map Panel */}
        {showMap && (
          <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f2f4' }}>
            <div className="card-header d-flex align-items-center gap-2" style={{ background: '#fff', borderBottom: '1px solid #f1f2f4', padding: '1rem 1.5rem' }}>
              <i className="bi bi-map" style={{ color: '#ffc63a', fontSize: '1.1rem' }}></i>
              <span style={{ fontWeight: 700, color: '#1e2022', fontSize: '0.95rem' }}>Draw Zone on Map</span>
              <span className="ms-2 badge" style={{ background: 'rgba(255,198,58,0.15)', color: '#b8860b', fontWeight: 600, fontSize: '0.7rem', borderRadius: 6, padding: '0.35rem 0.65rem' }}>
                Fill the fields below, then use the polygon tool on the map
              </span>
            </div>
            <div className="card-body p-0">
              <ZoneMap 
                zones={zones} 
                editingZone={editingZone}
                setEditingZone={setEditingZone}
                onZonesChange={() => { loadZones(); setShowMap(false); setEditingZone(null); }} 
              />
            </div>
          </div>
        )}

        {/* Filter Card */}
        <div className="card mb-4 border-0" style={{ borderRadius: '0.75rem', padding: '1.25rem 1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f2f4' }}>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#677788', marginBottom: '0.5rem' }}>Status</label>
              <select className="form-select shadow-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: '#f8f9fa', border: '1px solid #e7eaf3', fontSize: '0.875rem', padding: '0.6rem 1rem', borderRadius: '0.5rem' }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-md-auto ms-auto">
              <button onClick={() => { setStatusFilter(''); }}
                style={{ background: '#fff', color: '#677788', fontWeight: 600, padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #e7eaf3', cursor: 'pointer' }}>
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f1f2f4', overflow: 'hidden' }}>
          <div className="card-header d-flex align-items-center justify-content-between" style={{ background: '#fff', borderBottom: '1px solid #f1f2f4', padding: '1rem 1.5rem' }}>
            <h5 className="mb-0" style={{ fontWeight: 700, color: '#1e2022', fontSize: '1rem' }}>Configured Zones</h5>
            <span className="badge" style={{ background: 'rgba(55,125,255,0.1)', color: '#377dff', fontWeight: 700, borderRadius: 8, padding: '0.4rem 0.8rem' }}>
              {filtered.length} zone{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="d-flex align-items-center justify-content-center" style={{ height: 180 }}>
              <div className="spinner-border text-warning" role="status" style={{ width: '2rem', height: '2rem' }}>
                <span className="visually-hidden">Loading…</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Zone Name</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '3rem 1rem', color: '#677788' }}>
                        <i className="bi bi-geo-alt" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem', color: '#d1d5db' }}></i>
                        No zones configured yet.{' '}
                        <button onClick={() => setShowMap(true)}
                          style={{ background: 'none', border: 'none', color: '#ffc63a', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                          Add a zone
                        </button>{' '}
                        to start restricting registrations by location.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((z) => (
                      <tr key={z.id} style={{ borderBottom: '1px solid #f1f2f4' }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: '#1e2022' }}>{z.zone_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#677788' }}>#{z.id}</div>
                        </td>


                        <td style={tdStyle}>
                          {new Date(z.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={tdStyle}>
                          {z.is_active
                            ? <span style={badgeSoftSuccess}><i className="bi bi-check-circle-fill"></i> Active</span>
                            : <span style={badgeSoftDanger}><i className="bi bi-slash-circle"></i> Inactive</span>
                          }
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <div className="d-flex gap-2 justify-content-end">
                            <button onClick={() => toggleActive(z)}
                              style={{ background: z.is_active ? 'rgba(237,76,120,0.08)' : 'rgba(0,201,167,0.08)', color: z.is_active ? '#ed4c78' : '#00c9a7', border: 'none', borderRadius: 8, padding: '0.4rem 0.85rem', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                              <i className={`bi ${z.is_active ? 'bi-pause-circle' : 'bi-play-circle'} me-1`}></i>
                              {z.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button onClick={() => {
                                setEditingZone(z);
                                setShowMap(true);
                              }}
                                style={{ background: 'rgba(55,125,255,0.08)', color: '#377dff', border: 'none', borderRadius: 8, padding: '0.4rem 0.85rem', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                <i className="bi bi-pencil-square me-1"></i>Edit
                              </button>
                            <button onClick={() => handleDelete(z.id)}
                              style={{ background: 'rgba(237,76,120,0.08)', color: '#ed4c78', border: 'none', borderRadius: 8, padding: '0.4rem 0.85rem', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                              <i className="bi bi-trash3 me-1"></i>Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
