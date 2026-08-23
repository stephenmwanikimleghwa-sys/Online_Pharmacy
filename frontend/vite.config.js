import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Default production API when Render build omits VITE_API_BASE_URL (static frontend -> sn88 backend)
const PRODUCTION_API_DEFAULT = 'https://online-pharmacy-sn88.onrender.com/api'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    env.VITE_API_URL ||
    (mode === 'production' ? PRODUCTION_API_DEFAULT : '')

  return {
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    'import.meta.env.VITE_API_URL': JSON.stringify(apiBaseUrl),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // UI framework chunks
          if (id.includes('node_modules/@headlessui')) return 'ui';
          if (id.includes('node_modules/@heroicons')) return 'icons';
          // Query / data layer
          if (id.includes('node_modules/@tanstack')) return 'query';
          // Date utilities
          if (id.includes('node_modules/date-fns')) return 'utils';
          // react-router before the react/ match (path contains "react")
          if (
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'router';
          }
          // Keep react + react-dom + scheduler together. Splitting them put
          // scheduler in vendor and created a circular init where react-dom
          // saw undefined React (__SECRET_INTERNALS…) → blank "could not start".
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler') ||
            id.includes('/node_modules/react/')
          ) {
            return 'react';
          }
          // Do not force-split recharts/xlsx — keep them with lazy page chunks.
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  },
  }
})
