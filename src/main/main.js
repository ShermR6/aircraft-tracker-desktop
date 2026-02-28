const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const tracker = require('./src/main/tracker_bridge');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'FinalPing',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.on('closed', () => { mainWindow = null; });

  // Push tracker status updates to the renderer
  tracker.onStatusChange((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tracker-status', status);
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  tracker.stopTracker(); // clean up process on quit
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ─── Secure store IPC ─────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key));
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true; });
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true; });
ipcMain.handle('store-clear', () => { store.clear(); return true; });

// ─── External URLs ─────────────────────────────────────────────────────────────
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));

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
