const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gare', {
  runEngine: (payload) => ipcRenderer.send('run-engine', payload),
  onLog: (callback) => ipcRenderer.on('log-update', (_, data) => callback(data)),
});
