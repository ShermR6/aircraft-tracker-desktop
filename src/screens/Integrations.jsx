import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Save, Trash2, Send, Loader, Check, X, Lock } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';
import { getLimits, getLimitDisplay } from '../config/tierLimits';

const INTEGRATION_TYPES = [
  { type: 'discord', name: 'Discord', color: '#5865f2', placeholder: 'https://discord.com/api/webhooks/...', icon: '💬', field: 'webhook_url', label: 'Webhook URL', inputType: 'url' },
  { type: 'slack', name: 'Slack', color: '#4a154b', placeholder: 'https://hooks.slack.com/services/...', icon: '📱', field: 'webhook_url', label: 'Webhook URL', inputType: 'url' },
  { type: 'teams', name: 'Microsoft Teams', color: '#6264a7', placeholder: 'https://outlook.office.com/webhook/...', icon: '👥', field: 'webhook_url', label: 'Webhook URL', inputType: 'url' },
  { type: 'email', name: 'Email', color: '#0ea5e9', placeholder: 'you@example.com', icon: '✉️', field: 'to_email', label: 'Recipient Email', inputType: 'email' },
  { type: 'sms', name: 'SMS', color: '#10b981', placeholder: '+11234567890', icon: '📲', field: 'to_phone', label: 'Phone Number', inputType: 'tel' },
  { type: 'whatsapp', name: 'WhatsApp', color: '#25d366', placeholder: '+11234567890', icon: '🟢', field: 'to_phone', label: 'Phone Number', inputType: 'tel' },
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
  upgradeBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', background: '#f59e0b10', border: '1px solid #f59e0b30',
    borderRadius: '12px', marginBottom: '20px', gap: '12px',
  },
  upgradeText: { fontSize: '13px', color: '#fcd34d', margin: 0 },
  upgradeLink: {
    fontSize: '12px', fontWeight: '700', color: '#f59e0b',
    background: '#f59e0b15', border: '1px solid #f59e0b30',
    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px', gap: '10px' },
};

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '42px', height: '24px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, background: checked ? '#3b82f6' : '#374151', position: 'relative', transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  );
}

