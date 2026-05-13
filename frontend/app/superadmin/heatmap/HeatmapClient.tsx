'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

// Approximate center coordinates for each Indian state (for fallback/bubbles)
const STATE_COORDS: Record<string, [number, number]> = {
  'Andhra Pradesh': [15.9129, 79.7400], 'Arunachal Pradesh': [28.2180, 94.7278],
  'Assam': [26.2006, 92.9376], 'Bihar': [25.0961, 85.3131],
  'Chhattisgarh': [21.2787, 81.8661], 'Goa': [15.2993, 74.1240],
  'Gujarat': [22.2587, 71.1924], 'Haryana': [29.0588, 76.0856],
  'Himachal Pradesh': [31.1048, 77.1734], 'Jharkhand': [23.6102, 85.2799],
  'Karnataka': [15.3173, 75.7139], 'Kerala': [10.8505, 76.2711],
  'Madhya Pradesh': [22.9734, 78.6569], 'Maharashtra': [19.7515, 75.7139],
  'Manipur': [24.6637, 93.9063], 'Meghalaya': [25.4670, 91.3662],
  'Mizoram': [23.1645, 92.9376], 'Nagaland': [26.1584, 94.5624],
  'Odisha': [20.9517, 85.0985], 'Punjab': [31.1471, 75.3412],
  'Rajasthan': [27.0238, 74.2179], 'Sikkim': [27.5330, 88.5122],
  'Tamil Nadu': [11.1271, 78.6569], 'Telangana': [18.1124, 79.0193],
  'Tripura': [23.9408, 91.9882], 'Uttar Pradesh': [26.8467, 80.9462],
  'Uttarakhand': [30.0668, 79.0193], 'West Bengal': [22.9868, 87.8550],
  'Andaman and Nicobar Islands': [11.7401, 92.6586],
  'Chandigarh': [30.7333, 76.7794],
  'Dadra and Nagar Haveli and Daman and Diu': [20.1809, 73.0169],
  'Delhi': [28.7041, 77.1025], 'Jammu and Kashmir': [33.7782, 76.5762],
  'Ladakh': [34.1526, 77.5770], 'Lakshadweep': [10.5667, 72.6417],
  'Puducherry': [11.9416, 79.8083],
};

interface HeatmapPoint {
  lat: number;
  lng: number;
  state: string;
  city: string;
}

interface RegistrationAttempt {
  id: number;
  name: string;
  email: string;
  mobile: string;
  address: string;
  pin_code: string;
  ip_address: string;
  country: string;
  state: string;
  city: string;
  is_allowed: number;
  created_at: string;
}

