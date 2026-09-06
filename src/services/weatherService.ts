import type { RoadHazardLevel, WeatherHazard, WeatherReport } from '../types'
import {
  resilientFetch,
  weatherCircuitBreaker,
  weatherRateLimiter,
  weatherCache,
} from './networkResilience.ts'

/**
 * WMO Weather Interpretation Codes (WW) mapping
 */
const WMO_CODE_MAP: Record<number, { text: string; icon: string; severityMultiplier: number }> = {
  0: { text: 'Clear Sky', icon: '☀️', severityMultiplier: 0 },
  1: { text: 'Mainly Clear', icon: '🌤️', severityMultiplier: 0 },
  2: { text: 'Partly Cloudy', icon: '⛅', severityMultiplier: 0 },
  3: { text: 'Overcast', icon: '☁️', severityMultiplier: 0.1 },
  45: { text: 'Dense Fog', icon: '🌫️', severityMultiplier: 0.6 },
  48: { text: 'Depositing Rime Fog', icon: '🌫️', severityMultiplier: 0.7 },
  51: { text: 'Light Drizzle', icon: '🌦️', severityMultiplier: 0.2 },
  53: { text: 'Moderate Drizzle', icon: '🌧️', severityMultiplier: 0.3 },
  55: { text: 'Dense Drizzle', icon: '🌧️', severityMultiplier: 0.4 },
  56: { text: 'Light Freezing Drizzle', icon: '🌨️', severityMultiplier: 0.8 },
  57: { text: 'Dense Freezing Drizzle', icon: '🌨️', severityMultiplier: 0.95 },
  61: { text: 'Slight Rain', icon: '🌧️', severityMultiplier: 0.3 },
  63: { text: 'Moderate Rain', icon: '🌧️', severityMultiplier: 0.5 },
  65: { text: 'Heavy Rain / Downpour', icon: '⛈️', severityMultiplier: 0.8 },
  66: { text: 'Light Freezing Rain', icon: '🧊', severityMultiplier: 0.85 },
  67: { text: 'Heavy Freezing Rain', icon: '🧊', severityMultiplier: 1.0 },
  71: { text: 'Slight Snow Fall', icon: '🌨️', severityMultiplier: 0.6 },
  73: { text: 'Moderate Snow Fall', icon: '❄️', severityMultiplier: 0.75 },
  75: { text: 'Heavy Snow Fall', icon: '❄️', severityMultiplier: 0.9 },
  77: { text: 'Snow Grains', icon: '❄️', severityMultiplier: 0.6 },
  80: { text: 'Slight Rain Showers', icon: '🌦️', severityMultiplier: 0.3 },
  81: { text: 'Moderate Rain Showers', icon: '🌧️', severityMultiplier: 0.5 },
  82: { text: 'Violent Rain Showers', icon: '🌊', severityMultiplier: 0.85 },
  85: { text: 'Slight Snow Showers', icon: '🌨️', severityMultiplier: 0.6 },
  86: { text: 'Heavy Snow Showers', icon: '❄️', severityMultiplier: 0.9 },
  95: { text: 'Thunderstorm', icon: '⚡', severityMultiplier: 0.75 },
  96: { text: 'Thunderstorm with Slight Hail', icon: '⛈️', severityMultiplier: 0.9 },
  99: { text: 'Severe Thunderstorm with Heavy Hail', icon: '🌪️', severityMultiplier: 1.0 },
}

export interface WeatherPreset {
  id: string
  label: string
  locationName: string
  latitude: number
  longitude: number
  description: string
  simulatedScenario?: string
}

export const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'current',
    label: '📍 Live GPS Location',
    locationName: 'Auto-Detected GPS',
    latitude: 0,
    longitude: 0,
    description: 'Real-time telemetry from your device GPS',
  },
  {
    id: 'tokyo-rain',
    label: '🌧️ Tokyo (Heavy Rain & Hydroplane Risk)',
    locationName: 'Tokyo, Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    description: 'Monsoon downpours, standing water, and road aquaplaning danger',
  },
  {
    id: 'munich-snow',
    label: '❄️ Munich (Alpine Black Ice & Frost)',
    locationName: 'Munich, Germany',
    latitude: 48.1351,
    longitude: 11.582,
    description: 'Sub-zero temperatures, freezing bridges, and black ice hazards',
  },
  {
    id: 'london-fog',
    label: '🌫️ London (Dense Fog & Low Visibility)',
    locationName: 'London, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    description: 'Thick fog banks reducing road visual range below 400m',
  },
  {
    id: 'capetown-gale',
    label: '🌪️ Cape Town (Coastal Gale Crosswinds)',
    locationName: 'Cape Town, South Africa',
    latitude: -33.9249,
    longitude: 18.4241,
    description: 'Severe 60+ km/h crosswinds threatening high-profile vehicles',
  },
  {
    id: 'dallas-heat',
    label: '☀️ Dallas (Extreme Heat & Tire Delamination)',
    locationName: 'Dallas, TX, USA',
    latitude: 32.7767,
    longitude: -96.797,
    description: 'High surface temperatures accelerating tire fatigue and cooling loads',
  },
]

