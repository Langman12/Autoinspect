/**
 * AutoGuard AI — Enterprise Network Resilience, Circuit Breakers & API Rate Limiting
 * 
 * Provides:
 * 1. CircuitBreaker: Fails fast during downstream API outages and automatically probes for recovery.
 * 2. RateLimiter / TokenBucket: Prevents 429 Too Many Requests by throttling and queuing requests.
 * 3. RequestDeduplicator: Single-flight cache preventing concurrent duplicate HTTP requests.
 * 4. ResilientCache: Two-tier (In-Memory + LocalStorage) cache with TTL and stale-while-revalidate fallback.
 * 5. ResilientFetch: Unified, bulletproof fetch wrapper with exponential backoff, jitter, timeouts, and offline awareness.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  name: string
  failureThreshold?: number // Number of failures before tripping (default: 4)
  cooldownMs?: number // Time in OPEN state before trying HALF_OPEN (default: 30,000ms)
  halfOpenSuccessThreshold?: number // Successes needed in HALF_OPEN to return to CLOSED (default: 2)
  onStateChange?: (state: CircuitState, name: string) => void
}

export class CircuitBreaker {
  public state: CircuitState = 'CLOSED'
  public failureCount = 0
  public successCount = 0
  public nextAttemptTime = 0
  public readonly name: string
  private readonly failureThreshold: number
  private readonly cooldownMs: number
  private readonly halfOpenSuccessThreshold: number
  private readonly onStateChange?: (state: CircuitState, name: string) => void

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name
    this.failureThreshold = options.failureThreshold ?? 4
    this.cooldownMs = options.cooldownMs ?? 30000
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2
    this.onStateChange = options.onStateChange
  }

  public canExecute(): boolean {
    const now = Date.now()
    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptTime) {
        this.transitionTo('HALF_OPEN')
        return true
      }
      return false
    }
    return true
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.failureCount = 0
        this.successCount = 0
        this.transitionTo('CLOSED')
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0
    }
  }

  public recordFailure(): void {
    this.failureCount++
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.nextAttemptTime = Date.now() + this.cooldownMs
      this.transitionTo('OPEN')
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState
      this.onStateChange?.(newState, this.name)
    }
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    if (!this.canExecute()) {
      if (fallback) return await fallback()
      throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN (fast fail). Downstream service is currently degraded.`)
    }

    try {
      const result = await action()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      if (fallback) return await fallback()
      throw err
    }
  }
}

/**
 * Token-Bucket Rate Limiter with In-Memory Task Queue
 */
export interface RateLimiterOptions {
  name: string
  tokensPerInterval: number // e.g., 5 requests
  intervalMs: number // per 1000ms
  maxQueueSize?: number // Maximum queued requests before rejecting (default: 50)
}

export class RateLimiter {
  private tokens: number
  private readonly maxTokens: number
  private readonly refillRatePerMs: number
  private lastRefill: number = Date.now()
  private queue: Array<{ resolve: (val: any) => void; reject: (err: any) => void; task: () => Promise<any> }> = []
  private isProcessing = false
  private readonly maxQueueSize: number
  public readonly name: string

  constructor(options: RateLimiterOptions) {
    this.name = options.name
    this.maxTokens = options.tokensPerInterval
    this.tokens = options.tokensPerInterval
    this.refillRatePerMs = options.tokensPerInterval / options.intervalMs
    this.maxQueueSize = options.maxQueueSize ?? 50
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs)
    this.lastRefill = now
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        return reject(new Error(`[RateLimiter:${this.name}] Request queue capacity (${this.maxQueueSize}) exceeded.`))
      }
      this.queue.push({ resolve, reject, task })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      this.refill()
      if (this.tokens >= 1) {
        this.tokens -= 1
        const item = this.queue.shift()
        if (item) {
          try {
            const res = await item.task()
            item.resolve(res)
          } catch (err) {
            item.reject(err)
          }
        }
      } else {
        // Wait until at least 1 token is refilled
        const delay = Math.max(50, Math.ceil((1 - this.tokens) / this.refillRatePerMs))
        await new Promise((r) => setTimeout(r, delay))
      }
    }

    this.isProcessing = false
  }
}

/**
 * Resilient Cache with TTL and LocalStorage Persistence
 */
interface CacheEntry<T> {
  data: T
  expiresAt: number
  cachedAt: number
}

export class ResilientCache<T = any> {
  private memoryCache = new Map<string, CacheEntry<T>>()
  private readonly prefix: string

  constructor(prefix: string) {
    this.prefix = `autoguard_cache_${prefix}_`
  }

  public get(key: string): { data: T | null; isStale: boolean } {
    const fullKey = `${this.prefix}${key}`
    const now = Date.now()

    // 1. Try memory cache
    let entry = this.memoryCache.get(key)

    // 2. Try localStorage if not in memory
    if (!entry && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(fullKey)
        if (raw) {
          entry = JSON.parse(raw) as CacheEntry<T>
          if (entry) this.memoryCache.set(key, entry)
        }
      } catch (_) {
        // Ignore localStorage quota or parse errors
      }
    }

    if (!entry) return { data: null, isStale: true }
    const isStale = now > entry.expiresAt
    return { data: entry.data, isStale }
  }

  public set(key: string, data: T, ttlMs: number): void {
    const fullKey = `${this.prefix}${key}`
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    }

    this.memoryCache.set(key, entry)

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry))
      } catch (_) {
        // LocalStorage quota may be reached; memory cache still works
      }
    }
  }

  public clear(): void {
    this.memoryCache.clear()
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(this.prefix)) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      } catch (_) {}
    }
  }
}

