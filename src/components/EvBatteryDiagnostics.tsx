import { useState } from 'react'
import { evBatteryService } from '../services/evBatteryService.ts'
import type { EvBatteryTelemetry, EvCell } from '../types.ts'

export function EvBatteryDiagnostics() {
  const [telemetry, setTelemetry] = useState<EvBatteryTelemetry>(() => evBatteryService.generateTelemetry())
  const [selectedCell, setSelectedCell] = useState<EvCell | null>(
    telemetry.modules[3]?.cells[2] || telemetry.modules[0]?.cells[0] || null
  )

  const handleRefreshBms = () => {
    setTelemetry(evBatteryService.generateTelemetry())
  }

  // Helper for cell voltage color mapping
  const getCellColor = (cell: EvCell) => {
    if (cell.status === 'CELL_DELTA_WARN') {
      return 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/50 animate-pulse'
    }
    if (cell.status === 'CRITICAL_DEGRADED') {
      return 'bg-red-500 text-white shadow-md shadow-red-500/60'
    }
    const ratio = (cell.voltageMv - 3940) / 50
    if (ratio > 0.7) return 'bg-emerald-500/80 text-slate-950'
    if (ratio > 0.4) return 'bg-teal-500/80 text-slate-950'
    return 'bg-cyan-600/80 text-white'
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
            🔋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                EV High-Voltage Battery Diagnostics & SOH
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ● 400V ARCHITECTURE (96 CELLS)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              BMS Cell-by-Cell Millivolt Heatmap & High-Voltage Bus Insulation
            </p>
          </div>
        </div>

        <button
          onClick={handleRefreshBms}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/30 transition-all"
        >
          ⟳ QUERY BMS BUS
        </button>
      </div>

      {/* Main Pack Telemetry Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Pack Bus Voltage</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {telemetry.packVoltageV} V
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">SOC: {telemetry.stateOfChargePercent}% Charged</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Battery State of Health (SOH)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {telemetry.stateOfHealthPercent}%
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">
            {telemetry.totalKwhCapacityCurrent} / {telemetry.totalKwhCapacityNominal} kWh Cap
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Cell Delta Variance</div>
          <div
            className={`text-2xl font-black mt-1 ${
              telemetry.cellVoltageDeltaMv > 35 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {telemetry.cellVoltageDeltaMv} mV
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Max {telemetry.maxCellVoltageMv} / Min {telemetry.minCellVoltageMv} mV</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 uppercase">Bus Isolation Resistance</div>
          <div className="text-2xl font-black text-slate-100 mt-1">
            {telemetry.isolationResistanceMegaOhm} MΩ
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">PASSED (&gt;500 MΩ HIGH VOLTAGE SPEC)</div>
        </div>
      </div>

      {/* 96-Cell Pack Heatmap Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-100 uppercase">
              Lithium Cell Voltage Heatmap (16 Modules × 6 Cells)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click individual cell blocks to view internal resistance (mΩ) and thermal gradient
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Optimal (&gt;3.96V)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" /> Cell Delta Sag (&lt;3.94V)
            </span>
          </div>
        </div>

        {/* 16 Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {telemetry.modules.map((module) => (
            <div
              key={module.moduleId}
              className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>MOD {module.moduleId}</span>
                <span className="text-cyan-400">{module.temperatureC}°C</span>
              </div>

              {/* 6 Cells in Module */}
              <div className="grid grid-cols-3 gap-1">
                {module.cells.map((cell) => {
                  const isSelected = selectedCell?.cellId === cell.cellId
                  return (
                    <button
                      key={cell.cellId}
                      onClick={() => setSelectedCell(cell)}
                      className={`h-7 rounded-lg text-[9px] font-black flex items-center justify-center transition-all ${getCellColor(
                        cell
                      )} ${isSelected ? 'ring-2 ring-white scale-110 z-10' : 'hover:scale-105'}`}
                    >
                      C{cell.cellId}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Cell Detail Card */}
        {selectedCell && (
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-cyan-400 font-bold uppercase">
                  Cell #{selectedCell.cellId} Telemetry (Module #{selectedCell.moduleId})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedCell.status === 'CELL_DELTA_WARN'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {selectedCell.status}
                </span>
              </div>
              <div className="text-sm text-slate-300">
                Cell Voltage: <span className="text-white font-bold">{selectedCell.voltageMv} mV</span> ({(selectedCell.voltageMv / 1000).toFixed(3)} V) • Internal Resistance: <span className="text-cyan-300 font-bold">{selectedCell.internalResistanceMilliOhm} mΩ</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">Operating Temperature</div>
              <div className="text-lg font-black text-slate-100">{selectedCell.temperatureC}°C</div>
            </div>
          </div>
        )}
      </div>

      {/* SOH Degradation Curve Projection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="text-base font-black text-slate-100 uppercase">
          Pack Cycle Degradation & Range Forecast Trajectory
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {telemetry.degradationCurve.map((pt, idx) => (
            <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase">{pt.mileageKm.toLocaleString()} km</div>
              <div className="text-lg font-black text-emerald-400 mt-1">{pt.projectedSohPercent}%</div>
              <div className="text-[11px] text-cyan-300 mt-0.5">{pt.estimatedRangeKm} km Range</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
