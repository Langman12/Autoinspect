import type {
  ForensicAsset,
  GuardianMission,
  InspectionReport,
  LiveCallbacks,
  VehicleProfile,
} from '../types.ts'
import { geminiService } from './geminiService.ts'
import { ollamaService, type OllamaHealthStatus } from './ollamaService.ts'
import type { IAIEngine, AIProviderType, AIEngineHealth } from './ai/types.ts'

export type AIProvider = 'ollama' | 'gemini'
export type { IAIEngine, AIProviderType, AIEngineHealth }

const SAVED_PROVIDER_KEY = 'autoguard_ai_provider'
const DEFAULT_PROVIDER: AIProvider =
  ((import.meta as any).env?.VITE_AI_PROVIDER as AIProvider) || 'ollama'

type ProviderListener = (provider: AIProvider) => void
const listeners: ProviderListener[] = []

export const aiService: IAIEngine & {
  getActiveProvider(): AIProvider
  setActiveProvider(provider: AIProvider): void
  onProviderChange(listener: ProviderListener): () => void
  getHealthStatus(): Promise<{
    activeProvider: AIProvider
    ollama: OllamaHealthStatus
    gemini: { isConfigured: boolean }
  }>
} = {
  get provider(): AIProviderType {
    return this.getActiveProvider()
  },

  getActiveProvider(): AIProvider {
    const saved =
      typeof localStorage !== 'undefined'
        ? (localStorage.getItem(SAVED_PROVIDER_KEY) as AIProvider | null)
        : null
    if (saved === 'ollama' || saved === 'gemini') return saved

    // Default to ollama if configured or if no gemini key
    const geminiKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (process as any).env?.GEMINI_API_KEY
    if (!geminiKey || geminiKey.includes('your_gemini_api_key')) {
      return 'ollama'
    }
    return DEFAULT_PROVIDER
  },

  setActiveProvider(provider: AIProvider) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_PROVIDER_KEY, provider)
    }
    listeners.forEach((fn) => fn(provider))
  },

  onProviderChange(listener: ProviderListener): () => void {
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx !== -1) listeners.splice(idx, 1)
    }
  },

  async checkHealth(): Promise<AIEngineHealth> {
    const activeProvider = this.getActiveProvider()
    if (activeProvider === 'ollama') {
      const oHealth = await ollamaService.checkHealth()
      return {
        provider: 'ollama',
        isOnline: oHealth.isOnline,
        modelName: oHealth.models?.[0]?.name || 'qwen2.5-coder:7b',
        details: oHealth,
      }
    } else {
      const geminiKey =
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (process as any).env?.GEMINI_API_KEY
      const configured = Boolean(
        geminiKey && !geminiKey.includes('your_gemini_api_key')
      )
      return {
        provider: 'gemini',
        isOnline: configured,
        modelName: 'gemini-2.5-pro',
        details: { isConfigured: configured },
      }
    }
  },

  async getHealthStatus(): Promise<{
    activeProvider: AIProvider
    ollama: OllamaHealthStatus
    gemini: { isConfigured: boolean }
  }> {
    const activeProvider = this.getActiveProvider()
    const ollama = await ollamaService.checkHealth()
    const geminiKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (process as any).env?.GEMINI_API_KEY
    const geminiConfigured = Boolean(
      geminiKey && !geminiKey.includes('your_gemini_api_key')
    )

    return {
      activeProvider,
      ollama,
      gemini: {
        isConfigured: geminiConfigured,
      },
    }
  },

  async analyzeVehicle(
    assets: ForensicAsset[],
    vehicle: VehicleProfile,
    onProgress?: (step: string) => void
  ): Promise<InspectionReport | null> {
    const provider = this.getActiveProvider()

    if (provider === 'ollama') {
      try {
        return await ollamaService.analyzeVehicle(assets, vehicle, onProgress)
      } catch (err: any) {
        console.warn(
          '[aiService] Local Ollama failed, checking if Gemini fallback is possible:',
          err
        )
        const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
        if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
          onProgress?.('Local AI encountered an error, falling back to Cloud Gemini...')
          return await geminiService.analyzeVehicle(assets, vehicle)
        }
        throw new Error(`Local AI (Ollama) inspection failed: ${err.message}`)
      }
    }

    // Gemini Cloud
    try {
      return await geminiService.analyzeVehicle(assets, vehicle)
    } catch (err: any) {
      console.warn('[aiService] Gemini Cloud failed, attempting Local AI fallback:', err)
      onProgress?.('Cloud API error, falling back to Local AI (Ollama)...')
      return await ollamaService.analyzeVehicle(assets, vehicle, onProgress)
    }
  },

  connectLive(callbacks: LiveCallbacks): Promise<any> {
    return geminiService.connectLive(callbacks)
  },

  connectGuardianLive(
    mission: GuardianMission,
    callbacks: LiveCallbacks
  ): Promise<any> {
    return geminiService.connectGuardianLive(mission, callbacks)
  },

  async generateChat(prompt: string, systemContext?: string): Promise<string> {
    const provider = this.getActiveProvider()
    if (provider === 'ollama') {
      try {
        return await ollamaService.generateChat(prompt, systemContext)
      } catch (err: any) {
        console.warn('[aiService] Local Ollama chat failed, attempting Cloud fallback:', err)
      }
    }

    try {
      return await geminiService.generateText(prompt, systemContext)
    } catch {
      return await ollamaService.generateChat(prompt, systemContext)
    }
  },

  async extractVehicleDetails(
    asset: ForensicAsset,
    onProgress?: (step: string) => void
  ): Promise<Partial<VehicleProfile> | null> {
    const provider = this.getActiveProvider()
    onProgress?.('Scanning photo for VIN number, make, model & odometer...')

    if (provider === 'ollama') {
      try {
        const res = await ollamaService.extractVehicleDetailsFromPhoto(asset.data)
        if (res && (res.vin || res.makeModel)) return res
      } catch (e) {
        console.warn('[aiService] Ollama vehicle extraction failed, attempting Gemini:', e)
      }
    }

    try {
      return await geminiService.extractVehicleDetailsFromPhoto(asset.data, asset.mimeType)
    } catch {
      return await ollamaService.extractVehicleDetailsFromPhoto(asset.data)
    }
  },
}
