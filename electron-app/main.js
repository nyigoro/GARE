const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

let rustProcess;
let win;

console.log('[Main] Starting Electron app');

// Load plugins
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
  const indexPath = path.join(__dirname, 'dist/index.html');

  // --- START: Added Debugging Logs ---
  console.log(`[Main] Calculated preloadPath: ${preloadPath}`);
  if (!fs.existsSync(preloadPath)) {
    console.error('[Main] ERROR: preload.js not found at:', preloadPath);
  } else {
    console.log('[Main] preload.js found. Attempting to read its content (for debug):');
    try {
      const preloadContent = fs.readFileSync(preloadPath, 'utf8');
      // console.log(preloadContent.substring(0, 200) + '...'); // Log first 200 chars
      console.log('[Main] preload.js content read successfully.');
    } catch (readErr) {
      console.error('[Main] ERROR: Could not read preload.js content:', readErr);
    }
  }

  console.log(`[Main] Calculated indexPath: ${indexPath}`);
  if (!fs.existsSync(indexPath)) {
    console.error('[Main] ERROR: dist/index.html not found at:', indexPath);
  }
  // --- END: Added Debugging Logs ---

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log('[Main] Loading dist/index.html');
  win.loadFile(indexPath).catch(err => {
    console.error('[Main] Failed to load index.html:', err);
  });

  // Open DevTools automatically if in development
  // win.webContents.openDevTools();
}

// IPC handler using invoke-compatible method
ipcMain.handle('run-command', async (_event, data) => {
  console.log('[Main] Received run-command:', data);
  const mode = process.env.RUNNER_MODE || 'native';

  if (!rustProcess) {
    const rustCmd = './rust-engine/target/release/gare-runner';
    let spawnArgs = [];
    let spawnOptions = { cwd: path.join(__dirname, '..') };

    if (mode === 'docker') {
      spawnArgs = ['exec', '-i', 'gare-app', rustCmd];
      spawnOptions = {}; // Docker exec handles the path within the container
      console.log('[Main] Spawning Docker command:', 'docker', spawnArgs);
    } else {
      spawnArgs = [rustCmd];
      console.log('[Main] Spawning native command:', rustCmd, 'with cwd:', spawnOptions.cwd);
    }

    rustProcess = spawn(mode === 'docker' ? 'docker' : rustCmd, spawnArgs, spawnOptions);

    rustProcess.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        plugins.forEach(p => p?.onLog?.(line));
        win?.webContents.send('log', line);
        console.log('[Main] stdout:', line);
      });
    });

    rustProcess.stderr.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        plugins.forEach(p => p?.onLog?.(`[ERR] ${line}`));
        win?.webContents.send('log', `[ERR] ${line}`);
        console.error('[Main] stderr:', line);
      });
    });

    rustProcess.on('exit', (code) => {
      plugins.forEach(p => p?.onExit?.());
      const exitMessage = `[GARE] Runner exited with code ${code}`;
      win?.webContents.send('log', exitMessage);
      console.log('[Main] Rust process exited:', exitMessage);
      rustProcess = null;
    });

    rustProcess.on('error', (err) => {
      const errorMessage = `[Main] Failed to start rust process: ${err.message}`;
      console.error(errorMessage);
      win?.webContents.send('log', errorMessage);
      rustProcess = null; // Ensure process is null if it failed to start
    });
  }

  // Ensure process is ready before writing
  if (rustProcess && rustProcess.stdin.writable) {
    rustProcess.stdin.write(JSON.stringify(data) + '\n');
    return 'sent';
  } else {
    const errorMsg = '[Main] Rust process not ready or stdin not writable.';
    console.error(errorMsg);
    win?.webContents.send('log', `[ERR] ${errorMsg}`);
    return 'failed to send';
  }
});

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
