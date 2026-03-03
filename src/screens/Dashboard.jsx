import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Plane, Link as LinkIcon, LogOut, Bell, MapPin, LayoutDashboard, Map } from 'lucide-react';
import StorageService from '../services/storage';
import AirportConfig from './AirportConfig';
import AlertSettings from './AlertSettings';
import Integrations from './Integrations';
import AccountDashboard from './AccountDashboard';
import AircraftManager from './AircraftManager';
import TrackerStatus from './TrackerStatus';
import LiveMap from './LiveMap';

const s = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: '#0b0b0b',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    overflow: 'hidden',
  },
  sidebar: {
    width: '220px',
    minWidth: '220px',
    background: 'linear-gradient(180deg, #0d1117 0%, #0b0b0b 100%)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  sidebarGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '200px',
    background: 'radial-gradient(ellipse at 50% -20%, rgba(14,165,233,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logoArea: {
    padding: '20px 16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'relative',
    zIndex: 1,
  },
  logoTop: {
    fontSize: '8px', fontWeight: '700', letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#6b7280', lineHeight: 1, marginBottom: '2px',
  },
  logoMain: {
    fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em',
    color: '#f9fafb', lineHeight: 1.1,
  },
  logoLine: {
    display: 'block', width: '40px', height: '2px',
    background: 'linear-gradient(90deg, #0ea5e9, transparent)',
    borderRadius: '999px', marginTop: '4px', marginBottom: '12px',
  },
  logoEmail: {
    fontSize: '11px', color: '#4b5563',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nav: {
    flex: 1, padding: '12px 10px',
    display: 'flex', flexDirection: 'column', gap: '2px',
    overflowY: 'auto', position: 'relative', zIndex: 1,
  },
  navSection: {
    fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#374151', padding: '8px 12px 4px',
  },
  navLink: (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
    fontSize: '13px', fontWeight: active ? '600' : '500',
    color: active ? '#e0f2fe' : '#6b7280',
    background: active ? 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(2,132,199,0.08))' : 'transparent',
    border: active ? '1px solid rgba(14,165,233,0.22)' : '1px solid transparent',
    boxShadow: active ? '0 0 20px rgba(14,165,233,0.08)' : 'none',
    transition: 'all 0.15s',
  }),
  navDot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: '#0ea5e9', boxShadow: '0 0 6px rgba(14,165,233,0.8)',
    marginLeft: 'auto', flexShrink: 0,
  },
  sidebarBottom: {
    padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)',
    position: 'relative', zIndex: 1,
  },
  tierBadge: {
    padding: '10px 14px',
    background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(2,132,199,0.04))',
    borderRadius: '10px', marginBottom: '8px',
    border: '1px solid rgba(14,165,233,0.15)',
  },
  tierLabel: {
    fontSize: '10px', color: '#4b5563',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px',
  },
  tierValue: { fontSize: '13px', fontWeight: '700', color: '#0ea5e9', textTransform: 'capitalize' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '9px 12px', background: 'none', border: '1px solid transparent',
    borderRadius: '10px', color: '#6b7280', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
  },
  main: {
    flex: 1, overflow: 'auto',
    background: 'radial-gradient(ellipse 100% 50% at 50% -10%, #0d1f2d 0%, #0b0b0b 60%)',
  },
  content: { padding: '32px', maxWidth: '960px' },
};

function DashboardHome() {
  return (
    <>
      <TrackerStatus />
      <AccountDashboard />
    </>
  );
}

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
      if (window.electronAPI) await window.electronAPI.trackerStop();
      await onLogout();
    }
  };

  if (loading) {
    return (
      <div style={{ ...s.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4b5563', fontSize: '13px' }}>Loading...</div>
      </div>
    );
  }

  const path = location.pathname;

  return (
    <div style={s.shell}>
      <div style={s.sidebar}>
        <div style={s.sidebarGlow} />

        <div style={s.logoArea}>
          <div style={s.logoTop}>Aircraft Alerts</div>
          <div style={s.logoMain}>FinalPing</div>
          <span style={s.logoLine} />
          <div style={s.logoEmail}>{userData?.email}</div>
        </div>

        <nav style={s.nav}>
          <div style={s.navSection}>Menu</div>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={path === '/dashboard' || path === '/dashboard/'} />
          <NavItem to="/dashboard/aircraft" icon={Plane} label="Aircraft" active={path === '/dashboard/aircraft'} />
          <NavItem to="/dashboard/map" icon={Map} label="Live Map" active={path === '/dashboard/map'} />
          <NavItem to="/dashboard/airport" icon={MapPin} label="Airport Config" active={path === '/dashboard/airport'} />
          <NavItem to="/dashboard/alerts" icon={Bell} label="Alerts" active={path === '/dashboard/alerts'} />
          <NavItem to="/dashboard/integrations" icon={LinkIcon} label="Integrations" active={path === '/dashboard/integrations'} />
        </nav>

        <div style={s.sidebarBottom}>
          <div style={s.tierBadge}>
            <div style={s.tierLabel}>License</div>
            <div style={s.tierValue}>{userData?.license_tier || 'Unknown'}</div>
          </div>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
              e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'none';
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.content}>
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/aircraft" element={<AircraftManager />} />
            <Route path="/map" element={<LiveMap />} />
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
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.color = '#9ca3af';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#6b7280';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      <Icon size={14} />
      {label}
      {active && <span style={s.navDot} />}
    </Link>
  );
}
