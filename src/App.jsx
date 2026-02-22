import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ActivationScreen from './screens/ActivationScreen';
import Dashboard from './screens/Dashboard';
import StorageService from './services/storage';
import APIService from './services/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  checkAuth().catch((err) => {
    console.error('Fatal auth error:', err);
    setLoading(false); // unstick the loading screen no matter what
  });
}, []);

  const checkAuth = async () => {
    try {
      const token = await StorageService.getToken();
      if (token) {
        APIService.setToken(token);
        // Verify token is still valid
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
