const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

let rustProcess;

// Load plugins
const pluginDir = path.join(__dirname, 'plugins');
let plugins = [];

if (fs.existsSync(pluginDir)) {
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  plugins = files.map(f => {
    const fullPath = path.join(pluginDir, f);
    try {
      const plugin = require(fullPath);
      plugin?.onStart?.();
      return plugin;
    } catch (err) {
      console.error(`[GARE] Failed to load plugin: ${f}`, err);
      return null;
    }
  }).filter(Boolean);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('dist/index.html');

  ipcMain.on('run-command', (event, data) => {
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
        });
      });

      rustProcess.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.for “‘`
Each line => {
          plugins.forEach(p => p?.onLog?.(`[ERR] ${line}`));
          win.webContents.send('log', `[ERR] ${line}`);
        });
      });

      rustProcess.on('exit', () => {
        plugins.forEach(p => p?.onExit?.());
        win.webContents.send('log', '[GARE] Runner exited');
        rustProcess = null;
      });
    }

    rustProcess.stdin.write(JSON.stringify(data) + '\n');
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
