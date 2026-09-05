export type DamageType = 'BODY' | 'MECHANICAL' | 'STRUCTURAL' | 'INTERIOR' | 'GLASS' | 'WHEELS' | 'SAFETY'
export type StatusLight = 'GREEN' | 'YELLOW' | 'RED'
export type FinalRecommendation = 'RETAIL READY' | 'WHOLESALE TRADE' | 'SCRAP / SALVAGE'
export type DriveDecision = 'SAFE TO DRIVE' | 'TOW TRUCK ONLY'
export type RailStraightness = 'PERFECT' | 'KINKED' | 'CLAMP_MARKS_DETECTED'
export type RustGrade = 'NONE' | 'SURFACE' | 'STRUCTURAL_ROT'
export type AcousticStatus = 'NORMAL_OPERATING' | 'ANOMALY_DETECTED'

export interface ForensicAsset {
  data: string
  mimeType: string
  label: string
}

export interface VehicleProfile {
  year?: string
  makeModel: string
  vin?: string
  mileage?: string
  fuelType?: string
  class?: 'ECONOMY' | 'LUXURY' | 'EXOTIC' | 'COMMERCIAL'
}

export interface EstimatedCost {
  low: string
  medium: string
  high: string
}

export interface DamageFinding {
  id: string
  type: DamageType
  component: string
  description: string
  status: StatusLight
  severityScore: number
  estimatedCost: EstimatedCost
  actionRequired: string
  acousticProfile?: string | null
}

export interface RiskAssessment {
  brakingSystem: boolean
  steeringSuspension: boolean
  fireRisk: boolean
  structuralIntegrity: boolean
  finalDecision: DriveDecision
  rationale: string
}

export interface UnderCarriageAudit {
  undercoatingDetected: boolean
  undercoatingRationale: string
  railStraightness: RailStraightness
  railRationale: string
  rustGrade: RustGrade
  rustRationale: string
  leakTrace: string
}

export interface AcousticSignature {
  frequencyRange: string
  detectedStatus: AcousticStatus
  description: string
  crossReferenceNote: string
}

export interface AcousticAudit {
  signatures: AcousticSignature[]
  overallMechanicalNote: string
}

export interface InspectionReport {
  id: string
  timestamp: number
  vehicle: VehicleProfile
  damages: DamageFinding[]
  overallHealth: number
  confidenceScore: number
  summary: string
  priorRepairDetected: boolean
  adasCalibrationRequired: boolean
  forensicVerdict: string
  finalRecommendation: FinalRecommendation
  riskAssessment: RiskAssessment
  underCarriageAudit?: UnderCarriageAudit | null
  acousticAudit?: AcousticAudit | null
  imageUrl?: string
  recalls?: NHTSARecall[]
}

export interface LiveCallbacks {
  onopen?: () => void
  onmessage: (msg: any) => void
  onerror?: (err: any) => void
  onclose?: (evt: CloseEvent) => void
}

export interface GuardianMission {
  destination: string
  vehicleProfile: string
  threatLevel: 'low' | 'medium' | 'high'
  routePriority?: 'fastest' | 'shortest' | 'scenic' | 'avoid-tolls'
  weatherAvoidance?: boolean
  currentWeather?: WeatherReport | null
}

export type RoadHazardLevel = 'OPTIMAL' | 'CAUTION' | 'HAZARDOUS' | 'SEVERE_DANGER'

export interface WeatherHazard {
  id: string
  type: 'HYDROPLANING' | 'BLACK_ICE' | 'DENSE_FOG' | 'CROSSWINDS' | 'THUNDERSTORM' | 'EXTREME_HEAT'
  title: string
  description: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  speedReductionKmh: number
  recommendedAction: string
}

export interface WeatherReport {
  locationName: string
  latitude: number
  longitude: number
  timestamp: number
  temperatureC: number
  apparentTemperatureC: number
  weatherCode: number
  conditionText: string
  conditionIcon: string
  precipitationMm: number
  precipitationProbability: number
  windSpeedKmh: number
  windGustsKmh: number
  visibilityMeters: number
  relativeHumidity: number
  roadHazardLevel: RoadHazardLevel
  roadGripIndex: number // 0 to 100%
  hazards: WeatherHazard[]
  tacticalAdvisory: string
  safeSpeedCapKmh: number
}


export interface SocialPost {
  id: string
  platform: 'twitter' | 'instagram' | 'facebook' | 'linkedin'
  content: string
  imageUrl?: string
  scheduledAt: number
  status: 'pending' | 'published' | 'failed'
  reportId?: string
}

export interface SystemHealth {
  timestamp: number
  apiLatency: number
  errorRate: number
  storageUsed: number
  activeUsers: number
  status: 'healthy' | 'degraded' | 'critical'
}

export interface NHTSARecall {
  campaignNumber: string
  manufacturer: string
  subject: string
  component: string
  consequence: string
  remedy: string
  reportDate: string
  unitsAffected: number
}
