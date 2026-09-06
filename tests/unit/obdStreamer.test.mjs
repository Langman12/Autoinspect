import assert from 'node:assert/strict'
import test from 'node:test'
import { obdStreamer, KNOWN_DTC_DATABASE } from '../../src/services/obdStreamer.ts'

test('OBD Streamer — Baseline PIDs and Connection State', () => {
  assert.equal(obdStreamer.getStatus(), 'DISCONNECTED')
  const pids = obdStreamer.getPids()
  assert.ok(pids.rpm >= 800, 'Baseline RPM should be at least idle')
  assert.ok(pids.coolantTempC > 0, 'Coolant temp should be positive')
  assert.ok(pids.batteryVoltage > 12.0, 'Battery voltage should indicate 12V+ system')
})

test('OBD Streamer — DTC Database and Fault Codes', () => {
  const dtcs = KNOWN_DTC_DATABASE
  assert.ok(dtcs.length >= 4, 'Should contain at least 4 known DTC definitions')

  const p0300 = dtcs.find((d) => d.code === 'P0300')
  assert.ok(p0300, 'P0300 misfire code must exist')
  assert.equal(p0300?.severity, 'CRITICAL')
  assert.ok(p0300?.possibleCauses.length > 0, 'Should list possible causes')
  assert.ok(p0300?.freezeFrame, 'P0300 should contain freeze frame data')

  const p0171 = dtcs.find((d) => d.code === 'P0171')
  assert.ok(p0171, 'P0171 lean code must exist')
  assert.equal(p0171?.system, 'POWERTRAIN')
})

test('OBD Streamer — Inject and Clear DTCs', () => {
  obdStreamer.injectDtc('P0420')
  const activeAfterInject = obdStreamer.getActiveDtcs()
  assert.ok(activeAfterInject.some((d) => d.code === 'P0420'), 'P0420 should be active after injection')

  const cleared = obdStreamer.clearCodes()
  assert.equal(cleared, true)
  assert.equal(obdStreamer.getActiveDtcs().length, 0, 'All active DTCs should be cleared')
})
