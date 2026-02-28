/**
 * tracker_bridge.js
 * 
 * Runs in the Electron main process.
 * Fetches all user config from the Railway backend and writes a local
 * config file that the Python tracker binary can read. Also manages
 * spawning and stopping the tracker process.
 * 
 * Place this file at: src/tracker_bridge.js (alongside main.js)
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const https = require('https');

const API_BASE = 'https://aircraft-tracker-backend-production.up.railway.app';

let trackerProcess = null;
let statusCallback = null;   // called with { running, logs, error }
let logBuffer = [];

// ─── HTTP helper (no axios in main process) ─────────────────────────────────
function apiGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Config assembly ─────────────────────────────────────────────────────────
async function buildTrackerConfig(token) {
  const [aircraftList, airportConfig, alertSettings, integrations] = await Promise.all([
    apiGet('/api/aircraft', token),
    apiGet('/api/airport/config', token),
    apiGet('/api/settings/alerts', token),
    apiGet('/api/integrations', token),
  ]);

  // Aircraft
  const tailNumbers = (aircraftList || []).map(a => a.tail_number);
  const icao24Codes = (aircraftList || []).map(a => a.icao24 || '');

  // Alert distances
  const distanceAlerts = (alertSettings || []).filter(a => a.alert_type !== 'landing' && a.enabled);
  const alertDistances = distanceAlerts
    .map(a => parseFloat(a.alert_type.replace('nm', '')))
    .filter(n => !isNaN(n))
    .sort((a, b) => b - a);

  // Airport / airspace
  const ap = airportConfig || {};
  const fieldElevation = ap.field_elevation_ft_msl || 0;
  const detectionRadius = ap.detection_radius_nm || 100;
  const ceilingAgl = ap.ceiling_ft_agl || 3000;

  // Integrations — pull first enabled Discord webhook
  // Also supports Slack / Teams via webhook_url
  const discordInt = (integrations || []).find(i => i.type === 'discord' && i.enabled);
  const slackInt   = (integrations || []).find(i => i.type === 'slack'   && i.enabled);
  const teamsInt   = (integrations || []).find(i => i.type === 'teams'   && i.enabled);

  // Quiet hours
  const quietStart = ap.quiet_hours_start || '23:00';
  const quietEnd   = ap.quiet_hours_end   || '06:00';
  const quietEnabled = !!(quietStart && quietEnd);

  const config = {
    api_source: 'adsblol',
    use_area_query: true,
    use_short_messages: false,
    verbose_debug: false,

    aircraft: {
      tail_numbers: tailNumbers,
      icao24_codes: icao24Codes,
    },

    airspace: {
      name: ap.airport_code ? `${ap.airport_code} Airspace` : 'My Airport',
      center_lat: parseFloat(ap.latitude) || 0,
      center_lon: parseFloat(ap.longitude) || 0,
      radius_nm: ap.detection_radius_nm || 5,
      field_elevation_ft_msl: fieldElevation,
      floor_ft_agl: 0,
      ceiling_ft_agl: ceilingAgl,
      floor_ft_msl: fieldElevation,
      ceiling_ft_msl: fieldElevation + ceilingAgl,
      query_radius_nm: detectionRadius,
      alert_distances_nm: alertDistances.length > 0 ? alertDistances : [10.0, 5.0, 2.0],
    },

    // Discord bot section — kept for backwards compat with the Python tracker
    discord_bot: {
      bot_token: discordInt?.config?.bot_token || '',
      channel_id: discordInt?.config?.channel_id || '',
      webhook_url: discordInt?.config?.webhook_url || '',
    },

    // Additional webhook integrations
    integrations: {
      discord:  discordInt  ? { enabled: true, webhook_url: discordInt.config.webhook_url  || '' } : { enabled: false },
      slack:    slackInt    ? { enabled: true, webhook_url: slackInt.config.webhook_url    || '' } : { enabled: false },
      teams:    teamsInt    ? { enabled: true, webhook_url: teamsInt.config.webhook_url    || '' } : { enabled: false },
    },

    monitoring: {
      poll_interval_seconds: ap.polling_interval_seconds || 10,
    },

    notifications: {
      cooldown_minutes: 1,
      quiet_hours: {
        enabled: quietEnabled,
        start: quietStart,
        end: quietEnd,
      },
    },
  };

  return config;
}

// ─── Config file path (per-user via userData) ─────────────────────────────────
function getConfigPath() {
  // app.getPath('userData') is per-OS user account — e.g. C:\Users\Bob\AppData\Roaming\FinalPing
  return path.join(app.getPath('userData'), 'tracker_config.json');
}

function writeConfig(config) {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return configPath;
}

// ─── Tracker binary path ──────────────────────────────────────────────────────
function getTrackerBinaryPath() {
  if (app.isPackaged) {
    // In packaged app, binary is in resources/
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(process.resourcesPath, `tracker${ext}`);
  } else {
    // In development, use python directly
    return null;
  }
}

function getTrackerScriptPath() {
  // Used in dev mode
  return path.join(__dirname, '..', '..', '..', 'tracker', 'aviation_tracker_discord_bot.py');
}

// ─── Push a log line to the renderer ─────────────────────────────────────────
function pushLog(line) {
  logBuffer.push({ time: new Date().toLocaleTimeString(), text: line.trim() });
  if (logBuffer.length > 200) logBuffer.shift(); // cap buffer
  if (statusCallback) {
    statusCallback({ running: trackerProcess !== null, logs: logBuffer });
  }
}

function notifyStatus(extra = {}) {
  if (statusCallback) {
    statusCallback({ running: trackerProcess !== null, logs: logBuffer, ...extra });
  }
}

// ─── Start tracker ─────────────────────────────────────────────────────────────
async function startTracker(token) {
  if (trackerProcess) {
    pushLog('Tracker is already running.');
    return { success: false, error: 'Already running' };
  }

  try {
    pushLog('Fetching your configuration from server...');
    const config = await buildTrackerConfig(token);

    if (!config.aircraft.tail_numbers.length) {
      return { success: false, error: 'No aircraft configured. Add aircraft in the Aircraft tab first.' };
    }
    if (!config.airspace.center_lat || !config.airspace.center_lon) {
      return { success: false, error: 'Airport not configured. Set your location in Airport Config first.' };
    }

    const configPath = writeConfig(config);
    pushLog(`Config written with ${config.aircraft.tail_numbers.length} aircraft.`);
    pushLog(`Monitoring ${config.airspace.name} within ${config.airspace.query_radius_nm}nm.`);

    // Determine how to launch
    const binaryPath = getTrackerBinaryPath();
    let proc;

    if (binaryPath && fs.existsSync(binaryPath)) {
      // Production: use compiled binary
      proc = spawn(binaryPath, [configPath], { stdio: ['ignore', 'pipe', 'pipe'] });
      pushLog('Starting tracker binary...');
    } else {
      // Development: use python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = getTrackerScriptPath();
      if (!fs.existsSync(scriptPath)) {
        return { success: false, error: `Tracker script not found at: ${scriptPath}` };
      }
      proc = spawn(pythonCmd, [scriptPath, configPath], { stdio: ['ignore', 'pipe', 'pipe'] });
      pushLog('Starting tracker (dev mode via Python)...');
    }

    trackerProcess = proc;

    proc.stdout.on('data', (data) => {
      data.toString().split('\n').filter(l => l.trim()).forEach(pushLog);
    });

    proc.stderr.on('data', (data) => {
      data.toString().split('\n').filter(l => l.trim()).forEach(l => pushLog(`⚠ ${l}`));
    });

    proc.on('close', (code) => {
      trackerProcess = null;
      pushLog(code === 0 ? 'Tracker stopped.' : `Tracker exited with code ${code}.`);
      notifyStatus();
    });

    proc.on('error', (err) => {
      trackerProcess = null;
      pushLog(`Failed to start tracker: ${err.message}`);
      notifyStatus({ error: err.message });
    });

    notifyStatus();
    return { success: true };

  } catch (err) {
    pushLog(`Error starting tracker: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Stop tracker ─────────────────────────────────────────────────────────────
function stopTracker() {
  if (!trackerProcess) {
    return { success: false, error: 'Tracker is not running' };
  }
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', trackerProcess.pid.toString(), '/f', '/t']);
    } else {
      trackerProcess.kill('SIGTERM');
    }
    trackerProcess = null;
    pushLog('Tracker stopped by user.');
    notifyStatus();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Status ────────────────────────────────────────────────────────────────────
function getStatus() {
  return { running: trackerProcess !== null, logs: logBuffer };
}

function onStatusChange(cb) {
  statusCallback = cb;
}

module.exports = { startTracker, stopTracker, getStatus, onStatusChange };
