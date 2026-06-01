import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ActivationScreen from './screens/ActivationScreen';
import Dashboard from './screens/Dashboard';
import StorageService from './services/storage';
import APIService from './services/api';
import { backgroundTracker } from './services/backgroundTracker';
import './App.css';

function SplashScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#0b0b0b',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes splashIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { from{transform:translateX(-100%)} to{transform:translateX(400%)} }
      `}</style>
      <div style={{ animation: 'splashIn 0.5s ease', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4b5563', marginBottom: 10 }}>
          AIRCRAFT ALERTS
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.03em' }}>
          FinalPing
        </div>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', borderRadius: 999, margin: '14px auto 0' }} />
      </div>
      <div style={{
        position: 'absolute', bottom: 48,
        width: 100, height: 2, background: '#1a1a1a', borderRadius: 999, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

function UpdateBanner({ version, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      background: '#1e293b', border: '1px solid rgba(14,165,233,0.3)',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontSize: 13, color: '#e2e8f0',
    }}>
      <span style={{ color: '#38bdf8', fontSize: 16 }}>↑</span>
      <span>v{version} ready</span>
      <button
        onClick={() => window.electronAPI?.restartAndInstall()}
        style={{
          padding: '4px 12px', borderRadius: 6,
          background: '#0ea5e9', border: 'none',
          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}
      >Restart</button>
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none',
          color: '#4b5563', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}
      >✕</button>
    </div>
  );
}

function LicenseExpiredOverlay({ onActivateNew }) {
  const openPricing = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal('https://finalpingapp.com/pricing');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#0f1117', border: '1px solid #2d3748',
        borderRadius: 20, padding: 40, maxWidth: 420, width: '90%',
        textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: '0 0 12px 0' }}>
          Your License Has Expired
        </h2>
        <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 28px 0' }}>
          Your FinalPing license has expired. Aircraft tracking and alerts have been paused. Purchase a new license to restore full access — your new key will be emailed to you instantly.
        </p>

        {/* Primary — buy new license */}
        <button
          onClick={openPricing}
          style={{
            width: '100%', padding: '13px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px #3b82f640', marginBottom: 10,
          }}
        >
          Purchase New License →
        </button>

        {/* Secondary — already have a new key */}
        <button
          onClick={onActivateNew}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent',
            border: '1px solid #374151', borderRadius: 10, color: '#9ca3af',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Already have a license key? Activate it
        </button>

        <p style={{ fontSize: 12, color: '#4b5563', margin: '16px 0 0 0' }}>
          Your new license key will be sent to your email after purchase.
        </p>
      </div>
    </div>
  );
}

const CURRENT_VERSION = '1.0.9';

const CHANGELOG = [
  { type: 'new', text: 'Live Map trail now records the full flight path in the background — switch to any tab and come back to see the complete route from takeoff' },
  { type: 'fix', text: 'Landing alerts now fire reliably — cloud tracker detects on-ground transitions directly instead of waiting for signal loss' },
  { type: 'fix', text: 'Takeoff alerts added to cloud tracker — fires when aircraft transitions from on-ground to airborne' },
  { type: 'fix', text: 'Dashboard Recent Alerts timestamps now display correctly instead of showing "Just now"' },
];

const TAG = {
  new: { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', label: 'New' },
  improved: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: 'Improved' },
  fix: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Fix' },
};

function ChangelogModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f1117', border: '1px solid #1e2a3a',
        borderRadius: 20, padding: 32, maxWidth: 420, width: '90%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb' }}>What&apos;s new in v{CURRENT_VERSION}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 'auto',
          }}>Latest</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {CHANGELOG.map((c, i) => {
            const tag = TAG[c.type];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 4,
                  background: tag.bg, color: tag.color, marginTop: 1,
                }}>{tag.label}</span>
                <span style={{ color: '#d1d5db', lineHeight: 1.5 }}>{c.text}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/changelog')}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'transparent', border: '1px solid #1e2a3a',
              color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >Full Changelog</button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >Got it</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const inSplash = useRef(true);

  // Hide splash once auth is done, but show for at least 2s
  useEffect(() => {
    if (!loading) {
      const minSplash = setTimeout(() => {
        inSplash.current = false;
        setShowSplash(false);
      }, 2000);
      return () => clearTimeout(minSplash);
    }
  }, [loading]);

  useEffect(() => {
    checkAuth().catch((err) => {
      console.error('Fatal auth error:', err);
      setLoading(false);
    });

    // Show changelog modal if this is the first launch after an update
    StorageService.get('lastSeenVersion').then((seen) => {
      if (seen !== CURRENT_VERSION) {
        setShowChangelog(true);
        StorageService.set('lastSeenVersion', CURRENT_VERSION);
      }
    });

    window.electronAPI?.onUpdateDownloaded((version) => {
      if (inSplash.current) {
        // Update finished downloading before user started using the app — restart silently
        window.electronAPI?.restartAndInstall();
      } else {
        setUpdateVersion(version);
      }
    });
  }, []);

  const checkAuth = async () => {
    try {
      const token = await StorageService.getToken();
      if (token) {
        APIService.setToken(token);
        const userInfo = await APIService.getCurrentUser();
        if (userInfo?.license_tier) {
          const stored = await StorageService.getUserData();
          if (stored) {
            await StorageService.setUserData({ ...stored, license_tier: userInfo.license_tier });
          }
        }
        setIsAuthenticated(true);
        setLicenseExpired(false);
        backgroundTracker.start();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      const detail = error.response?.data?.detail;
      if (detail === 'license_expired') {
        // Keep them authenticated so they can see the app, just show overlay
        setIsAuthenticated(true);
        setLicenseExpired(true);
        backgroundTracker.start();
      } else {
        await StorageService.logout();
        setIsAuthenticated(false);
        setLicenseExpired(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivationSuccess = async (authData) => {
    await StorageService.setToken(authData.access_token);
    await StorageService.setUserData({
      user_id: authData.user_id,
      email: authData.email,
      license_tier: authData.license_tier
    });
    APIService.setToken(authData.access_token);
    setIsAuthenticated(true);
    backgroundTracker.start();
    // Restore input focus after React re-render
    setTimeout(() => window.electronAPI?.focusWindow?.(), 150);
  };

  const handleLogout = async () => {
    backgroundTracker.stop();
    await StorageService.logout();
    APIService.clearToken();
    setIsAuthenticated(false);
    // Restore input focus after navigating to activation screen
    setTimeout(() => window.electronAPI?.focusWindow?.(), 150);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      {showSplash && <SplashScreen />}
      {updateVersion && <UpdateBanner version={updateVersion} onDismiss={() => setUpdateVersion(null)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      {licenseExpired && (
        <LicenseExpiredOverlay
          onActivateNew={async () => {
            await StorageService.logout();
            APIService.clearToken();
            setIsAuthenticated(false);
            setLicenseExpired(false);
          }}
        />
      )}
      <Routes>
        <Route
          path="/activate"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <ActivationScreen onSuccess={handleActivationSuccess} />
            )
          }
        />
        <Route
          path="/dashboard/*"
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/activate" replace />
            )
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/activate"} replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
