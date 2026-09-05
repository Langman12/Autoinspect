import test from 'node:test'
import assert from 'node:assert/strict'
import { weatherService } from '../src/services/weatherService.ts'
import { recallService } from '../src/services/recallService.ts'

test('Suite: Weather Safety Formulas', async (t) => {
  await t.test('Optimal Weather Baseline', () => {
    const res = weatherService.evaluateRoadHazards({
      temperatureC: 20,
      apparentTemperatureC: 20,
      precipitationMm: 0,
      windSpeedKmh: 10,
      windGustsKmh: 12,
      visibilityMeters: 10000,
      relativeHumidity: 50,
      weatherCode: 0,
      wmoMultiplier: 0,
    })
    assert.equal(res.roadHazardLevel, 'OPTIMAL')
    assert.equal(res.roadGripIndex, 95)
    assert.equal(res.safeSpeedCapKmh, 120)
  })

  await t.test('Severe Downpour Hydroplane Defense', () => {
    const res = weatherService.evaluateRoadHazards({
      temperatureC: 18,
      apparentTemperatureC: 18,
      precipitationMm: 6.0,
      windSpeedKmh: 20,
      windGustsKmh: 30,
      visibilityMeters: 2000,
      relativeHumidity: 95,
      weatherCode: 65,
      wmoMultiplier: 0.8,
    })
    assert.equal(res.roadHazardLevel, 'SEVERE_DANGER')
    assert.ok(res.roadGripIndex <= 60)
    assert.ok(res.safeSpeedCapKmh <= 70)
  })

  await t.test('Sub-Zero Black Ice Hazard Alert', () => {
    const res = weatherService.evaluateRoadHazards({
      temperatureC: -2.0,
      apparentTemperatureC: -6.0,
      precipitationMm: 0.5,
      windSpeedKmh: 10,
      windGustsKmh: 15,
      visibilityMeters: 4000,
      relativeHumidity: 90,
      weatherCode: 66,
      wmoMultiplier: 0.85,
    })
    assert.equal(res.roadHazardLevel, 'SEVERE_DANGER')
    assert.ok(res.roadGripIndex <= 50)
    assert.ok(res.safeSpeedCapKmh <= 50)
  })
})

test('Suite: Safety & Recall Validation', async (t) => {
  await t.test('Invalid VIN Protection', async () => {
    const invalidRes = await recallService.getRecallsByVin('SHORT')
    assert.deepEqual(invalidRes, [])
  })
})
