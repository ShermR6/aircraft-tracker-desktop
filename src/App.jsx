import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ActivationScreen from './screens/ActivationScreen';
import Dashboard from './screens/Dashboard';
import StorageService from './services/storage';
import APIService from './services/api';
import './App.css';

function UpdateBanner({ version, downloaded, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, fontSize: 13, fontWeight: 600, color: '#fff',
      boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
    }}>
      <span>
        {downloaded
          ? `✅ FinalPing v${version} is ready to install.`
          : `⬇ Downloading FinalPing v${version}...`}
      </span>
      {downloaded && (
        <>
          <button
            onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/changelog')}
            style={{
              padding: '5px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              fontWeight: 600, fontSize: 12, border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            What's new?
          </button>
          <button
            onClick={() => window.electronAPI?.restartAndInstall()}
            style={{
              padding: '5px 14px', borderRadius: 999,
              background: '#fff', color: '#3b82f6',
              fontWeight: 700, fontSize: 12, border: 'none',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            Restart & Install
          </button>
        </>
      )}
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 18,
          cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0,
        }}
        title="Dismiss"
      >
        ✕
      </button>
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    checkAuth().catch((err) => {
      console.error('Fatal auth error:', err);
      setLoading(false);
    });

    // Listen for auto-updater events from main process
    window.electronAPI?.onUpdateAvailable((version) => {
      setUpdateVersion(version);
      setUpdateDownloaded(false);
    });
    window.electronAPI?.onUpdateDownloaded((version) => {
      setUpdateVersion(version);
      setUpdateDownloaded(true);
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
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      const detail = error.response?.data?.detail;
      if (detail === 'license_expired') {
        // Keep them authenticated so they can see the app, just show overlay
        setIsAuthenticated(true);
        setLicenseExpired(true);
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
    // Restore input focus after React re-render
    setTimeout(() => window.electronAPI?.focusWindow?.(), 150);
  };

  const handleLogout = async () => {
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
      {updateVersion && (
        <UpdateBanner
          version={updateVersion}
          downloaded={updateDownloaded}
          onDismiss={() => setUpdateVersion(null)}
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
