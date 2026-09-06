import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateObdDerivedMetrics } from '../../src/hooks/useObdGaugeStream.ts'

const baselinePid = {
  timestamp: Date.now(),
  rpm: 2500,
  speedKmh: 75,
  coolantTempC: 90,
  intakeTempC: 28,
  stftPercent: 0,
  ltftPercent: 0,
  mafGramsPerSec: 35.0,
  mapKpa: 98,
  throttlePercent: 40,
  timingAdvanceDeg: 18,
  o2Voltage1: 0.5,
  o2Voltage2: 0.5,
  oilPressureKpa: 340,
  batteryVoltage: 14.1,
  engineLoadPercent: 45,
  boostPsi: 0.2,
}

test('calculateObdDerivedMetrics computes BHP and Torque within expected automotive physics range', () => {
  const metrics = calculateObdDerivedMetrics(baselinePid)
  assert.ok(metrics.estimatedBhp > 20 && metrics.estimatedBhp < 200, `BHP ${metrics.estimatedBhp} should be reasonable`)
  assert.ok(metrics.estimatedTorqueNm > 50 && metrics.estimatedTorqueNm < 500, `Torque ${metrics.estimatedTorqueNm} Nm should be reasonable`)
})

test('calculateObdDerivedMetrics returns stoichiometric AFR (14.7) for zero fuel trim', () => {
  const metrics = calculateObdDerivedMetrics(baselinePid)
  assert.equal(metrics.airFuelRatio, 14.7)
  assert.equal(metrics.lambda, 1.0)
})

test('calculateObdDerivedMetrics tracks shift light stages accurately across RPM band', () => {
  const idle = calculateObdDerivedMetrics({ ...baselinePid, rpm: 850 })
  assert.equal(idle.shiftLightStage, 'OFF')

  const stage1 = calculateObdDerivedMetrics({ ...baselinePid, rpm: 5600 })
  assert.equal(stage1.shiftLightStage, 'STAGE_1')

  const stage2 = calculateObdDerivedMetrics({ ...baselinePid, rpm: 6350 })
  assert.equal(stage2.shiftLightStage, 'STAGE_2')

  const redline = calculateObdDerivedMetrics({ ...baselinePid, rpm: 7100 })
  assert.equal(redline.shiftLightStage, 'REDLINE')
})

test('calculateObdDerivedMetrics maintains peak hold values', () => {
  const first = calculateObdDerivedMetrics({ ...baselinePid, rpm: 4500, boostPsi: 8.5 }, 3000, 5.0)
  assert.equal(first.peakRpm, 4500)
  assert.equal(first.peakBoostPsi, 8.5)

  // When current RPM drops, peak should be preserved
  const second = calculateObdDerivedMetrics({ ...baselinePid, rpm: 2000, boostPsi: 2.0 }, first.peakRpm, first.peakBoostPsi)
  assert.equal(second.peakRpm, 4500)
  assert.equal(second.peakBoostPsi, 8.5)
})

test('calculateObdDerivedMetrics calculates volumetric efficiency', () => {
  const metrics = calculateObdDerivedMetrics(baselinePid)
  assert.ok(metrics.volumetricEfficiency >= 40 && metrics.volumetricEfficiency <= 115)
})