export default function HeatmapClient() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [stateCounts, setStateCounts] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [attempts, setAttempts] = useState<RegistrationAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const mapInitRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heatmapRes, attemptsRes] = await Promise.all([
          api.get<any>('/superadmin/user-state-heatmap'),
          api.get<any>('/superadmin/registration-attempts')
        ]);

        if (heatmapRes.success) {
          setPoints(heatmapRes.data.points || []);
          setStateCounts(heatmapRes.data.state_counts || {});
          setTotalUsers(heatmapRes.data.total_users || 0);
        }

        if (attemptsRes.success) {
          setAttempts(attemptsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch heatmap data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Init map
  useEffect(() => {
    if (loading || mapInitRef.current || typeof window === 'undefined' || !mapRef.current) return;
    mapInitRef.current = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      const map = L.map(mapRef.current!).setView([22.5, 82.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      renderLayers(L, map);
    };
    initMap();
  }, [loading]);

  const renderLayers = (L: any, map: any) => {
    // Clear existing
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    // 1. Render User Points (Individual Dots)
    points.forEach(p => {
      const dot = L.circleMarker([p.lat, p.lng], {
        radius: 4,
        fillColor: '#ffc63a',
        color: '#000',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.8
      }).addTo(map);
      
      dot.bindPopup(`<strong>${p.city || 'Unknown City'}</strong><br>${p.state}`);
      layersRef.current.push(dot);
    });

    // 2. Render State Bubbles (Aggregated)
    const maxCount = Math.max(...Object.values(stateCounts), 1);
    Object.entries(stateCounts).forEach(([state, count]) => {
      const coords = STATE_COORDS[state];
      if (!coords) return;

      const radius = 15000 + (count / maxCount) * 100000;
      const bubble = L.circle(coords, {
        radius,
        color: '#ffc63a',
        fillColor: '#ffc63a',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(map);

      bubble.bindTooltip(`<strong>${state}</strong>: ${count} users`, { permanent: false, direction: 'top' });
      
      bubble.on('click', () => setSelectedState(state));
      layersRef.current.push(bubble);

      // Label
      const label = L.divIcon({
        className: 'state-label',
        html: `<div style="font-size:0.7rem;font-weight:700;color:#333;text-align:center;">${state.split(' ')[0]}<br>${count}</div>`,
        iconAnchor: [20, 10]
      });
      const marker = L.marker(coords, { icon: label, interactive: false }).addTo(map);
      layersRef.current.push(marker);
    });
  };

  const sortedStates = Object.entries(stateCounts)
    .sort(([, a], [, b]) => b - a);

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .state-label { background: transparent; border: none; }
        .attempt-allowed { color: #10b981; }
        .attempt-blocked { color: #ef4444; }
      `}</style>

      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h1 className="h3 mb-1 fw-bold">Registration Heatmap</h1>
            <p className="text-muted small mb-0">Geographic distribution of verified users and registration demand tracking.</p>
          </div>
          <div className="text-end">
            <div className="h2 mb-0 fw-bold text-warning">{totalUsers}</div>
            <div className="text-muted small fw-bold">TOTAL VERIFIED USERS</div>
          </div>
        </div>

        <div className="row g-4">
          {/* Map Column */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white py-3 border-bottom-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">Live Distribution Map</h6>
                  <span className="badge bg-warning-subtle text-warning px-3 py-2 rounded-pill">
                    <i className="bi bi-broadcast me-2"></i>Real-time Data
                  </span>
                </div>
              </div>
              <div className="card-body p-0 position-relative">
                {loading && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 1000 }}>
                    <div className="spinner-border text-warning"></div>
                  </div>
                )}
                <div ref={mapRef} style={{ height: '600px', width: '100%' }}></div>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="col-lg-4">
            {/* State Leaderboard */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '1rem', height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header bg-white py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold">State Breakdown</h6>
              </div>
              <div className="card-body p-0 overflow-auto flex-grow-1">
                <ul className="list-group list-group-flush">
                  {sortedStates.length > 0 ? sortedStates.map(([state, count], idx) => {
                    const max = Math.max(...Object.values(stateCounts), 1);
                    const pct = (count / max) * 100;
                    return (
                      <li key={state} className={`list-group-item border-0 px-4 py-3 ${selectedState === state ? 'bg-warning-subtle' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedState(state)}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold small">{idx + 1}. {state}</span>
                          <span className="badge bg-dark rounded-pill">{count}</span>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div className="progress-bar bg-warning" style={{ width: `${pct}%` }}></div>
                        </div>
                      </li>
                    );
                  }) : (
                    <div className="p-5 text-center text-muted">
                      <i className="bi bi-geo-alt display-4 opacity-25"></i>
                      <p className="mt-2">No location data found</p>
                    </div>
                  )}
                </ul>
              </div>
              <div className="card-footer bg-light border-0 py-3 text-center">
                <span className="small text-muted">{Object.keys(stateCounts).length} active states detected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Attempts Log */}
        <div className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Registration Audit Log</h5>
            <div className="text-muted small">Showing latest 1000 attempts</div>
          </div>
          <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '1rem' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 small fw-bold">USER / CONTACT</th>
                    <th className="py-3 small fw-bold">IP & ADDRESS</th>
                    <th className="py-3 small fw-bold">DETECTION TYPE</th>
                    <th className="py-3 small fw-bold">RESULT</th>
                    <th className="px-4 py-3 small fw-bold">TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.length > 0 ? attempts.map(att => (
                    <tr key={att.id}>
                      <td className="px-4 py-3">
                        <div className="fw-bold text-dark">{att.name}</div>
                        <div className="text-muted x-small">{att.email} | {att.mobile}</div>
                      </td>
                      <td className="py-3">
                        <div className="small fw-semibold">{att.city || 'Unknown City'}, {att.state || 'Unknown State'}</div>
                        <div className="text-muted x-small">IP: {att.ip_address} | PIN: {att.pin_code}</div>
                      </td>
                      <td className="py-3">
                        <span className="badge bg-secondary-subtle text-secondary rounded-pill x-small">
                          {att.state ? 'Geographic' : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3">
                        {att.is_allowed ? (
                          <span className="attempt-allowed fw-bold small">
                            <i className="bi bi-check-circle-fill me-1"></i>SUCCESS
                          </span>
                        ) : (
                          <span className="attempt-blocked fw-bold small">
                            <i className="bi bi-x-circle-fill me-1"></i>BLOCKED (RESTRICTED ZONE)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted small">
                        {new Date(att.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">No registration attempts logged yet.</td>
                    </tr>
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
