const { contextBridge, ipcRenderer } = require('electron');

// Add more detailed logging to preload.js to confirm execution
console.log('[Preload] preload.js script started loading.');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    runCommand: (data) => {
      console.log('[Preload] runCommand called from renderer:', data);
      // ipcRenderer.invoke returns a Promise, which is then returned to the renderer
      return ipcRenderer.invoke('run-command', data);
    },
    onLog: (callback) => {
      console.log('[Preload] Registering onLog listener for renderer process.');
      // ipcRenderer.on is used for events from main to renderer
      ipcRenderer.on('log', (_event, message) => {
        console.log('[Preload] Log message received from main process:', message);
        // Call the callback provided by the renderer to pass the message
        callback(message);
      });
    },
    // You can add more APIs here as needed
  });
  console.log('[Preload] electronAPI successfully exposed to window object.');
} catch (error) {
  console.error('[Preload] ERROR: Failed to expose electronAPI:', error.message);
}

console.log('[Preload] preload.js script finished executing.');
