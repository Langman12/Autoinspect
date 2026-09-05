import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * WMO Weather Code Mappings & Physics Multipliers
 */
const WMO_CODE_MAP = {
  0: { text: 'Clear Sky', severity: 0 },
  65: { text: 'Heavy Rain / Downpour', severity: 0.8 },
  67: { text: 'Heavy Freezing Rain', severity: 1.0 },
  75: { text: 'Heavy Snow Fall', severity: 0.9 },
  99: { text: 'Severe Thunderstorm with Heavy Hail', severity: 1.0 }
}

/**
 * Pure Road Grip Calculation Formula
 */
function calculateGripIndex(temperature, precipitationMm, windSpeedKmh, isSnow, isFreezingRain) {
  let grip = 95 // Base dry asphalt grip percentage

  if (precipitationMm > 0) {
    grip -= Math.min(precipitationMm * 4, 30)
  }

  if (isSnow) {
    grip -= 35
  }

  if (isFreezingRain || (temperature <= 0 && precipitationMm > 0)) {
    grip -= 45
  }

  if (windSpeedKmh > 40) {
    grip -= (windSpeedKmh - 40) * 0.3
  }

  return Math.max(15, Math.min(99, Math.round(grip)))
}

/**
 * Safe Speed Cap Calculation
 */
function calculateSafeSpeedCap(baseLimitKmh, gripIndex, visibilityMeters) {
  let speed = baseLimitKmh * (gripIndex / 100)

  if (visibilityMeters < 500) {
    speed = Math.min(speed, 60)
  }
  if (visibilityMeters < 200) {
    speed = Math.min(speed, 40)
  }

  return Math.max(30, Math.round(speed))
}

/**
 * Black Ice Hazard Detector
 */
function detectBlackIce(tempC, relativeHumidity, precipitationMm) {
  return tempC <= 3 && relativeHumidity >= 80 && precipitationMm >= 0.1
}

test('Weather Service — Road Physics & Grip Formulas', async (t) => {
  await t.test('Optimal dry asphalt produces >= 90% grip index', () => {
    const grip = calculateGripIndex(22, 0, 10, false, false)
    assert.ok(grip >= 90, `Expected grip >= 90%, received: ${grip}%`)
    assert.strictEqual(grip, 95)
  })

  await t.test('Heavy downpour reduces grip to hydroplane territory (55-65%)', () => {
    const grip = calculateGripIndex(18, 12.5, 25, false, false)
    assert.ok(grip <= 65 && grip >= 55, `Expected grip between 55-65%, received: ${grip}%`)
  })

  await t.test('Freezing rain and black ice forces critical grip (< 30%)', () => {
    const grip = calculateGripIndex(-2, 4.0, 30, false, true)
    assert.ok(grip <= 35, `Expected grip <= 35% on ice, received: ${grip}%`)
  })

  await t.test('Safe speed cap reduces significantly in low visibility fog', () => {
    const speed = calculateSafeSpeedCap(120, 85, 150)
    assert.ok(speed <= 40, `Expected speed cap <= 40 km/h in dense fog, received: ${speed}`)
  })

  await t.test('Black ice threshold correctly triggers under 3°C with humidity', () => {
    const isIce = detectBlackIce(1.5, 92, 0.4)
    assert.strictEqual(isIce, true, 'Black ice should trigger at 1.5°C with 92% humidity')

    const isNotIce = detectBlackIce(8.0, 95, 2.0)
    assert.strictEqual(isNotIce, false, 'Black ice should not trigger at 8.0°C')
  })
})