/**
 * Resilient Fetch Configuration Options
 */
export interface ResilientFetchOptions {
  name: string
  timeoutMs?: number // Default: 7000ms
  maxRetries?: number // Default: 2
  retryDelayMs?: number // Default: 500ms base delay
  cacheTtlMs?: number // Cache duration in ms
  rateLimiter?: RateLimiter
  circuitBreaker?: CircuitBreaker
  cache?: ResilientCache
  staleFallback?: boolean // If true, returns stale cached data on complete network failure
}

/**
 * Request Deduplication Table (Single-Flight)
 */
const inFlightRequests = new Map<string, Promise<any>>()

/**
 * Executes an HTTP fetch with full enterprise resilience:
 * - In-flight single-flight request coalescing
 * - Rate limiting
 * - Circuit breaker fail-fast protection
 * - Automatic retry with exponential backoff & randomized jitter (for 429, 502, 503, 504, timeout)
 * - Two-tier TTL caching with offline stale fallback
 */
export async function resilientFetch<T = any>(
  url: string,
  fetchOptions?: RequestInit,
  options?: ResilientFetchOptions
): Promise<T> {
  const name = options?.name || 'api'
  const timeoutMs = options?.timeoutMs ?? 7000
  const maxRetries = options?.maxRetries ?? 2
  const baseDelay = options?.retryDelayMs ?? 500
  const cache = options?.cache
  const cacheTtlMs = options?.cacheTtlMs
  const rateLimiter = options?.rateLimiter
  const circuitBreaker = options?.circuitBreaker
  const staleFallback = options?.staleFallback ?? true

  // 1. Cache Check
  if (cache && cacheTtlMs) {
    const cached = cache.get(url)
    if (cached.data !== null && !cached.isStale) {
      return cached.data as T
    }
  }

  // 2. Single-Flight Deduplication (for identical concurrent GET requests)
  const isGet = !fetchOptions?.method || fetchOptions.method.toUpperCase() === 'GET'
  const dedupeKey = `${name}:${url}`
  if (isGet && inFlightRequests.has(dedupeKey)) {
    return inFlightRequests.get(dedupeKey) as Promise<T>
  }

  const executionPromise = (async () => {
    // 3. Fallback retriever if circuit is OPEN or network fails
    const getStaleFallback = () => {
      if (cache && staleFallback) {
        const cached = cache.get(url)
        if (cached.data !== null) {
          return cached.data as T
        }
      }
      return null
    }

    const runWithRetries = async (): Promise<T> => {
      let attempt = 0
      let lastError: any = null

      while (attempt <= maxRetries) {
        try {
          // Check navigator.onLine if available
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            throw new Error('Device is offline')
          }

          const response = await fetch(url, {
            ...fetchOptions,
            signal: AbortSignal.timeout(timeoutMs),
          })

          // Rate-limited or transient server error: retry
          if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
            const errorMsg = `HTTP ${response.status} ${response.statusText}`
            if (attempt === maxRetries) {
              throw new Error(errorMsg)
            }
            lastError = new Error(errorMsg)
          } else if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          } else {
            const data = await response.json()
            if (cache && cacheTtlMs) {
              cache.set(url, data, cacheTtlMs)
            }
            return data as T
          }
        } catch (err: any) {
          lastError = err
          if (attempt === maxRetries) break
        }

        attempt++
        // Exponential backoff with jitter: delay = base * 2^attempt + jitter (0..200ms)
        const jitter = Math.floor(Math.random() * 200)
        const delay = baseDelay * Math.pow(2, attempt) + jitter
        await new Promise((r) => setTimeout(r, delay))
      }

      // Check for stale cache fallback before throwing
      const staleData = getStaleFallback()
      if (staleData !== null) {
        return staleData
      }

      throw lastError || new Error(`[resilientFetch:${name}] All ${maxRetries} retry attempts failed for ${url}`)
    }

    // 4. Wrap with RateLimiter and CircuitBreaker if configured
    const executeThroughResilience = async (): Promise<T> => {
      const task = () => runWithRetries()
      if (rateLimiter) {
        return await rateLimiter.schedule(task)
      }
      return await task()
    }

    if (circuitBreaker) {
      return await circuitBreaker.execute(
        executeThroughResilience,
        () => {
          const fallback = getStaleFallback()
          if (fallback !== null) return fallback
          throw new Error(`[CircuitBreaker:${circuitBreaker.name}] Tripped and no cached fallback available.`)
        }
      )
    }

    return await executeThroughResilience()
  })()

  if (isGet) {
    inFlightRequests.set(dedupeKey, executionPromise)
    executionPromise.finally(() => inFlightRequests.delete(dedupeKey))
  }

  return executionPromise
}

/**
 * Pre-configured singleton resilience instances for AutoGuard AI
 */
export const weatherCircuitBreaker = new CircuitBreaker({
  name: 'OpenMeteoWeather',
  failureThreshold: 4,
  cooldownMs: 25000,
})

export const weatherRateLimiter = new RateLimiter({
  name: 'OpenMeteoWeather',
  tokensPerInterval: 6,
  intervalMs: 1000,
})

export const weatherCache = new ResilientCache('openmeteo')

export const nhtsaCircuitBreaker = new CircuitBreaker({
  name: 'NHTSARecalls',
  failureThreshold: 4,
  cooldownMs: 30000,
})

export const nhtsaRateLimiter = new RateLimiter({
  name: 'NHTSARecalls',
  tokensPerInterval: 6,
  intervalMs: 1000,
})

export const nhtsaCache = new ResilientCache('nhtsa_recalls')
