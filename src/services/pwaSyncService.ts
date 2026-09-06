import type { OfflineSyncItem, PwaSyncStatus } from '../types.ts'

export class PwaSyncService {
  private queue: OfflineSyncItem[] = []
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private listeners: Array<(status: PwaSyncStatus, pendingCount: number) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.processQueue()
        this.notify()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
        this.notify()
      })
      this.registerServiceWorker()
    }
  }

  public registerServiceWorker() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope)
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err)
        })
    }
  }

  public getStatus(): PwaSyncStatus {
    if (!this.isOnline) return 'OFFLINE_CACHED'
    if (this.queue.some((q) => q.status === 'PENDING_UPLOAD')) return 'SYNCING_BACKGROUND'
    return 'ONLINE_SYNCED'
  }

  public getPendingCount(): number {
    return this.queue.filter((q) => q.status === 'PENDING_UPLOAD').length
  }

  private static readonly MAX_SYNCED_HISTORY = 50

  public getQueue(): OfflineSyncItem[] {
    return [...this.queue]
  }

  public enqueueItem(type: OfflineSyncItem['type'], payload: any): OfflineSyncItem {
    const item: OfflineSyncItem = {
      id: `SYNC-${Date.now().toString(36).toUpperCase()}`,
      type,
      timestamp: Date.now(),
      payload,
      status: 'PENDING_UPLOAD',
    }
    this.queue.push(item)
    this.pruneQueue()
    this.notify()

    if (this.isOnline) {
      this.processQueue()
    }

    return item
  }

  public async processQueue() {
    const pendingItems = this.queue.filter((q) => q.status === 'PENDING_UPLOAD')
    if (pendingItems.length === 0) return

    const delay = typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 0 : 50
    await Promise.all(
      pendingItems.map(async (item) => {
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay))
        }
        item.status = 'SYNCED'
      })
    )

    this.pruneQueue()
    this.notify()
  }

  public clearSynced(): void {
    this.queue = this.queue.filter((q) => q.status === 'PENDING_UPLOAD')
    this.notify()
  }

  private pruneQueue(): void {
    const pending = this.queue.filter((q) => q.status === 'PENDING_UPLOAD')
    const synced = this.queue.filter((q) => q.status === 'SYNCED')
    if (synced.length > PwaSyncService.MAX_SYNCED_HISTORY) {
      const retainedSynced = synced.slice(-PwaSyncService.MAX_SYNCED_HISTORY)
      this.queue = [...pending, ...retainedSynced]
    }
  }

  public subscribe(callback: (status: PwaSyncStatus, pendingCount: number) => void): () => void {
    this.listeners.push(callback)
    callback(this.getStatus(), this.getPendingCount())
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    const status = this.getStatus()
    const pending = this.getPendingCount()
    for (const listener of this.listeners) {
      listener(status, pending)
    }
  }
}

export const pwaSyncService = new PwaSyncService()
