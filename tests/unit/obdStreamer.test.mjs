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
  assert.ok(dtcs.length >= 10, 'Should contain expanded DTC definitions including EV codes')

  const p0300 = dtcs.find((d) => d.code === 'P0300')
  assert.ok(p0300, 'P0300 misfire code must exist')
  assert.equal(p0300?.severity, 'CRITICAL')
  assert.ok(p0300?.possibleCauses.length > 0, 'Should list possible causes')
  assert.ok(p0300?.freezeFrame, 'P0300 should contain freeze frame data')

  const p0171 = dtcs.find((d) => d.code === 'P0171')
  assert.ok(p0171, 'P0171 lean code must exist')
  assert.equal(p0171?.system, 'POWERTRAIN')

  // High Voltage EV & Isolation DTCs
  const p0a7f = dtcs.find((d) => d.code === 'P0A7F')
  assert.ok(p0a7f, 'P0A7F EV battery deterioration DTC must exist')
  assert.equal(p0a7f?.system, 'HIGH_VOLTAGE_EV')
  assert.equal(p0a7f?.severity, 'CRITICAL')

  const p0aa6 = dtcs.find((d) => d.code === 'P0AA6')
  assert.ok(p0aa6, 'P0AA6 isolation fault DTC must exist')
  assert.equal(p0aa6?.system, 'HIGH_VOLTAGE_EV')

  const u0110 = dtcs.find((d) => d.code === 'U0110')
  assert.ok(u0110, 'U0110 inverter CAN offline DTC must exist')
  assert.equal(u0110?.system, 'NETWORK_CAN')
})

test('OBD Streamer — Inject and Clear DTCs', () => {
  obdStreamer.clearCodes()
  obdStreamer.injectDtc('P0A7F')
  const activeAfterInject = obdStreamer.getActiveDtcs()
  assert.ok(activeAfterInject.some((d) => d.code === 'P0A7F'), 'P0A7F EV code should be active after injection')

  const cleared = obdStreamer.clearCodes()
  assert.equal(cleared, true)
  assert.equal(obdStreamer.getActiveDtcs().length, 0, 'All active DTCs should be cleared')
})
