import { useEffect, useRef, useState } from 'react'
import {
  classifyAcousticFrequency,
  computeSpectralCentroid,
  computeSpectralFlatness,
  computeHarmonicToNoiseRatio,
} from '../services/acousticEngine'

interface AcousticVisualizerProps {
  isRecording: boolean
  onAudioCaptured?: (blob: Blob, base64: string) => void
}

export function AcousticVisualizer({ isRecording, onAudioCaptured }: AcousticVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)

  const [dominantFreq, setDominantFreq] = useState<number>(0)
  const [activeBand, setActiveBand] = useState<string>('Idle / Standby')
  const [peakLevel, setPeakLevel] = useState<number>(0)
  const [dspMetrics, setDspMetrics] = useState<{ centroidHz: number; flatness: number; hnrDb: number }>({
    centroidHz: 0,
    flatness: 0,
    hnrDb: 0,
  })

  useEffect(() => {
    if (isRecording) {
      startListening()
    } else {
      stopListening()
    }
    return () => {
      stopListening()
    }
  }, [isRecording])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      
      // Biquad highpass filter to eliminate sub-20Hz handling rumble & DC offset
      const highpassFilter = audioCtx.createBiquadFilter()
      highpassFilter.type = 'highpass'
      highpassFilter.frequency.setValueAtTime(20, audioCtx.currentTime)
      
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8

      source.connect(highpassFilter)
      highpassFilter.connect(analyser)
      analyserRef.current = analyser

      // MediaRecorder for capturing the audio clip
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onAudioCaptured?.(audioBlob, reader.result)
          }
        }
        reader.readAsDataURL(audioBlob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder

      drawVisualizer()
    } catch (err) {
      console.warn('[AcousticVisualizer] Microphone access error:', err)
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const drawVisualizer = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const audioCtx = audioCtxRef.current
    if (!canvas || !analyser || !audioCtx) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Auto-scale backing buffer for High-DPI / Retina displays
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const displayWidth = canvas.clientWidth || 500
    const displayHeight = canvas.clientHeight || 90
    canvas.width = Math.round(displayWidth * dpr)
    canvas.height = Math.round(displayHeight * dpr)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let frameCount = 0

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render)
      analyser.getByteFrequencyData(dataArray)

      ctx.save()
      ctx.scale(dpr, dpr)

      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, displayWidth, displayHeight)

      // Frequency bands markers
      const barWidth = (displayWidth / bufferLength) * 2.2
      let maxVal = 0
      let maxIndex = 0

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i]
        if (val > maxVal) {
          maxVal = val
          maxIndex = i
        }

        const barHeight = (val / 255) * (displayHeight - 20)
        const x = i * (barWidth + 1)
        const y = displayHeight - barHeight - 4

        // Color coding by diagnostic band
        const freqHz = Math.round((i * audioCtx.sampleRate) / analyser.fftSize)
        let fill = '#3b82f6'
        if (freqHz <= 200) fill = '#ef4444' // Structural / Exhaust / Transmission
        else if (freqHz <= 800) fill = '#f97316' // Rod knock / Piston slap
        else if (freqHz <= 2000) fill = '#eab308' // Belt slip / Lifters / CV
        else if (freqHz <= 8000) fill = '#10b981' // Bearing whine / Alternator
        else fill = '#06b6d4' // Turbo whistle / Brake glaze

        ctx.fillStyle = fill
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0])
        } else {
          ctx.rect(x, y, barWidth, barHeight)
        }
        ctx.fill()
      }

      ctx.restore()

      const dominantHz = Math.round((maxIndex * audioCtx.sampleRate) / analyser.fftSize)
      const currentPeak = Math.round((maxVal / 255) * 100)
      setDominantFreq(dominantHz)
      setPeakLevel(currentPeak)

      const diag = classifyAcousticFrequency(dominantHz, currentPeak)
      setActiveBand(diag.bandName)

      // Update research DSP metrics every ~4 frames to avoid React state churn
      frameCount++
      if (frameCount % 4 === 0 && maxVal > 10) {
        const centroidHz = computeSpectralCentroid(dataArray, audioCtx.sampleRate)
        const flatness = computeSpectralFlatness(dataArray)
        const hnrDb = computeHarmonicToNoiseRatio(dataArray, maxIndex)
        setDspMetrics({ centroidHz, flatness, hnrDb })
      }
    }

    render()
  }

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
          <p className="text-xs font-black uppercase tracking-wider text-cyan-300 font-mono">
            Acoustic Spectrum Stethoscope (20Hz - 20kHz)
          </p>
        </div>
        <div className="text-right flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            {dominantFreq} Hz
          </span>
          <span className="text-[10px] font-mono text-slate-400">Peak: {peakLevel}%</span>
        </div>
      </div>

      <canvas ref={canvasRef} width={500} height={90} className="w-full h-24 rounded-xl bg-slate-950 border border-slate-800" />

      {/* Real-time DSP Research Metrics HUD */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Centroid Mass</span>
          <span className="font-bold text-cyan-400">{dspMetrics.centroidHz > 0 ? `${dspMetrics.centroidHz} Hz` : '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Wiener Flatness</span>
          <span className="font-bold text-amber-400">
            {dspMetrics.flatness > 0 ? `${dspMetrics.flatness.toFixed(3)} ${dspMetrics.flatness < 0.15 ? '(Tonal)' : '(Noise)'}` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Harmonic/Noise</span>
          <span className="font-bold text-emerald-400">{dspMetrics.hnrDb !== 0 ? `${dspMetrics.hnrDb.toFixed(1)} dB` : '—'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
        <span className="text-slate-400 font-medium">Diagnostic Band:</span>
        <span className="text-cyan-300 font-mono font-bold truncate max-w-[280px]">{activeBand}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 pt-1 text-[9px] text-center font-mono">
        <div className="p-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-900/60 font-bold">20-200Hz<br/>Rumble</div>
        <div className="p-1.5 rounded-lg bg-orange-950/40 text-orange-300 border border-orange-900/60 font-bold">200-800Hz<br/>Knock/Slap</div>
        <div className="p-1.5 rounded-lg bg-yellow-950/40 text-yellow-300 border border-yellow-900/60 font-bold">0.8-2kHz<br/>Belt/CV</div>
        <div className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-900/60 font-bold">2k-8kHz<br/>Bearing</div>
        <div className="p-1.5 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-900/60 font-bold">8k-20kHz<br/>Turbo/Air</div>
      </div>
    </div>
  )
}
