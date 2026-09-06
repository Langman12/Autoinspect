import assert from 'node:assert/strict'
import test from 'node:test'
import { acousticWorkerService } from '../../src/services/acousticWorkerService.ts'
import { autoSeedTrainingDataset } from '../../src/services/acousticTrainer.ts'

test('Acoustic Worker Bridge — Asynchronous Feature Extraction Fallback', async () => {
  const dummyFft = new Uint8Array(256).fill(10)
  dummyFft[5] = 200 // Rod knock frequency bin spike
  const features = await acousticWorkerService.extractFeaturesAsync(dummyFft, 44100)

  assert.ok(features)
  assert.ok(features.spectralCentroid > 0)
  assert.ok(features.melEnergies.length === 13)
  assert.ok(features.zeroCrossingRate >= 0)
})

test('Acoustic Worker Bridge — Asynchronous Model Training Fallback', async () => {
  const dataset = autoSeedTrainingDataset(20)
  const evaluation = await acousticWorkerService.trainModelAsync(dataset, 0.2)

  assert.ok(evaluation.overallAccuracyPct >= 70)
  assert.equal(evaluation.confusionMatrix.classes.length, 12)
})

test('Acoustic Worker Bridge — Asynchronous Feature Prediction Fallback', async () => {
  const dummyFft = new Uint8Array(256).fill(5)
  dummyFft[5] = 220
  const features = await acousticWorkerService.extractFeaturesAsync(dummyFft, 44100)
  const prediction = await acousticWorkerService.predictAsync(features)

  assert.ok(prediction.predictedLabel)
  assert.ok(prediction.confidence > 0)
})
