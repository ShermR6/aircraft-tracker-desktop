import React from 'react';
import { Plane } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 40, maxWidth: 440, width: '90%',
          textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <Plane size={40} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 28px' }}>
            FinalPing ran into an unexpected error. Our team has been notified. Try restarting the app — if the issue keeps happening, contact support.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.electronAPI?.openExternal('https://finalpingapp.com/contact')}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Contact Support</button>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                background: 'var(--accent)',
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >Restart App</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
