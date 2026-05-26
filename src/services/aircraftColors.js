const PALETTE = ['#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f87171', '#818cf8', '#fb923c', '#e879f9'];

let _overrides = {};
let _loaded = false;

function defaultColor(tail) {
  let h = 0;
  for (let i = 0; i < tail.length; i++) h = (h * 31 + tail.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export async function ensureLoaded() {
  if (_loaded) return;
  try {
    if (window.electronAPI?.storeGet) {
      _overrides = (await window.electronAPI.storeGet('aircraft_colors')) || {};
    }
  } catch { _overrides = {}; }
  _loaded = true;
}

export function getColor(tail) {
  return _overrides[tail] || defaultColor(tail);
}

export async function setColor(tail, color) {
  _overrides[tail] = color;
  try {
    if (window.electronAPI?.storeSet) {
      await window.electronAPI.storeSet('aircraft_colors', { ..._overrides });
    }
  } catch { /* non-critical */ }
}
