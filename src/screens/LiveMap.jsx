import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plane, RefreshCw, Loader, Navigation } from 'lucide-react';
import APIService from '../services/api';
import { backgroundTracker } from '../services/backgroundTracker';
import { PageHead, Stamp, Panel, PanelHead, Count, Button, Notice, Empty } from '../ui/kit';
import { getColor, ensureLoaded } from '../services/aircraftColors';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

function nmToMeters(nm) { return nm * 1852; }

// Returns icon color and opacity based on how old the last ADS-B update is
function freshnessStyle(lastSeenMs) {
  const ageS = (Date.now() - lastSeenMs) / 1000;
  if (ageS < 45) return { color: 'var(--accent)', opacity: 1 };
  if (ageS < 90) return { color: 'var(--warn)', opacity: 0.85 };
  return { color: 'var(--bad)', opacity: 0.65 };
}

function ageLabel(lastSeenMs) {
  const s = Math.round((Date.now() - lastSeenMs) / 1000);
  if (s < 5) return 'live';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export default function LiveMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const trailDataRef = useRef(backgroundTracker.getTrailData());
  const posTrackerRef = useRef(backgroundTracker.getPosTracker());
  const ringsRef = useRef([]);
  const airportMarkerRef = useRef(null);
  const rangePolygonRef = useRef(null);

  const [airportConfig, setAirportConfig] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    ensureLoaded();
    APIService.getAirportConfig()
      .then(cfg => setAirportConfig(cfg))
      .catch(() => setError('No airport configured. Please set up your location in Airport Config first.'));
  }, []);

  useEffect(() => {
    if (!airportConfig || mapRef.current) return;

    const lat = parseFloat(airportConfig.latitude);
    const lng = parseFloat(airportConfig.longitude);

    const map = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 10, zoomControl: true });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const airportIcon = L.divIcon({
      className: '',
      html: `<div style="width:36px;height:36px;background:var(--accent-soft);border:2px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px #0ea5e960;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="3"/></svg>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    airportMarkerRef.current = L.marker([lat, lng], { icon: airportIcon })
      .bindPopup(`<div style="font-size:13px;"><strong style="color:var(--accent);">${airportConfig.airport_code || 'Home Base'}</strong><br/><span style="color:var(--muted);font-size:11px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>`)
      .addTo(map);

    const ringDistances = [...(airportConfig.alert_distances_nm || ['2.0', '5.0', '10.0'])]
      .sort((a, b) => parseFloat(b) - parseFloat(a)); // largest first so smallest rings sit on top
    // Leaflet circle strokes are SVG presentation attributes — var() does not
    // resolve there, so these stay literal. They mirror --bad / --warn / --accent.
    const ringColors = ['#ef4444', '#f59e0b', '#38bdf8'];
    ringsRef.current = ringDistances.map((dist, i) => {
      const nm = parseFloat(dist);
      const colorIndex = ringDistances.length - 1 - i; // color by size: smallest = red
      return L.circle([lat, lng], {
        radius: nmToMeters(nm), color: ringColors[colorIndex] || '#6b7280',
        weight: 1, opacity: 0.5, fillOpacity: 0.03, dashArray: '6 4',
      }).bindPopup(`<span style="font-size:12px;color:var(--muted);">${nm} nm alert ring</span>`).addTo(map);
    });

    setLoading(false);
    fetchAircraft(map, backgroundTracker.getData());
    fetchRangePolygon(map, lat, lng);

    // Refresh range polygon every 10 minutes
    const rangeInterval = setInterval(() => fetchRangePolygon(mapRef.current, lat, lng), 600000);
    return () => clearInterval(rangeInterval);
  }, [airportConfig]);

  const fetchRangePolygon = useCallback(async (map, centerLat, centerLng) => {
    if (!map) return;
    try {
      const data = await APIService.getGroundStationRange();
      if (!data?.range_nm) return;

      const rangeNm = data.range_nm;
      const nonZeroCount = rangeNm.filter(v => v > 0).length;
      const maxRange = Math.max(...rangeNm);

      // Need at least a few real readings before drawing
      if (nonZeroCount < 3 || maxRange < 3) return;

      // Interpolate empty buckets from nearest non-zero neighbors
      const smoothed = [...rangeNm];
      for (let i = 0; i < smoothed.length; i++) {
        if (smoothed[i] > 0) continue;
        let left = null, right = null;
        for (let d = 1; d < smoothed.length; d++) {
          const li = (i - d + smoothed.length) % smoothed.length;
          const ri = (i + d) % smoothed.length;
          if (left === null && smoothed[li] > 0) left = { val: smoothed[li], dist: d };
          if (right === null && smoothed[ri] > 0) right = { val: smoothed[ri], dist: d };
          if (left && right) break;
        }
        if (left && right) {
          const total = left.dist + right.dist;
          smoothed[i] = (left.val * right.dist + right.val * left.dist) / total;
        } else if (left) {
          smoothed[i] = left.val;
        } else if (right) {
          smoothed[i] = right.val;
        }
      }

      // Convert polar (bearing, distance) to lat/lng points
      const R = 3440.065;
      const points = smoothed.map((distNm, i) => {
        const brng = (i * 10) * Math.PI / 180;
        const d = distNm / R;
        const lat1 = centerLat * Math.PI / 180;
        const lon1 = centerLng * Math.PI / 180;
        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
        const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
        return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
      });

      if (rangePolygonRef.current) rangePolygonRef.current.remove();

      rangePolygonRef.current = L.polygon(points, {
        color: 'var(--accent)', weight: 1.5, opacity: 0.5,
        fillColor: 'var(--accent)', fillOpacity: 0.04, dashArray: '8 5',
      }).bindPopup(
        `<span style="font-size:12px;color:var(--accent);">SDR reception range — max ${maxRange.toFixed(0)} nm</span><br/>` +
        `<span style="color:var(--faint);font-size:10px;">Best range achieved per direction · expands as aircraft are received · not a live coverage indicator</span>`
      ).addTo(map);
    } catch {
      // No ground station or no data yet — silently skip
    }
  }, []);

  const fetchAircraft = useCallback((mapInstance, data) => {
    const map = mapInstance || mapRef.current;
    if (!map) return;

    try {
      const now = Date.now();

      // Filter: must have position. On-ground aircraft shown if from ground station.
      const candidates = (data || []).filter(a => a.latitude && a.longitude);

      const liveAircraft = candidates.filter(ac => {
        const fromGS = ac.source === 'ground_station';

        // Ground station aircraft: show always (on ground or airborne) — GS data is live
        if (fromGS) return true;

        // Cloud aircraft on ground: hide (cloud can't reliably track ground position)
        if (ac.on_ground) return false;

        const tail = ac.tail_number;
        const lat = parseFloat(ac.latitude);
        const lng = parseFloat(ac.longitude);

        // Staleness: cloud data > 90s old (accounts for 30s polling interval)
        if (ac.last_seen) {
          const ageS = (now - new Date(ac.last_seen).getTime()) / 1000;
          if (ageS > 90) return false;
        }

        const prev = posTrackerRef.current[tail];
        if (!prev || prev.lat !== lat || prev.lng !== lng) {
          posTrackerRef.current[tail] = { lat, lng, changedAt: now };
        } else {
          const frozenS = (now - prev.changedAt) / 1000;
          const alt = ac.altitude_ft_msl != null ? parseFloat(ac.altitude_ft_msl) : 99999;
          const dist = ac.distance_nm != null ? parseFloat(ac.distance_nm) : 99;
          if (frozenS > 75 && dist < 5 && alt < 3000) return false;
          if (frozenS > 120 && alt < 1500) return false;
        }

        return true;
      });

      setAircraft(liveAircraft);
      setError(null);

      const seen = new Set();

      liveAircraft.forEach((ac) => {
        const lat = parseFloat(ac.latitude);
        const lng = parseFloat(ac.longitude);
        const color = getColor(ac.tail_number);
        const lastSeenMs = ac.last_seen ? new Date(ac.last_seen).getTime() : now;
        const fresh = freshnessStyle(lastSeenMs);

        seen.add(ac.tail_number);

        // Trail — read from background tracker (accumulates full flight history)
        const trail = trailDataRef.current[ac.tail_number] || [];

        if (trailsRef.current[ac.tail_number]) {
          trailsRef.current[ac.tail_number].setLatLngs(trail).setStyle({ color });
        } else {
          trailsRef.current[ac.tail_number] = L.polyline(trail, {
            color, weight: 2, opacity: 0.6, dashArray: '4 4',
          }).addTo(map);
        }

        // Icon — different for airborne vs on-ground (GS only)
        const rotation = ac.heading || 0;
        const c = color;
        const iconHtml = ac.on_ground
          ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-size:9px;font-weight:700;color:${c};white-space:nowrap;background:rgba(0,0,0,0.65);padding:1px 5px;border-radius:4px;letter-spacing:0.04em;opacity:${fresh.opacity};">${ac.tail_number}</div>
              <div style="width:28px;height:28px;background:${c}20;border:1.5px solid ${c};border-radius:6px;display:flex;align-items:center;justify-content:center;opacity:${fresh.opacity};box-shadow:0 0 8px ${c}40;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${c}" stroke="none">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
            </div>`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-size:9px;font-weight:700;color:${c};white-space:nowrap;background:rgba(0,0,0,0.65);padding:1px 5px;border-radius:4px;letter-spacing:0.04em;opacity:${fresh.opacity};">${ac.tail_number}</div>
              <div style="width:28px;height:28px;background:${c}20;border:1.5px solid ${c};border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:${fresh.opacity};transform:rotate(${rotation}deg);box-shadow:0 0 8px ${c}40;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${c}" stroke="none">
                  <path d="M12 2L8 10H4l4 4-1.5 6L12 17l5.5 3L16 14l4-4h-4L12 2z"/>
                </svg>
              </div>
            </div>`;
        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [70, 44], iconAnchor: [35, 30] });

        const status = ac.is_approaching ? 'approaching' : (ac.status || 'outside');
        const popupContent = `
          <div style="font-size:13px;min-width:170px;">
            <div style="font-weight:700;color:${c};font-size:15px;margin-bottom:6px;">${ac.tail_number}</div>
            <div style="color:var(--muted);font-size:11px;margin-bottom:8px;">${ac.icao24 || ''}</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Status</span><span style="color:var(--text);font-weight:600;">${status.replace('_', ' ')}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Distance</span><span style="color:var(--text);font-weight:600;">${ac.distance_nm?.toFixed(1) ?? '—'} nm</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Altitude</span><span style="color:var(--text);font-weight:600;">${ac.altitude_ft_msl != null ? Math.round(ac.altitude_ft_msl) + ' ft MSL' : '—'}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Speed</span><span style="color:var(--text);font-weight:600;">${ac.velocity_kts != null ? Math.round(ac.velocity_kts) + ' kts' : '—'}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Heading</span><span style="color:var(--text);font-weight:600;">${ac.heading != null ? Math.round(ac.heading) + '°' : '—'}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--faint);">Data age</span><span style="color:${c};font-weight:600;">${ageLabel(lastSeenMs)}</span></div>
            </div>
          </div>`;

        if (markersRef.current[ac.tail_number]) {
          markersRef.current[ac.tail_number].setLatLng([lat, lng]).setIcon(icon);
          markersRef.current[ac.tail_number].getPopup()?.setContent(popupContent);
        } else {
          markersRef.current[ac.tail_number] = L.marker([lat, lng], { icon })
            .bindPopup(popupContent)
            .addTo(map);
        }
      });

      // Remove aircraft that are no longer live
      const cleanup = (ref, extra) => {
        Object.keys(ref).forEach(tail => {
          if (!seen.has(tail)) { map.removeLayer(ref[tail]); delete ref[tail]; if (extra) delete extra[tail]; }
        });
      };
      cleanup(markersRef.current);
      cleanup(trailsRef.current, trailDataRef.current);
      Object.keys(posTrackerRef.current).forEach(tail => {
        if (!seen.has(tail)) delete posTrackerRef.current[tail];
      });

    } catch (err) {
      console.error('LiveMap render error:', err);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    // Subscribe to background tracker — map updates whenever new data arrives
    const unsub = backgroundTracker.subscribe(data => {
      setLastUpdate(new Date());
      fetchAircraft(mapRef.current, data);
    });
    return unsub;
  }, [fetchAircraft, airportConfig]);

  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const handleRecenter = () => {
    if (!mapRef.current || !airportConfig) return;
    mapRef.current.setView([parseFloat(airportConfig.latitude), parseFloat(airportConfig.longitude)], 10);
  };

  return (
    <div style={{
      padding: '24px 28px 32px', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', height: '100%',
      boxSizing: 'border-box', overflowY: 'auto',
    }}>
      <PageHead
        title="Live Map"
        subtitle="Real-time aircraft positions, updated every 30 seconds"
        right={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastUpdate && <Stamp>Updated {lastUpdate.toLocaleTimeString()}</Stamp>}
            <Button variant="ghost" onClick={handleRecenter}
              style={{ padding: '5px 11px', fontSize: 12 }} icon={<Navigation size={13} />}>
              Recenter
            </Button>
            <Button variant="ghost"
              onClick={() => fetchAircraft(mapRef.current, backgroundTracker.getData())}
              style={{ padding: '5px 11px', fontSize: 12 }} icon={<RefreshCw size={13} />}>
              Refresh
            </Button>
          </span>
        }
      />

      {error && <Notice t="bad">{error}</Notice>}

      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
        {(loading && !error) && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, gap: '10px', color: 'var(--faint)', fontSize: '14px' }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading map...
          </div>
        )}
        <div ref={mapContainerRef} style={{ height: 'calc(100vh - 330px)', minHeight: 340, width: '100%' }} />
      </div>

      <Panel>
        <PanelHead title="Aircraft in range" right={<Count>{aircraft.length} detected</Count>} />
        <div style={{ padding: 17 }}>

        {aircraft.length === 0 ? (
          <p style={{ color: 'var(--faint)', fontSize: '13px', margin: 0 }}>No aircraft with position data right now. Start the tracker to see live data.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {aircraft.map((ac) => {
              const lastSeenMs = ac.last_seen ? new Date(ac.last_seen).getTime() : Date.now();
              const fresh = freshnessStyle(lastSeenMs);
              return (
                <div
                  key={ac.tail_number}
                  onClick={() => {
                    if (mapRef.current && ac.latitude && ac.longitude) {
                      mapRef.current.setView([parseFloat(ac.latitude), parseFloat(ac.longitude)], 13);
                      markersRef.current[ac.tail_number]?.openPopup();
                    }
                  }}
                  style={{ background: 'var(--panel)', border: `1px solid ${fresh.color}30`, borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${fresh.color}60`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${fresh.color}30`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: fresh.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{ac.tail_number}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: fresh.color }}>{ageLabel(lastSeenMs)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--faint)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{ac.distance_nm?.toFixed(1) ?? '—'} nm · {ac.altitude_ft_msl != null ? Math.round(ac.altitude_ft_msl) + ' ft' : '—'}</span>
                    <span>{ac.velocity_kts != null ? Math.round(ac.velocity_kts) + ' kts' : '—'}{ac.heading != null ? ` · ${Math.round(ac.heading)}°` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </Panel>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .leaflet-container { background: var(--panel) !important; }
        .leaflet-control-zoom a { background: var(--panel-2) !important; color: var(--muted) !important; border-color: var(--border) !important; }
        .leaflet-control-zoom a:hover { background: var(--panel-2) !important; color: var(--text) !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.55) !important; color: var(--faint) !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: var(--faint) !important; }
        .leaflet-popup-content-wrapper { background: var(--panel) !important; border: 1px solid var(--border) !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; color: var(--text) !important; }
        .leaflet-popup-tip { background: var(--panel) !important; }
        .leaflet-popup-content { margin: 14px 16px !important; }
      `}</style>
    </div>
  );
}
