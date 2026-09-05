import test from 'node:test'
import assert from 'node:assert/strict'
import { weatherService } from '../src/services/weatherService.ts'

test('Weather Hazard Evaluation - Optimal Conditions', () => {
  const result = weatherService.evaluateRoadHazards({
    temperatureC: 22,
    apparentTemperatureC: 22,
    precipitationMm: 0,
    windSpeedKmh: 10,
    windGustsKmh: 12,
    visibilityMeters: 10000,
    relativeHumidity: 45,
    weatherCode: 0,
    wmoMultiplier: 0,
  })

  assert.equal(result.roadHazardLevel, 'OPTIMAL')
  assert.equal(result.roadGripIndex, 95)
  assert.equal(result.safeSpeedCapKmh, 120)
  assert.equal(result.hazards.length, 0)
})

test('Weather Hazard Evaluation - Hydroplaning Downpour', () => {
  const result = weatherService.evaluateRoadHazards({
    temperatureC: 18,
    apparentTemperatureC: 18,
    precipitationMm: 8.5,
    windSpeedKmh: 25,
    windGustsKmh: 35,
    visibilityMeters: 3000,
    relativeHumidity: 90,
    weatherCode: 65,
    wmoMultiplier: 0.8,
  })

  assert.equal(result.roadHazardLevel, 'SEVERE_DANGER')
  assert.ok(result.roadGripIndex <= 60, 'Grip index should be heavily reduced')
  assert.ok(result.safeSpeedCapKmh <= 70, 'Speed cap should be reduced for hydroplaning')
  assert.ok(result.hazards.some((h) => h.type === 'HYDROPLANING'))
})

test('Weather Hazard Evaluation - Sub-Zero Black Ice Risk', () => {
  const result = weatherService.evaluateRoadHazards({
    temperatureC: -1.5,
    apparentTemperatureC: -5,
    precipitationMm: 1.2,
    windSpeedKmh: 15,
    windGustsKmh: 20,
    visibilityMeters: 5000,
    relativeHumidity: 88,
    weatherCode: 71,
    wmoMultiplier: 0.6,
  })

  assert.equal(result.roadHazardLevel, 'SEVERE_DANGER')
  assert.ok(result.roadGripIndex <= 50, 'Black ice should reduce grip below 50%')
  assert.ok(result.safeSpeedCapKmh <= 50, 'Safe speed should cap at 50km/h on ice')
  assert.ok(result.hazards.some((h) => h.type === 'BLACK_ICE'))
})

test('Weather Hazard Evaluation - Gale Force Crosswinds', () => {
  const result = weatherService.evaluateRoadHazards({
    temperatureC: 15,
    apparentTemperatureC: 15,
    precipitationMm: 0,
    windSpeedKmh: 50,
    windGustsKmh: 80,
    visibilityMeters: 10000,
    relativeHumidity: 50,
    weatherCode: 2,
    wmoMultiplier: 0,
  })

  assert.equal(result.roadHazardLevel, 'SEVERE_DANGER')
  assert.ok(result.hazards.some((h) => h.type === 'CROSSWINDS'))
})
