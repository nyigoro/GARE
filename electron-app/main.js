const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

let rustProcess;
let win;

console.log('[Main] Electron app starting...');

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
  // Ensure paths are correctly resolved from the main.js location
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, 'dist/index.html'); // Assuming index.html is in dist/

  console.log(`[Main] Attempting to load preload script from: ${preloadPath}`);
  if (!fs.existsSync(preloadPath)) {
    console.error(`[Main] ERROR: preload.js NOT FOUND at expected path: ${preloadPath}`);
    // You might want to show an error message to the user or exit gracefully here
  } else {
    console.log(`[Main] preload.js found at: ${preloadPath}`);
  }

  console.log(`[Main] Attempting to load index.html from: ${indexPath}`);
  if (!fs.existsSync(indexPath)) {
    console.error(`[Main] ERROR: index.html NOT FOUND at expected path: ${indexPath}`);
    // You might want to show an error message to the user or exit gracefully here
  } else {
    console.log(`[Main] index.html found at: ${indexPath}`);
  }

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true, // Essential for security and contextBridge
      nodeIntegration: false, // Essential for security
      // enableRemoteModule: false // Deprecated, ensure it's false or removed
    },
  });

  // Load the renderer process HTML file
  win.loadFile(indexPath)
    .then(() => {
      console.log('[Main] Renderer process HTML loaded successfully.');
      // Optional: Open DevTools automatically for debugging
      // win.webContents.openDevTools();
    })
    .catch(err => {
      console.error('[Main] ERROR: Failed to load index.html:', err);
    });
}

// IPC handler using invoke-compatible method
ipcMain.handle('run-command', async (_event, data) => {
  console.log('[Main] Received run-command from renderer:', data);
  const mode = process.env.RUNNER_MODE || 'native';

  // If rustProcess is null, start it
  if (!rustProcess) {
    const rustCmd = './rust-engine/target/release/gare-runner';
    let spawnArgs = [];
    let spawnOptions = { cwd: path.join(__dirname, '..') }; // CWD is one level up from electron-app

    if (mode === 'docker') {
      spawnArgs = ['exec', '-i', 'gare-app', rustCmd];
      spawnOptions = {}; // Docker exec handles the path within the container
      console.log('[Main] Spawning Docker command:', 'docker', spawnArgs);
    } else {
      spawnArgs = [rustCmd];
      console.log('[Main] Spawning native command:', rustCmd, 'with cwd:', spawnOptions.cwd);
    }

    try {
      rustProcess = spawn(mode === 'docker' ? 'docker' : rustCmd, spawnArgs, spawnOptions);
      console.log('[Main] Rust process spawned successfully.');

      rustProcess.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => {
          plugins.forEach(p => p?.onLog?.(line));
          // Send log to the renderer process
          win?.webContents.send('log', line);
          console.log('[Main] Rust stdout:', line);
        });
      });

      rustProcess.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => {
          plugins.forEach(p => p?.onLog?.(`[ERR] ${line}`));
          // Send error log to the renderer process
          win?.webContents.send('log', `[ERR] ${line}`);
          console.error('[Main] Rust stderr:', line);
        });
      });

      rustProcess.on('exit', (code) => {
        plugins.forEach(p => p?.onExit?.());
        const exitMessage = `[GARE] Runner exited with code ${code}`;
        win?.webContents.send('log', exitMessage);
        console.log('[Main] Rust process exited:', exitMessage);
        rustProcess = null; // Reset process on exit
      });

      rustProcess.on('error', (err) => {
        const errorMessage = `[Main] Failed to start rust process: ${err.message}`;
        console.error(errorMessage);
        win?.webContents.send('log', `[ERR] ${errorMessage}`);
        rustProcess = null; // Ensure process is null if it failed to start
      });

    } catch (spawnErr) {
      const errorMessage = `[Main] Critical Error: Could not spawn rust process: ${spawnErr.message}`;
      console.error(errorMessage);
      win?.webContents.send('log', `[ERR] ${errorMessage}`);
      rustProcess = null;
      return 'failed to spawn rust process'; // Return an error state to the renderer
    }
  }

  // Ensure process is ready and stdin is writable before writing
  if (rustProcess && rustProcess.stdin && !rustProcess.stdin.writableEnded) {
    try {
      rustProcess.stdin.write(JSON.stringify(data) + '\n');
      console.log('[Main] Data sent to Rust process stdin.');
      return 'sent';
    } catch (writeErr) {
      const errorMessage = `[Main] Error writing to Rust process stdin: ${writeErr.message}`;
      console.error(errorMessage);
      win?.webContents.send('log', `[ERR] ${errorMessage}`);
      return 'failed to send data to rust process';
    }
  } else {
    const errorMsg = '[Main] Rust process not active or stdin not writable.';
    console.error(errorMsg);
    win?.webContents.send('log', `[ERR] ${errorMsg}`);
    return 'rust process not ready';
  }
});

app.whenReady().then(() => {
  console.log('[Main] Electron app is ready. Creating window...');
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('[Main] All windows closed. Quitting app...');
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('[Main] Electron app quitting.');
  // Ensure child process is terminated on app quit
  if (rustProcess) {
    console.log('[Main] Terminating Rust process on app quit.');
    rustProcess.kill(); // Or rustProcess.kill('SIGTERM') for a graceful shutdown
  }
});
