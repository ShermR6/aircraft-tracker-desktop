import React, { useState, useEffect } from 'react';
import { User, Shield, Calendar, Plane, Zap, RefreshCw, Bell, AlertTriangle, Clock, CreditCard, ExternalLink } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { marginBottom: '24px' },
  headerTitle: { fontSize: '28px', fontWeight: '700', color: '#f9fafb', margin: '0 0 4px 0' },
  headerSub: { fontSize: '14px', color: '#9ca3af', margin: 0 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
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
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#f9fafb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  statusDot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }),
  refreshBtn: { background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280', fontSize: '14px' },
  alertRow: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1f2937' },
  alertRowLast: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0' },
  alertIcon: (type) => ({ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: type === 'landing' ? '#34d39920' : '#38bdf820', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  alertTail: { fontSize: '13px', fontWeight: '700', color: '#f9fafb', marginBottom: '2px' },
  alertType: { fontSize: '11px', color: '#6b7280' },
  alertTime: { fontSize: '11px', color: '#4b5563', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 },
  emptyLog: { textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '13px' },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function alertTypeLabel(type) {
  if (type === 'landing') return 'Landed';
  if (type?.includes('nm')) return `${type} alert`;
  return type || 'Alert';
}

function integrationIcon(type) {
  const icons = { discord: '🎮', slack: '💬', teams: '🟦', email: '📧' };
  return icons[type] || '🔔';
}

export default function AccountDashboard() {
  const [user, setUser] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [liveAircraft, setLiveAircraft] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
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

      // Set expiry from API response (most up to date)
      const expiryValue = userData?.expires_at || userData?.expiry_date || userData?.license_expires_at || userData?.expiry;
      if (expiryValue) setExpiresAt(new Date(expiryValue));
      else {
        // Fallback to local storage
        const stored = await StorageService.getUserData();
        const storedExpiry = stored?.expires_at || stored?.expiry_date || stored?.license_expires_at;
        if (storedExpiry) setExpiresAt(new Date(storedExpiry));
      }

      // Fetch live status (non-critical)
      try {
        const liveData = await APIService.getLiveAircraft();
        setLiveAircraft(liveData || []);
      } catch { /* silently skip */ }

      // Load notifications and stats (non-critical)
      try {
        const [notifData, statsData] = await Promise.all([
          APIService.getRecentNotifications(8),
          APIService.getNotificationStats(),
        ]);
        setNotifications(notifData || []);
        setStats(statsData || null);
      } catch {
        // Silently skip if endpoints not available yet
      }



    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBillingPortal = async () => {
    window.electronAPI?.openExternal('https://finalpingapp.com/dashboard?tab=billing');
  };

  if (loading) return <div style={s.loading}>Loading your dashboard...</div>;

  const color = '#60a5fa';
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  // Expiry warning
  let expiryWarning = null;
  if (expiresAt) {
    const msLeft = expiresAt - Date.now();
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    if (msLeft <= 0) expiryWarning = { label: 'expired', daysLeft: 0, urgent: true, expired: true };
    else if (hoursLeft < 24) expiryWarning = { label: `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`, daysLeft: 0, urgent: true };
    else if (daysLeft <= 7) expiryWarning = { label: `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, daysLeft, urgent: daysLeft <= 2 };
  }

  return (
    <div style={s.page}>
      {/* Header */}
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

      {/* Expiry warning banner */}
      {expiryWarning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
          background: expiryWarning.urgent ? '#ef444415' : '#f59e0b10',
          border: `1px solid ${expiryWarning.urgent ? '#ef444430' : '#f59e0b30'}`,
        }}>
          <AlertTriangle size={16} color={expiryWarning.urgent ? '#f87171' : '#fbbf24'} />
          <p style={{ fontSize: '13px', color: expiryWarning.urgent ? '#fca5a5' : '#fcd34d', margin: 0, flex: 1 }}>
            {expiryWarning.expired
              ? 'Your license has expired. Renew to continue receiving alerts.'
              : `Your license expires in ${expiryWarning.label}. Renew soon to avoid interruption.`
            }
          </p>
          <span
            style={{ fontSize: '12px', fontWeight: '700', color: expiryWarning.urgent ? '#f87171' : '#fbbf24', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}
          >
            Renew →
          </span>
        </div>
      )}

      {/* Top stats row */}
      <div style={s.grid3}>
        <div style={s.cardAccent(color)}>
          <div style={s.cardTop}>
            <div style={s.iconBox(color)}><Shield size={20} color={color} /></div>
            <span style={s.badge(color)}>{user?.license_tier ? user.license_tier.charAt(0).toUpperCase() + user.license_tier.slice(1) : 'Unknown'}</span>
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

      {/* Alert stats + Account details */}
      <div style={s.grid2}>
        <div style={s.card}>
          <p style={s.sectionTitle}><Bell size={15} color="#9ca3af" />Alert Activity</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Today', value: stats?.today ?? '—' },
              { label: 'This Week', value: stats?.this_week ?? '—' },
              { label: 'All Time', value: stats?.total ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#111827', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid #1f2937' }}>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#f9fafb', margin: '0 0 2px 0' }}>{value}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <p style={s.sectionTitle}><User size={15} color="#9ca3af" />Account Details</p>
          <div style={s.row}>
            <span style={s.rowLabel}>Email</span>
            <span style={{ ...s.rowValue, color: '#a5b4fc', fontSize: '12px' }}>{user?.email || '—'}</span>
          </div>
          <div style={s.row}>
            <span style={s.rowLabel}><Calendar size={13} />Member Since</span>
            <span style={s.rowValue}>{joinDate}</span>
          </div>
          <div style={s.row}>
            <span style={s.rowLabel}>License</span>
            <span style={{ ...s.rowValue, color }}>{user?.license_tier ? user.license_tier.charAt(0).toUpperCase() + user.license_tier.slice(1) : '—'}</span>
          </div>
          <div style={s.rowLast}>
            <span style={s.rowLabel}><Clock size={13} />Expires</span>
            <span style={{ ...s.rowValue, fontSize: '12px', color: expiryWarning?.urgent ? '#f87171' : '#e5e7eb' }}>
              {expiresAt ? expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1f2937' }}>
            <button
              onClick={handleBillingPortal}
              disabled={false}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '10px', border: '1px solid #3b82f630',
                background: '#3b82f610', color: '#60a5fa', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3b82f620')}
              onMouseLeave={e => (e.currentTarget.style.background = '#3b82f610')}
            >
              <CreditCard size={14} />
              Manage Subscription
              <ExternalLink size={12} color="#4b5563" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent alerts + Aircraft list */}
      <div style={s.grid2}>
        <div style={s.card}>
          <p style={s.sectionTitle}><Bell size={15} color="#9ca3af" />Recent Alerts</p>
          {notifications.length === 0 ? (
            <div style={s.emptyLog}>
              <Bell size={24} color="#2d3748" style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>No alerts sent yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Alerts will appear here once the tracker runs</p>
            </div>
          ) : (
            notifications.map((n, i) => (
              <div key={n.id} style={i < notifications.length - 1 ? s.alertRow : s.alertRowLast}>
                <div style={s.alertIcon(n.alert_type)}>
                  <Plane size={14} color={n.alert_type === 'landing' ? '#34d399' : '#38bdf8'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.alertTail}>{n.aircraft_tail}</div>
                  <div style={s.alertType}>
                    {alertTypeLabel(n.alert_type)} · {integrationIcon(n.integration_type)} {n.integration_type}
                  </div>
                </div>
                <div style={s.alertTime}>{timeAgo(n.sent_at)}</div>
              </div>
            ))
          )}
        </div>

        <div style={s.card}>
          <p style={s.sectionTitle}><Plane size={15} color="#9ca3af" />Tracked Aircraft</p>
          {aircraft.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '8px' }}>
              No aircraft added yet. Go to the Aircraft tab to add one.
            </p>
          ) : (
            aircraft.map((a, i) => {
              const live = liveAircraft.find(l => l.icao24 === a.icao24 || l.tail_number === a.tail_number);
              const hasPosition = live && (live.latitude || live.distance_nm > 0);
              const isOnGround = live && live.on_ground;
              const isAirborne = hasPosition && !isOnGround;
              const dotColor = isAirborne ? '#34d399' : isOnGround ? '#f87171' : '#6b7280';
              const statusLabel = isAirborne ? 'Airborne' : isOnGround ? 'On Ground' : 'Not Detected';
              return (
                <div key={a.id} style={i < aircraft.length - 1 ? s.row : s.rowLast}>
                  <span style={s.rowLabel}>
                    <div style={{ ...s.statusDot(dotColor), animation: isAirborne ? 'acPulse 2s ease-in-out infinite' : 'none' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '600' }}>{a.tail_number}</div>
                      {a.friendly_name && <div style={{ fontSize: '11px', color: '#6b7280' }}>{a.friendly_name}</div>}
                    </div>
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>{a.icao24 || 'No ICAO'}</div>
                    <div style={{ fontSize: '11px', color: dotColor, marginTop: '2px', fontWeight: '600' }}>{statusLabel}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes acPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
