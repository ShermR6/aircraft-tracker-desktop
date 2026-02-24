import React, { useState } from 'react';
import { Plane, Key, Mail, ArrowRight, Loader, Shield, Zap, Bell } from 'lucide-react';
import APIService from '../services/api';
import StorageService from '../services/storage';

const s = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: '#0a0e1a',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    overflow: 'hidden',
  },

  // Left panel - branding
  left: {
    width: '420px',
    minWidth: '420px',
    background: 'linear-gradient(160deg, #0f1829 0%, #0a0e1a 50%, #0d1520 100%)',
    borderRight: '1px solid #1a2540',
    display: 'flex',
    flexDirection: 'column',
    padding: '48px 40px',
    position: 'relative',
    overflow: 'hidden',
  },
  leftGlow: {
    position: 'absolute',
    top: '-100px',
    left: '-100px',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, #3b82f615 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  leftGlow2: {
    position: 'absolute',
    bottom: '-50px',
    right: '-50px',
    width: '300px',
    height: '300px',
    background: 'radial-gradient(circle, #6366f110 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '64px',
    position: 'relative',
    zIndex: 1,
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px #3b82f640',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#f9fafb',
    margin: 0,
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#f9fafb',
    margin: '0 0 16px 0',
    lineHeight: '1.2',
    position: 'relative',
    zIndex: 1,
  },
  heroAccent: {
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6',
    margin: '0 0 48px 0',
    position: 'relative',
    zIndex: 1,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  featureIcon: (color) => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: `${color}15`,
    border: `1px solid ${color}25`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  }),
  featureTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb',
    margin: '0 0 3px 0',
  },
  featureSub: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  leftFooter: {
    position: 'relative',
    zIndex: 1,
    paddingTop: '32px',
    borderTop: '1px solid #1a2540',
  },
  leftFooterText: {
    fontSize: '12px',
    color: '#4b5563',
    margin: 0,
  },

  // Right panel - form
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#0f1117',
  },
  formCard: {
    width: '100%',
    maxWidth: '440px',
  },
  formTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#f9fafb',
    margin: '0 0 6px 0',
  },
  formSub: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 36px 0',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '8px',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    background: '#1a2030',
    border: '1px solid #2d3748',
    borderRadius: '10px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  submitBtn: (loading) => ({
    width: '100%',
    padding: '14px',
    background: loading ? '#1f2937' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '10px',
    color: loading ? '#6b7280' : '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
    boxShadow: loading ? 'none' : '0 4px 20px #3b82f640',
    transition: 'all 0.2s',
  }),
  errorBox: {
    padding: '12px 14px',
    background: '#ef444420',
    border: '1px solid #ef444440',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '28px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#1f2937',
  },
  dividerText: {
    fontSize: '12px',
    color: '#4b5563',
  },
  purchaseBox: {
    padding: '16px',
    background: '#1a2030',
    border: '1px solid #2d3748',
    borderRadius: '10px',
    textAlign: 'center',
  },
  purchaseText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '0 0 10px 0',
  },
  purchaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 20px',
    background: 'linear-gradient(135deg, #a78bfa20, #6366f120)',
    border: '1px solid #6366f140',
    borderRadius: '8px',
    color: '#a78bfa',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  formFooter: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '12px',
    color: '#4b5563',
  },
};

export default function ActivationScreen({ onActivate }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim() || !email.trim()) {
      setError('Please enter both your license key and email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await APIService.activateLicense(licenseKey.trim(), email.trim());
      await StorageService.setToken(data.access_token);
      await StorageService.setUserData({
        email: data.email,
        user_id: data.user_id,
        license_tier: data.license_tier,
      });
      onActivate(data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Activation failed. Please check your license key and email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const focusInput = (e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#1e2840'; };
  const blurInput = (e) => { e.target.style.borderColor = '#2d3748'; e.target.style.background = '#1a2030'; };

  return (
    <div style={s.shell}>
      {/* Left branding panel */}
      <div style={s.left}>
        <div style={s.leftGlow} />
        <div style={s.leftGlow2} />

        <div style={s.logoRow}>
          <div style={s.logoIcon}><Plane size={24} color="#fff" /></div>
          <p style={s.logoText}>AircraftTracker</p>
        </div>

        <h1 style={s.heroTitle}>
          Track flights.<br />
          <span style={s.heroAccent}>Get notified instantly.</span>
        </h1>
        <p style={s.heroSub}>
          Real-time ADS-B monitoring for the aircraft you care about, delivered to Discord, Slack, and Teams.
        </p>

        <div style={s.featureList}>
          <div style={s.featureItem}>
            <div style={s.featureIcon('#3b82f6')}><Plane size={16} color="#60a5fa" /></div>
            <div>
              <p style={s.featureTitle}>Real-Time Tracking</p>
              <p style={s.featureSub}>Live ADS-B position data updated every few seconds for your tracked aircraft.</p>
            </div>
          </div>
          <div style={s.featureItem}>
            <div style={s.featureIcon('#34d399')}><Bell size={16} color="#34d399" /></div>
            <div>
              <p style={s.featureTitle}>Smart Alerts</p>
              <p style={s.featureSub}>Proximity alerts at custom distances — 20nm, 10nm, 5nm, or whatever you need.</p>
            </div>
          </div>
          <div style={s.featureItem}>
            <div style={s.featureIcon('#a78bfa')}><Zap size={16} color="#a78bfa" /></div>
            <div>
              <p style={s.featureTitle}>Multi-Channel Notifications</p>
              <p style={s.featureSub}>Push alerts to Discord, Slack, or Microsoft Teams with custom messages.</p>
            </div>
          </div>
          <div style={s.featureItem}>
            <div style={s.featureIcon('#f59e0b')}><Shield size={16} color="#fbbf24" /></div>
            <div>
              <p style={s.featureTitle}>Quiet Hours</p>
              <p style={s.featureSub}>Set hours where no notifications are sent — so you can actually sleep.</p>
            </div>
          </div>
        </div>

        <div style={s.leftFooter}>
          <p style={s.leftFooterText}>v1.0.0 · © 2026 AircraftTracker · <a href="#" onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://skyping.xyz'); }} style={{ color: '#4b5563', textDecoration: 'none' }}>SkyPing.xyz</a></p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <div style={s.formCard}>
          <h2 style={s.formTitle}>Activate your license</h2>
          <p style={s.formSub}>Enter your license key and email to get started</p>

          {error && <div style={s.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={s.fieldGroup}>
              <label style={s.label}>License Key</label>
              <div style={s.inputWrap}>
                <div style={s.inputIcon}><Key size={15} color="#4b5563" /></div>
                <input
                  style={s.input}
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Email Address</label>
              <div style={s.inputWrap}>
                <div style={s.inputIcon}><Mail size={15} color="#4b5563" /></div>
                <input
                  style={s.input}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" style={s.submitBtn(loading)} disabled={loading}>
              {loading
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />Activating...</>
                : <><ArrowRight size={16} />Activate License</>}
            </button>
          </form>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>Don't have a license?</span>
            <div style={s.dividerLine} />
          </div>

          <div style={s.purchaseBox}>
            <p style={s.purchaseText}>Get a license key to start tracking your aircraft</p>
            <a
              href="https://skyping.xyz/pricing"
              onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://skyping.xyz'); }}
              style={s.purchaseBtn}
              onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa30, #6366f130)'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #a78bfa20, #6366f120)'}
            >
              <Zap size={13} />
              Purchase at SkyPing.xyz
            </a>
          </div>

          <p style={s.formFooter}>
            Your license key was emailed to you after purchase.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
