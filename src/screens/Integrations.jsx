import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Save, Trash2, Send, Loader, Check, X } from 'lucide-react';
import APIService from '../services/api';

const INTEGRATION_TYPES = [
  { type: 'discord', name: 'Discord', color: '#5865f2', placeholder: 'https://discord.com/api/webhooks/...', icon: '💬' },
  { type: 'slack', name: 'Slack', color: '#4a154b', placeholder: 'https://hooks.slack.com/services/...', icon: '📱' },
  { type: 'teams', name: 'Microsoft Teams', color: '#6264a7', placeholder: 'https://outlook.office.com/webhook/...', icon: '👥' },
];

const s = {
  page: { maxWidth: '860px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' },
  headerIcon: { width: '48px', height: '48px', background: '#3b82f620', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { fontSize: '26px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' },
  headerSub: { fontSize: '13px', color: '#9ca3af', margin: 0 },
  addGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' },
  addCard: (disabled) => ({
    padding: '20px', borderRadius: '12px', border: `2px dashed ${disabled ? '#2d3748' : '#374151'}`,
    background: disabled ? '#1a2030' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, textAlign: 'center', transition: 'border-color 0.2s',
  }),
  addIcon: { fontSize: '32px', marginBottom: '8px' },
  addName: { fontSize: '14px', fontWeight: '600', color: '#e5e7eb', marginBottom: '4px' },
  addStatus: { fontSize: '12px', color: '#6b7280' },
  card: { background: '#1a2030', border: '1px solid #2d3748', borderRadius: '14px', padding: '24px', marginBottom: '14px' },
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  cardTopLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  typeIcon: (color) => ({ width: '42px', height: '42px', borderRadius: '10px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }),
  typeName: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', margin: '0 0 2px 0' },
  typeDesc: { fontSize: '12px', color: '#9ca3af', margin: 0 },
  cardTopRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  deleteBtn: { background: '#ef444415', border: 'none', borderRadius: '8px', color: '#f87171', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' },
  btnRow: { display: 'flex', gap: '10px' },
  saveBtn: { flex: 1, padding: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  testBtn: (disabled) => ({ flex: 1, padding: '10px', background: disabled ? '#1f2937' : '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: disabled ? '#4b5563' : '#e5e7eb', fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }),
  empty: { textAlign: 'center', padding: '60px 20px', background: '#111827', borderRadius: '14px', border: '1px dashed #2d3748' },
  emptyIcon: { width: '56px', height: '56px', background: '#1a2030', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  emptyText: { fontSize: '16px', fontWeight: '600', color: '#e5e7eb', marginBottom: '6px' },
  emptyHint: { fontSize: '13px', color: '#6b7280' },
  alert: (type) => ({
    padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px',
    background: type === 'success' ? '#34d39920' : '#ef444420',
    border: `1px solid ${type === 'success' ? '#34d39940' : '#ef444440'}`,
    color: type === 'success' ? '#6ee7b7' : '#fca5a5',
  }),
  infoBox: { marginTop: '20px', padding: '14px 16px', background: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '10px', fontSize: '13px', color: '#93c5fd', lineHeight: '1.7' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
};

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '42px', height: '24px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, background: checked ? '#3b82f6' : '#374151', position: 'relative', transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  );
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = async () => {
    try {
      const data = await APIService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (type) => {
    if (integrations.some(i => i.type === type)) return;
    setIntegrations(prev => [...prev, { id: `temp-${Date.now()}`, type, config: { webhook_url: '' }, enabled: true, isNew: true }]);
  };

  const handleUpdate = (id, field, value) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleUpdateWebhook = (id, url) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, config: { ...i.config, webhook_url: url } } : i));

  const handleSave = async (integration) => {
    setMessage({ type: '', text: '' });
    try {
      if (integration.isNew) {
        const saved = await APIService.createIntegration(integration.type, integration.config, integration.enabled);
        setIntegrations(prev => prev.map(i => i.id === integration.id ? saved : i));
      } else {
        await APIService.updateIntegration(integration.id, integration.config, integration.enabled);
      }
      setMessage({ type: 'success', text: 'Integration saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save integration' });
    }
  };

  const handleTest = async (integration) => {
    setTesting(integration.id);
    try {
      await APIService.testIntegration(integration.id);
      setTestResults(prev => ({ ...prev, [integration.id]: 'success' }));
    } catch {
      setTestResults(prev => ({ ...prev, [integration.id]: 'error' }));
    } finally {
      setTesting(null);
      setTimeout(() => setTestResults(prev => ({ ...prev, [integration.id]: null })), 3000);
    }
  };

  const handleDelete = async (integration) => {
    if (!window.confirm(`Remove ${integration.type} integration?`)) return;
    try {
      if (!integration.isNew) await APIService.deleteIntegration(integration.id);
      setIntegrations(prev => prev.filter(i => i.id !== integration.id));
      setMessage({ type: 'success', text: 'Integration removed' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove integration' });
    }
  };

  if (loading) return <div style={s.loading}><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />Loading...</div>;

  const hasIntegration = (type) => integrations.some(i => i.type === type);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}><LinkIcon size={22} color="#60a5fa" /></div>
        <div>
          <h2 style={s.headerTitle}>Integrations</h2>
          <p style={s.headerSub}>Connect notification channels</p>
        </div>
      </div>

      {message.text && <div style={s.alert(message.type)}>{message.text}</div>}

      {/* Add buttons */}
      <div style={s.addGrid}>
        {INTEGRATION_TYPES.map(t => (
          <div key={t.type} style={s.addCard(hasIntegration(t.type))} onClick={() => handleAdd(t.type)}
            onMouseEnter={e => { if (!hasIntegration(t.type)) e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { if (!hasIntegration(t.type)) e.currentTarget.style.borderColor = '#374151'; }}>
            <div style={s.addIcon}>{t.icon}</div>
            <p style={s.addName}>{t.name}</p>
            <p style={s.addStatus}>{hasIntegration(t.type) ? 'Already added' : 'Click to add'}</p>
          </div>
        ))}
      </div>

      {/* Integration cards */}
      {integrations.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}><LinkIcon size={24} color="#4b5563" /></div>
          <p style={s.emptyText}>No integrations yet</p>
          <p style={s.emptyHint}>Click on a service above to get started</p>
        </div>
      ) : (
        integrations.map(integration => {
          const t = INTEGRATION_TYPES.find(t => t.type === integration.type);
          const testResult = testResults[integration.id];
          const isTestDisabled = testing === integration.id || integration.isNew || !integration.config.webhook_url;

          return (
            <div key={integration.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTopLeft}>
                  <div style={s.typeIcon(t.color)}>{t.icon}</div>
                  <div>
                    <p style={s.typeName}>{t.name}</p>
                    <p style={s.typeDesc}>Send notifications to a {t.name} channel</p>
                  </div>
                </div>
                <div style={s.cardTopRight}>
                  <Toggle checked={integration.enabled} onChange={v => handleUpdate(integration.id, 'enabled', v)} />
                  <button style={s.deleteBtn} onClick={() => handleDelete(integration)}
                    onMouseEnter={e => e.currentTarget.style.background = '#ef444425'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ef444415'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <label style={s.label}>Webhook URL</label>
              <input style={s.input} type="url" value={integration.config.webhook_url} placeholder={t.placeholder}
                onChange={e => handleUpdateWebhook(integration.id, e.target.value)}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#374151'} />

              <div style={s.btnRow}>
                <button style={s.saveBtn} onClick={() => handleSave(integration)}>
                  <Save size={14} /> Save
                </button>
                <button style={s.testBtn(isTestDisabled)} onClick={() => !isTestDisabled && handleTest(integration)} disabled={isTestDisabled}>
                  {testing === integration.id ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />Testing...</>
                    : testResult === 'success' ? <><Check size={14} color="#34d399" /><span style={{ color: '#34d399' }}>Success!</span></>
                    : testResult === 'error' ? <><X size={14} color="#f87171" /><span style={{ color: '#f87171' }}>Failed</span></>
                    : <><Send size={14} />Test</>}
                </button>
              </div>
            </div>
          );
        })
      )}

      <div style={s.infoBox}>
        <strong>How to get webhook URLs:</strong><br />
        <strong>Discord:</strong> Server Settings → Integrations → Webhooks → New Webhook<br />
        <strong>Slack:</strong> App Directory → Incoming Webhooks → Add to Slack<br />
        <strong>Teams:</strong> Channel → Connectors → Incoming Webhook → Configure
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
