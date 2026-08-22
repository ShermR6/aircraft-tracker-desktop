import React, { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import APIService from '../services/api';
import {
  PageHead, Panel, PanelHead, PanelBody, Count, Badge, Button, IconButton,
  Field, Input,
} from '../ui/kit';

const s = {
  codeBlock: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    background: 'var(--panel-2)', border: '1px solid var(--border-soft)',
    borderRadius: 8, padding: '9px 11px',
  },
  codeText: {
    fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)',
    overflowX: 'auto', whiteSpace: 'pre', flex: 1,
  },
  copyBtn: (copied) => ({
    font: 'inherit', fontSize: 11, fontWeight: 600, flexShrink: 0,
    padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid var(--border)', background: 'transparent',
    color: copied ? 'var(--good)' : 'var(--muted)',
  }),
  step: {
    display: 'flex', gap: 12, padding: '13px 0',
    borderBottom: '1px solid var(--border-soft)',
  },
  stepNum: {
    width: 21, height: 21, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
  },
  stepContent: { minWidth: 0, flex: 1 },
  stepTitle: { margin: '1px 0 6px', fontSize: 13, fontWeight: 600 },
  stepDesc: { margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' },
  note: { fontSize: 11.5, color: 'var(--faint)', margin: '12px 0 0', lineHeight: 1.6 },
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
      <button style={s.copyBtn(copied)} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
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
    <>
      <PageHead
        title="Ground Station Setup"
        subtitle="Run your own SDR receiver for hyperlocal coverage"
        right={statusLoading
          ? <Badge>Checking</Badge>
          : isOnline ? <Badge t="good">Online</Badge> : <Badge>Offline</Badge>}
      />

      <Panel>
        <PanelHead
          title="Station status"
          right={
            <Button variant="ghost" onClick={loadStatus} style={{ padding: '5px 11px', fontSize: 12 }}
              icon={<RefreshCw size={13} />}>Refresh</Button>
          }
        />
        <PanelBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {isOnline
              ? <Wifi size={16} color="var(--good)" />
              : <WifiOff size={16} color="var(--faint)" />}
            <span style={{ fontSize: 13.5, fontWeight: 600, color: isOnline ? 'var(--good)' : 'var(--muted)' }}>
              {statusLoading ? 'Checking\u2026' : isOnline ? 'Ground station online' : 'Ground station offline'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>
            {isOnline
              ? `Last heartbeat: ${status?.last_seen ? new Date(status.last_seen).toLocaleTimeString() : 'just now'}`
              : 'No heartbeat received \u2014 the station is not running, or not configured yet.'}
          </p>

          <div style={{ marginTop: 18 }}>
            <Field
              label="Your device key"
              hint="Paste this into the config file on your Pi. Treat it like a password."
            >
              <div style={{ display: 'flex', gap: 9 }}>
                <Input mono readOnly value={showToken ? (deviceKey || '\u2014') : maskedToken} />
                <IconButton
                  tone="neutral"
                  title={showToken ? 'Hide token' : 'Show token'}
                  onClick={() => setShowToken(v => !v)}
                  style={{ width: 34, height: 34, flexShrink: 0 }}
                >{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton>
                <IconButton
                  tone={tokenCopied ? 'good' : 'neutral'}
                  title="Copy token"
                  onClick={copyToken}
                  style={{ width: 34, height: 34, flexShrink: 0 }}
                ><Copy size={15} /></IconButton>
              </div>
            </Field>
          </div>
        </PanelBody>
      </Panel>

      <Panel style={{ marginTop: 14 }}>
        <PanelHead title="Quick setup" right={<Count>Recommended</Count>} />
        <PanelBody>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Run this on your Raspberry Pi. It installs the service, its dependencies, and starts tracking.
          </p>
          <CodeLine code={setupCommand} />
          <p style={s.note}>
            Requires a Raspberry Pi already running dump1090-fa or readsb.
          </p>
        </PanelBody>
      </Panel>

      <Panel style={{ marginTop: 14 }}>
        <PanelHead title="Manual setup" right={<Count>5 steps</Count>} />
        <PanelBody style={{ paddingTop: 4 }}>
          <div style={s.step}>
            <span style={s.stepNum}>1</span>
            <div style={s.stepContent}>
              <h4 style={s.stepTitle}>Download the ground station script</h4>
              <CodeLine code="mkdir -p ~/finalping-ground && cd ~/finalping-ground" />
              <div style={{ marginTop: 8 }} />
              <CodeLine code="curl -sSL https://raw.githubusercontent.com/ShermR6/aircraft-tracker-backend/main/finalping_ground.py -o finalping_ground.py" />
            </div>
          </div>

          <div style={s.step}>
            <span style={s.stepNum}>2</span>
            <div style={s.stepContent}>
              <h4 style={s.stepTitle}>Create the config file</h4>
              <p style={s.stepDesc}>Replace YOUR_TOKEN with the device key above.</p>
              <CodeLine code={`echo '{"token":"YOUR_TOKEN"}' > ~/finalping-ground/config.json`} />
            </div>
          </div>

          <div style={s.step}>
            <span style={s.stepNum}>3</span>
            <div style={s.stepContent}>
              <h4 style={s.stepTitle}>Install dependencies and run</h4>
              <CodeLine code="pip3 install requests" />
              <div style={{ marginTop: 8 }} />
              <CodeLine code="python3 ~/finalping-ground/finalping_ground.py" />
            </div>
          </div>

          <div style={s.step}>
            <span style={s.stepNum}>4</span>
            <div style={s.stepContent}>
              <h4 style={s.stepTitle}>Start automatically on boot</h4>
              <p style={s.stepDesc}>Optional, but recommended for an always-on station.</p>
              <CodeLine code="curl -sSL https://raw.githubusercontent.com/ShermR6/aircraft-tracker-backend/main/finalping-ground.service | sudo tee /etc/systemd/system/finalping-ground.service" />
              <div style={{ marginTop: 8 }} />
              <CodeLine code="sudo systemctl enable --now finalping-ground" />
            </div>
          </div>

          <div style={s.step}>
            <span style={s.stepNum}>5</span>
            <div style={s.stepContent}>
              <h4 style={s.stepTitle}>Point it at your receiver</h4>
              <p style={s.stepDesc}>
                The station polls dump1090 at http://localhost:8080/data/aircraft.json.
                Set DUMP1090_URL if yours differs.
              </p>
            </div>
          </div>

          <p style={s.note}>
            Place the antenna near a window for best range \u2014 the Pi itself can sit anywhere nearby.
          </p>
        </PanelBody>
      </Panel>
    </>
  );
}
