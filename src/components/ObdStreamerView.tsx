import { useEffect, useState } from 'react'
import { obdStreamer } from '../services/obdStreamer.ts'
import type { DtcFaultCode, ObdConnectionStatus, ObdPidData } from '../types.ts'

export function ObdStreamerView() {
  const [pids, setPids] = useState<ObdPidData>(obdStreamer.getPids())
  const [status, setStatus] = useState<ObdConnectionStatus>(obdStreamer.getStatus())
  const [dtcs, setDtcs] = useState<DtcFaultCode[]>(obdStreamer.getActiveDtcs())
  const [selectedDtc, setSelectedDtc] = useState<DtcFaultCode | null>(dtcs[0] || null)
  const [unit, setUnit] = useState<'METRIC' | 'IMPERIAL'>('METRIC')
  const [historyRpm, setHistoryRpm] = useState<number[]>([])

  useEffect(() => {
    const unsub = obdStreamer.subscribe((newPids, newStatus) => {
      setPids(newPids)
      setStatus(newStatus)
      setDtcs(obdStreamer.getActiveDtcs())
      setHistoryRpm((prev) => [...prev.slice(-30), newPids.rpm])
    })
    return unsub
  }, [])

  const handleConnect = (mode: 'SIMULATION' | 'BLUETOOTH' | 'SERIAL') => {
    obdStreamer.connect(mode)
  }

  const handleDisconnect = () => {
    obdStreamer.disconnect()
  }

  const handleThrottleSpike = () => {
    obdStreamer.triggerThrottleSpike()
  }

  const handleClearCodes = () => {
    obdStreamer.clearCodes()
    setDtcs([])
    setSelectedDtc(null)
  }

  // Unit conversion helpers
  const displaySpeed = unit === 'METRIC' ? pids.speedKmh : Math.round(pids.speedKmh * 0.621371)
  const speedUnit = unit === 'METRIC' ? 'KM/H' : 'MPH'
  const displayTemp = unit === 'METRIC' ? pids.coolantTempC : Math.round(pids.coolantTempC * 1.8 + 32)
  const tempUnit = unit === 'METRIC' ? '°C' : '°F'

  // Shift light calculation
  const rpmPercent = Math.min(100, (pids.rpm / 7500) * 100)
  const isRedline = pids.rpm > 6200

  return (
    <div className="space-y-6">
      {/* Top Header & Connection Bar */}
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
            🔌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                OBD-II & CAN-Bus Telemetry Stream
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  status === 'CONNECTED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                    : status === 'CONNECTING'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                ● {status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ISO 15765-4 CAN (11-bit ID, 500 kbaud) High-Speed Stream
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnit(unit === 'METRIC' ? 'IMPERIAL' : 'METRIC')}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
          >
            {unit}
          </button>

          {status === 'CONNECTED' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleThrottleSpike}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-mono font-bold text-xs shadow-lg shadow-red-950/40"
              >
                ⚡ REV THROTTLE
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConnect('SIMULATION')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-emerald-500/30"
              >
                ▶ START CAN STREAM
              </button>
              <button
                onClick={() => handleConnect('BLUETOOTH')}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-mono text-xs border border-blue-500/40"
              >
                BLUETOOTH
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Gauges Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RPM Gauge with Dynamic Shift Light */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Engine Tachometer
            </span>
            <span className="text-xs font-mono text-slate-400">PID: 0x0C</span>
          </div>

          {/* Shift Light Bar */}
          <div className="my-4 flex items-center gap-1">
            {[...Array(16)].map((_, i) => {
              const active = i < Math.floor((rpmPercent / 100) * 16)
              const isRed = i >= 13
              const isYellow = i >= 9 && i < 13
              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-sm transition-all duration-75 ${
                    active
                      ? isRed
                        ? 'bg-red-500 shadow-md shadow-red-500/80 animate-pulse'
                        : isYellow
                        ? 'bg-yellow-400 shadow-md shadow-yellow-400/50'
                        : 'bg-emerald-400'
                      : 'bg-slate-800/80'
                  }`}
                />
              )
            })}
          </div>

          <div className="text-center my-2">
            <div
              className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                isRedline ? 'text-red-400 animate-pulse' : 'text-slate-100'
              }`}
            >
              {pids.rpm}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">RPM (REDLINE 6,500)</div>
          </div>

          {/* Mini RPM sparkline history */}
          <div className="h-10 flex items-end gap-1 mt-3 pt-2 border-t border-slate-800">
            {historyRpm.map((r, i) => (
              <div
                key={i}
                style={{ height: `${Math.min(100, (r / 7000) * 100)}%` }}
                className="flex-1 bg-cyan-500/50 rounded-t-sm"
              />
            ))}
          </div>
        </div>

        {/* Speedometer & Load */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Vehicle Speed & Load
            </span>
            <span className="text-xs font-mono text-slate-400">PID: 0x0D / 0x04</span>
          </div>

          <div className="text-center my-4">
            <div className="text-6xl font-black font-mono text-cyan-400 tracking-tight">
              {displaySpeed}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">{speedUnit}</div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Engine Load:</span>
              <span className="text-slate-200 font-bold">{pids.engineLoadPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                style={{ width: `${pids.engineLoadPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Boost, Thermals & Battery */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Engine Health Diagnostics
            </span>
            <span className="text-xs font-mono text-slate-400">MULTI-PID</span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-2 font-mono">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Coolant Temp</div>
              <div className="text-xl font-black text-slate-100 mt-0.5">
                {displayTemp} {tempUnit}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">NORMAL (85-98°C)</div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Battery / Alt</div>
              <div className="text-xl font-black text-slate-100 mt-0.5">
                {pids.batteryVoltage} V
              </div>
              <div className="text-[10px] text-cyan-400 mt-0.5">CHARGING SYSTEM OK</div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Manifold (MAP)</div>
              <div className="text-xl font-black text-slate-100 mt-0.5">
                {pids.boostPsi} PSI
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{pids.mapKpa} kPa</div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Oil Pressure</div>
              <div className="text-xl font-black text-slate-100 mt-0.5">
                {pids.oilPressureKpa} kPa
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">HYDRAULIC PASS</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span>MAF: {pids.mafGramsPerSec} g/s</span>
            <span>Timing: {pids.timingAdvanceDeg}° BTDC</span>
          </div>
        </div>
      </div>

      {/* Fuel Trim Diagnostics & Oxygen Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Short Term & Long Term Fuel Trims */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase font-mono">
                Fuel Trim Spectrum (STFT / LTFT)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Stoichiometric Lambda Deviation (±10% Target Window)
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">PID: 0x06 / 0x07</span>
          </div>

          {/* STFT Bar */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Short-Term Fuel Trim (STFT):</span>
              <span
                className={`font-bold ${
                  Math.abs(pids.stftPercent) > 15 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {pids.stftPercent > 0 ? `+${pids.stftPercent}` : pids.stftPercent}%
              </span>
            </div>
            <div className="relative h-4 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center">
              <div className="absolute left-1/2 w-0.5 h-full bg-slate-700 z-10" />
              <div
                className={`h-full transition-all duration-150 ${
                  pids.stftPercent >= 0 ? 'bg-cyan-500' : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min(50, Math.abs(pids.stftPercent))}%`,
                  marginLeft: pids.stftPercent >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(pids.stftPercent))}%`,
                }}
              />
            </div>
          </div>

          {/* LTFT Bar */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Long-Term Fuel Trim (LTFT):</span>
              <span
                className={`font-bold ${
                  Math.abs(pids.ltftPercent) > 15 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {pids.ltftPercent > 0 ? `+${pids.ltftPercent}` : pids.ltftPercent}%
              </span>
            </div>
            <div className="relative h-4 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center">
              <div className="absolute left-1/2 w-0.5 h-full bg-slate-700 z-10" />
              <div
                className={`h-full transition-all duration-150 ${
                  pids.ltftPercent >= 0 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{
                  width: `${Math.min(50, Math.abs(pids.ltftPercent))}%`,
                  marginLeft: pids.ltftPercent >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(pids.ltftPercent))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Oxygen Sensor Switching Voltages */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase font-mono">
                O2 Lambda Switching Oscilloscope
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Upstream (Wideband/Oscillating) vs Downstream (Catalytic)
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">PID: 0x14 / 0x15</span>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Upstream O2 (Bank 1 Sensor 1)</div>
              <div className="text-3xl font-black text-cyan-400 my-1">
                {pids.o2Voltage1} V
              </div>
              <div className="text-[10px] text-emerald-400">SWITCHING FAST (0.1V - 0.9V)</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] text-slate-400">Downstream O2 (Post-Cat)</div>
              <div className="text-3xl font-black text-purple-400 my-1">
                {pids.o2Voltage2} V
              </div>
              <div className="text-[10px] text-purple-300">CATALYTIC BUFFER STEADY</div>
            </div>
          </div>
        </div>
      </div>

      {/* DTC Diagnostic Trouble Code & Freeze Frame Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-100 uppercase font-mono">
                Active Diagnostic Trouble Codes (DTCs)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                {dtcs.length} FAULT(S) LOGGED
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ECU Freeze Frame Snapshot & Root-Cause Forensic Correlation
            </p>
          </div>

          {dtcs.length > 0 && (
            <button
              onClick={handleClearCodes}
              className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-mono font-bold transition-all"
            >
              CLEAR DTC MEMORY (RESET MIL)
            </button>
          )}
        </div>

        {dtcs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DTC List */}
            <div className="space-y-3">
              {dtcs.map((dtc) => (
                <div
                  key={dtc.code}
                  onClick={() => setSelectedDtc(dtc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedDtc?.code === dtc.code
                      ? 'bg-slate-950 border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-black font-mono text-red-400">
                      {dtc.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                      {dtc.system}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-200">{dtc.description}</div>
                </div>
              ))}
            </div>

            {/* Selected DTC Freeze Frame & AI Diagnosis */}
            {selectedDtc && (
              <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-cyan-400 font-bold uppercase">
                      DTC Investigation // {selectedDtc.code}
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-0.5">
                      {selectedDtc.description}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    SEVERITY: {selectedDtc.severity}
                  </span>
                </div>

                {/* Freeze Frame snapshot */}
                {selectedDtc.freezeFrame && (
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[11px] text-cyan-400 font-bold uppercase">
                      Freeze Frame Captured Data (At Trigger Time)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-950 p-2 rounded-lg">
                        <span className="text-slate-400">RPM:</span>{' '}
                        <span className="font-bold text-slate-200">
                          {selectedDtc.freezeFrame.rpm}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg">
                        <span className="text-slate-400">Speed:</span>{' '}
                        <span className="font-bold text-slate-200">
                          {selectedDtc.freezeFrame.speedKmh} km/h
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg">
                        <span className="text-slate-400">Coolant:</span>{' '}
                        <span className="font-bold text-slate-200">
                          {selectedDtc.freezeFrame.coolantTempC}°C
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg">
                        <span className="text-slate-400">Engine Load:</span>{' '}
                        <span className="font-bold text-slate-200">
                          {selectedDtc.freezeFrame.engineLoadPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Possible Causes & Action */}
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    Probable Failure Causes:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                    {selectedDtc.possibleCauses.map((cause, idx) => (
                      <li key={idx}>{cause}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-800/40 p-3.5 rounded-xl text-xs text-emerald-200">
                  <span className="font-bold text-emerald-400">Recommended Action: </span>
                  {selectedDtc.recommendedAction}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-950/60 rounded-2xl border border-slate-800/80 font-mono text-xs text-slate-400">
            ✓ No active Diagnostic Trouble Codes detected in ECU memory. Powertrain CAN-bus clean.
          </div>
        )}
      </div>
    </div>
  )
}
