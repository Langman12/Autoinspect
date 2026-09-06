import type {
  BatteryDegradationPoint,
  EvBatteryTelemetry,
  EvCell,
  EvModule,
} from '../types.ts'

export class EvBatteryService {
  public generateTelemetry(): EvBatteryTelemetry {
    const modules: EvModule[] = []
    let globalMinMv = 5000
    let globalMaxMv = 0
    let totalMvSum = 0

    const totalModules = 16
    const cellsPerModule = 6 // 96 total cells (typical 400V architecture)

    for (let m = 1; m <= totalModules; m++) {
      const cells: EvCell[] = []
      let moduleMvSum = 0
      const moduleTemp = 28.5 + (m >= 4 && m <= 6 ? 3.8 : Math.sin(m * 0.8) * 1.5)

      for (let c = 1; c <= cellsPerModule; c++) {
        const cellId = (m - 1) * cellsPerModule + c

        // Inject simulated degraded cell in Module 4 Cell 3 & mild delta in Module 11 Cell 5
        let baseMv = 3985 + Math.round(Math.sin(cellId * 0.7) * 8)
        let ir = 1.45 + (Math.random() - 0.5) * 0.1
        let status: EvCell['status'] = 'OPTIMAL'

        if (cellId === 21) {
          // Module 4 Cell 3: weak cell with 48mV sag
          baseMv -= 48
          ir = 2.18
          status = 'CELL_DELTA_WARN'
        } else if (cellId === 65) {
          baseMv -= 28
          ir = 1.82
          status = 'CELL_DELTA_WARN'
        }

        if (baseMv < globalMinMv) globalMinMv = baseMv
        if (baseMv > globalMaxMv) globalMaxMv = baseMv
        moduleMvSum += baseMv
        totalMvSum += baseMv

        cells.push({
          cellId,
          moduleId: m,
          voltageMv: baseMv,
          temperatureC: Math.round(moduleTemp * 10) / 10,
          internalResistanceMilliOhm: Math.round(ir * 100) / 100,
          status,
        })
      }

      modules.push({
        moduleId: m,
        cells,
        averageVoltageV: Math.round((moduleMvSum / cellsPerModule / 1000) * 100) / 100,
        temperatureC: Math.round(moduleTemp * 10) / 10,
      })
    }

    const deltaMv = globalMaxMv - globalMinMv
    const packVoltageV = Math.round((totalMvSum / 1000) * 10) / 10
    const soh = deltaMv > 40 ? 89.2 : 95.4

    const degradationCurve: BatteryDegradationPoint[] = [
      { mileageKm: 0, projectedSohPercent: 100.0, estimatedRangeKm: 480 },
      { mileageKm: 30000, projectedSohPercent: 96.2, estimatedRangeKm: 461 },
      { mileageKm: 60000, projectedSohPercent: 92.8, estimatedRangeKm: 445 },
      { mileageKm: 90000, projectedSohPercent: 89.4, estimatedRangeKm: 429 },
      { mileageKm: 120000, projectedSohPercent: 86.1, estimatedRangeKm: 413 },
      { mileageKm: 160000, projectedSohPercent: 82.5, estimatedRangeKm: 396 },
      { mileageKm: 200000, projectedSohPercent: 78.4, estimatedRangeKm: 376 },
    ]

    return {
      packVoltageV,
      packCurrentAmps: -48.5, // Discharging/Regen Amps
      stateOfChargePercent: 74,
      stateOfHealthPercent: soh,
      packTemperatureC: 30.4,
      coolantInletTempC: 22.1,
      coolantOutletTempC: 26.8,
      maxCellVoltageMv: globalMaxMv,
      minCellVoltageMv: globalMinMv,
      cellVoltageDeltaMv: deltaMv,
      isolationResistanceMegaOhm: 720,
      dendriteRiskScore: 12,
      fastChargeCycleCount: 248,
      totalKwhCapacityNominal: 82.0,
      totalKwhCapacityCurrent: 73.1,
      modules,
      degradationCurve,
    }
  }
}

export const evBatteryService = new EvBatteryService()
