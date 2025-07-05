// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// ✅ Custom plugin to copy preload.js to dist/
function copyPreloadPlugin() {
  return {
    name: 'copy-preload',
    closeBundle() {
      const src = path.resolve(__dirname, 'preload.js');
      const dest = path.resolve(__dirname, 'dist/preload.js');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('[Vite] Copied preload.js to dist/');
      } else {
        console.warn('[Vite] preload.js not found at', src);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPreloadPlugin()],
  root: './src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
