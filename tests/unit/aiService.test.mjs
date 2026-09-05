import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * AI Dual-Engine Hybrid Routing Logic
 */
class MockAiRouter {
  constructor(options = {}) {
    this.localOllamaActive = options.localOllamaActive ?? true
    this.geminiConfigured = options.geminiConfigured ?? true
    this.userPreferredEngine = options.userPreferredEngine ?? 'hybrid'
  }

  resolveTargetEngine(taskType) {
    if (this.userPreferredEngine === 'ollama') {
      if (this.localOllamaActive) return 'ollama'
      if (this.geminiConfigured) return 'gemini'
      throw new Error('No AI provider available')
    }

    if (this.userPreferredEngine === 'gemini') {
      if (this.geminiConfigured) return 'gemini'
      if (this.localOllamaActive) return 'ollama'
      throw new Error('No AI provider available')
    }

    // Hybrid Mode:
    // Vision & Heavy Multi-Modal can default to Gemini if cloud active, or Ollama moondream if offline
    if (taskType === 'vision') {
      return this.localOllamaActive ? 'ollama-vision' : 'gemini-vision'
    }

    // Acoustic audio & text diagnostics:
    return this.localOllamaActive ? 'ollama' : 'gemini'
  }
}

test('AI Dual-Engine — Hybrid Routing & Failover', async (t) => {
  await t.test('Routes to local Ollama when local daemon is online in offline-first mode', () => {
    const router = new MockAiRouter({ localOllamaActive: true, geminiConfigured: false, userPreferredEngine: 'ollama' })
    assert.strictEqual(router.resolveTargetEngine('diagnostics'), 'ollama')
  })

  await t.test('Fails over to Gemini Cloud when Ollama is offline', () => {
    const router = new MockAiRouter({ localOllamaActive: false, geminiConfigured: true, userPreferredEngine: 'ollama' })
    assert.strictEqual(router.resolveTargetEngine('diagnostics'), 'gemini')
  })

  await t.test('Hybrid mode selects local vision when local Ollama moondream is active', () => {
    const router = new MockAiRouter({ localOllamaActive: true, geminiConfigured: true, userPreferredEngine: 'hybrid' })
    assert.strictEqual(router.resolveTargetEngine('vision'), 'ollama-vision')
  })

  await t.test('Throws descriptive error when all AI engines are disconnected', () => {
    const router = new MockAiRouter({ localOllamaActive: false, geminiConfigured: false, userPreferredEngine: 'ollama' })
    assert.throws(() => {
      router.resolveTargetEngine('diagnostics')
    }, /No AI provider available/)
  })
})
