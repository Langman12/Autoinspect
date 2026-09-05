import { useEffect, useState } from 'react'
import type { View } from '../components/Layout.tsx'
import { aiService, type AIProvider } from '../services/aiService.ts'
import { storageService } from '../services/storageService.ts'
import type { InspectionReport, VehicleProfile } from '../types.ts'

export const DEFAULT_VEHICLE: VehicleProfile = {
  year: '2023',
  makeModel: '',
  vin: '',
  mileage: '45,000 km',
  fuelType: 'Petrol (Gasoline)',
  class: 'ECONOMY',
}

export interface AutoGuardState {
  activeView: View
  vehicle: VehicleProfile
  history: InspectionReport[]
  currentReport: InspectionReport | null
  aiProvider: AIProvider
  isLoadingReports: boolean
}

type Listener = (state: AutoGuardState) => void

class AutoGuardStore {
  private state: AutoGuardState = {
    activeView: 'inspect',
    vehicle: { ...DEFAULT_VEHICLE },
    history: [],
    currentReport: null,
    aiProvider: aiService.getActiveProvider(),
    isLoadingReports: false,
  }

  private listeners: Set<Listener> = new Set()

  constructor() {
    // Sync with aiService changes
    aiService.onProviderChange((provider) => {
      this.setState({ aiProvider: provider })
    })
  }

  public getState(): AutoGuardState {
    return this.state
  }

  public setState(partial: Partial<AutoGuardState> | ((prev: AutoGuardState) => Partial<AutoGuardState>)) {
    const next = typeof partial === 'function' ? partial(this.state) : partial
    this.state = { ...this.state, ...next }
    this.notify()
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state))
  }

  // --- Domain Actions ---

  public setActiveView(activeView: View) {
    this.setState({ activeView })
  }

  public setVehicle(vehicle: VehicleProfile) {
    this.setState({ vehicle })
  }

  public updateVehicleField<K extends keyof VehicleProfile>(key: K, value: VehicleProfile[K]) {
    this.setState((prev) => ({
      vehicle: { ...prev.vehicle, [key]: value },
    }))
  }

  public patchVehicle(extracted: Partial<VehicleProfile>) {
    this.setState((prev) => ({
      vehicle: {
        ...prev.vehicle,
        year: extracted.year || prev.vehicle.year,
        makeModel: extracted.makeModel || prev.vehicle.makeModel,
        vin: extracted.vin ? extracted.vin.toUpperCase() : prev.vehicle.vin,
        mileage: extracted.mileage || prev.vehicle.mileage,
        fuelType: extracted.fuelType || prev.vehicle.fuelType,
        class: (extracted.class as VehicleProfile['class']) || prev.vehicle.class,
      },
    }))
  }

  public resetVehicle() {
    this.setState({ vehicle: { ...DEFAULT_VEHICLE } })
  }

  public setCurrentReport(currentReport: InspectionReport | null) {
    this.setState({ currentReport })
  }

  public setAiProvider(aiProvider: AIProvider) {
    aiService.setActiveProvider(aiProvider)
    this.setState({ aiProvider })
  }

  public async loadReports() {
    this.setState({ isLoadingReports: true })
    try {
      const reports = await storageService.getReports(50)
      this.setState({ history: reports, isLoadingReports: false })
    } catch {
      this.setState({ history: [], isLoadingReports: false })
    }
  }

  public async saveReport(report: InspectionReport) {
    this.setState((prev) => ({
      currentReport: report,
      history: [report, ...prev.history.filter((r) => r.id !== report.id)].slice(0, 50),
    }))
    try {
      await storageService.saveReport(report)
    } catch (err) {
      console.error('[AutoGuardStore] Failed to persist report in IndexedDB:', err)
    }
  }

  public async deleteReport(id: string) {
    this.setState((prev) => ({
      history: prev.history.filter((r) => r.id !== id),
      currentReport: prev.currentReport?.id === id ? null : prev.currentReport,
    }))
    try {
      await storageService.deleteReport(id)
    } catch (err) {
      console.error('[AutoGuardStore] Failed to delete report:', err)
    }
  }
}

export const autoGuardStore = new AutoGuardStore()

/**
 * React Hook to subscribe to AutoGuard global store
 */
export function useAutoGuardStore(): AutoGuardState & {
  setActiveView: (view: View) => void
  setVehicle: (vehicle: VehicleProfile) => void
  updateVehicleField: <K extends keyof VehicleProfile>(key: K, value: VehicleProfile[K]) => void
  patchVehicle: (extracted: Partial<VehicleProfile>) => void
  resetVehicle: () => void
  setCurrentReport: (report: InspectionReport | null) => void
  setAiProvider: (provider: AIProvider) => void
  loadReports: () => Promise<void>
  saveReport: (report: InspectionReport) => Promise<void>
  deleteReport: (id: string) => Promise<void>
} {
  const [state, setState] = useState<AutoGuardState>(autoGuardStore.getState())

  useEffect(() => {
    const unsub = autoGuardStore.subscribe(setState)
    return unsub
  }, [])

  return {
    ...state,
    setActiveView: autoGuardStore.setActiveView.bind(autoGuardStore),
    setVehicle: autoGuardStore.setVehicle.bind(autoGuardStore),
    updateVehicleField: autoGuardStore.updateVehicleField.bind(autoGuardStore),
    patchVehicle: autoGuardStore.patchVehicle.bind(autoGuardStore),
    resetVehicle: autoGuardStore.resetVehicle.bind(autoGuardStore),
    setCurrentReport: autoGuardStore.setCurrentReport.bind(autoGuardStore),
    setAiProvider: autoGuardStore.setAiProvider.bind(autoGuardStore),
    loadReports: autoGuardStore.loadReports.bind(autoGuardStore),
    saveReport: autoGuardStore.saveReport.bind(autoGuardStore),
    deleteReport: autoGuardStore.deleteReport.bind(autoGuardStore),
  }
}
