import assert from 'node:assert/strict'
import test from 'node:test'
import { autoGuardStore } from '../../src/store/useAutoGuardStore.ts'

test('AutoGuard Store — Dispatch and Dismiss Tactical HUD Alerts', () => {
  const alertId = autoGuardStore.dispatchAlert({
    title: 'CAN-Bus Telemetry Alert',
    message: 'High frame jitter detected on PID 010C',
    severity: 'WARNING',
    durationMs: 50,
  })

  const state = autoGuardStore.getState()
  assert.ok(state.alerts.some((a) => a.id === alertId))

  const activeAlert = state.alerts.find((a) => a.id === alertId)
  assert.equal(activeAlert?.title, 'CAN-Bus Telemetry Alert')
  assert.equal(activeAlert?.severity, 'WARNING')

  // Dismiss alert
  autoGuardStore.dismissAlert(alertId)
  const afterDismiss = autoGuardStore.getState()
  assert.ok(!afterDismiss.alerts.some((a) => a.id === alertId))
})
