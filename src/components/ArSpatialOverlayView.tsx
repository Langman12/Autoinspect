import { useEffect, useRef, useState } from 'react'
import { hapticsService } from '../services/hapticsService.ts'
import type { ArCameraTrackingState, ArSpatialMarker } from '../types.ts'

const DEFAULT_SPATIAL_MARKERS: ArSpatialMarker[] = [
  {
    id: 'ar-01',
    component: 'Front Left Strut Tower',
    x: 0.32,
    y: 0.44,
    zDistanceMeters: 1.2,
    label: 'Hydraulic Seal Oil Film Detected',
    defectSeverity: 'RED',
    repairCostEstimate: '$480',
    sensorCorrelated: '20-60 Hz Acoustic Clunk + Accelerometer 1.4G Variance',
  },
  {
    id: 'ar-02',
    component: 'Front Brake Caliper / Rotor',
    x: 0.28,
    y: 0.65,
    zDistanceMeters: 1.5,
    label: 'Rotor Grooving (<9.2mm Discard)',
    defectSeverity: 'YELLOW',
    repairCostEstimate: '$310',
    sensorCorrelated: '3.4 kHz Friction Whine',
  },
  {
    id: 'ar-03',
    component: 'Cylinder 3 Ignition Coil',
    x: 0.52,
    y: 0.38,
    zDistanceMeters: 1.1,
    label: 'Combustion Misfire / Coil Breakdown',
    defectSeverity: 'RED',
    repairCostEstimate: '$180',
    sensorCorrelated: 'DTC P0300 + 40Hz Acoustic Shudder',
  },
  {
    id: 'ar-04',
    component: 'Front Fender / Hood Alignment',
    x: 0.68,
    y: 0.46,
    zDistanceMeters: 1.8,
    label: 'Panel Gap Variance (+2.8mm Delta)',
    defectSeverity: 'YELLOW',
    repairCostEstimate: '$220',
    sensorCorrelated: 'Optical Parallax Analysis',
  },
]

