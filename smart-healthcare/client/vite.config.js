import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/patient': 'http://localhost:5000',
      '/assessment': 'http://localhost:5000',
      '/upload': 'http://localhost:5000',
      '/alert': 'http://localhost:5000',
      '/risk': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})