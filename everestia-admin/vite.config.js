import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  /**
   * Dev proxy — forwards /api/* requests to the local Express backend.
   * This eliminates CORS issues when running the admin on a different port
   * (Vite default: 5173) from the API (port 5000).
   *
   * In production, configure your reverse proxy (Nginx/Caddy) to do the same.
   */
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
