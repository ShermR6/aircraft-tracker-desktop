import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane, Link as LinkIcon, LogOut, Bell, MapPin, LayoutDashboard, Map, ScrollText, CheckCircle, Circle, ArrowRight, X, MessageSquare, BookOpen, Radio, AlertTriangle } from 'lucide-react';
import StorageService from '../services/storage';
import APIService from '../services/api';
import AirportConfig from './AirportConfig';
import AlertSettings from './AlertSettings';
import Integrations from './Integrations';
import DashboardHome from './DashboardHome';
import AircraftManager from './AircraftManager';
import LiveMap from './LiveMap';
import Logs from './Logs';
import GroundStationSetup from './GroundStationSetup';

const ONBOARDING_STEPS = [
  {
    key: 'location',
    Icon: MapPin,
    title: 'Set your location',
    desc: 'Configure your airport or FBO coordinates so FinalPing knows where to watch for aircraft.',
    action: 'Go to Airport Config',
    route: '/dashboard/airport',
  },
  {
    key: 'aircraft',
    Icon: Plane,
    title: 'Add your first aircraft',
    desc: 'Enter a tail number and ICAO24 code for each aircraft you want to track.',
    action: 'Go to Aircraft',
    route: '/dashboard/aircraft',
  },
  {
    key: 'integration',
    Icon: Bell,
    title: 'Connect a notification channel',
    desc: 'Link Discord, Slack, Teams, email, or SMS so alerts reach you instantly.',
    action: 'Go to Integrations',
    route: '/dashboard/integrations',
  },
];

