import React, { useState, useEffect, useRef } from 'react';
import { Plane, Trash2, Edit2, AlertCircle, Loader, Lock } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';
import { getLimits, getLimitDisplay } from '../config/tierLimits';
import { getColor, setColor, ensureLoaded } from '../services/aircraftColors';

const FALLBACK_DISTANCES = [10, 5, 2];
const DIST_LABELS = { 10: 'Inbound', 5: 'Approach', 2: 'Final' };

function makeEmptyForm(distances) {
  return { icao24: '', tail_number: '', aircraft_type: '', alert_distances: [...distances], color: '' };
}

const s = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', fontFamily: "'Segoe UI', system-ui, sans-serif", alignItems: 'start' },
  left: {},
  right: { position: 'sticky', top: 0, marginTop: '130px' },

  sectionLabel: { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' },
  pageTitle: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  pageCount: { fontSize: '13px', color: '#6b7280', marginBottom: '24px' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: '11px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 10px', textAlign: 'left', borderBottom: '1px solid #1f2937' },
  thRight: { fontSize: '11px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 10px', textAlign: 'right', borderBottom: '1px solid #1f2937' },
  td: { padding: '14px 12px', borderBottom: '1px solid #111827', verticalAlign: 'middle' },
  tailNum: { fontSize: '15px', fontWeight: '700', color: '#f9fafb' },
  icaoText: { fontSize: '11px', color: '#4b5563', fontFamily: 'monospace', marginTop: '2px' },
  typeText: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  statusBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: '#34d39920', color: '#34d399', border: '1px solid #34d39930', whiteSpace: 'nowrap' },
  distTag: (active) => ({
    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', marginRight: '4px',
    background: active ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
    color: active ? '#38bdf8' : '#374151',
    border: `1px solid ${active ? 'rgba(14,165,233,0.25)' : '#1f2937'}`,
  }),
  iconBtn: (color) => ({ width: '30px', height: '30px', borderRadius: '7px', border: 'none', background: `${color}15`, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }),

  panel: { background: 'linear-gradient(135deg, #1e293b 0%, #172035 100%)', border: '1px solid #3b82f620', borderRadius: '16px', padding: '24px', boxShadow: '0 0 0 1px #3b82f615, 0 8px 32px rgba(59,130,246,0.1)' },
  panelLabel: { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' },
  panelTitle: { fontSize: '20px', fontWeight: '700', color: '#f9fafb', marginBottom: '20px' },

  fieldLabel: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  fieldRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' },
  autoTag: { fontSize: '11px', color: '#38bdf8', fontWeight: '600' },
  input: { width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #1f2937', borderRadius: '8px', color: '#f9fafb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  inputHint: { fontSize: '11px', color: '#4b5563', marginTop: '4px' },
  inputGroup: { marginBottom: '16px' },
  autoFilled: { background: '#0d1117', border: '1px solid #1f2937', borderRadius: '8px', padding: '10px 14px', color: '#9ca3af', fontSize: '14px', minHeight: '40px', display: 'flex', alignItems: 'center' },

  distRow: { display: 'flex', gap: '8px', marginTop: '6px' },
  distBtn: (active) => ({
    flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${active ? 'rgba(14,165,233,0.4)' : '#1f2937'}`,
    background: active ? 'rgba(14,165,233,0.12)' : '#0d1117',
    color: active ? '#38bdf8' : '#4b5563',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
  }),
  distLabel: { fontSize: '9px', fontWeight: '500', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' },

  trackBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s' },

  alert: (type) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', background: type === 'error' ? '#ef444420' : '#34d39920', border: `1px solid ${type === 'error' ? '#ef444440' : '#34d39940'}`, color: type === 'error' ? '#fca5a5' : '#6ee7b7' }),
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },

  upgradeBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', marginBottom: '20px', gap: '12px' },
  upgradeText: { fontSize: '13px', color: '#fcd34d', margin: 0 },
  upgradeLink: { fontSize: '12px', fontWeight: '700', color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 },

  emptyRow: { textAlign: 'center', padding: '48px 20px', color: '#4b5563', fontSize: '13px' },

  confirmOverlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmBox: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },
};

export default function AircraftManager({ isViewOnly = false }) {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalDistances, setGlobalDistances] = useState(FALLBACK_DISTANCES);
  const [form, setForm] = useState(makeEmptyForm(FALLBACK_DISTANCES));
  const [editingId, setEditingId] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);
  const [tier, setTier] = useState('starter');
  const [confirmModal, setConfirmModal] = useState(null);
  const [colorVersion, setColorVersion] = useState(0);
  const lookupTimer = useRef(null);

  useEffect(() => {
    ensureLoaded().then(() => setColorVersion(v => v + 1));
    loadAircraft();
    APIService.getCurrentUser().then(d => { if (d?.license_tier) setTier(d.license_tier); }).catch(() => {
      StorageService.getUserData().then(d => { if (d?.license_tier) setTier(d.license_tier); });
    });
    APIService.getAirportConfig().then(cfg => {
      if (cfg?.alert_distances_nm?.length) {
        const dists = cfg.alert_distances_nm.map(Number).sort((a, b) => b - a);
        setGlobalDistances(dists);
        setForm(makeEmptyForm(dists));
      }
    }).catch(() => {});
  }, []);

  const loadAircraft = async () => {
    try {
      const data = await APIService.getAircraft();
      setAircraft(data || []);
    } catch {
      showMessage('error', 'Failed to load aircraft');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const lookupIcao = async (icao) => {
    if (icao.length !== 6) return;
    setLookingUp(true);
    try {
      const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${icao}`);
      if (res.ok) {
        const json = await res.json();
        const info = json?.response?.aircraft;
        if (info) {
          setForm(p => ({
            ...p,
            tail_number: info.registration || p.tail_number,
            aircraft_type: info.type || info.manufacturer_name || '',
          }));
        }
      }
    } catch { /* silently ignore */ }
    setLookingUp(false);
  };

  const handleIcaoChange = (val) => {
    const v = val.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 6);
    setForm(p => ({ ...p, icao24: v, tail_number: '', aircraft_type: '' }));
    clearTimeout(lookupTimer.current);
    if (v.length === 6) {
      lookupTimer.current = setTimeout(() => lookupIcao(v), 300);
    }
  };

  const toggleDistance = (d) => {
    setForm(p => {
      const has = p.alert_distances.includes(d);
      if (has && p.alert_distances.length === 1) return p;
      return { ...p, alert_distances: has ? p.alert_distances.filter(x => x !== d) : [...p.alert_distances, d].sort((a, b) => b - a) };
    });
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      icao24: a.icao24 || '',
      tail_number: a.tail_number || '',
      aircraft_type: a.aircraft_type || '',
      alert_distances: a.alert_distances || [...globalDistances],
      color: getColor(a.tail_number),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(makeEmptyForm(globalDistances));
  };

  const handleColorChange = async (tail, color) => {
    await setColor(tail, color);
    setColorVersion(v => v + 1);
  };

  const handleSave = async () => {
    if (!form.icao24 || form.icao24.length !== 6) {
      showMessage('error', 'Enter a valid 6-character ICAO24 hex code');
      return;
    }
    if (!form.tail_number.trim()) {
      showMessage('error', 'Tail number is required');
      return;
    }
    setSaving(true);
    try {
      const tail = form.tail_number.toUpperCase();
      if (editingId) {
        await APIService.updateAircraft(
          editingId, tail, form.icao24, null,
          form.aircraft_type || null, form.alert_distances,
        );
        showMessage('success', `${tail} updated`);
        setEditingId(null);
      } else {
        await APIService.addAircraft(
          tail, form.icao24, null,
          form.aircraft_type || null, form.alert_distances,
        );
        showMessage('success', `${tail} added`);
      }
      if (form.color) {
        await setColor(tail, form.color);
        setColorVersion(v => v + 1);
      }
      await loadAircraft();
      setForm(makeEmptyForm(globalDistances));
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to save aircraft');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, tailNum) => {
    try {
      await new Promise((resolve, reject) => setConfirmModal({ message: `Remove ${tailNum} from tracking?`, onConfirm: resolve, onCancel: reject }));
      setConfirmModal(null);
    } catch { setConfirmModal(null); return; }
    setDeleting(id);
    try {
      await APIService.deleteAircraft(id);
      setAircraft(prev => prev.filter(a => a.id !== id));
      if (editingId === id) cancelEdit();
      showMessage('success', `${tailNum} removed`);
    } catch {
      showMessage('error', 'Failed to remove aircraft');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={s.loading}>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading aircraft...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const limits = getLimits(tier);
  const atLimit = aircraft.length >= limits.aircraft;
  const isAdding = !editingId;
  const formColor = form.color || (form.tail_number ? getColor(form.tail_number.toUpperCase()) : '#38bdf8');

  return (
    <div style={s.layout}>
      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmBox}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>✈️</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', margin: '0 0 8px 0', textAlign: 'center' }}>Remove Aircraft</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', margin: '0 0 24px 0' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => confirmModal.onCancel()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid #374151', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => confirmModal.onConfirm()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT — Aircraft list */}
      <div style={s.left}>
        <div style={s.sectionLabel}>AIRCRAFT</div>
        <h2 style={s.pageTitle}>My fleet</h2>
        <p style={s.pageCount}>
          {aircraft.length} of {getLimitDisplay(limits.aircraft)} tracked
        </p>

        {atLimit && (
          <div style={s.upgradeBox}>
            <p style={s.upgradeText}>🔒 <strong>{tier}</strong> plan limit reached. Upgrade to track more.</p>
            <span style={s.upgradeLink} onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}>Upgrade →</span>
          </div>
        )}

        {message && (
          <div style={s.alert(message.type)}>
            <AlertCircle size={15} />
            {message.text}
          </div>
        )}

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Tail</th>
              <th style={s.th}>ICAO24</th>
              <th style={s.th}>Model</th>
              <th style={s.th}>Alerts</th>
              <th style={s.thRight}>Status</th>
              {!isViewOnly && <th style={s.thRight}></th>}
            </tr>
          </thead>
          <tbody>
            {aircraft.length === 0 ? (
              <tr>
                <td colSpan={isViewOnly ? 5 : 6} style={s.emptyRow}>
                  No aircraft yet — add your first tail number on the right.
                </td>
              </tr>
            ) : aircraft.map(a => (
              <tr key={a.id} style={{ background: editingId === a.id ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                <td style={s.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      title="Click to change color"
                      onClick={() => document.getElementById(`cp-${a.id}`).click()}
                      style={{ width: 12, height: 12, borderRadius: '50%', background: getColor(a.tail_number), cursor: 'pointer', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.2)' }}
                    />
                    <input
                      id={`cp-${a.id}`}
                      type="color"
                      value={getColor(a.tail_number)}
                      onChange={e => handleColorChange(a.tail_number, e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div style={s.tailNum}>{a.tail_number}</div>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={{ ...s.icaoText, fontSize: '13px', color: '#6b7280' }}>{a.icao24 || '—'}</div>
                </td>
                <td style={s.td}>
                  <div style={s.typeText}>{a.aircraft_type || '—'}</div>
                </td>
                <td style={s.td}>
                  {globalDistances.map(d => (
                    <span key={d} style={s.distTag((a.alert_distances || globalDistances).includes(d))}>
                      {d}nm
                    </span>
                  ))}
                </td>
                <td style={{ ...s.td, textAlign: 'right' }}>
                  <span style={s.statusBadge}>● ACTIVE</span>
                </td>
                {!isViewOnly && (
                  <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={s.iconBtn('#60a5fa')} onClick={() => editingId === a.id ? cancelEdit() : startEdit(a)} title={editingId === a.id ? 'Cancel edit' : 'Edit'}>
                      <Edit2 size={13} />
                    </button>
                    {' '}
                    <button style={s.iconBtn('#ef4444')} onClick={() => handleDelete(a.id, a.tail_number)} disabled={deleting === a.id} title="Remove">
                      {deleting === a.id ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT — Persistent add / edit panel */}
      {!isViewOnly && (
        <div style={s.right}>
          <div style={s.panel}>
            <div style={s.panelLabel}>ADD AIRCRAFT</div>
            <div style={s.panelTitle}>{editingId ? 'Edit tail' : 'Track new tail'}</div>

            {/* ICAO24 */}
            <div style={s.inputGroup}>
              <label style={s.fieldLabel}>ICAO 24-BIT HEX</label>
              <input
                style={s.input}
                placeholder="a4992d"
                value={form.icao24}
                onChange={e => handleIcaoChange(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = '#1f2937'}
              />
              <p style={s.inputHint}>
                Find on{' '}
                <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={() => window.electronAPI?.openExternal('https://globe.adsbexchange.com')}>ADSBExchange</span>
                {' '}or{' '}
                <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={() => window.electronAPI?.openExternal('https://www.planespotters.net')}>Planespotters</span>
              </p>
            </div>

            {/* Tail number — auto-filled */}
            <div style={s.inputGroup}>
              <div style={s.fieldRow}>
                <label style={{ ...s.fieldLabel, marginBottom: 0 }}>TAIL NUMBER</label>
                <span style={s.autoTag}>{lookingUp ? '● looking up...' : '+ AUTO'}</span>
              </div>
              <input
                style={{ ...s.input, marginTop: '6px' }}
                placeholder="N504GR"
                value={form.tail_number}
                onChange={e => setForm(p => ({ ...p, tail_number: e.target.value.toUpperCase() }))}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = '#1f2937'}
                maxLength={10}
              />
            </div>

            {/* Aircraft type — auto-filled */}
            <div style={s.inputGroup}>
              <div style={s.fieldRow}>
                <label style={{ ...s.fieldLabel, marginBottom: 0 }}>AIRCRAFT TYPE</label>
                <span style={s.autoTag}>+ AUTO</span>
              </div>
              <div style={{ ...s.autoFilled, marginTop: '6px', color: form.aircraft_type ? '#e5e7eb' : '#374151' }}>
                {form.aircraft_type || <span style={{ color: '#374151', fontStyle: 'italic', fontSize: '13px' }}>Auto-filled from ICAO lookup</span>}
              </div>
            </div>

            {/* Map Color */}
            <div style={s.inputGroup}>
              <label style={s.fieldLabel}>MAP COLOR</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <div
                  title="Open color wheel"
                  onClick={() => document.getElementById('form-color-pick').click()}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: formColor, cursor: 'pointer', flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)', boxShadow: `0 0 10px ${formColor}70` }}
                />
                <input
                  id="form-color-pick"
                  type="color"
                  value={formColor}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <input
                  style={{ ...s.input, fontFamily: 'monospace', fontSize: '13px' }}
                  value={formColor}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm(p => ({ ...p, color: v }));
                  }}
                  maxLength={7}
                  placeholder="#38bdf8"
                  onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={e => e.target.style.borderColor = '#1f2937'}
                />
              </div>
            </div>

            {/* Alert distances */}
            <div>
              <label style={s.fieldLabel}>ALERT DISTANCES</label>
              <div style={s.distRow}>
                {globalDistances.map(d => {
                  const active = form.alert_distances.includes(d);
                  return (
                    <button key={d} style={s.distBtn(active)} onClick={() => toggleDistance(d)}>
                      <span style={{ fontWeight: 700 }}>{d} nm</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              style={{ ...s.trackBtn, opacity: saving || atLimit ? 0.6 : 1, cursor: saving || atLimit ? 'not-allowed' : 'pointer' }}
              onClick={handleSave}
              disabled={saving || (atLimit && isAdding)}
            >
              {saving
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                : atLimit && isAdding
                  ? <><Lock size={15} /> Limit Reached</>
                  : <><Plane size={15} /> {editingId ? 'Save changes' : '+ Track aircraft'}</>}
            </button>

            {editingId && (
              <button
                style={{ width: '100%', padding: '10px', marginTop: '8px', background: 'none', border: '1px solid #1f2937', borderRadius: '10px', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                onClick={cancelEdit}
              >
                Cancel edit
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
