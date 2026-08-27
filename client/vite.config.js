import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      // Proxy all REST API calls
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.io (HTTP polling + WebSocket upgrade)
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
})