import React, { useState, useEffect } from 'react';
import { User, Shield, Calendar, Plane, Zap, RefreshCw } from 'lucide-react';
import APIService from '../services/api';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { marginBottom: '32px' },
  headerTitle: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  headerSub: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { background: 'linear-gradient(135deg, #1e2538 0%, #1a2030 100%)', border: '1px solid #2d3748', borderRadius: '16px', padding: '24px' },
  cardAccent: (color) => ({ background: `linear-gradient(135deg, ${color}15 0%, #1a2030 100%)`, border: `1px solid ${color}30`, borderRadius: '16px', padding: '24px' }),
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  iconBox: (color) => ({ width: '44px', height: '44px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  badge: (color) => ({ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', background: `${color}20`, color, border: `1px solid ${color}30` }),
  cardLabel: { fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },
  cardValue: { fontSize: '22px', fontWeight: '700', color: '#f9fafb', margin: 0 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1f2937' },
  rowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' },
  rowLabel: { fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' },
  rowValue: { fontSize: '13px', fontWeight: '600', color: '#e5e7eb' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }),
  refreshBtn: { background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px' },
  tierColors: { enterprise: '#a78bfa', school: '#34d399', single: '#60a5fa' },
};

const tierColor = (tier) => s.tierColors[tier] || '#60a5fa';

export default function AccountDashboard() {
  const [user, setUser] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [userData, aircraftData] = await Promise.all([
        APIService.getCurrentUser(),
        APIService.getAircraft(),
      ]);
      setUser(userData);
      setAircraft(aircraftData || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading your dashboard...</div>;

  const color = tierColor(user?.license_tier);
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={s.page}>
      <div style={{ ...s.header, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={s.headerTitle}>Account Dashboard</h2>
          <p style={s.headerSub}>Your account overview and system status</p>
        </div>
        <button style={s.refreshBtn} onClick={() => loadData(true)}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      <div style={s.grid}>
        <div style={s.cardAccent(color)}>
          <div style={s.cardTop}>
            <div style={s.iconBox(color)}><Shield size={20} color={color} /></div>
            <span style={s.badge(color)}>{user?.license_tier || 'unknown'}</span>
          </div>
          <p style={s.cardLabel}>License Tier</p>
          <p style={{ ...s.cardValue, color }}>
            {user?.license_tier ? user.license_tier.charAt(0).toUpperCase() + user.license_tier.slice(1) : '—'}
          </p>
        </div>

        <div style={s.cardAccent('#38bdf8')}>
          <div style={s.cardTop}>
            <div style={s.iconBox('#38bdf8')}><Plane size={20} color="#38bdf8" /></div>
            <span style={s.badge('#38bdf8')}>{aircraft.length} tracked</span>
          </div>
          <p style={s.cardLabel}>Aircraft</p>
          <p style={{ ...s.cardValue, color: '#38bdf8' }}>{aircraft.length}</p>
        </div>

        <div style={s.cardAccent('#34d399')}>
          <div style={s.cardTop}>
            <div style={s.iconBox('#34d399')}><Zap size={20} color="#34d399" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={s.statusDot('#34d399')} />
              <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>Online</span>
            </div>
          </div>
          <p style={s.cardLabel}>Backend Status</p>
          <p style={{ ...s.cardValue, color: '#34d399' }}>Active</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={s.card}>
          <p style={s.sectionTitle}><User size={16} color="#9ca3af" />Account Details</p>
          <div style={s.row}>
            <span style={s.rowLabel}>Email</span>
            <span style={{ ...s.rowValue, color: '#a5b4fc', fontSize: '12px' }}>{user?.email || '—'}</span>
          </div>
          <div style={s.row}>
            <span style={s.rowLabel}>User ID</span>
            <span style={{ ...s.rowValue, fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
              {user?.id ? user.id.slice(0, 8) + '...' : '—'}
            </span>
          </div>
          <div style={s.row}>
            <span style={s.rowLabel}><Calendar size={13} />Member Since</span>
            <span style={s.rowValue}>{joinDate}</span>
          </div>
          <div style={s.rowLast}>
            <span style={s.rowLabel}>License Tier</span>
            <span style={{ ...s.rowValue, color }}>{user?.license_tier || '—'}</span>
          </div>
        </div>

        <div style={s.card}>
          <p style={s.sectionTitle}><Plane size={16} color="#9ca3af" />Tracked Aircraft</p>
          {aircraft.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '8px' }}>
              No aircraft added yet. Go to the Aircraft tab to add one.
            </p>
          ) : (
            aircraft.map((a, i) => (
              <div key={a.id} style={i < aircraft.length - 1 ? s.row : s.rowLast}>
                <span style={s.rowLabel}>
                  <div style={s.statusDot('#34d399')} />
                  {a.tail_number}
                </span>
                <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                  {a.icao24 || 'No ICAO'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
