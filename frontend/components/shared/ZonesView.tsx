'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { confirmToast } from '@/lib/toast-utils';

interface Zone {
  id: number; zone_name: string; zone_polygon: string; is_active: string; created_at: string;
}

const thStyle: React.CSSProperties = { backgroundColor: '#f8f9fa', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5, color: '#677788', padding: '1rem' };
const tdStyle: React.CSSProperties = { padding: '1rem', verticalAlign: 'middle', fontSize: '0.875rem' };
const btnGold: React.CSSProperties = { background: '#ffc63a', color: '#212529', fontWeight: 600, border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem' };
const inputStyle: React.CSSProperties = { background: '#f8f9fa', border: '1px solid #e7eaf3', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' };

export default function ZonesView() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneName, setZoneName] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
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

      // Fix default icon paths
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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
  };

  const goToLocation = async (lat: number, lng: number, name: string) => {
    setSearchResults([]);
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
    searchMarkerRef.current.bindPopup(`<b>${name}</b><br>Draw your zone here`).openPopup();
    map.setView([lat, lng], 13);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => goToLocation(pos.coords.latitude, pos.coords.longitude, 'Your Current Location'),
      (err) => toast.error('Unable to get location: ' + err.message)
    );
  };

  const clearDrawing = async () => {
    if (currentPolygonRef.current && drawnItemsRef.current) {
      drawnItemsRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
      setHasPolygon(false);
      setZoneName('');
    }
  };

  const saveZone = async () => {
    if (!zoneName.trim()) {
      toast.error('Please enter a zone name');
      return;
    }
    if (!currentPolygonRef.current) {
      toast.error('Please draw a polygon on the map');
      return;
    }

    const latlngs = currentPolygonRef.current.getLatLngs()[0];
    const coordinates = latlngs.map((ll: any) => [ll.lat, ll.lng]);

    setSaving(true);
    const res = await api.post<any>('/superadmin/add-zone', {
      zone_name: zoneName,
      zone_polygon: JSON.stringify(coordinates)
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
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const coordinates = JSON.parse(polygonJson);
      const latlngs = coordinates.map((c: number[]) => [c[0], c[1]]);
      const polygon = L.polygon(latlngs, { color: '#0dcaf0', fillOpacity: 0.3 }).addTo(map);
      map.fitBounds(polygon.getBounds());
    } catch {}
  };

  const toggleZone = async (id: number) => {
    await api.post(`/superadmin/toggle-zone/${id}`);
    load();
  };

  const deleteZone = async (id: number) => {
    confirmToast('Delete this zone? This cannot be undone.', async () => {
      await api.post(`/superadmin/delete-zone/${id}`);
      load();
    });
  };

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />

      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <i className="bi bi-geo-alt-fill" style={{ color: '#ffc63a' }}></i> Zone Management
          </h1>
          <p className="text-muted small">Define geographic zones where users can register</p>
        </div>

        {/* Map Card */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-light" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold">Draw Registration Zone</h5>
            <small className="text-muted">Search for a location or use current location, then draw the allowed registration area</small>
          </div>
          <div className="card-body">
            {/* Search + Location */}
            <div className="row mb-3">
              <div className="col-md-8">
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input className="form-control" style={inputStyle} placeholder="Search for a place (e.g., Mumbai, Delhi)"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }} />
                  <button className="btn sa-filter-btn" style={btnGold} onClick={searchPlace}><i className="bi bi-search me-1"></i> Search</button>
                </div>
                {searchResults.length > 0 && (
                  <div className="list-group mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {searchResults.map((r, i) => (
                      <a key={i} href="#" className="list-group-item list-group-item-action" onClick={(e) => { e.preventDefault(); goToLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name); }}>
                        <i className="bi bi-geo-alt me-2" style={{ color: '#ffc63a' }}></i>{r.display_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-md-4">
                <button className="btn btn-outline-secondary w-100" style={{ borderRadius: '0.5rem', fontWeight: 600 }} onClick={useCurrentLocation}>
                  <i className="bi bi-geo-alt-fill me-1"></i> Use Current Location
                </button>
              </div>
            </div>

            {/* Map */}
            <div ref={mapRef} style={{ height: 500, borderRadius: '0.75rem', overflow: 'hidden' }}></div>

            {/* Zone Name + Save */}
            <div className="mt-3">
              <input className="form-control" style={{ ...inputStyle, maxWidth: 400 }} placeholder="Enter zone name (e.g., Mumbai Central)"
                value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
              <div className="d-flex gap-2 mt-2">
                <button className="btn sa-filter-btn" style={btnGold} onClick={saveZone} disabled={!hasPolygon || saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-save me-1"></i> Save Zone</>}
                </button>
                <button className="btn btn-secondary" onClick={clearDrawing}><i className="bi bi-x-circle me-1"></i> Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Zones Table */}
        <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-light" style={{ borderRadius: '0.75rem 0.75rem 0 0' }}>
            <h5 className="mb-0 fw-bold">Configured Zones</h5>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead><tr>
                    <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Zone Name</th>
                    <th style={thStyle}>Created At</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'end', paddingRight: '1.5rem' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {zones.length > 0 ? zones.map((z) => (
                      <tr key={z.id}>
                        <td style={{ ...tdStyle, paddingLeft: '1.5rem' }} className="fw-bold">{z.zone_name}</td>
                        <td style={tdStyle}>{new Date(z.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} {new Date(z.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, ...(Number(z.is_active) ? { background: 'rgba(25,135,84,0.1)', color: '#198754' } : { background: 'rgba(220,53,69,0.1)', color: '#dc3545' }) }}>
                            {Number(z.is_active) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'end', paddingRight: '1.5rem' }}>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => viewZone(z.zone_polygon)} title="View on Map">
                            <i className="bi bi-eye"></i>
                          </button>
                          <button className="btn btn-sm btn-light border me-1" style={{ borderRadius: 8 }} onClick={() => toggleZone(z.id)} title="Toggle Status">
                            <i className={`bi bi-toggle-${Number(z.is_active) ? 'on' : 'off'}`}></i>
                          </button>
                          <button className="btn btn-sm btn-light border text-danger" style={{ borderRadius: 8 }} onClick={() => deleteZone(z.id)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center py-5">
                        <i className="bi bi-geo-alt" style={{ fontSize: '3rem', opacity: 0.25 }}></i>
                        <p className="text-muted mt-2">No zones configured yet. Draw a zone on the map to get started.</p>
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