export const weatherService = {
  /**
   * Fetch real-time weather from Open-Meteo by coordinates with enterprise resilience & caching
   */
  async fetchWeatherByCoordinates(
    latitude: number,
    longitude: number,
    locationLabel?: string
  ): Promise<WeatherReport> {
    const latRounded = Number(latitude.toFixed(2))
    const lonRounded = Number(longitude.toFixed(2))
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latRounded.toFixed(4)}&longitude=${lonRounded.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_gusts_10m&hourly=visibility,precipitation_probability&forecast_days=1`

    try {
      const data = await resilientFetch<any>(url, undefined, {
        name: 'OpenMeteoWeather',
        timeoutMs: 6000,
        maxRetries: 2,
        retryDelayMs: 400,
        cacheTtlMs: 5 * 60 * 1000, // 5 minute TTL
        cache: weatherCache,
        circuitBreaker: weatherCircuitBreaker,
        rateLimiter: weatherRateLimiter,
        staleFallback: true,
      })

      const current = data?.current || {}
      const hourly = data?.hourly || {}

      // Compute average immediate visibility from hourly data
      const visibility = Array.isArray(hourly.visibility) && hourly.visibility.length > 0
        ? Math.round(hourly.visibility[0])
        : 10000

      const precipProb = Array.isArray(hourly.precipitation_probability) && hourly.precipitation_probability.length > 0
        ? Math.round(hourly.precipitation_probability[0])
        : Math.min(100, Math.round((current.precipitation || 0) * 20))

      const weatherCode = Number(current.weather_code) || 0
      const wmoInfo = WMO_CODE_MAP[weatherCode] || { text: 'Partly Cloudy', icon: '⛅', severityMultiplier: 0.1 }

      const temperatureC = Math.round((current.temperature_2m ?? 20) * 10) / 10
      const apparentTemperatureC = Math.round((current.apparent_temperature ?? temperatureC) * 10) / 10
      const precipitationMm = Math.round((current.precipitation ?? 0) * 10) / 10
      const windSpeedKmh = Math.round((current.wind_speed_10m ?? 10) * 10) / 10
      const windGustsKmh = Math.round((current.wind_gusts_10m ?? windSpeedKmh * 1.3) * 10) / 10
      const relativeHumidity = Math.round(current.relative_humidity_2m ?? 50)

      // Run automotive forensic hazard evaluation
      const analysis = this.evaluateRoadHazards({
        temperatureC,
        apparentTemperatureC,
        precipitationMm,
        windSpeedKmh,
        windGustsKmh,
        visibilityMeters: visibility,
        relativeHumidity,
        weatherCode,
        wmoMultiplier: wmoInfo.severityMultiplier,
      })

      return {
        locationName: locationLabel || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
        latitude,
        longitude,
        timestamp: Date.now(),
        temperatureC,
        apparentTemperatureC,
        weatherCode,
        conditionText: wmoInfo.text,
        conditionIcon: wmoInfo.icon,
        precipitationMm,
        precipitationProbability: precipProb,
        windSpeedKmh,
        windGustsKmh,
        visibilityMeters: visibility,
        relativeHumidity,
        roadHazardLevel: analysis.roadHazardLevel,
        roadGripIndex: analysis.roadGripIndex,
        hazards: analysis.hazards,
        tacticalAdvisory: analysis.tacticalAdvisory,
        safeSpeedCapKmh: analysis.safeSpeedCapKmh,
      }
    } catch (err) {
      console.warn('[WeatherService] Upstream weather fetch failed, applying nominal baseline:', err)
      // Provide safe nominal fallback if offline and no cache entry exists
      const fallbackAnalysis = this.evaluateRoadHazards({
        temperatureC: 20,
        apparentTemperatureC: 20,
        precipitationMm: 0,
        windSpeedKmh: 10,
        windGustsKmh: 15,
        visibilityMeters: 10000,
        relativeHumidity: 50,
        weatherCode: 0,
        wmoMultiplier: 0,
      })

      return {
        locationName: locationLabel || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}° (Cached Baseline)`,
        latitude,
        longitude,
        timestamp: Date.now(),
        temperatureC: 20,
        apparentTemperatureC: 20,
        weatherCode: 0,
        conditionText: 'Nominal Conditions (Offline)',
        conditionIcon: '🌤️',
        precipitationMm: 0,
        precipitationProbability: 0,
        windSpeedKmh: 10,
        windGustsKmh: 15,
        visibilityMeters: 10000,
        relativeHumidity: 50,
        roadHazardLevel: fallbackAnalysis.roadHazardLevel,
        roadGripIndex: fallbackAnalysis.roadGripIndex,
        hazards: fallbackAnalysis.hazards,
        tacticalAdvisory: 'Standard baseline active. Connect to telemetry network for live radar updates.',
        safeSpeedCapKmh: fallbackAnalysis.safeSpeedCapKmh,
      }
    }
  },

  /**
   * Geocode a destination string (e.g. "Dallas, TX", "Munich, Germany") and fetch its weather
   */
  async fetchWeatherByLocationName(query: string): Promise<WeatherReport | null> {
    if (!query || !query.trim()) return null
    try {
      // Open-Meteo geocoding prefers primary city/locality name over comma-separated strings
      const sanitizedName = query.includes(',') ? query.split(',')[0].trim() : query.trim()
      const searchTerms = [sanitizedName]
      if (sanitizedName !== query.trim()) {
        searchTerms.push(query.trim())
      }

      let match: any = null
      for (const term of searchTerms) {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          term
        )}&count=5&language=en&format=json`

        try {
          const geoData = await resilientFetch<any>(geoUrl, undefined, {
            name: 'OpenMeteoGeocoding',
            timeoutMs: 5000,
            maxRetries: 1,
            cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hour geocode cache
            cache: weatherCache,
            rateLimiter: weatherRateLimiter,
            circuitBreaker: weatherCircuitBreaker,
          })

          if (Array.isArray(geoData?.results) && geoData.results.length > 0) {
            match = geoData.results[0]
            break
          }
        } catch (_) {}
      }

      if (!match) {
        return null
      }

      const label = [match.name, match.admin1, match.country].filter(Boolean).join(', ')
      return await this.fetchWeatherByCoordinates(match.latitude, match.longitude, label)
    } catch (err) {
      console.warn('[WeatherService] Geocoding lookup failed:', err)
      return null
    }
  },

  /**
   * Evaluate automotive road safety, grip coefficients, and hazard warnings
   */
  evaluateRoadHazards(params: {
    temperatureC: number
    apparentTemperatureC: number
    precipitationMm: number
    windSpeedKmh: number
    windGustsKmh: number
    visibilityMeters: number
    relativeHumidity: number
    weatherCode: number
    wmoMultiplier: number
  }): {
    hazards: WeatherHazard[]
    roadHazardLevel: RoadHazardLevel
    roadGripIndex: number
    safeSpeedCapKmh: number
    tacticalAdvisory: string
  } {
    const hazards: WeatherHazard[] = []
    let gripScore = 95 // dry nominal asphalt
    let safeSpeed = 120 // km/h highway nominal baseline

    // 1. Hydroplaning / Standing Water Risk
    if (params.precipitationMm > 4.0 || [65, 82, 95, 96, 99].includes(params.weatherCode)) {
      gripScore -= 38
      safeSpeed = Math.min(safeSpeed, 70)
      hazards.push({
        id: 'w-hydroplane',
        type: 'HYDROPLANING',
        title: 'Severe Hydroplaning Hazard',
        description: `Active heavy precipitation (${params.precipitationMm} mm/h). Standing water pooling on highway lanes.`,
        severity: 'CRITICAL',
        speedReductionKmh: 35,
        recommendedAction: 'Reduce speed to 70 km/h max. Avoid sudden lane changes and standing water in outer lanes.',
      })
    } else if (params.precipitationMm > 0.5 || [51, 53, 55, 61, 63, 80, 81].includes(params.weatherCode)) {
      gripScore -= 18
      safeSpeed = Math.min(safeSpeed, 90)
      hazards.push({
        id: 'w-wet-road',
        type: 'HYDROPLANING',
        title: 'Wet Road Surface Advisory',
        description: 'Reduced tire-to-tarmac friction. Increased braking distance required.',
        severity: 'WARNING',
        speedReductionKmh: 15,
        recommendedAction: 'Increase following distance to 4+ seconds. Smooth braking inputs.',
      })
    }

    // 2. Black Ice & Freezing Precipitation Risk
    if (
      params.temperatureC <= 2.5 &&
      (params.precipitationMm > 0 || params.relativeHumidity > 80 || [56, 57, 66, 67, 71, 73, 75, 85, 86].includes(params.weatherCode))
    ) {
      gripScore -= 50
      safeSpeed = Math.min(safeSpeed, 50)
      hazards.push({
        id: 'w-black-ice',
        type: 'BLACK_ICE',
        title: 'Black Ice & Freeze Hazard',
        description: `Sub-zero thermal boundary (${params.temperatureC}°C). High probability of invisible black ice on bridges and shaded turns.`,
        severity: 'CRITICAL',
        speedReductionKmh: 45,
        recommendedAction: 'Cap cruising speed at 50 km/h. Zero abrupt steering or heavy regenerative braking.',
      })
    }

    // 3. Dense Fog / Low Visibility Hazard
    if (params.visibilityMeters < 800 || [45, 48].includes(params.weatherCode)) {
      gripScore -= 10
      safeSpeed = Math.min(safeSpeed, 60)
      hazards.push({
        id: 'w-dense-fog',
        type: 'DENSE_FOG',
        title: 'Low Visibility Fog Shield',
        description: `Visual range restricted to ${Math.round(params.visibilityMeters)}m. Forward obstacle detection impaired.`,
        severity: 'WARNING',
        speedReductionKmh: 30,
        recommendedAction: 'Engage low beams and fog lamps. Track right road shoulder markings.',
      })
    }

    // 4. Severe Crosswinds & Gale Force
    if (params.windGustsKmh > 55) {
      gripScore -= 15
      safeSpeed = Math.min(safeSpeed, 80)
      hazards.push({
        id: 'w-crosswind',
        type: 'CROSSWINDS',
        title: 'Gale Crosswind Stability Threat',
        description: `Crosswind gusts reaching ${params.windGustsKmh} km/h. Risk of lateral vehicle deflection across open overpasses.`,
        severity: params.windGustsKmh > 75 ? 'CRITICAL' : 'WARNING',
        speedReductionKmh: 20,
        recommendedAction: 'Maintain firm two-handed grip on wheel. Anticipate bridge exit wind sheer.',
      })
    }

    // 5. Thunderstorm / Hail / Debris
    if ([95, 96, 99].includes(params.weatherCode)) {
      hazards.push({
        id: 'w-storm',
        type: 'THUNDERSTORM',
        title: 'Severe Convective Thunderstorm & Hail',
        description: 'High intensity lightning, potential windshield hail impact and flash flooding.',
        severity: 'CRITICAL',
        speedReductionKmh: 40,
        recommendedAction: 'Seek covered overpass or service station if hail commences. Hazard flashers on.',
      })
    }

    // 6. Extreme Heat / Tire Thermal Stress
    if (params.temperatureC >= 38) {
      hazards.push({
        id: 'w-heat',
        type: 'EXTREME_HEAT',
        title: 'Thermal Tire & Engine Strain',
        description: `Ambient temperature ${params.temperatureC}°C. Elevated asphalt surface temperature exceeding 55°C.`,
        severity: 'INFO',
        speedReductionKmh: 10,
        recommendedAction: 'Monitor tire pressure telemetry and engine coolant thermals closely.',
      })
    }

    // Clamp grip score between 15% and 99%
    const finalGrip = Math.max(15, Math.min(99, gripScore))

    let roadHazardLevel: RoadHazardLevel = 'OPTIMAL'
    if (hazards.some((h) => h.severity === 'CRITICAL')) {
      roadHazardLevel = 'SEVERE_DANGER'
    } else if (hazards.some((h) => h.severity === 'WARNING')) {
      roadHazardLevel = 'HAZARDOUS'
    } else if (hazards.length > 0) {
      roadHazardLevel = 'CAUTION'
    }

    // Compose Tactical Voice Advisory
    let tacticalAdvisory = 'Road conditions optimal. Standard cruising profiles permitted.'
    if (roadHazardLevel === 'SEVERE_DANGER') {
      const topHazard = hazards.find((h) => h.severity === 'CRITICAL') || hazards[0]
      tacticalAdvisory = `CRITICAL WEATHER SHIELD: ${topHazard.title}. Speed capped at ${safeSpeed} km/h. ${topHazard.recommendedAction}`
    } else if (roadHazardLevel === 'HAZARDOUS') {
      const topHazard = hazards[0]
      tacticalAdvisory = `WEATHER ADVISORY: ${topHazard.title}. Reduce speed by ${topHazard.speedReductionKmh} km/h.`
    }

    return {
      hazards,
      roadHazardLevel,
      roadGripIndex: finalGrip,
      safeSpeedCapKmh: safeSpeed,
      tacticalAdvisory,
    }
  },
}
