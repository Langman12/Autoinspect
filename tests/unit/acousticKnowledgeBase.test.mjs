import test from 'node:test'
import assert from 'node:assert/strict'
import {
  acousticKnowledgeBase,
  ACOUSTIC_FAULT_REGISTRY,
  RESEARCH_BIBLIOGRAPHY,
} from '../../src/services/acousticKnowledgeBase.ts'

test('Acoustic Knowledge Base - Registry Integrity', () => {
  assert.ok(ACOUSTIC_FAULT_REGISTRY.length >= 10, 'Should have at least 10 registered fault profiles')
  assert.ok(RESEARCH_BIBLIOGRAPHY.length >= 4, 'Should include peer-reviewed research citations')

  const karartiPaper = RESEARCH_BIBLIOGRAPHY.find((c) => c.author.includes('Kararti'))
  assert.ok(karartiPaper, 'Beyza Kararti 2024 paper must be cited')

  const randallPaper = RESEARCH_BIBLIOGRAPHY.find((c) => c.author.includes('Randall'))
  assert.ok(randallPaper, 'Randall & Antoni bearing diagnostics paper must be cited')
})

test('Acoustic Knowledge Base - Query by Frequency', () => {
  // 420 Hz -> Rod Knock
  const rodKnock = acousticKnowledgeBase.findFaultByFrequency(420)
  assert.ok(rodKnock)
  assert.equal(rodKnock.id, 'FAULT-ENG-001')
  assert.equal(rodKnock.severity, 'CRITICAL')

  // 1450 Hz -> Hydraulic Lifter Tick
  const lifterTick = acousticKnowledgeBase.findFaultByFrequency(1450)
  assert.ok(lifterTick)
  assert.equal(lifterTick.id, 'FAULT-VALVE-001')

  // 12400 Hz -> Turbo Impeller Surge
  const turbo = acousticKnowledgeBase.findFaultByFrequency(12400)
  assert.ok(turbo)
  assert.equal(turbo.id, 'FAULT-TURBO-001')
})

test('Acoustic Knowledge Base - Keyword Search Query', () => {
  const bearingResults = acousticKnowledgeBase.queryKnowledgeBase('bearing')
  assert.ok(bearingResults.length >= 2, 'Should match rod bearings and wheel hub bearings')

  const turboResults = acousticKnowledgeBase.queryKnowledgeBase('turbocharger')
  assert.ok(turboResults.length >= 1)
  assert.equal(turboResults[0].subsystem, 'INDUCTION_FORCED')

  const nonExistent = acousticKnowledgeBase.queryKnowledgeBase('warp drive anomaly')
  assert.equal(nonExistent.length, 0)
})

test('Acoustic Knowledge Base - Auto-Seeder Persistence', async () => {
  const result = await acousticKnowledgeBase.seedKnowledgeBase()
  assert.ok(result.count >= 10)
  assert.ok(['SUCCESS', 'MEMORY_ONLY'].includes(result.status))
})
