const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Secure store
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeClear: () => ipcRenderer.invoke('store-clear'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Restore input focus after React navigation
  focusWindow: () => ipcRenderer.invoke('focus-window'),

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Tracker control
  trackerStart: (token) => ipcRenderer.invoke('tracker-start', token),
  trackerStop: () => ipcRenderer.invoke('tracker-stop'),
  trackerStatus: () => ipcRenderer.invoke('tracker-status'),

  // Listen for live status updates pushed from main process
  onTrackerStatus: (callback) => {
    ipcRenderer.on('tracker-status', (event, status) => callback(status));
  },
  offTrackerStatus: () => {
    ipcRenderer.removeAllListeners('tracker-status');
  },

  // Auto-updater
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, version) => callback(version));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, version) => callback(version));
  },
  restartAndInstall: () => ipcRenderer.invoke('update-restart'),
});
