import React, { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { padding: '32px 0' },
  header: { marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: '0 0 6px 0' },
  subtitle: { fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 },

  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '20px 24px',
    marginBottom: 16,
  },

  cardTitle: { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0ea5e9', marginBottom: 14 },

  statusRow: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: (online) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: online ? '#22c55e' : '#4b5563',
    boxShadow: online ? '0 0 8px #22c55e80' : 'none',
    flexShrink: 0,
  }),
  statusText: (online) => ({ fontSize: 14, fontWeight: 600, color: online ? '#22c55e' : '#6b7280' }),
  statusSub: { fontSize: 12, color: '#4b5563', marginLeft: 18, marginTop: 4 },

  tokenRow: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 },
  tokenBox: {
    flex: 1, background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '9px 12px', fontFamily: 'monospace',
    fontSize: 12, color: '#9ca3af', overflow: 'hidden', whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '8px 10px', color: '#9ca3af', cursor: 'pointer',
    display: 'flex', alignItems: 'center', flexShrink: 0,
    transition: 'all 0.15s',
  },

  step: { display: 'flex', gap: 14, marginBottom: 18 },
  stepNum: {
    width: 24, height: 24, borderRadius: '50%',
    background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#0ea5e9', flexShrink: 0, marginTop: 1,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: 600, color: '#f9fafb', marginBottom: 4 },
  stepDesc: { fontSize: 12, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 },
  codeBlock: {
    background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace',
    fontSize: 11, color: '#7dd3fc', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  codeText: { flex: 1, wordBreak: 'break-all', lineHeight: 1.5 },

  copyBtn: (copied) => ({
    background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)',
    border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(14,165,233,0.2)'}`,
    borderRadius: 6, padding: '4px 10px', color: copied ? '#22c55e' : '#0ea5e9',
    cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0,
    transition: 'all 0.15s',
  }),

  refreshBtn: {
    background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 0',
    marginTop: 10,
  },
  note: {
    fontSize: 11, color: '#4b5563', lineHeight: 1.6,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 8, padding: '10px 14px', marginTop: 12,
  },
};

function CodeLine({ code, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={s.codeBlock}>
      <span style={s.codeText}>{code}</span>
      <button style={s.copyBtn(copied)} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
    </div>
  );
}

