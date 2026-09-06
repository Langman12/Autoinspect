import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CircuitBreaker,
  RateLimiter,
  ResilientCache,
  resilientFetch,
} from '../../src/services/networkResilience.ts'

test('Network Resilience — CircuitBreaker State Machine', async (t) => {
  await t.test('Starts in CLOSED state and executes successful calls', async () => {
    const cb = new CircuitBreaker({
      name: 'TestService',
      failureThreshold: 3,
      cooldownMs: 100,
    })

    assert.strictEqual(cb.state, 'CLOSED')
    const res = await cb.execute(async () => 'OK')
    assert.strictEqual(res, 'OK')
    assert.strictEqual(cb.state, 'CLOSED')
  })

  await t.test('Trips to OPEN state after reaching failure threshold', async () => {
    let stateChanges = []
    const cb = new CircuitBreaker({
      name: 'TestFailureService',
      failureThreshold: 3,
      cooldownMs: 80,
      onStateChange: (st) => stateChanges.push(st),
    })

    // 1st failure
    await assert.rejects(cb.execute(async () => { throw new Error('fail 1') }))
    assert.strictEqual(cb.state, 'CLOSED')

    // 2nd failure
    await assert.rejects(cb.execute(async () => { throw new Error('fail 2') }))
    assert.strictEqual(cb.state, 'CLOSED')

    // 3rd failure -> Trips breaker!
    await assert.rejects(cb.execute(async () => { throw new Error('fail 3') }))
    assert.strictEqual(cb.state, 'OPEN')
    assert.ok(stateChanges.includes('OPEN'))

    // Fast-fail while OPEN
    let called = false
    await assert.rejects(
      cb.execute(async () => {
        called = true
        return 'SHOULD_NOT_RUN'
      }),
      (err) => {
        assert.ok(err.message.includes('Circuit is OPEN'))
        return true
      }
    )
    assert.strictEqual(called, false, 'Action must not be called when circuit is OPEN')
  })

  await t.test('CircuitBreaker executes fallback when OPEN or on error', async () => {
    const cb = new CircuitBreaker({
      name: 'TestFallbackService',
      failureThreshold: 1,
      cooldownMs: 500,
    })

    // Trigger failure to open circuit
    const fallbackResult = await cb.execute(
      async () => { throw new Error('Network error') },
      () => 'FALLBACK_VALUE'
    )
    assert.strictEqual(fallbackResult, 'FALLBACK_VALUE')
    assert.strictEqual(cb.state, 'OPEN')

    // Subsequent call while OPEN also invokes fallback
    const secondFallback = await cb.execute(
      async () => 'NEVER',
      () => 'FALLBACK_CACHED'
    )
    assert.strictEqual(secondFallback, 'FALLBACK_CACHED')
  })

  await t.test('Transitions from OPEN -> HALF_OPEN -> CLOSED on recovery', async () => {
    const cb = new CircuitBreaker({
      name: 'TestRecoveryService',
      failureThreshold: 2,
      cooldownMs: 50, // Short cooldown for fast test
      halfOpenSuccessThreshold: 2,
    })

    // Fail twice to trip
    await assert.rejects(cb.execute(async () => { throw new Error('f1') }))
    await assert.rejects(cb.execute(async () => { throw new Error('f2') }))
    assert.strictEqual(cb.state, 'OPEN')

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 60))

    // 1st success in HALF_OPEN
    const r1 = await cb.execute(async () => 'rec1')
    assert.strictEqual(r1, 'rec1')
    assert.strictEqual(cb.state, 'HALF_OPEN')

    // 2nd success in HALF_OPEN -> resets to CLOSED
    const r2 = await cb.execute(async () => 'rec2')
    assert.strictEqual(r2, 'rec2')
    assert.strictEqual(cb.state, 'CLOSED')
  })
})

