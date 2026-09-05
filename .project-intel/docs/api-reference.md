# AutoGuard AI — API & Schema Reference

## 1. Domain Types & Data Contracts ([`src/types.ts`](file:///home/def/autoinspect/src/types.ts))

### `InspectionReport`
The authoritative data contract generated after an automotive forensic scan:

```typescript
export interface InspectionReport {
  id: string                          // UUID v4
  timestamp: number                   // Epoch milliseconds
  vehicle: VehicleProfile             // Make, model, year, VIN, mileage, class
  damages: DamageFinding[]            // Array of categorized defects
  overallHealth: number               // 0 to 100 integer score
  confidenceScore: number             // 0 to 100 AI certainty index
  summary: string                     // Executive summary paragraph
  priorRepairDetected: boolean        // Prior accident concealment flag
  adasCalibrationRequired: boolean    // Windshield/camera recalibration flag
  forensicVerdict: string             // One-line technical classification
  finalRecommendation: FinalRecommendation // 'RETAIL READY' | 'WHOLESALE TRADE' | 'SCRAP / SALVAGE'
  riskAssessment: RiskAssessment      // Safety-critical subsystem pass/fail
  underCarriageAudit?: UnderCarriageAudit | null // Metallurgy & rail straightness
  acousticAudit?: AcousticAudit | null// 20Hz-20kHz frequency anomalies
  imageUrl?: string                   // Primary evidence photo data URL
  recalls?: NHTSARecall[]             // NHTSA campaign bulletins
}
```

### `DamageFinding`
```typescript
export interface DamageFinding {
  id: string
  type: 'BODY' | 'MECHANICAL' | 'STRUCTURAL' | 'INTERIOR' | 'GLASS' | 'WHEELS' | 'SAFETY'
  component: string
  description: string
  status: 'GREEN' | 'YELLOW' | 'RED'
  severityScore: number // 1 to 10
  estimatedCost: {
    low: string     // DIY / budget cost estimate
    medium: string  // Independent repair shop estimate
    high: string    // OEM Dealership specialist estimate
  }
  actionRequired: string
  acousticProfile?: string | null
}
```

### `WeatherReport` & `WeatherHazard`
```typescript
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
  roadHazardLevel: 'OPTIMAL' | 'CAUTION' | 'HAZARDOUS' | 'SEVERE_DANGER'
  roadGripIndex: number // 15% to 99%
  hazards: WeatherHazard[]
  tacticalAdvisory: string
  safeSpeedCapKmh: number
}
```

## 2. External Integration Endpoints
- **Ollama API:**
  - `GET /api/version` — Service liveness and version check.
  - `GET /api/tags` — Enumerate locally installed models.
  - `POST /api/generate` — Text synthesis and multimodal vision prompts (`format: "json"`).
- **Open-Meteo API:**
  - `GET https://geocoding-api.open-meteo.com/v1/search?name={name}&count=1&language=en&format=json`
  - `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=...&hourly=...`
- **NHTSA Vehicle Safety API:**
  - `GET https://api.nhtsa.dot.gov/recalls/recallsByVehicle?vin={vin}`
