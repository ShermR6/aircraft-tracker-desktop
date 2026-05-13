import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader, Check, Trash2, Edit2, X, Plus } from 'lucide-react';
import APIService from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import airportsData from '../data/airports.json';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// airports.json: [icao, name, city, region, country, lat, lon, elev_ft, iata,
//   [[le_ident, le_hdg, he_ident, he_hdg, length_ft, le_lat, le_lon, he_lat, he_lon], ...]]
function toAirport(a) {
  return {
    icao: a[0], name: a[1], city: a[2], region: a[3], country: a[4],
    lat: a[5], lon: a[6], elev: a[7], iata: a[8],
    runways: (a[9] || []).map(rw => ({
      leIdent: rw[0], leHdg: rw[1], heIdent: rw[2], heHdg: rw[3], lengthFt: rw[4],
      leLat: rw[5] ?? null, leLon: rw[6] ?? null, heLat: rw[7] ?? null, heLon: rw[8] ?? null,
      ident: `${rw[0]}/${rw[2]}`,
    })),
  };
}

function searchAirports(query) {
  if (!query || query.length < 2) return [];
  const q = query.toUpperCase().trim();
  const qLower = query.toLowerCase().trim();
  const exact = [], prefix = [], nameCity = [];
  for (let i = 0; i < airportsData.length; i++) {
    const a = airportsData[i];
    const icao = a[0]; const iata = a[8] || '';
    if (icao === q || iata === q) { exact.push(a); continue; }
    if (icao.startsWith(q) || iata.startsWith(q)) { prefix.push(a); continue; }
    const name = (a[1] || '').toLowerCase(); const city = (a[2] || '').toLowerCase();
    if (name.includes(qLower) || city.includes(qLower)) nameCity.push(a);
  }
  return [...exact, ...prefix, ...nameCity].slice(0, 12).map(toAirport);
}

const NM_TO_M = 1852;
function makeRingDefs(dists) {
  return [...dists].sort((a, b) => b - a).map(nm => ({
    nm, label: `${nm} nm`,
  }));
}

