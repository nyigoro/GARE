// electron-app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runCommand: (data) => ipcRenderer.send('run-command', data),
  onLog: (callback) => ipcRenderer.on('log', (_, msg) => callback(msg))
});
