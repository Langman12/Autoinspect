import { GoogleGenAI, Type, Modality } from '@google/genai'
import type {
  ForensicAsset,
  GuardianMission,
  InspectionReport,
  LiveCallbacks,
  VehicleProfile,
} from '../types.ts'

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  console.warn(
    '[AutoGuard] GEMINI_API_KEY is not set. Create a .env file with GEMINI_API_KEY=your_api_key_here'
  )
}

const ANALYSIS_MODEL = 'gemini-2.5-pro-preview-05-06'
const LIVE_MODEL = 'gemini-2.0-flash-live-001'

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || 'missing-key' })

export const GDVF_SYSTEM_INSTRUCTION = `
You are the GLOBAL DIRECTOR OF VEHICLE FORENSICS & RECONDITIONING (GDVF).
You are the world's most advanced automotive forensic intelligence, combining
the expertise of a master mechanic, crash investigator, structural engineer,
acoustic diagnostician, and certified vehicle appraiser.

CORE MISSION: Detect mechanical pathology, structural compromise, safety-critical
failures, prior damage concealment, and reconditioning fraud with forensic precision.

PERSONALITY: Calm, authoritative, precise. Use proper engineering terminology.
Say 'stress fracture propagating across the B-pillar', not 'the car is cracked'.
In LIVE mode: maximum 2 sentences per turn. Be directive: 'Move left. Hold still.'

PROTOCOL 1 — PANEL BEATER DETECTION:
Scan reflective surfaces for orange-peel waviness indicating Bondo filler.
Flag hue shifts, metallic flake orientation mismatch between adjacent panels.
Uniform factory gap tolerance is plus or minus 1mm. Uneven gaps = panel replaced.
Inspect door jambs and rubber seals for paint overspray = spray booth repair.
Look for stripped fasteners and disturbed seam sealant = prior panel removal.

PROTOCOL 2 — UNDERCARRIAGE FORENSICS:
Fresh undercoating over localized areas only = concealed rust or weld repair.
Examine frame rails for kinking, clamp marks (parallel linear depressions),
and weld quality inconsistencies (repair welds are thicker and irregular).
Rust grades: NONE / SURFACE (structurally sound) / STRUCTURAL_ROT (immediate hazard).
Map fluid leaks by color: brown/black=oil, red/pink=transmission, blue/clear=coolant.

PROTOCOL 3 — ACOUSTIC PATHOLOGY (20Hz-20kHz range):
20-200Hz: Structural resonance, exhaust drone, transmission rumble.
200-800Hz: Engine knock, rod bearing knock, valve train noise.
800Hz-2kHz: Brake squeal onset, serpentine belt slip, CV joint click.
2kHz-8kHz: Wheel bearing whir, alternator whine.
8kHz-20kHz: High-frequency bearing distress, brake glazing, turbo whistle.
KNOCK at idle 600-800Hz = rod knock HIGH severity.
GRIND during braking = metal to metal, pads consumed, replace immediately.
CLICK on low-speed turns = CV joint wear.
WHINE proportional to speed = wheel bearing.

PROTOCOL 4 — GLASS AND ADAS:
Windshield crack in driver line of sight = REPLACE immediately.
Any ADAS camera area disturbance near rearview mirror = set adasCalibrationRequired true.
Headlight hazing above 6 out of 10 = over 30% light loss = legal hazard.

PROTOCOL 5 — SAFETY SYSTEMS:
Deployed airbag not replaced = automatic TOW TRUCK ONLY decision.
Inspect steering wheel and dash for white powder residue = sodium azide deployment.
Brake rotor scoring over 2mm depth or heat-bluing = flag HIGH.
Tire tread below 2/32 inch = illegal. Sidewall cracks or bulges = CRITICAL.

PROTOCOL 6 — MILEAGE FORENSICS:
Cross-reference stated mileage against: steering wheel leather wear, pedal rubber
profile, seat bolster wear, UV fade on dash vs door jambs.
Set MILEAGE_ROLLBACK_SUSPECTED if wear patterns are inconsistent with stated mileage.

VEHICLE CLASS CALIBRATION:
ECONOMY: Lower costs, higher mileage normal, less corrosion protection expected.
LUXURY: OEM parts only, complex ADAS, multiply labor rates by 1.5x to 2x.
EXOTIC: Carbon fiber delamination check, track use detection, costs 2x to 5x luxury.
COMMERCIAL: Accelerated wear expected, inspect load area, note DOT compliance.

RISK ASSESSMENT LOGIC:
finalDecision MUST be TOW TRUCK ONLY if any of these are true:
- Deployed airbag not replaced OR airbag warning light illuminated
- Brake fluid empty OR brake pedal goes to floor
- Frame rail kinked or cracked
- Tire at or below legal minimum OR sidewall damage
- Active brake, fuel, or steering fluid leak
- Wheel bearing failure indicated acoustically
finalDecision is SAFE TO DRIVE only when none of the above apply AND overallHealth is 40 or above.

OUTPUT RULES: Return ONLY valid JSON matching the responseSchema. No markdown, no commentary.
Never truncate. Confidence: 90-100=crystal clear, 70-89=good, 50-69=partial, under 50=insufficient.
Cost estimates always include three tiers: DIY/budget, independent shop, dealer/specialist.
`

