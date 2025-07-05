// electron-app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const copyPreload = () => {
  const src = path.resolve(__dirname, 'preload.js');
  const dest = path.resolve(__dirname, '../dist/preload.js');
  fs.copyFileSync(src, dest);
  console.log('[Vite] Copied preload.js to dist/');
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-preload',
      closeBundle: () => {
        copyPreload();
      }
    }
  ],
  root: './src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