export default function Integrations({ isViewOnly = false }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tier, setTier] = useState('starter');
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string, name: string }
  const [pendingAddType, setPendingAddType] = useState(null);

  useEffect(() => {
    loadIntegrations();
    StorageService.getUserData().then(d => { if (d?.license_tier) setTier(d.license_tier); });
  }, []);

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
    const limits = getLimits(tier);
    if (integrations.length >= limits.integrations) {
      setMessage({ type: 'error', text: `Your ${tier} plan allows up to ${getLimitDisplay(limits.integrations)} notification channel${limits.integrations === 1 ? '' : 's'}. Upgrade to add more.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    // Show charges warning for SMS and WhatsApp before adding
    if (type === 'sms' || type === 'whatsapp') {
      setPendingAddType(type);
      setShowChargesModal(true);
      return;
    }
    addIntegration(type);
  };

  const addIntegration = (type) => {
    const emptyConfig = type === 'email' ? { to_email: '' } :
                        (type === 'sms' || type === 'whatsapp') ? { to_phone: '' } :
                        { webhook_url: '' };
    setIntegrations(prev => [...prev, { id: `temp-${Date.now()}`, type, config: emptyConfig, enabled: true, isNew: true }]);
  };

  const handleUpdate = (id, field, value) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleUpdateWebhook = (id, url) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, config: { ...i.config, webhook_url: url } } : i));
  const handleUpdateEmail = (id, email) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, config: { ...i.config, to_email: email } } : i));

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
    const name = integration.type.charAt(0).toUpperCase() + integration.type.slice(1);
    try {
      await APIService.testIntegration(integration.id);
      setTestResults(prev => ({ ...prev, [integration.id]: 'success' }));
      setToast({ type: 'success', text: `Test notification sent to ${name} successfully!`, name });
    } catch {
      setTestResults(prev => ({ ...prev, [integration.id]: 'error' }));
      setToast({ type: 'error', text: `${name} test failed — check your settings and try again.`, name });
    } finally {
      setTesting(null);
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [integration.id]: null }));
        setToast(null);
      }, 6000);
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
  const limits = getLimits(tier);
  const atLimit = integrations.length >= limits.integrations;

  return (
    <div style={s.page}>
      {/* Test result toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '14px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#0f2a1a' : '#2a0f0f',
          border: `1px solid ${toast.type === 'success' ? '#34d39940' : '#ef444440'}`,
          color: toast.type === 'success' ? '#34d399' : '#f87171',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxWidth: 360,
          animation: 'slideIn 0.2s ease',
        }}>
          <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.text}
        </div>
      )}
      <style>{`
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* SMS / WhatsApp charges warning modal */}
      {showChargesModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#0f1117', border: '1px solid #2d3748',
            borderRadius: 16, padding: 32, maxWidth: 440, width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: 'center' }}>
              {pendingAddType === 'whatsapp' ? '🟢' : '📲'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: '0 0 12px 0', textAlign: 'center' }}>
              {pendingAddType === 'whatsapp' ? 'WhatsApp' : 'SMS'} Messaging Charges
            </h2>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 16px 0' }}>
              By enabling {pendingAddType === 'whatsapp' ? 'WhatsApp' : 'SMS'} alerts, you acknowledge that:
            </p>
            <ul style={{ fontSize: 13, color: '#9ca3af', lineHeight: 2, margin: '0 0 20px 0', paddingLeft: 20 }}>
              <li>Standard carrier <strong style={{ color: '#e5e7eb' }}>messaging rates may apply</strong> depending on your mobile plan.</li>
              <li>FinalPing uses Twilio to deliver messages — <strong style={{ color: '#e5e7eb' }}>message frequency depends on aircraft activity</strong> and your configured alert distances.</li>
              <li>You are responsible for any charges incurred by your carrier.</li>
              <li>You can disable {pendingAddType === 'whatsapp' ? 'WhatsApp' : 'SMS'} alerts at any time from this screen.</li>
            </ul>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 24, fontStyle: 'italic' }}>
              Reply STOP to any message to unsubscribe immediately.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowChargesModal(false); setPendingAddType(null); }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 8,
                  background: 'transparent', border: '1px solid #374151',
                  color: '#9ca3af', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addIntegration(pendingAddType);
                  setShowChargesModal(false);
                  setPendingAddType(null);
                }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px #3b82f640',
                }}
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div style={s.headerIcon}><LinkIcon size={22} color="#60a5fa" /></div>
        <div>
          <h2 style={s.headerTitle}>Integrations</h2>
          <p style={s.headerSub}>
            {integrations.length} / {getLimitDisplay(limits.integrations)} channels connected
            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tier}
            </span>
          </p>
        </div>
      </div>

      {message.text && <div style={s.alert(message.type)}>{message.text}</div>}

      {/* Upgrade banner */}
      {atLimit && (
        <div style={s.upgradeBox}>
          <p style={s.upgradeText}>
            🔒 You've reached the <strong>{tier}</strong> plan limit of <strong>{getLimitDisplay(limits.integrations)} channel{limits.integrations === 1 ? '' : 's'}</strong>. Upgrade to add more.
          </p>
          <span
            style={s.upgradeLink}
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}
          >
            Upgrade Plan →
          </span>
        </div>
      )}

      {/* Add buttons — hidden for view-only */}
      {!isViewOnly && (
        <div style={s.addGrid}>
          {INTEGRATION_TYPES.map(t => {
            const alreadyAdded = hasIntegration(t.type);
            const disabled = alreadyAdded || atLimit;
            return (
              <div key={t.type} style={s.addCard(disabled)} onClick={() => handleAdd(t.type)}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = '#3b82f6'; }}
                onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = '#374151'; }}>
                <div style={s.addIcon}>{atLimit && !alreadyAdded ? <Lock size={24} color="#6b7280" /> : t.icon}</div>
                <p style={s.addName}>{t.name}</p>
                <p style={s.addStatus}>{alreadyAdded ? 'Already added' : atLimit ? 'Upgrade to add' : 'Click to add'}</p>
              </div>
            );
          })}
        </div>
      )}

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
          const isEmailType = integration.type === 'email';
          const isPhoneType = integration.type === 'sms' || integration.type === 'whatsapp';
          const fieldValue = isEmailType ? integration.config.to_email : 
                             isPhoneType ? integration.config.to_phone :
                             integration.config.webhook_url;
          const isTestDisabled = testing === integration.id || integration.isNew || !fieldValue;

          return (
            <div key={integration.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardTopLeft}>
                  <div style={s.typeIcon(t.color)}>{t.icon}</div>
                  <div>
                    <p style={s.typeName}>{t.name}</p>
                    <p style={s.typeDesc}>{isEmailType ? 'Send alert emails to an inbox' : isPhoneType ? `Send alerts via ${t.name}` : `Send notifications to a ${t.name} channel`}</p>
                  </div>
                </div>
                <div style={s.cardTopRight}>
                  {!isViewOnly && (
                    <>
                      <Toggle checked={integration.enabled} onChange={v => handleUpdate(integration.id, 'enabled', v)} />
                      <button style={s.deleteBtn} onClick={() => handleDelete(integration)}
                        onMouseEnter={e => e.currentTarget.style.background = '#ef444425'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ef444415'}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <label style={s.label}>{t.label}</label>
              <input
                style={{ ...s.input, fontFamily: (isEmailType || isPhoneType) ? "'Segoe UI', sans-serif" : 'monospace' }}
                type={t.inputType}
                value={fieldValue}
                placeholder={t.placeholder}
                onChange={e => isEmailType
                  ? handleUpdateEmail(integration.id, e.target.value)
                  : isPhoneType
                  ? setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, config: { ...i.config, to_phone: e.target.value } } : i))
                  : handleUpdateWebhook(integration.id, e.target.value)}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#374151'}
              />

              {!isViewOnly && (
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
              )}
            </div>
        );
      })
      )}

      <div style={s.infoBox}>
        <strong>How to set up integrations:</strong><br />
        <strong>Discord:</strong> Server Settings → Integrations → Webhooks → New Webhook<br />
        <strong>Slack:</strong> App Directory → Incoming Webhooks → Add to Slack<br />
        <strong>Teams:</strong> Channel → Connectors → Incoming Webhook → Configure<br />
        <strong>Email:</strong> Enter any email address — alerts will be sent from noreply@finalpingapp.com<br />
        <strong>SMS & WhatsApp:</strong> Enter your phone number with country code (e.g. +11234567890) — powered by Twilio
      </div>
      
    </div>
  );
}
