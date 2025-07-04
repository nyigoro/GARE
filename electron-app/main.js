const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

let rustProcess;

console.log('[Main] Starting Electron app');

const pluginDir = path.join(__dirname, '../plugins');
let plugins = [];

if (fs.existsSync(pluginDir)) {
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  plugins = files.map(f => {
    const fullPath = path.join(pluginDir, f);
    try {
      const plugin = require(fullPath);
      plugin?.onStart?.();
      console.log(`[Main] Loaded plugin: ${f}`);
      return plugin;
    } catch (err) {
      console.error(`[GARE] Failed to load plugin: ${f}`, err);
      return null;
    }
  }).filter(Boolean);
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Preload path:', preloadPath);
  if (!fs.existsSync(preloadPath)) {
    console.error('[Main] preload.js not found at:', preloadPath);
  }

  const indexPath = path.join(__dirname, 'dist/index.html');
  console.log('[Main] Index path:', indexPath);
  if (!fs.existsSync(indexPath)) {
    console.error('[Main] dist/index.html not found at:', indexPath);
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log('[Main] Loading dist/index.html');
  win.loadFile('dist/index.html').catch(err => {
    console.error('[Main] Failed to load index.html:', err);
  });

  ipcMain.on('run-command', (event, data) => {
    console.log('[Main] Received run-command:', data);
    const mode = process.env.RUNNER_MODE || 'native';

    if (!rustProcess) {
      if (mode === 'docker') {
        rustProcess = spawn('docker', [
          'exec', '-i', 'gare-app',
          './rust-engine/target/release/gare-runner',
        ]);
      } else {
        rustProcess = spawn('./rust-engine/target/release/gare-runner', [], {
          cwd: path.join(__dirname, '..'),
        });
      }

      rustProcess.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => {
          plugins.forEach(p => p?.onLog?.(line));
          win.webContents.send('log', line);
          console.log('[Main] stdout:', line);
        });
      });

      rustProcess.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => {
          plugins.forEach(p => p?.onLog?.(`[ERR] ${line}`));
          win.webContents.send('log', `[ERR] ${line}`);
          console.error('[Main] stderr:', line);
        });
      });

      rustProcess.on('exit', () => {
        plugins.forEach(p => p?.onExit?.());
        win.webContents.send('log', '[GARE] Runner exited');
        console.log('[Main] Rust process exited');
        rustProcess = null;
      });
    }

    rustProcess.stdin.write(JSON.stringify(data) + '\n');
  });
}

app.whenReady().then(() => {
  console.log('[Main] App ready');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('[Main] All windows closed');
  if (process.platform !== 'darwin') app.quit();
});