const s = {
  page: { maxWidth: '860px', margin: '0 auto', paddingBottom: '40px' },
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
  saveBtn: (saving) => ({ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: saving ? '#374151' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }),
  toast: (type) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', background: type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`, color: type === 'success' ? '#6ee7b7' : '#fca5a5', marginTop: '16px' }),
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
  hdr: { marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #1a2030' },
  hdrMini: { fontSize: '11px', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' },
  hdrTitle: { fontSize: '26px', fontWeight: '800', color: '#f9fafb', margin: '0 0 4px 0' },
  hdrSub: { fontSize: '13px', color: '#6b7280', margin: 0 },
  iconBtn: (color, bg) => ({ width: '32px', height: '32px', borderRadius: '7px', border: 'none', background: bg, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  manualLink: { background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', padding: '6px 0 0 0', display: 'block', textAlign: 'left' },
  mapSection: { marginTop: '24px', border: '1px solid #1e2a3a', borderRadius: '12px', overflow: 'hidden', background: '#0d1117' },
  mapLabel: { padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #1e2a3a' },
  mapContainer: { height: '400px', position: 'relative' },
  overlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  modal: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#f9fafb', marginBottom: '4px' },
  modalSub: { fontSize: '13px', color: '#6b7280', marginBottom: '20px' },
  modalInput: { width: '100%', padding: '10px 14px', background: '#1a2030', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  modalLabel: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  modalError: { fontSize: '12px', color: '#fca5a5', marginTop: '10px' },
  modalDivider: { borderTop: '1px solid #1e2a3a', margin: '20px 0' },
  runwayRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
  addRwyBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px dashed #374151', borderRadius: '7px', color: '#6b7280', fontSize: '12px', padding: '7px 12px', cursor: 'pointer', width: '100%', justifyContent: 'center' },
};

export default function AirportConfig({ isViewOnly = false }) {
  const [config, setConfig] = useState({
    airport_code: '', airport_name: '', latitude: '', longitude: '',
    elevation_ft_msl: 0, detection_radius_nm: 100, polling_interval_seconds: 10,
    alert_distances_nm: [10, 5, 2],
    runway_info: [],
    quiet_hours_enabled: false, quiet_hours_start: '23:00', quiet_hours_end: '06:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [ringDists, setRingDists] = useState([10, 5, 2]);
  const [activeRings, setActiveRings] = useState(new Set([10, 5, 2]));

  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    icao: '', name: '', city: '', lat: '', lon: '', elev: '',
    runways: [],
  });
  const [manualError, setManualError] = useState('');

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const ringsRef = useRef([]);
  const runwaysRef = useRef([]);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { loadConfig(); }, []);

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
        if (data.alert_distances_nm?.length) {
          const dists = data.alert_distances_nm.map(Number);
          setRingDists(dists);
          setActiveRings(new Set(dists));
        }
        if (data.airport_code) {
          const match = searchAirports(data.airport_code).find(a => a.icao === data.airport_code);
          if (match) {
            setSelectedAirport(match);
            setSearchQuery(data.airport_code);
          }
        }
      }
    } catch { } finally { setLoading(false); }
  };

  // Init map — must wait for loading=false so the map div is actually in the DOM
  useEffect(() => {
    if (loading) return;
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [39.5, -98.35], zoom: 4, zoomControl: true, attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [loading]);

  // Update map when airport or rings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    ringsRef.current.forEach(l => l.remove()); ringsRef.current = [];
    runwaysRef.current.forEach(l => l.remove()); runwaysRef.current = [];

    if (!selectedAirport) return;

    const { lat, lon } = selectedAirport;
    setTimeout(() => { map.invalidateSize(); map.setView([lat, lon], 12); }, 50);

    const airportIcon = L.divIcon({
      html: `<div style="width:10px;height:10px;background:#38bdf8;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #38bdf8"></div>`,
      className: '', iconSize: [10, 10], iconAnchor: [5, 5],
    });
    markerRef.current = L.marker([lat, lon], { icon: airportIcon }).addTo(map);

    // Draw runways
    const cosLat = Math.cos(lat * Math.PI / 180);
    const identToHdg = (ident) => { const n = parseInt(ident); return (n >= 1 && n <= 36) ? n * 10 : null; };
    for (const rw of selectedAirport.runways) {
      const leHdg = rw.leHdg ?? identToHdg(rw.leIdent);
      let lePt, hePt;
      if (rw.leLat != null && rw.leLon != null && rw.heLat != null && rw.heLon != null) {
        lePt = [rw.leLat, rw.leLon];
        hePt = [rw.heLat, rw.heLon];
      } else if (leHdg != null && rw.lengthFt > 0 && !/[LRC]$/i.test(rw.leIdent || '')) {
        const halfM = (rw.lengthFt * 0.3048) / 2;
        const hdgRad = (leHdg * Math.PI) / 180;
        lePt = [lat - (halfM / 111320) * Math.cos(hdgRad), lon - (halfM / (111320 * cosLat)) * Math.sin(hdgRad)];
        hePt = [lat + (halfM / 111320) * Math.cos(hdgRad), lon + (halfM / (111320 * cosLat)) * Math.sin(hdgRad)];
      } else continue;

      runwaysRef.current.push(L.polyline([lePt, hePt], { color: '#fff', weight: 5, opacity: 0.9 }).addTo(map));

      const rwLabel = (pt, txt) => L.marker(pt, {
        icon: L.divIcon({
          html: `<div style="font-size:9px;font-weight:800;color:#fff;background:rgba(0,0,0,0.75);padding:1px 5px;border-radius:3px;white-space:nowrap">${txt}</div>`,
          className: '', iconAnchor: [12, 6],
        }), interactive: false,
      }).addTo(map);

      if (rw.leIdent) runwaysRef.current.push(rwLabel(lePt, rw.leIdent));
      if (rw.heIdent) runwaysRef.current.push(rwLabel(hePt, rw.heIdent));
    }

    // Draw distance rings
    for (const nm of ringDists) {
      const active = activeRings.has(nm);
      const color = active ? '#38bdf8' : '#2d3748';
      const opacity = active ? 0.8 : 0.3;
      const circle = L.circle([lat, lon], {
        radius: nm * NM_TO_M, color, weight: active ? 2 : 1,
        opacity, fill: false, dashArray: active ? '' : '6, 6',
      }).addTo(map);
      const offset = L.latLng(lat + (nm * NM_TO_M) / 111320, lon);
      const lbl = L.marker(offset, {
        icon: L.divIcon({
          html: `<div style="font-size:10px;font-weight:700;color:${color};opacity:${opacity};white-space:nowrap;background:rgba(13,17,23,0.7);padding:1px 4px;border-radius:3px">${nm} nm</div>`,
          className: '', iconAnchor: [16, 8],
        }), interactive: false,
      }).addTo(map);
      ringsRef.current.push(circle, lbl);
    }
  }, [selectedAirport, activeRings, ringDists]);

  const handleSearch = (val) => {
    setSearchQuery(val);
    if (val.length >= 2) { setSuggestions(searchAirports(val)); setShowDropdown(true); }
    else { setSuggestions([]); setShowDropdown(false); }
  };

  const selectAirport = (airport) => {
    setSelectedAirport(airport);
    setSearchQuery(airport.icao);
    setShowDropdown(false);
    setSuggestions([]);
    setConfig(prev => ({
      ...prev, airport_code: airport.icao, airport_name: airport.name,
      latitude: airport.lat, longitude: airport.lon, elevation_ft_msl: airport.elev,
      runway_info: airport.runways,
    }));
  };

  const clearAirport = () => {
    setSelectedAirport(null);
    setSearchQuery('');
    setSuggestions([]);
    setConfig(prev => ({
      ...prev, airport_code: '', airport_name: '', latitude: '', longitude: '',
      elevation_ft_msl: 0, runway_info: [],
    }));
  };

  const openManualModal = (prefill = null) => {
    setManualForm(prefill ? {
      icao: prefill.icao || '',
      name: prefill.name || '',
      city: prefill.city || '',
      lat: String(prefill.lat || ''),
      lon: String(prefill.lon || ''),
      elev: String(prefill.elev || ''),
      runways: (prefill.runways || []).map(rw => ({
        ident: rw.ident || `${rw.leIdent || ''}/${rw.heIdent || ''}`,
        lengthFt: String(rw.lengthFt || ''),
      })),
    } : { icao: '', name: '', city: '', lat: '', lon: '', elev: '', runways: [] });
    setManualError('');
    setManualModal(true);
  };

  const addManualRunway = () => setManualForm(p => ({ ...p, runways: [...p.runways, { ident: '', lengthFt: '' }] }));
  const removeManualRunway = (i) => setManualForm(p => ({ ...p, runways: p.runways.filter((_, idx) => idx !== i) }));
  const updateManualRunway = (i, field, val) => setManualForm(p => ({
    ...p, runways: p.runways.map((r, idx) => idx === i ? { ...r, [field]: val } : r),
  }));

  const submitManual = () => {
    const lat = parseFloat(manualForm.lat);
    const lon = parseFloat(manualForm.lon);
    if (!manualForm.icao.trim()) { setManualError('ICAO code is required'); return; }
    if (!manualForm.name.trim()) { setManualError('Airport name is required'); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setManualError('Valid latitude required (e.g. 33.2006)'); return; }
    if (isNaN(lon) || lon < -180 || lon > 180) { setManualError('Valid longitude required (e.g. -97.1980)'); return; }

    const runways = manualForm.runways
      .filter(r => r.ident.trim())
      .map(r => {
        const parts = r.ident.trim().toUpperCase().replace(/\s/g, '').split('/');
        const leIdent = parts[0] || '';
        const heIdent = parts[1] || '';
        const leNum = parseInt(leIdent);
        const heNum = parseInt(heIdent);
        return {
          leIdent, heIdent,
          leHdg: !isNaN(leNum) && leNum >= 1 && leNum <= 36 ? leNum * 10 : null,
          heHdg: !isNaN(heNum) && heNum >= 1 && heNum <= 36 ? heNum * 10 : null,
          lengthFt: parseInt(r.lengthFt) || 0,
          leLat: null, leLon: null, heLat: null, heLon: null,
          ident: `${leIdent}/${heIdent}`,
        };
      });

    selectAirport({
      icao: manualForm.icao.trim().toUpperCase(),
      name: manualForm.name.trim(),
      city: manualForm.city.trim(),
      region: '', country: '',
      lat, lon, elev: parseInt(manualForm.elev) || 0,
      iata: null, runways,
    });
    setManualModal(false);
  };

  const toggleRing = (nm) => {
    setActiveRings(prev => { const next = new Set(prev); next.has(nm) ? next.delete(nm) : next.add(nm); return next; });
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
      };
      await APIService.updateAirportConfig(payload);
      const ringsText = Array.from(activeRings).sort((a, b) => b - a).map(n => `${n}nm`).join(', ');
      setMessage({ type: 'success', text: `${config.airport_code} configured · ${ringsText}` });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save configuration' });
    } finally { setSaving(false); }
  };

  const metaLine = selectedAirport
    ? `${Math.abs(selectedAirport.lat).toFixed(4)}° ${selectedAirport.lat >= 0 ? 'N' : 'S'} · ${Math.abs(selectedAirport.lon).toFixed(4)}° ${selectedAirport.lon >= 0 ? 'E' : 'W'} · Elev ${selectedAirport.elev} ft` +
      (selectedAirport.runways.length ? ` · ${selectedAirport.runways.map(r => `Rwy ${r.ident}${r.lengthFt ? ` (${r.lengthFt.toLocaleString()} ft)` : ''}`).join(', ')}` : '')
    : '';

  if (loading) return (
    <div style={s.loading}>
      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Manual entry modal */}
      {manualModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={s.modalTitle}>Enter airport manually</div>
              <button onClick={() => setManualModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px' }}><X size={18} /></button>
            </div>
            <p style={s.modalSub}>Can't find your airport in the search, or the data is incorrect? Enter it below.</p>

            <div style={{ marginBottom: '14px' }}>
              <label style={s.modalLabel}>ICAO Code *</label>
              <input style={s.modalInput} placeholder="e.g. KDTO" maxLength={6}
                value={manualForm.icao} onChange={e => setManualForm(p => ({ ...p, icao: e.target.value.toUpperCase() }))} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={s.modalLabel}>Airport Name *</label>
              <input style={s.modalInput} placeholder="e.g. Denton Enterprise Airport"
                value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={s.modalLabel}>Latitude *</label>
                <input style={s.modalInput} placeholder="33.2006" type="number" step="0.0001"
                  value={manualForm.lat} onChange={e => setManualForm(p => ({ ...p, lat: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.modalLabel}>Longitude *</label>
                <input style={s.modalInput} placeholder="-97.1980" type="number" step="0.0001"
                  value={manualForm.lon} onChange={e => setManualForm(p => ({ ...p, lon: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={s.modalLabel}>City</label>
                <input style={s.modalInput} placeholder="e.g. Denton"
                  value={manualForm.city} onChange={e => setManualForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.modalLabel}>Elevation (ft)</label>
                <input style={s.modalInput} placeholder="641" type="number"
                  value={manualForm.elev} onChange={e => setManualForm(p => ({ ...p, elev: e.target.value }))} />
              </div>
            </div>

            <div style={s.modalDivider} />

            {/* Runway inputs */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ ...s.modalLabel, marginBottom: '10px' }}>Runways (optional)</label>
              <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '10px' }}>
                Enter as "09/27" — the app computes heading from runway number.
              </div>
              {manualForm.runways.map((rw, i) => (
                <div key={i} style={s.runwayRow}>
                  <input
                    style={{ ...s.modalInput, flex: 1 }}
                    placeholder="09/27"
                    value={rw.ident}
                    onChange={e => updateManualRunway(i, 'ident', e.target.value)}
                  />
                  <input
                    style={{ ...s.modalInput, width: '110px', flex: 'none' }}
                    placeholder="Length (ft)"
                    type="number"
                    value={rw.lengthFt}
                    onChange={e => updateManualRunway(i, 'lengthFt', e.target.value)}
                  />
                  <button onClick={() => removeManualRunway(i)}
                    style={{ width: '30px', height: '36px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button style={s.addRwyBtn} onClick={addManualRunway}>
                <Plus size={13} /> Add Runway
              </button>
            </div>

            {manualError && <p style={s.modalError}>{manualError}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setManualModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '8px', background: 'transparent', border: '1px solid #374151', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitManual} style={{ flex: 1, padding: '11px', borderRadius: '8px', background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Use this airport</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.hdr}>
        <p style={s.hdrMini}>Airport Config</p>
        <h2 style={s.hdrTitle}>Add destination</h2>
        <p style={s.hdrSub}>Tell FinalPing where this aircraft is heading.</p>
      </div>

      {/* Airport Search */}
      <div style={{ ...s.section, position: 'relative' }}>
        <label style={s.label}>Search Airport</label>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <input
            style={{ ...s.input, borderColor: showDropdown ? '#38bdf8' : '#1e2a3a' }}
            type="text" value={searchQuery}
            placeholder="ICAO, IATA, city, or airport name"
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
            disabled={isViewOnly}
          />
          {showDropdown && suggestions.length > 0 && (
            <div ref={dropdownRef} style={s.dropdown}>
              {suggestions.map(ap => (
                <div key={ap.icao} style={s.dropdownItem}
                  onMouseDown={() => selectAirport(ap)}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2a40'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={s.iataBadge(ap.iata)}>{ap.iata || ap.icao.slice(0, 3)}</div>
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
        {!isViewOnly && (
          <button style={s.manualLink} onClick={() => openManualModal()}>
            Can't find your airport or wrong info? Enter manually →
          </button>
        )}
      </div>

      {/* Selected airport card */}
      {selectedAirport && (
        <div style={s.section}>
          <div style={s.airportCard}>
            <div style={s.airportCardBadge}>{selectedAirport.iata || selectedAirport.icao.slice(0, 3)}</div>
            <div style={s.airportCardInfo}>
              <div style={s.airportName}>{selectedAirport.name}</div>
              <div style={s.airportMeta}>{metaLine}</div>
            </div>
            {!isViewOnly && (
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => openManualModal(selectedAirport)} title="Edit airport info"
                  style={s.iconBtn('#38bdf8', 'rgba(56,189,248,0.1)')}>
                  <Edit2 size={14} />
                </button>
                <button onClick={clearAirport} title="Remove airport"
                  style={s.iconBtn('#ef4444', 'rgba(239,68,68,0.1)')}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detection Rings */}
      <div style={s.section}>
        <label style={s.label}>Detection Ring</label>
        <div style={s.ringsRow}>
          {makeRingDefs(ringDists).map(({ nm, label }) => (
            <button key={nm} type="button" style={s.ringBtn(activeRings.has(nm))}
              onClick={() => !isViewOnly && toggleRing(nm)}>
              <div style={s.ringBtnNm}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      {!isViewOnly && (
        <div style={s.section}>
          <button type="button" onClick={handleSave} disabled={saving} style={s.saveBtn(saving)}>
            {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : 'Save airport'}
          </button>
        </div>
      )}

      {/* Toast */}
      {message.text && (
        <div style={s.toast(message.type)}>
          {message.type === 'success' && <Check size={15} />}
          {message.text}
        </div>
      )}

      {/* Map */}
      <div style={s.mapSection}>
        <div style={s.mapLabel}>Map Preview</div>
        <div style={s.mapContainer}>
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
          {!selectedAirport && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ textAlign: 'center', color: '#374151' }}>
                <MapPin size={32} strokeWidth={1} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px' }}>Search for an airport to preview on map</div>
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
