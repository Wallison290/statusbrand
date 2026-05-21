import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Aumenta o aviso de chunk (1MB em vez de 500kB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa as libs grandes em chunks independentes (cacheados pelo browser)
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-date':     ['date-fns', 'date-fns/locale'],
          'vendor-motion':   ['framer-motion'],
          'vendor-charts':   ['recharts'],
        },
      },
    },
  },
})
