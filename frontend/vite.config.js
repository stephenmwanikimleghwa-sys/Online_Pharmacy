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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react', 'react-hot-toast'],
          utils: ['axios', 'date-fns']
        }
      }
    }
  },
  }
})
