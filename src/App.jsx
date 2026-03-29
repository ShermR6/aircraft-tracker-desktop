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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

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
        await APIService.getCurrentUser();
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await StorageService.logout();
      setIsAuthenticated(false);
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
  };

  const handleLogout = async () => {
    await StorageService.logout();
    APIService.clearToken();
    setIsAuthenticated(false);
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
