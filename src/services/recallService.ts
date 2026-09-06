import type { NHTSARecall } from '../types'
import {
  resilientFetch,
  nhtsaCircuitBreaker,
  nhtsaRateLimiter,
  nhtsaCache,
} from './networkResilience.ts'

export const recallService = {
  /**
   * Fetch safety recalls by 17-character VIN with enterprise resilience & 24hr cache
   */
  async getRecallsByVin(vin: string): Promise<NHTSARecall[]> {
    if (typeof vin !== 'string') return []
    const normalizedVin = vin.trim().toUpperCase()
    // 17 characters, alphanumeric excluding I, O, Q
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/
    if (!vinRegex.test(normalizedVin)) return []

    try {
      const url = `https://api.nhtsa.dot.gov/recalls/recallsByVehicle?vin=${encodeURIComponent(normalizedVin)}`
      const data = await resilientFetch<any>(url, undefined, {
        name: 'NHTSARecallsByVin',
        timeoutMs: 7000,
        maxRetries: 2,
        retryDelayMs: 500,
        cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hour TTL
        cache: nhtsaCache,
        circuitBreaker: nhtsaCircuitBreaker,
        rateLimiter: nhtsaRateLimiter,
        staleFallback: true,
      })

      return (data?.results || []).map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber || r.campaignNumber || 'UNKNOWN',
        manufacturer: r.Manufacturer || r.manufacturer || 'UNKNOWN',
        subject: r.Subject || r.subject || 'Safety Recall Notice',
        component: r.Component || r.component || 'General',
        consequence: r.Consequence || r.consequence || 'Unknown hazard risk',
        remedy: r.Remedy || r.remedy || 'Contact authorized dealership',
        reportDate: r.ReportReceivedDate || r.reportDate || new Date().toISOString(),
        unitsAffected: Number(r.PotentialNumberOfUnitsAffected || r.unitsAffected || 0),
      }))
    } catch (err) {
      console.warn('[RecallService] NHTSA recall lookup failed or offline:', err)
      return []
    }
  },

  /**
   * Fetch safety recalls by Make, Model, and Year
   */
  async getRecallsByMakeModel(make: string, model: string, year: string): Promise<NHTSARecall[]> {
    if (!make?.trim() || !model?.trim() || !year?.trim()) return []
    try {
      const url = `https://api.nhtsa.dot.gov/recalls/recallsByVehicle?make=${encodeURIComponent(
        make.trim()
      )}&model=${encodeURIComponent(model.trim())}&modelYear=${encodeURIComponent(year.trim())}`

      const data = await resilientFetch<any>(url, undefined, {
        name: 'NHTSARecallsByMakeModel',
        timeoutMs: 7000,
        maxRetries: 2,
        retryDelayMs: 500,
        cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hour TTL
        cache: nhtsaCache,
        circuitBreaker: nhtsaCircuitBreaker,
        rateLimiter: nhtsaRateLimiter,
        staleFallback: true,
      })

      return (data?.results || []).map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber || r.campaignNumber || 'UNKNOWN',
        manufacturer: r.Manufacturer || r.manufacturer || make.trim(),
        subject: r.Subject || r.subject || 'Safety Recall Notice',
        component: r.Component || r.component || 'General',
        consequence: r.Consequence || r.consequence || 'Unknown hazard risk',
        remedy: r.Remedy || r.remedy || 'Contact authorized dealership',
        reportDate: r.ReportReceivedDate || r.reportDate || new Date().toISOString(),
        unitsAffected: Number(r.PotentialNumberOfUnitsAffected || r.unitsAffected || 0),
      }))
    } catch (err) {
      console.warn('[RecallService] NHTSA Make/Model lookup failed or offline:', err)
      return []
    }
  },
}
