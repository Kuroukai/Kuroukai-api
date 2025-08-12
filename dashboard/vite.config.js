import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config to serve the dashboard under /admin
// and proxy API calls to the backend when running dev/preview
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy specific admin endpoints to the API server
      '/admin/login': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/admin/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/admin/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // Proxy API endpoints to the API server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