function OnboardingModal({ onClose, onNavigate, completedSteps }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;
  const stepComplete = completedSteps.includes(step.key);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, width: 480, maxWidth: '90%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
              Welcome to FinalPing
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              Get set up in 3 steps
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--faint)',
            cursor: 'pointer', padding: 4, borderRadius: 6,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', padding: '16px 24px 0', gap: 8 }}>
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.key} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: i <= currentStep ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: '24px 24px 8px' }}>
          <div style={{ marginBottom: 16, color: 'var(--accent)' }}><step.Icon size={28} /></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Step {currentStep + 1} — {step.title}
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
            {step.desc}
          </p>

          {/* All steps list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: i === currentStep ? 'rgba(14,165,233,0.08)' : 'transparent',
                border: `1px solid ${i === currentStep ? 'rgba(14,165,233,0.2)' : 'transparent'}`,
              }}>
                {completedSteps.includes(s.key)
                  ? <CheckCircle size={16} color="var(--good)" />
                  : i === currentStep
                    ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', flexShrink: 0 }} />
                    : <Circle size={16} color="var(--faint)" />
                }
                <span style={{
                  fontSize: 13, fontWeight: i === currentStep ? 600 : 400,
                  color: completedSteps.includes(s.key) ? 'var(--good)' : i === currentStep ? 'var(--text)' : 'var(--faint)',
                }}>
                  {s.title}
                </span>
                {completedSteps.includes(s.key) && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--good)' }}>Done ✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button
            onClick={() => onNavigate(step.route)}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: 'var(--accent)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
            }}
          >
            {stepComplete ? 'Go again' : step.action} <ArrowRight size={14} />
          </button>
          {!isLast && (
            <button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!stepComplete}
              style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'transparent',
                border: `1px solid ${stepComplete ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                color: stepComplete ? 'var(--muted)' : 'var(--faint)',
                fontSize: 14, cursor: stepComplete ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
              title={stepComplete ? '' : 'Complete this step first'}
            >
              Next
            </button>
          )}
          {isLast && (
            <button
              onClick={onClose}
              disabled={!stepComplete}
              style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'transparent',
                border: `1px solid ${stepComplete ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                color: stepComplete ? 'var(--muted)' : 'var(--faint)',
                fontSize: 14, cursor: stepComplete ? 'pointer' : 'not-allowed',
              }}
              title={stepComplete ? '' : 'Complete this step first'}
            >
              Finish
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 16, fontSize: 11, color: 'var(--faint)' }}>
          You can always find these in the sidebar
        </div>
      </div>
    </div>
  );
}

const isWindows = window.electronAPI?.platform === 'win32';

const s = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    minWidth: 220,
    background: 'var(--sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoArea: {
    padding: '22px 16px 18px',
    borderBottom: '1px solid var(--border-soft)',
    WebkitAppRegion: 'drag',
  },
  logoTop: {
    fontSize: 8, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--faint)',
    lineHeight: 1, marginBottom: 3,
  },
  logoMain: {
    fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
    color: 'var(--text)', lineHeight: 1.1,
  },
  logoLine: {
    display: 'block', width: 26, height: 2,
    background: 'var(--accent)', borderRadius: 999, margin: '5px 0 11px',
  },
  logoEmail: {
    fontSize: 11, color: 'var(--faint)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  nav: {
    flex: 1, padding: '12px 10px',
    display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto',
  },
  // Active state is a tinted row with an inset accent rail — no gradient, no glow.
  navLink: (active) => ({
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '9px 11px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13, fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent)' : 'var(--muted)',
    background: active ? 'var(--accent-soft)' : 'transparent',
    boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
    transition: 'background 0.15s, color 0.15s',
  }),
  sidebarBottom: {
    padding: 10, borderTop: '1px solid var(--border-soft)',
    display: 'flex', flexDirection: 'column', gap: 1,
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '8px 11px', background: 'none', border: 'none',
    borderRadius: 7, color: 'var(--faint)', fontSize: 12,
    fontWeight: 500, cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  },
  version: {
    fontSize: 10, color: 'var(--faint)', textAlign: 'center',
    marginTop: 7, letterSpacing: '0.05em', opacity: 0.7,
    fontFamily: 'var(--font-mono)',
  },
  main: {
    flex: 1, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg)',
  },
  // 36px clears the frameless window controls that float over the top-right,
  // so content can use symmetric horizontal padding instead of a 150px gutter.
  content: { padding: '24px 28px 32px', overflowY: 'auto', flex: 1 },
  dragStrip: {
    height: 36, flexShrink: 0, WebkitAppRegion: 'drag',
  },
};

export default function Dashboard({ onLogout }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [visitedRoutes, setVisitedRoutes] = useState(new Set());
  const [connectionLost, setConnectionLost] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const onboardingChecked = React.useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track visited routes and mark steps complete when user returns to dashboard
  useEffect(() => {
    const currentPath = location.pathname;

    // Record which step routes have been visited
    ONBOARDING_STEPS.forEach(step => {
      if (currentPath === step.route) {
        setVisitedRoutes(prev => new Set([...prev, step.key]));
      }
    });

    // When user returns to dashboard, mark any visited step routes as complete
    if (currentPath === '/dashboard' || currentPath === '/dashboard/') {
      setVisitedRoutes(prev => {
        if (prev.size > 0) {
          setCompletedSteps(current => {
            const newCompleted = [...new Set([...current, ...prev])];
            return newCompleted;
          });
        }
        return prev;
      });
    }
  }, [location.pathname]);

  useEffect(() => { loadUserData(); }, []);

  // Hourly display_name sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await StorageService.getUserData().catch(() => null);
      if (data) syncFreshUserData(data);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for connection state changes from axios interceptor
  useEffect(() => {
    const unsubscribe = APIService.onConnectionChange((connected) => {
      setConnectionLost(!connected);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    window.electronAPI?.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
  }, []);

  const syncFreshUserData = async (data) => {
    try {
      const fresh = await APIService.getCurrentUser();
      if (!fresh) return;
      const nameChanged = fresh.display_name !== undefined && fresh.display_name !== data?.display_name;
      const tierChanged = fresh.license_tier && fresh.license_tier !== data?.license_tier;
      if (nameChanged || tierChanged) {
        const updated = { ...data, license_tier: fresh.license_tier || data?.license_tier, display_name: fresh.display_name ?? data?.display_name };
        await StorageService.setUserData(updated);
        setUserData(updated);
      }
    } catch { }
  };

  const loadUserData = async () => {
    try {
      const data = await StorageService.getUserData();
      setUserData(data);
      syncFreshUserData(data);

      // Only check onboarding once per session using a ref
      if (!onboardingChecked.current) {
        onboardingChecked.current = true;
        const onboardingKey = `onboardingComplete_${data?.email || 'default'}`;
        const onboardingDone = await window.electronAPI?.storeGet(onboardingKey);
        if (!onboardingDone) {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOnboarding = async () => {
    const onboardingKey = `onboardingComplete_${userData?.email || 'default'}`;
    await window.electronAPI?.storeSet(onboardingKey, true);
    setShowOnboarding(false);
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    if (window.electronAPI) await window.electronAPI.trackerStop();
    await onLogout();
  };

  if (loading) {
    return (
      <div style={{ ...s.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--faint)', fontSize: '13px' }}>Loading...</div>
      </div>
    );
  }

  const path = location.pathname;

  const isViewOnly = !userData?.license_tier || userData.license_tier === 'free';

  return (
    <div style={s.shell}>
      {showOnboarding && (path === '/dashboard' || path === '/dashboard/') && (
        <OnboardingModal
          onClose={handleCloseOnboarding}
          onNavigate={(route) => { navigate(route); }}
          completedSteps={completedSteps}
        />
      )}

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px 28px 24px', width: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <LogOut size={18} color='var(--bad)' />
              <span style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 700 }}>Log out</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 22px' }}>Are you sure you want to log out of FinalPing?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={confirmLogout}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--bad)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >Log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Connection lost banner */}
      {connectionLost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--panel-2)',
          borderBottom: '1px solid rgba(239,68,68,0.3)',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, fontSize: 12, color: 'var(--muted)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={14} color="var(--bad)" /><strong style={{ color: 'var(--bad)' }}>Connection lost</strong> — unable to reach the server.</span>
        </div>
      )}

      {/* View-only banner for free accounts */}
      {isViewOnly && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9997,
          background: 'var(--panel-2)',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, fontSize: 12, color: 'var(--muted)',
        }}>
          <span>👀 You&apos;re in <strong style={{ color: 'var(--warn)' }}>view-only mode</strong> — purchase a license to start tracking aircraft.</span>
          <button
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}
            style={{
              padding: '4px 14px', borderRadius: 999,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              color: 'var(--warn)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            View Plans →
          </button>
        </div>
      )}
      <div style={s.sidebar}>
        <div style={s.logoArea}>
          <div style={s.logoTop}>Aircraft Alerts</div>
          <div style={s.logoMain}>FinalPing</div>
          <span style={s.logoLine} />
          <div style={s.logoEmail}>{userData?.display_name || userData?.email}</div>
        </div>

        <nav style={s.nav}>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={path === '/dashboard' || path === '/dashboard/'} />
          <NavItem to="/dashboard/aircraft" icon={Plane} label="Aircraft" active={path === '/dashboard/aircraft'} />
          <NavItem to="/dashboard/map" icon={Map} label="Live Map" active={path === '/dashboard/map'} />
          <NavItem to="/dashboard/airport" icon={MapPin} label="Airport Config" active={path === '/dashboard/airport'} />
          <NavItem to="/dashboard/alerts" icon={Bell} label="Alerts" active={path === '/dashboard/alerts'} />
          <NavItem to="/dashboard/integrations" icon={LinkIcon} label="Integrations" active={path === '/dashboard/integrations'} />
          {userData?.license_tier === 'team' && (
            <NavItem to="/dashboard/team" icon={Users} label="Team" active={path === '/dashboard/team'} />
          )}
          <NavItem to="/dashboard/logs" icon={ScrollText} label="Logs" active={path === '/dashboard/logs'} />
          <NavItem to="/dashboard/ground-station" icon={Radio} label="Ground Station" active={path === '/dashboard/ground-station'} />
        </nav>

        <div style={s.sidebarBottom}>
          <button
            style={s.logoutBtn}
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/docs')}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-soft)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--faint)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'none';
            }}
          >
            <BookOpen size={14} /> Help Center
          </button>
          <button
            style={s.logoutBtn}
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/contact')}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-soft)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--faint)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'none';
            }}
          >
            <MessageSquare size={14} /> Send Feedback
          </button>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--bad)';
              e.currentTarget.style.borderColor = 'var(--bad)';
              e.currentTarget.style.background = 'var(--bad-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--faint)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'none';
            }}
          >
            <LogOut size={14} /> Logout
          </button>
          <div style={s.version}>{appVersion ? `v${appVersion}` : ''}</div>
        </div>
      </div>

      {/* Invisible drag strip — spans the full top of the window */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 36, WebkitAppRegion: 'drag', zIndex: 9999, pointerEvents: 'none' }} />

      <div style={{ ...s.main, paddingTop: (connectionLost ? 36 : 0) + (isViewOnly ? 36 : 0) }}>
        <div style={s.dragStrip} />
        <Routes>
          {/* Full-bleed routes — no maxWidth, no padding wrapper */}
          <Route path="/map" element={<LiveMap />} />
          <Route path="/airport" element={<div style={s.content}><AirportConfig isViewOnly={isViewOnly} /></div>} />
          {/* Standard padded routes */}
          <Route path="/" element={<div style={s.content}><DashboardHome /></div>} />
          <Route path="/aircraft" element={<div style={s.content}><AircraftManager isViewOnly={isViewOnly} /></div>} />
          <Route path="/alerts" element={<div style={s.content}><AlertSettings isViewOnly={isViewOnly} /></div>} />
          <Route path="/integrations" element={<div style={s.content}><Integrations isViewOnly={isViewOnly} /></div>} />
          <Route path="/logs" element={<div style={s.content}><Logs /></div>} />
          <Route path="/ground-station" element={<div style={s.content}><GroundStationSetup /></div>} />
        </Routes>
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
          e.currentTarget.style.background = 'var(--row-hover)';
          e.currentTarget.style.color = 'var(--text)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--muted)';
        }
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }} />
      {label}
    </Link>
  );
}
