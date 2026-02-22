import React, { useState, useEffect } from 'react';
import { Plane, Plus, Trash2, Edit2, X, Check, AlertCircle, Loader } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' },
  headerTitle: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  headerSub: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: '10px', color: '#fff',
    padding: '10px 18px', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', transition: 'opacity 0.2s', flexShrink: 0,
  },
  card: {
    background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)',
    border: '1px solid #2d3748', borderRadius: '16px', padding: '24px', marginBottom: '16px',
  },
  formCard: {
    background: 'linear-gradient(135deg, #1e293b 0%, #172035 100%)',
    border: '1px solid #3b82f620', borderRadius: '16px', padding: '24px', marginBottom: '20px',
    boxShadow: '0 0 0 1px #3b82f615, 0 8px 32px rgba(59,130,246,0.1)',
  },
  formTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' },
  input: {
    width: '100%', padding: '10px 14px', background: '#111827',
    border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
  inputHint: { fontSize: '11px', color: '#6b7280', marginTop: '4px' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: '1px solid #374151', borderRadius: '8px',
    color: '#9ca3af', padding: '9px 16px', fontSize: '13px', cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: '8px', color: '#fff',
    padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  aircraftRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', background: '#111827', borderRadius: '12px', marginBottom: '10px',
    border: '1px solid #1f2937', transition: 'border-color 0.2s',
  },
  aircraftLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  planeIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: '#38bdf820', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tailNum: { fontSize: '16px', fontWeight: '700', color: '#f9fafb', marginBottom: '2px' },
  icaoText: { fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' },
  friendlyName: { fontSize: '12px', color: '#9ca3af' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusBadge: {
    fontSize: '11px', fontWeight: '600', padding: '3px 10px',
    borderRadius: '20px', background: '#34d39920', color: '#34d399', border: '1px solid #34d39930',
  },
  iconBtn: (color) => ({
    width: '34px', height: '34px', borderRadius: '8px', border: 'none',
    background: `${color}15`, color: color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
  }),
  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    background: '#111827', borderRadius: '16px', border: '1px dashed #2d3748',
  },
  emptyIcon: {
    width: '64px', height: '64px', borderRadius: '16px',
    background: '#1e2538', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
  },
  emptyTitle: { fontSize: '18px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px' },
  emptyText: { fontSize: '14px', color: '#6b7280', marginBottom: '20px' },
  alert: (type) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px',
    background: type === 'error' ? '#ef444420' : '#34d39920',
    border: `1px solid ${type === 'error' ? '#ef444440' : '#34d39940'}`,
    color: type === 'error' ? '#fca5a5' : '#6ee7b7',
  }),
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
};

const emptyForm = { tail_number: '', icao24: '', friendly_name: '' };

