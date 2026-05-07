'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';

// Approximate center coordinates for each Indian state
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

interface StateTotals {
  state: string; total: number; sellers: number; buyers: number; both_users: number;
}
interface ByStateType {
  state: string; user_type: string; total: number; verified: number; first_reg: string; last_reg: string;
}
interface Summary {
  total_users: number; total_sellers: number; total_buyers: number; total_both: number; total_states: number;
}

type FilterType = 'all' | 'seller' | 'buyer' | 'both';

const FILTER_CONFIG = {
  all:    { label: 'All Users',  color: '#ffc63a', bg: '#ffc63a33', icon: 'bi-people-fill' },
  seller: { label: 'Sellers',   color: '#3b82f6', bg: '#3b82f633', icon: 'bi-shop-window' },
  buyer:  { label: 'Buyers',    color: '#10b981', bg: '#10b98133', icon: 'bi-bag-heart-fill' },
  both:   { label: 'Both',      color: '#8b5cf6', bg: '#8b5cf633', icon: 'bi-person-fill-check' },
};

export default function HeatmapClient() {
  const [stateTotals, setStateTotals] = useState<StateTotals[]>([]);
  const [byStateType, setByStateType] = useState<ByStateType[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleLayersRef = useRef<any[]>([]);
  const mapInitRef = useRef(false);

  useEffect(() => {
    api.get<any>('/superadmin/user-state-heatmap').then((r) => {
      if (r.success && r.data) {
        setStateTotals(r.data.state_totals || []);
        setByStateType(r.data.by_state_type || []);
        setSummary(r.data.summary || null);
      }
      setLoading(false);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (loading || mapInitRef.current || typeof window === 'undefined' || !mapRef.current) return;
    mapInitRef.current = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      const map = L.map(mapRef.current!).setView([22.5, 82.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      renderCircles(L, map, stateTotals, filter);
    };
    initMap();
  }, [loading]);

  // Re-render circles on filter/data change
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined' || loading) return;
    import('leaflet').then(({ default: L }) => {
      renderCircles(L, mapInstanceRef.current, stateTotals, filter);
    });
  }, [filter, stateTotals]);

  const renderCircles = (L: any, map: any, data: StateTotals[], activeFilter: FilterType) => {
    // Clear existing layers
    circleLayersRef.current.forEach(l => map.removeLayer(l));
    circleLayersRef.current = [];

    const maxVal = Math.max(...data.map(s => getCount(s, activeFilter)), 1);

    data.forEach((s) => {
      const coords = STATE_COORDS[s.state];
      if (!coords) return;
      const count = getCount(s, activeFilter);
      if (count === 0) return;

      const cfg = FILTER_CONFIG[activeFilter];
      const radius = 20000 + (count / maxVal) * 120000; // 20km–140km
      const opacity = 0.25 + (count / maxVal) * 0.5;

      const circle = L.circle(coords, {
        radius, color: cfg.color, fillColor: cfg.color,
        fillOpacity: opacity, weight: 2,
      }).addTo(map);

      circle.bindPopup(`
        <div style="min-width:200px;font-family:Inter,sans-serif">
          <h6 style="font-weight:800;margin-bottom:8px;font-size:1rem">${s.state}</h6>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
            <div style="background:#ffc63a22;padding:6px 10px;border-radius:8px;text-align:center">
              <div style="font-size:1.2rem;font-weight:800">${s.total}</div>
              <div style="font-size:0.7rem;color:#666">Total</div>
            </div>
            <div style="background:#3b82f622;padding:6px 10px;border-radius:8px;text-align:center">
              <div style="font-size:1.2rem;font-weight:800;color:#3b82f6">${s.sellers}</div>
              <div style="font-size:0.7rem;color:#666">Sellers</div>
            </div>
            <div style="background:#10b98122;padding:6px 10px;border-radius:8px;text-align:center">
              <div style="font-size:1.2rem;font-weight:800;color:#10b981">${s.buyers}</div>
              <div style="font-size:0.7rem;color:#666">Buyers</div>
            </div>
            <div style="background:#8b5cf622;padding:6px 10px;border-radius:8px;text-align:center">
              <div style="font-size:1.2rem;font-weight:800;color:#8b5cf6">${s.both_users}</div>
              <div style="font-size:0.7rem;color:#666">Both</div>
            </div>
          </div>
        </div>
      `);

      circle.on('click', () => setSelectedState(s.state));
      circleLayersRef.current.push(circle);

      // State label
      const label = L.divIcon({
        className: '',
        html: `<div style="font-size:0.7rem;font-weight:700;color:#222;white-space:nowrap;text-shadow:1px 1px 2px #fff,-1px -1px 2px #fff">${s.state.split(' ')[0]}<br>${count}</div>`,
        iconAnchor: [0, 0],
      });
      const marker = L.marker(coords, { icon: label, interactive: false }).addTo(map);
      circleLayersRef.current.push(marker);
    });
  };

  const getCount = (s: StateTotals, f: FilterType) => {
    if (f === 'all') return s.total;
    if (f === 'seller') return s.sellers;
    if (f === 'buyer') return s.buyers;
    return s.both_users;
  };

  const selectedStateDetails = selectedState
    ? byStateType.filter(r => r.state === selectedState)
    : [];
  const selectedStateSummary = selectedState
    ? stateTotals.find(s => s.state === selectedState)
    : null;

  const displayData = filter === 'all'
    ? stateTotals
    : stateTotals.filter(s => getCount(s, filter) > 0).sort((a, b) => getCount(b, filter) - getCount(a, filter));

  return (
    <DashboardLayout requiredRoles={['super_admin']}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div className="container-fluid">
        {/* Header */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.25rem' }}>
            <i className="bi bi-map-fill" style={{ color: '#ffc63a' }}></i> Registration Heatmap
          </h1>
          <p className="text-muted small">Visual breakdown of Sellers, Buyers & Both users by state across India</p>
        </div>

        {/* Summary Stats */}
        <div className="row g-3 mb-4">
          {[
            { key: 'all',    label: 'Total Users',  value: summary?.total_users ?? 0,   color: '#ffc63a', icon: 'bi-people-fill' },
            { key: 'seller', label: 'Sellers',       value: summary?.total_sellers ?? 0, color: '#3b82f6', icon: 'bi-shop-window' },
            { key: 'buyer',  label: 'Buyers',        value: summary?.total_buyers ?? 0,  color: '#10b981', icon: 'bi-bag-heart-fill' },
            { key: 'both',   label: 'Both Roles',   value: summary?.total_both ?? 0,    color: '#8b5cf6', icon: 'bi-person-fill-check' },
            { key: 'states', label: 'States Active', value: summary?.total_states ?? 0, color: '#f97316', icon: 'bi-geo-alt-fill' },
          ].map((s) => (
            <div key={s.key} className="col-md">
              <div
                className="card border-0"
                style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: s.key !== 'states' ? 'pointer' : 'default', border: filter === s.key ? `2px solid ${s.color}` : '2px solid transparent', transition: '0.2s' }}
                onClick={() => s.key !== 'states' && setFilter(s.key as FilterType)}
              >
                <div className="card-body d-flex align-items-center gap-3 py-3">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: '1.2rem', color: s.color }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="card border-0 mb-4" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-body p-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="text-muted small fw-semibold me-2">Show on map:</span>
              {(Object.entries(FILTER_CONFIG) as [FilterType, typeof FILTER_CONFIG['all']][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ background: filter === key ? cfg.color : '#f8f9fa', color: filter === key ? '#fff' : '#333', border: 'none', borderRadius: '2rem', padding: '6px 18px', fontWeight: 600, fontSize: '0.82rem', transition: '0.2s', cursor: 'pointer' }}>
                  <i className={`bi ${cfg.icon} me-1`}></i>{cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Map */}
          <div className="col-lg-8">
            <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div className="card-header bg-light d-flex justify-content-between align-items-center" style={{ padding: '0.75rem 1.25rem' }}>
                <span className="fw-bold small">
                  <i className={`bi ${FILTER_CONFIG[filter].icon} me-2`} style={{ color: FILTER_CONFIG[filter].color }}></i>
                  {FILTER_CONFIG[filter].label} — State Distribution
                </span>
                <span className="badge" style={{ background: FILTER_CONFIG[filter].color, color: filter === 'all' ? '#000' : '#fff', fontSize: '0.7rem' }}>
                  Bubble size ∝ user count
                </span>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div style={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner-border" style={{ color: '#ffc63a' }}></div>
                  </div>
                ) : (
                  <div ref={mapRef} style={{ height: 520 }}></div>
                )}
              </div>
            </div>
          </div>

          {/* State Detail Panel */}
          <div className="col-lg-4">
            <div className="card border-0" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
              <div className="card-header bg-light" style={{ padding: '0.75rem 1.25rem' }}>
                <span className="fw-bold small">
                  {selectedState ? <><i className="bi bi-geo-fill me-1" style={{ color: '#ffc63a' }}></i>{selectedState}</> : 'Click a bubble for details'}
                </span>
              </div>
              <div className="card-body p-3" style={{ overflowY: 'auto', maxHeight: 470 }}>
                {selectedState && selectedStateSummary ? (
                  <>
                    {/* State mini stats */}
                    <div className="row g-2 mb-3">
                      {[
                        { label: 'Total', value: selectedStateSummary.total, color: '#ffc63a' },
                        { label: 'Sellers', value: selectedStateSummary.sellers, color: '#3b82f6' },
                        { label: 'Buyers', value: selectedStateSummary.buyers, color: '#10b981' },
                        { label: 'Both', value: selectedStateSummary.both_users, color: '#8b5cf6' },
                      ].map(stat => (
                        <div key={stat.label} className="col-6">
                          <div style={{ background: `${stat.color}15`, borderRadius: '0.5rem', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>{stat.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Breakdown */}
                    {selectedStateDetails.map((d, i) => (
                      <div key={i} className="d-flex justify-content-between align-items-center mb-2 p-2" style={{ background: '#f8f9fa', borderRadius: '0.5rem' }}>
                        <span>
                          <span className="badge me-2" style={{ background: d.user_type === 'seller' ? '#3b82f6' : d.user_type === 'buyer' ? '#10b981' : '#8b5cf6', color: '#fff', fontSize: '0.7rem' }}>
                            {d.user_type}
                          </span>
                          <span className="small text-muted">{d.verified} verified</span>
                        </span>
                        <strong>{d.total}</strong>
                      </div>
                    ))}
                    <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.75rem' }}>
                      First reg: {selectedStateDetails[0]?.first_reg ? new Date(selectedStateDetails[0].first_reg).toLocaleDateString('en-IN') : '—'}<br />
                      Latest: {selectedStateDetails[0]?.last_reg ? new Date(selectedStateDetails[0].last_reg).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-cursor-fill" style={{ fontSize: '2rem', opacity: 0.2 }}></i>
                    <p className="small mt-2">Click any bubble on the map to see state-level breakdown</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* State Leaderboard Table */}
        <div className="card border-0 mt-4" style={{ borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="card-header bg-light d-flex justify-content-between align-items-center" style={{ borderRadius: '0.75rem 0.75rem 0 0', padding: '1rem 1.5rem' }}>
            <h5 className="mb-0 fw-bold"><i className="bi bi-bar-chart-fill me-2" style={{ color: '#ffc63a' }}></i>State Leaderboard</h5>
            <span className="badge bg-secondary-subtle text-secondary">{displayData.length} states</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr style={{ background: '#f8f9fa', fontSize: '0.75rem', color: '#677788', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '0.875rem 1.5rem' }}>#</th>
                    <th style={{ padding: '0.875rem 1rem' }}>State</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Total</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Sellers</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Buyers</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Both</th>
                    <th style={{ padding: '0.875rem 1.5rem' }}>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border" style={{ color: '#ffc63a' }}></div></td></tr>
                  ) : displayData.length > 0 ? displayData.map((s, i) => {
                    const max = Math.max(...displayData.map(x => x.total), 1);
                    const pct = Math.round((s.total / max) * 100);
                    return (
                      <tr key={s.state} style={{ cursor: 'pointer', background: selectedState === s.state ? '#ffc63a10' : undefined }} onClick={() => setSelectedState(s.state)}>
                        <td style={{ padding: '0.875rem 1.5rem', color: '#aaa', fontWeight: 600 }}>#{i + 1}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 700 }}>
                          <i className="bi bi-geo-alt-fill me-1" style={{ color: '#ffc63a', fontSize: '0.8rem' }}></i>{s.state}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}><strong>{s.total}</strong></td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 600 }}>{s.sellers}</span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{s.buyers}</span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{s.both_users}</span>
                        </td>
                        <td style={{ padding: '0.875rem 1.5rem' }}>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ffc63a, #f97316)', borderRadius: 4, transition: '0.5s' }}></div>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#999', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={7} className="text-center py-5 text-muted">
                      <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.2 }}></i>
                      <p className="mt-2 small">No state data yet. Users need to have a state in their profile.</p>
                    </td></tr>
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
