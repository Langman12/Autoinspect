import test from 'node:test'
import assert from 'node:assert/strict'

// Create browser mock environment if needed for Node test runner
if (!globalThis.localStorage) {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

if (!globalThis.window) {
  globalThis.window = {
    devicePixelRatio: 2,
  }
}

import { autoGuardStore } from '../../src/store/useAutoGuardStore.ts'
import { aiService } from '../../src/services/aiService.ts'
import { classifyAcousticFrequency, computeAcousticHealthScore } from '../../src/services/acousticEngine.ts'

test('E2E Smoke - Store Initialization & Default State', () => {
  const state = autoGuardStore.getState()
  assert.ok(state, 'Store must initialize cleanly')
  assert.ok(state.vehicle, 'Default vehicle profile must exist')
  assert.equal(state.vehicle.year, '2023')
  assert.equal(typeof autoGuardStore.setVehicle, 'function')
  assert.equal(typeof autoGuardStore.setAiProvider, 'function')
  assert.equal(typeof autoGuardStore.setCurrentReport, 'function')
  assert.equal(typeof autoGuardStore.saveReport, 'function')
})

test('E2E Smoke - Vehicle Profile Calibration', () => {
  const testVehicle = {
    makeModel: '2023 Porsche 911 GT3 RS',
    year: '2023',
    vin: 'WP0AF2A97PS293812',
    mileage: '4,500 km',
    fuelType: 'Petrol (Gasoline)',
    class: 'LUXURY',
  }

  autoGuardStore.setVehicle(testVehicle)
  const currentVehicle = autoGuardStore.getState().vehicle

  assert.equal(currentVehicle.makeModel, '2023 Porsche 911 GT3 RS')
  assert.equal(currentVehicle.vin, 'WP0AF2A97PS293812')
  assert.equal(currentVehicle.mileage, '4,500 km')
})

test('E2E Smoke - Vehicle Patching & Normalization', () => {
  autoGuardStore.patchVehicle({
    vin: '1hgcr2f83ha123456',
    makeModel: '2017 Honda Accord',
    year: '2017',
  })
  const v = autoGuardStore.getState().vehicle
  assert.equal(v.vin, '1HGCR2F83HA123456')
  assert.equal(v.makeModel, '2017 Honda Accord')
  assert.equal(v.year, '2017')
})

test('E2E Smoke - AI Provider Reactive Switch & State Propagation', () => {
  // Test switching to Gemini
  autoGuardStore.setAiProvider('gemini')
  assert.equal(autoGuardStore.getState().aiProvider, 'gemini')
  assert.equal(aiService.getActiveProvider(), 'gemini')

  // Test switching to Ollama
  autoGuardStore.setAiProvider('ollama')
  assert.equal(autoGuardStore.getState().aiProvider, 'ollama')
  assert.equal(aiService.getActiveProvider(), 'ollama')
})

test('E2E Smoke - Acoustic DSP Diagnostics Ingestion & Health Scoring', () => {
  // Simulate high-frequency turbo whistle at 11,500 Hz
  const turboDiag = classifyAcousticFrequency(11500, 75)
  assert.equal(turboDiag.bandKey, 'high_freq')
  assert.equal(turboDiag.severity, 'HIGH')

  const health = computeAcousticHealthScore(11500, 75)
  assert.equal(health.status, 'MODERATE')
  assert.ok(health.healthScore <= 75)

  // Simulate catastrophic connecting rod knock at 420 Hz
  const knockDiag = classifyAcousticFrequency(420, 85)
  assert.equal(knockDiag.bandKey, 'reciprocating')
  assert.equal(knockDiag.severity, 'CRITICAL')

  const criticalHealth = computeAcousticHealthScore(420, 85)
  assert.equal(criticalHealth.status, 'CRITICAL')
  assert.ok(criticalHealth.healthScore < 40)
})

test('E2E Smoke - Inspection Report Generation & History Storage', async () => {
  const mockReport = {
    id: 'report-e2e-999',
    timestamp: Date.now(),
    vehicle: autoGuardStore.getState().vehicle,
    overallScore: 88,
    summary: 'Vehicle is in exceptional mechanical condition with nominal acoustic tolerances.',
    findings: [
      {
        id: 'f-1',
        title: 'Nominal Engine Timing & Belts',
        severity: 'PASS',
        confidence: 96,
        description: 'Serpentine belt deflection is within manufacturer spec.',
        evidence: 'Visual photo capture 1',
      },
    ],
    acousticAnalysis: {
      dominantFrequency: 650,
      riskLevel: 'LOW',
      findings: ['Normal valvetrain harmonic signature'],
    },
    riskIndex: 12,
  }

  await autoGuardStore.saveReport(mockReport)
  const storedReport = autoGuardStore.getState().currentReport
  const history = autoGuardStore.getState().history

  assert.ok(storedReport)
  assert.equal(storedReport.id, 'report-e2e-999')
  assert.equal(storedReport.overallScore, 88)
  assert.ok(history.some((r) => r.id === 'report-e2e-999'))
})

