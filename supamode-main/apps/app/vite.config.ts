import vitePlugin from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { viteVersionPlugin } from './vite-version-plugin.ts';

export default defineConfig({
  plugins: [react(), vitePlugin(), viteVersionPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // rewrite the path to remove the /api prefix once the request is made to the API server
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
