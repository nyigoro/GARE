// electron-app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function copyPreload() {
  const src = path.resolve(__dirname, 'preload.js');
  const dest = path.resolve(__dirname, 'dist/preload.js');

  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('[Vite] ✅ preload.js copied to dist/');
    } else {
      console.warn('[Vite] ⚠️ preload.js not found in electron-app/');
    }
  } catch (err) {
    console.error('[Vite] ❌ Failed to copy preload.js:', err);
  }
}

export default defineConfig({
  plugins: [react()],
  root: './src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  // Hook to copy preload.js after build
  closeBundle: copyPreload,
});
