import { useState } from 'react'
import type {
  ThermalPalette,
  ThermalSpotMeasurement,
  TireTreadMeasurement,
} from '../types.ts'

const DEFAULT_TIRE_PROFILES: TireTreadMeasurement[] = [
  {
    position: 'FRONT_LEFT',
    innerGroove32nds: 4.2,
    centerGroove32nds: 6.8,
    outerGroove32nds: 7.1,
    wearPattern: 'CAMBER_WEAR',
    recommendedAction: 'Excessive inner shoulder wear (-2.6 32nds delta). Inspect negative camber alignment and ball joint.',
    estimatedMilesRemaining: 8500,
  },
  {
    position: 'FRONT_RIGHT',
    innerGroove32nds: 6.9,
    centerGroove32nds: 7.0,
    outerGroove32nds: 6.8,
    wearPattern: 'UNIFORM',
    recommendedAction: 'Uniform wear across all 3 primary tread channels. Tire in healthy operating window.',
    estimatedMilesRemaining: 24000,
  },
  {
    position: 'REAR_LEFT',
    innerGroove32nds: 3.1,
    centerGroove32nds: 2.8,
    outerGroove32nds: 3.0,
    wearPattern: 'CRITICAL_BALD',
    recommendedAction: 'CRITICAL: Tread depth below legal 4/32" wet hydroplane threshold. Immediate replacement required.',
    estimatedMilesRemaining: 1200,
  },
  {
    position: 'REAR_RIGHT',
    innerGroove32nds: 5.2,
    centerGroove32nds: 7.4,
    outerGroove32nds: 5.1,
    wearPattern: 'UNDER_INFLATION',
    recommendedAction: 'Shoulder wear exceeds center channel by 2.2 32nds. Increase tire cold pressure to 35 PSI spec.',
    estimatedMilesRemaining: 14000,
  },
]

const THERMAL_SPOTS: ThermalSpotMeasurement[] = [
  { label: 'Front Left Brake Caliper', temperatureC: 168, thresholdMaxC: 180, status: 'ELEVATED' },
  { label: 'Catalytic Converter Inlet', temperatureC: 540, thresholdMaxC: 650, status: 'NORMAL' },
  { label: 'Alternator Diode Bridge', temperatureC: 84, thresholdMaxC: 95, status: 'NORMAL' },
  { label: 'AC Compressor Clutch', temperatureC: 112, thresholdMaxC: 105, status: 'CRITICAL_OVERHEAT' },
]

export function TreadLaserProfiler() {
  const [tires, setTires] = useState<TireTreadMeasurement[]>(DEFAULT_TIRE_PROFILES)
  const [selectedPosition, setSelectedPosition] = useState<TireTreadMeasurement['position']>('FRONT_LEFT')
  const [activePalette, setActivePalette] = useState<ThermalPalette>('IRONBOW')

  const currentTire = tires.find((t) => t.position === selectedPosition) || tires[0]

  return (
    <div className="space-y-6 font-mono">
      {/* Top Ribbon */}
      <div className="bg-slate-900/80 border border-teal-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-400/30 text-teal-400">
            🛞
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
              Tire Tread Laser Profiler & Thermal Inspection
            </h2>
            <p className="text-xs text-slate-400">
              Macro Shadow Edge Profiling & Infrared Thermal Gradients
            </p>
          </div>
        </div>

        {/* 4 Wheel Position Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {(['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'] as TireTreadMeasurement['position'][]).map(
            (pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedPosition === pos
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pos.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Laser Tread Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tread Cross-Section Visualizer (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-teal-400 uppercase font-bold">
                Laser Contour Profile // {currentTire.position.replace('_', ' ')}
              </span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                Wear Pattern: {currentTire.wearPattern.replace('_', ' ')}
              </h3>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black ${
                currentTire.wearPattern === 'CRITICAL_BALD'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : currentTire.wearPattern === 'UNIFORM'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
              }`}
            >
              {currentTire.wearPattern === 'CRITICAL_BALD' ? 'REPLACE IMMEDIATELY' : 'INSPECTION COMPLETE'}
            </span>
          </div>

          {/* 3 Groove Depth Bars Visualizer */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="text-xs text-slate-400 uppercase font-bold text-center">
              Tread Channel Depth Profile (32nds of an inch & mm)
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Inner Groove */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase">Inner Shoulder</div>
                <div className="h-32 bg-slate-900 rounded-2xl p-2 border border-slate-800 flex flex-col justify-end">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      currentTire.innerGroove32nds < 4 ? 'bg-red-500' : 'bg-teal-400'
                    }`}
                    style={{ height: `${Math.min(100, (currentTire.innerGroove32nds / 10) * 100)}%` }}
                  />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {currentTire.innerGroove32nds} / 32"
                </div>
                <div className="text-[11px] text-slate-400">
                  {(currentTire.innerGroove32nds * 0.794).toFixed(1)} mm
                </div>
              </div>

              {/* Center Groove */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase">Center Channel</div>
                <div className="h-32 bg-slate-900 rounded-2xl p-2 border border-slate-800 flex flex-col justify-end">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      currentTire.centerGroove32nds < 4 ? 'bg-red-500' : 'bg-teal-400'
                    }`}
                    style={{ height: `${Math.min(100, (currentTire.centerGroove32nds / 10) * 100)}%` }}
                  />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {currentTire.centerGroove32nds} / 32"
                </div>
                <div className="text-[11px] text-slate-400">
                  {(currentTire.centerGroove32nds * 0.794).toFixed(1)} mm
                </div>
              </div>

              {/* Outer Groove */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase">Outer Shoulder</div>
                <div className="h-32 bg-slate-900 rounded-2xl p-2 border border-slate-800 flex flex-col justify-end">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      currentTire.outerGroove32nds < 4 ? 'bg-red-500' : 'bg-teal-400'
                    }`}
                    style={{ height: `${Math.min(100, (currentTire.outerGroove32nds / 10) * 100)}%` }}
                  />
                </div>
                <div className="text-lg font-black text-slate-100">
                  {currentTire.outerGroove32nds} / 32"
                </div>
                <div className="text-[11px] text-slate-400">
                  {(currentTire.outerGroove32nds * 0.794).toFixed(1)} mm
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-800/40 text-xs text-teal-200">
            <span className="font-bold text-teal-400">Alignment & Wear Diagnosis: </span>
            {currentTire.recommendedAction}
          </div>
        </div>

        {/* Thermal Infrared Camera Simulation (1 col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-teal-400 uppercase font-bold">
              Infrared Thermal Inspection
            </span>
            <span className="text-xs text-slate-400">FLIR EMULATION</span>
          </div>

          {/* Palette Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['IRONBOW', 'RAINBOW', 'TURBO', 'WHITE_HOT'] as ThermalPalette[]).map((pal) => (
              <button
                key={pal}
                onClick={() => setActivePalette(pal)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activePalette === pal ? 'bg-purple-600 text-white' : 'text-slate-400'
                }`}
              >
                {pal}
              </button>
            ))}
          </div>

          {/* Thermal Spot Temperatures */}
          <div className="space-y-3 pt-2">
            <div className="text-xs text-slate-400 uppercase font-bold">
              Calibrated Thermal Spot Crosshairs:
            </div>
            {THERMAL_SPOTS.map((spot, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{spot.label}</div>
                  <div className="text-[10px] text-slate-500">
                    Max Spec Threshold: {spot.thresholdMaxC}°C
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-base font-black ${
                      spot.status === 'CRITICAL_OVERHEAT'
                        ? 'text-red-400'
                        : spot.status === 'ELEVATED'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {spot.temperatureC}°C
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">{spot.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
