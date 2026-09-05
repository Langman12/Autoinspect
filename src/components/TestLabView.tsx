import { useEffect, useRef, useState } from 'react'
import { ollamaService } from '../services/ollamaService.ts'
import { storageService } from '../services/storageService.ts'
import { weatherService } from '../services/weatherService.ts'
import {
  acousticKnowledgeBase,
  RESEARCH_BIBLIOGRAPHY,
  type AcousticFaultProfile,
  type ResearchCitation,
} from '../services/acousticKnowledgeBase.ts'
import {
  autoSeedTrainingDataset,
  trainAcousticClassifier,
  type TrainedModelEvaluation,
  type LabeledAcousticSample,
} from '../services/acousticTrainer.ts'
import type { WeatherHazard, WeatherReport } from '../types.ts'

interface HealthStatus {
  service: string
  status: 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'WARN'
  latencyMs?: number
  details: string
  icon: string
}

interface SyntheticAudioScenario {
  id: string
  label: string
  freqHz: number
  waveType: OscillatorType
  defectName: string
  description: string
  color: string
}

const AUDIO_SCENARIOS: SyntheticAudioScenario[] = [
  {
    id: 'rod-knock',
    label: '💥 Heavy Rod Knock (Bottom End)',
    freqHz: 420,
    waveType: 'sawtooth',
    defectName: 'Connecting Rod Journal Clearance Play (Severe)',
    description: 'Generates 420Hz harmonic knock pulses corresponding to bottom-end piston slap.',
    color: 'border-red-500/50 bg-red-950/30 text-red-300',
  },
  {
    id: 'lifter-tick',
    label: '⏱️ Hydraulic Lifter Tick (Valvetrain)',
    freqHz: 2600,
    waveType: 'square',
    defectName: 'Valvetrain Lash / Collapsed Lifter (Moderate)',
    description: 'High-frequency 2.6kHz valvetrain clicks matching camshaft rotational rate.',
    color: 'border-amber-500/50 bg-amber-950/30 text-amber-300',
  },
  {
    id: 'pulley-whine',
    label: '⚡ Alternator / Idler Pulley Whine',
    freqHz: 5200,
    waveType: 'sine',
    defectName: 'Accessory Drive Bearing Fatigue (Advisory)',
    description: 'Continuous 5.2kHz whistle characteristic of worn ball bearings.',
    color: 'border-purple-500/50 bg-purple-950/30 text-purple-300',
  },
  {
    id: 'clean-idle',
    label: '✨ Balanced Baseline Idle',
    freqHz: 80,
    waveType: 'sine',
    defectName: 'Normal Engine Harmonic Signature (Pass)',
    description: 'Low 80Hz balanced combustion hum without high-frequency spikes.',
    color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300',
  },
]

interface SimDTC {
  code: string
  system: string
  severity: 'CRITICAL' | 'MODERATE' | 'INFO'
  description: string
  remedy: string
}

const PRESET_DTCS: SimDTC[] = [
  {
    code: 'P0300',
    system: 'Ignition / Powertrain',
    severity: 'CRITICAL',
    description: 'Random / Multiple Cylinder Misfire Detected',
    remedy: 'Inspect spark plugs, ignition coils, fuel injector delivery, and compression balance.',
  },
  {
    code: 'P0420',
    system: 'Emissions / Exhaust',
    severity: 'MODERATE',
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    remedy: 'Check upstream/downstream O2 sensor voltages and test catalytic converter substrate.',
  },
  {
    code: 'P0171',
    system: 'Fuel Trim / Intake',
    severity: 'MODERATE',
    description: 'System Too Lean (Bank 1 Air-Fuel Ratio)',
    remedy: 'Perform smoke test for vacuum leaks, clean MAF sensor, inspect fuel pump pressure.',
  },
  {
    code: 'U0100',
    system: 'CAN Bus Telemetry',
    severity: 'CRITICAL',
    description: 'Lost Communication with Engine Control Module (ECM/PCM)',
    remedy: 'Verify 12V supply ground lines, CAN high/low resistance (60 ohms across bus).',
  },
]

