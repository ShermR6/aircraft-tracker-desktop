import React, { useState, useEffect } from 'react';
import { MapPin, Save, Loader } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { maxWidth: '860px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' },
  headerIcon: { width: '48px', height: '48px', background: '#3b82f620', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { fontSize: '26px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' },
  headerSub: { fontSize: '13px', color: '#9ca3af', margin: 0 },
  card: { background: '#1a2030', border: '1px solid #2d3748', borderRadius: '14px', padding: '24px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', marginBottom: '20px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  hint: { fontSize: '11px', color: '#6b7280', marginTop: '5px' },
  tip: { fontSize: '13px', color: '#9ca3af', marginTop: '14px' },
  alert: (type) => ({
    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px',
    background: type === 'success' ? '#34d39920' : '#ef444420',
    border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`,
    color: type === 'success' ? '#6ee7b7' : '#fca5a5',
  }),
  saveBtn: (saving) => ({
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
    background: saving ? '#374151' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  }),
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
};

export default function AirportConfig() {
const [config, setConfig] = useState({
    airport_code: '', latitude: '', longitude: '',
    detection_radius_nm: '', polling_interval_seconds: '',
    quiet_hours_start: '', quiet_hours_end: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const data = await APIService.getAirportConfig();
      if (data) setConfig(data);
    } catch (error) {
      console.log('No existing config, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await APIService.updateAirportConfig(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  const focusStyle = (e) => e.target.style.borderColor = '#3b82f6';
  const blurStyle = (e) => e.target.style.borderColor = '#374151';

  if (loading) {
    return <div style={s.loading}><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...</div>;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}><MapPin size={22} color="#60a5fa" /></div>
        <div>
          <h2 style={s.headerTitle}>Airport Configuration</h2>
          <p style={s.headerSub}>Set your tracking location and preferences</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Airport Location */}
        <div style={s.card}>
          <p style={s.cardTitle}>Airport Location</p>
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Airport Code</label>
              <input style={s.input} type="text" value={config.airport_code} maxLength={4} placeholder="KDFW"
                onChange={e => set('airport_code', e.target.value.toUpperCase())}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={s.label}>Latitude</label>
              <input style={s.input} type="number" step="0.0001" value={config.latitude} required
                onChange={e => set('latitude', parseFloat(e.target.value))}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={s.label}>Longitude</label>
              <input style={s.input} type="number" step="0.0001" value={config.longitude} required
                onChange={e => set('longitude', parseFloat(e.target.value))}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>
          <p style={s.tip}>💡 Tip: Use the airport code (e.g., KDFW for Dallas-Fort Worth) and enter exact coordinates</p>
        </div>

        {/* Tracking Settings */}
        <div style={s.card}>
          <p style={s.cardTitle}>Tracking Settings</p>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Detection Radius (nm)</label>
              <input style={s.input} type="number" min="10" max="200" value={config.detection_radius_nm} required
                onChange={e => set('detection_radius_nm', parseInt(e.target.value))}
                onFocus={focusStyle} onBlur={blurStyle} />
              <p style={s.hint}>How far to scan for aircraft (10-200 nautical miles)</p>
            </div>
            <div>
              <label style={s.label}>Polling Interval (seconds)</label>
              <input style={s.input} type="number" min="5" max="60" value={config.polling_interval_seconds} required
                onChange={e => set('polling_interval_seconds', parseInt(e.target.value))}
                onFocus={focusStyle} onBlur={blurStyle} />
              <p style={s.hint}>How often to check for aircraft (5-60 seconds)</p>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div style={s.card}>
          <p style={s.cardTitle}>Quiet Hours</p>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Start Time</label>
              <input style={s.input} type="time" value={config.quiet_hours_start}
                onChange={e => set('quiet_hours_start', e.target.value)}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={s.label}>End Time</label>
              <input style={s.input} type="time" value={config.quiet_hours_end}
                onChange={e => set('quiet_hours_end', e.target.value)}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>
          <p style={s.tip}>🌙 No notifications will be sent during quiet hours</p>
        </div>

        {message.text && <div style={s.alert(message.type)}>{message.text}</div>}

        <button type="submit" disabled={saving} style={s.saveBtn(saving)}>
          {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Save size={16} />Save Configuration</>}
        </button>
      </form>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
