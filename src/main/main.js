const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const tracker = require('./tracker_bridge');

// process.defaultApp is true in dev (electron .), undefined when packaged
const isPackaged = !process.defaultApp;

if (isPackaged) {
  const Sentry = require('@sentry/electron/main');
  Sentry.init({
    dsn: 'https://2eaef290bb8846c7d4fb1fd25436c345@o4511365849874432.ingest.us.sentry.io/4511365852954624',
    environment: 'production',
    beforeSend(event, hint) {
      // Drop transient connectivity errors — these are the user's internet
      // dropping (or DNS/connection resets), not app bugs.
      const msg = String(hint?.originalException?.message || event.exception?.values?.[0]?.value || '');
      if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_(REFUSED|RESET|TIMED_OUT|CLOSED)|ERR_TIMED_OUT|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED/i.test(msg)) {
        return null;
      }
      return event;
    },
  });
}

const store = new Store();

let mainWindow;
let tray = null;
let forceQuit = false;

// Register custom protocol for OAuth deep link callback
if (isPackaged) {
  app.setAsDefaultProtocolClient('finalpingapp');
} else {
  app.setAsDefaultProtocolClient('finalpingapp', process.execPath, [path.resolve(process.argv[1])]);
}

function handleOAuthCallback(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth') {
      const token = parsed.searchParams.get('token');
      const email = parsed.searchParams.get('email');
      const error = parsed.searchParams.get('error');
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('oauth-callback', { token, email, error });
      }
    }
  } catch (e) {
    console.error('OAuth callback parse error:', e);
  }
}

// macOS: protocol URL comes via open-url (before or after ready)
let pendingOAuthUrl = null;
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    handleOAuthCallback(url);
  } else {
    pendingOAuthUrl = url;
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
    // Windows: deep link URL arrives in command line args
    const url = commandLine.find(arg => arg.startsWith('finalpingapp://'));
    if (url) handleOAuthCallback(url);
  });
}

// ─── Auto-updater (production only) ──────────────────────────────────────────
let autoUpdater = null;
if (isPackaged) {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  if (process.platform === 'darwin') {
    autoUpdater.verifyUpdateCodeSignature = false;
  }
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info.version);
    }
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  // Use the app icon — falls back to empty image if not found
  let trayIcon;
  try {
    // Packaged: main runs as build/electron.js, so favicon.ico sits next to it
    // (CRA copies public/ -> build/, bundled into app.asar). Dev: main runs from
    // src/main, so the repo-root public/ is two levels up.
    const iconPath = isPackaged
      ? path.join(__dirname, 'favicon.ico')
      : path.join(__dirname, '..', '..', 'public', 'favicon.ico');
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) trayIcon = nativeImage.createEmpty();
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('FinalPing — Aircraft Alerts');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show FinalPing',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        forceQuit = true;
        tracker.stopTracker();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single click on tray icon restores window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'FinalPing',
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f1117',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 22 },
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 48,
    },
  });

  // Override CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' file: data:; " +
          "connect-src 'self' https://*.railway.app https://railway.app https://*.cartocdn.com https://*.openstreetmap.org https://api.adsbdb.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' file: data: https: blob:;"
        ],
      },
    });
  });

  if (isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', () => {
    forceQuit = true;
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Maximize and show on first load
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Fix Electron input focus bug — restore focus on window show/focus
  const refocus = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.focus();
    }
  };
  mainWindow.on('focus', refocus);
  mainWindow.on('show', refocus);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.focus();
    if (isPackaged) {
      setTimeout(() => autoUpdater.checkForUpdates(), 1000);
      setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
    }
    // Handle OAuth callback that arrived before the window was ready
    if (pendingOAuthUrl) {
      handleOAuthCallback(pendingOAuthUrl);
      pendingOAuthUrl = null;
    }
    // Windows: check initial launch args for deep link
    const deepLink = process.argv.find(arg => arg.startsWith('finalpingapp://'));
    if (deepLink) handleOAuthCallback(deepLink);
  });

  // Push tracker status updates to the renderer
  tracker.onStatusChange((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker-status', status);
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.on('ready', () => {
  // Enable launch at startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // start minimized to tray on login
  });

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit when all windows closed — keep running in tray
  // Only quit if forceQuit is set
  if (forceQuit) {
    tracker.stopTracker();
    if (process.platform !== 'darwin') app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  forceQuit = true;
});

// ─── Secure store IPC ─────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key));
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true; });
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true; });
ipcMain.handle('store-clear', () => { store.clear(); return true; });

// ─── External URLs ─────────────────────────────────────────────────────────────
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));

// ─── Focus window — restores input focus after React navigation ───────────────
ipcMain.handle('focus-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.focus();
    mainWindow.webContents.executeJavaScript(`
      (function() {
        window.focus();
        const el = document.activeElement;
        if (el && el !== document.body) { el.blur(); setTimeout(() => el.focus(), 50); }
      })();
    `).catch(() => {});
  }
});

// ─── Auto-updater IPC ─────────────────────────────────────────────────────────
ipcMain.handle('update-restart', () => {
  forceQuit = true;
  if (autoUpdater) autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => app.getVersion());

// ─── Tracker IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('tracker-start', async (event, token) => {
  return tracker.startTracker(token);
});

ipcMain.handle('tracker-stop', () => {
  return tracker.stopTracker();
});

ipcMain.handle('tracker-status', () => {
  return tracker.getStatus();
});
