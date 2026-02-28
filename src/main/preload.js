const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Secure store
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeClear: () => ipcRenderer.invoke('store-clear'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

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
});
