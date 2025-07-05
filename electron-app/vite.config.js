// electron-app/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const copyPreload = () => {
  const src = path.resolve(__dirname, 'preload.js');
  const dest = path.resolve(__dirname, '../dist/preload.js');

  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('[Vite] ✅ Copied preload.js to dist/');
    } else {
      console.warn('[Vite] ⚠️ preload.js not found — skipping copy.');
    }
  } catch (err) {
    console.error('[Vite] ❌ Error copying preload.js:', err);
  }
};

export default defineConfig({
  plugins: [react()],
  root: './src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // Hook into the build process
  closeBundle() {
    copyPreload();
  },
});
