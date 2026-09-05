import test from 'node:test'
import assert from 'node:assert/strict'
import {
  autoSeedTrainingDataset,
  trainAcousticClassifier,
  predictAcousticFeatures,
} from '../../src/services/acousticTrainer.ts'
import { extractAcousticFeatureVector } from '../../src/services/acousticEngine.ts'

test('Acoustic Trainer - Auto-Seed Dataset Generation', () => {
  const dataset = autoSeedTrainingDataset(15)
  assert.equal(dataset.length, 12 * 15, 'Dataset must have 15 samples for each of the 12 classes')

  const sample = dataset[0]
  assert.ok(sample.id)
  assert.ok(sample.label)
  assert.ok(sample.features)
  assert.equal(sample.features.melEnergies.length, 13)
})

test('Acoustic Trainer - In-Browser Model Training & Evaluation Metrics', () => {
  const dataset = autoSeedTrainingDataset(25)
  const evaluation = trainAcousticClassifier(dataset, 0.2)

  assert.ok(evaluation.totalSamples > 0)
  assert.ok(evaluation.overallAccuracyPct >= 80, `Model accuracy should be >= 80% (got ${evaluation.overallAccuracyPct}%)`)
  assert.ok(evaluation.macroF1Score >= 0.75, `Macro F1 score should be >= 0.75 (got ${evaluation.macroF1Score})`)
  assert.equal(evaluation.confusionMatrix.classes.length, 12)
  assert.equal(evaluation.confusionMatrix.matrix.length, 12)
  assert.ok(evaluation.rocAucEstimate >= 0.8)
})

test('Acoustic Trainer - Model Prediction on Synthesized Fault Signal', () => {
  // Train model first
  const dataset = autoSeedTrainingDataset(30)
  trainAcousticClassifier(dataset, 0.2)

  // Construct a test FFT spectrum with rod knock frequency profile (~420Hz)
  const fftData = new Uint8Array(256).fill(5)
  // 420 Hz -> Bin ~5 in 256-bin spectrum (44.1kHz Nyquist 22.05kHz / 256 = 86.13 Hz/bin)
  fftData[5] = 230
  fftData[10] = 140 // 2x harmonic

  const features = extractAcousticFeatureVector(fftData, 44100)
  const prediction = predictAcousticFeatures(features)

  assert.ok(prediction.predictedLabel)
  assert.ok(prediction.confidence > 0)
  assert.ok(prediction.rankedProbabilities.length > 0)
})
