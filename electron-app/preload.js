const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Loading electronAPI'); // Debug log

contextBridge.exposeInMainWorld('electronAPI', {
  runCommand: (data) => {
    console.log('[Preload] runCommand called:', data);
    return ipcRenderer.invoke('run-command', data);
  },
  onLog: (callback) => {
    console.log('[Preload] Registering onLog listener');
    ipcRenderer.on('log', (_event, message) => {
      console.log('[Preload] Log received:', message);
      callback(message);
    });
  },
});
