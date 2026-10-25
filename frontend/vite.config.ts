import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The /api proxy lets the browser talk to the Python backend without CORS trouble in development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'node',
  },
})
