import { useEffect, useRef, useState } from 'react'
import { obdStreamer } from '../services/obdStreamer.ts'
import type { ObdConnectionStatus, ObdPidData } from '../types.ts'

export interface ObdGaugeDerivedMetrics {
  estimatedBhp: number
  estimatedTorqueNm: number
  airFuelRatio: number
  lambda: number
  shiftLightStage: 'OFF' | 'STAGE_1' | 'STAGE_2' | 'REDLINE'
  peakRpm: number
  peakBoostPsi: number
  volumetricEfficiency: number
}

export interface ObdGaugeStreamState {
  rawPids: ObdPidData
  status: ObdConnectionStatus
  metrics: ObdGaugeDerivedMetrics
  isLive: boolean
  resetPeaks: () => void
}

/**
 * Calculates real-time derived engine performance metrics from raw OBD-II PIDs.
 */
export function calculateObdDerivedMetrics(
  pids: ObdPidData,
  peakRpm = 0,
  peakBoostPsi = -15
): ObdGaugeDerivedMetrics {
  // Estimated Brake Horsepower (Standard Formula: MAF g/s * 1.25, scaled by throttle & load)
  const baseHpFromMaf = pids.mafGramsPerSec > 0 ? pids.mafGramsPerSec * 1.28 : (pids.engineLoadPercent / 100) * 220
  const estimatedBhp = Math.max(0, Math.round(baseHpFromMaf * (0.6 + (pids.throttlePercent / 100) * 0.4)))

  // Estimated Torque (Nm) = (BHP * 7120.8) / RPM
  const safeRpm = Math.max(800, pids.rpm)
  const estimatedTorqueNm = Math.max(0, Math.round((estimatedBhp * 7120.8) / safeRpm))

  // Air-Fuel Ratio (AFR) & Lambda
  // Stoichiometric baseline for gasoline is 14.7:1
  const totalFuelTrim = (pids.stftPercent + pids.ltftPercent) / 100
  const lambda = Math.max(0.7, Math.min(1.4, Number((1.0 - totalFuelTrim * 0.15).toFixed(2))))
  const airFuelRatio = Number((14.7 * lambda).toFixed(2))

  // Shift Light Stages
  let shiftLightStage: 'OFF' | 'STAGE_1' | 'STAGE_2' | 'REDLINE' = 'OFF'
  if (pids.rpm >= 6800) {
    shiftLightStage = 'REDLINE'
  } else if (pids.rpm >= 6200) {
    shiftLightStage = 'STAGE_2'
  } else if (pids.rpm >= 5500) {
    shiftLightStage = 'STAGE_1'
  }

  // Volumetric Efficiency approx
  const ve = Math.min(115, Math.max(40, Math.round((pids.mapKpa / 101.3) * (pids.engineLoadPercent * 0.9 + 10))))

  return {
    estimatedBhp,
    estimatedTorqueNm,
    airFuelRatio,
    lambda,
    shiftLightStage,
    peakRpm: Math.max(peakRpm, pids.rpm),
    peakBoostPsi: Math.max(peakBoostPsi, Number(pids.boostPsi.toFixed(1))),
    volumetricEfficiency: ve,
  }
}

/**
 * Hook providing 60 FPS interpolated instrument gauge telemetry stream.
 */
export function useObdGaugeStream(): ObdGaugeStreamState {
  const [rawPids, setRawPids] = useState<ObdPidData>(obdStreamer.getPids())
  const [status, setStatus] = useState<ObdConnectionStatus>(obdStreamer.getStatus())
  const peaksRef = useRef<{ peakRpm: number; peakBoostPsi: number }>({
    peakRpm: rawPids.rpm,
    peakBoostPsi: rawPids.boostPsi,
  })

  const [metrics, setMetrics] = useState<ObdGaugeDerivedMetrics>(() =>
    calculateObdDerivedMetrics(rawPids, peaksRef.current.peakRpm, peaksRef.current.peakBoostPsi)
  )

  useEffect(() => {
    const unsub = obdStreamer.subscribe((newPids, newStatus) => {
      setRawPids(newPids)
      setStatus(newStatus)
      const calculated = calculateObdDerivedMetrics(
        newPids,
        peaksRef.current.peakRpm,
        peaksRef.current.peakBoostPsi
      )
      peaksRef.current.peakRpm = calculated.peakRpm
      peaksRef.current.peakBoostPsi = calculated.peakBoostPsi
      setMetrics(calculated)
    })
    return unsub
  }, [])

  const resetPeaks = () => {
    peaksRef.current = {
      peakRpm: rawPids.rpm,
      peakBoostPsi: rawPids.boostPsi,
    }
    setMetrics(calculateObdDerivedMetrics(rawPids, rawPids.rpm, rawPids.boostPsi))
  }

  return {
    rawPids,
    status,
    metrics,
    isLive: status === 'CONNECTED',
    resetPeaks,
  }
}
