'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

interface Attempt {
  id: number; name: string; email: string; mobile: string; user_type: string;
  address: string; city: string; state: string; pin_code: string;
  latitude: string; longitude: string; ip_address: string;
  is_allowed: string; created_at: string;
}

interface Zone { id: number; zone_name: string; zone_polygon: string; is_active: string; }

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };

export default function HeatmapClient() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInitRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get<Attempt[]>('/superadmin/registration-attempts'),
      api.get<Zone[]>('/superadmin/zones'),
    ]).then(([ar, zr]) => {
      if (ar.success && ar.data) setAttempts(ar.data);
      if (zr.success && zr.data) setZones(zr.data);
      setLoading(false);
    });
  }, []);

  // Initialize map after data loads
  useEffect(() => {
    if (loading || mapInitRef.current || typeof window === 'undefined' || !mapRef.current) return;
    mapInitRef.current = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      // Legend
      const legend = (L as any).control({ position: 'bottomright' });
      legend.onAdd = () => {
        const div = L.DomUtil.create('div');
        div.style.cssText = 'background:#fff;padding:10px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,0.2);font-size:0.8rem;';
        div.innerHTML = `
          <div style="display:flex;align-items:center;margin:5px 0"><div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;margin-right:8px;font-size:12px"><i class="bi bi-shop-window"></i></div>Seller</div>
          <div style="display:flex;align-items:center;margin:5px 0"><div style="width:24px;height:24px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;margin-right:8px;font-size:12px"><i class="bi bi-bag-heart"></i></div>Buyer</div>
          <hr style="margin:8px 0">
          <div style="display:flex;align-items:center;margin:5px 0"><div style="width:20px;height:20px;background:rgba(34,197,94,0.3);border:2px solid #22c55e;border-radius:3px;margin-right:8px"></div>Allowed Zones</div>
        `;
        return div;
      };
      legend.addTo(map);

      // Draw zones
      zones.filter(z => Number(z.is_active)).forEach(zone => {
        try {
          const coords = JSON.parse(zone.zone_polygon);
          if (Array.isArray(coords) && coords.length > 0) {
            const poly = L.polygon(coords, { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2, weight: 2 }).addTo(map);
            poly.bindPopup(`<div style="text-align:center"><h6 style="margin-bottom:4px;font-weight:700;color:#22c55e">${zone.zone_name}</h6><small style="color:#6c757d">Allowed Zone</small></div>`);
            poly.bindTooltip(zone.zone_name, { permanent: false, direction: 'center', className: 'zone-tooltip' });
          }
        } catch {}
      });

      // Custom icons
      const sellerIcon = L.divIcon({
        className: '', iconSize: [32, 32], iconAnchor: [16, 16],
        html: '<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><i class="bi bi-shop-window" style="font-size:14px"></i></div>',
      });
      const buyerIcon = L.divIcon({
        className: '', iconSize: [32, 32], iconAnchor: [16, 16],
        html: '<div style="background:#10b981;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><i class="bi bi-bag-heart" style="font-size:14px"></i></div>',
      });

      // Add markers
      attempts.forEach(a => {
        const lat = parseFloat(a.latitude);
        const lng = parseFloat(a.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const icon = a.user_type === 'seller' ? sellerIcon : buyerIcon;
        const zoneStatus = Number(a.is_allowed) ? '<span class="badge bg-success">Allowed</span>' : '<span class="badge bg-warning">Not Serviceable</span>';

        L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
          <div style="min-width:250px">
            <h6 style="margin-bottom:8px;font-weight:700">${a.name || 'N/A'}</h6>
            <table style="font-size:0.85rem;width:100%">
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Email:</td><td>${a.email || 'N/A'}</td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Mobile:</td><td>${a.mobile || 'N/A'}</td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Type:</td><td><span class="badge ${a.user_type === 'seller' ? 'bg-primary' : 'bg-success'}">${a.user_type || 'N/A'}</span></td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Address:</td><td>${a.address || 'N/A'}</td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">PIN:</td><td>${a.pin_code || 'N/A'}</td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Location:</td><td>${a.city || 'Unknown'}, ${a.state || 'Unknown'}</td></tr>
              ${a.ip_address ? `<tr><td style="color:#6c757d;padding:2px 8px 2px 0">IP:</td><td><code>${a.ip_address}</code></td></tr>` : ''}
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Zone:</td><td>${zoneStatus}</td></tr>
              <tr><td style="color:#6c757d;padding:2px 8px 2px 0">Date:</td><td>${new Date(a.created_at).toLocaleString()}</td></tr>
            </table>
          </div>
        `);
      });
    };

    initMap();
  }, [loading, attempts, zones]);

  const totalAttempts = attempts.length;
  const sellerAttempts = attempts.filter(a => a.user_type === 'seller').length;
  const buyerAttempts = attempts.filter(a => a.user_type === 'buyer').length;

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`.zone-tooltip{background:rgba(34,197,94,0.9);color:#fff;border:none;border-radius:4px;padding:4px 8px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.2)}`}</style>

      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-map-fill" style={{ color: '#ffc63a' }}></i> Registration Heatmap
          </h1>
          <p className="text-muted small">Visualize registration attempts by role and location</p>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '0.75rem' }}>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Total Attempts</small>
                  <h4 className="mb-0 fw-bold" style={{ color: '#ffc63a' }}>{totalAttempts}</h4>
                </div>
                <i className="bi bi-people-fill" style={{ fontSize: '2rem', opacity: 0.3, color: '#ffc63a' }}></i>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '0.75rem' }}>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Seller Attempts</small>
                  <h4 className="mb-0 fw-bold" style={{ color: '#3b82f6' }}>{sellerAttempts}</h4>
                </div>
                <i className="bi bi-shop-window" style={{ fontSize: '2rem', opacity: 0.3, color: '#3b82f6' }}></i>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '0.75rem' }}>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Buyer Attempts</small>
                  <h4 className="mb-0 fw-bold" style={{ color: '#10b981' }}>{buyerAttempts}</h4>
                </div>
                <i className="bi bi-bag-heart" style={{ fontSize: '2rem', opacity: 0.3, color: '#10b981' }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5" style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
              </div>
            ) : (
              <div ref={mapRef} style={{ height: 600, borderRadius: '0.75rem' }}></div>
            )}
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0.75rem' }}>
          <div className="card-header bg-light" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold">Recent Registration Attempts</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead><tr>
                  <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Name</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>User Type</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Zone Status</th>
                  <th style={thStyle}>Date</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></td></tr>
                  ) : attempts.length > 0 ? attempts.slice(0, 50).map((a) => (
                    <tr key={a.id}>
                      <td style={{ ...tdStyle, paddingLeft: '1.5rem' }}>{a.name || 'N/A'}</td>
                      <td style={tdStyle}>{a.mobile || 'N/A'}</td>
                      <td style={tdStyle}>
                        <span className={`badge ${a.user_type === 'seller' ? 'bg-primary' : 'bg-success'}`}>
                          <i className={`bi ${a.user_type === 'seller' ? 'bi-shop-window' : 'bi-bag-heart'} me-1`}></i>
                          {a.user_type || 'N/A'}
                        </span>
                      </td>
                      <td style={tdStyle}>{a.city || 'Unknown'}, {a.state || 'Unknown'}</td>
                      <td style={tdStyle}>
                        {Number(a.is_allowed) ? (
                          <span className="badge bg-success">Allowed</span>
                        ) : (
                          <span className="badge bg-warning">Not Serviceable</span>
                        )}
                      </td>
                      <td style={tdStyle}>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-4 text-muted">No registration attempts recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
