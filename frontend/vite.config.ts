import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // BACKEND_URL lets Docker Compose point at the backend service;
        // falls back to localhost for plain `npm run dev`.
        target: process.env.BACKEND_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
