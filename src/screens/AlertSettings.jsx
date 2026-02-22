import React, { useState, useEffect } from 'react';
import { Bell, Save, Loader, Plus, Trash2 } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { maxWidth: '860px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: '40px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { width: '48px', height: '48px', background: '#3b82f620', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { fontSize: '26px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' },
  headerSub: { fontSize: '13px', color: '#9ca3af', margin: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  card: { background: '#1a2030', border: '1px solid #2d3748', borderRadius: '14px', padding: '24px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', marginBottom: '20px' },
  cardTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  alertRow: { background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '16px', marginBottom: '12px' },
  alertRowTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  alertRowLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  distanceGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  distanceLabel: { fontSize: '13px', fontWeight: '600', color: '#e5e7eb' },
  distanceInput: { width: '70px', padding: '6px 10px', background: '#1a2030', border: '1px solid #374151', borderRadius: '6px', color: '#f9fafb', fontSize: '14px', textAlign: 'center', outline: 'none' },
  nmLabel: { fontSize: '13px', color: '#9ca3af' },
  deleteBtn: { background: '#ef444415', border: 'none', borderRadius: '6px', color: '#f87171', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' },
  textarea: { width: '100%', padding: '10px 14px', background: '#1a2030', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  varsRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', padding: '12px', background: '#0f1117', borderRadius: '8px', alignItems: 'center' },
  varLabel: { fontSize: '11px', color: '#6b7280' },
  varChip: { fontSize: '11px', padding: '3px 8px', background: '#1f2937', color: '#d1d5db', borderRadius: '4px', fontFamily: 'monospace' },
  toggle: { position: 'relative', display: 'inline-block', width: '42px', height: '24px', flexShrink: 0 },
  toggleInput: { opacity: 0, width: 0, height: 0, position: 'absolute' },
  saveBtn: (saving) => ({
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none', marginTop: '16px',
    background: saving ? '#374151' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  }),
  alert: (type) => ({
    padding: '12px 16px', borderRadius: '10px', marginTop: '16px', fontSize: '13px',
    background: type === 'success' ? '#34d39920' : '#ef444420',
    border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`,
    color: type === 'success' ? '#6ee7b7' : '#fca5a5',
  }),
  infoBox: { marginTop: '16px', padding: '14px 16px', background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '10px', fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
};

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '42px', height: '24px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0,
        background: checked ? '#3b82f6' : '#374151', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  );
}

export default function AlertSettings() {
  const [alerts, setAlerts] = useState([
    { id: 1, distance: 10, enabled: true, message: '✈️ {tail_number} detected {distance}nm from {airport}' },
    { id: 2, distance: 5, enabled: true, message: '🛬 {tail_number} approaching - {distance}nm from {airport}' },
    { id: 3, distance: 2, enabled: true, message: '⚠️ {tail_number} on final - {distance}nm from {airport}' }
  ]);
  const [landingAlert, setLandingAlert] = useState({ enabled: true, message: '✅ {tail_number} has landed at {airport}' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const alertData = await APIService.getAlertSettings();
      const distanceAlerts = alertData.filter(a => a.alert_type !== 'landing')
        .map((a, idx) => ({ id: idx + 1, distance: parseInt(a.alert_type.replace('nm', '')), enabled: a.enabled, message: a.message_template }));
      if (distanceAlerts.length > 0) setAlerts(distanceAlerts);
      const landing = alertData.find(a => a.alert_type === 'landing');
      if (landing) setLandingAlert({ enabled: landing.enabled, message: landing.message_template });
    } catch (error) {
      console.log('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = () => {
    const newId = Math.max(...alerts.map(a => a.id), 0) + 1;
    setAlerts([...alerts, { id: newId, distance: 15, enabled: true, message: '✈️ {tail_number} is {distance}nm from {airport}' }]);
  };

  const handleRemove = (id) => {
    if (alerts.length <= 1) { setMessage({ type: 'error', text: 'You must have at least one distance alert!' }); return; }
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const updateAlert = (id, field, value) => setAlerts(alerts.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      for (const alert of [...alerts].sort((a, b) => b.distance - a.distance)) {
        await APIService.updateAlertSetting(`${alert.distance}nm`, alert.enabled, alert.message);
      }
      await APIService.updateAlertSetting('landing', landingAlert.enabled, landingAlert.message);
      setMessage({ type: 'success', text: 'Alert settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={s.loading}><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...</div>;
  }

  const sortedAlerts = [...alerts].sort((a, b) => b.distance - a.distance);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}><Bell size={22} color="#60a5fa" /></div>
          <div>
            <h2 style={s.headerTitle}>Alert Settings</h2>
            <p style={s.headerSub}>Configure custom notification distances</p>
          </div>
        </div>
        <button style={s.addBtn} onClick={handleAddAlert}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Plus size={15} /> Add Alert
        </button>
      </div>

      {/* Distance Alerts */}
      <div style={s.card}>
        <p style={s.cardTitle}>Distance Alerts</p>
        {sortedAlerts.map((alert, index) => (
          <div key={alert.id} style={s.alertRow}>
            <div style={s.alertRowTop}>
              <div style={s.alertRowLeft}>
                <Toggle checked={alert.enabled} onChange={v => updateAlert(alert.id, 'enabled', v)} />
                <div style={s.distanceGroup}>
                  <span style={s.distanceLabel}>Alert #{index + 1}:</span>
                  <input style={s.distanceInput} type="number" min="1" max="200" value={alert.distance}
                    onChange={e => updateAlert(alert.id, 'distance', parseInt(e.target.value) || 1)}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#374151'} />
                  <span style={s.nmLabel}>nm</span>
                </div>
              </div>
              {alerts.length > 1 && (
                <button style={s.deleteBtn} onClick={() => handleRemove(alert.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#ef444425'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ef444415'}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {alert.enabled && (
              <div>
                <label style={s.label}>Custom Message</label>
                <textarea style={s.textarea} rows={2} value={alert.message}
                  onChange={e => updateAlert(alert.id, 'message', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#374151'} />
              </div>
            )}
          </div>
        ))}
        <div style={s.varsRow}>
          <span style={s.varLabel}>Available variables:</span>
          {['{tail_number}', '{airport}', '{distance}', '{altitude}'].map(v => (
            <span key={v} style={s.varChip}>{v}</span>
          ))}
        </div>
      </div>

      {/* Landing Alert */}
      <div style={s.card}>
        <div style={s.cardTitleRow}>
          <p style={{ ...s.cardTitle, margin: 0 }}>Landing Alert</p>
          <Toggle checked={landingAlert.enabled} onChange={v => setLandingAlert({ ...landingAlert, enabled: v })} />
        </div>
        {landingAlert.enabled && (
          <div>
            <label style={s.label}>Landing Message</label>
            <textarea style={s.textarea} rows={2} value={landingAlert.message}
              onChange={e => setLandingAlert({ ...landingAlert, message: e.target.value })}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#374151'} />
          </div>
        )}
      </div>

      {message.text && <div style={s.alert(message.type)}>{message.text}</div>}

      <button style={s.saveBtn(saving)} onClick={handleSave} disabled={saving}>
        {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Save size={16} />Save Alert Settings</>}
      </button>

      <div style={s.infoBox}>
        <strong>💡 How variables work:</strong> Type {'{tail_number}'}, {'{airport}'}, {'{distance}'}, or {'{altitude}'} in your messages. The system automatically replaces them with real data when sending notifications.
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
