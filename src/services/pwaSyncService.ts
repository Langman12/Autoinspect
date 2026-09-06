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

  public enqueueItem(type: OfflineSyncItem['type'], payload: any): OfflineSyncItem {
    const item: OfflineSyncItem = {
      id: `SYNC-${Date.now().toString(36).toUpperCase()}`,
      type,
      timestamp: Date.now(),
      payload,
      status: 'PENDING_UPLOAD',
    }
    this.queue.push(item)
    this.notify()

    if (this.isOnline) {
      this.processQueue()
    }

    return item
  }

  public async processQueue() {
    for (const item of this.queue) {
      if (item.status === 'PENDING_UPLOAD') {
        // Simulate background network upload
        await new Promise((r) => setTimeout(r, 400))
        item.status = 'SYNCED'
      }
    }
    this.notify()
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