export const GUARDIAN_SYSTEM_INSTRUCTION = `
You are GLOBAL GUARDIAN, an elite tactical AI co-pilot for AutoGuard AI.
You combine the expertise of a professional race co-pilot, tactical security specialist,
meteorologist, and emergency response coordinator. You speak directly into the driver's
ears in real time.

CRITICAL VOICE RULES (vehicle in motion):
Turn instructions: maximum 12 words.
Hazard warnings: maximum 20 words.
Speed alerts: maximum 8 words.
Full sentences only when vehicle is parked or speed is below 5mph.

PROACTIVE INTELLIGENCE:
You see ahead and warn before problems arrive.
Speed cameras: warn 400 meters before.
School zones: warn 250 meters before.
Lane requirements: announce 600 meters before complex junctions.
Weather changes: warn 5 minutes of drive time in advance.
Always address the driver as 'you'. Never say 'the driver'.

NAVIGATION PRIORITY (highest to lowest):
1. Active road closures and accidents - immediate reroute.
2. Emergency vehicle corridor - yield and hold.
3. Driver fatigue over 2 hours continuous driving.
4. Weather hazards: ice, flood, dense fog, severe crosswind.
5. Vehicle condition warnings from Forensic module.
6. School and hospital zones - reduce speed.
7. Traffic congestion with time cost analysis.
8. Fuel or charge level versus route range.
9. User preference then fastest path.

VOICE TEMPLATES:
Turn: 'In [distance], turn [direction] on [road].'
Speed: '[limit] zone ahead.'
Hazard: 'Caution — [hazard] ahead. Reduce speed.'
Reroute: 'Faster route found. Recalculating.'
Arrival: 'Destination on your [left or right]. Arrived.'

DRIVING BEHAVIOR COACHING:
Hard braking - note after stop only, never during event:
  'Increasing following distance gives you more reaction time.'
Speeding over 5mph in urban zone: '[limit] zone. Reduce speed.'
Tailgating: 'Increase following distance for safety.'
Phone use detected: 'Guardian enabled Do Not Disturb. Stay focused.'
Clean 30 minute segment: 'Excellent driving. Safety score is strong.'

EMERGENCY PROTOCOL:
On crash detection: Step 1: 'I detected an impact. Emergency services are being contacted.'
Step 2: 'Stay still. Help is on the way. Hazards are on.'
Step 3: 'Are you injured? Say yes or no.'
Step 4 if no response in 10 seconds: 'Calling emergency services now.'

Drowsiness at 2 hours: 'You have been driving 2 hours. Rest area ahead.'
Drowsiness at 3 hours: 'Fatigue increases risk significantly. Stop soon.'
Lane drift detected: 'Driving pattern changed. Pull over safely.'

HARD LIMITS - NEVER VIOLATE:
Never suggest illegal maneuvers.
Never disable safety alerts while in motion.
Never speak more than 20 words above 20mph.
Never joke during active hazard situations.
Always defer to emergency services over your own guidance.
`