export default function GroundStationSetup() {
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = () => {
    setStatusLoading(true);
    APIService.getGroundStationStatus()
      .then(data => { setStatus(data); setStatusLoading(false); })
      .catch(() => { setStatus(null); setStatusLoading(false); });
  };

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 30000);
    return () => clearInterval(id);
  }, []);

  const deviceKey = status?.gs_device_key || null;

  const copyToken = () => {
    if (!deviceKey) return;
    navigator.clipboard.writeText(deviceKey).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  const isOnline = status?.online === true;
  const maskedToken = deviceKey ? deviceKey.slice(0, 8) + '••••••••••••••••••••••••' : '—';
  const setupCommand = deviceKey
    ? `curl -sSL https://raw.githubusercontent.com/ShermR6/aircraft-tracker-backend/main/setup.sh | sudo bash -s -- "${deviceKey}"`
    : 'Loading...';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Ground Station Setup</h2>
        <p style={s.subtitle}>Connect your FinalPing hardware to your account for live ground tracking.</p>
        <div style={{ fontSize: 12, color: '#fcd34d', marginTop: 8, display: 'flex', gap: 6 }}>
          <span>💡</span> Place the antenna near a window for best range — the Pi can sit anywhere nearby.
        </div>
      </div>

      {/* Status */}
      <div style={s.card}>
        <div style={s.cardTitle}>Station Status</div>
        {statusLoading ? (
          <div style={{ fontSize: 13, color: '#4b5563' }}>Checking...</div>
        ) : (
          <>
            <div style={s.statusRow}>
              <div style={s.statusDot(isOnline)} />
              {isOnline
                ? <Wifi size={15} color="#22c55e" />
                : <WifiOff size={15} color="#4b5563" />
              }
              <span style={s.statusText(isOnline)}>
                {isOnline ? 'Ground station online' : 'Ground station offline'}
              </span>
            </div>
            <div style={s.statusSub}>
              {isOnline
                ? `Last heartbeat: ${status?.last_seen ? new Date(status.last_seen).toLocaleTimeString() : 'just now'}`
                : 'No heartbeat received — station not running or not configured yet.'}
            </div>
          </>
        )}
        <button style={s.refreshBtn} onClick={loadStatus}>
          <RefreshCw size={12} /> Refresh status
        </button>
      </div>

      {/* One-liner setup */}
      <div style={s.card}>
        <div style={s.cardTitle}>Quick Setup</div>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px 0', lineHeight: 1.6 }}>
          Run this command on your Raspberry Pi. It installs everything automatically.
        </p>
        <CodeLine code={setupCommand} />
        <div style={s.note}>
          Requires Raspberry Pi with dump1090-fa or readsb already running.
          The script creates the service, installs dependencies, and starts tracking.
        </div>
      </div>

      {/* Manual setup steps */}
      <div style={s.card}>
        <div style={s.cardTitle}>Manual Setup</div>

        <div style={s.step}>
          <div style={s.stepNum}>1</div>
          <div style={s.stepContent}>
            <div style={s.stepTitle}>Your device key</div>
            <div style={s.stepDesc}>This is your permanent ground station key. Used for manual setup — the hotspot portal claims it automatically.</div>
            <div style={s.tokenRow}>
              <div style={s.tokenBox}>{showToken ? (deviceKey || '—') : maskedToken}</div>
              <button
                style={s.iconBtn}
                onClick={() => setShowToken(v => !v)}
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                style={{ ...s.iconBtn, color: tokenCopied ? '#22c55e' : '#9ca3af' }}
                onClick={copyToken}
                title="Copy token"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </div>

        <div style={s.step}>
          <div style={s.stepNum}>2</div>
          <div style={s.stepContent}>
            <div style={s.stepTitle}>Download the ground station script</div>
            <div style={s.stepDesc}>On your Pi:</div>
            <CodeLine code="mkdir -p ~/finalping-ground && cd ~/finalping-ground" />
            <div style={{ marginTop: 8 }} />
            <CodeLine code="curl -sSL https://raw.githubusercontent.com/ShermR6/aircraft-tracker-backend/main/finalping_ground.py -o finalping_ground.py" />
          </div>
        </div>

        <div style={s.step}>
          <div style={s.stepNum}>3</div>
          <div style={s.stepContent}>
            <div style={s.stepTitle}>Create config file</div>
            <div style={s.stepDesc}>Replace YOUR_TOKEN with the token from step 1.</div>
            <CodeLine code={`echo '{"token":"YOUR_TOKEN"}' > ~/finalping-ground/config.json`} />
          </div>
        </div>

        <div style={s.step}>
          <div style={s.stepNum}>4</div>
          <div style={s.stepContent}>
            <div style={s.stepTitle}>Install dependencies and run</div>
            <CodeLine code="pip3 install requests" />
            <div style={{ marginTop: 8 }} />
            <CodeLine code="python3 ~/finalping-ground/finalping_ground.py" />
          </div>
        </div>

        <div style={s.step}>
          <div style={s.stepNum}>5</div>
          <div style={s.stepContent}>
            <div style={s.stepTitle}>Run as a background service (optional)</div>
            <div style={s.stepDesc}>To start automatically on boot:</div>
            <CodeLine code="curl -sSL https://raw.githubusercontent.com/ShermR6/aircraft-tracker-backend/main/finalping-ground.service | sudo tee /etc/systemd/system/finalping-ground.service" />
            <div style={{ marginTop: 8 }} />
            <CodeLine code="sudo systemctl enable finalping-ground && sudo systemctl start finalping-ground" />
          </div>
        </div>

        <div style={s.note}>
          The ground station polls dump1090 at <code style={{ color: '#7dd3fc' }}>http://localhost:8080/data/aircraft.json</code>.
          Override with the <code style={{ color: '#7dd3fc' }}>DUMP1090_URL</code> environment variable if your setup differs.
        </div>
      </div>
    </div>
  );
}
