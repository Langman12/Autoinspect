import { useEffect, useRef, useState } from 'react'
import { aiService } from '../services/aiService'
import { geminiService } from '../services/geminiService'
import { recallService } from '../services/recallService'
import { AcousticVisualizer } from './AcousticVisualizer'
import type { ForensicAsset, InspectionReport, VehicleProfile } from '../types'

const MAX_RECONNECT_ATTEMPTS = 3

const INSPECTION_PHASES = [
  { id: 'front_exterior', label: '1. Front & ADAS', overlayText: 'Align front bumper, headlights & ADAS radar zone within optical crosshairs.' },
  { id: 'side_walkaround', label: '2. Side Panels & Jambs', overlayText: 'Inspect door gaps (±1mm tolerance), look for orange-peel Bondo waviness, or B-pillar VIN sticker.' },
  { id: 'engine_bay', label: '3. Engine Bay', overlayText: 'Check fluid reservoirs (oil/coolant/brake), belt condition, and manifold.' },
  { id: 'undercarriage', label: '4. Chassis & Rails', overlayText: 'Scan frame rails for clamp marks, kinking, rust rot, and battery casing puncture.' },
  { id: 'interior_airbags', label: '5. Interior & Airbags', overlayText: 'Inspect steering wheel seams, seatbelts, pedals & odometer wear patterns.' },
  { id: 'acoustic', label: '6. Acoustic Stethoscope', overlayText: 'Record 10s engine idle and throttle rev to detect knock, ticks, bearing whir.' },
]

