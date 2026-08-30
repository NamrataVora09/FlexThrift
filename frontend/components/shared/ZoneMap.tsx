'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import { api } from '@/lib/api';
import type { Zone } from './ZonesView';
import { useToast } from '@/lib/toast';

// ─── Manual Draw Control ─────────────────────────────────────────────────────
// react-leaflet-draw's <EditControl> doesn't clean up on unmount, so React 18
// Strict Mode (which mounts every component twice) adds the toolbar twice.
// This component manually calls map.addControl / map.removeControl so the
// cleanup return in useEffect guarantees only one toolbar is ever on screen.
type DrawControlInnerProps = {
  featureGroupRef: React.MutableRefObject<L.FeatureGroup | null>;
  onCreated: (e: any) => void;
  onEdited: (e: any) => void;
  onDeleted: (e: any) => void;
};

function DrawControlInner({ featureGroupRef, onCreated, onEdited, onDeleted }: DrawControlInnerProps) {
  const map = useMap();

  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!map || !fg) return;

    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      edit: {
        featureGroup: fg,
        selectedPathOptions: { color: '#f59e0b', fillOpacity: 0.5 },
      },
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: '#10b981', fillOpacity: 0.3 },
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);

    // Wrap handlers so we can reliably remove the exact same function reference
    const created = (e: any) => onCreated(e);
    const edited  = (e: any) => onEdited(e);
    const deleted = (e: any) => onDeleted(e);

    map.on((L as any).Draw.Event.CREATED, created);
    map.on((L as any).Draw.Event.EDITED,  edited);
    map.on((L as any).Draw.Event.DELETED, deleted);

    // Cleanup — called by React before re-mount (Strict Mode) and on unmount
    return () => {
      map.removeControl(drawControl);
      map.off((L as any).Draw.Event.CREATED, created);
      map.off((L as any).Draw.Event.EDITED,  edited);
      map.off((L as any).Draw.Event.DELETED, deleted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // run once per map instance

  return null;
}

type ZoneMapProps = {
  zones: Zone[];
  editingZone: Zone | null;
  setEditingZone: (zone: Zone | null) => void;
  onZonesChange: () => void;
};

function ChangeMapBounds({ editingZone }: { editingZone: Zone | null }) {
  const map = useMap();
  useEffect(() => {
    if (editingZone && editingZone.zone_polygon) {
      try {
        const geo = JSON.parse(editingZone.zone_polygon);
        const coordinates = geo?.geometry?.coordinates || geo?.coordinates;
        if (coordinates && coordinates[0]) {
          const latLngs = coordinates[0].map(([lng, lat]: [number, number]) => new L.LatLng(lat, lng));
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (err) {
        console.error("Failed to parse polygon for fitBounds:", err);
      }
    }
  }, [editingZone, map]);

  return null;
}

export default function ZoneMap({ zones, editingZone, setEditingZone, onZonesChange }: ZoneMapProps) {
  const [newZoneName, setNewZoneName] = useState('');
  const [drawnGeoJson, setDrawnGeoJson] = useState<any>(null);
  const { toastSuccess, toastError, toastWarning } = useToast();

  // Refs to prevent stale closures in Leaflet event listeners
  const newZoneNameRef = useRef(newZoneName);
  const editingZoneRef = useRef(editingZone);

  useEffect(() => {
    newZoneNameRef.current = newZoneName;
  }, [newZoneName]);

  useEffect(() => {
    editingZoneRef.current = editingZone;
  }, [editingZone]);

  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Parse existing polygons
  const parsedZones: Array<{ zone: Zone; coords: L.LatLng[][] }> = zones
    .filter((z) => z.zone_polygon)
    .map((z) => {
      try {
        const geo = JSON.parse(z.zone_polygon!);
        const coordinates = geo?.geometry?.coordinates || geo?.coordinates;
        if (!coordinates) {
          return { zone: z, coords: [] };
        }
        const coords: L.LatLng[][] = coordinates.map((ring: any) =>
          ring.map(([lng, lat]: [number, number]) => new L.LatLng(lat, lng))
        );
        return { zone: z, coords };
      } catch (err) {
        console.error("Failed to parse zone polygon:", err);
        return { zone: z, coords: [] };
      }
    })
    .filter((pz) => pz.coords.length > 0);

  const handleSaveClick = async () => {
    if (!newZoneName.trim()) {
      toastError('zone_name_required', 'Enter a zone name first.');
      return;
    }
    if (!drawnGeoJson) {
      toastError('zone_polygon_required', 'Draw a polygon on the map first.');
      return;
    }

    const payload = {
      zone_name: newZoneName,
      zone_polygon: JSON.stringify(drawnGeoJson),
    };

    const res = await api.post('/zones', payload);

    if (res.success) {
      toastSuccess('zone_created', 'Zone created successfully!');
      setNewZoneName('');
      setDrawnGeoJson(null);
      onZonesChange();
      // Clear drawn shape
      featureGroupRef.current?.clearLayers();
    } else {
      toastError('zone_create_failed', res.message || 'Failed to create zone');
    }
  };

  const handleCreated = async (e: any) => {
    const layer = e.layer as L.Polygon;
    const geoJson = layer.toGeoJSON();
    setDrawnGeoJson(geoJson);

    const currentZoneName = newZoneNameRef.current;

    if (!currentZoneName) {
      toastWarning('zone_enter_name_to_save', 'Polygon drawn! Now enter a Zone Name and click "Save Zone" to save.');
      return;
    }

    const payload = {
      zone_name: currentZoneName,
      zone_polygon: JSON.stringify(geoJson),
    };

    const res = await api.post('/zones', payload);

    if (res.success) {
      toastSuccess('zone_created', 'Zone created successfully!');
      setNewZoneName('');
      setDrawnGeoJson(null);
      onZonesChange();
      // Clear drawn shape
      featureGroupRef.current?.clearLayers();
    } else {
      toastError('zone_create_failed', res.message || 'Failed to create zone');
    }
  };

  const handleEditStart = () => {
    // Optional: disable when editing a specific zone only
  };

  const handleEditStop = async (e: any) => {
    const currentEditingZone = editingZoneRef.current;
    if (!currentEditingZone) return;

    const layers = e.layers;
    if (!layers) return;

    let geoJson: any = null;
    layers.eachLayer((layer: any) => {
      if (layer && typeof layer.toGeoJSON === 'function') {
        geoJson = layer.toGeoJSON();
      }
    });

    if (!geoJson) return;

    const payload = {
      zone_name: currentEditingZone.zone_name,
      zone_polygon: JSON.stringify(geoJson),
    };

    const res = await api.put(`/zones/${currentEditingZone.id}`, payload);

    if (res.success) {
      toastSuccess('zone_updated', 'Zone updated successfully!');
      setEditingZone(null);
      onZonesChange();
    } else {
      toastError('zone_update_failed', res.message || 'Failed to update zone');
    }
  };

  const handleDeleted = async (e: any) => {
    setDrawnGeoJson(null);
  };

  const inputStyle: React.CSSProperties = {
    background: '#f8f9fa',
    border: '1px solid #e7eaf3',
    fontSize: '0.875rem',
    padding: '0.55rem 1rem',
    borderRadius: '0.5rem',
    outline: 'none',
    width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#677788',
    marginBottom: '0.35rem',
  };

  return (
    <div>
      {/* Zone fields */}
      <div style={{ padding: '1.25rem 1.5rem', background: '#fafbfc', borderBottom: '1px solid #f1f2f4' }}>
        <div className="row g-3 align-items-end">
          <div className="col-md-8">
            <label style={labelStyle}>Zone Name <span style={{ color: '#ed4c78' }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. Delhi NCR Zone"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="col-md-2">
            <button
              onClick={handleSaveClick}
              disabled={!newZoneName.trim() || !drawnGeoJson}
              className="btn w-100 d-flex align-items-center justify-content-center gap-2"
              style={{
                background: '#ffc63a',
                color: '#212529',
                fontWeight: 600,
                borderRadius: '0.5rem',
                padding: '0.55rem 1rem',
                border: 'none',
                opacity: (!newZoneName.trim() || !drawnGeoJson) ? 0.6 : 1,
                cursor: (!newZoneName.trim() || !drawnGeoJson) ? 'not-allowed' : 'pointer'
              }}
            >
              <i className="bi bi-cloud-arrow-up"></i>
              Save Zone
            </button>
          </div>
          <div className="col-md-2 d-flex align-items-end justify-content-end">
            <div style={{ fontSize: '0.75rem', color: '#677788', lineHeight: 1.4, paddingBottom: '0.6rem' }}>
              <i className="bi bi-info-circle text-warning me-1"></i>Draw on map ↓
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={5}
        style={{ height: '500px', width: '100%' }}
      >
        <ChangeMapBounds editingZone={editingZone} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />

        <FeatureGroup ref={featureGroupRef}>
          {parsedZones.map(({ zone, coords }, idx) => (
            <Polygon
              key={zone.id}
              positions={coords}
              pathOptions={{
                color: editingZone?.id === zone.id ? '#f59e0b' : '#3b82f6',
                fillOpacity: 0.3,
              }}
              eventHandlers={{
                click: () => {
                  setEditingZone(zone);
                  // Enable edit mode for this layer only (simplified)
                  // In production, control edit toolbar more carefully.
                },
              }}
            />
          ))}

          <DrawControlInner
            featureGroupRef={featureGroupRef}
            onCreated={handleCreated}
            onEdited={handleEditStop}
            onDeleted={handleDeleted}
          />
        </FeatureGroup>
      </MapContainer>

      {editingZone && (
        <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,198,58,0.12)', borderTop: '1px solid rgba(255,198,58,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-pencil-square" style={{ color: '#ffc63a', fontSize: '1rem' }}></i>
          <span style={{ fontSize: '0.875rem', color: '#1e2022' }}>
            Editing: <strong>{editingZone.zone_name}</strong> — use the edit tool on the map to adjust the polygon, then click <strong>Save</strong>.
          </span>
        </div>
      )}
    </div>
  );
}