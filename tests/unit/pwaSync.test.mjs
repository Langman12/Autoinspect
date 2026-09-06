import assert from 'node:assert/strict'
import test from 'node:test'
import { pwaSyncService } from '../../src/services/pwaSyncService.ts'
import { hapticsService } from '../../src/services/hapticsService.ts'

test('PWA Sync Service — Queue and Offline Item Processing', async () => {
  const item = pwaSyncService.enqueueItem('INSPECTION_REPORT', { reportId: 'RPT-OFFLINE-01' })

  assert.ok(item.id.startsWith('SYNC-'))
  assert.equal(item.type, 'INSPECTION_REPORT')
  assert.ok(item.status === 'PENDING_UPLOAD' || item.status === 'SYNCED')

  await pwaSyncService.processQueue()
  assert.equal(pwaSyncService.getPendingCount(), 0)
})

test('PWA Sync Service — Queue Retention and Purging', async () => {
  // Enqueue multiple items
  for (let i = 0; i < 60; i++) {
    pwaSyncService.enqueueItem('TELEMETRY_FRAME', { frameId: i })
  }
  await pwaSyncService.processQueue()

  const queue = pwaSyncService.getQueue()
  // Synced queue should be capped at max retention limit (50)
  assert.ok(queue.length <= 50, `Queue length ${queue.length} should not exceed 50`)

  pwaSyncService.clearSynced()
  assert.equal(pwaSyncService.getQueue().length, 0)
})

test('Haptics Service — Vibration Trigger Execution', () => {
  assert.doesNotThrow(() => {
    hapticsService.triggerVinLock()
    hapticsService.triggerDefectAlert()
    hapticsService.triggerImpactWarning()
    hapticsService.triggerOverspeedWarning()
    hapticsService.triggerButtonTap()
  })
})
