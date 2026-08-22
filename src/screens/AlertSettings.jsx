import React, { useState, useEffect } from 'react';
import { Save, Loader, Plus, Trash2, Lock } from 'lucide-react';
import APIService from '../services/api';
import {
  PageHead, Panel, PanelHead, PanelBody, Count, Button, IconButton, Field,
  Input, Textarea, Toggle as KitToggle, Notice,
} from '../ui/kit';
import { getLimits } from '../config/tierLimits';

const s = {
  varChip: {
    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
    background: 'var(--panel-2)', border: '1px solid var(--border-soft)',
    borderRadius: 5, padding: '2px 7px',
  },
  code: {
    background: 'var(--panel-2)', border: '1px solid var(--border-soft)',
    borderRadius: 8, padding: '11px 13px', fontFamily: 'var(--font-mono)',
    fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre',
    overflowX: 'auto',
  },
  zoneRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    paddingBottom: 12, marginBottom: 12,
    borderBottom: '1px solid var(--border-soft)',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14,
    padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  },
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 200, color: 'var(--faint)', fontSize: 13, gap: 10,
  },
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
      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading\u2026
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sortedAlerts = [...alerts].sort((a, b) => b.distance - a.distance);
  const zoneLimit = getLimits(tier).zones;
  const atZoneLimit = alerts.length >= zoneLimit;

  return (
    <>
      {confirmModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Trash2 size={17} color="var(--bad)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Remove alert</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 22px' }}>
              Remove this distance alert? Aircraft will no longer notify at this ring.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => confirmModal.onCancel()}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmModal.onConfirm()}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      <PageHead
        title="Alert Settings"
        subtitle="What gets sent, and what it says"
        right={!isViewOnly && (
          <Button onClick={handleSave} disabled={saving} icon={saving
            ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Save size={14} />}>
            {saving ? 'Saving\u2026' : 'Save alert settings'}
          </Button>
        )}
      />

      {message.text && (
        <Notice t={message.type === 'error' ? 'bad' : 'good'}>{message.text}</Notice>
      )}

      <Panel>
        <PanelHead
          title="Distance alerts"
          right={
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Count>{alerts.length} / {zoneLimit} zones</Count>
              {!isViewOnly && (
                <Button
                  variant="ghost" onClick={handleAddAlert} disabled={atZoneLimit}
                  style={{ padding: '5px 11px', fontSize: 12 }}
                  icon={atZoneLimit ? <Lock size={13} /> : <Plus size={13} />}
                >{atZoneLimit ? 'Zone limit reached' : 'Add zone'}</Button>
              )}
            </span>
          }
        />
        <PanelBody>
          {sortedAlerts.map((alert, index) => (
            <div key={alert.id} style={{
              ...s.zoneRow,
              ...(index === sortedAlerts.length - 1 ? { borderBottom: 'none', paddingBottom: 0, marginBottom: 0 } : null),
              flexWrap: 'wrap',
            }}>
              <KitToggle
                on={alert.enabled}
                label={`Alert at ${alert.distance} nm`}
                onClick={() => !isViewOnly && updateAlert(alert.id, 'enabled', !alert.enabled)}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Input
                  mono type="number" min="1" max="500" disabled={isViewOnly}
                  value={alert.distance}
                  onChange={e => updateAlert(alert.id, 'distance', parseInt(e.target.value) || 1)}
                  style={{ width: 74, textAlign: 'center' }}
                />
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>nm</span>
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>Zone {index + 1}</span>

              {alert.enabled && (
                <div style={{ flex: '1 1 100%', marginTop: 4 }}>
                  <Field label="Message">
                    <Textarea
                      mono rows={2} value={alert.message} disabled={isViewOnly}
                      onChange={e => updateAlert(alert.id, 'message', e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {alerts.length > 1 && !isViewOnly && (
                <IconButton tone="bad" title="Remove zone" onClick={() => handleRemove(alert.id)}
                  style={{ marginLeft: 'auto' }}>
                  <Trash2 size={13} />
                </IconButton>
              )}
            </div>
          ))}
        </PanelBody>
      </Panel>

      <Panel style={{ marginTop: 14 }}>
        <PanelHead title="Triggers" />
        <PanelBody style={{ paddingTop: 4, paddingBottom: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '13px 0', borderBottom: '1px solid var(--border-soft)',
          }}>
            <div>
              <h4 style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600 }}>Alert when aircraft lands</h4>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>
                Fires once the aircraft is confirmed on the ground
              </p>
            </div>
            <KitToggle
              on={landingAlert.enabled} label="Landing alert"
              onClick={() => !isViewOnly && setLandingAlert({ ...landingAlert, enabled: !landingAlert.enabled })}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '13px 0',
          }}>
            <div>
              <h4 style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600 }}>
                Alert when aircraft takes off
                <span style={{
                  fontSize: 10, fontWeight: 700, marginLeft: 8, padding: '1px 7px',
                  borderRadius: 999, color: 'var(--warn)', background: 'var(--warn-bg)',
                }}>Ground Station</span>
              </h4>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>
                Fires on wheels-up from your configured airport
              </p>
            </div>
            <KitToggle
              on={takeoffAlert.enabled} label="Takeoff alert"
              onClick={() => !isViewOnly && setTakeoffAlert({ ...takeoffAlert, enabled: !takeoffAlert.enabled })}
            />
          </div>
        </PanelBody>
      </Panel>

      {landingAlert.enabled && (
        <Panel style={{ marginTop: 14 }}>
          <PanelHead title="Landing message" />
          <PanelBody>
            <Field label="Message template">
              <Textarea
                mono rows={2} value={landingAlert.message} disabled={isViewOnly}
                onChange={e => setLandingAlert({ ...landingAlert, message: e.target.value })}
              />
            </Field>
          </PanelBody>
        </Panel>
      )}

      {takeoffAlert.enabled && (
        <Panel style={{ marginTop: 14 }}>
          <PanelHead title="Takeoff message" />
          <PanelBody>
            <Field label="Message template">
              <Textarea
                mono rows={2} value={takeoffAlert.message} disabled={isViewOnly}
                onChange={e => setTakeoffAlert({ ...takeoffAlert, message: e.target.value })}
              />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>Variables:</span>
              {['{tail_number}', '{speed}', '{airport}'].map(v => (
                <span key={v} style={s.varChip}>{v}</span>
              ))}
            </div>
          </PanelBody>
        </Panel>
      )}

      <Panel style={{ marginTop: 14 }}>
        <PanelHead title="Variables and formatting" />
        <PanelBody>
          <div style={s.code}>{`{tail_number}   Tail number, e.g. N884JT
{airport}       ICAO code of your configured airport
{distance}      Distance to the field at trigger time
{altitude}      Barometric altitude in feet
{eta}           Estimated minutes until arrival
{speed}         Ground speed in knots (takeoff only)`}</div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0 9px' }}>
            Discord and Slack render markdown in message bodies:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {[
              { syntax: '**bold**', label: 'Bold' },
              { syntax: '_italic_', label: 'Italic' },
              { syntax: '__underline__', label: 'Underline \u2014 Discord only' },
              { syntax: '~~strikethrough~~', label: 'Strikethrough' },
            ].map(f => (
              <span key={f.syntax} style={{ ...s.varChip, color: 'var(--accent)' }} title={f.label}>
                {f.syntax}
              </span>
            ))}
          </div>
        </PanelBody>
      </Panel>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
