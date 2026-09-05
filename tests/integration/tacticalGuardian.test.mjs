import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Tactical Guardian State Machine Simulation
 */
class TacticalGuardianSimulator {
  constructor() {
    this.history = []
  }

  processTelemetry(weatherEvent) {
    const { temperatureC, precipitationMm, windKmh, visibilityM, isFreezingRain } = weatherEvent
    
    // Calculate grip
    let grip = 95
    if (precipitationMm > 0) grip -= Math.min(precipitationMm * 4, 30)
    if (isFreezingRain || (temperatureC <= 0 && precipitationMm > 0)) grip -= 45
    if (windKmh > 40) grip -= (windKmh - 40) * 0.3
    grip = Math.max(15, Math.min(99, Math.round(grip)))

    // Calculate hazard severity
    let alertLevel = 'LOW'
    const warnings = []

    if (precipitationMm >= 10) {
      warnings.push('AQUAPLANING_RISK')
      alertLevel = 'MODERATE'
    }
    if (temperatureC <= 3 && precipitationMm > 0) {
      warnings.push('BLACK_ICE_HAZARD')
      alertLevel = 'CRITICAL'
    }
    if (windKmh >= 60) {
      warnings.push('HIGH_CROSSWIND_GALE')
      if (alertLevel !== 'CRITICAL') alertLevel = 'MODERATE'
    }
    if (visibilityM <= 300) {
      warnings.push('DENSE_FOG_REDUCED_VISIBILITY')
      if (alertLevel !== 'CRITICAL') alertLevel = 'MODERATE'
    }

    // Speed recommendation (base 120 km/h)
    let safeSpeed = 120 * (grip / 100)
    if (visibilityM < 300) safeSpeed = Math.min(safeSpeed, 50)
    safeSpeed = Math.max(30, Math.round(safeSpeed))

    const snapshot = {
      gripIndex: grip,
      alertLevel,
      warnings,
      safeSpeedKmh: safeSpeed
    }

    this.history.push(snapshot)
    return snapshot
  }
}

test('Tactical Guardian Integration — Dynamic Road Hazard Escalation', async (t) => {
  const guardian = new TacticalGuardianSimulator()

  await t.test('Scenario: Vehicle starts in sunny clear conditions', () => {
    const s1 = guardian.processTelemetry({
      temperatureC: 24,
      precipitationMm: 0,
      windKmh: 12,
      visibilityM: 10000,
      isFreezingRain: false
    })

    assert.strictEqual(s1.gripIndex, 95)
    assert.strictEqual(s1.alertLevel, 'LOW')
    assert.strictEqual(s1.safeSpeedKmh, 114)
    assert.strictEqual(s1.warnings.length, 0)
  })

  await t.test('Scenario: Vehicle enters sudden tropical squall (heavy precipitation)', () => {
    const s2 = guardian.processTelemetry({
      temperatureC: 21,
      precipitationMm: 15,
      windKmh: 35,
      visibilityM: 1200,
      isFreezingRain: false
    })

    assert.ok(s2.gripIndex <= 65, `Grip expected <= 65%, got ${s2.gripIndex}%`)
    assert.strictEqual(s2.alertLevel, 'MODERATE')
    assert.ok(s2.warnings.includes('AQUAPLANING_RISK'))
  })

  await t.test('Scenario: Vehicle climbs alpine pass into sub-zero freezing drizzle (Black Ice)', () => {
    const s3 = guardian.processTelemetry({
      temperatureC: -1,
      precipitationMm: 2.5,
      windKmh: 45,
      visibilityM: 250,
      isFreezingRain: true
    })

    assert.ok(s3.gripIndex <= 40, `Grip expected <= 40% on ice, got ${s3.gripIndex}%`)
    assert.strictEqual(s3.alertLevel, 'CRITICAL')
    assert.ok(s3.warnings.includes('BLACK_ICE_HAZARD'))
    assert.ok(s3.warnings.includes('DENSE_FOG_REDUCED_VISIBILITY'))
    assert.ok(s3.safeSpeedKmh <= 50, `Safe speed must be capped <= 50 km/h, got ${s3.safeSpeedKmh}`)
  })
})
