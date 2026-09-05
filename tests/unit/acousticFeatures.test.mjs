import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSpectralCentroid,
  computeSpectralFlatness,
  computeSpectralBandwidth,
  computeZeroCrossingRate,
  computeSpectralEntropy,
  computeHarmonicToNoiseRatio,
  computeMelFilterbankEnergy,
  extractAcousticFeatureVector,
} from '../../src/services/acousticEngine.ts'

test('Acoustic Features - Spectral Centroid Calculation', () => {
  const sampleRate = 44100
  const fftData = new Uint8Array(256)
  // Inject peak at bin 10 (~861 Hz)
  fftData[10] = 200

  const centroid = computeSpectralCentroid(fftData, sampleRate)
  assert.ok(centroid >= 800 && centroid <= 920, `Centroid ${centroid} should be near 861 Hz`)
})

test('Acoustic Features - Spectral Flatness (Wiener Entropy)', () => {
  // Pure tone (sharp peak at one bin) -> Low Flatness (~0.0 - 0.2)
  const toneFft = new Uint8Array(256).fill(5)
  toneFft[20] = 250
  const toneFlatness = computeSpectralFlatness(toneFft)
  assert.ok(toneFlatness < 0.25, `Tonal signal flatness (${toneFlatness}) should be low`)

  // White noise (equal energy across all bins) -> High Flatness (~0.8 - 1.0)
  const noiseFft = new Uint8Array(256).fill(180)
  const noiseFlatness = computeSpectralFlatness(noiseFft)
  assert.ok(noiseFlatness > 0.85, `White noise flatness (${noiseFlatness}) should be high`)
})

test('Acoustic Features - Spectral Bandwidth & Spread', () => {
  const fftData = new Uint8Array(256)
  fftData[15] = 200
  fftData[16] = 180
  fftData[14] = 180

  const centroid = computeSpectralCentroid(fftData, 44100)
  const bandwidth = computeSpectralBandwidth(fftData, centroid, 44100)
  assert.ok(bandwidth > 0 && bandwidth < 1000, `Bandwidth ${bandwidth} should be tight for focused peak`)
})

test('Acoustic Features - Zero Crossing Rate (ZCR)', () => {
  // Alternating signal with high zero crossings
  const highZcrSignal = new Uint8Array([0, 255, 0, 255, 0, 255, 0, 255])
  const zcrHigh = computeZeroCrossingRate(highZcrSignal)
  assert.ok(zcrHigh > 0.8, `ZCR ${zcrHigh} should be high for alternating signal`)

  // Constant DC signal with 0 zero crossings
  const lowZcrSignal = new Uint8Array([150, 155, 160, 165, 170])
  const zcrLow = computeZeroCrossingRate(lowZcrSignal)
  assert.equal(zcrLow, 0, 'Constant signal should have 0 ZCR')
})

test('Acoustic Features - Spectral Entropy', () => {
  // Concentrated energy -> Low entropy
  const concentratedFft = new Uint8Array(256).fill(0)
  concentratedFft[10] = 250
  const lowEntropy = computeSpectralEntropy(concentratedFft)
  assert.ok(lowEntropy >= 0 && lowEntropy < 0.1, `Concentrated spectrum entropy (${lowEntropy}) should be low`)

  // Dispersed energy -> High entropy
  const dispersedFft = new Uint8Array(256).fill(120)
  const highEntropy = computeSpectralEntropy(dispersedFft)
  assert.ok(highEntropy > 0.9, `Dispersed spectrum entropy (${highEntropy}) should be high`)
})

test('Acoustic Features - Harmonic-to-Noise Ratio (HNR)', () => {
  const cleanHarmonicFft = new Uint8Array(256).fill(5)
  cleanHarmonicFft[10] = 250 // 1x
  cleanHarmonicFft[20] = 180 // 2x
  cleanHarmonicFft[30] = 120 // 3x

  const hnr = computeHarmonicToNoiseRatio(cleanHarmonicFft, 10)
  assert.ok(hnr > 10, `Clean harmonic signal should have high HNR (got ${hnr} dB)`)
})


test('Acoustic Features - 13-Band Mel Filterbank Energies', () => {
  const fftData = new Uint8Array(256)
  fftData[5] = 220
  fftData[50] = 150

  const melEnergies = computeMelFilterbankEnergy(fftData, 44100, 13)
  assert.equal(melEnergies.length, 13)
  assert.ok(melEnergies.some((e) => e > 0), 'At least one mel filter should register energy')
})

test('Acoustic Features - Full Feature Vector Extraction', () => {
  const fftData = new Uint8Array(256)
  fftData[12] = 240
  const timeData = new Uint8Array(512).fill(128)
  timeData[10] = 200
  timeData[11] = 50

  const vector = extractAcousticFeatureVector(fftData, 44100, timeData)
  assert.ok(vector.dominantHz > 0)
  assert.ok(vector.peakLevel > 0)
  assert.ok(vector.spectralCentroid > 0)
  assert.equal(vector.melEnergies.length, 13)
  assert.ok(vector.bandEnergy.sub_bass !== undefined)
})
