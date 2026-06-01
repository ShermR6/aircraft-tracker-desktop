/**
 * Background aircraft tracker — polls live positions continuously regardless
 * of which screen is active. Accumulates trail history for the full flight.
 */
import APIService from './api';

// Trail data and last-known positions survive for the app session
const _trailData = {};       // { tail: [[lat, lng], ...] }
const _lastSeen = {};        // { tail: timestamp }
const _liveData = { list: [] }; // latest raw aircraft array
const _subscribers = new Set();

let _interval = null;
let _posTracker = {};        // { tail: { lat, lng, changedAt } }

const TRAIL_CLEANUP_MS = 10 * 60 * 1000; // remove trail 10 min after last seen

function notify() {
  _subscribers.forEach(cb => {
    try { cb(_liveData.list); } catch {}
  });
}

async function poll() {
  try {
    const data = await APIService.getLiveAircraft();
    const now = Date.now();
    const seen = new Set();

    (data || []).forEach(ac => {
      if (!ac.latitude || !ac.longitude) return;
      const tail = ac.tail_number;
      const lat = parseFloat(ac.latitude);
      const lng = parseFloat(ac.longitude);

      seen.add(tail);
      _lastSeen[tail] = now;

      // Accumulate trail — only add if position changed
      if (!_trailData[tail]) _trailData[tail] = [];
      const trail = _trailData[tail];
      const last = trail[trail.length - 1];
      if (!last || last[0] !== lat || last[1] !== lng) {
        trail.push([lat, lng]);
      }

      // Staleness tracking for frozen-position filter
      const prev = _posTracker[tail];
      if (!prev || prev.lat !== lat || prev.lng !== lng) {
        _posTracker[tail] = { lat, lng, changedAt: now };
      }
    });

    // Clean up aircraft not seen in 10+ minutes
    Object.keys(_lastSeen).forEach(tail => {
      if (!seen.has(tail) && now - _lastSeen[tail] > TRAIL_CLEANUP_MS) {
        delete _trailData[tail];
        delete _lastSeen[tail];
        delete _posTracker[tail];
      }
    });

    _liveData.list = data || [];
    notify();
  } catch {
    // silently skip failed polls
  }
}

export const backgroundTracker = {
  start() {
    if (_interval) return;
    poll(); // immediate first fetch
    _interval = setInterval(poll, 5000);
  },

  stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
  },

  subscribe(cb) {
    _subscribers.add(cb);
    return () => _subscribers.delete(cb);
  },

  getData() { return _liveData.list; },
  getTrailData() { return _trailData; },
  getPosTracker() { return _posTracker; },
};
