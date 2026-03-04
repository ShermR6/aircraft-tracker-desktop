import React, { useState, useEffect } from 'react';
import { Radio, CheckCircle } from 'lucide-react';
import APIService from '../services/api';

export default function TrackerStatus() {
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    try {
      await APIService.healthCheck();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  };

  const online = backendOnline === true;
  const color = online ? '#34d399' : backendOnline === false ? '#f87171' : '#6b7280';
  const label = online ? 'Active' : backendOnline === false ? 'Offline' : 'Checking...';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)',
      border: `1px solid ${color}30`,
      borderRadius: '14px',
      padding: '18px 24px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Radio size={20} color={color} />
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' }}>Cloud Tracker</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Monitoring your aircraft 24/7 — no action needed</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: `${color}15`, border: `1px solid ${color}30` }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: color,
          boxShadow: online ? `0 0 6px ${color}` : 'none',
          animation: online ? 'trackerPulse 2s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color }}>{label}</span>
      </div>

      <style>{`@keyframes trackerPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
