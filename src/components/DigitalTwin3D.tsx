import { useEffect, useRef, useState } from 'react'
import type {
  DefectMarker3D,
  StatusLight,
  VehicleBodyStyle,
  VehicleSubsystem,
} from '../types.ts'

const DEFAULT_3D_DEFECTS: DefectMarker3D[] = [
  {
    id: 'def-01-front-strut',
    component: 'Front Left Strut Assembly',
    subsystem: 'SUSPENSION_BRAKES',
    position: { x: -1.2, y: -0.2, z: 1.4 },
    severity: 'RED',
    label: 'Fluid Leakage & Blown Seal',
    description: 'Hydraulic damping oil film on damper body. Loss of rebound damping detected in dynamic pitch analysis.',
    estimatedCost: '$480 - $650',
    acousticMatch: '20-60 Hz low-frequency clunk over road undulations',
    dtcMatch: 'Chassis accelerometer variance > 1.2G',
  },
  {
    id: 'def-02-cyl3-misfire',
    component: 'Cylinder 3 Ignition Coil Pack',
    subsystem: 'POWERTRAIN',
    position: { x: -0.3, y: 0.5, z: 1.6 },
    severity: 'RED',
    label: 'Combustion Misfire / Coil Breakdown',
    description: 'Intermittent secondary ignition voltage drop causing incomplete burn on Bank 1.',
    estimatedCost: '$160 - $280',
    acousticMatch: '40-120 Hz Sub-harmonic combustion shudder',
    dtcMatch: 'P0300 / P0303 Active DTC',
  },
  {
    id: 'def-03-rear-rotor',
    component: 'Rear Right Brake Rotor',
    subsystem: 'SUSPENSION_BRAKES',
    position: { x: 1.2, y: -0.2, z: -1.5 },
    severity: 'YELLOW',
    label: 'Deep Circular Scoring (<9.2mm min thickness)',
    description: 'Pad wear sensor grounded. Disc surface displays concentric heat-check grooves requiring immediate machining or replacement.',
    estimatedCost: '$310 - $440',
    acousticMatch: '3.2-6.5 kHz High-frequency metallic friction whine',
  },
  {
    id: 'def-04-cat-restriction',
    component: 'Downstream Catalytic Converter',
    subsystem: 'EXHAUST',
    position: { x: 0.1, y: -0.6, z: -0.4 },
    severity: 'YELLOW',
    label: 'Thermal Efficiency Warning',
    description: 'Inlet/Outlet temperature delta below 30°C. Substrate displaying early signs of sintering/restriction.',
    estimatedCost: '$850 - $1,200',
    dtcMatch: 'P0420 Catalyst Efficiency Pending',
  },
  {
    id: 'def-05-panel-gap',
    component: 'Front Right Fender / Hood Gap',
    subsystem: 'CHASSIS_BODY',
    position: { x: 1.1, y: 0.4, z: 1.7 },
    severity: 'YELLOW',
    label: 'Panel Gap Variance (+2.8mm delta)',
    description: 'Uneven hood gap and core support clip deformation indicates prior unrecorded front-right impact.',
    estimatedCost: '$220 - $350',
  },
  {
    id: 'def-06-ev-battery',
    component: 'HV Battery Module 4 (Cell Delta)',
    subsystem: 'EV_BATTERY',
    position: { x: 0.0, y: -0.5, z: 0.0 },
    severity: 'YELLOW',
    label: 'Cell Voltage Variance (48mV delta)',
    description: 'Module 4 internal resistance elevated by 14% relative to pack average during 100kW DC fast charge simulation.',
    estimatedCost: '$1,400 - $2,200',
    dtcMatch: 'BMS-P0A7F Pack Degradation Alert',
  },
]