test('Network Resilience — RateLimiter Token Bucket', async (t) => {
  await t.test('Schedules and processes multiple concurrent tasks cleanly', async () => {
    const limiter = new RateLimiter({
      name: 'TestLimiter',
      tokensPerInterval: 5,
      intervalMs: 100,
    })

    const start = Date.now()
    const tasks = [1, 2, 3, 4, 5].map((id) =>
      limiter.schedule(async () => {
        return id * 10
      })
    )

    const results = await Promise.all(tasks)
    assert.deepStrictEqual(results, [10, 20, 30, 40, 50])
  })

  await t.test('Rejects tasks when queue capacity is exceeded', async () => {
    const limiter = new RateLimiter({
      name: 'SmallQueueLimiter',
      tokensPerInterval: 1,
      intervalMs: 1000,
      maxQueueSize: 2,
    })

    // Fill token & queue
    const p1 = limiter.schedule(() => new Promise((r) => setTimeout(() => r('t1'), 200)))
    const p2 = limiter.schedule(() => Promise.resolve('t2'))
    const p3 = limiter.schedule(() => Promise.resolve('t3'))

    // 4th request exceeds maxQueueSize = 2
    await assert.rejects(
      limiter.schedule(() => Promise.resolve('t4')),
      (err) => {
        assert.ok(err.message.includes('queue capacity'))
        return true
      }
    )

    await Promise.all([p1, p2, p3])
  })
})

test('Network Resilience — ResilientCache TTL & Eviction', async (t) => {
  await t.test('Stores and retrieves cache data within TTL window', async () => {
    const cache = new ResilientCache('test_unit')
    cache.clear()

    cache.set('lat_35_lon_139', { temp: 24.5, condition: 'Clear' }, 100) // 100ms TTL

    const item = cache.get('lat_35_lon_139')
    assert.strictEqual(item.isStale, false)
    assert.deepStrictEqual(item.data, { temp: 24.5, condition: 'Clear' })

    // Wait for expiration
    await new Promise((r) => setTimeout(r, 120))

    const expiredItem = cache.get('lat_35_lon_139')
    assert.strictEqual(expiredItem.isStale, true)
    assert.deepStrictEqual(expiredItem.data, { temp: 24.5, condition: 'Clear' })
  })

  await t.test('Returns null for non-existent cache keys', () => {
    const cache = new ResilientCache('test_unit_2')
    const item = cache.get('unknown_key_xyz')
    assert.strictEqual(item.data, null)
    assert.strictEqual(item.isStale, true)
  })
})

test('Network Resilience — resilientFetch Single-Flight Deduplication & Caching', async (t) => {
  await t.test('Deduplicates parallel GET requests and utilizes TTL cache', async () => {
    const testCache = new ResilientCache('test_fetch')
    testCache.clear()

    let fetchCount = 0
    const originalFetch = globalThis.fetch

    // Mock global fetch
    globalThis.fetch = async (url) => {
      fetchCount++
      await new Promise((r) => setTimeout(r, 20))
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ endpoint: url, count: fetchCount }),
      }
    }

    try {
      const testUrl = 'https://mock.api.autoguard.ai/telemetry/data'

      // Fire 3 simultaneous requests
      const [r1, r2, r3] = await Promise.all([
        resilientFetch(testUrl, undefined, { name: 'MockAPI', cache: testCache, cacheTtlMs: 2000 }),
        resilientFetch(testUrl, undefined, { name: 'MockAPI', cache: testCache, cacheTtlMs: 2000 }),
        resilientFetch(testUrl, undefined, { name: 'MockAPI', cache: testCache, cacheTtlMs: 2000 }),
      ])

      // Should only trigger 1 actual network fetch due to single-flight deduplication
      assert.strictEqual(fetchCount, 1)
      assert.strictEqual(r1.count, 1)
      assert.strictEqual(r2.count, 1)
      assert.strictEqual(r3.count, 1)

      // Subsequent call within TTL should hit cache and NOT invoke fetch
      const cachedResult = await resilientFetch(testUrl, undefined, {
        name: 'MockAPI',
        cache: testCache,
        cacheTtlMs: 2000,
      })
      assert.strictEqual(fetchCount, 1)
      assert.strictEqual(cachedResult.count, 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await t.test('Retries on HTTP 429 and falls back to stale cache on network failure', async () => {
    const testCache = new ResilientCache('test_fallback')
    testCache.clear()
    testCache.set('https://mock.error.api/data', { fallbackData: 'PREVIOUS_GOOD_DATA' }, 10) // expired immediately

    let callAttempts = 0
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => {
      callAttempts++
      if (callAttempts === 1) {
        return { ok: false, status: 429, statusText: 'Too Many Requests' }
      }
      throw new Error('Network Disconnected')
    }

    try {
      const result = await resilientFetch('https://mock.error.api/data', undefined, {
        name: 'ErrorAPI',
        maxRetries: 1,
        retryDelayMs: 20,
        cache: testCache,
        staleFallback: true,
      })

      // Must have attempted retry and then returned stale cache fallback
      assert.ok(callAttempts >= 2)
      assert.deepStrictEqual(result, { fallbackData: 'PREVIOUS_GOOD_DATA' })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