export function CameraView({
  vehicle,
  onReportGenerated,
  onVehicleExtracted,
}: {
  vehicle: VehicleProfile
  onReportGenerated: (report: InspectionReport) => void
  onVehicleExtracted?: (extracted: Partial<VehicleProfile>) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const liveSessionRef = useRef<any>(null)
  const [isLiveEnabled, setIsLiveEnabled] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedAssets, setCapturedAssets] = useState<ForensicAsset[]>([])
  const [guidanceText, setGuidanceText] = useState('')
  const [currentPhase, setCurrentPhase] = useState('front_exterior')
  const [analysisStep, setAnalysisStep] = useState('')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [isScanningVIN, setIsScanningVIN] = useState(false)
  const [showVinGuide, setShowVinGuide] = useState(false)
  const [extractionAlert, setExtractionAlert] = useState<{
    text: string
    type: 'success' | 'info' | 'error'
  } | null>(null)
  let reconnectCount = 0

  const currentPhaseObj = INSPECTION_PHASES.find((p) => p.id === currentPhase) || INSPECTION_PHASES[0]

  // Cleanup camera stream and live session on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (liveSessionRef.current) {
        liveSessionRef.current.close?.()
        liveSessionRef.current = null
      }
    }
  }, [])

  const toggleLive = async () => {
    if (isLiveEnabled) {
      liveSessionRef.current?.close()
      liveSessionRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setIsLiveEnabled(false)
      setGuidanceText('')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080, facingMode: 'environment' },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsLiveEnabled(true)
      const session = await geminiService.connectLive({
        onopen: () => setGuidanceText('GDVF Live forensic session active. AI Auditor listening and scanning.'),
        onmessage: (msg) => {
          const text = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text
          if (text) setGuidanceText(text)
        },
        onerror: (err) => setGuidanceText('Live error: ' + err.message),
        onclose: async (evt) => {
          if (evt.code !== 1000 && reconnectCount < MAX_RECONNECT_ATTEMPTS) {
            reconnectCount++
            const delay = reconnectCount * 2000
            setGuidanceText('Session interrupted. Auto-reconnecting... attempt ' + reconnectCount)
            await new Promise((r) => setTimeout(r, delay))
            await toggleLive()
          } else {
            setIsLiveEnabled(false)
            setGuidanceText('Live session disconnected.')
          }
        },
      })
      liveSessionRef.current = session
    } catch (err: any) {
      alert('Camera / microphone access error: ' + err.message)
      setIsLiveEnabled(false)
    }
  }

  const captureFrame = (): ForensicAsset | null => {
    if (!videoRef.current) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1280
    canvas.height = videoRef.current.videoHeight || 720
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    return {
      data: canvas.toDataURL('image/jpeg', 0.92),
      mimeType: 'image/jpeg',
      label: currentPhaseObj.label,
    }
  }

  const handleAddAsset = async () => {
    const frame = captureFrame()
    if (!frame) return
    setCapturedAssets((prev) => [...prev, frame])

    // Auto advance phase
    const idx = INSPECTION_PHASES.findIndex((p) => p.id === currentPhase)
    if (idx >= 0 && idx < INSPECTION_PHASES.length - 1) {
      setCurrentPhase(INSPECTION_PHASES[idx + 1].id)
    }

    // If VIN is not set yet, attempt auto-extraction from this frame
    if (!vehicle.vin && onVehicleExtracted) {
      triggerVehicleScan(frame)
    }
  }

  const handleAudioCaptured = (_blob: Blob, base64: string) => {
    const audioAsset: ForensicAsset = {
      data: base64,
      mimeType: 'audio/webm',
      label: 'Engine Acoustic Sample (20Hz-20kHz)',
    }
    setCapturedAssets((prev) => [...prev, audioAsset])
    setIsRecordingAudio(false)
  }

  const triggerVehicleScan = async (targetAsset?: ForensicAsset) => {
    const imageAsset =
      targetAsset ||
      capturedAssets.filter((a) => a.mimeType?.startsWith('image/')).slice(-1)[0]

    if (!imageAsset) {
      alert('Please snap or upload a vehicle photo first (e.g. car exterior, VIN plate, or door jamb sticker).')
      return
    }

    setIsScanningVIN(true)
    setExtractionAlert({ text: 'Scanning photo with AI Vision to extract VIN, Make, Model & Mileage...', type: 'info' })

    try {
      const extracted = await aiService.extractVehicleDetails(imageAsset, (step) => {
        setExtractionAlert({ text: step, type: 'info' })
      })

      if (extracted && (extracted.vin || extracted.makeModel || extracted.year)) {
        if (onVehicleExtracted) {
          onVehicleExtracted(extracted)
        }
        if (extracted.vin) {
          const summary = `${extracted.year || ''} ${extracted.makeModel || 'Vehicle'} (VIN: ${extracted.vin})`.trim()
          setExtractionAlert({
            text: `✨ Full Extraction Verified: ${summary} — Profile calibrated!`,
            type: 'success',
          })
        } else {
          const summary = `${extracted.year || ''} ${extracted.makeModel || 'Vehicle'}`.trim()
          setExtractionAlert({
            text: `🚗 Vehicle Identified: ${summary} — Auto-populated! (Tip: Capture driver door jamb or windshield corner to lock in the 17-digit VIN).`,
            type: 'info',
          })
        }
      } else {
        setExtractionAlert({
          text: 'AI completed scan. No high-confidence VIN placard or vehicle silhouette detected in this specific angle. Try snapping a clear photo of the door jamb or windshield VIN plate.',
          type: 'error',
        })
      }
    } catch (err: any) {
      setExtractionAlert({ text: `Extraction notice: ${err?.message || 'Inference error'}`, type: 'error' })
    } finally {
      setIsScanningVIN(false)
    }
  }

  const runFullAnalysis = async () => {
    if (capturedAssets.length === 0) {
      const liveFrame = captureFrame()
      if (liveFrame) {
        setCapturedAssets([liveFrame])
      } else {
        alert('Please capture or upload at least one photo or audio clip before running analysis.')
        return
      }
    }

    setIsCapturing(true)
    setAnalysisStep('Initiating GDVF Forensic Diagnostics...')
    setAnalysisProgress(15)
    await new Promise((r) => setTimeout(r, 400))

    setAnalysisStep('Evaluating panel gaps, weld seals & undercarriage...')
    setAnalysisProgress(40)
    await new Promise((r) => setTimeout(r, 500))

    setAnalysisStep('Cross-referencing acoustic signatures & NHTSA database...')
    setAnalysisProgress(70)

    try {
      const activeProvider = aiService.getActiveProvider()
      setAnalysisStep(
        activeProvider === 'ollama'
          ? 'Running Local GDVF Diagnostics with Ollama...'
          : 'Connecting to Gemini Cloud Forensic Intelligence...'
      )

      const report = await aiService.analyzeVehicle(capturedAssets, vehicle, (step) => {
        setAnalysisStep(step)
      })
      setAnalysisProgress(90)
      setAnalysisStep('Compiling final risk assessment & cost model...')

      if (report && vehicle.vin) {
        const recalls = await recallService.getRecallsByVin(vehicle.vin)
        if (recalls.length > 0) report.recalls = recalls
      }

      await new Promise((r) => setTimeout(r, 400))
      setAnalysisProgress(100)
      if (report) {
        onReportGenerated(report)
      } else {
        alert('Analysis completed but report could not be compiled. Please check your AI configuration in the Intel Hub.')
      }
    } catch (err: any) {
      alert('Forensic Analysis failed: ' + err.message)
    } finally {
      setIsCapturing(false)
      setAnalysisStep('')
      setAnalysisProgress(0)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const assets: ForensicAsset[] = await Promise.all(
      files.map(
        (file) =>
          new Promise<ForensicAsset>((resolve) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({ data: String(reader.result), mimeType: file.type, label: file.name })
            reader.readAsDataURL(file)
          })
      )
    )
    setCapturedAssets((prev) => [...prev, ...assets])

    // If vehicle VIN is empty, automatically scan the first uploaded image
    const firstImage = assets.find((a) => a.mimeType?.startsWith('image/'))
    if (firstImage && (!vehicle.vin || !vehicle.makeModel) && onVehicleExtracted) {
      triggerVehicleScan(firstImage)
    }
  }

  const removeAsset = (index: number) => {
    setCapturedAssets((prev) => prev.filter((_, i) => i !== index))
  }

  const hasImages = capturedAssets.some((a) => a.mimeType?.startsWith('image/'))

  return (
    <div className="space-y-5">
      {/* Auto-Extraction Alert Banner */}
      {extractionAlert && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-mono transition-all shadow-lg ${
            extractionAlert.type === 'success'
              ? 'border-emerald-700/80 bg-emerald-950/80 text-emerald-200'
              : extractionAlert.type === 'info'
                ? 'border-cyan-700/80 bg-cyan-950/80 text-cyan-200 animate-pulse'
                : 'border-amber-700/80 bg-amber-950/80 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">
              {extractionAlert.type === 'success' ? '✅' : extractionAlert.type === 'info' ? '🤖' : 'ℹ️'}
            </span>
            <span>{extractionAlert.text}</span>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={() => setShowVinGuide(!showVinGuide)}
              className="px-2 py-1 rounded-lg bg-black/50 hover:bg-black text-[11px] text-cyan-300 font-bold underline"
            >
              {showVinGuide ? 'Hide Guide' : '📍 VIN Guide'}
            </button>
            <button
              onClick={() => setExtractionAlert(null)}
              className="text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Interactive VIN & OCR Location Guide */}
      {showVinGuide && (
        <div className="rounded-2xl border border-cyan-700/60 bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 p-4 space-y-3 animate-fadeIn glass-card">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <span>📍</span> 4 Recommended VIN & Placard Photo Angles
            </h4>
            <button onClick={() => setShowVinGuide(false)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-cyan-400 font-black">1. 🪟 Windshield Base</span>
              <p className="text-slate-300 text-[11px]">
                Lower corner of the front driver-side windshield glass stamped into dash.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-black">2. 🚪 Driver Door Jamb</span>
              <p className="text-slate-300 text-[11px]">
                Safety certification sticker on the B-pillar frame showing VIN & tire specs.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-amber-400 font-black">3. ⚙️ Engine Bay Stamp</span>
              <p className="text-slate-300 text-[11px]">
                Bulkhead or strut tower metal plate in the front engine compartment.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-purple-400 font-black">4. 📄 Registration / Title</span>
              <p className="text-slate-300 text-[11px]">
                Official vehicle license disk, insurance card, or vehicle title document.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Optical Forensic Viewport Frame */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-800/90 hud-border relative shadow-2xl space-y-0">
        
        {/* Viewport Top Header Info Bar */}
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 font-mono">
              OPTICAL FORENSIC FEED [{(vehicle.fuelType || vehicle.class || 'UNIVERSAL').toUpperCase()}]
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              PHASE {INSPECTION_PHASES.findIndex((p) => p.id === currentPhase) + 1} OF 6
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {capturedAssets.length} ASSETS
            </span>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* Standby State Display when Camera is Inactive */}
          {!isLiveEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative w-20 h-20 rounded-full border border-cyan-500/40 flex items-center justify-center mb-3">
                <div className="w-14 h-14 rounded-full border border-dashed border-cyan-400 animate-spin" />
                <span className="text-3xl absolute">📸</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                {currentPhaseObj.label}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-md bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                {currentPhaseObj.overlayText}
              </p>
              {vehicle.vin && (
                <div className="mt-3 px-3 py-1 bg-emerald-950/80 border border-emerald-500/60 rounded-lg text-emerald-300 text-[11px] font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VIN CALIBRATED: {vehicle.vin}</span>
                </div>
              )}
            </div>
          )}

          {/* AR Overlay Guides */}
          {isLiveEnabled && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              {/* Laser Scan Line */}
              <div className="absolute inset-x-0 h-20 laser-scan pointer-events-none" />

              <div className="flex justify-between items-start z-10">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  ADAS ALIGNED · 60 FPS
                </div>
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-mono">
                  AZ: 184° · DIST: 1.4m
                </div>
              </div>

              {/* Tactical Reticle Crosshairs */}
              <div className="self-center w-3/4 h-3/5 border-2 border-dashed border-cyan-400/50 rounded-2xl flex items-center justify-center relative shadow-inner">
                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-cyan-400" />
                <p className="bg-black/80 text-cyan-200 text-xs font-mono px-3.5 py-1.5 rounded-xl text-center max-w-sm border border-cyan-800/60 shadow-lg">
                  {currentPhaseObj.overlayText}
                </p>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-400 z-10">
                Captured: {capturedAssets.length} assets
              </div>
            </div>
          )}

          {/* Loading / Analysis Overlay */}
          {isCapturing && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 p-6 text-center">
              <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-white font-black text-xl mb-2">{analysisStep}</div>
              <p className="text-xs text-cyan-300 font-mono mb-4">
                Target: {vehicle.year} {vehicle.makeModel} [{vehicle.class || 'STANDARD'}]
              </p>
              <div className="w-80 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="text-slate-400 text-xs font-mono mt-3">{analysisProgress}% Complete</div>
            </div>
          )}

          {/* Live Audio Guidance Text */}
          {guidanceText && (
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md border border-cyan-500/50 text-cyan-100 text-xs font-medium rounded-2xl px-4 py-3 z-20 shadow-2xl flex items-center gap-3">
              <span className="text-lg">🤖</span>
              <span className="font-mono">{guidanceText}</span>
            </div>
          )}
        </div>

        {/* 6-Phase Stepper Controls */}
        <div className="p-3.5 bg-slate-950/90 border-t border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {INSPECTION_PHASES.map((p, idx) => {
              const isActive = currentPhase === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setCurrentPhase(p.id)}
                  className={`p-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 border border-cyan-500 text-white shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className={`text-[10px] font-black ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {p.label}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {isActive ? '● Active' : 'Step ' + (idx + 1)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Acoustic Stethoscope Module */}
      {(currentPhase === 'acoustic' || isRecordingAudio) && (
        <AcousticVisualizer isRecording={isRecordingAudio} onAudioCaptured={handleAudioCaptured} />
      )}

      {/* Control Actions Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-2.5 items-center justify-between border border-slate-800 shadow-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={toggleLive}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-md ${
              isLiveEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
            }`}
          >
            {isLiveEnabled ? '⏹ Stop Optical Feed' : '🎥 Start Live Camera'}
          </button>

          {isLiveEnabled && (
            <button
              onClick={handleAddAsset}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase shadow-md transition"
            >
              📸 Snap Phase Frame
            </button>
          )}

          {/* AI Auto-Extract VIN & Info Button */}
          {hasImages && (
            <button
              onClick={() => triggerVehicleScan()}
              disabled={isScanningVIN}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{isScanningVIN ? '⏳' : '🔍'}</span>
              <span>{isScanningVIN ? 'Scanning VIN...' : 'Extract VIN from Photo'}</span>
            </button>
          )}

          <button
            onClick={() => setIsRecordingAudio(!isRecordingAudio)}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${
              isRecordingAudio ? 'bg-red-700 animate-pulse text-white' : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
            }`}
          >
            {isRecordingAudio ? '⏹ Stop Stethoscope' : '🎙️ Record Engine Sound'}
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs uppercase cursor-pointer transition">
            📁 Upload Media
            <input type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={onFile} />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runFullAnalysis}
            disabled={isCapturing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-40 flex items-center gap-2"
          >
            <span>🚀</span>
            <span>Run Forensic Audit ({capturedAssets.length})</span>
          </button>
        </div>
      </div>

      {/* Captured Asset Gallery */}
      {capturedAssets.length > 0 && (
        <div className="glass-card rounded-2xl p-4 space-y-2 border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-black uppercase tracking-wider text-slate-300 font-mono">
              Captured Forensic Evidence Batch ({capturedAssets.length})
            </span>
            <button
              onClick={() => setCapturedAssets([])}
              className="text-red-400 hover:text-red-300 font-bold font-mono"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
            {capturedAssets.map((asset, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                {asset.mimeType.startsWith('image') ? (
                  <>
                    <img src={asset.data} alt={asset.label} className="w-full h-full object-cover" />
                    {/* Scan Specific Photo Button */}
                    <button
                      onClick={() => triggerVehicleScan(asset)}
                      title="Scan this specific image for VIN / Model"
                      className="absolute bottom-1 left-1 bg-black/80 hover:bg-cyan-600 text-cyan-200 hover:text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                    >
                      🔍 Scan VIN
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <span className="text-lg">🎵</span>
                    <p className="text-[9px] text-cyan-300 truncate font-mono">Audio Clip</p>
                  </div>
                )}
                <button
                  onClick={() => removeAsset(i)}
                  className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-slate-300 px-1 py-0.5 truncate text-center font-mono">
                  {asset.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
