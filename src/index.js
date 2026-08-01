import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import * as Sentry from '@sentry/electron/renderer';

Sentry.init({
  dsn: 'https://2eaef290bb8846c7d4fb1fd25436c345@o4511365849874432.ingest.us.sentry.io/4511365852954624',
  beforeSend(event, hint) {
    // Drop transient connectivity errors — the user's internet dropping, not bugs.
    const msg = String(hint?.originalException?.message || event.exception?.values?.[0]?.value || '');
    if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_(REFUSED|RESET|TIMED_OUT|CLOSED)|ERR_TIMED_OUT|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED/i.test(msg)) {
      return null;
    }
    return event;
  },
});

// Show scrollbar thumb only while scrolling, fade out 800ms after scroll stops
const _scrollTimers = new WeakMap();
document.addEventListener('scroll', (e) => {
  const el = e.target;
  if (!el || !el.classList) return;
  el.classList.add('is-scrolling');
  if (_scrollTimers.has(el)) clearTimeout(_scrollTimers.get(el));
  _scrollTimers.set(el, setTimeout(() => el.classList.remove('is-scrolling'), 800));
}, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
