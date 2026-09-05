/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: string
  readonly VITE_OLLAMA_BASE_URL?: string
  readonly VITE_OLLAMA_MODEL?: string
  readonly VITE_OLLAMA_VISION_MODEL?: string
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  autoGuard?: {
    version: string
    aiService: typeof import('./services/aiService').aiService
    ollamaService: typeof import('./services/ollamaService').ollamaService
    weatherService: typeof import('./services/weatherService').weatherService
    storageService: typeof import('./services/storageService').storageService
    recallService: typeof import('./services/recallService').recallService
    runSanitySuite: () => Promise<{
      gripCheckPassed: boolean
      iceCheckPassed: boolean
      cachedReportsCount: number
      executionTimeMs: number
      status: string
    }>
  }
}