export default function AircraftManager() {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadAircraft(); }, []);

  const loadAircraft = async () => {
    try {
      const data = await APIService.getAircraft();
      setAircraft(data || []);
    } catch (err) {
      showMessage('error', 'Failed to load aircraft');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setForm({ tail_number: a.tail_number, icao24: a.icao24 || '', friendly_name: a.friendly_name || '' });
    setEditingId(a.id);
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.tail_number.trim()) {
      showMessage('error', 'Tail number is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        // Edit: delete old and re-add (API pattern)
        await APIService.deleteAircraft(editingId);
        await APIService.addAircraft({
          tail_number: form.tail_number.toUpperCase(),
          icao24: form.icao24.toLowerCase() || undefined,
          friendly_name: form.friendly_name || undefined,
        });
        showMessage('success', `${form.tail_number.toUpperCase()} updated successfully`);
      } else {
        await APIService.addAircraft({
          tail_number: form.tail_number.toUpperCase(),
          icao24: form.icao24.toLowerCase() || undefined,
          friendly_name: form.friendly_name || undefined,
        });
        showMessage('success', `${form.tail_number.toUpperCase()} added successfully`);
      }
      await loadAircraft();
      cancel();
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to save aircraft');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, tailNum) => {
    if (!window.confirm(`Remove ${tailNum} from tracking?`)) return;
    setDeleting(id);
    try {
      await APIService.deleteAircraft(id);
      setAircraft(prev => prev.filter(a => a.id !== id));
      showMessage('success', `${tailNum} removed`);
    } catch (err) {
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

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.headerTitle}>Your Aircraft</h2>
          <p style={s.headerSub}>{aircraft.length} aircraft being tracked</p>
        </div>
        {!showForm && (
          <button style={s.addBtn} onClick={openAdd}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Plus size={16} /> Add Aircraft
          </button>
        )}
      </div>

      {/* Alert message */}
      {message && (
        <div style={s.alert(message.type)}>
          <AlertCircle size={15} />
          {message.text}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={s.formCard}>
          <p style={s.formTitle}>
            <Plane size={16} color="#60a5fa" />
            {editingId ? 'Edit Aircraft' : 'Add New Aircraft'}
          </p>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Tail Number *</label>
              <input
                style={s.input}
                placeholder="N80896"
                value={form.tail_number}
                onChange={e => setForm(p => ({ ...p, tail_number: e.target.value.toUpperCase() }))}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#374151'}
                maxLength={10}
              />
              <p style={s.inputHint}>FAA registration number</p>
            </div>
            <div>
              <label style={s.label}>ICAO24 Code</label>
              <input
                style={s.input}
                placeholder="ab0347"
                value={form.icao24}
                onChange={e => setForm(p => ({ ...p, icao24: e.target.value.toLowerCase() }))}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#374151'}
                maxLength={6}
              />
              <p style={s.inputHint}>6-char hex transponder code</p>
            </div>
            <div>
              <label style={s.label}>Friendly Name</label>
              <input
                style={s.input}
                placeholder="Chief's Cessna"
                value={form.friendly_name}
                onChange={e => setForm(p => ({ ...p, friendly_name: e.target.value }))}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#374151'}
                maxLength={50}
              />
              <p style={s.inputHint}>Optional display name</p>
            </div>
          </div>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={cancel}>
              <X size={14} /> Cancel
            </button>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              {saving ? 'Saving...' : editingId ? 'Update Aircraft' : 'Add Aircraft'}
            </button>
          </div>
        </div>
      )}

      {/* Aircraft list */}
      {aircraft.length === 0 && !showForm ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><Plane size={28} color="#4b5563" /></div>
          <p style={s.emptyTitle}>No aircraft yet</p>
          <p style={s.emptyText}>Add your first aircraft to start receiving tracking alerts</p>
          <button style={s.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Your First Aircraft
          </button>
        </div>
      ) : (
        aircraft.map(a => (
          <div key={a.id} style={s.aircraftRow}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}>
            <div style={s.aircraftLeft}>
              <div style={s.planeIcon}><Plane size={18} color="#38bdf8" /></div>
              <div>
                <p style={s.tailNum}>{a.tail_number}</p>
                {a.friendly_name && <p style={s.friendlyName}>{a.friendly_name}</p>}
                <p style={s.icaoText}>{a.icao24 ? `ICAO: ${a.icao24}` : 'No ICAO code'}</p>
              </div>
            </div>
            <div style={s.rowRight}>
              <span style={s.statusBadge}>Active</span>
              <button style={s.iconBtn('#60a5fa')} onClick={() => openEdit(a)}
                onMouseEnter={e => e.currentTarget.style.background = '#60a5fa25'}
                onMouseLeave={e => e.currentTarget.style.background = '#60a5fa15'}
                title="Edit">
                <Edit2 size={14} />
              </button>
              <button style={s.iconBtn('#ef4444')}
                onClick={() => handleDelete(a.id, a.tail_number)}
                disabled={deleting === a.id}
                onMouseEnter={e => e.currentTarget.style.background = '#ef444425'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef444415'}
                title="Remove">
                {deleting === a.id
                  ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
