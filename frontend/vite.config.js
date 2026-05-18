import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/coze-api': {
        target: 'https://3xksw7qxn9.coze.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coze-api/, '')
      },
      '/coze-words-api': {
        target: 'https://bxt7xx9ygt.coze.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coze-words-api/, '')
      }
    }
  }
});