export const FORENSIC_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    damages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['BODY', 'MECHANICAL', 'STRUCTURAL', 'INTERIOR', 'GLASS', 'WHEELS', 'SAFETY'],
          },
          component: { type: Type.STRING },
          description: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['GREEN', 'YELLOW', 'RED'] },
          severityScore: { type: Type.NUMBER },
          estimatedCost: {
            type: Type.OBJECT,
            properties: {
              low: { type: Type.STRING },
              medium: { type: Type.STRING },
              high: { type: Type.STRING },
            },
            required: ['low', 'medium', 'high'],
          },
          actionRequired: { type: Type.STRING },
          acousticProfile: { type: Type.STRING, nullable: true },
        },
        required: [
          'id',
          'type',
          'component',
          'description',
          'status',
          'severityScore',
          'estimatedCost',
          'actionRequired',
        ],
      },
    },
    overallHealth: { type: Type.NUMBER },
    confidenceScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    priorRepairDetected: { type: Type.BOOLEAN },
    adasCalibrationRequired: { type: Type.BOOLEAN },
    forensicVerdict: { type: Type.STRING },
    finalRecommendation: {
      type: Type.STRING,
      enum: ['RETAIL READY', 'WHOLESALE TRADE', 'SCRAP / SALVAGE'],
    },
    riskAssessment: {
      type: Type.OBJECT,
      properties: {
        brakingSystem: { type: Type.BOOLEAN },
        steeringSuspension: { type: Type.BOOLEAN },
        fireRisk: { type: Type.BOOLEAN },
        structuralIntegrity: { type: Type.BOOLEAN },
        finalDecision: { type: Type.STRING, enum: ['SAFE TO DRIVE', 'TOW TRUCK ONLY'] },
        rationale: { type: Type.STRING },
      },
      required: [
        'brakingSystem',
        'steeringSuspension',
        'fireRisk',
        'structuralIntegrity',
        'finalDecision',
        'rationale',
      ],
    },
    underCarriageAudit: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        undercoatingDetected: { type: Type.BOOLEAN },
        undercoatingRationale: { type: Type.STRING },
        railStraightness: { type: Type.STRING, enum: ['PERFECT', 'KINKED', 'CLAMP_MARKS_DETECTED'] },
        railRationale: { type: Type.STRING },
        rustGrade: { type: Type.STRING, enum: ['NONE', 'SURFACE', 'STRUCTURAL_ROT'] },
        rustRationale: { type: Type.STRING },
        leakTrace: { type: Type.STRING },
      },
    },
    acousticAudit: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        signatures: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              frequencyRange: { type: Type.STRING },
              detectedStatus: { type: Type.STRING, enum: ['NORMAL_OPERATING', 'ANOMALY_DETECTED'] },
              description: { type: Type.STRING },
              crossReferenceNote: { type: Type.STRING },
            },
          },
        },
        overallMechanicalNote: { type: Type.STRING },
      },
    },
  },
  required: [
    'damages',
    'overallHealth',
    'confidenceScore',
    'summary',
    'priorRepairDetected',
    'adasCalibrationRequired',
    'forensicVerdict',
    'finalRecommendation',
    'riskAssessment',
  ],
}

const toBase64 = (data: string): string => data.replace(/^data:[^;]+;base64,/, '')

const safeParseJSON = (raw: string): any => {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('[AutoGuard] JSON parse failed. Raw response:', raw.substring(0, 300))
    return null
  }
}

const withRetry = async <T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const retryable = err?.status === 429 || err?.status === 503
      if (!retryable || i === maxAttempts - 1) throw err
      const delay = Math.pow(2, i) * 1200
      console.warn('[AutoGuard] Retrying in', delay, 'ms... attempt', i + 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('Max retry attempts exceeded')
}

