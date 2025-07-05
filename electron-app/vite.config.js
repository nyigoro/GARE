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
          // This path resolves to C:\Users\user\OneDrive\Desktop\nyigoro\GARE\electron-app\src\preload.js
          const src = path.resolve(__dirname, 'src', 'preload.js');
          // This path resolves to C:\Users\user\OneDrive\Desktop\nyigoro\GARE\electron-app\dist\preload.js
          const dest = path.resolve(__dirname, 'dist', 'preload.js');

          if (fs.existsSync(src)) {
            // Ensure the destination directory exists before copying
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
            console.log('[Vite] Copied preload.js from src/ to dist/');
          } else {
            console.warn(`[Vite] WARNING: preload.js not found at expected path: ${src}. This might cause issues.`);
          }
        },
      };
    }

    export default defineConfig({
      plugins: [react(), copyPreloadPlugin()],
      root: './src', // Your React app's source root is here
      base: './',
      build: {
        outDir: '../dist', // Output to 'dist' folder one level up from 'src'
        emptyOutDir: true,
      },
    });
    