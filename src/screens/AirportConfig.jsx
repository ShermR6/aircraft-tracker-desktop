import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader, Check, Trash2 } from 'lucide-react';
import APIService from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import airportsData from '../data/airports.json';

// Fix Leaflet marker icon broken paths in webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow,
});

// airports.json format: [icao, name, city, region, country, lat, lon, elev_ft, iata, [[le_ident, le_hdg, he_ident, he_hdg, length_ft], ...]]
function searchAirports(query) {
  if (!query || query.length < 2) return [];
  const q = query.toUpperCase().trim();
  const results = [];
  for (let i = 0; i < airportsData.length && results.length < 8; i++) {
    if (airportsData[i][0].startsWith(q)) results.push(airportsData[i]);
  }
  return results.map(a => ({
    icao: a[0], name: a[1], city: a[2], region: a[3], country: a[4],
    lat: a[5], lon: a[6], elev: a[7], iata: a[8],
    runways: (a[9] || []).map(rw => ({
      leIdent: rw[0], leHdg: rw[1], heIdent: rw[2], heHdg: rw[3], lengthFt: rw[4],
      ident: `${rw[0]}/${rw[2]}`,
    })),
  }));
}

const NM_TO_M = 1852;
const DIST_LABELS = { 10: 'Inbound', 5: 'Approach', 2: 'Final' };

function buildRingDefs(distances) {
  return [...distances].sort((a, b) => b - a).map(nm => ({
    nm,
    label: `${nm} nm`,
    sublabel: DIST_LABELS[nm] || 'Custom',
    color: '#38bdf8',
  }));
}

