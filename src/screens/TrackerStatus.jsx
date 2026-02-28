import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Radio, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import StorageService from '../services/storage';

const s = {
  card: {
    background: '#1a2030',
    border: '1px solid #2d3748',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '20px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '20px',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  iconWrap: (running) => ({
    width: '44px', height: '44px', borderRadius: '12px',
    background: running ? '#34d39920' : '#3b82f620',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }),
  title: { fontSize: '18px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' },
  subtitle: { fontSize: '12px', color: '#9ca3af', margin: 0 },
  statusBadge: (running) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    background: running ? '#34d39920' : '#374151',
    border: `1px solid ${running ? '#34d39940' : '#4b5563'}`,
    color: running ? '#34d399' : '#9ca3af',
  }),
  dot: (running) => ({
    width: '7px', height: '7px', borderRadius: '50%',
    background: running ? '#34d399' : '#6b7280',
    animation: running ? 'pulse 2s ease-in-out infinite' : 'none',
  }),
  btnRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  startBtn: (disabled) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '11px 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#1f2937' : 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: disabled ? '#4b5563' : '#fff',
    transition: 'opacity 0.2s',
  }),
  stopBtn: (disabled) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '11px 20px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#1f2937' : '#ef444420',
    color: disabled ? '#4b5563' : '#f87171',
    border: disabled ? '1px solid #2d3748' : '1px solid #ef444440',
  }),
  logBox: {
    background: '#0f1117',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '14px',
    height: '220px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.7',
  },
  logEmpty: {
    color: '#4b5563', textAlign: 'center',
    marginTop: '80px', fontSize: '13px',
  },
  logLine: (text) => ({
    color: text.startsWith('⚠') ? '#fbbf24'
         : text.startsWith('✓') ? '#34d399'
         : text.startsWith('✗') ? '#f87171'
         : text.startsWith('🛬') ? '#60a5fa'
         : '#9ca3af',
    margin: 0, padding: '1px 0',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  }),
  errorBox: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '12px 14px', borderRadius: '10px', marginBottom: '14px',
    background: '#ef444415', border: '1px solid #ef444430', color: '#fca5a5', fontSize: '13px',
  },
  infoRow: {
    display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap',
  },
  infoChip: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '5px 12px', borderRadius: '8px',
    background: '#111827', border: '1px solid #1f2937',
    fontSize: '12px', color: '#9ca3af',
  },
};

export default function TrackerStatus() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    // Get initial status
    if (window.electronAPI) {
      window.electronAPI.trackerStatus().then((status) => {
        setRunning(status.running);
        setLogs(status.logs || []);
      });

      // Subscribe to live updates from main process
      window.electronAPI.onTrackerStatus((status) => {
        setRunning(status.running);
        setLogs(status.logs || []);
        if (status.error) setError(status.error);
      });

      return () => window.electronAPI.offTrackerStatus();
    }
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      // Get the stored auth token
      const token = await window.electronAPI.storeGet('auth_token');
      if (!token) {
        setError('Not logged in. Please log out and log back in.');
        setLoading(false);
        return;
      }
      const result = await window.electronAPI.trackerStart(token);
      if (!result.success) {
        setError(result.error || 'Failed to start tracker.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setError('');
    const result = await window.electronAPI.trackerStop();
    if (!result.success) setError(result.error);
  };

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleRow}>
          <div style={s.iconWrap(running)}>
            <Radio size={20} color={running ? '#34d399' : '#60a5fa'} />
          </div>
          <div>
            <p style={s.title}>Live Tracker</p>
            <p style={s.subtitle}>Real-time ADS-B monitoring</p>
          </div>
        </div>
        <div style={s.statusBadge(running)}>
          <div style={s.dot(running)} />
          {running ? 'Running' : 'Stopped'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div style={s.btnRow}>
        <button
          style={s.startBtn(running || loading)}
          onClick={handleStart}
          disabled={running || loading}
        >
          {loading
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />Starting...</>
            : <><Play size={15} />Start Tracker</>
          }
        </button>
        <button
          style={s.stopBtn(!running)}
          onClick={handleStop}
          disabled={!running}
        >
          <Square size={15} />
          Stop Tracker
        </button>
      </div>

      {/* Live log */}
      <div style={s.logBox} ref={logRef}>
        {logs.length === 0
          ? <p style={s.logEmpty}>No activity yet. Start the tracker to see live output.</p>
          : logs.map((line, i) => (
              <p key={i} style={s.logLine(line.text)}>
                <span style={{ color: '#4b5563', marginRight: '8px' }}>{line.time}</span>
                {line.text}
              </p>
            ))
        }
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
