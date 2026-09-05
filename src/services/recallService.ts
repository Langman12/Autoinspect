import type { NHTSARecall } from '../types'

export const recallService = {
  async getRecallsByVin(vin: string): Promise<NHTSARecall[]> {
    if (vin.length !== 17) return []
    try {
      const url = `https://api.nhtsa.dot.gov/recalls/recallsByVehicle?vin=${vin}`
      const response = await fetch(url)
      const data = await response.json()
      return (data.results || []).map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber,
        manufacturer: r.Manufacturer,
        subject: r.Subject,
        component: r.Component,
        consequence: r.Consequence,
        remedy: r.Remedy,
        reportDate: r.ReportReceivedDate,
        unitsAffected: r.PotentialNumberOfUnitsAffected,
      }))
    } catch (err) {
      console.error('NHTSA recall lookup failed:', err)
      return []
    }
  },

  async getRecallsByMakeModel(make: string, model: string, year: string): Promise<NHTSARecall[]> {
    try {
      const url = `https://api.nhtsa.dot.gov/recalls/recallsByVehicle?make=${make}&model=${model}&modelYear=${year}`
      const response = await fetch(url)
      const data = await response.json()
      return data.results || []
    } catch {
      return []
    }
  },
}
