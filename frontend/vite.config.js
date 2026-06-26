import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 600000,          // 大文件上传 10 分钟超时
        proxyTimeout: 600000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[vite proxy error]', err.message);
          });
        }
      },
    },
  },
});
