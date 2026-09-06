import assert from 'node:assert/strict'
import test from 'node:test'
import { autoSeedTrainingDataset, trainAcousticClassifier } from '../../src/services/acousticTrainer.ts'

test('Acoustic Trainer — Dataset Auto-Seeding & Balance', () => {
  const samplesPerClass = 20
  const dataset = autoSeedTrainingDataset(samplesPerClass)
  assert.equal(dataset.length, 12 * samplesPerClass)

  const idleSamples = dataset.filter((s) => s.label === 'NORMAL_NOMINAL_IDLE')
  const cruiseSamples = dataset.filter((s) => s.label === 'NORMAL_NOMINAL_CRUISE')
  const knockSamples = dataset.filter((s) => s.label === 'CONNECTING_ROD_KNOCK')

  assert.equal(idleSamples.length, samplesPerClass)
  assert.equal(cruiseSamples.length, samplesPerClass)
  assert.equal(knockSamples.length, samplesPerClass)
  assert.ok(dataset.every((s) => s.features.melEnergies.length === 13))
})

test('Acoustic Trainer — Model Training and Confusion Matrix Evaluation', () => {
  const dataset = autoSeedTrainingDataset(25)
  const evaluation = trainAcousticClassifier(dataset, 0.2)

  assert.ok(evaluation.totalSamples === 12 * 25)
  assert.ok(evaluation.overallAccuracyPct >= 75)
  assert.ok(evaluation.macroF1Score >= 0.70)
  assert.equal(evaluation.confusionMatrix.classes.length, 12)
  assert.equal(evaluation.confusionMatrix.matrix.length, 12)
  assert.ok(evaluation.rocAucEstimate >= 0.75)
})
