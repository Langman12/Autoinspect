import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACOUSTIC_BANDS,
  classifyAcousticFrequency,
  analyzeSpectrumDistribution,
  computeAcousticHealthScore,
} from '../../src/services/acousticEngine.ts'

test('acousticEngine - ACOUSTIC_BANDS registry integrity', () => {
  assert.ok(ACOUSTIC_BANDS.sub_bass, 'Sub bass band must exist')
  assert.ok(ACOUSTIC_BANDS.reciprocating, 'Reciprocating band must exist')
  assert.ok(ACOUSTIC_BANDS.valvetrain, 'Valvetrain band must exist')
  assert.ok(ACOUSTIC_BANDS.bearing, 'Bearing band must exist')
  assert.ok(ACOUSTIC_BANDS.high_freq, 'High freq band must exist')

  assert.equal(ACOUSTIC_BANDS.sub_bass.minHz, 20)
  assert.equal(ACOUSTIC_BANDS.sub_bass.maxHz, 200)
  assert.equal(ACOUSTIC_BANDS.reciprocating.minHz, 200)
  assert.equal(ACOUSTIC_BANDS.reciprocating.maxHz, 800)
  assert.equal(ACOUSTIC_BANDS.high_freq.maxHz, 20000)
})

test('acousticEngine - classify low signal / ambient noise', () => {
  const result = classifyAcousticFrequency(450, 10)
  assert.equal(result.severity, 'LOW')
  assert.ok(result.bandName.includes('Ambient'))
  assert.ok(result.confidenceScore >= 90)
})

test('acousticEngine - classify 20-200Hz structural resonance band', () => {
  const result = classifyAcousticFrequency(120, 75)
  assert.equal(result.bandKey, 'sub_bass')
  assert.equal(result.dominantHz, 120)
  assert.equal(result.peakLevel, 75)
  assert.equal(result.severity, 'HIGH')
  assert.ok(result.detectedFault.includes('Resonance'))
  assert.ok(result.probableCauses.length > 0)
  assert.ok(result.confidenceScore > 70)
})

test('acousticEngine - classify 200-800Hz rod knock & piston slap band', () => {
  const result = classifyAcousticFrequency(450, 60)
  assert.equal(result.bandKey, 'reciprocating')
  assert.equal(result.dominantHz, 450)
  assert.equal(result.severity, 'CRITICAL')
  assert.ok(result.detectedFault.includes('Knock'))
  assert.ok(result.recommendedAction.includes('CRITICAL'))
})

test('acousticEngine - classify 800Hz-2kHz valvetrain tick & belt slip band', () => {
  const result = classifyAcousticFrequency(1400, 50)
  assert.equal(result.bandKey, 'valvetrain')
  assert.equal(result.dominantHz, 1400)
  assert.equal(result.severity, 'MEDIUM')
  assert.ok(result.detectedFault.includes('Valvetrain'))
})

test('acousticEngine - classify 2k-8kHz rotational bearing fatigue band', () => {
  const result = classifyAcousticFrequency(3200, 70)
  assert.equal(result.bandKey, 'bearing')
  assert.equal(result.dominantHz, 3200)
  assert.equal(result.severity, 'HIGH')
  assert.ok(result.detectedFault.includes('Bearing'))
})

test('acousticEngine - classify 8k-20kHz turbo whistle & vacuum leak band', () => {
  const result = classifyAcousticFrequency(12500, 80)
  assert.equal(result.bandKey, 'high_freq')
  assert.equal(result.dominantHz, 12500)
  assert.equal(result.severity, 'HIGH')
  assert.ok(result.detectedFault.includes('Turbo'))
})

test('acousticEngine - analyzeSpectrumDistribution across buffer bins', () => {
  const mockFft = new Uint8Array(256)
  // Inject dominant peak at bin 10 (~861 Hz at 44.1kHz sample rate)
  mockFft[10] = 220
  // Inject 2nd harmonic at bin 20 (~1722 Hz)
  mockFft[20] = 120

  const analysis = analyzeSpectrumDistribution(mockFft, 44100)
  assert.ok(analysis.dominantHz > 800 && analysis.dominantHz < 1000)
  assert.ok(analysis.peakLevel > 80)
  assert.ok(analysis.bandEnergy.valvetrain > 0)
  assert.ok(analysis.thdEstimate > 0)
  assert.ok(analysis.riskScore > 0)
})

test('acousticEngine - computeAcousticHealthScore for various conditions', () => {
  const ambient = computeAcousticHealthScore(100, 10)
  assert.equal(ambient.status, 'OPTIMAL')
  assert.ok(ambient.healthScore >= 90)

  const knock = computeAcousticHealthScore(450, 80)
  assert.equal(knock.status, 'CRITICAL')
  assert.ok(knock.healthScore < 40)
  assert.ok(knock.summary.includes('ALERT'))

  const bearing = computeAcousticHealthScore(3500, 60, 20)
  assert.equal(bearing.status, 'MODERATE')
  assert.ok(bearing.healthScore >= 40 && bearing.healthScore <= 75)
})
