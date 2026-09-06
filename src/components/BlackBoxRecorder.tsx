import { useEffect, useState } from 'react'
import { blackBoxRecorder } from '../services/blackBoxRecorder.ts'
import type { BlackBoxIncidentEvent, BlackBoxTelemetrySample } from '../types.ts'

export function BlackBoxRecorder() {
  const [currentSample, setCurrentSample] = useState<BlackBoxTelemetrySample | null>(null)
  const [incidents, setIncidents] = useState<BlackBoxIncidentEvent[]>([])
  const [selectedIncident, setSelectedIncident] = useState<BlackBoxIncidentEvent | null>(null)
  const [isRecording, setIsRecording] = useState(true)

  useEffect(() => {
    blackBoxRecorder.startRecording()
    const unsub = blackBoxRecorder.subscribe((sample, incidentLogs) => {
      setCurrentSample(sample)
      setIncidents([...incidentLogs])
    })
    return () => {
      unsub()
    }
  }, [])

  const handleTriggerCrash = (type: 'HARD_BRAKING' | 'HIGH_G_IMPACT' | 'ROLLOVER_THRESHOLD') => {
    const inc = blackBoxRecorder.triggerIncident(type, 2.4)
    setSelectedIncident(inc)
  }

  const handleDownloadIncident = (incident: BlackBoxIncidentEvent) => {
    const blob = new Blob([JSON.stringify(incident, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BLACKBOX_EVENT_${incident.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // G-Force Ball position calculation (-2.0G to +2.0G mapped to -45px to +45px)
  const ballX = currentSample ? Math.max(-45, Math.min(45, currentSample.gForceLateral * 30)) : 0
  const ballY = currentSample ? Math.max(-45, Math.min(45, -currentSample.gForceLongitudinal * 30)) : 0

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-400/30 text-red-400">
            📼
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                In-Flight Black Box Flight Recorder
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                ● CIRCULAR 30S BUFFER RECORDING
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tri-Axis Kinetic Accelerometer & Incident Trigger Capture
            </p>
          </div>
        </div>

        {/* Manual Incident Simulation Triggers */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 pr-1">SIMULATE TRIGGER:</span>
          <button
            onClick={() => handleTriggerCrash('HARD_BRAKING')}
            className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
          >
            🛑 HARD BRAKE (1.8G)
          </button>
          <button
            onClick={() => handleTriggerCrash('HIGH_G_IMPACT')}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/50 transition-all"
          >
            💥 IMPACT COLLISION (2.4G)
          </button>
        </div>
      </div>

      {/* Main G-Force & Kinetic Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 3D G-Force Vector Ball HUD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs text-cyan-400 uppercase">
            <span>Kinetic G-Vector Ball</span>
            <span>THRESHOLD 1.5G</span>
          </div>

          {/* Circular Crosshair G-Meter */}
          <div className="relative w-36 h-36 my-4 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-slate-800 scale-75" />
            <div className="absolute inset-0 rounded-full border border-red-500/30 scale-90" />
            <div className="absolute w-full h-0.5 bg-slate-800" />
            <div className="absolute h-full w-0.5 bg-slate-800" />

            {/* Dynamic Kinetic G-Ball */}
            <div
              className="absolute w-5 h-5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/80 border-2 border-white transition-all duration-100"
              style={{
                transform: `translate(${ballX}px, ${ballY}px)`,
              }}
            />
          </div>

          <div className="w-full flex justify-between text-xs text-slate-300">
            <span>LAT: {currentSample?.gForceLateral || 0}G</span>
            <span>LONG: {currentSample?.gForceLongitudinal || 0}G</span>
            <span>VERT: {currentSample?.gForceVertical || 1.0}G</span>
          </div>
        </div>

        {/* Telemetry Readouts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cyan-400 uppercase">
            <span>Flight Attitude & Speed</span>
            <span>LIVE SENSOR</span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Velocity</div>
              <div className="text-2xl font-black text-slate-100">{currentSample?.speedKmh || 0} km/h</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400">RPM</div>
              <div className="text-2xl font-black text-slate-100">{currentSample?.rpm || 0}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Pitch Angle</div>
              <div className="text-2xl font-black text-slate-100">{currentSample?.pitchDeg || 0}°</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400">Roll Angle</div>
              <div className="text-2xl font-black text-slate-100">{currentSample?.rollDeg || 0}°</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
            <span>Brake Pressure: {currentSample?.brakePressureKpa || 0} kPa</span>
            <span>Cabin Noise: {currentSample?.cabinAudioDecibels || 60} dB</span>
          </div>
        </div>

        {/* Incident Lock Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-cyan-400 uppercase">
            <span>Forensic Incident Vault</span>
            <span>{incidents.length} LOCKED</span>
          </div>

          <div className="my-2 space-y-2 max-h-40 overflow-y-auto pr-1">
            {incidents.length > 0 ? (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                    selectedIncident?.id === inc.id
                      ? 'bg-slate-950 border-red-500/80 shadow-md shadow-red-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-400">{inc.triggerType}</span>
                    <span className="text-[10px] text-slate-400">{inc.peakGForce}G</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{inc.id}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No collision or high-G incidents logged.
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            Buffer auto-locks upon G-force &gt; 1.5G or roll &gt; 35°
          </div>
        </div>
      </div>

      {/* Selected Incident Telemetry Playback */}
      {selectedIncident && (
        <div className="bg-slate-900/90 border border-red-500/40 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs text-red-400 font-bold uppercase">
                Forensic Incident Investigation // {selectedIncident.id}
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                {selectedIncident.triggerType} (Peak: {selectedIncident.peakGForce}G at {selectedIncident.speedAtTriggerKmh} km/h)
              </h3>
            </div>
            <button
              onClick={() => handleDownloadIncident(selectedIncident)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/40"
            >
              ⬇ EXPORT INCIDENT TELEMETRY (.JSON)
            </button>
          </div>

          {/* Telemetry Timeline Samples Table */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 uppercase font-bold">
              Pre / Post Trigger Telemetry Timeline (±15 Seconds)
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Time (ms)</th>
                    <th className="p-2.5">Speed</th>
                    <th className="p-2.5">Lat G</th>
                    <th className="p-2.5">Long G</th>
                    <th className="p-2.5">RPM</th>
                    <th className="p-2.5">Cabin dB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {selectedIncident.preBufferSamples.slice(-8).map((s, i) => (
                    <tr key={i} className="text-slate-300">
                      <td className="p-2 text-slate-500">{s.timestamp}</td>
                      <td className="p-2">{s.speedKmh} km/h</td>
                      <td className="p-2">{s.gForceLateral}G</td>
                      <td className="p-2">{s.gForceLongitudinal}G</td>
                      <td className="p-2">{s.rpm}</td>
                      <td className="p-2">{s.cabinAudioDecibels} dB</td>
                    </tr>
                  ))}
                  <tr className="bg-red-950/40 text-red-300 font-bold">
                    <td className="p-2 text-red-400">🚨 TRIGGER POINT</td>
                    <td className="p-2">{selectedIncident.speedAtTriggerKmh} km/h</td>
                    <td className="p-2" colSpan={4}>
                      PEAK KINETIC LOAD: {selectedIncident.peakGForce}G
                    </td>
                  </tr>
                  {selectedIncident.postBufferSamples.map((s, i) => (
                    <tr key={`post-${i}`} className="text-slate-400">
                      <td className="p-2 text-slate-600">{s.timestamp}</td>
                      <td className="p-2">{s.speedKmh} km/h</td>
                      <td className="p-2">{s.gForceLateral}G</td>
                      <td className="p-2">{s.gForceLongitudinal}G</td>
                      <td className="p-2">{s.rpm}</td>
                      <td className="p-2">{s.cabinAudioDecibels} dB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
