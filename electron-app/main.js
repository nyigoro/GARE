const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

let rustProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('dist/index.html');

  ipcMain.on('run-command', (event, data) => {
    const mode = process.env.RUNNER_MODE || 'native';

    // Start runner if not running
    if (!rustProcess) {
      if (mode === 'docker') {
        rustProcess = spawn('docker', [
          'exec', '-i', 'gare-app',
          './rust-engine/target/debug/gare-runner'
        ]);
      } else {
        rustProcess = spawn('./rust-engine/target/debug/gare-runner');
      }

      rustProcess.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => win.webContents.send('log', line));
      });

      rustProcess.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => win.webContents.send('log', `[ERR] ${line}`));
      });

      rustProcess.on('exit', () => {
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