export function DigitalTwin3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [bodyStyle, setBodyStyle] = useState<VehicleBodyStyle>('SEDAN')
  const [subsystem, setSubsystem] = useState<VehicleSubsystem>('ALL')
  const [renderMode, setRenderMode] = useState<'HOLOGRAPHIC' | 'WIREFRAME' | 'SOLID'>('HOLOGRAPHIC')
  const [selectedMarker, setSelectedMarker] = useState<DefectMarker3D | null>(DEFAULT_3D_DEFECTS[0])
  const [autoRotate, setAutoRotate] = useState(true)
  const [xRayTransparency, setXRayTransparency] = useState(65)

  // 3D Camera & Rotation state
  const cameraRef = useRef({
    rotX: 0.35,
    rotY: 0.75,
    zoom: 1.0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
  })

  // 3D Screen Projection Cache
  const projectedMarkersRef = useRef<Array<{ marker: DefectMarker3D; sx: number; sy: number; depth: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let tick = 0

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio
        canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Animation Render Loop
    const render = () => {
      tick += 0.02
      if (autoRotate && !cameraRef.current.isDragging) {
        cameraRef.current.rotY += 0.006
      }

      ctx.save()
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      const width = canvas.width / window.devicePixelRatio
      const height = canvas.height / window.devicePixelRatio

      // Clear with dark tactical grid gradient
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, width, height)

      // Perspective 3D Grid Floor
      const cx = width / 2
      const cy = height / 2 + 30
      const rotY = cameraRef.current.rotY
      const rotX = cameraRef.current.rotX
      const scale = 140 * cameraRef.current.zoom

      // 3D Projection Math helper
      const project3D = (x: number, y: number, z: number) => {
        // Rotate around Y
        const cosY = Math.cos(rotY)
        const sinY = Math.sin(rotY)
        const x1 = x * cosY - z * sinY
        const z1 = x * sinY + z * cosY

        // Rotate around X
        const cosX = Math.cos(rotX)
        const sinX = Math.sin(rotX)
        const y2 = y * cosX - z1 * sinX
        const z2 = y * sinX + z1 * cosX

        // Perspective divide
        const distance = 4.5
        const fov = distance / (distance + z2)
        const sx = cx + x1 * scale * fov
        const sy = cy - y2 * scale * fov
        return { sx, sy, depth: z2, fov }
      }

      // Draw Holographic Radar Rings on Floor
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'
      ctx.lineWidth = 1
      for (let r = 1.0; r <= 3.0; r += 0.8) {
        ctx.beginPath()
        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
          const pt = project3D(Math.cos(a) * r * 1.5, -0.9, Math.sin(a) * r * 1.5)
          if (a === 0) ctx.moveTo(pt.sx, pt.sy)
          else ctx.lineTo(pt.sx, pt.sy)
        }
        ctx.stroke()
      }

      // 3D Vehicle Mesh Wireframe Generator
      const getVehicleVertices = (style: VehicleBodyStyle) => {
        const length = style === 'TRUCK' ? 2.6 : style === 'SUV' ? 2.3 : style === 'COUPE' ? 2.0 : 2.2
        const width = style === 'TRUCK' || style === 'SUV' ? 1.3 : 1.15
        const height = style === 'SUV' ? 1.1 : style === 'COUPE' ? 0.75 : 0.9

        // Chassis outline vertices
        const lines: Array<[[number, number, number], [number, number, number], string]> = []

        const colorBody =
          renderMode === 'HOLOGRAPHIC'
            ? `rgba(6, 182, 212, ${xRayTransparency / 100})`
            : renderMode === 'WIREFRAME'
            ? '#38bdf8'
            : '#0284c7'

        const colorPowertrain = 'rgba(239, 68, 68, 0.85)'
        const colorSuspension = 'rgba(234, 179, 8, 0.85)'
        const colorBattery = 'rgba(16, 185, 129, 0.85)'
        const colorExhaust = 'rgba(168, 85, 247, 0.85)'

        // --- 1. CHASSIS / BODY MESH ---
        if (subsystem === 'ALL' || subsystem === 'CHASSIS_BODY') {
          // Bottom perimeter
          lines.push([[-width, -0.6, length], [width, -0.6, length], colorBody])
          lines.push([[width, -0.6, length], [width, -0.6, -length], colorBody])
          lines.push([[width, -0.6, -length], [-width, -0.6, -length], colorBody])
          lines.push([[-width, -0.6, -length], [-width, -0.6, length], colorBody])

          // Waistline
          lines.push([[-width, 0.0, length * 0.9], [width, 0.0, length * 0.9], colorBody])
          lines.push([[width, 0.0, length * 0.9], [width * 1.05, 0.0, -length * 0.9], colorBody])
          lines.push([[width * 1.05, 0.0, -length * 0.9], [-width * 1.05, 0.0, -length * 0.9], colorBody])
          lines.push([[-width * 1.05, 0.0, -length * 0.9], [-width, 0.0, length * 0.9], colorBody])

          // Roofline
          const roofFrontZ = style === 'TRUCK' ? 0.2 : 0.5
          const roofBackZ = style === 'TRUCK' ? -length * 0.3 : -length * 0.6
          const roofW = width * 0.75
          lines.push([[-roofW, height, roofFrontZ], [roofW, height, roofFrontZ], colorBody])
          lines.push([[roofW, height, roofFrontZ], [roofW, height, roofBackZ], colorBody])
          lines.push([[roofW, height, roofBackZ], [-roofW, height, roofBackZ], colorBody])
          lines.push([[-roofW, height, roofBackZ], [-roofW, height, roofFrontZ], colorBody])

          // A-Pillars & C-Pillars
          lines.push([[-roofW, height, roofFrontZ], [-width, 0.0, length * 0.5], colorBody])
          lines.push([[roofW, height, roofFrontZ], [width, 0.0, length * 0.5], colorBody])
          lines.push([[-roofW, height, roofBackZ], [-width, 0.0, -length * 0.8], colorBody])
          lines.push([[roofW, height, roofBackZ], [width, 0.0, -length * 0.8], colorBody])

          // Hood & Trunk contours
          lines.push([[-width * 0.8, 0.15, length], [width * 0.8, 0.15, length], colorBody])
          lines.push([[0, 0.2, length], [0, 0.25, length * 0.6], colorBody])
        }

        // --- 2. POWERTRAIN (Engine Block & Transmission) ---
        if (subsystem === 'ALL' || subsystem === 'POWERTRAIN') {
          const engZ = length * 0.65
          lines.push([[-0.5, -0.4, engZ + 0.4], [0.5, -0.4, engZ + 0.4], colorPowertrain])
          lines.push([[0.5, -0.4, engZ + 0.4], [0.5, 0.4, engZ + 0.4], colorPowertrain])
          lines.push([[0.5, 0.4, engZ + 0.4], [-0.5, 0.4, engZ + 0.4], colorPowertrain])
          lines.push([[-0.5, 0.4, engZ + 0.4], [-0.5, -0.4, engZ + 0.4], colorPowertrain])
          lines.push([[-0.5, -0.4, engZ - 0.4], [0.5, -0.4, engZ - 0.4], colorPowertrain])
          lines.push([[0.5, -0.4, engZ - 0.4], [0.5, 0.4, engZ - 0.4], colorPowertrain])
          lines.push([[0.5, 0.4, engZ - 0.4], [-0.5, 0.4, engZ - 0.4], colorPowertrain])
          lines.push([[-0.5, 0.4, engZ - 0.4], [-0.5, -0.4, engZ - 0.4], colorPowertrain])
          lines.push([[0, -0.2, engZ - 0.4], [0, -0.3, 0.0], colorPowertrain]) // Driveshaft tunnel
        }

        // --- 3. SUSPENSION & BRAKE DISCS ---
        if (subsystem === 'ALL' || subsystem === 'SUSPENSION_BRAKES') {
          const wheelZFront = length * 0.65
          const wheelZRear = -length * 0.65
          const wheelW = width * 1.05

          // 4 Wheel hub discs
          const wheels = [
            [-wheelW, -0.4, wheelZFront],
            [wheelW, -0.4, wheelZFront],
            [-wheelW, -0.4, wheelZRear],
            [wheelW, -0.4, wheelZRear],
          ]

          for (const [wx, wy, wz] of wheels) {
            lines.push([[wx, wy - 0.35, wz], [wx, wy + 0.35, wz], colorSuspension])
            lines.push([[wx, wy, wz - 0.35], [wx, wy, wz + 0.35], colorSuspension])
            // Strut coil spring representation
            lines.push([[wx * 0.7, wy + 0.6, wz], [wx, wy, wz], colorSuspension])
          }
        }

        // --- 4. EXHAUST & EMISSIONS ---
        if (subsystem === 'ALL' || subsystem === 'EXHAUST') {
          lines.push([[0.1, -0.5, length * 0.3], [0.1, -0.6, 0.0], colorExhaust])
          lines.push([[0.1, -0.6, 0.0], [-0.2, -0.6, -length * 0.8], colorExhaust])
          lines.push([[-0.2, -0.6, -length * 0.8], [-0.3, -0.55, -length], colorExhaust]) // Muffler tailpipe
        }

        // --- 5. EV BATTERY SKATEBOARD PACK ---
        if (subsystem === 'ALL' || subsystem === 'EV_BATTERY' || style === 'EV_PLATFORM') {
          const battW = width * 0.85
          const battL = length * 0.75
          lines.push([[-battW, -0.7, battL], [battW, -0.7, battL], colorBattery])
          lines.push([[battW, -0.7, battL], [battW, -0.7, -battL], colorBattery])
          lines.push([[battW, -0.7, -battL], [-battW, -0.7, -battL], colorBattery])
          lines.push([[-battW, -0.7, -battL], [-battW, -0.7, battL], colorBattery])
          // Internal cell cross-bracing
          lines.push([[-battW, -0.7, 0], [battW, -0.7, 0], colorBattery])
          lines.push([[0, -0.7, battL], [0, -0.7, -battL], colorBattery])
        }

        return lines
      }

      // Draw all 3D mesh lines
      const meshLines = getVehicleVertices(bodyStyle)
      for (const [v1, v2, color] of meshLines) {
        const p1 = project3D(v1[0], v1[1], v1[2])
        const p2 = project3D(v2[0], v2[1], v2[2])
        ctx.strokeStyle = color
        ctx.lineWidth = renderMode === 'SOLID' ? 2.5 : 1.5
        ctx.beginPath()
        ctx.moveTo(p1.sx, p1.sy)
        ctx.lineTo(p2.sx, p2.sy)
        ctx.stroke()
      }

      // Draw Defect Markers in 3D Coordinate Space
      const projectedMarkers: Array<{ marker: DefectMarker3D; sx: number; sy: number; depth: number }> = []
      const visibleMarkers = DEFAULT_3D_DEFECTS.filter((m) => subsystem === 'ALL' || m.subsystem === subsystem)

      for (const marker of visibleMarkers) {
        const pos = project3D(marker.position.x, marker.position.y, marker.position.z)
        projectedMarkers.push({ marker, sx: pos.sx, sy: pos.sy, depth: pos.depth })

        const isSelected = selectedMarker?.id === marker.id
        const pulse = (Math.sin(tick * 4 + pos.depth) + 1) * 0.5
        const radius = isSelected ? 12 + pulse * 4 : 8 + pulse * 3

        const colorGlow =
          marker.severity === 'RED'
            ? 'rgba(239, 68, 68, 0.9)'
            : marker.severity === 'YELLOW'
            ? 'rgba(234, 179, 8, 0.9)'
            : 'rgba(34, 197, 94, 0.9)'

        // Outer pulse ring
        ctx.strokeStyle = colorGlow
        ctx.lineWidth = isSelected ? 2.5 : 1.5
        ctx.beginPath()
        ctx.arc(pos.sx, pos.sy, radius, 0, Math.PI * 2)
        ctx.stroke()

        // Inner solid core
        ctx.fillStyle = colorGlow
        ctx.beginPath()
        ctx.arc(pos.sx, pos.sy, isSelected ? 6 : 4, 0, Math.PI * 2)
        ctx.fill()

        // Connecting laser indicator line
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)'
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(pos.sx, pos.sy)
        ctx.lineTo(pos.sx + (pos.sx > cx ? 25 : -25), pos.sy - 20)
        ctx.stroke()
        ctx.setLineDash([])

        // HUD Tag Label
        ctx.fillStyle = '#f8fafc'
        ctx.font = '600 10px JetBrains Mono'
        ctx.fillText(marker.component, pos.sx + (pos.sx > cx ? 30 : -95), pos.sy - 18)
      }

      projectedMarkersRef.current = projectedMarkers
      ctx.restore()
      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [bodyStyle, subsystem, renderMode, selectedMarker, autoRotate, xRayTransparency])

  // Mouse & Touch Drag Rotation Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    cameraRef.current.isDragging = true
    cameraRef.current.lastMouseX = e.clientX
    cameraRef.current.lastMouseY = e.clientY
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current.isDragging) return
    const deltaX = e.clientX - cameraRef.current.lastMouseX
    const deltaY = e.clientY - cameraRef.current.lastMouseY
    cameraRef.current.rotY += deltaX * 0.008
    cameraRef.current.rotX = Math.max(-0.2, Math.min(1.2, cameraRef.current.rotX + deltaY * 0.008))
    cameraRef.current.lastMouseX = e.clientX
    cameraRef.current.lastMouseY = e.clientY
  }

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    for (const item of projectedMarkersRef.current) {
      const dist = Math.hypot(clickX - item.sx, clickY - item.sy)
      if (dist < 22) {
        setSelectedMarker(item.marker)
        break
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Tactical Control Ribbon */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
            🌐
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
              3D Holographic Digital Twin
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Spatial Coordinate Vehicle Mesh & Defect Pin Overlay
            </p>
          </div>
        </div>

        {/* Body Style Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          {(['SEDAN', 'SUV', 'TRUCK', 'COUPE', 'EV_PLATFORM'] as VehicleBodyStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setBodyStyle(style)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                bodyStyle === style
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {style.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Render Shader Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {(['HOLOGRAPHIC', 'WIREFRAME', 'SOLID'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setRenderMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  renderMode === mode
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoRotate ? '⟳ ROTATING' : '⏸ PAUSED'}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Canvas Hologram Screen (2 cols) */}
        <div className="lg:col-span-2 relative min-h-[500px] h-[580px] bg-slate-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/40 group">
          {/* HUD Corner Tech Brackets */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10" />

          {/* Hologram Header HUD Overlay */}
          <div className="absolute top-4 left-12 right-12 flex items-center justify-between pointer-events-none z-10">
            <div className="bg-slate-900/90 border border-cyan-500/30 px-3 py-1.5 rounded-lg backdrop-blur-md">
              <span className="text-cyan-400 text-xs font-mono font-bold tracking-wider">
                ● 3D PROJECTION ACTIVE // {bodyStyle}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 text-xs font-mono backdrop-blur-md">
              ORBIT: DRAG TO ROTATE
            </div>
          </div>

          {/* Subsystem Isolation Pill Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/30 p-1.5 rounded-2xl backdrop-blur-xl z-10 max-w-[95%] overflow-x-auto shadow-2xl">
            {(
              [
                { id: 'ALL', label: 'All Systems' },
                { id: 'POWERTRAIN', label: '⚡ Powertrain' },
                { id: 'SUSPENSION_BRAKES', label: '🛑 Brakes/Suspension' },
                { id: 'CHASSIS_BODY', label: '🚗 Body/Aero' },
                { id: 'EXHAUST', label: '⚙️ Exhaust' },
                { id: 'EV_BATTERY', label: '🔋 EV Battery' },
              ] as { id: VehicleSubsystem; label: string }[]
            ).map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubsystem(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  subsystem === sub.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Interactive HTML5 3D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />
        </div>

        {/* Defect Inspection & Sensor Correlation Sidebar (1 col) */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Selected Defect Detail Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
                  Spatial Telemetry Node
                </span>
                {selectedMarker && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      selectedMarker.severity === 'RED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : selectedMarker.severity === 'YELLOW'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {selectedMarker.severity === 'RED'
                      ? 'CRITICAL DEFECT'
                      : 'WARNING'}
                  </span>
                )}
              </div>

              {selectedMarker ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {selectedMarker.component}
                    </h3>
                    <p className="text-sm font-semibold text-cyan-400 mt-0.5">
                      {selectedMarker.label}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed mt-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      {selectedMarker.description}
                    </p>
                  </div>

                  {/* Multi-Sensor Correlation Badges */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">
                      Forensic Sensor Correlations
                    </div>
                    {selectedMarker.acousticMatch && (
                      <div className="flex items-start gap-2 bg-purple-950/40 border border-purple-800/50 p-2.5 rounded-xl text-xs">
                        <span className="text-purple-400">🎙️</span>
                        <div>
                          <div className="text-[10px] font-mono font-bold text-purple-300">
                            ACOUSTIC DSP HARMONIC
                          </div>
                          <div className="text-[11px] text-purple-200">
                            {selectedMarker.acousticMatch}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMarker.dtcMatch && (
                      <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/50 p-2.5 rounded-xl text-xs">
                        <span className="text-red-400">🔌</span>
                        <div>
                          <div className="text-[10px] font-mono font-bold text-red-300">
                            OBD-II CAN-BUS CODE
                          </div>
                          <div className="text-[11px] text-red-200">
                            {selectedMarker.dtcMatch}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
                    <span className="text-slate-400">Est. Repair Cost:</span>
                    <span className="text-emerald-400 font-black text-sm">
                      {selectedMarker.estimatedCost}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  Click any glowing 3D coordinate pin to inspect defect telemetry.
                </div>
              )}
            </div>

            {/* Quick Marker List */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
                All Chassis Markers ({DEFAULT_3D_DEFECTS.length})
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {DEFAULT_3D_DEFECTS.map((marker) => (
                  <button
                    key={marker.id}
                    onClick={() => setSelectedMarker(marker)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
                      selectedMarker?.id === marker.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <span className="truncate">{marker.component}</span>
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        marker.severity === 'RED' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
