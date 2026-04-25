import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only proxy: forwards /api/* to the local glide-backend Next.js server.
// Backend: https://github.com/stormholman/glide-backend (npm run dev → :3000)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
