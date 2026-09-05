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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-ai': ['@google/genai'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
          'vendor-icons': ['lucide-react', 'motion'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

