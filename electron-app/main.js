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
  let preloadPath;
  let indexPath;

  // Determine the correct paths for preload.js and index.html
  // depending on whether the app is running in development or packaged mode.
  if (app.isPackaged) {
    // In a packaged app, files are typically in resources/app.asar or resources/app
    // Your vite.config.js copies preload.js to dist/preload.js,
    // and dist/ is usually bundled into app.asar or app/
    // So, preload.js will be directly in the root of the bundled app.
    preloadPath = path.join(process.resourcesPath, 'app.asar', 'preload.js');
    // For index.html, it's also inside the bundled app.asar
    indexPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');

    console.log('[Main] Running in packaged mode.');
    console.log(`[Main] Packaged preloadPath: ${preloadPath}`);
    console.log(`[Main] Packaged indexPath: ${indexPath}`);

  } else {
    // In development mode, files are relative to __dirname (electron-app directory)
    preloadPath = path.join(__dirname, 'preload.js');
    indexPath = path.join(__dirname, 'dist', 'index.html'); // Assuming Vite builds to dist/

    console.log('[Main] Running in development mode.');
    console.log(`[Main] Dev preloadPath: ${preloadPath}`);
    console.log(`[Main] Dev indexPath: ${indexPath}`);
  }

  // Verify preload.js existence
  if (!fs.existsSync(preloadPath)) {
    console.error(`[Main] ERROR: preload.js NOT FOUND at path: ${preloadPath}`);
    // Consider showing a user-friendly error or exiting here
  } else {
    console.log(`[Main] preload.js found at: ${preloadPath}`);
  }

  // Verify index.html existence
  if (!fs.existsSync(indexPath)) {
    console.error(`[Main] ERROR: index.html NOT FOUND at path: ${indexPath}`);
    // Consider showing a user-friendly error or exiting here
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
    },
  });

  // Load the renderer process HTML file
  win.loadFile(indexPath)
    .then(() => {
      console.log('[Main] Renderer process HTML loaded successfully.');
      // Optional: Open DevTools automatically for debugging in development
      // if (!app.isPackaged) {
      //   win.webContents.openDevTools();
      // }
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
