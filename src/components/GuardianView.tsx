import { useEffect, useRef, useState } from 'react'
import { geminiService } from '../services/geminiService'
import { weatherService, WEATHER_PRESETS, type WeatherPreset } from '../services/weatherService'
import { useRoadPhysicsStream } from '../hooks/useRoadPhysicsStream.ts'
import type { GuardianMission, WeatherReport } from '../types'
import { BlackBoxRecorder } from './BlackBoxRecorder.tsx'

interface SimulatedHazard {
  id: string
  type: 'POTHOLE' | 'SPEED_TRAP' | 'STANDING_WATER' | 'DEBRIS' | 'BLACK_ICE' | 'HYDROPLANING' | 'CROSSWINDS' | 'DENSE_FOG' | 'THUNDERSTORM'
  distanceMeters: number
  description: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  source?: 'RADAR' | 'WEATHER' | 'USER'
}

export function GuardianView() {
  const [isActive, setIsActive] = useState(false)
  const [destination, setDestination] = useState('Dallas, TX')
  const [vehicleProfile, setVehicleProfile] = useState('2024 Passenger Sedan')
  const [threatLevel, setThreatLevel] = useState<GuardianMission['threatLevel']>('high')
  const [routePriority, setRoutePriority] = useState<GuardianMission['routePriority']>('fastest')
  const [weatherAvoidance, setWeatherAvoidance] = useState<boolean>(true)
  // Road Physics & Weather Stream Hook
  const {
    position,
    setPosition,
    weatherReport,
    setWeatherReport,
    isWeatherLoading,
    activePreset,
    currentSpeedKmh,
    setCurrentSpeedKmh,
    speedLimitKmh,
    loadWeatherForLocation: fetchWeatherForPreset,
    startGpsTracking,
    stopGpsTracking,
  } = useRoadPhysicsStream({ initialPresetId: 'current', initialSpeedKmh: 74 })

  const [transcript, setTranscript] = useState<string[]>([])
  const [voiceCoPilotEnabled, setVoiceCoPilotEnabled] = useState(true)

  const [hazards, setHazards] = useState<SimulatedHazard[]>([
    { id: 'h1', type: 'POTHOLE', distanceMeters: 450, description: 'Severe pothole in right lane (15cm impact risk)', severity: 'WARNING', source: 'RADAR' },
    { id: 'h2', type: 'SPEED_TRAP', distanceMeters: 800, description: 'Mobile speed enforcement radar unit ahead', severity: 'INFO', source: 'RADAR' },
    { id: 'h3', type: 'THUNDERSTORM', distanceMeters: 1200, description: 'Severe convective storm cell crossing vector', severity: 'CRITICAL', source: 'WEATHER' },
  ])

  const watchIdRef = useRef<number | null>(null)
  const guardianSessionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Spoken voice announcement
  const speakVoice = (text: string) => {
    if (!voiceCoPilotEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis?.cancel()
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#]/g, ''))
      utterance.rate = 1.05
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
    }
  }

  const playAudio = async (b64: string) => {
    try {
      const ctx = audioContextRef.current || new AudioContext()
      audioContextRef.current = ctx
      const raw = atob(b64)
      const buf = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
      const audioBuf = await ctx.decodeAudioData(buf.buffer.slice(0))
      const src = ctx.createBufferSource()
      src.buffer = audioBuf
      src.connect(ctx.destination)
      src.start()
    } catch (err) {
      console.warn('Audio playback skipped', err)
    }
  }

  const applyWeatherToRadar = (report: WeatherReport) => {
    if (report.hazards && report.hazards.length > 0) {
      const mapped: SimulatedHazard[] = report.hazards.map((h, i) => ({
        id: `wh-${i}-${Date.now()}`,
        type: h.type as any,
        distanceMeters: (i + 1) * 600,
        description: `${h.title}: ${h.recommendedAction}`,
        severity: h.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        source: 'WEATHER',
      }))
      setHazards((prev) => [...mapped, ...prev.filter((x) => x.source !== 'WEATHER')].slice(0, 8))

      if (voiceCoPilotEnabled && report.hazards.length > 0) {
        const top = report.hazards[0]
        const announcement = `Tactical Weather Alert: ${top.title}. ${top.recommendedAction}`
        setTranscript((prev) => [...prev, `[WEATHER SHIELD] ${announcement}`])
        speakVoice(announcement)
      }
    }
  }

  // Load weather for a given preset
  const loadWeatherForLocation = async (preset: WeatherPreset) => {
    const report = await fetchWeatherForPreset(preset)
    if (report) {
      applyWeatherToRadar(report)
    }
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos)
        const speed = Math.round((pos.coords.speed || 0) * 3.6)
        if (speed > 0) setCurrentSpeedKmh(speed)

        if (guardianSessionRef.current) {
          const weatherSummary = weatherReport
            ? `, Weather: ${weatherReport.conditionText} ${weatherReport.temperatureC}°C, Grip: ${weatherReport.roadGripIndex}%`
            : ''
          const locationUpdate = `LOCATION UPDATE: Lat ${pos.coords.latitude.toFixed(5)}, Lon ${pos.coords.longitude.toFixed(5)}, Speed ${speed} km/h${weatherSummary}`
          guardianSessionRef.current.sendMessage?.({ text: locationUpdate })
        }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    )
  }

  const toggleGuardian = async () => {
    if (isActive) {
      guardianSessionRef.current?.close?.()
      guardianSessionRef.current = null
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setIsActive(false)
      setTranscript((prev) => [...prev, 'GUARDIAN: Mission terminated. Safe travels.'])
      return
    }

    if (!destination.trim()) {
      alert('Please enter a target destination before activating Guardian.')
      return
    }

    let currentW = weatherReport
    if (destination.trim() && activePreset === 'current') {
      try {
        const destWeather = await weatherService.fetchWeatherByLocationName(destination)
        if (destWeather) {
          currentW = destWeather
          setWeatherReport(destWeather)
          applyWeatherToRadar(destWeather)
        }
      } catch (e) {
        console.warn('Destination weather lookup skipped:', e)
      }
    }

    const mission: GuardianMission = {
      destination,
      vehicleProfile,
      threatLevel,
      routePriority: weatherAvoidance && currentW?.roadHazardLevel === 'SEVERE_DANGER' ? 'scenic' : routePriority,
      weatherAvoidance,
      currentWeather: currentW,
    }

    setIsActive(true)
    startLocationTracking()

    const weatherVoiceText = currentW
      ? ` Weather Radar: ${currentW.conditionText} at ${currentW.temperatureC} degrees Celsius. Road Grip Index: ${currentW.roadGripIndex} percent. ${currentW.tacticalAdvisory}`
      : ''

    const initialMsg = `GUARDIAN: Tactical 4-Layer Shield active. Destination locked: ${destination}. Monitoring all surface hazards, traffic flow, and radar.${weatherVoiceText}`
    setTranscript((prev) => [...prev, initialMsg])
    speakVoice(initialMsg)

    try {
      const session = await geminiService.connectGuardianLive(mission, {
        onopen: () => {
          session.sendMessage?.({
            text: `Mission initiated. Destination: ${mission.destination}. Vehicle: ${mission.vehicleProfile}. Threat Level: ${mission.threatLevel}. Weather Shield: ${weatherAvoidance ? 'ACTIVE' : 'STANDBY'}.`,
          })
        },
        onmessage: (msg: any) => {
          const text = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text
          if (text) {
            setTranscript((prev) => [...prev.slice(-25), 'GUARDIAN: ' + text])
            speakVoice(text)
          }
          const audio = msg.serverContent?.modelTurn?.parts?.find((p: any) =>
            p.inlineData?.mimeType?.startsWith('audio')
          )
          if (audio) playAudio(audio.inlineData.data)
        },
        onerror: (err: any) => {
          setTranscript((prev) => [...prev, 'ERROR: ' + err.message])
        },
        onclose: () => {
          setIsActive(false)
        },
      })
      guardianSessionRef.current = session
    } catch (err: any) {
      console.warn('Guardian Live session offline, using local Tactical Shield co-pilot:', err)
    }
  }

  const triggerSimulatedHazard = (type: SimulatedHazard['type']) => {
    const hazardNames = {
      POTHOLE: 'Deep pothole detected 300m ahead in lane 2',
      SPEED_TRAP: 'Speed enforcement camera 400m ahead. Limit 80 km/h',
      STANDING_WATER: 'Flash pooling / standing water risk on roadway',
      DEBRIS: 'Tire tread debris reported in center lane',
      BLACK_ICE: 'Sub-zero road surface temperature — black ice caution',
      HYDROPLANING: 'Severe hydroplaning threshold exceeded. Reduce speed by 30 km/h',
      CROSSWINDS: 'Sudden 65 km/h bridge crosswind sheer detected',
      DENSE_FOG: 'Dense fog bank ahead — visibility dropping below 300m',
      THUNDERSTORM: 'Severe convective storm cell crossing navigation vector',
    }
    const newHazard: SimulatedHazard = {
      id: 'h-' + Date.now(),
      type,
      distanceMeters: 350,
      description: hazardNames[type] || 'Unidentified tactical road anomaly',
      severity: ['BLACK_ICE', 'POTHOLE', 'HYDROPLANING', 'THUNDERSTORM'].includes(type) ? 'CRITICAL' : 'WARNING',
      source: 'USER',
    }
    setHazards((prev) => [newHazard, ...prev.slice(0, 6)])
    const alertText = `Tactical Alert: ${newHazard.description}. Reduce speed.`
    setTranscript((prev) => [...prev, `[TACTICAL SHIELD] ${alertText}`])
    speakVoice(alertText)
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      guardianSessionRef.current?.close?.()
      guardianSessionRef.current = null
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-black font-mono">
            TACTICAL GUARDIAN GPS CO-PILOT
          </p>
          <h2 className="text-2xl font-black text-white tracking-tight">Doppler Radar & Threat Intercept Shield</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWeatherAvoidance(!weatherAvoidance)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border transition-all flex items-center gap-1.5 ${
              weatherAvoidance
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-md shadow-emerald-950/30'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            <span>🛡️</span>
            <span>{weatherAvoidance ? 'Weather Shield ON' : 'Weather Shield OFF'}</span>
          </button>

          <button
            onClick={() => setVoiceCoPilotEnabled(!voiceCoPilotEnabled)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border transition-all flex items-center gap-1.5 ${
              voiceCoPilotEnabled
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300 shadow-md shadow-cyan-950/30'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            <span>{voiceCoPilotEnabled ? '🔊 Voice Co-Pilot ON' : '🔇 Muted'}</span>
          </button>
        </div>
      </div>

      {/* Weather Preset Selector Strip */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
            DOPPLER WEATHER SCENARIO PRESETS
          </span>
          {isWeatherLoading && (
            <span className="text-[10px] text-cyan-400 animate-pulse font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Syncing Live Open-Meteo Radar...
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WEATHER_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => loadWeatherForLocation(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all font-mono ${
                activePreset === p.id
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-900/30'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mission Configuration Inputs */}
      <div className="grid gap-3 md:grid-cols-4 glass-card p-4 rounded-2xl border border-slate-800 shadow-xl">
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination address or city"
          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400 font-mono"
        />
        <input
          value={vehicleProfile}
          onChange={(e) => setVehicleProfile(e.target.value)}
          placeholder="Vehicle profile (e.g. 2024 Sedan)"
          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400 font-mono"
        />
        <select
          value={threatLevel}
          onChange={(e) => setThreatLevel(e.target.value as GuardianMission['threatLevel'])}
          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none font-mono"
        >
          <option value="low">Threat Profile: Standard</option>
          <option value="medium">Threat Profile: Elevated</option>
          <option value="high">Threat Profile: Maximum Tactical</option>
        </select>
        <select
          value={routePriority}
          onChange={(e) => setRoutePriority(e.target.value as GuardianMission['routePriority'])}
          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none font-mono"
        >
          <option value="fastest">Route: Fastest + Rat Run</option>
          <option value="avoid-tolls">Route: Avoid Tolls</option>
          <option value="scenic">Route: Smooth Surface Only</option>
        </select>
      </div>

      {/* Weather Hazard Condition Banner */}
      {weatherReport && (
        <div
          className={`glass-card rounded-2xl p-5 space-y-4 shadow-xl border transition-all ${
            weatherReport.roadHazardLevel === 'SEVERE_DANGER'
              ? 'bg-rose-950/30 border-rose-800/80 shadow-rose-950/20'
              : weatherReport.roadHazardLevel === 'HAZARDOUS'
              ? 'bg-amber-950/30 border-amber-800/80 shadow-amber-950/20'
              : 'border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-slate-800">
                {weatherReport.conditionIcon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">{weatherReport.locationName}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-slate-800">
                    Live Doppler Met
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {weatherReport.conditionText} · {weatherReport.temperatureC}°C (Feels like {weatherReport.apparentTemperatureC}°C)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Road Surface Grip</p>
                <p
                  className={`text-xl font-black font-mono ${
                    weatherReport.roadGripIndex > 75
                      ? 'text-emerald-400'
                      : weatherReport.roadGripIndex > 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {weatherReport.roadGripIndex}%
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono border ${
                  weatherReport.roadHazardLevel === 'SEVERE_DANGER'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : weatherReport.roadHazardLevel === 'HAZARDOUS'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : weatherReport.roadHazardLevel === 'CAUTION'
                    ? 'bg-yellow-950 text-yellow-300 border-yellow-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {weatherReport.roadHazardLevel.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <p className="text-slate-400 text-[10px] uppercase font-bold">💨 Wind / Gusts</p>
              <p className="text-white font-black font-mono mt-1">
                {weatherReport.windSpeedKmh} <span className="text-[10px] text-slate-400">km/h</span>
              </p>
              <p className="text-[10px] text-slate-500">Gusts to {weatherReport.windGustsKmh} km/h</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <p className="text-slate-400 text-[10px] uppercase font-bold">🌧️ Precipitation</p>
              <p className="text-cyan-400 font-black font-mono mt-1">
                {weatherReport.precipitationMm} <span className="text-[10px] text-slate-400">mm/h</span>
              </p>
              <p className="text-[10px] text-slate-500">{weatherReport.precipitationProbability}% prob</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <p className="text-slate-400 text-[10px] uppercase font-bold">👁️ Visibility</p>
              <p className="text-white font-black font-mono mt-1">
                {(weatherReport.visibilityMeters / 1000).toFixed(1)} <span className="text-[10px] text-slate-400">km</span>
              </p>
              <p className="text-[10px] text-slate-500">{weatherReport.visibilityMeters < 1000 ? '⚠️ Low Sightline' : 'Clear Sightline'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <p className="text-slate-400 text-[10px] uppercase font-bold">🛑 Safe Speed Cap</p>
              <p className="text-amber-400 font-black font-mono mt-1">
                {weatherReport.safeSpeedCapKmh} <span className="text-[10px] text-slate-400">km/h</span>
              </p>
              <p className="text-[10px] text-slate-500">Hydroplane threshold</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
            <span className="text-lg">⚠️</span>
            <div className="text-xs space-y-0.5">
              <strong className="text-white font-black uppercase tracking-wider block font-mono">
                Tactical Weather Advisory
              </strong>
              <p className="text-slate-300 leading-relaxed">{weatherReport.tacticalAdvisory}</p>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry & Circular Doppler Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Dynamics Gauge & Speed Control */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-cyan-400 font-black uppercase tracking-wider">LIVE TELEMETRY</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentSpeedKmh > speedLimitKmh ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
              {currentSpeedKmh > speedLimitKmh ? '⚠️ OVERSPEED' : 'SPEED OK'}
            </span>
          </div>

          <div className="text-center py-2">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-6xl font-black text-white font-mono">{currentSpeedKmh}</span>
              <span className="text-sm font-bold text-slate-400 font-mono">KM/H</span>
            </div>
            <div className="mt-2 text-xs font-mono text-cyan-400">
              Posted Speed Limit: <strong className="text-white">{speedLimitKmh} km/h</strong>
            </div>

            <div className="w-full mt-4 space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0 km/h</span>
                <span>Speed Simulator</span>
                <span>140 km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="140"
                value={currentSpeedKmh}
                onChange={(e) => setCurrentSpeedKmh(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Heading</span>
              <strong className="text-cyan-300">042° NNE</strong>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Altitude</span>
              <strong className="text-white">312 m MSL</strong>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: 360° Circular Doppler Radar Dish */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-slate-800 space-y-4 glass-glow-radar">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300 font-mono">
                1.5KM TACTICAL DOPPLER RADAR DISH
              </h3>
              <p className="text-xs text-slate-400">Active object classification and live surface hazard tracking</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => triggerSimulatedHazard('HYDROPLANING')}
                className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 text-[10px] font-mono font-bold"
              >
                + Hydroplane
              </button>
              <button
                onClick={() => triggerSimulatedHazard('BLACK_ICE')}
                className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-200 text-[10px] font-mono font-bold"
              >
                + Ice
              </button>
              <button
                onClick={() => triggerSimulatedHazard('POTHOLE')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold"
              >
                + Pothole
              </button>
            </div>
          </div>

          {/* Radar Canvas Dish */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-cyan-900/60 flex items-center justify-center">
            {/* Range Rings */}
            <div className="w-[85%] aspect-square rounded-full border border-cyan-500/15 absolute pointer-events-none" />
            <div className="w-[60%] aspect-square rounded-full border border-cyan-500/25 absolute pointer-events-none" />
            <div className="w-[35%] aspect-square rounded-full border border-cyan-500/35 absolute pointer-events-none" />
            <div className="w-[12%] aspect-square rounded-full border border-cyan-500/50 absolute pointer-events-none" />

            {/* Axes */}
            <div className="absolute inset-x-0 h-px bg-cyan-500/20" />
            <div className="absolute inset-y-0 w-px bg-cyan-500/20" />

            {/* Rotating Beam */}
            <div className="w-[85%] aspect-square rounded-full absolute pointer-events-none radar-sweep" />

            {/* Own Vehicle Marker */}
            <div className="w-4 h-4 rounded-full bg-cyan-400 absolute shadow-lg shadow-cyan-400 flex items-center justify-center z-20">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            </div>

            {/* Simulated Hazards Blips */}
            {hazards.slice(0, 4).map((h, i) => {
              const offsets = [
                { top: '28%', right: '32%', color: 'bg-amber-400', label: 'POTHOLE' },
                { bottom: '30%', left: '26%', color: 'bg-blue-400', label: 'RADAR TRAP' },
                { top: '20%', left: '24%', color: 'bg-rose-500', label: 'STORM CELL' },
                { bottom: '22%', right: '28%', color: 'bg-yellow-400', label: 'DEBRIS' },
              ]
              const pos = offsets[i % offsets.length]
              return (
                <div key={h.id} style={{ position: 'absolute', ...pos }} className="flex items-center gap-1 z-20">
                  <div className={`w-3.5 h-3.5 rounded-full ${pos.color} animate-ping`} />
                  <span className="text-[9px] font-mono text-slate-200 bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-700">
                    {h.distanceMeters}m
                  </span>
                </div>
              )
            })}

            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              RADAR SWEEP: 360° CONTINUOUS · GAIN: AUTO
            </div>
            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              DOPPLER COMPASS: NNE 042°
            </div>
          </div>
        </div>

      </div>

      {/* Main Activation Button */}
      <button
        onClick={toggleGuardian}
        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl font-mono ${
          isActive
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
            : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:opacity-90 text-white shadow-cyan-950/40'
        }`}
      >
        {isActive ? '⏹ Abort Tactical Mission' : '🛡️ Engage Tactical Guardian & Weather Shield'}
      </button>

      {/* Active Hazards & Live Radio Transcript */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
          <div className="flex justify-between items-center">
            <p className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
              Active Radar Threats ({hazards.length})
            </p>
            <span className="text-xs font-mono text-cyan-400">Doppler Track Active</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {hazards.map((h) => (
              <div
                key={h.id}
                className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
                  h.severity === 'CRITICAL'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : 'bg-amber-950/40 border-amber-800 text-amber-200'
                }`}
              >
                <div>
                  <div className="font-bold text-white">{h.description}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">TYPE: {h.type} · SOURCE: {h.source || 'RADAR'}</div>
                </div>
                <span className="font-mono font-black text-sm text-cyan-300 whitespace-nowrap">{h.distanceMeters}m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                Co-Pilot Voice & Action Log
              </p>
              <span className="text-[10px] text-cyan-400 font-mono">Live Synthesizer</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-xs">
              {transcript.length === 0 && (
                <p className="text-slate-500 italic">
                  Guardian tactical radio is silent. Enter destination and activate to begin.
                </p>
              )}
              {transcript.map((line, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* In-Flight Black Box Flight Recorder Section */}
      <BlackBoxRecorder />

    </div>
  )
}

