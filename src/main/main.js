const { app, BrowserWindow, ipcMain, shell, Tray, Menu, dialog, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const tracker = require('./tracker_bridge');
const { autoUpdater } = require('electron-updater');
const Sentry = require('@sentry/electron/main');

Sentry.init({
  dsn: 'https://2eaef290bb8846c7d4fb1fd25436c345@o4511365849874432.ingest.us.sentry.io/4511365852954624',
  environment: app.isPackaged ? 'production' : 'development',
  enabled: app.isPackaged,
});

const store = new Store();

let mainWindow;
let tray = null;
let forceQuit = false;

// ─── Auto-updater config ──────────────────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
// Skip signature verification — app is not code signed
if (process.platform === 'darwin') {
  autoUpdater.verifyUpdateCodeSignature = false;
}

autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info.version);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', info.version);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err.message);
});

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  // Use the app icon — falls back to empty image if not found
  let trayIcon;
  try {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'build', 'favicon.ico')
      : path.join(__dirname, '..', 'public', 'favicon.ico');
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
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f1117',
    titleBarStyle: 'default',
  });

  // Override CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' file: data:; " +
          "connect-src 'self' https://*.railway.app https://railway.app; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' file: data: https:;"
        ],
      },
    });
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Intercept close button — ask user what to do
  mainWindow.on('close', (e) => {
    if (forceQuit) return; // allow quit from tray menu or update restart
    e.preventDefault();
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Minimize to Tray', 'Exit', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Exit FinalPing?',
      message: 'Exit FinalPing?',
      detail: 'Your cloud tracker will continue running and sending alerts even after closing. Minimize to tray to keep the app accessible from the taskbar.',
    }).then(({ response }) => {
      if (response === 0) {
        // Minimize to tray
        mainWindow.hide();
      } else if (response === 1) {
        // Exit
        forceQuit = true;
        tracker.stopTracker();
        app.quit();
      }
      // response === 2 (Cancel) or X clicked — do nothing, return to app
    });
  });

  mainWindow.on('closed', () => { mainWindow = null; });

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
    if (app.isPackaged) {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    }
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
  autoUpdater.quitAndInstall();
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
