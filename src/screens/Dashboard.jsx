import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Plane, Link as LinkIcon, LogOut, Bell, MapPin, LayoutDashboard } from 'lucide-react';
import StorageService from '../services/storage';
import AirportConfig from './AirportConfig';
import AlertSettings from './AlertSettings';
import Integrations from './Integrations';
import AccountDashboard from './AccountDashboard';
import AircraftManager from './AircraftManager';

const s = {
  shell: {
    display: 'flex', height: '100vh', background: '#0f1117',
    fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: 'hidden',
  },
  sidebar: {
    width: '220px', minWidth: '220px', background: '#141824',
    borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  logoArea: {
    padding: '20px 16px', borderBottom: '1px solid #1f2937',
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  logoIcon: {
    width: '38px', height: '38px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoTitle: { fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: 0 },
  logoEmail: {
    fontSize: '11px', color: '#6b7280', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px',
  },
  nav: { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' },
  navLink: (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
    fontSize: '13px', fontWeight: active ? '600' : '500',
    color: active ? '#fff' : '#9ca3af',
    background: active ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
    transition: 'all 0.15s',
  }),
  sidebarBottom: { padding: '12px 10px', borderTop: '1px solid #1f2937' },
  tierBadge: {
    padding: '10px 12px', background: '#1a2030', borderRadius: '8px',
    marginBottom: '8px', border: '1px solid #1f2937',
  },
  tierLabel: { fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' },
  tierValue: { fontSize: '13px', fontWeight: '600', color: '#a78bfa', textTransform: 'capitalize' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '9px 12px', background: 'none', border: 'none', borderRadius: '8px',
    color: '#f87171', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
  },
  main: { flex: 1, overflow: 'auto', background: '#0f1117' },
  content: { padding: '32px' },
};

export default function Dashboard({ onLogout }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const data = await StorageService.getUserData();
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await onLogout();
    }
  };

  if (loading) {
    return (
      <div style={{ ...s.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9ca3af', fontSize: '14px' }}>Loading dashboard...</div>
      </div>
    );
  }

  const path = location.pathname;

  return (
    <div style={s.shell}>
      <div style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}><Plane size={18} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <p style={s.logoTitle}>FinalPing</p>
            <p style={s.logoEmail}>{userData?.email}</p>
          </div>
        </div>

        <nav style={s.nav}>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={path === '/dashboard' || path === '/dashboard/'} />
          <NavItem to="/dashboard/aircraft" icon={Plane} label="Aircraft" active={path === '/dashboard/aircraft'} />
          <NavItem to="/dashboard/airport" icon={MapPin} label="Airport Config" active={path === '/dashboard/airport'} />
          <NavItem to="/dashboard/alerts" icon={Bell} label="Alerts" active={path === '/dashboard/alerts'} />
          <NavItem to="/dashboard/integrations" icon={LinkIcon} label="Integrations" active={path === '/dashboard/integrations'} />
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.tierBadge}>
            <p style={s.tierLabel}>License</p>
            <p style={s.tierValue}>{userData?.license_tier || 'Unknown'}</p>
          </div>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => e.currentTarget.style.background = '#ef444415'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.content}>
          <Routes>
            <Route path="/" element={<AccountDashboard />} />
            <Route path="/aircraft" element={<AircraftManager />} />
            <Route path="/airport" element={<AirportConfig />} />
            <Route path="/alerts" element={<AlertSettings />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      style={s.navLink(active)}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#1f2937'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}
