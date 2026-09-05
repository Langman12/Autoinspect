import type {
  ForensicAsset,
  GuardianMission,
  InspectionReport,
  LiveCallbacks,
  VehicleProfile,
} from '../../types.ts'

export type AIProviderType = 'ollama' | 'gemini' | 'hybrid'

export interface AIEngineHealth {
  provider: AIProviderType
  isOnline: boolean
  modelName?: string
  latencyMs?: number
  details?: Record<string, any>
}

/**
 * Standard Contract Interface for all AutoGuard AI Model Adapters
 * (Ollama Local, Gemini Pro/Flash Cloud, WebLLM, or Custom Edge).
 */
export interface IAIEngine {
  readonly provider: AIProviderType

  /**
   * Health & readiness check for the provider
   */
  checkHealth(): Promise<AIEngineHealth>

  /**
   * Complete multi-asset vehicle forensic inspection analysis
   */
  analyzeVehicle(
    assets: ForensicAsset[],
    vehicle: VehicleProfile,
    onProgress?: (step: string) => void
  ): Promise<InspectionReport | null>

  /**
   * Natural language chat query resolution
   */
  generateChat(prompt: string, systemContext?: string): Promise<string>

  /**
   * Optical Character Recognition & Visual VIN / Spec extraction
   */
  extractVehicleDetails(
    asset: ForensicAsset,
    onProgress?: (step: string) => void
  ): Promise<Partial<VehicleProfile> | null>

  /**
   * Optional real-time multi-modal streaming session
   */
  connectLive?(callbacks: LiveCallbacks): Promise<any>

  /**
   * Optional mission-guided real-time tactical streaming
   */
  connectGuardianLive?(mission: GuardianMission, callbacks: LiveCallbacks): Promise<any>
}
