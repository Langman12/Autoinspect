import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
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

