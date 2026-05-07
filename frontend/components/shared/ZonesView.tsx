'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Zone {
  id: number;
  zone_name: string;
  state: string;
  state_code?: string;
  zone_polygon: string;
  is_active: string;
  created_at: string;
}

// All Indian states for dropdown
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };

export default function ZonesView() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState('');
  const [zoneState, setZoneState] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; address?: any }>>([]);
  const [hasPolygon, setHasPolygon] = useState(false);

  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const currentPolygonRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const leafletLoaded = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Zone[]>('/superadmin/zones').then((r) => {
      if (r.success && r.data) setZones(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Initialize Leaflet map
  useEffect(() => {
    if (leafletLoaded.current || typeof window === 'undefined') return;
    leafletLoaded.current = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet-draw');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new (L.Control as any).Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#ffc63a', fillOpacity: 0.3 } },
          polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
        },
        edit: { featureGroup: drawnItems, remove: true },
      });
      map.addControl(drawControl);

      map.on(((L as any).Draw as any).Event.CREATED, (event: any) => {
        if (currentPolygonRef.current) drawnItems.removeLayer(currentPolygonRef.current);
        currentPolygonRef.current = event.layer;
        drawnItems.addLayer(event.layer);
        setHasPolygon(true);
      });

      map.on(((L as any).Draw as any).Event.DELETED, () => {
        currentPolygonRef.current = null;
        setHasPolygon(false);
      });

      mapInstanceRef.current = map;
      drawnItemsRef.current = drawnItems;
    };

    initMap();
  }, []);

  const searchPlace = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=8`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
  };

  const goToLocation = async (lat: number, lng: number, name: string, address?: any) => {
    setSearchResults([]);
    setSearchQuery(name.split(',')[0]);
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (searchMarkerRef.current) map.removeLayer(searchMarkerRef.current);
    searchMarkerRef.current = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
      }),
    }).addTo(map);
    searchMarkerRef.current.bindPopup(`<b>${name.split(',')[0]}</b><br>Draw your zone here`).openPopup();
    map.setView([lat, lng], 8);

    // Auto-fill state from Nominatim address details
    if (address) {
      const detectedState = address.state || address.region || address.county || '';
      if (detectedState) {
        // Find best match in INDIAN_STATES
        const matched = INDIAN_STATES.find(
          s => s.toLowerCase() === detectedState.toLowerCase() ||
               detectedState.toLowerCase().includes(s.toLowerCase()) ||
               s.toLowerCase().includes(detectedState.toLowerCase())
        );
        if (matched) {
          setZoneState(matched);
          if (!zoneName) setZoneName(`${matched} Zone`);
          toast.success(`State auto-detected: ${matched}`, { duration: 2500 });
        } else if (detectedState) {
          setZoneState(detectedState);
          if (!zoneName) setZoneName(`${detectedState} Zone`);
        }
      }
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode to get state
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          await goToLocation(latitude, longitude, data.display_name || 'Your Location', data.address);
        } catch {
          await goToLocation(latitude, longitude, 'Your Current Location');
        }
      },
      (err) => toast.error('Unable to get location: ' + err.message)
    );
  };

  const clearDrawing = async () => {
    if (currentPolygonRef.current && drawnItemsRef.current) {
      drawnItemsRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
      setHasPolygon(false);
    }
    setZoneName('');
    setZoneState('');
  };

  const saveZone = async () => {
    if (!zoneName.trim()) { toast.error('Please enter a zone name'); return; }
    if (!zoneState.trim()) { toast.error('Please select a state for this zone'); return; }

    // Check for duplicate state
    const duplicate = zones.find(z => z.state?.toLowerCase() === zoneState.toLowerCase() && Number(z.is_active));
    if (duplicate) {
      toast.error(`An active zone for "${zoneState}" already exists. Deactivate it first.`);
      return;
    }

    let polygonJson: string | null = null;
    if (currentPolygonRef.current) {
      const latlngs = currentPolygonRef.current.getLatLngs()[0];
      polygonJson = JSON.stringify(latlngs.map((ll: any) => [ll.lat, ll.lng]));
    }

    setSaving(true);
    const res = await api.post<any>('/superadmin/add-zone', {
      zone_name: zoneName,
      state: zoneState,
      zone_polygon: polygonJson,
    });

    setSaving(false);
    if (res.success) {
      toast.success('Zone saved successfully!');
      clearDrawing();
      load();
    } else {
      toast.error(res.message || 'Failed to save zone');
    }
  };

  const viewZone = async (polygonJson: string) => {
    if (!polygonJson) { toast.error('No polygon data for this zone'); return; }
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const coordinates = JSON.parse(polygonJson);
      const latlngs = coordinates.map((c: number[]) => [c[0], c[1]]);
      const polygon = L.polygon(latlngs, { color: '#0dcaf0', fillOpacity: 0.3 }).addTo(map);
      map.fitBounds(polygon.getBounds());
    } catch { toast.error('Could not render polygon'); }
  };

  const toggleZone = async (id: number) => {
    await api.post(`/superadmin/toggle-zone/${id}`);
    load();
  };

  const deleteZone = async (id: number) => {
    confirmToast('Delete this zone? Users from this state will be blocked from registering.', async () => {
      await api.post(`/superadmin/delete-zone/${id}`);
      load();
    });
  };

  const activeZones = zones.filter(z => Number(z.is_active));
  const inactiveZones = zones.filter(z => !Number(z.is_active));

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />

      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-geo-alt-fill" style={{ color: '#ffc63a' }}></i> Zone Management
          </h1>
          <p className="text-muted small">
            Add states where registration is permitted. Users from unlisted states will be blocked during registration when zone restriction is enabled.
          </p>
        </div>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Active Zones', value: activeZones.length, icon: 'bi-check-circle-fill', color: '#198754' },
            { label: 'Inactive Zones', value: inactiveZones.length, icon: 'bi-pause-circle-fill', color: '#6c757d' },
            { label: 'Total Zones', value: zones.length, icon: 'bi-map-fill', color: '#ffc63a' },
          ].map((s) => (
            <div key={s.label} className="col-md-4">
              <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="card-body d-flex align-items-center gap-3">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: '1.3rem', color: s.color }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
                    <div className="text-muted small">{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Zone Card */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-light" style={{ borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.5rem' }}>
            <h5 className="mb-0 fw-bold"><i className="bi bi-plus-circle me-2" style={{ color: '#ffc63a' }}></i>Add New Zone</h5>
            <small className="text-muted">Select a state and optionally draw a geographic boundary on the map</small>
          </div>
          <div className="card-body p-4">
            {/* Zone Name + State */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label fw-semibold small">Zone Name <span className="text-danger">*</span></label>
                <input className="form-control" style={inputStyle} placeholder="e.g., Maharashtra Zone, Delhi NCR"
                  value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold small">
                  State <span className="text-danger">*</span>
                  <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>Registration Gate</span>
                </label>
                <select className="form-select" style={inputStyle} value={zoneState} onChange={(e) => setZoneState(e.target.value)}>
                  <option value="">— Select State —</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s} disabled={!!zones.find(z => z.state === s && Number(z.is_active))}>
                      {s}{zones.find(z => z.state === s && Number(z.is_active)) ? ' (already active)' : ''}
                    </option>
                  ))}
                </select>
                <small className="text-muted mt-1 d-block">Users from this state will be allowed to register</small>
              </div>
            </div>

            {/* Map Section */}
            <div className="mb-3">
              <label className="form-label fw-semibold small">Geographic Boundary <span className="text-muted">(Optional — for visual reference)</span></label>

              {/* Search + Location */}
              <div className="row mb-2 g-2">
                <div className="col-md-8">
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input className="form-control" style={inputStyle} placeholder="Search for a place (e.g., Mumbai, Maharashtra)"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }} />
                    <button className="btn sa-filter-btn" style={btnGold} onClick={searchPlace}>Search</button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="list-group mt-1" style={{ maxHeight: 200, overflowY: 'auto', position: 'absolute', zIndex: 1000, width: '66%', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', borderRadius: '0.5rem' }}>
                      {searchResults.map((r, i) => {
                        const detectedState = r.address?.state || r.address?.region || '';
                        const matchedState = INDIAN_STATES.find(
                          s => s.toLowerCase() === detectedState.toLowerCase() ||
                               detectedState.toLowerCase().includes(s.toLowerCase())
                        );
                        return (
                          <a key={i} href="#" className="list-group-item list-group-item-action"
                            style={{ fontSize: '0.82rem', padding: '0.6rem 1rem' }}
                            onClick={(e) => { e.preventDefault(); goToLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name, r.address); }}>
                            <div className="d-flex align-items-center justify-content-between">
                              <span><i className="bi bi-geo-alt me-2" style={{ color: '#ffc63a' }}></i>{r.display_name.split(',').slice(0, 3).join(',')}</span>
                              {matchedState && (
                                <span className="badge ms-2" style={{ background: '#ffc63a22', color: '#856404', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  <i className="bi bi-geo-fill me-1"></i>{matchedState}
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="col-md-4">
                  <button className="btn btn-outline-secondary w-100" style={{ borderRadius: '0.5rem', fontWeight: 600 }} onClick={useCurrentLocation}>
                    <i className="bi bi-geo-alt-fill me-1"></i> Use My Location
                  </button>
                </div>
              </div>

              <div ref={mapRef} style={{ height: 450, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e7eaf3' }}></div>
              <div className="mt-2 d-flex gap-2 flex-wrap">
                {zoneState && (
                  <div className="alert alert-warning py-2 px-3 small mb-0 d-flex align-items-center gap-2" style={{ borderRadius: '0.5rem' }}>
                    <i className="bi bi-geo-fill text-warning"></i>
                    <span>State auto-detected: <strong>{zoneState}</strong></span>
                    <button className="btn btn-sm btn-link text-muted p-0 ms-2" onClick={() => setZoneState('')} title="Clear state">✕</button>
                  </div>
                )}
                {hasPolygon && (
                  <div className="alert alert-success py-2 px-3 small mb-0 d-flex align-items-center gap-2" style={{ borderRadius: '0.5rem' }}>
                    <i className="bi bi-bounding-box"></i>
                    <span>Polygon drawn — will be saved with the zone</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="d-flex gap-2">
              <button className="btn sa-filter-btn" style={btnGold} onClick={saveZone} disabled={saving || !zoneName.trim() || !zoneState.trim()}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-save me-1"></i>Save Zone</>}
              </button>
              <button className="btn btn-outline-secondary" style={{ borderRadius: '0.5rem' }} onClick={clearDrawing}>
                <i className="bi bi-x-circle me-1"></i>Clear
              </button>
            </div>
          </div>
        </div>

        {/* Zones Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-light d-flex justify-content-between align-items-center" style={{ borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.5rem' }}>
            <h5 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2"></i>Configured Zones</h5>
            <span className="badge" style={{ background: '#ffc63a', color: '#000', fontWeight: 700 }}>{zones.length} total</span>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Zone Name</th>
                    <th style={thStyle}>State <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>Registration Gate</span></th>
                    <th style={thStyle}>Polygon</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {zones.length > 0 ? zones.map((z) => (
                      <tr key={z.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }} className="fw-bold">{z.zone_name}</td>
                        <td style={tdStyle}>
                          {z.state ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffc63a22', color: '#856404', padding: '4px 10px', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem' }}>
                              <i className="bi bi-geo-fill"></i>{z.state}
                            </span>
                          ) : <span className="text-muted small">Not set</span>}
                        </td>
                        <td style={tdStyle}>
                          {z.zone_polygon ? (
                            <span className="badge bg-success-subtle text-success">
                              <i className="bi bi-bounding-box me-1"></i>Drawn
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary">None</span>
                          )}
                        </td>
                        <td style={tdStyle} className="text-muted small">
                          {new Date(z.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ padding: '4px 12px', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', ...(Number(z.is_active) ? { background: 'rgba(25,135,84,0.1)', color: '#198754' } : { background: 'rgba(220,53,69,0.1)', color: '#dc3545' }) }}>
                            {Number(z.is_active) ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          {z.zone_polygon && (
                            <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => viewZone(z.zone_polygon)} title="View Polygon on Map">
                              <i className="bi bi-map"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => toggleZone(z.id)} title={Number(z.is_active) ? 'Deactivate' : 'Activate'}>
                            <i className={`bi bi-toggle-${Number(z.is_active) ? 'on text-success' : 'off text-muted'}`}></i>
                          </button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => deleteZone(z.id)} title="Delete Zone">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-5">
                        <i className="bi bi-geo-alt" style={{ fontSize: '3rem', opacity: 0.2 }}></i>
                        <p className="text-muted mt-2 mb-0">No zones configured yet.</p>
                        <p className="text-muted small">Add a zone above to start restricting registrations by state.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