const s = {
  page: { display: 'grid', gridTemplateColumns: '1fr 420px', gap: '0', height: '100%', maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' },
  left: { overflowY: 'auto', padding: '0 24px 24px 0', display: 'flex', flexDirection: 'column', gap: '0' },
  right: { background: '#0d1117', borderLeft: '1px solid #1e2a3a', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '0 14px 14px 0' },
  mapLabel: { padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #1e2a3a', flexShrink: 0 },
  mapContainer: { flex: 1, position: 'relative' },
  section: { marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', display: 'block' },
  input: { width: '100%', padding: '11px 14px', background: '#0d1117', border: '2px solid #1e2a3a', borderRadius: '8px', color: '#f9fafb', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#131b27', border: '1px solid #1e2a3a', borderRadius: '8px', marginTop: '4px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  dropdownItem: { display: 'flex', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', gap: '12px', borderBottom: '1px solid #1a2030', transition: 'background 0.1s' },
  iataBadge: (iata) => ({ minWidth: '36px', height: '36px', background: iata ? '#1e3a5f' : '#1a2030', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: iata ? '#60a5fa' : '#4b5563', flexShrink: 0 }),
  airportCard: { background: '#131b27', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' },
  airportCardBadge: { width: '44px', height: '44px', background: '#1e3a5f', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#60a5fa', flexShrink: 0 },
  airportCardInfo: { flex: 1, minWidth: 0 },
  airportName: { fontSize: '15px', fontWeight: '700', color: '#f9fafb', marginBottom: '3px' },
  airportMeta: { fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  ringsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  ringBtn: (active) => ({
    flex: 1, minWidth: '90px', padding: '14px 10px', borderRadius: '10px', border: `2px solid ${active ? '#38bdf8' : '#1e2a3a'}`,
    background: active ? 'rgba(56,189,248,0.12)' : '#0d1117',
    color: active ? '#38bdf8' : '#4b5563', cursor: 'pointer', textAlign: 'center',
    transition: 'all 0.15s', outline: 'none',
  }),
  ringBtnNm: { fontSize: '20px', fontWeight: '800', lineHeight: 1.1 },
  ringBtnSub: { fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em', marginTop: '3px' },
  toggleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
  toggleSwitch: (on) => ({ width: '44px', height: '24px', borderRadius: '12px', background: on ? '#38bdf8' : '#1e2a3a', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s', marginTop: '2px' }),
  toggleKnob: (on) => ({ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }),
  runwayPicker: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
  runwayBtn: (active) => ({ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${active ? '#38bdf8' : '#1e2a3a'}`, background: active ? 'rgba(56,189,248,0.1)' : 'transparent', color: active ? '#38bdf8' : '#6b7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }),
  saveBtn: (saving) => ({ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: saving ? '#374151' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }),
  deleteBtn: { width: '100%', padding: '11px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' },
  toast: (type) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', background: type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`, color: type === 'success' ? '#6ee7b7' : '#fca5a5', marginTop: '16px' }),
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
  hdr: { marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #1a2030' },
  hdrMini: { fontSize: '11px', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' },
  hdrTitle: { fontSize: '26px', fontWeight: '800', color: '#f9fafb', margin: '0 0 4px 0' },
  hdrSub: { fontSize: '13px', color: '#6b7280', margin: 0 },
};

function formatDMS(deg, posLetter, negLetter) {
  const letter = deg >= 0 ? posLetter : negLetter;
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const min = (abs - d) * 60;
  return `${abs.toFixed(4)}° ${letter}`;
}

export default function AirportConfig({ isViewOnly = false }) {
  const [config, setConfig] = useState({
    airport_code: '', airport_name: '', latitude: '', longitude: '',
    elevation_ft_msl: 0, detection_radius_nm: 100, polling_interval_seconds: 10,
    alert_distances_nm: [10, 5, 2],
    runway_info: [], approach_corridor_enabled: false, approach_runway_heading: null,
    quiet_hours_enabled: false, quiet_hours_start: '23:00', quiet_hours_end: '06:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [activeRings, setActiveRings] = useState(new Set([10, 5, 2]));
  const [approachRunway, setApproachRunway] = useState(null); // {leIdent, leHdg, heIdent, heHdg, end: 'le'|'he'}

  // Map refs
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const ringsRef = useRef([]);
  const corridorRef = useRef(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { loadConfig(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadConfig = async () => {
    try {
      const data = await APIService.getAirportConfig();
      if (data) {
        setConfig(data);
        // Restore active rings from saved alert_distances_nm
        if (data.alert_distances_nm?.length) {
          setActiveRings(new Set(data.alert_distances_nm.map(Number)));
        }
        // Restore selected airport from saved airport_code
        if (data.airport_code) {
          const match = searchAirports(data.airport_code).find(a => a.icao === data.airport_code);
          if (match) {
            setSelectedAirport(match);
            setSearchQuery(data.airport_code);
            // Restore approach runway
            if (data.approach_runway_heading != null && match.runways.length) {
              for (const rw of match.runways) {
                if (Math.abs(rw.leHdg - data.approach_runway_heading) < 5) {
                  setApproachRunway({ ...rw, end: 'le' }); break;
                }
                if (Math.abs(rw.heHdg - data.approach_runway_heading) < 5) {
                  setApproachRunway({ ...rw, end: 'he' }); break;
                }
              }
            }
          }
        }
      }
    } catch {
      // No existing config
    } finally {
      setLoading(false);
    }
  };

  // Init map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [39.5, -98.35],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Update map when airport or rings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    ringsRef.current.forEach(l => l.remove());
    ringsRef.current = [];
    if (corridorRef.current) { corridorRef.current.remove(); corridorRef.current = null; }

    if (!selectedAirport) return;

    const { lat, lon } = selectedAirport;
    map.setView([lat, lon], 11);

    // Airport marker
    const airportIcon = L.divIcon({
      html: `<div style="width:10px;height:10px;background:#38bdf8;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #38bdf8"></div>`,
      className: '',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
    markerRef.current = L.marker([lat, lon], { icon: airportIcon }).addTo(map);

    // Draw rings for all active distances
    const allDistances = Array.from(activeRings).sort((a, b) => b - a);
    const ringDefs = allDistances.map(nm => ({
      nm,
      color: '#38bdf8',
      dash: '',
      weight: 2,
      opacity: 0.8,
    }));

    for (const rd of ringDefs) {
      const circle = L.circle([lat, lon], {
        radius: rd.nm * NM_TO_M,
        color: rd.color,
        weight: rd.weight,
        opacity: rd.opacity,
        fill: false,
        dashArray: rd.dash,
      }).addTo(map);

      // Ring label — track it so it gets removed on next render
      const offset = L.latLng(lat + (rd.nm * NM_TO_M) / 111320, lon);
      const label = L.marker(offset, {
        icon: L.divIcon({
          html: `<div style="font-size:10px;font-weight:700;color:${rd.color};opacity:${rd.opacity};white-space:nowrap;background:rgba(13,17,23,0.7);padding:1px 4px;border-radius:3px">${rd.nm} nm</div>`,
          className: '',
          iconAnchor: [16, 8],
        }),
        interactive: false,
      }).addTo(map);

      ringsRef.current.push(circle, label);
    }

    // Draw approach corridor overlay
    if (config.approach_corridor_enabled && approachRunway) {
      const hdg = approachRunway.end === 'he' ? approachRunway.heHdg : approachRunway.leHdg;
      // Draw a narrow wedge/line showing approach direction
      const R = 12 * NM_TO_M; // 12nm line
      const toRad = (deg) => (deg * Math.PI) / 180;
      // Approach FROM the opposite direction
      const approachHdg = (hdg + 180) % 360;
      const endLat = lat + (R / 111320) * Math.cos(toRad(approachHdg));
      const endLon = lon + (R / (111320 * Math.cos(toRad(lat)))) * Math.sin(toRad(approachHdg));
      corridorRef.current = L.polyline([[lat, lon], [endLat, endLon]], {
        color: '#f59e0b',
        weight: 2,
        opacity: 0.7,
        dashArray: '8, 4',
      }).addTo(map);
    }
  }, [selectedAirport, activeRings, config.approach_corridor_enabled, approachRunway]);

  const handleSearch = (val) => {
    setSearchQuery(val);
    if (val.length >= 2) {
      setSuggestions(searchAirports(val));
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const selectAirport = (airport) => {
    setSelectedAirport(airport);
    setSearchQuery(airport.icao);
    setShowDropdown(false);
    setSuggestions([]);
    setApproachRunway(null);
    setConfig(prev => ({
      ...prev,
      airport_code: airport.icao,
      airport_name: airport.name,
      latitude: airport.lat,
      longitude: airport.lon,
      elevation_ft_msl: airport.elev,
      runway_info: airport.runways,
      approach_corridor_enabled: false,
      approach_runway_heading: null,
    }));
  };

  const toggleRing = (nm) => {
    setActiveRings(prev => {
      const next = new Set(prev);
      next.has(nm) ? next.delete(nm) : next.add(nm);
      return next;
    });
  };

  const toggleApproachCorridor = () => {
    setConfig(prev => ({ ...prev, approach_corridor_enabled: !prev.approach_corridor_enabled }));
  };

  const selectApproachEnd = (rw, end) => {
    const hdg = end === 'he' ? rw.heHdg : rw.leHdg;
    setApproachRunway({ ...rw, end });
    setConfig(prev => ({ ...prev, approach_runway_heading: hdg }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedAirport && !config.airport_code) {
      setMessage({ type: 'error', text: 'Please search for and select an airport first.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...config,
        alert_distances_nm: Array.from(activeRings).sort((a, b) => b - a),
        approach_runway_heading: approachRunway
          ? (approachRunway.end === 'he' ? approachRunway.heHdg : approachRunway.leHdg)
          : null,
      };
      await APIService.updateAirportConfig(payload);
      const ringsText = Array.from(activeRings).sort((a,b)=>b-a).map(n=>`${n}nm`).join(', ');
      const corridorText = config.approach_corridor_enabled && approachRunway
        ? ` · approach corridor enabled`
        : '';
      setMessage({
        type: 'success',
        text: `${config.airport_code} configured · ${ringsText}${corridorText}`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    setMessage({ type: '', text: '' });
    try {
      await APIService.deleteAirportConfig();
      // Reset everything to a clean state
      setSelectedAirport(null);
      setSearchQuery('');
      setActiveRings(new Set([10, 5, 2]));
      setApproachRunway(null);
      setConfig({
        airport_code: '', airport_name: '', latitude: '', longitude: '',
        elevation_ft_msl: 0, detection_radius_nm: 100, polling_interval_seconds: 10,
        alert_distances_nm: [10, 5, 2],
        runway_info: [], approach_corridor_enabled: false, approach_runway_heading: null,
        quiet_hours_enabled: false, quiet_hours_start: '23:00', quiet_hours_end: '06:00',
      });
      setMessage({ type: 'success', text: 'Airport configuration deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete configuration' });
    } finally {
      setDeleting(false);
    }
  };

  // Runway endpoint options for approach corridor
  const runwayEndOptions = [];
  if (selectedAirport) {
    for (const rw of selectedAirport.runways) {
      if (rw.leIdent) runwayEndOptions.push({ rw, end: 'le', ident: rw.leIdent, hdg: rw.leHdg });
      if (rw.heIdent) runwayEndOptions.push({ rw, end: 'he', ident: rw.heIdent, hdg: rw.heHdg });
    }
  }

  const metaLine = selectedAirport
    ? `${formatDMS(selectedAirport.lat, 'N', 'S')} · ${formatDMS(selectedAirport.lon, 'E', 'W')} · Elev ${selectedAirport.elev} ft` +
      (selectedAirport.runways.length ? ` · ${selectedAirport.runways.map(r => `Runway ${r.ident} (${r.lengthFt.toLocaleString()} ft)`).join(', ')}` : '')
    : '';

  if (loading) {
    return <div style={s.loading}><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...</div>;
  }

  return (
    <div style={s.page}>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f1117', border: '1px solid #2d3748', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', margin: '0 0 8px 0', textAlign: 'center' }}>Delete Airport Config</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', margin: '0 0 24px 0' }}>Remove <strong style={{ color: '#f9fafb' }}>{config.airport_code}</strong> and all its detection settings?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid #374151', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Left panel ─── */}
      <div style={s.left}>
        <div style={s.hdr}>
          <p style={s.hdrMini}>Airport Config</p>
          <h2 style={s.hdrTitle}>Add destination</h2>
          <p style={s.hdrSub}>Tell FinalPing where this aircraft is heading.</p>
        </div>

        {/* ICAO Search */}
        <div style={{ ...s.section, position: 'relative' }}>
          <label style={s.label}>ICAO Airport Code</label>
          <div ref={searchRef} style={{ position: 'relative' }}>
            <input
              style={{
                ...s.input,
                borderColor: showDropdown ? '#38bdf8' : '#1e2a3a',
                textTransform: 'uppercase',
              }}
              type="text"
              value={searchQuery}
              placeholder="e.g. KPAO"
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
              maxLength={6}
              disabled={isViewOnly}
            />
            {showDropdown && suggestions.length > 0 && (
              <div ref={dropdownRef} style={s.dropdown}>
                {suggestions.map(ap => (
                  <div
                    key={ap.icao}
                    style={s.dropdownItem}
                    onMouseDown={() => selectAirport(ap)}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a2a40'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={s.iataBadge(ap.iata)}>{ap.iata || ap.icao.slice(1, 4)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#f9fafb' }}>
                        <span style={{ color: '#38bdf8' }}>{ap.icao}</span>
                        <span style={{ color: '#4b5563', fontWeight: 400 }}> · {ap.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                        {[ap.city, ap.region, ap.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected airport card */}
        {selectedAirport && (
          <div style={{ ...s.section }}>
            <div style={s.airportCard}>
              <div style={s.airportCardBadge}>{selectedAirport.iata || selectedAirport.icao.slice(1, 4)}</div>
              <div style={s.airportCardInfo}>
                <div style={s.airportName}>{selectedAirport.name}</div>
                <div style={s.airportMeta}>{metaLine}</div>
              </div>
            </div>
          </div>
        )}

        {/* Detection Rings */}
        <div style={s.section}>
          <label style={s.label}>Detection Ring</label>
          <div style={s.ringsRow}>
            {buildRingDefs(activeRings).map(({ nm, label, sublabel }) => (
              <button
                key={nm}
                type="button"
                style={s.ringBtn(true)}
                onClick={() => !isViewOnly && toggleRing(nm)}
              >
                <div style={s.ringBtnNm}>{label}</div>
                <div style={s.ringBtnSub}>{sublabel}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Approach Corridor */}
        <div style={s.section}>
          <div style={s.toggleRow}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e5e7eb' }}>Restrict to approach corridor</div>
              {config.approach_corridor_enabled && approachRunway && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>
                  Only fire when aircraft is aligned with runway {approachRunway.end === 'he' ? approachRunway.heIdent : approachRunway.leIdent}
                </div>
              )}
              {config.approach_corridor_enabled && !approachRunway && (
                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '3px' }}>
                  Select a runway end below
                </div>
              )}
            </div>
            <div
              style={s.toggleSwitch(config.approach_corridor_enabled)}
              onClick={() => !isViewOnly && toggleApproachCorridor()}
            >
              <div style={s.toggleKnob(config.approach_corridor_enabled)} />
            </div>
          </div>

          {config.approach_corridor_enabled && runwayEndOptions.length > 0 && (
            <div style={s.runwayPicker}>
              {runwayEndOptions.map(({ rw, end, ident, hdg }) => {
                const isActive = approachRunway && approachRunway.rw === rw && approachRunway.end === end;
                return (
                  <button
                    key={`${rw.ident}-${end}`}
                    type="button"
                    style={s.runwayBtn(isActive)}
                    onClick={() => !isViewOnly && selectApproachEnd(rw, end)}
                  >
                    RWY {ident} <span style={{ opacity: 0.6, marginLeft: 4 }}>{hdg}°</span>
                  </button>
                );
              })}
            </div>
          )}

          {config.approach_corridor_enabled && !selectedAirport && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Select an airport above to choose a runway.
            </div>
          )}
        </div>

        {/* Save / Delete */}
        {!isViewOnly && (
          <div style={s.section}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={s.saveBtn(saving)}
            >
              {saving
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</>
                : 'Save airport'}
            </button>
            {config.airport_code && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                style={s.deleteBtn}
              >
                {deleting
                  ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />Deleting...</>
                  : <><Trash2 size={14} />Delete airport</>}
              </button>
            )}
          </div>
        )}

        {/* Toast */}
        {message.text && (
          <div style={s.toast(message.type)}>
            {message.type === 'success' && <Check size={15} />}
            {message.text}
          </div>
        )}
      </div>

      {/* ─── Right panel — Map ─── */}
      <div style={s.right}>
        <div style={s.mapLabel}>Map Preview</div>
        <div style={s.mapContainer}>
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
          {!selectedAirport && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ textAlign: 'center', color: '#374151' }}>
                <MapPin size={32} strokeWidth={1} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px' }}>Search for an airport</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .leaflet-container { background: #0d1117; }
        .leaflet-control-zoom { border-color: #1e2a3a !important; }
        .leaflet-control-zoom a { background: #131b27 !important; color: #9ca3af !important; border-color: #1e2a3a !important; }
        .leaflet-control-zoom a:hover { background: #1a2a3f !important; }
      `}</style>
    </div>
  );
}
