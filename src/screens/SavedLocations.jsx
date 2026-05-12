import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Check, Edit2, X, AlertTriangle } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  sub: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  card: { background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)', border: '1px solid #2d3748', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 18px', borderRadius: '10px', border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  locationCard: (active) => ({
    background: active ? '#3b82f610' : '#111827',
    border: `1px solid ${active ? '#3b82f640' : '#1f2937'}`,
    borderRadius: '12px', padding: '16px', marginBottom: '12px',
    display: 'flex', alignItems: 'center', gap: '14px',
  }),
  iconBox: (active) => ({
    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
    background: active ? '#3b82f620' : '#1f2937',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  locName: { fontSize: '14px', fontWeight: '700', color: '#f9fafb', marginBottom: '2px' },
  locCoords: { fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' },
  activeBadge: { fontSize: '11px', fontWeight: '700', color: '#34d399', background: '#34d39915', border: '1px solid #34d39930', padding: '2px 8px', borderRadius: '6px' },
  actionBtn: (color) => ({
    padding: '6px 10px', borderRadius: '8px', border: `1px solid ${color}30`,
    background: `${color}10`, color, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
  }),
  input: {
    width: '100%', background: '#0f1117', border: '1px solid #374151',
    borderRadius: '8px', padding: '10px 12px', color: '#f9fafb',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  },
  label: { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' },
  saveBtn: {
    padding: '10px 20px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 20px', borderRadius: '8px', border: '1px solid #374151',
    background: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
  },
  limitBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
    background: '#f59e0b10', border: '1px solid #f59e0b30', color: '#fcd34d', fontSize: '13px',
  },
  errorBox: {
    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
    background: '#ef444415', border: '1px solid #ef444430', color: '#fca5a5', fontSize: '13px',
  },
  hintBox: {
    background: '#f59e0b0d', border: '1px solid #f59e0b25', borderRadius: '10px',
    padding: '14px 16px', marginBottom: '14px',
  },
  hintTitle: { fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px' },
  hintLine: { fontSize: '12px', color: '#9ca3af', margin: '3px 0' },
};

const EMPTY_FORM = { name: '', airport_code: '', latitude: '', longitude: '', elevation_ft_msl: '' };

export default function SavedLocations({ isViewOnly = false }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tier, setTier] = useState('starter');
  const [activating, setActivating] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const LOCATION_LIMITS = { starter: 1, premium: 5, pro: null, 'team-starter': 1, 'team-premium': 5, 'team-pro': null };
  const limit = LOCATION_LIMITS[tier] ?? null;
  const atLimit = limit !== null && locations.length >= limit;

  useEffect(() => {
    loadLocations();
    loadTier();
  }, []);

  const loadTier = async () => {
    try {
      const user = await APIService.getCurrentUser();
      setTier(user?.license_tier || 'starter');
    } catch {}
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await APIService.client.get('/api/locations');
      setLocations(data.data || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      setError('Name, latitude, and longitude are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await APIService.client.put(`/api/locations/${editingId}`, form);
      } else {
        await APIService.client.post('/api/locations', form);
      }
      await loadLocations();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (loc) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      airport_code: loc.airport_code || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      elevation_ft_msl: loc.elevation_ft_msl || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleActivate = async (id) => {
    setActivating(id);
    try {
      await APIService.client.post(`/api/locations/${id}/activate`);
      await loadLocations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to activate location');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await new Promise((resolve, reject) => setConfirmModal({ message: 'Delete this location?', onConfirm: resolve, onCancel: reject }));
      setConfirmModal(null);
    } catch { setConfirmModal(null); return; }
    try {
      await APIService.client.delete(`/api/locations/${id}`);
      await loadLocations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete location');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  return (
    <div style={s.page}>
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f1117', border: '1px solid #2d3748', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>📍</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', margin: '0 0 8px 0', textAlign: 'center' }}>Delete Location</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', margin: '0 0 24px 0' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => confirmModal.onCancel()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid #374151', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => confirmModal.onConfirm()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Saved Locations</h2>
          <p style={s.sub}>Manage your tracking locations — one is active at a time</p>
        </div>
        {!showForm && !atLimit && !isViewOnly && (
          <button style={s.addBtn} onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setError(''); }}>
            <Plus size={14} /> Add Location
          </button>
        )}
      </div>

      {/* Tier limit banner */}
      {atLimit && (
        <div style={s.limitBanner}>
          <AlertTriangle size={15} color="#fbbf24" />
          <span>
            Your <strong>{tier}</strong> plan allows {limit} saved location{limit !== 1 ? 's' : ''}.{' '}
            <span
              style={{ fontWeight: '700', color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}
            >
              Upgrade to add more →
            </span>
          </span>
        </div>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Add / Edit form */}
      {showForm && (
        <div style={s.card}>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: '0 0 18px 0' }}>
            {editingId ? 'Edit Location' : 'Add New Location'}
          </p>

          {/* Coords hint */}
          <div style={s.hintBox}>
            <p style={s.hintTitle}>How to find your coordinates:</p>
            <p style={s.hintLine}>1. Open Google Maps and right-click your location</p>
            <p style={s.hintLine}>2. Click the coordinates at the top of the menu to copy them</p>
            <p style={s.hintLine}>3. The first number is <strong style={{ color: '#f9fafb' }}>Latitude</strong>, the second is <strong style={{ color: '#f9fafb' }}>Longitude</strong></p>
            <p style={s.hintLine}>4. <strong style={{ color: '#fbbf24' }}>Most locations in North/South America and the UK will have a negative Longitude</strong></p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={s.label}>Location Name *</label>
            <input style={s.input} placeholder="e.g. KDTO Home Base" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Latitude *</label>
              <input style={s.input} type="number" step="any" placeholder="33.2001" value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Longitude *</label>
              <input style={s.input} type="number" step="any" placeholder="-97.1998" value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
            </div>
          </div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Airport Code <span style={{ color: '#4b5563' }}>(optional)</span></label>
              <input style={s.input} placeholder="KDTO" value={form.airport_code}
                onChange={e => setForm(f => ({ ...f, airport_code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={s.label}>Elevation ft MSL <span style={{ color: '#4b5563' }}>(optional)</span></label>
              <input style={s.input} type="number" placeholder="641" value={form.elevation_ft_msl}
                onChange={e => setForm(f => ({ ...f, elevation_ft_msl: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button style={s.saveBtn} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Location'}
            </button>
            <button style={s.cancelBtn} onClick={cancelForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Locations list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '13px' }}>Loading locations...</div>
      ) : locations.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '40px' }}>
          <MapPin size={28} color="#2d3748" style={{ marginBottom: '10px' }} />
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px' }}>No locations saved yet</p>
          <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>Add a location to start tracking aircraft</p>
        </div>
      ) : (
        <div>
          {locations.map(loc => (
            <div key={loc.id} style={s.locationCard(loc.is_active)}>
              <div style={s.iconBox(loc.is_active)}>
                <MapPin size={18} color={loc.is_active ? '#3b82f6' : '#4b5563'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={s.locName}>{loc.name}</span>
                  {loc.airport_code && <span style={{ fontSize: '11px', color: '#6b7280' }}>{loc.airport_code}</span>}
                  {loc.is_active && <span style={s.activeBadge}>● Active</span>}
                </div>
                <span style={s.locCoords}>{parseFloat(loc.latitude).toFixed(4)}, {parseFloat(loc.longitude).toFixed(4)}</span>
                {loc.elevation_ft_msl > 0 && <span style={{ ...s.locCoords, marginLeft: '12px' }}>{loc.elevation_ft_msl} ft MSL</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {!isViewOnly && (
                  <>
                    {!loc.is_active && (
                      <button style={s.actionBtn('#34d399')} onClick={() => handleActivate(loc.id)} disabled={activating === loc.id}>
                        <Check size={12} /> {activating === loc.id ? '...' : 'Set Active'}
                      </button>
                    )}
                    <button style={s.actionBtn('#60a5fa')} onClick={() => handleEdit(loc)}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button style={s.actionBtn('#f87171')} onClick={() => handleDelete(loc.id)}>
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