export const geminiService = {
  async analyzeVehicle(assets: ForensicAsset[], vehicle: VehicleProfile): Promise<InspectionReport | null> {
    return withRetry(async () => {
      const assetParts = assets.map((asset) => ({
        inlineData: { data: toBase64(asset.data), mimeType: asset.mimeType },
      }))
      const prompt = [
        `Vehicle: ${vehicle.year || ''} ${vehicle.makeModel}`.trim(),
        vehicle.vin ? `VIN: ${vehicle.vin}` : '',
        vehicle.mileage ? `Mileage: ${vehicle.mileage}` : '',
        vehicle.fuelType ? `Fuel/Type: ${vehicle.fuelType}` : '',
        vehicle.class ? `Class: ${vehicle.class}` : '',
        'Run full GDVF forensic protocols on the attached media. Acoustic capture uses the full 20Hz-20kHz diagnostic range.',
      ]
        .filter(Boolean)
        .join('\n')

      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: { parts: [{ text: prompt }, ...assetParts] },
        config: {
          systemInstruction: GDVF_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: FORENSIC_RESPONSE_SCHEMA,
        },
      })
      const parsed = safeParseJSON((response as any).text ?? '')
      if (!parsed) return null
      return {
        ...parsed,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        vehicle,
      } as InspectionReport
    })
  },

  connectLive(callbacks: LiveCallbacks): Promise<any> {
    return ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{ text: GDVF_SYSTEM_INSTRUCTION + '\n\nLIVE FORENSIC MODE. Acoustic capture (full 20Hz-20kHz diagnostic range).' }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log('[AutoGuard Live] Connection established')
          callbacks.onopen?.()
        },
        onmessage: (msg: any) => {
          try {
            callbacks.onmessage(msg)
          } catch (err) {
            console.error('[AutoGuard Live] Message handler error:', err)
          }
        },
        onerror: (err: any) => {
          console.error('[AutoGuard Live] Connection error:', err)
          callbacks.onerror?.(err)
        },
        onclose: (evt: CloseEvent) => {
          console.log('[AutoGuard Live] Closed. Code:', evt.code, 'Reason:', evt.reason)
          if (evt.code !== 1000) {
            console.warn('[AutoGuard Live] Abnormal closure — consider reconnecting')
          }
          callbacks.onclose?.(evt)
        },
      },
    })
  },

  connectGuardianLive(mission: GuardianMission, callbacks: LiveCallbacks): Promise<any> {
    const weatherContext = mission.currentWeather
      ? `\nLIVE WEATHER RADAR: Location ${mission.currentWeather.locationName}, Condition ${mission.currentWeather.conditionText} (${mission.currentWeather.temperatureC}°C), Precipitation ${mission.currentWeather.precipitationMm} mm/h, Wind ${mission.currentWeather.windSpeedKmh} km/h (Gusts ${mission.currentWeather.windGustsKmh} km/h), Road Grip Index ${mission.currentWeather.roadGripIndex}%, Hazard Level ${mission.currentWeather.roadHazardLevel}. Safe Speed Cap: ${mission.currentWeather.safeSpeedCapKmh} km/h. Advisory: ${mission.currentWeather.tacticalAdvisory}`
      : ''

    return ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{
            text:
              GUARDIAN_SYSTEM_INSTRUCTION +
              `\n\nMISSION: Destination ${mission.destination}. Vehicle: ${mission.vehicleProfile}. Threat: ${mission.threatLevel}.${weatherContext}`,
          }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log('[Guardian Live] Connection established')
          callbacks.onopen?.()
        },
        onmessage: (msg: any) => {
          try {
            callbacks.onmessage(msg)
          } catch (err) {
            console.error('[Guardian Live] Message handler error:', err)
          }
        },
        onerror: (err: any) => {
          console.error('[Guardian Live] Connection error:', err)
          callbacks.onerror?.(err)
        },
        onclose: (evt: CloseEvent) => {
          console.log('[Guardian Live] Closed. Code:', evt.code)
          callbacks.onclose?.(evt)
        },
      },
    })
  },

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || GDVF_SYSTEM_INSTRUCTION,
        },
      })
      return response.text || ''
    } catch (err: any) {
      console.warn('[GeminiService] Text generation failed:', err)
      throw err
    }
  },

  async extractVehicleDetailsFromPhoto(
    imageBase64: string,
    mimeType = 'image/jpeg'
  ): Promise<Partial<VehicleProfile> | null> {
    try {
      const cleanData = toBase64(imageBase64)
      const prompt = `Analyze this automotive image (exterior vehicle body, grill badge, rear emblem, VIN sticker, driver door jamb certification label, dashboard VIN plate, engine bay stamp, or vehicle registration document).
Perform dual-level forensic identification:
1. If a VIN plate/sticker is legible, extract the exact 17-character alphanumeric VIN (letters A-Z except I, O, Q, and numbers 0-9).
2. If only the exterior or interior of the car is visible, identify the Make & Model (e.g. 'Tesla Model Y', 'Toyota Hilux GD-6', 'Ford Ranger', 'BMW M3', 'Mercedes C-Class'), estimated manufacturing Year, and Powertrain Type from visual body cues, styling, and emblems.

Return ONLY valid JSON:
{
  "vin": "17-char VIN or empty string if not directly legible in photo",
  "makeModel": "Make & Model name",
  "year": "YYYY",
  "mileage": "e.g. 35,000 km or empty string",
  "fuelType": "Petrol (Gasoline) | Diesel Turbo | Electric (EV) | Hybrid (HEV/PHEV) | Petrol (Sport)",
  "class": "ECONOMY | LUXURY | EXOTIC | COMMERCIAL"
}`

      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: [
          {
            parts: [
              { inlineData: { data: cleanData, mimeType } },
              { text: prompt },
            ],
          },
        ],
        config: {
          systemInstruction: 'You are an expert automotive OCR, VIN extraction, and visual vehicle identification engine. Return ONLY valid JSON.',
          responseMimeType: 'application/json',
        },
      })

      const rawText = response.text || ''
      const parsed = safeParseJSON(rawText)
      if (parsed) {
        if (parsed.vin) {
          parsed.vin = parsed.vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase()
        }
        if (parsed.vin || parsed.makeModel || parsed.year) {
          return parsed
        }
      }
      return null
    } catch (err) {
      console.warn('[GeminiService] Vehicle details extraction failed:', err)
      return null
    }
  },
}
