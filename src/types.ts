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

// ---------------------------------------------------------------------------
// OBD-II & CAN-Bus Telemetry Types
// ---------------------------------------------------------------------------
export type ObdConnectionStatus = 'DISCONNECTED' | 'SCANNING' | 'CONNECTING' | 'CONNECTED' | 'ERROR'

export interface ObdPidData {
  timestamp: number
  rpm: number
  speedKmh: number
  coolantTempC: number
  intakeTempC: number
  stftPercent: number // Short Term Fuel Trim % (-100 to +100)
  ltftPercent: number // Long Term Fuel Trim % (-100 to +100)
  mafGramsPerSec: number
  mapKpa: number
  throttlePercent: number
  timingAdvanceDeg: number
  o2Voltage1: number // Volts (0 - 1.0V)
  o2Voltage2: number
  oilPressureKpa: number
  batteryVoltage: number
  engineLoadPercent: number
  boostPsi: number
}

export interface FreezeFrameData {
  dtcCode: string
  timestamp: number
  rpm: number
  speedKmh: number
  coolantTempC: number
  engineLoadPercent: number
  fuelTrimStft: number
  fuelTrimLtft: number
}

export interface DtcFaultCode {
  code: string // e.g., 'P0300', 'P0171'
  system: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK_CAN'
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY'
  description: string
  possibleCauses: string[]
  recommendedAction: string
  active: boolean
  freezeFrame?: FreezeFrameData | null
  correlatedAcousticSignature?: string
}

// ---------------------------------------------------------------------------
// 3D Vehicle Digital Twin Types
// ---------------------------------------------------------------------------
export type VehicleBodyStyle = 'SEDAN' | 'SUV' | 'TRUCK' | 'COUPE' | 'EV_PLATFORM'
export type VehicleSubsystem = 'ALL' | 'POWERTRAIN' | 'SUSPENSION_BRAKES' | 'CHASSIS_BODY' | 'EXHAUST' | 'EV_BATTERY'

export interface Vehicle3DCoordinate {
  x: number
  y: number
  z: number
}

export interface DefectMarker3D {
  id: string
  component: string
  subsystem: VehicleSubsystem
  position: Vehicle3DCoordinate
  severity: StatusLight
  label: string
  description: string
  estimatedCost: string
  acousticMatch?: string
  dtcMatch?: string
}

// ---------------------------------------------------------------------------
// Automated Part Sourcing & Labor Estimation Types
// ---------------------------------------------------------------------------
export interface PartSupplierQuote {
  supplier: string // e.g. 'RockAuto', 'AutoZone', 'OEM Direct', 'Brembo Official'
  partNumber: string
  brand: string
  tier: 'OEM' | 'TIER_1_AFTERMARKET' | 'BUDGET'
  price: number
  availability: 'IN_STOCK' | '2_DAY_DELIVERY' | 'SPECIAL_ORDER'
  warranty: string
  rating: number
}

export interface DiyRequirement {
  difficultyWrenches: 1 | 2 | 3 | 4 | 5 // 1=Trivial, 5=Master Engine/Trans Pull
  estimatedHoursDiy: number
  requiredTools: string[]
  safetyEquipment: string[]
  skillWarning?: string
}

export interface PartQuoteItem {
  id: string
  defectId: string
  componentName: string
  oemPartNumber: string
  laborBookHours: number
  shopLaborRateHourly: number
  oemQuote: PartSupplierQuote
  aftermarketQuotes: PartSupplierQuote[]
  diy: DiyRequirement
}

// ---------------------------------------------------------------------------
// Cryptographic Vehicle Passport & Forensic Tamper Radar Types
// ---------------------------------------------------------------------------
export interface ForensicAssetDigest {
  label: string
  sha256Hash: string
  mimeType: string
  timestamp: number
  byteSize: number
}

export interface ExifAnomalyCheck {
  id: string
  checkName: string
  passed: boolean
  confidenceScore: number
  details: string
  severity: 'CLEAN' | 'FLAGGED' | 'COMPROMISED'
}

export interface CryptographicSignature {
  algorithm: 'SHA-256-RSA-ECDSA'
  certificateFingerprint: string
  blockchainHash: string
  signedBy: string
  signedAt: string
  publicVerificationUrl: string
}

export interface VehiclePassport {
  passportId: string
  vin: string
  makeModel: string
  year: string
  mileage: number
  overallHealthScore: number
  forensicGrade: 'AUTHENTIC_CERTIFIED' | 'CAUTION_FLAGS' | 'TAMPER_ALERT'
  assetDigests: ForensicAssetDigest[]
  exifAudits: ExifAnomalyCheck[]
  signature: CryptographicSignature
  qrCodeVerificationPayload: string
  generatedAt: number
}

// ---------------------------------------------------------------------------
// In-Flight Black Box Flight Recorder Types
// ---------------------------------------------------------------------------
export interface BlackBoxTelemetrySample {
  timestamp: number
  speedKmh: number
  gForceLateral: number // Left/Right Gs (-2.0 to +2.0)
  gForceLongitudinal: number // Accel/Braking Gs (-2.5 to +1.5)
  gForceVertical: number // Bump/Drop Gs (0.5 to 2.5)
  pitchDeg: number
  rollDeg: number
  rpm: number
  cabinAudioDecibels: number
  brakePressureKpa: number
}

export interface BlackBoxIncidentEvent {
  id: string
  timestamp: number
  triggerType: 'HARD_BRAKING' | 'HIGH_G_IMPACT' | 'ROLLOVER_THRESHOLD' | 'SUDDEN_RPM_LOSS'
  peakGForce: number
  speedAtTriggerKmh: number
  preBufferSamples: BlackBoxTelemetrySample[]
  postBufferSamples: BlackBoxTelemetrySample[]
  locked: boolean
  status: 'CAPTURED_UNUPLOADED' | 'UPLOADED_ENCRYPTED'
}

// ---------------------------------------------------------------------------
// Tire Tread & Optical Thermal Profiling Types
// ---------------------------------------------------------------------------
export interface TireTreadMeasurement {
  position: 'FRONT_LEFT' | 'FRONT_RIGHT' | 'REAR_LEFT' | 'REAR_RIGHT'
  innerGroove32nds: number
  centerGroove32nds: number
  outerGroove32nds: number
  wearPattern: 'UNIFORM' | 'CAMBER_WEAR' | 'TOE_FEATHERING' | 'OVER_INFLATION' | 'UNDER_INFLATION' | 'CRITICAL_BALD'
  recommendedAction: string
  estimatedMilesRemaining: number
}

export type ThermalPalette = 'IRONBOW' | 'RAINBOW' | 'TURBO' | 'WHITE_HOT' | 'BLACK_HOT'

export interface ThermalSpotMeasurement {
  label: string
  temperatureC: number
  thresholdMaxC: number
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL_OVERHEAT'
}

