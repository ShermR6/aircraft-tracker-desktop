import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plane, RefreshCw, Loader, Navigation } from 'lucide-react';
import APIService from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon broken paths in webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const STATUS_COLORS = {
  in_airspace: '#38bdf8',
  on_ground: '#34d399',
  outside: '#6b7280',
  approaching: '#f59e0b',
};

const TRAIL_COLORS = [
  '#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f87171', '#818cf8',
];

function nmToMeters(nm) { return nm * 1852; }

export default function LiveMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const trailDataRef = useRef({});
  const ringsRef = useRef([]);
  const airportMarkerRef = useRef(null);
  const intervalRef = useRef(null);

  const [airportConfig, setAirportConfig] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // Load airport config once
  useEffect(() => {
    APIService.getAirportConfig()
      .then(cfg => setAirportConfig(cfg))
      .catch(() => setError('No airport configured. Please set up your location in Airport Config first.'));
  }, []);

  // Init map once config is ready
  useEffect(() => {
    if (!airportConfig || mapRef.current) return;

    const lat = parseFloat(airportConfig.latitude);
    const lng = parseFloat(airportConfig.longitude);

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Airport marker
    const airportIcon = L.divIcon({
      className: '',
      html: `<div style="width:36px;height:36px;background:#0ea5e920;border:2px solid #0ea5e9;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px #0ea5e960;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="3"/></svg>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    airportMarkerRef.current = L.marker([lat, lng], { icon: airportIcon })
      .bindPopup(`<div style="font-size:13px;"><strong style="color:#0ea5e9;">${airportConfig.airport_code || 'Home Base'}</strong><br/><span style="color:#9ca3af;font-size:11px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>`)
      .addTo(map);

    // Distance rings
    const ringDistances = airportConfig.alert_distances_nm || ['2.0', '5.0', '10.0'];
    const ringColors = ['#ef4444', '#f59e0b', '#38bdf8'];
    ringsRef.current = ringDistances.map((dist, i) => {
      const nm = parseFloat(dist);
      return L.circle([lat, lng], {
        radius: nmToMeters(nm),
        color: ringColors[i] || '#6b7280',
        weight: 1,
        opacity: 0.5,
        fillOpacity: 0.03,
        dashArray: '6 4',
      })
        .bindPopup(`<span style="font-size:12px;color:#9ca3af;">${nm} nm ring</span>`)
        .addTo(map);
    });

    setLoading(false);
    fetchAircraft(map);

  }, [airportConfig]);

  const fetchAircraft = useCallback(async (mapInstance) => {
    const map = mapInstance || mapRef.current;
    if (!map) return;

    try {
      const data = await APIService.getLiveAircraft();
      const liveAircraft = (data || []).filter(a => a.latitude && a.longitude && !a.on_ground);
      setAircraft(liveAircraft);
      setLastUpdate(new Date());
      setError(null);

      const seen = new Set();

      liveAircraft.forEach((ac, idx) => {
        const lat = parseFloat(ac.latitude);
        const lng = parseFloat(ac.longitude);
        const color = TRAIL_COLORS[idx % TRAIL_COLORS.length];
        const status = ac.on_ground ? 'on_ground' : ac.is_approaching ? 'approaching' : (ac.status || 'outside');
        const dotColor = STATUS_COLORS[status] || '#6b7280';

        seen.add(ac.tail_number);

        // Update trail data
        if (!trailDataRef.current[ac.tail_number]) trailDataRef.current[ac.tail_number] = [];
        const trail = trailDataRef.current[ac.tail_number];
        const last = trail[trail.length - 1];
        if (!last || last[0] !== lat || last[1] !== lng) {
          trail.push([lat, lng]);
          if (trail.length > 30) trail.shift(); // keep last 30 points
        }

        // Draw/update trail polyline
        if (trailsRef.current[ac.tail_number]) {
          trailsRef.current[ac.tail_number].setLatLngs(trail);
        } else {
          trailsRef.current[ac.tail_number] = L.polyline(trail, {
            color,
            weight: 2,
            opacity: 0.6,
            dashArray: '4 4',
          }).addTo(map);
        }

        // Aircraft icon
        const rotation = ac.heading || 0;
        const iconHtml = `
          <div style="width:28px;height:28px;background:#38bdf820;border:1.5px solid #38bdf8;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);box-shadow:0 0 8px #38bdf840;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#38bdf8" stroke="none">
              <path d="M12 2L8 10H4l4 4-1.5 6L12 17l5.5 3L16 14l4-4h-4L12 2z"/>
            </svg>
          </div>`;

        const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [32, 32], iconAnchor: [16, 16] });

        const popupContent = `
          <div style="font-size:13px;min-width:160px;">
            <div style="font-weight:700;color:${dotColor};font-size:15px;margin-bottom:6px;">${ac.tail_number}</div>
            <div style="color:#9ca3af;font-size:11px;margin-bottom:8px;">${ac.icao24 || ''}</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Status</span><span style="color:#e5e7eb;font-weight:600;">${status.replace('_', ' ')}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Distance</span><span style="color:#e5e7eb;font-weight:600;">${ac.distance_nm?.toFixed(1) || '—'} nm</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Altitude</span><span style="color:#e5e7eb;font-weight:600;">${ac.altitude_ft_msl != null ? Math.round(ac.altitude_ft_msl) + ' ft MSL' : '—'}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Speed</span><span style="color:#e5e7eb;font-weight:600;">${ac.velocity_kts != null ? Math.round(ac.velocity_kts) + ' kts' : '—'}</span></div>
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

      // Remove markers/trails for aircraft no longer in data
      Object.keys(markersRef.current).forEach(tail => {
        if (!seen.has(tail)) {
          map.removeLayer(markersRef.current[tail]);
          delete markersRef.current[tail];
        }
      });
      Object.keys(trailsRef.current).forEach(tail => {
        if (!seen.has(tail)) {
          map.removeLayer(trailsRef.current[tail]);
          delete trailsRef.current[tail];
          delete trailDataRef.current[tail];
        }
      });

    } catch (err) {
      console.error('Failed to fetch live aircraft:', err);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    if (!mapRef.current) return;
    const poll = () => fetchAircraft();
    intervalRef.current = setInterval(poll, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAircraft, airportConfig]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const handleRecenter = () => {
    if (!mapRef.current || !airportConfig) return;
    mapRef.current.setView([parseFloat(airportConfig.latitude), parseFloat(airportConfig.longitude)], 10);
  };

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' }}>Live Map</h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            Real-time aircraft positions · Updates every 5s
            {lastUpdate && <span style={{ marginLeft: '8px', color: '#4b5563' }}>· Last update: {lastUpdate.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRecenter}
            style={{ background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Navigation size={12} /> Recenter
          </button>
          <button
            onClick={() => fetchAircraft()}
            style={{ background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '16px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '12px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Map container */}
      <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid #2d3748', marginBottom: '16px' }}>
        {(loading && !error) && (
          <div style={{ position: 'absolute', inset: 0, background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, gap: '10px', color: '#6b7280', fontSize: '14px' }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading map...
          </div>
        )}
        <div ref={mapContainerRef} style={{ height: 'calc(100vh - 320px)', minHeight: '360px', width: '100%' }} />
      </div>

      {/* Aircraft status list */}
      <div style={{ background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)', border: '1px solid #2d3748', borderRadius: '16px', padding: '20px' }}>
        <p style={{ fontSize: '14px', fontWeight: '600', color: '#f9fafb', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plane size={14} color="#9ca3af" />
          Aircraft in Range
          <span style={{ fontSize: '11px', fontWeight: '400', color: '#4b5563', marginLeft: '4px' }}>
            ({aircraft.length} detected)
          </span>
        </p>

        {aircraft.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: '13px', margin: 0 }}>No aircraft with position data right now. Start the tracker to see live data.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {aircraft.map((ac, idx) => {
              return (
                <div
                  key={ac.tail_number}
                  onClick={() => {
                    if (mapRef.current && ac.latitude && ac.longitude) {
                      mapRef.current.setView([parseFloat(ac.latitude), parseFloat(ac.longitude)], 13);
                      markersRef.current[ac.tail_number]?.openPopup();
                    }
                  }}
                  style={{ background: '#111827', border: '1px solid #38bdf830', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#38bdf860'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#38bdf830'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>{ac.tail_number}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{ac.distance_nm?.toFixed(1) || '—'} nm away</span>
                    <span>{ac.on_ground ? 'On Ground' : ac.altitude_ft_msl != null ? Math.round(ac.altitude_ft_msl) + ' ft MSL' : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
        .leaflet-container { background: #0d1117 !important; }
        .leaflet-tile { }
        .leaflet-control-zoom a { background: #1e2538 !important; color: #9ca3af !important; border-color: #2d3748 !important; }
        .leaflet-control-zoom a:hover { background: #2d3748 !important; color: #f9fafb !important; }
        .leaflet-control-attribution { background: rgba(13,17,23,0.8) !important; color: #4b5563 !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: #6b7280 !important; }
        .leaflet-popup-content-wrapper { background: #1e2538 !important; border: 1px solid #2d3748 !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; color: #f9fafb !important; }
        .leaflet-popup-tip { background: #1e2538 !important; }
        .leaflet-popup-content { margin: 14px 16px !important; }
      `}</style>
    </div>
  );
}
