import { useObdGaugeStream } from '../hooks/useObdGaugeStream.ts'

export function LiveGaugeCluster() {
  const { rawPids, status, metrics, resetPeaks } = useObdGaugeStream()

  // Angles for circular SVG gauges (-120deg to +120deg = 240deg total sweep)
  const rpmRatio = Math.min(1, Math.max(0, rawPids.rpm / 8000))
  const rpmAngle = -120 + rpmRatio * 240

  // Boost angle: -15 PSI (or vacuum) to +30 PSI => 45 PSI range
  const boostRatio = Math.min(1, Math.max(0, (rawPids.boostPsi + 15) / 45))
  const boostAngle = -120 + boostRatio * 240

  // AFR angle: 10.0 to 18.0 => 8.0 range
  const afrRatio = Math.min(1, Math.max(0, (metrics.airFuelRatio - 10) / 8))
  const afrAngle = -120 + afrRatio * 240

  const isRedline = metrics.shiftLightStage === 'REDLINE'

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Shift Light Strip */}
      <div className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
        <div className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider pl-1">
          F1 SHIFT LIGHTS
        </div>
        <div className="flex items-center gap-1.5 flex-1 max-w-md justify-end">
          {[...Array(12)].map((_, i) => {
            let active = false
            let color = 'bg-slate-800'
            const threshold = (i + 1) / 12

            if (rpmRatio >= threshold) {
              active = true
              if (i < 4) color = 'bg-emerald-500 shadow-emerald-500/50 shadow-md'
              else if (i < 8) color = 'bg-amber-500 shadow-amber-500/50 shadow-md'
              else color = 'bg-red-500 shadow-red-500/50 shadow-md'
            }

            return (
              <div
                key={i}
                className={`h-3 w-4 md:w-6 rounded-md transition-all duration-75 ${
                  active ? color : 'bg-slate-850'
                } ${isRedline ? 'animate-pulse' : ''}`}
              />
            )
          })}
        </div>
        <button
          onClick={resetPeaks}
          className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 uppercase font-bold"
        >
          Reset Peaks
        </button>
      </div>

      {/* Main Analog Cluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Gauge 1: Turbo Boost / Vacuum */}
        <div className="flex flex-col items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-mono font-black uppercase text-cyan-400 mb-1">
            MANIFOLD PRESSURE / BOOST
          </div>
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Background Arc */}
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="314 157"
                strokeDashoffset="78.5"
                strokeLinecap="round"
              />
              {/* Active Value Arc */}
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke={rawPids.boostPsi > 15 ? '#ef4444' : rawPids.boostPsi > 0 ? '#06b6d4' : '#64748b'}
                strokeWidth="12"
                strokeDasharray={`${Math.max(1, boostRatio * 314)} 471`}
                strokeDashoffset="78.5"
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
            </svg>
            {/* Needle */}
            <div
              className="absolute w-1 h-20 bg-gradient-to-t from-transparent to-cyan-400 origin-bottom transition-transform duration-100 ease-out shadow-lg"
              style={{
                bottom: '50%',
                transform: `rotate(${boostAngle}deg)`,
              }}
            />
            {/* Center Hub & Digital Readout */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-white">
                {rawPids.boostPsi > 0 ? `+${rawPids.boostPsi.toFixed(1)}` : rawPids.boostPsi.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">PSI (BOOST)</span>
              <span className="text-[9px] font-mono text-cyan-500 mt-0.5">
                PEAK: {metrics.peakBoostPsi} PSI
              </span>
            </div>
          </div>
        </div>

        {/* Gauge 2: Centerpiece Tachometer (RPM & Gear) */}
        <div className="flex flex-col items-center bg-slate-950 p-5 rounded-3xl border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/40 relative">
          <div className="text-xs font-mono font-black uppercase text-cyan-300 tracking-wider mb-1">
            DIGITAL TACHOMETER & SPEED
          </div>
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Background Arc */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="#0f172a"
                strokeWidth="16"
                strokeDasharray="356 178"
                strokeDashoffset="89"
                strokeLinecap="round"
              />
              {/* RPM Arc with gradient color */}
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke={isRedline ? '#ef4444' : rpmRatio > 0.7 ? '#f59e0b' : '#38bdf8'}
                strokeWidth="16"
                strokeDasharray={`${Math.max(1, rpmRatio * 356)} 534`}
                strokeDashoffset="89"
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
            </svg>
            {/* Needle */}
            <div
              className={`absolute w-1.5 h-24 origin-bottom transition-transform duration-100 ease-out ${
                isRedline
                  ? 'bg-gradient-to-t from-transparent to-red-500 shadow-red-500/80 shadow-lg'
                  : 'bg-gradient-to-t from-transparent to-cyan-400 shadow-cyan-400/80 shadow-md'
              }`}
              style={{
                bottom: '50%',
                transform: `rotate(${rpmAngle}deg)`,
              }}
            />
            {/* Center Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span
                className={`text-4xl font-black font-mono tracking-tighter ${
                  isRedline ? 'text-red-400 animate-bounce' : 'text-white'
                }`}
              >
                {rawPids.rpm}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-black">RPM x 1000</span>
              <div className="mt-1 flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                <span>{rawPids.speedKmh} KM/H</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">{rawPids.throttlePercent}% TPS</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                PEAK: {metrics.peakRpm} RPM
              </span>
            </div>
          </div>
        </div>

        {/* Gauge 3: Wideband AFR & Lambda */}
        <div className="flex flex-col items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-mono font-black uppercase text-amber-400 mb-1">
            WIDEBAND AIR / FUEL RATIO
          </div>
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Background Arc */}
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="314 157"
                strokeDashoffset="78.5"
                strokeLinecap="round"
              />
              {/* Active Value Arc */}
              <circle
                cx="100"
                cy="100"
                r="75"
                fill="none"
                stroke={
                  metrics.airFuelRatio > 15.2
                    ? '#ef4444'
                    : metrics.airFuelRatio < 13.5
                    ? '#06b6d4'
                    : '#10b981'
                }
                strokeWidth="12"
                strokeDasharray={`${Math.max(1, afrRatio * 314)} 471`}
                strokeDashoffset="78.5"
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
            </svg>
            {/* Needle */}
            <div
              className="absolute w-1 h-20 bg-gradient-to-t from-transparent to-amber-400 origin-bottom transition-transform duration-100 ease-out shadow-lg"
              style={{
                bottom: '50%',
                transform: `rotate(${afrAngle}deg)`,
              }}
            />
            {/* Center Hub */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-white">
                {metrics.airFuelRatio.toFixed(1)}:1
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">AFR (LAMBDA {metrics.lambda})</span>
              <span
                className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full mt-1 ${
                  metrics.airFuelRatio > 15.0
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : metrics.airFuelRatio < 13.5
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {metrics.airFuelRatio > 15.0 ? 'LEAN' : metrics.airFuelRatio < 13.5 ? 'RICH' : 'STOICH (14.7)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Calculated Dyno Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Est. Horsepower</div>
          <div className="text-xl font-black font-mono text-cyan-400 mt-0.5">{metrics.estimatedBhp} BHP</div>
        </div>
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Engine Torque</div>
          <div className="text-xl font-black font-mono text-amber-400 mt-0.5">{metrics.estimatedTorqueNm} Nm</div>
        </div>
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Volumetric Eff.</div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
            {metrics.volumetricEfficiency}%
          </div>
        </div>
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Timing Advance</div>
          <div className="text-xl font-black font-mono text-purple-400 mt-0.5">
            {rawPids.timingAdvanceDeg}° BTDC
          </div>
        </div>
      </div>
    </div>
  )
}