export function ArSpatialOverlayView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [markers, setMarkers] = useState<ArSpatialMarker[]>(DEFAULT_SPATIAL_MARKERS)
  const [selectedMarker, setSelectedMarker] = useState<ArSpatialMarker | null>(markers[0])
  const [cameraActive, setCameraActive] = useState(false)
  const [trackingState, setTrackingState] = useState<ArCameraTrackingState>({
    trackingMode: 'SPATIAL_GYRO',
    cameraActive: false,
    calibrated: true,
    yaw: 0,
    pitch: 0,
    roll: 0,
  })

  // Gyroscope tracking listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        setTrackingState((prev) => ({
          ...prev,
          yaw: e.alpha || 0,
          pitch: e.beta || 0,
          roll: e.gamma || 0,
          trackingMode: 'SPATIAL_GYRO',
        }))
      }
    }

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [])

  // Start Real Camera Stream
  const handleStartCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraActive(true)
        hapticsService.triggerButtonTap()
      }
    } catch (err) {
      console.warn('[AR Overlay] Camera permission denied or not available, using tactical optical HUD simulation:', err)
      setCameraActive(true)
    }
  }

  // Spatial Marker Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let tick = 0

    const render = () => {
      tick += 0.03
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width
      const h = canvas.height

      // Draw Laser Reticle Crosshairs
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w / 2 - 30, h / 2)
      ctx.lineTo(w / 2 + 30, h / 2)
      ctx.moveTo(w / 2, h / 2 - 30)
      ctx.lineTo(w / 2, h / 2 + 30)
      ctx.stroke()

      // Render Each Spatial Marker
      for (const marker of markers) {
        // Gyro parallax offset
        const gyroOffsetX = Math.sin((trackingState.yaw + tick * 10) * 0.02) * 40
        const gyroOffsetY = Math.sin((trackingState.pitch + tick * 10) * 0.02) * 30

        const px = marker.x * w + gyroOffsetX
        const py = marker.y * h + gyroOffsetY
        const isSelected = selectedMarker?.id === marker.id

        const pulse = (Math.sin(tick * 5) + 1) * 0.5
        const radius = isSelected ? 18 + pulse * 6 : 12 + pulse * 4
        const color =
          marker.defectSeverity === 'RED'
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(234, 179, 8, 0.95)'

        // Outer pulsing target ring
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.stroke()

        // Inner glowing core
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()

        // Connecting laser bracket
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + 40, py - 30)
        ctx.stroke()
        ctx.setLineDash([])

        // Callout Tag
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'
        ctx.fillRect(px + 40, py - 46, 160, 28)
        ctx.strokeStyle = color
        ctx.strokeRect(px + 40, py - 46, 160, 28)

        ctx.fillStyle = '#f8fafc'
        ctx.font = 'bold 11px JetBrains Mono'
        ctx.fillText(marker.component, px + 48, py - 32)
        ctx.fillStyle = '#38bdf8'
        ctx.font = '9px JetBrains Mono'
        ctx.fillText(`${marker.zDistanceMeters}m · ${marker.repairCostEstimate}`, px + 48, py - 20)
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [markers, selectedMarker, trackingState])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const w = rect.width
    const h = rect.height

    for (const marker of markers) {
      const px = marker.x * w
      const py = marker.y * h
      if (Math.hypot(clickX - px, clickY - py) < 35) {
        setSelectedMarker(marker)
        hapticsService.triggerDefectAlert()
        break
      }
    }
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Ribbon */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
            🕶️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                WebXR / AR Holographic Spatial Camera Overlay
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
                ● GYRO SPATIAL TRACKING ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-World Holographic Defect Pinning & Spatial Telemetry Anchor
            </p>
          </div>
        </div>

        {!cameraActive ? (
          <button
            onClick={handleStartCamera}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all"
          >
            📸 ENGAGE AR CAMERA STREAM
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            LIVE AR FEED (TAP PINS TO INSPECT)
          </div>
        )}
      </div>

      {/* Main AR Viewport (2 cols) + Detail Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AR Live Camera / Canvas Viewport */}
        <div className="lg:col-span-2 relative min-h-[480px] h-[540px] bg-slate-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/40">
          {/* Real Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />

          {/* Tactical Camera HUD Overlay Wireframe if no video */}
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 backdrop-blur-md">
                <span className="text-4xl">📷</span>
                <p className="text-xs text-slate-300 font-bold">
                  Camera feed standby. Click "Engage AR Camera Stream" to activate optical feed or explore spatial pins on simulated chassis.
                </p>
              </div>
            </div>
          )}

          {/* HUD Corner Tech Brackets */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />

          {/* Top HUD Telemetry Banner */}
          <div className="absolute top-4 left-12 right-12 flex justify-between pointer-events-none z-10 text-[10px] text-cyan-300">
            <span className="bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
              ANCHORS: {markers.length} DETECTED
            </span>
            <span className="bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
              YAW: {trackingState.yaw.toFixed(1)}° · PITCH: {trackingState.pitch.toFixed(1)}°
            </span>
          </div>

          {/* Interactive AR Canvas Overlay */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="absolute inset-0 w-full h-full cursor-crosshair z-20"
          />
        </div>

        {/* Selected AR Marker Inspector Sidebar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-cyan-400 uppercase font-bold">
                Spatial Target Inspection
              </span>
              {selectedMarker && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedMarker.defectSeverity === 'RED'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  }`}
                >
                  {selectedMarker.defectSeverity} DEFECT
                </span>
              )}
            </div>

            {selectedMarker ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{selectedMarker.component}</h3>
                  <div className="text-xs text-cyan-300 font-bold mt-0.5">{selectedMarker.label}</div>
                  <div className="text-[11px] text-slate-400 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    Spatial Distance: <span className="text-white font-bold">{selectedMarker.zDistanceMeters}m</span> from optical lens
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Sensor Correlation:</div>
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200">
                    🎙️ {selectedMarker.sensorCorrelated}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Est. Repair Cost:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {selectedMarker.repairCostEstimate}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Tap on any spatial holographic target ring in the camera view to lock target.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Target Index:</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {markers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMarker(m)
                    hapticsService.triggerButtonTap()
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex justify-between items-center transition-all ${
                    selectedMarker?.id === m.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{m.component}</span>
                  <span className="text-[10px] text-slate-500">{m.zDistanceMeters}m</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
