import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { aiService } from './services/aiService'
import { ollamaService } from './services/ollamaService'
import { recallService } from './services/recallService'
import { storageService } from './services/storageService'
import { weatherService } from './services/weatherService'
import './index.css'

// Expose AutoGuard Agent & Services to global window for programmatic testing and console access
if (typeof window !== 'undefined') {
  window.autoGuard = {
    version: '2.5.0',
    aiService,
    ollamaService,
    weatherService,
    storageService,
    recallService,
    runSanitySuite: async () => {
      console.log('🧪 Running AutoGuard in-window sanity checks...')
      const t0 = performance.now()
      const gripCheck = weatherService.evaluateRoadHazards({
        temperatureC: 25,
        apparentTemperatureC: 25,
        precipitationMm: 0,
        windSpeedKmh: 10,
        windGustsKmh: 13,
        visibilityMeters: 10000,
        relativeHumidity: 50,
        weatherCode: 0,
        wmoMultiplier: 0,
      }).roadGripIndex >= 90

      const iceCheck = weatherService.evaluateRoadHazards({
        temperatureC: -2,
        apparentTemperatureC: -5,
        precipitationMm: 3.0,
        windSpeedKmh: 20,
        windGustsKmh: 26,
        visibilityMeters: 400,
        relativeHumidity: 95,
        weatherCode: 66,
        wmoMultiplier: 0.85,
      }).roadGripIndex <= 40

      const reports = await storageService.getReports(5)
      const durationMs = Number((performance.now() - t0).toFixed(2))

      const results = {
        gripCheckPassed: gripCheck,
        iceCheckPassed: iceCheck,
        cachedReportsCount: reports.length,
        executionTimeMs: durationMs,
        status: gripCheck && iceCheck ? 'ALL_CHECKS_PASSED' : 'SOME_CHECKS_FAILED',
      }
      console.table(results)
      return results
    },
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
