const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runCommand: (data) => ipcRenderer.invoke('run-command', data),
  onLog: (callback) => ipcRenderer.on('log', (event, message) => callback(message)),
});
