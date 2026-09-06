import assert from 'node:assert/strict'
import test from 'node:test'
import { WEATHER_PRESETS, weatherService } from '../../src/services/weatherService.ts'

test('Road Physics Stream — Weather Presets Available', () => {
  assert.ok(WEATHER_PRESETS.length >= 4)
  const currentPreset = WEATHER_PRESETS.find((p) => p.id === 'current')
  assert.ok(currentPreset)
})

test('Road Physics Stream — Severe Weather Calculation and Grip Penalty', () => {
  const severeStormReport = weatherService.evaluateRoadHazards({
    temperatureC: 15,
    apparentTemperatureC: 14,
    precipitationMm: 12.0,
    windSpeedKmh: 45,
    windGustsKmh: 65,
    visibilityMeters: 600,
    relativeHumidity: 98,
    weatherCode: 95,
    wmoMultiplier: 0.9,
  })

  assert.ok(severeStormReport.roadGripIndex < 60)
  assert.equal(severeStormReport.roadHazardLevel, 'SEVERE_DANGER')
  assert.ok(severeStormReport.safeSpeedCapKmh <= 70)
  assert.ok(severeStormReport.hazards.some((h) => h.type === 'HYDROPLANING' || h.type === 'THUNDERSTORM'))
})
