import assert from 'node:assert/strict'
import test from 'node:test'
import { evBatteryService } from '../../src/services/evBatteryService.ts'

test('EV Battery Service — 96-Cell Pack Telemetry Generation', () => {
  const telemetry = evBatteryService.generateTelemetry()

  assert.equal(telemetry.modules.length, 16, 'Should contain exactly 16 modules')
  const totalCells = telemetry.modules.reduce((sum, m) => sum + m.cells.length, 0)
  assert.equal(totalCells, 96, 'Should contain exactly 96 individual lithium cells')

  assert.ok(telemetry.packVoltageV > 350, '400V architecture pack voltage should be >350V')
  assert.ok(telemetry.cellVoltageDeltaMv > 0, 'Cell voltage delta must be positive')
  assert.ok(telemetry.stateOfHealthPercent > 80, 'SOH should be above 80%')
  assert.ok(telemetry.isolationResistanceMegaOhm >= 500, 'Isolation resistance should meet high-voltage safety standard')
})

test('EV Battery Service — Cell Anomaly Detection & Degradation Curve', () => {
  const telemetry = evBatteryService.generateTelemetry()

  // Verify that weak cell #21 is flagged with CELL_DELTA_WARN
  const mod4Cell3 = telemetry.modules[3].cells.find((c) => c.cellId === 21)
  assert.ok(mod4Cell3, 'Cell 21 must exist in module 4')
  assert.equal(mod4Cell3?.status, 'CELL_DELTA_WARN')
  assert.ok(mod4Cell3?.internalResistanceMilliOhm > 2.0, 'Degraded cell should have elevated internal resistance')

  assert.ok(telemetry.degradationCurve.length >= 5, 'Should provide at least 5 degradation forecast points')
  const ptLast = telemetry.degradationCurve[telemetry.degradationCurve.length - 1]
  assert.ok(ptLast.mileageKm >= 150000)
  assert.ok(ptLast.projectedSohPercent < 100)
})
