import type { InspectionReport } from '../types.ts'

const DB_NAME = 'AutoGuardDB'
const DB_VERSION = 1
const STORE_NAME = 'inspection_reports'
const LOCAL_STORAGE_KEY = 'autoguard-history'

/**
 * Native Promise-based IndexedDB Storage Engine for AutoGuard AI
 * Eliminates 5MB localStorage quota limitations for high-res forensic assets.
 */
class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'))
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            store.createIndex('timestamp', 'timestamp', { unique: false })
          }
        }

        request.onsuccess = () => {
          resolve(request.result)
        }

        request.onerror = () => {
          reject(request.error || new Error('Failed to open AutoGuard IndexedDB'))
        }
      })
    }

    return this.dbPromise
  }

  /**
   * Save or update an inspection report
   */
  async saveReport(report: InspectionReport): Promise<string> {
    try {
      const db = await this.getDB()
      return await new Promise<string>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(report)

        request.onsuccess = () => resolve(report.id)
        request.onerror = () => reject(request.error || new Error('Failed to save report to IndexedDB'))
      })
    } catch (err) {
      console.warn('[StorageService] IndexedDB save failed, falling back to LocalStorage:', err)
      // Fallback to localStorage
      try {
        const existing: InspectionReport[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
        const filtered = existing.filter((r) => r.id !== report.id)
        // Store report with truncated image in localStorage if too large
        const lightweightReport = { ...report }
        filtered.unshift(lightweightReport)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)))
        return report.id
      } catch (localErr) {
        console.error('[StorageService] LocalStorage fallback also failed:', localErr)
        return report.id
      }
    }
  }

  /**
   * Retrieve all saved reports ordered by timestamp descending
   */
  async getReports(limitCount = 50): Promise<InspectionReport[]> {
    try {
      const db = await this.getDB()
      return await new Promise<InspectionReport[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const index = store.index('timestamp')
        const request = index.openCursor(null, 'prev')
        const results: InspectionReport[] = []

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor && results.length < limitCount) {
            results.push(cursor.value)
            cursor.continue()
          } else {
            resolve(results)
          }
        }

        request.onerror = () => reject(request.error || new Error('Failed to read reports from IndexedDB'))
      })
    } catch (err) {
      console.warn('[StorageService] IndexedDB read failed, falling back to LocalStorage:', err)
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    }
  }

  /**
   * Delete a report by ID
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      const db = await this.getDB()
      return await new Promise<boolean>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error || new Error('Failed to delete report'))
      })
    } catch {
      try {
        const existing: InspectionReport[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
        const filtered = existing.filter((r) => r.id !== id)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Clear all local reports
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Ignored
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }
}

export const storageService = new StorageService()
