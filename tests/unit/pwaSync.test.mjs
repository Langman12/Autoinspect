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

test('Haptics Service — Vibration Trigger Execution', () => {
  assert.doesNotThrow(() => {
    hapticsService.triggerVinLock()
    hapticsService.triggerDefectAlert()
    hapticsService.triggerImpactWarning()
    hapticsService.triggerOverspeedWarning()
    hapticsService.triggerButtonTap()
  })
})
