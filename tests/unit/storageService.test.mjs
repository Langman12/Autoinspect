import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Storage Service Unit Tests (Mock & Memory Storage Adapter Logic)
 */
class MemoryStorageEngine {
  constructor() {
    this.store = new Map()
  }

  async saveReport(report) {
    if (!report || !report.id) throw new Error('Report must have an id')
    this.store.set(report.id, { ...report })
    return report.id
  }

  async getReports(limit = 50) {
    const list = Array.from(this.store.values())
    // Sort descending by timestamp
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    return list.slice(0, limit)
  }

  async deleteReport(id) {
    return this.store.delete(id)
  }

  async clearAll() {
    this.store.clear()
  }
}

test('Storage Service — Data Engine & Record Persistence', async (t) => {
  await t.test('Successfully stores and retrieves inspection reports with heavy base64 data', async () => {
    const engine = new MemoryStorageEngine()
    const mockReport = {
      id: 'insp-20260904-001',
      vehicleId: 'veh-audi-rs6',
      inspectorName: 'Andries Liebenberg',
      timestamp: Date.now(),
      overallGrade: 'A',
      overallScore: 94,
      vehicle: {
        vin: 'WAUZZZF27LN123456',
        make: 'Audi',
        model: 'RS6 Avant',
        year: '2024'
      },
      photos: [
        { angle: 'Front 3/4', dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(50000) }
      ],
      findings: [
        { component: 'Front Bumper', status: 'pass', severity: 'low', description: 'Minor stone chips' }
      ]
    }

    const savedId = await engine.saveReport(mockReport)
    assert.strictEqual(savedId, 'insp-20260904-001')

    const reports = await engine.getReports()
    assert.strictEqual(reports.length, 1)
    assert.strictEqual(reports[0].vehicle.make, 'Audi')
    assert.strictEqual(reports[0].photos[0].dataUrl.length, 50023)
  })

  await t.test('Correctly sorts multiple reports in descending chronological order', async () => {
    const engine = new MemoryStorageEngine()
    const t0 = 1725480000000
    await engine.saveReport({ id: 'rep-1', timestamp: t0 + 1000, overallScore: 80 })
    await engine.saveReport({ id: 'rep-2', timestamp: t0 + 5000, overallScore: 95 })
    await engine.saveReport({ id: 'rep-3', timestamp: t0 + 2000, overallScore: 88 })

    const reports = await engine.getReports()
    assert.strictEqual(reports.length, 3)
    assert.strictEqual(reports[0].id, 'rep-2', 'Latest report should be first')
    assert.strictEqual(reports[1].id, 'rep-3')
    assert.strictEqual(reports[2].id, 'rep-1')
  })

  await t.test('Correctly deletes a report by ID', async () => {
    const engine = new MemoryStorageEngine()
    await engine.saveReport({ id: 'rep-1', timestamp: Date.now() })
    const deleted = await engine.deleteReport('rep-1')
    assert.strictEqual(deleted, true)

    const remaining = await engine.getReports()
    assert.strictEqual(remaining.some(r => r.id === 'rep-1'), false)
  })
})
