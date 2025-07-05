contextBridge.exposeInMainWorld('electronAPI', {
  runCommand: (data) => {
    console.log('[Preload] runCommand called:', data);
    ipcRenderer.send('run-command', data); // 🔄 Changed from invoke to send
  },
  onLog: (callback) => {
    console.log('[Preload] Registering onLog listener');
    ipcRenderer.on('log', (_event, message) => {
      console.log('[Preload] Log received:', message);
      callback(message);
    });
  },
});
