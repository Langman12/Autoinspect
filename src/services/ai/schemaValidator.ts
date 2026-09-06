/**
 * AutoGuard AI — Runtime Schema Validator & LLM Output Sanitizer
 * 
 * Provides fail-safe schema validation, defensive fallbacks, and GDVF rule compliance
 * for structured JSON emitted by Google Gemini and local Ollama models.
 */

import type {
  DamageFinding,
  DamageType,
  DriveDecision,
  FinalRecommendation,
  InspectionReport,
  RiskAssessment,
  StatusLight,
  UnderCarriageAudit,
  VehicleProfile,
} from '../../types.ts'

/**
 * Safely strips markdown code blocks, XML tags, and raw prefixes to parse JSON.
 */
export function safeExtractJsonFromLlm(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string LLM response payload')
  }

  let text = rawText.trim()

  // 1. Remove markdown code fences
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '')
  text = text.replace(/\s*```$/, '')

  // 2. Locate first '{' or '[' and last '}' or ']'
  const firstBrace = text.indexOf('{')
  const firstBracket = text.indexOf('[')

  let startIdx = -1
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket)
  } else if (firstBrace !== -1) {
    startIdx = firstBrace
  } else if (firstBracket !== -1) {
    startIdx = firstBracket
  }

  if (startIdx === -1) {
    throw new Error('No JSON structure found in LLM output: ' + text.slice(0, 100))
  }

  const lastBrace = text.lastIndexOf('}')
  const lastBracket = text.lastIndexOf(']')
  const endIdx = Math.max(lastBrace, lastBracket)

  if (endIdx === -1 || endIdx < startIdx) {
    throw new Error('Incomplete JSON boundaries in LLM output')
  }

  const jsonSubstring = text.slice(startIdx, endIdx + 1)
  return JSON.parse(jsonSubstring)
}

/**
 * Validates and sanitizes a VehicleProfile object.
 */
export function validateVehicleProfile(raw: any): VehicleProfile {
  const p = typeof raw === 'object' && raw !== null ? raw : {}
  return {
    makeModel: typeof p.makeModel === 'string' && p.makeModel.trim() ? p.makeModel.trim() : 'Unknown Vehicle',
    year: typeof p.year === 'string' ? p.year : typeof p.year === 'number' ? String(p.year) : undefined,
    vin: typeof p.vin === 'string' ? p.vin.trim().toUpperCase() : undefined,
    mileage: typeof p.mileage === 'string' ? p.mileage : typeof p.mileage === 'number' ? String(p.mileage) : undefined,
    fuelType: typeof p.fuelType === 'string' ? p.fuelType : 'Gasoline',
    class: ['ECONOMY', 'LUXURY', 'EXOTIC', 'COMMERCIAL'].includes(p.class) ? p.class : 'ECONOMY',
  }
}

/**
 * Validates and sanitizes a DamageFinding object.
 */
export function validateDamageFinding(raw: any, index: number = 0): DamageFinding {
  const d = typeof raw === 'object' && raw !== null ? raw : {}

  const validTypes: DamageType[] = ['BODY', 'MECHANICAL', 'STRUCTURAL', 'INTERIOR', 'GLASS', 'WHEELS', 'SAFETY']
  const validStatus: StatusLight[] = ['GREEN', 'YELLOW', 'RED']

  const rawCost = typeof d.estimatedCost === 'object' && d.estimatedCost !== null ? d.estimatedCost : {}

  return {
    id: typeof d.id === 'string' && d.id ? d.id : `damage-${Date.now()}-${index}`,
    type: validTypes.includes(d.type) ? d.type : 'BODY',
    component: typeof d.component === 'string' && d.component.trim() ? d.component.trim() : 'Unspecified Component',
    description: typeof d.description === 'string' && d.description.trim() ? d.description.trim() : 'No forensic description provided.',
    status: validStatus.includes(d.status) ? d.status : 'YELLOW',
    severityScore: typeof d.severityScore === 'number' && !isNaN(d.severityScore) ? Math.max(0, Math.min(100, d.severityScore)) : 50,
    estimatedCost: {
      low: typeof rawCost.low === 'string' ? rawCost.low : '$150',
      medium: typeof rawCost.medium === 'string' ? rawCost.medium : '$350',
      high: typeof rawCost.high === 'string' ? rawCost.high : '$600',
    },
    actionRequired: typeof d.actionRequired === 'string' && d.actionRequired.trim() ? d.actionRequired.trim() : 'Inspect and service.',
    acousticProfile: typeof d.acousticProfile === 'string' ? d.acousticProfile : null,
  }
}

/**
 * Validates and enforces GDVF Risk Assessment rules.
 */
export function validateRiskAssessment(raw: any, damages: DamageFinding[] = []): RiskAssessment {
  const r = typeof raw === 'object' && raw !== null ? raw : {}

  const brakingSystem = Boolean(r.brakingSystem || damages.some((d) => d.type === 'SAFETY' && d.component.toLowerCase().includes('brake') && d.status === 'RED'))
  const steeringSuspension = Boolean(r.steeringSuspension || damages.some((d) => d.type === 'MECHANICAL' && d.status === 'RED'))
  const fireRisk = Boolean(r.fireRisk || damages.some((d) => d.description.toLowerCase().includes('fuel leak') || d.description.toLowerCase().includes('short circuit')))
  const structuralIntegrity = Boolean(r.structuralIntegrity || damages.some((d) => d.type === 'STRUCTURAL' && d.status === 'RED'))

  // GDVF Safety Override: Any critical safety failure forces TOW TRUCK ONLY
  let finalDecision: DriveDecision = r.finalDecision === 'TOW TRUCK ONLY' || brakingSystem || fireRisk || structuralIntegrity
    ? 'TOW TRUCK ONLY'
    : 'SAFE TO DRIVE'

  const rationale = typeof r.rationale === 'string' && r.rationale.trim()
    ? r.rationale.trim()
    : finalDecision === 'TOW TRUCK ONLY'
      ? 'Critical mechanical or structural safety defect detected. Vehicle unsafe for public road operation.'
      : 'No catastrophic structural or hydraulic safety hazards detected.'

  return {
    brakingSystem,
    steeringSuspension,
    fireRisk,
    structuralIntegrity,
    finalDecision,
    rationale,
  }
}

/**
 * Master validation pipeline for full InspectionReport objects.
 */
export function validateInspectionReport(raw: any, fallbackId?: string): InspectionReport {
  const rep = typeof raw === 'object' && raw !== null ? raw : {}

  const vehicle = validateVehicleProfile(rep.vehicle)
  const rawDamages = Array.isArray(rep.damages) ? rep.damages : []
  const damages: DamageFinding[] = rawDamages.map((d: any, i: number) => validateDamageFinding(d, i))

  const riskAssessment = validateRiskAssessment(rep.riskAssessment, damages)

  const validRecommendations: FinalRecommendation[] = ['RETAIL READY', 'WHOLESALE TRADE', 'SCRAP / SALVAGE']
  let finalRecommendation: FinalRecommendation = validRecommendations.includes(rep.finalRecommendation)
    ? rep.finalRecommendation
    : 'WHOLESALE TRADE'

  if (riskAssessment.finalDecision === 'TOW TRUCK ONLY' && finalRecommendation === 'RETAIL READY') {
    finalRecommendation = 'WHOLESALE TRADE'
  }

  const overallHealth = typeof rep.overallHealth === 'number' && !isNaN(rep.overallHealth)
    ? Math.max(0, Math.min(100, rep.overallHealth))
    : 70

  const confidenceScore = typeof rep.confidenceScore === 'number' && !isNaN(rep.confidenceScore)
    ? Math.max(0, Math.min(100, rep.confidenceScore))
    : 88

  let underCarriageAudit: UnderCarriageAudit | null = null
  if (rep.underCarriageAudit && typeof rep.underCarriageAudit === 'object') {
    const uc = rep.underCarriageAudit
    underCarriageAudit = {
      undercoatingDetected: Boolean(uc.undercoatingDetected),
      undercoatingRationale: String(uc.undercoatingRationale || 'Standard factory e-coat.'),
      railStraightness: ['PERFECT', 'KINKED', 'CLAMP_MARKS_DETECTED'].includes(uc.railStraightness) ? uc.railStraightness : 'PERFECT',
      railRationale: String(uc.railRationale || 'Frame rails within 1mm factory tolerances.'),
      rustGrade: ['NONE', 'SURFACE', 'STRUCTURAL_ROT'].includes(uc.rustGrade) ? uc.rustGrade : 'NONE',
      rustRationale: String(uc.rustRationale || 'No structural rust penetration observed.'),
      leakTrace: String(uc.leakTrace || 'Dry underbody surfaces; no active fluid pooling.'),
    }
  }

  return {
    id: typeof rep.id === 'string' && rep.id ? rep.id : fallbackId || `report-${Date.now()}`,
    timestamp: typeof rep.timestamp === 'number' && rep.timestamp > 0 ? rep.timestamp : Date.now(),
    vehicle,
    damages,
    overallHealth,
    confidenceScore,
    summary: typeof rep.summary === 'string' && rep.summary.trim() ? rep.summary.trim() : 'Comprehensive GDVF forensic inspection completed.',
    priorRepairDetected: Boolean(rep.priorRepairDetected),
    adasCalibrationRequired: Boolean(rep.adasCalibrationRequired),
    forensicVerdict: typeof rep.forensicVerdict === 'string' && rep.forensicVerdict.trim() ? rep.forensicVerdict.trim() : 'Forensic evaluation concluded.',
    finalRecommendation,
    riskAssessment,
    underCarriageAudit,
    acousticAudit: rep.acousticAudit || null,
    imageUrl: typeof rep.imageUrl === 'string' ? rep.imageUrl : undefined,
    recalls: Array.isArray(rep.recalls) ? rep.recalls : [],
  }
}
