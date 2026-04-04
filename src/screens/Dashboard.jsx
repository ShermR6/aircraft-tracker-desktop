import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane, Link as LinkIcon, LogOut, Bell, MapPin, LayoutDashboard, Map, ScrollText, CheckCircle, Circle, ArrowRight, X } from 'lucide-react';
import StorageService from '../services/storage';
import AirportConfig from './AirportConfig';
import AlertSettings from './AlertSettings';
import Integrations from './Integrations';
import AccountDashboard from './AccountDashboard';
import AircraftManager from './AircraftManager';
import TrackerStatus from './TrackerStatus';
import LiveMap from './LiveMap';
import Logs from './Logs';

const ONBOARDING_STEPS = [
  {
    key: 'location',
    icon: '📍',
    title: 'Set your location',
    desc: 'Configure your airport or FBO coordinates so FinalPing knows where to watch for aircraft.',
    action: 'Go to Airport Config',
    route: '/dashboard/airport',
  },
  {
    key: 'aircraft',
    icon: '✈️',
    title: 'Add your first aircraft',
    desc: 'Enter a tail number and ICAO24 code for each aircraft you want to track.',
    action: 'Go to Aircraft',
    route: '/dashboard/aircraft',
  },
  {
    key: 'integration',
    icon: '🔔',
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
        background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)',
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0ea5e9', marginBottom: 4 }}>
              Welcome to FinalPing
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb' }}>
              Get set up in 3 steps
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#4b5563',
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
              background: i <= currentStep ? '#0ea5e9' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: '24px 24px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{step.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>
            Step {currentStep + 1} — {step.title}
          </div>
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, marginBottom: 24 }}>
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
                  ? <CheckCircle size={16} color="#22d3a3" />
                  : i === currentStep
                    ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #0ea5e9', flexShrink: 0 }} />
                    : <Circle size={16} color="#374151" />
                }
                <span style={{
                  fontSize: 13, fontWeight: i === currentStep ? 600 : 400,
                  color: completedSteps.includes(s.key) ? '#22d3a3' : i === currentStep ? '#e0f2fe' : '#4b5563',
                }}>
                  {s.title}
                </span>
                {completedSteps.includes(s.key) && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22d3a3' }}>Done ✓</span>
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
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
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
                color: stepComplete ? '#9ca3af' : '#374151',
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
                color: stepComplete ? '#9ca3af' : '#374151',
                fontSize: 14, cursor: stepComplete ? 'pointer' : 'not-allowed',
              }}
              title={stepComplete ? '' : 'Complete this step first'}
            >
              Finish
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 16, fontSize: 11, color: '#374151' }}>
          You can always find these in the sidebar
        </div>
      </div>
    </div>
  );
}

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

function DashboardHome({ isViewOnly }) {
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
  const [appVersion, setAppVersion] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [visitedRoutes, setVisitedRoutes] = useState(new Set());
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

  useEffect(() => {
    window.electronAPI?.getAppVersion().then(v => setAppVersion(v)).catch(() => {});
  }, []);

  const loadUserData = async () => {
    try {
      const data = await StorageService.getUserData();
      setUserData(data);

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

      {/* View-only banner for free accounts */}
      {isViewOnly && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9997,
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, fontSize: 12, color: '#d1d5db',
        }}>
          <span>👀 You&apos;re in <strong style={{ color: '#f59e0b' }}>view-only mode</strong> — purchase a license to start tracking aircraft.</span>
          <button
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/pricing')}
            style={{
              padding: '4px 14px', borderRadius: 999,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            View Plans →
          </button>
        </div>
      )}
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
          <NavItem to="/dashboard/logs" icon={ScrollText} label="Logs" active={path === '/dashboard/logs'} />
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
          <div style={{ fontSize: '10px', color: '#374151', textAlign: 'center', marginTop: '8px', letterSpacing: '0.05em' }}>
            {appVersion ? `v${appVersion}` : ''}
          </div>
        </div>
      </div>

      <div style={{ ...s.main, paddingTop: isViewOnly ? 36 : 0 }}>
        <div style={s.content}>
          <Routes>
            <Route path="/" element={<DashboardHome isViewOnly={isViewOnly} />} />
            <Route path="/aircraft" element={<AircraftManager isViewOnly={isViewOnly} />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/airport" element={<AirportConfig isViewOnly={isViewOnly} />} />
            <Route path="/alerts" element={<AlertSettings isViewOnly={isViewOnly} />} />
            <Route path="/integrations" element={<Integrations isViewOnly={isViewOnly} />} />
            <Route path="/logs" element={<Logs />} />
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
