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

  /**
   * Evaluates pack telemetry against enterprise OEM thresholds
   */
  public evaluateBatteryHealth(telemetry: EvBatteryTelemetry): {
    status: 'NOMINAL' | 'DEGRADED_CELL_WARN' | 'CRITICAL_HV_ALERT'
    cellDeltaVerdict: {
      deltaMv: number
      status: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' | 'CRITICAL'
    }
    isolationVerdict: {
      isolationMegaOhm: number
      status: 'SAFE' | 'LEAK_WARNING' | 'CRITICAL_ISOLATION_FAULT'
    }
    thermalVerdict: {
      packTempC: number
      coolantDeltaC: number
      hotspotModuleId: number | null
      status: 'NORMAL' | 'ELEVATED' | 'OVERHEATING'
    }
    recommendedDtcs: string[]
    advisoryText: string
  } {
    const recommendedDtcs: string[] = []
    let status: 'NOMINAL' | 'DEGRADED_CELL_WARN' | 'CRITICAL_HV_ALERT' = 'NOMINAL'

    // 1. Cell Delta Evaluation
    let deltaStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' | 'CRITICAL' = 'OPTIMAL'
    if (telemetry.cellVoltageDeltaMv > 60) {
      deltaStatus = 'CRITICAL'
      status = 'CRITICAL_HV_ALERT'
      recommendedDtcs.push('P0A7F', 'P0A80')
    } else if (telemetry.cellVoltageDeltaMv > 30) {
      deltaStatus = 'WARNING'
      status = 'DEGRADED_CELL_WARN'
      recommendedDtcs.push('P0A7F')
    } else if (telemetry.cellVoltageDeltaMv > 15) {
      deltaStatus = 'ACCEPTABLE'
    }

    // 2. High Voltage Isolation Resistance Check (Minimum 500 Ω/V; 400V requires > 200 kΩ = 0.2 MΩ, OEM nominal > 100 MΩ)
    let isoStatus: 'SAFE' | 'LEAK_WARNING' | 'CRITICAL_ISOLATION_FAULT' = 'SAFE'
    if (telemetry.isolationResistanceMegaOhm < 50) {
      isoStatus = 'CRITICAL_ISOLATION_FAULT'
      status = 'CRITICAL_HV_ALERT'
      recommendedDtcs.push('P0AA6')
    } else if (telemetry.isolationResistanceMegaOhm < 150) {
      isoStatus = 'LEAK_WARNING'
      if (status !== 'CRITICAL_HV_ALERT') status = 'DEGRADED_CELL_WARN'
    }

    // 3. Thermal Gradient & Hotspot Detection
    let maxModTemp = 0
    let minModTemp = 100
    let hotspotModuleId: number | null = null

    telemetry.modules.forEach((mod) => {
      if (mod.temperatureC > maxModTemp) {
        maxModTemp = mod.temperatureC
        hotspotModuleId = mod.moduleId
      }
      if (mod.temperatureC < minModTemp) {
        minModTemp = mod.temperatureC
      }
    })

    const tempDelta = maxModTemp - minModTemp
    const coolantDelta = Math.round((telemetry.coolantOutletTempC - telemetry.coolantInletTempC) * 10) / 10
    let thermalStatus: 'NORMAL' | 'ELEVATED' | 'OVERHEATING' = 'NORMAL'

    if (telemetry.packTemperatureC > 52 || tempDelta > 10) {
      thermalStatus = 'OVERHEATING'
      status = 'CRITICAL_HV_ALERT'
      recommendedDtcs.push('P0A93')
    } else if (telemetry.packTemperatureC > 42 || tempDelta > 6) {
      thermalStatus = 'ELEVATED'
      if (status !== 'CRITICAL_HV_ALERT') status = 'DEGRADED_CELL_WARN'
    }

    // Compose diagnostic advisory
    let advisoryText = 'All 96 lithium-ion cell groups balanced. HV isolation resistance within nominal OEM limits.'
    if (status === 'CRITICAL_HV_ALERT') {
      advisoryText = `CRITICAL BMS FAULT: Cell delta (${telemetry.cellVoltageDeltaMv} mV) or isolation (${telemetry.isolationResistanceMegaOhm} MΩ) breached safe operating boundaries. High-voltage interlock inspection mandated.`
    } else if (status === 'DEGRADED_CELL_WARN') {
      advisoryText = `BMS ADVISORY: Cell delta deviation (${telemetry.cellVoltageDeltaMv} mV). Active cell balancing and DC fast-charge derating advised.`
    }

    return {
      status,
      cellDeltaVerdict: {
        deltaMv: telemetry.cellVoltageDeltaMv,
        status: deltaStatus,
      },
      isolationVerdict: {
        isolationMegaOhm: telemetry.isolationResistanceMegaOhm,
        status: isoStatus,
      },
      thermalVerdict: {
        packTempC: telemetry.packTemperatureC,
        coolantDeltaC: coolantDelta,
        hotspotModuleId,
        status: thermalStatus,
      },
      recommendedDtcs,
      advisoryText,
    }
  }
}

export const evBatteryService = new EvBatteryService()

