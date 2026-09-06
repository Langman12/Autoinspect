import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
        headers: {
          Origin: 'http://127.0.0.1:11434',
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (id.includes('@google/genai')) {
              return 'vendor-ai'
            }
            if (id.includes('lucide-react') || id.includes('motion') || id.includes('framer-motion')) {
              return 'vendor-icons'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

