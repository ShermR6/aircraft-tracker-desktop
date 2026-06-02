import React, { useState, useEffect } from 'react';
import { Save, Loader, Plus, Trash2, Lock } from 'lucide-react';
import APIService from '../services/api';
import { getLimits } from '../config/tierLimits';

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: '42px', height: '24px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0,
      background: checked ? '#38bdf8' : '#1e2a3a', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  );
}

const s = {
  page: { maxWidth: '860px', margin: '0 auto', paddingBottom: '40px', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  hdr: { marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  hdrMini: { fontSize: '11px', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' },
  hdrTitle: { fontSize: '26px', fontWeight: '800', color: '#f9fafb', margin: '0 0 4px 0' },
  hdrSub: { fontSize: '13px', color: '#6b7280', margin: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, marginTop: '4px' },
  sectionLabel: { fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', display: 'block' },
  section: { marginBottom: '28px' },
  alertRow: { background: '#131b27', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '16px 18px', marginBottom: '10px' },
  alertRowTop: { display: 'flex', alignItems: 'center', gap: '12px' },
  distInput: { width: '62px', padding: '5px 8px', background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: '6px', color: '#f9fafb', fontSize: '15px', fontWeight: '700', textAlign: 'center', outline: 'none', transition: 'border-color 0.15s' },
  nmLabel: { fontSize: '13px', color: '#4b5563', fontWeight: '600' },
  alertNum: { fontSize: '12px', color: '#374151', fontWeight: '500' },
  deleteBtn: { marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#f87171', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' },
  msgLabel: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', marginTop: '14px' },
  textarea: { width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  varsRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 14px', background: '#0d1117', borderRadius: '8px', alignItems: 'center', marginTop: '12px', border: '1px solid #1e2a3a' },
  varLabel: { fontSize: '11px', color: '#4b5563' },
  varChip: { fontSize: '11px', padding: '3px 8px', background: '#131b27', color: '#d1d5db', borderRadius: '4px', fontFamily: 'monospace', border: '1px solid #1e2a3a' },
  landingCard: { background: '#131b27', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '18px' },
  landingTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  landingTitle: { fontSize: '15px', fontWeight: '700', color: '#f9fafb' },
  saveBtn: (saving) => ({
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none', marginTop: '8px',
    background: saving ? '#374151' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
    color: '#fff', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  }),
  toast: (type) => ({
    padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '10px',
    background: type === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
    border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`,
    color: type === 'success' ? '#6ee7b7' : '#fca5a5',
  }),
  infoBox: { marginTop: '20px', padding: '14px 16px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px', fontSize: '13px', color: '#7dd3fc', lineHeight: '1.6' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
  overlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  modal: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '16px', padding: '32px', maxWidth: '380px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },
};

export default function AlertSettings({ isViewOnly = false }) {
  const [alerts, setAlerts] = useState([
    { id: 1, distance: 10, enabled: true, message: '**{tail_number}** – **{distance}nm** from **{airport}**\nETA ~{eta}min, Alt {altitude}ft MSL' },
    { id: 2, distance: 5,  enabled: true, message: '**{tail_number}** – **{distance}nm** from **{airport}**\nETA ~{eta}min, Alt {altitude}ft MSL' },
    { id: 3, distance: 2,  enabled: true, message: '**{tail_number}** – **{distance}nm** from **{airport}**\nETA ~{eta}min, Alt {altitude}ft MSL' },
  ]);
  const [landingAlert, setLandingAlert] = useState({ enabled: true, message: '✅ **{tail_number}** has landed at {airport}' });
  const [takeoffAlert, setTakeoffAlert] = useState({ enabled: true, message: '🛫 **{tail_number}** is airborne — Departed at {speed}kts' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmModal, setConfirmModal] = useState(null);
  const [tier, setTier] = useState('starter');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      APIService.getCurrentUser().then(d => { if (d?.license_tier) setTier(d.license_tier); }).catch(() => {});
      const [alertData, airportConfig] = await Promise.all([
        APIService.getAlertSettings(),
        APIService.getAirportConfig().catch(() => null),
      ]);
      const configDistances = airportConfig?.alert_distances_nm
        ? airportConfig.alert_distances_nm.map(d => parseFloat(d)) : [10, 5, 2];
      const alertMap = {};
      alertData.filter(a => a.alert_type !== 'landing').forEach(a => {
        const dist = parseInt(a.alert_type.replace('nm', ''));
        alertMap[dist] = { enabled: a.enabled, message: a.message_template };
      });
      const merged = configDistances.map((dist, idx) => ({
        id: idx + 1, distance: dist,
        enabled: alertMap[dist]?.enabled ?? true,
        message: alertMap[dist]?.message ?? '**{tail_number}** – **{distance}nm** from **{airport}**\nETA ~{eta}min, Alt {altitude}ft MSL',
      }));
      if (merged.length > 0) setAlerts(merged);
      const landing = alertData.find(a => a.alert_type === 'landing');
      if (landing) setLandingAlert({ enabled: landing.enabled, message: landing.message_template });
      const takeoff = alertData.find(a => a.alert_type === 'takeoff');
      if (takeoff) setTakeoffAlert({ enabled: takeoff.enabled, message: takeoff.message_template });
    } catch { } finally { setLoading(false); }
  };

  const handleAddAlert = () => {
    const limits = getLimits(tier);
    if (alerts.length >= limits.zones) {
      setMessage({ type: 'error', text: `Your ${tier} plan allows up to ${limits.zones} approach zones. Upgrade to add more.` });
      return;
    }
    const newId = Math.max(...alerts.map(a => a.id), 0) + 1;
    setAlerts([...alerts, { id: newId, distance: 15, enabled: true, message: '**{tail_number}** – **{distance}nm** from **{airport}**\nETA ~{eta}min, Alt {altitude}ft MSL' }]);
  };

  const handleRemove = async (id) => {
    if (alerts.length <= 1) { setMessage({ type: 'error', text: 'You must have at least one distance alert.' }); return; }
    try {
      await new Promise((resolve, reject) => setConfirmModal({ onConfirm: resolve, onCancel: reject }));
      setConfirmModal(null);
    } catch { setConfirmModal(null); return; }
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const updateAlert = (id, field, value) => setAlerts(alerts.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      for (const alert of [...alerts].sort((a, b) => b.distance - a.distance)) {
        const dist = parseFloat(alert.distance);
        const distKey = dist === Math.floor(dist) ? `${Math.floor(dist)}nm` : `${dist}nm`;
        await APIService.updateAlertSetting(distKey, alert.enabled, alert.message);
      }
      await APIService.updateAlertSetting('landing', landingAlert.enabled, landingAlert.message);
      await APIService.updateAlertSetting('takeoff', takeoffAlert.enabled, takeoffAlert.message);
      const enabledDistances = alerts.filter(a => a.enabled).map(a => parseFloat(a.distance)).filter(d => !isNaN(d) && d > 0);
      if (enabledDistances.length > 0) {
        const currentConfig = await APIService.getAirportConfig();
        await APIService.updateAirportConfig({ ...currentConfig, alert_distances_nm: enabledDistances });

        // Sync per-aircraft distances: remove any distance no longer in the global list.
        // Aircraft saved while a different global distance set was active can carry stale
        // values (e.g. 15nm) that make the tracker fire alerts the user never configured.
        try {
          const distSet = new Set(enabledDistances);
          const allAircraft = await APIService.getAircraft();
          for (const ac of allAircraft) {
            if (!ac.alert_distances) continue;
            const synced = ac.alert_distances.filter(d => distSet.has(d));
            if (synced.length !== ac.alert_distances.length) {
              await APIService.updateAircraft(
                ac.id, ac.tail_number, ac.icao24,
                ac.friendly_name, ac.aircraft_type,
                synced.length > 0 ? synced : enabledDistances,
              );
            }
          }
        } catch { /* non-critical — alert distances are still saved */ }
      }
      setMessage({ type: 'success', text: 'Alert settings saved.' });
    } catch (error) {
      const detail = error.response?.data?.detail;
      const text = typeof detail === 'string' ? detail : 'Failed to save settings';
      setMessage({ type: 'error', text });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={s.loading}>
      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sortedAlerts = [...alerts].sort((a, b) => b.distance - a.distance);

  return (
    <div style={s.page}>
      {/* Confirm delete modal */}
      {confirmModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>🔔</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', textAlign: 'center', margin: '0 0 8px' }}>Remove Alert</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', margin: '0 0 24px' }}>Remove this distance alert?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => confirmModal.onCancel()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'transparent', border: '1px solid #374151', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => confirmModal.onConfirm()} style={{ flex: 1, padding: '11px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.hdr}>
        <div>
          <p style={s.hdrMini}>Alerts</p>
          <h2 style={s.hdrTitle}>Alert Settings</h2>
          <p style={s.hdrSub}>Configure custom notification distances</p>
        </div>
        {!isViewOnly && (() => {
          const atZoneLimit = alerts.length >= getLimits(tier).zones;
          return (
            <button style={{ ...s.addBtn, opacity: atZoneLimit ? 0.5 : 1, cursor: atZoneLimit ? 'not-allowed' : 'pointer' }}
              onClick={handleAddAlert}
              onMouseEnter={e => { if (!atZoneLimit) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { if (!atZoneLimit) e.currentTarget.style.opacity = '1'; }}>
              {atZoneLimit ? <Lock size={14} /> : <Plus size={14} />}
              {atZoneLimit ? 'Zone limit reached' : 'Add Alert'}
            </button>
          );
        })()}
      </div>

      {/* Toast */}
      {message.text && <div style={s.toast(message.type)}>{message.text}</div>}

      {/* Distance Alerts */}
      <div style={s.section}>
        <span style={s.sectionLabel}>Distance Alerts — {alerts.length} / {getLimits(tier).zones} zones used</span>
        {sortedAlerts.map((alert, index) => (
          <div key={alert.id} style={s.alertRow}>
            <div style={s.alertRowTop}>
              <Toggle checked={alert.enabled} onChange={v => !isViewOnly && updateAlert(alert.id, 'enabled', v)} />
              <input
                style={s.distInput}
                type="number" min="1" max="500"
                value={alert.distance}
                onChange={e => updateAlert(alert.id, 'distance', parseInt(e.target.value) || 1)}
                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                onBlur={e => e.target.style.borderColor = '#1e2a3a'}
                disabled={isViewOnly}
              />
              <span style={s.nmLabel}>nm</span>
              <span style={s.alertNum}>Alert #{index + 1}</span>
              {alerts.length > 1 && !isViewOnly && (
                <button style={s.deleteBtn} onClick={() => handleRemove(alert.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {alert.enabled && (
              <>
                <label style={s.msgLabel}>Custom Message</label>
                <textarea style={s.textarea} rows={2} value={alert.message}
                  onChange={e => updateAlert(alert.id, 'message', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#38bdf8'}
                  onBlur={e => e.target.style.borderColor = '#1e2a3a'}
                  disabled={isViewOnly} />
              </>
            )}
          </div>
        ))}
        <div style={s.varsRow}>
          <span style={s.varLabel}>Variables:</span>
          {['{tail_number}', '{airport}', '{distance}', '{altitude}', '{eta}'].map(v => (
            <span key={v} style={s.varChip}>{v}</span>
          ))}
        </div>
        <div style={{ ...s.varsRow, marginTop: 8 }}>
          <span style={s.varLabel}>Formatting:</span>
          {[
            { syntax: '**bold**', label: 'Bold' },
            { syntax: '_italic_', label: 'Italic' },
            { syntax: '__underline__', label: 'Underline' },
            { syntax: '~~strikethrough~~', label: 'Strike' },
          ].map(f => (
            <span key={f.syntax} style={{ ...s.varChip, color: '#93c5fd' }} title={f.label}>{f.syntax}</span>
          ))}
        </div>
      </div>

      {/* Takeoff Alert */}
      <div style={s.section}>
        <span style={s.sectionLabel}>Takeoff Alert <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,180,0,0.15)', color: '#f5b400', border: '1px solid rgba(245,180,0,0.3)', borderRadius: 999, padding: '1px 6px', marginLeft: 6 }}>Ground Station</span></span>
        <div style={s.landingCard}>
          <div style={s.landingTop}>
            <span style={s.landingTitle}>Alert when aircraft takes off</span>
            <Toggle checked={takeoffAlert.enabled} onChange={v => !isViewOnly && setTakeoffAlert({ ...takeoffAlert, enabled: v })} />
          </div>
          {takeoffAlert.enabled && (
            <>
              <label style={s.msgLabel}>Takeoff Message</label>
              <textarea style={s.textarea} rows={2} value={takeoffAlert.message}
                onChange={e => setTakeoffAlert({ ...takeoffAlert, message: e.target.value })}
                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                onBlur={e => e.target.style.borderColor = '#1e2a3a'}
                disabled={isViewOnly} />
              <div style={{ ...s.varsRow, marginTop: 12 }}>
                <span style={s.varLabel}>Variables:</span>
                {['{tail_number}', '{speed}', '{airport}'].map(v => (
                  <span key={v} style={s.varChip}>{v}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Landing Alert */}
      <div style={s.section}>
        <span style={s.sectionLabel}>Landing Alert</span>
        <div style={s.landingCard}>
          <div style={s.landingTop}>
            <span style={s.landingTitle}>Alert when aircraft lands</span>
            <Toggle checked={landingAlert.enabled} onChange={v => !isViewOnly && setLandingAlert({ ...landingAlert, enabled: v })} />
          </div>
          {landingAlert.enabled && (
            <>
              <label style={s.msgLabel}>Landing Message</label>
              <textarea style={s.textarea} rows={2} value={landingAlert.message}
                onChange={e => setLandingAlert({ ...landingAlert, message: e.target.value })}
                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                onBlur={e => e.target.style.borderColor = '#1e2a3a'}
                disabled={isViewOnly} />
            </>
          )}
        </div>
      </div>

      {!isViewOnly && (
        <button style={s.saveBtn(saving)} onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</>
            : <><Save size={16} />Save Alert Settings</>}
        </button>
      )}

      <div style={s.infoBox}>
        <strong>How variables work:</strong> Use {'{tail_number}'}, {'{airport}'}, {'{distance}'}, {'{altitude}'}, or {'{eta}'} in your messages. The system fills them in with real flight data when sending each notification.
        <br /><br />
        <strong>Formatting:</strong> Discord and Slack support markdown — use <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>**text**</code> for bold, <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>_text_</code> for italic, <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>__text__</code> for underline (Discord only), and <code style={{ background: '#0d1117', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>~~text~~</code> for strikethrough.
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
