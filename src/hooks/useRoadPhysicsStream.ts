import { useState, useEffect, useRef, useCallback } from 'react'
import { weatherService, WEATHER_PRESETS, type WeatherPreset } from '../services/weatherService.ts'
import type { WeatherReport } from '../types.ts'

export interface RoadPhysicsStreamOptions {
  autoTrackGps?: boolean
  initialPresetId?: string
  initialSpeedKmh?: number
}

export function useRoadPhysicsStream(options: RoadPhysicsStreamOptions = {}) {
  const { autoTrackGps = false, initialPresetId = 'current', initialSpeedKmh = 74 } = options

  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(null)
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false)
  const [activePreset, setActivePreset] = useState<string>(initialPresetId)
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(initialSpeedKmh)
  const [speedLimitKmh] = useState<number>(80)

  const watchIdRef = useRef<number | null>(null)

  const loadWeatherForLocation = useCallback(async (preset: WeatherPreset) => {
    setActivePreset(preset.id)
    setIsWeatherLoading(true)

    try {
      let report: WeatherReport | null = null

      if (preset.id === 'current') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          report = await new Promise<WeatherReport | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                setPosition(pos)
                const res = await weatherService.fetchWeatherByCoordinates(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  'Current GPS Position'
                )
                resolve(res)
              },
              async () => {
                const res = await weatherService.fetchWeatherByCoordinates(51.5074, -0.1278, 'London (GPS Default)')
                resolve(res)
              },
              { timeout: 4000 }
            )
          })
        } else {
          report = await weatherService.fetchWeatherByCoordinates(51.5074, -0.1278, 'London (GPS Default)')
        }
      } else if (preset.latitude && preset.longitude) {
        report = await weatherService.fetchWeatherByCoordinates(preset.latitude, preset.longitude, preset.label)
      } else if (preset.locationName) {
        report = await weatherService.fetchWeatherByLocationName(preset.locationName)
      }

      if (report) {
        setWeatherReport(report)
      }
      return report
    } catch (e) {
      console.warn('[useRoadPhysicsStream] Weather fetch error:', e)
      return null
    } finally {
      setIsWeatherLoading(false)
    }
  }, [])

  const startGpsTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos)
        if (pos.coords.speed !== null && !isNaN(pos.coords.speed)) {
          setCurrentSpeedKmh(Math.round(pos.coords.speed * 3.6))
        }
      },
      (err) => console.warn('[useRoadPhysicsStream] GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    )
  }, [])

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => {
    const defaultPreset = WEATHER_PRESETS.find((p) => p.id === initialPresetId) || WEATHER_PRESETS[0]
    loadWeatherForLocation(defaultPreset)

    if (autoTrackGps) {
      startGpsTracking()
    }

    return () => {
      stopGpsTracking()
    }
  }, [autoTrackGps, initialPresetId, loadWeatherForLocation, startGpsTracking, stopGpsTracking])

  return {
    position,
    setPosition,
    weatherReport,
    setWeatherReport,
    isWeatherLoading,
    activePreset,
    currentSpeedKmh,
    setCurrentSpeedKmh,
    speedLimitKmh,
    loadWeatherForLocation,
    startGpsTracking,
    stopGpsTracking,
  }
}