export function TestLabView() {
  // System Health States
  const [healthMatrix, setHealthMatrix] = useState<HealthStatus[]>([
    { service: 'Local Ollama Daemon', status: 'CHECKING', details: 'Probing http://localhost:11434...', icon: '🤖' },
    { service: 'Open-Meteo Weather API', status: 'CHECKING', details: 'Checking weather telemetry endpoint...', icon: '🌦️' },
    { service: 'NHTSA Vehicle Recall API', status: 'CHECKING', details: 'Pinging NHTSA government registry...', icon: '🏛️' },
    { service: 'IndexedDB Storage Engine', status: 'CHECKING', details: 'Testing AutoGuardDB persistence...', icon: '💾' },
  ])
  const [, setActiveOllamaModels] = useState<string[]>([])

  // Weather Simulation States
  const [simPrecipMm, setSimPrecipMm] = useState<number>(0)
  const [simTempC, setSimTempC] = useState<number>(20)
  const [simWindKmh, setSimWindKmh] = useState<number>(10)
  const [simVisibilityM, setSimVisibilityM] = useState<number>(10000)
  const [simReport, setSimReport] = useState<WeatherReport | null>(null)

  // Audio Tone Generator States
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [activeToneId, setActiveToneId] = useState<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  // OBD-II DTC State
  const [activeDTCs, setActiveDTCs] = useState<SimDTC[]>([PRESET_DTCS[0]])
  const [customDTCCode, setCustomDTCCode] = useState<string>('')

  // In-Browser Unit Test Runner State
  const [inBrowserTestStatus, setInBrowserTestStatus] = useState<
    { name: string; passed: boolean; durationMs: number }[]
  >([])
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false)

  // Acoustic Knowledge Base & ML Training State
  const [kbSearchQuery, setKbSearchQuery] = useState<string>('')
  const [kbSubsystemFilter, setKbSubsystemFilter] = useState<string>('ALL')
  const [selectedFault, setSelectedFault] = useState<AcousticFaultProfile | null>(null)
  const [acousticDataset, setAcousticDataset] = useState<LabeledAcousticSample[]>([])
  const [trainedModelEvaluation, setTrainedModelEvaluation] = useState<TrainedModelEvaluation | null>(null)
  const [isAutoSeeding, setIsAutoSeeding] = useState<boolean>(false)
  const [isTrainingModel, setIsTrainingModel] = useState<boolean>(false)
  const [trainingProgress, setTrainingProgress] = useState<number>(0)
  const [showBibliography, setShowBibliography] = useState<boolean>(false)

  // Run initial health probes
  useEffect(() => {
    runAllHealthChecks()
    recalculateSimulatedWeather()
  }, [])

  // Recalculate weather when sliders change
  useEffect(() => {
    recalculateSimulatedWeather()
  }, [simPrecipMm, simTempC, simWindKmh, simVisibilityM])

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSyntheticAudio()
    }
  }, [])

  const runAllHealthChecks = async () => {
    // 1. Ollama Check
    const ollamaHealth: HealthStatus = {
      service: 'Local Ollama Daemon',
      status: 'OFFLINE',
      details: 'Unable to reach local daemon',
      icon: '🤖',
    }
    try {
      const t0 = performance.now()
      const health = await ollamaService.checkHealth()
      const latency = Math.round(performance.now() - t0)
      ollamaHealth.latencyMs = latency
      if (health.isOnline) {
        ollamaHealth.status = 'ONLINE'
        const names = health.models.map((m) => m.name)
        ollamaHealth.details = `${names.length} local models ready (${names.slice(0, 3).join(', ')})`
        setActiveOllamaModels(names)
      } else {
        ollamaHealth.status = 'OFFLINE'
        ollamaHealth.details = 'Daemon offline (Run `ollama serve`)'
      }
    } catch {
      ollamaHealth.status = 'OFFLINE'
    }

    // 2. Open-Meteo Weather Check
    const weatherHealth: HealthStatus = {
      service: 'Open-Meteo Weather API',
      status: 'CHECKING',
      details: 'Connecting to Open-Meteo...',
      icon: '🌦️',
    }
    try {
      const t0 = performance.now()
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true'
      )
      const latency = Math.round(performance.now() - t0)
      if (res.ok) {
        weatherHealth.status = 'ONLINE'
        weatherHealth.latencyMs = latency
        weatherHealth.details = `Operational (${latency}ms roundtrip)`
      } else {
        weatherHealth.status = 'WARN'
        weatherHealth.details = `HTTP ${res.status}`
      }
    } catch {
      weatherHealth.status = 'OFFLINE'
      weatherHealth.details = 'Endpoint unreachable'
    }

    // 3. NHTSA Recall Check
    const nhtsaHealth: HealthStatus = {
      service: 'NHTSA Vehicle Recall API',
      status: 'CHECKING',
      details: 'Connecting to NHTSA...',
      icon: '🏛️',
    }
    try {
      const t0 = performance.now()
      const res = await fetch('https://api.nhtsa.dot.gov/recalls/recallsByVehicle?make=toyota&model=camry&modelYear=2022')
      const latency = Math.round(performance.now() - t0)
      if (res.ok) {
        nhtsaHealth.status = 'ONLINE'
        nhtsaHealth.latencyMs = latency
        nhtsaHealth.details = `Government recall registry reachable (${latency}ms)`
      } else {
        nhtsaHealth.status = 'WARN'
        nhtsaHealth.details = `HTTP ${res.status}`
      }
    } catch {
      nhtsaHealth.status = 'OFFLINE'
      nhtsaHealth.details = 'Network blocked or offline'
    }

    // 4. IndexedDB Check
    const idbHealth: HealthStatus = {
      service: 'IndexedDB Storage Engine',
      status: 'CHECKING',
      details: 'Opening AutoGuardDB...',
      icon: '💾',
    }
    try {
      const reports = await storageService.getReports(1)
      idbHealth.status = 'ONLINE'
      idbHealth.details = `AutoGuardDB ready (${reports.length} cached forensic records)`
    } catch (err: any) {
      idbHealth.status = 'WARN'
      idbHealth.details = `Fallback active: ${err?.message || 'IndexedDB blocked'}`
    }

    setHealthMatrix([ollamaHealth, weatherHealth, nhtsaHealth, idbHealth])
  }

  const recalculateSimulatedWeather = () => {
    const analysis = weatherService.evaluateRoadHazards({
      temperatureC: simTempC,
      apparentTemperatureC: simTempC,
      precipitationMm: simPrecipMm,
      windSpeedKmh: simWindKmh,
      windGustsKmh: Math.round(simWindKmh * 1.3),
      visibilityMeters: simVisibilityM,
      relativeHumidity: simTempC <= 3 ? 95 : 65,
      weatherCode: simPrecipMm >= 10 ? 65 : simPrecipMm > 0 ? 61 : 0,
      wmoMultiplier: simPrecipMm >= 10 ? 0.8 : simPrecipMm > 0 ? 0.3 : 0,
    })

    setSimReport({
      locationName: 'Simulation Testing Lab',
      temperatureC: simTempC,
      apparentTemperatureC: simTempC,
      relativeHumidity: simTempC <= 3 ? 95 : 65,
      precipitationMm: simPrecipMm,
      precipitationProbability: simPrecipMm > 0 ? 100 : 10,
      windSpeedKmh: simWindKmh,
      windGustsKmh: Math.round(simWindKmh * 1.3),
      weatherCode: simPrecipMm >= 10 ? 65 : simPrecipMm > 0 ? 61 : 0,
      conditionText: simPrecipMm >= 10 ? 'Heavy Downpour' : simPrecipMm > 0 ? 'Rain' : 'Clear Sky',
      conditionIcon: simPrecipMm >= 10 ? '⛈️' : simPrecipMm > 0 ? '🌧️' : '☀️',
      roadHazardLevel: analysis.roadHazardLevel,
      roadGripIndex: analysis.roadGripIndex,
      safeSpeedCapKmh: analysis.safeSpeedCapKmh,
      tacticalAdvisory: analysis.tacticalAdvisory,
      hazards: analysis.hazards,
      latitude: 0,
      longitude: 0,
      visibilityMeters: simVisibilityM,
      timestamp: Date.now(),
    })
  }

  const applyWeatherPreset = (type: 'dry' | 'flood' | 'ice' | 'fog' | 'gale') => {
    switch (type) {
      case 'dry':
        setSimTempC(24)
        setSimPrecipMm(0)
        setSimWindKmh(12)
        setSimVisibilityM(10000)
        break
      case 'flood':
        setSimTempC(19)
        setSimPrecipMm(18.5)
        setSimWindKmh(35)
        setSimVisibilityM(800)
        break
      case 'ice':
        setSimTempC(-2)
        setSimPrecipMm(2.5)
        setSimWindKmh(30)
        setSimVisibilityM(400)
        break
      case 'fog':
        setSimTempC(9)
        setSimPrecipMm(0.2)
        setSimWindKmh(8)
        setSimVisibilityM(120)
        break
      case 'gale':
        setSimTempC(16)
        setSimPrecipMm(4.0)
        setSimWindKmh(68)
        setSimVisibilityM(3500)
        break
    }
  }

  const playSyntheticAudio = (scenario: SyntheticAudioScenario) => {
    stopSyntheticAudio()

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = scenario.waveType
      osc.frequency.setValueAtTime(scenario.freqHz, ctx.currentTime)

      // Add slight acoustic frequency modulation to mimic mechanical engine revs
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.setValueAtTime(12, ctx.currentTime) // 12Hz engine rotation
      lfoGain.gain.setValueAtTime(scenario.freqHz * 0.05, ctx.currentTime)
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      gain.gain.setValueAtTime(0.15, ctx.currentTime) // Comfortable test volume
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()

      audioCtxRef.current = ctx
      oscRef.current = osc
      gainRef.current = gain
      setIsPlayingAudio(true)
      setActiveToneId(scenario.id)
    } catch (err) {
      console.error('[TestLab] Failed to start audio synthesis:', err)
    }
  }

  const stopSyntheticAudio = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop()
        oscRef.current.disconnect()
      } catch {}
      oscRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
    setIsPlayingAudio(false)
    setActiveToneId(null)
  }

  const addCustomDTC = () => {
    const code = customDTCCode.trim().toUpperCase()
    if (!code) return
    const newDtc: SimDTC = {
      code,
      system: 'Custom User Diagnostics',
      severity: 'MODERATE',
      description: `Simulated OBD-II Fault Code [${code}]`,
      remedy: 'Connect full-system scan tool and inspect live sensor waveform data.',
    }
    setActiveDTCs((prev) => [newDtc, ...prev])
    setCustomDTCCode('')
  }

  const runBrowserSanityTests = async () => {
    setIsRunningTests(true)
    const results: { name: string; passed: boolean; durationMs: number }[] = []

    // Test 1: Weather Grip Physics
    const t0 = performance.now()
    const dryAnalysis = weatherService.evaluateRoadHazards({
      temperatureC: 25,
      apparentTemperatureC: 25,
      precipitationMm: 0,
      windSpeedKmh: 10,
      windGustsKmh: 13,
      visibilityMeters: 10000,
      relativeHumidity: 50,
      weatherCode: 0,
      wmoMultiplier: 0,
    })
    const gripCheck = dryAnalysis.roadGripIndex >= 90
    results.push({
      name: 'Road Grip Formula (Dry >= 90%)',
      passed: gripCheck,
      durationMs: Number((performance.now() - t0).toFixed(2)),
    })

    // Test 2: Black Ice Logic
    const t1 = performance.now()
    const iceAnalysis = weatherService.evaluateRoadHazards({
      temperatureC: -2,
      apparentTemperatureC: -5,
      precipitationMm: 3.0,
      windSpeedKmh: 20,
      windGustsKmh: 26,
      visibilityMeters: 400,
      relativeHumidity: 95,
      weatherCode: 66,
      wmoMultiplier: 0.85,
    })
    const iceCheck = iceAnalysis.roadGripIndex <= 40
    results.push({
      name: 'Black Ice Freeze Threshold (< 40% grip)',
      passed: iceCheck,
      durationMs: Number((performance.now() - t1).toFixed(2)),
    })

    // Test 3: IndexedDB Storage Engine
    const t2 = performance.now()
    let idbPassed = false
    try {
      const testId = 'test-' + Date.now()
      await storageService.saveReport({
        id: testId,
        timestamp: Date.now(),
        overallHealth: 99,
        vehicle: { vin: '1HGCR2F83HA123456', makeModel: 'Test Mobile', year: '2025' },
        photos: [],
        findings: [],
        riskAssessment: { finalDecision: 'SAFE TO DRIVE', rationale: 'Pass' } as any,
      } as any)
      await storageService.deleteReport(testId)
      idbPassed = true
    } catch {
      idbPassed = false
    }
    results.push({
      name: 'IndexedDB Store & Purge Cycle',
      passed: idbPassed,
      durationMs: Number((performance.now() - t2).toFixed(2)),
    })

    setInBrowserTestStatus(results)
    setIsRunningTests(false)
  }

  const handleAutoSeed = () => {
    setIsAutoSeeding(true)
    setTimeout(() => {
      const ds = autoSeedTrainingDataset(25)
      setAcousticDataset(ds)
      setIsAutoSeeding(false)
    }, 300)
  }

  const handleTrainModel = () => {
    let currentDs = acousticDataset
    if (currentDs.length === 0) {
      currentDs = autoSeedTrainingDataset(25)
      setAcousticDataset(currentDs)
    }

    setIsTrainingModel(true)
    setTrainingProgress(20)

    setTimeout(() => setTrainingProgress(60), 200)
    setTimeout(() => setTrainingProgress(90), 450)
    setTimeout(() => {
      const evaluation = trainAcousticClassifier(currentDs, 0.2)
      setTrainedModelEvaluation(evaluation)
      setTrainingProgress(100)
      setIsTrainingModel(false)
    }, 700)
  }

  const playFaultTone = (fault: AcousticFaultProfile) => {
    const sc: SyntheticAudioScenario = {
      id: fault.id,
      label: fault.faultName,
      freqHz: fault.fundamentalFreqHz.typical,
      waveType: fault.subsystem === 'ENGINE_CORE' ? 'sawtooth' : fault.subsystem === 'VALVETRAIN' ? 'square' : 'sine',
      defectName: fault.faultName,
      description: fault.symptomDescription,
      color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300',
    }
    if (isPlayingAudio && activeToneId === fault.id) {
      stopSyntheticAudio()
    } else {
      playSyntheticAudio(sc)
    }
  }

  const allFaults = acousticKnowledgeBase.getAllFaults()
  const filteredFaults = allFaults.filter((f) => {
    const matchesSubsystem = kbSubsystemFilter === 'ALL' || f.subsystem === kbSubsystemFilter
    const q = kbSearchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      f.faultName.toLowerCase().includes(q) ||
      f.component.toLowerCase().includes(q) ||
      f.symptomDescription.toLowerCase().includes(q) ||
      f.rootCauses.some((r) => r.toLowerCase().includes(q))
    return matchesSubsystem && matchesQuery
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">

      {/* Header Banner */}
      <div className="glass-card rounded-3xl border border-emerald-500/40 p-6 shadow-2xl relative overflow-hidden glass-glow-testlab">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                🧪 QA & Telemetry Sandbox
              </span>
              <span className="text-xs text-slate-400 font-mono">Environment: Neural Studio Active</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">AutoGuard AI Testing & Simulation Lab</h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Interactive test harness to simulate severe road hazards, test OBD-II fault code ingestion, synthesize
              mechanical engine knock frequencies, and monitor live API health matrix status.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={runAllHealthChecks}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-800/80 hover:border-emerald-500 text-emerald-300 text-xs font-mono font-bold transition-all shadow-md active:scale-95"
            >
              🔄 Refresh Health
            </button>
            <button
              onClick={runBrowserSanityTests}
              disabled={isRunningTests}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 font-mono"
            >
              {isRunningTests ? 'Running...' : '⚡ Run Sanity Suite'}
            </button>
          </div>
        </div>
      </div>

      {/* In-Browser Test Suite Results (if triggered) */}
      {inBrowserTestStatus.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
              In-Browser Sanity Test Results
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {inBrowserTestStatus.filter((t) => t.passed).length}/{inBrowserTestStatus.length} Passed
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {inBrowserTestStatus.map((t, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                  t.passed
                    ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-300'
                    : 'border-red-700/60 bg-red-950/20 text-red-300'
                }`}
              >
                <div className="truncate pr-2">{t.name}</div>
                <div className="flex items-center gap-1.5 font-bold shrink-0">
                  <span>{t.passed ? '✔ PASS' : '✖ FAIL'}</span>
                  <span className="text-[10px] text-slate-400">({t.durationMs}ms)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Live Health & Telemetry Connectivity Matrix */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <span>📡</span> System Health & Connectivity Matrix
          </h2>
          <span className="text-[10px] font-mono text-slate-400">Auto-Refreshed Real-Time</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {healthMatrix.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all shadow-md ${
                item.status === 'ONLINE'
                  ? 'border-emerald-800/80 bg-slate-900/90'
                  : item.status === 'WARN'
                    ? 'border-amber-800/80 bg-slate-900/90'
                    : 'border-red-800/80 bg-slate-900/90'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">{item.icon}</span>
                <span
                  className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded-full border ${
                    item.status === 'ONLINE'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      : item.status === 'WARN'
                        ? 'bg-amber-950 text-amber-400 border-amber-700'
                        : item.status === 'CHECKING'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-700 animate-pulse'
                          : 'bg-red-950 text-red-400 border-red-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="font-bold text-white text-xs">{item.service}</div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.details}</div>
              {item.latencyMs !== undefined && (
                <div className="text-[10px] font-mono text-cyan-400 mt-2">Latency: {item.latencyMs}ms</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 2. Interactive Road Hazard & Tactical Weather Simulator */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🌦️</span> Tactical Weather & Road Grip Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Inject custom or preset severe weather physics to observe live Road Grip % calculations and hazard alerts.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyWeatherPreset('dry')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-slate-300"
            >
              ☀️ Dry (95%)
            </button>
            <button
              onClick={() => applyWeatherPreset('flood')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-cyan-300"
            >
              🌧️ Downpour
            </button>
            <button
              onClick={() => applyWeatherPreset('ice')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-blue-300"
            >
              ❄️ Black Ice
            </button>
            <button
              onClick={() => applyWeatherPreset('fog')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-slate-400"
            >
              🌫️ Dense Fog
            </button>
            <button
              onClick={() => applyWeatherPreset('gale')}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-purple-300"
            >
              🌪️ Crosswind
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Rainfall:</span>
              <span className="text-cyan-300 font-bold">{simPrecipMm} mm/hr</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={simPrecipMm}
              onChange={(e) => setSimPrecipMm(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Temperature:</span>
              <span className={simTempC <= 0 ? 'text-blue-300 font-bold' : 'text-amber-300 font-bold'}>
                {simTempC} °C
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="45"
              step="1"
              value={simTempC}
              onChange={(e) => setSimTempC(parseInt(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Crosswind:</span>
              <span className="text-purple-300 font-bold">{simWindKmh} km/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={simWindKmh}
              onChange={(e) => setSimWindKmh(parseInt(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Visibility:</span>
              <span className="text-emerald-300 font-bold">
                {simVisibilityM >= 1000 ? `${(simVisibilityM / 1000).toFixed(1)} km` : `${simVisibilityM} m`}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="50"
              value={simVisibilityM}
              onChange={(e) => setSimVisibilityM(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Live Simulation Output Card */}
        {simReport && (
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Road Grip Level</div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black font-mono ${
                    simReport.roadGripIndex >= 80
                      ? 'text-emerald-400'
                      : simReport.roadGripIndex >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {simReport.roadGripIndex}%
                </span>
                <span className="text-xs text-slate-400 font-mono">Traction Coeff</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Safe Speed Cap</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-cyan-300">{simReport.safeSpeedCapKmh}</span>
                <span className="text-xs text-slate-400 font-mono">km/h recommended</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Hazard Condition</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{simReport.conditionIcon}</span>
                <span className="text-xs text-white font-bold">{simReport.conditionText}</span>
              </div>
            </div>

            {simReport.hazards.length > 0 && (
              <div className="sm:col-span-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                {simReport.hazards.map((h: WeatherHazard) => (
                  <div
                    key={h.id}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                      h.severity === 'CRITICAL'
                        ? 'bg-red-950/60 border-red-700 text-red-300'
                        : 'bg-amber-950/60 border-amber-700 text-amber-300'
                    }`}
                  >
                    <span>⚠️</span>
                    <span>{h.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Synthetic Acoustic Audio Synthesizer */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🔊</span> Synthetic Acoustic Engine Generator
            </h2>
            <p className="text-xs text-slate-400">
              Play simulated rod knocks, lifter ticks, or pulley squeals to calibrate acoustic spectrum FFT analyzers.
            </p>
          </div>

          {isPlayingAudio && (
            <button
              onClick={stopSyntheticAudio}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider animate-pulse shadow-lg"
            >
              ⏹️ Stop Audio
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIO_SCENARIOS.map((sc) => (
            <div key={sc.id} className={`p-4 rounded-2xl border ${sc.color} flex flex-col justify-between`}>
              <div>
                <div className="font-black text-xs text-white">{sc.label}</div>
                <div className="text-[10px] font-mono text-cyan-300 mt-1">
                  Freq: {sc.freqHz} Hz ({sc.waveType})
                </div>
                <p className="text-[11px] text-slate-300 mt-2">{sc.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() =>
                    isPlayingAudio && activeToneId === sc.id ? stopSyntheticAudio() : playSyntheticAudio(sc)
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    activeToneId === sc.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-950 hover:bg-slate-800 text-white border border-slate-700'
                  }`}
                >
                  {activeToneId === sc.id ? '⏹️ Playing Tone' : '▶ Play Synth Tone'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. OBD-II Fault Code (DTC) Injector */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🔌</span> OBD-II Trouble Code (DTC) Injector
            </h2>
            <p className="text-xs text-slate-400">
              Simulate active Diagnostic Trouble Codes and verify diagnostic triage workflows.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              value={customDTCCode}
              onChange={(e) => setCustomDTCCode(e.target.value)}
              placeholder="e.g. P0301"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono uppercase outline-none focus:border-cyan-500 w-28"
            />
            <button
              onClick={addCustomDTC}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono"
            >
              + Add DTC
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {activeDTCs.map((dtc, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-black font-mono text-cyan-400">{dtc.code}</span>
                <span
                  className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded ${
                    dtc.severity === 'CRITICAL'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {dtc.severity}
                </span>
              </div>
              <div className="text-xs font-bold text-white">{dtc.description}</div>
              <div className="text-[11px] text-slate-400">
                <span className="text-slate-300 font-bold">Suggested Remediation:</span> {dtc.remedy}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Acoustic AI Training, Research Knowledge Base & Auto-Seeder */}
      <section className="rounded-3xl border border-cyan-800/80 bg-slate-900/95 p-5 md:p-6 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header & Badges */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/60 text-[10px] font-mono font-bold">
                GDVF PROTOCOL 4
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-mono">
                Beyza Kararti (2024)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 text-[10px] font-mono">
                Randall & Antoni (2011)
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🔬</span> Acoustic Machine Learning Trainer & Research Knowledge Base
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Extracts high-dimensional acoustic features (Spectral Centroid, Wiener Flatness, ZCR, HNR, 13-Band Mel Filterbanks) and trains client-side Gaussian feature-space classifiers on automotive acoustic benchmarks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoSeed}
              disabled={isAutoSeeding}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-bold font-mono transition-all flex items-center gap-1.5"
            >
              <span>⚡</span> {isAutoSeeding ? 'Seeding...' : `Auto-Seed Dataset (${acousticDataset.length || 300})`}
            </button>
            <button
              onClick={handleTrainModel}
              disabled={isTrainingModel}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black font-mono uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5"
            >
              <span>🚀</span> {isTrainingModel ? 'Training...' : 'Train ML Model'}
            </button>
          </div>
        </div>

        {/* Training Progress Bar */}
        {isTrainingModel && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-cyan-400 font-bold">
              <span>Training Feature-Space Gaussian Classifier...</span>
              <span>{trainingProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Model Evaluation Metrics Cards */}
        {trainedModelEvaluation && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                  Model Trained & Evaluated (80/20 Train/Validation Split)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(trainedModelEvaluation.trainingTimestamp).toLocaleTimeString()} • {trainedModelEvaluation.totalSamples} Total Samples
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Overall Accuracy</div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {trainedModelEvaluation.overallAccuracyPct}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Macro F1-Score</div>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {trainedModelEvaluation.macroF1Score}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">ROC-AUC Estimate</div>
                <div className="text-xl font-black text-purple-400 font-mono">
                  {trainedModelEvaluation.rocAucEstimate}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Class Balance</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  12 Classes
                </div>
              </div>
            </div>

            {/* Confusion Matrix Visualizer */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Validation Confusion Matrix (Actual vs Predicted)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Diagonal = True Positives</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="p-1 text-left">Actual \ Pred</th>
                      {trainedModelEvaluation.confusionMatrix.classes.map((c, i) => (
                        <th key={i} className="p-1 w-7 max-w-[28px] truncate" title={c}>
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainedModelEvaluation.confusionMatrix.matrix.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                        <td className="p-1 text-left text-slate-300 truncate max-w-[140px]" title={trainedModelEvaluation.confusionMatrix.classes[rIdx]}>
                          {rIdx + 1}. {trainedModelEvaluation.confusionMatrix.classes[rIdx].replace(/_/g, ' ')}
                        </td>
                        {row.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-1 ${
                              rIdx === cIdx && val > 0
                                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60 rounded'
                                : val > 0
                                  ? 'bg-red-950 text-red-300 font-bold'
                                  : 'text-slate-600'
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Explorer & Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Automotive Acoustic Fault Registry ({filteredFaults.length} Profiles)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={kbSearchQuery}
                onChange={(e) => setKbSearchQuery(e.target.value)}
                placeholder="Search faults, symptoms, Hz..."
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono outline-none focus:border-cyan-500 w-full sm:w-56"
              />
              <select
                value={kbSubsystemFilter}
                onChange={(e) => setKbSubsystemFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-mono font-bold outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Subsystems</option>
                <option value="ENGINE_CORE">Engine Core</option>
                <option value="VALVETRAIN">Valvetrain</option>
                <option value="ACCESSORY_DRIVE">Accessory Drive</option>
                <option value="DRIVELINE_CHASSIS">Driveline & Chassis</option>
                <option value="INDUCTION_FORCED">Induction & Forced</option>
                <option value="BRAKING">Braking</option>
              </select>
            </div>
          </div>

          {/* Fault Profile Cards Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFaults.map((fault) => (
              <div
                key={fault.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{fault.id}</span>
                    <span
                      className={`text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded ${
                        fault.severity === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : fault.severity === 'HIGH'
                            ? 'bg-orange-950 text-orange-400 border border-orange-800'
                            : fault.severity === 'MEDIUM'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}
                    >
                      {fault.severity}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white leading-tight">{fault.faultName}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Component: {fault.component}</div>

                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-cyan-300">
                      <span>Fundamental:</span>
                      <span className="font-bold">{fault.fundamentalFreqHz.typical} Hz ({fault.fundamentalFreqHz.min}–{fault.fundamentalFreqHz.max} Hz)</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>DSP Centroid:</span>
                      <span>{fault.dspFingerprint.spectralCentroidRangeHz[0]}–{fault.dspFingerprint.spectralCentroidRangeHz[1]} Hz</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Typical HNR:</span>
                      <span>{fault.dspFingerprint.typicalHnrDb} dB</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">{fault.symptomDescription}</p>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="text-slate-300 font-bold">Estimated Cost:</span> ${fault.estimatedRepairCostUsd.min} – ${fault.estimatedRepairCostUsd.max}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-mono truncate max-w-[140px]" title={fault.researchCitation.title}>
                    📚 {fault.researchCitation.author} ({fault.researchCitation.year})
                  </span>
                  <button
                    onClick={() => playFaultTone(fault)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                      activeToneId === fault.id
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700'
                    }`}
                  >
                    {activeToneId === fault.id ? '⏹️ Playing' : '▶ Play Freq'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Bibliography & Research Accordion */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <button
            onClick={() => setShowBibliography(!showBibliography)}
            className="w-full flex justify-between items-center text-xs font-bold font-mono text-slate-300 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <span>📚</span> Academic Research Bibliography & Theoretical References ({RESEARCH_BIBLIOGRAPHY.length})
            </span>
            <span>{showBibliography ? '▲ Hide' : '▼ Expand'}</span>
          </button>

          {showBibliography && (
            <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
              {RESEARCH_BIBLIOGRAPHY.map((cit, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 font-mono">
                  <div className="font-bold text-cyan-400">
                    {cit.author} ({cit.year}). "{cit.title}"
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{cit.publication}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

