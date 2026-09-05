import { useEffect, useState } from 'react'
import { DiagnosticMatrix } from './DiagnosticMatrix'
import { aiService, type AIProvider } from '../services/aiService'
import { ollamaService, type OllamaHealthStatus } from '../services/ollamaService'
import { weatherService } from '../services/weatherService'
import type { InspectionReport, SocialPost, SystemHealth } from '../types'

export function IntelligenceHub({
  history,
  onOpenReport,
}: {
  history: InspectionReport[]
  onOpenReport: (report: InspectionReport) => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'recalls' | 'social' | 'ollama' | 'weather'>('weather')
  const [activeProvider, setActiveProvider] = useState<AIProvider>(aiService.getActiveProvider())
  const [ollamaStatus, setOllamaStatus] = useState<OllamaHealthStatus | null>(null)
  const [selectedTextModel, setSelectedTextModel] = useState<string>(ollamaService.getTextModel())
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>(ollamaService.getVisionModel())
  const [testPrompt, setTestPrompt] = useState<string>(
    'Perform a 2-sentence GDVF forensic risk audit for a 2023 Tesla Model Y with 32,000 km.'
  )
  const [testResult, setTestResult] = useState<{
    response: string
    latencyMs: number
    model: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testError, setTestError] = useState<string | null>(null)

  // Hub Weather Search State
  const [hubWeatherQuery, setHubWeatherQuery] = useState<string>('Dallas, TX')
  const [hubWeatherReport, setHubWeatherReport] = useState<any>(null)
  const [isHubWeatherLoading, setIsHubWeatherLoading] = useState<boolean>(false)

  useEffect(() => {
    refreshOllama()
    fetchHubWeather('Dallas, TX')
  }, [])

  const fetchHubWeather = async (city: string) => {
    setIsHubWeatherLoading(true)
    try {
      const res = await weatherService.fetchWeatherByLocationName(city)
      if (res) setHubWeatherReport(res)
    } catch (e) {
      console.warn('Weather fetch error:', e)
    } finally {
      setIsHubWeatherLoading(false)
    }
  }

  const refreshOllama = async () => {
    const status = await ollamaService.checkHealth()
    setOllamaStatus(status)
  }

  const handleProviderToggle = (provider: AIProvider) => {
    aiService.setActiveProvider(provider)
    setActiveProvider(provider)
  }

  const handleTextModelChange = (model: string) => {
    setSelectedTextModel(model)
    ollamaService.setTextModel(model)
  }

  const handleVisionModelChange = (model: string) => {
    setSelectedVisionModel(model)
    ollamaService.setVisionModel(model)
  }

  const runTestInference = async () => {
    setIsTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const res = await ollamaService.runQuickTest(testPrompt)
      setTestResult(res)
      refreshOllama()
    } catch (err: any) {
      setTestError(err.message || 'Inference failed')
    } finally {
      setIsTesting(false)
    }
  }

  const health: SystemHealth = {
    timestamp: Date.now(),
    apiLatency: ollamaStatus?.isOnline ? ollamaStatus.latencyMs : (history.length ? 210 : 0),
    errorRate: 0,
    storageUsed: history.length,
    activeUsers: 1,
    status: ollamaStatus?.isOnline ? 'healthy' : 'degraded',
  }

  const posts: SocialPost[] = history.slice(0, 4).map((report, i) => ({
    id: `post-${report.id}`,
    platform: (['twitter', 'linkedin', 'facebook', 'instagram'] as const)[i % 4],
    content: `🔍 AutoGuard AI Forensic Audit: ${report.vehicle.year || ''} ${report.vehicle.makeModel} scored ${report.overallHealth}% health index. Verdict: ${report.riskAssessment.finalDecision}. Prior repair: ${report.priorRepairDetected ? 'Detected' : 'Clear'}. #VehicleInspection #AutoForensics #GDVF`,
    scheduledAt: report.timestamp,
    status: 'pending',
    reportId: report.id,
  }))

  const recalls = history.flatMap((r) => (r.recalls || []).map((rec) => ({ rec, report: r })))

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-black font-mono">
          AUTOMOTIVE INTELLIGENCE & OPERATIONS
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight">Forensic Hub & Local AI Operations</h2>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`glass-card rounded-2xl p-4 border ${ollamaStatus?.isOnline ? 'border-emerald-700/80 bg-emerald-950/40' : 'border-amber-700/80 bg-amber-950/40'}`}>
          <p className={`text-[10px] uppercase font-mono font-bold ${ollamaStatus?.isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            Local AI Engine
          </p>
          <p className="text-xl font-black font-mono text-white mt-1">
            {ollamaStatus?.isOnline ? 'OLLAMA ONLINE' : 'OFFLINE'}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {ollamaStatus?.models.length || 0} local models loaded
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Local Latency</p>
          <p className="text-xl font-black font-mono text-cyan-400 mt-1">
            {ollamaStatus?.latencyMs ? `${ollamaStatus.latencyMs} ms` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{selectedTextModel}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Active Recalls</p>
          <p className="text-xl font-black font-mono text-amber-400 mt-1">{recalls.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">NHTSA Cross-ref</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Audited Units</p>
          <p className="text-xl font-black font-mono text-white mt-1">{history.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Forensic reports</p>
        </div>
      </div>

      {/* Hub Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('weather')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
            activeSubTab === 'weather' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🌩️ Weather Radar & Hazards
        </button>
        <button
          onClick={() => setActiveSubTab('ollama')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
            activeSubTab === 'ollama' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🤖 Local AI & Ollama
        </button>
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
            activeSubTab === 'matrix' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🔬 Pathology Matrix
        </button>
        <button
          onClick={() => setActiveSubTab('recalls')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
            activeSubTab === 'recalls' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          ⚠️ Safety Recalls ({recalls.length})
        </button>
        <button
          onClick={() => setActiveSubTab('social')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${
            activeSubTab === 'social' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📢 Customer Briefs ({posts.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'weather' && (
        <div className="space-y-6">
          {/* Weather Location Search Bar */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400">
                  Meteorological Telemetry & Surface Hazards
                </span>
                <h3 className="text-lg font-black text-white">Global Weather Radar Search</h3>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-950 text-cyan-300 border border-slate-800">
                Powered by Open-Meteo
              </span>
            </div>

            <div className="flex gap-2">
              <input
                value={hubWeatherQuery}
                onChange={(e) => setHubWeatherQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHubWeather(hubWeatherQuery)}
                placeholder="Enter city or coordinates (e.g. Tokyo, Munich, Dallas, London, Cape Town)"
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-500 font-sans"
              />
              <button
                onClick={() => fetchHubWeather(hubWeatherQuery)}
                disabled={isHubWeatherLoading}
                className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase transition-all shadow-md shadow-cyan-900/30 flex items-center gap-2"
              >
                {isHubWeatherLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>🔍 Scan</span>
                )}
              </button>
            </div>

            {/* City Preset Pills */}
            <div className="flex gap-2 overflow-x-auto pt-1">
              {['Dallas, TX', 'Tokyo, Japan', 'Munich, Germany', 'London, UK', 'Cape Town, SA'].map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setHubWeatherQuery(city)
                    fetchHubWeather(city)
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-all whitespace-nowrap"
                >
                  📍 {city}
                </button>
              ))}
            </div>
          </div>

          {/* Weather Results Display */}
          {hubWeatherReport && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-2 rounded-2xl bg-slate-950 border border-slate-800">
                      {hubWeatherReport.conditionIcon}
                    </span>
                    <div>
                      <h4 className="text-xl font-black text-white">{hubWeatherReport.locationName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hubWeatherReport.conditionText} · {hubWeatherReport.temperatureC}°C (Feels like {hubWeatherReport.apparentTemperatureC}°C)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Road Grip Index</p>
                      <p
                        className={`text-xl font-black font-mono ${
                          hubWeatherReport.roadGripIndex > 75
                            ? 'text-emerald-400'
                            : hubWeatherReport.roadGripIndex > 50
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {hubWeatherReport.roadGripIndex}%
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                        hubWeatherReport.roadHazardLevel === 'SEVERE_DANGER'
                          ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                          : hubWeatherReport.roadHazardLevel === 'HAZARDOUS'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      {hubWeatherReport.roadHazardLevel.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">💨 Wind / Gusts</p>
                    <p className="text-white font-black font-mono text-base mt-1">
                      {hubWeatherReport.windSpeedKmh} <span className="text-xs text-slate-400">km/h</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">Gusts to {hubWeatherReport.windGustsKmh} km/h</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">🌧️ Precipitation</p>
                    <p className="text-cyan-400 font-black font-mono text-base mt-1">
                      {hubWeatherReport.precipitationMm} <span className="text-xs text-slate-400">mm/h</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">{hubWeatherReport.precipitationProbability}% prob</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">👁️ Visibility</p>
                    <p className="text-white font-black font-mono text-base mt-1">
                      {(hubWeatherReport.visibilityMeters / 1000).toFixed(1)} <span className="text-xs text-slate-400">km</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {hubWeatherReport.visibilityMeters < 1000 ? '⚠️ Reduced Range' : 'Optimal Visuals'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">🛑 Safe Speed Cap</p>
                    <p className="text-amber-400 font-black font-mono text-base mt-1">
                      {hubWeatherReport.safeSpeedCapKmh} <span className="text-xs text-slate-400">km/h</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Hydroplane threshold</p>
                  </div>
                </div>

                {/* Tactical Advisory */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🛡️</span>
                  <div className="text-xs space-y-1">
                    <strong className="text-white font-black uppercase tracking-wider block">
                      Guardian GPS Weather Advisory & Avoidance Directive
                    </strong>
                    <p className="text-slate-300 leading-relaxed font-sans">{hubWeatherReport.tacticalAdvisory}</p>
                  </div>
                </div>

                {/* Hazards List */}
                {hubWeatherReport.hazards.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Active Road Hazards Detected ({hubWeatherReport.hazards.length}):
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {hubWeatherReport.hazards.map((h: any) => (
                        <div
                          key={h.id}
                          className={`p-3 rounded-2xl border text-xs ${
                            h.severity === 'CRITICAL'
                              ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                              : 'bg-amber-950/40 border-amber-800 text-amber-200'
                          }`}
                        >
                          <p className="font-bold">{h.title}</p>
                          <p className="text-[11px] text-slate-300 mt-1">{h.description}</p>
                          <p className="text-[10px] text-cyan-300 mt-1.5 font-mono">
                            ⚡ Rec: {h.recommendedAction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents */}
      {activeSubTab === 'ollama' && (
        <div className="space-y-6">
          {/* Engine Selector Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                  AI Execution Runtime
                </span>
                <h3 className="text-lg font-black text-white">Active Intelligence Engine</h3>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => handleProviderToggle('ollama')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeProvider === 'ollama'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🤖</span>
                  <span>Local AI (Ollama)</span>
                </button>
                <button
                  onClick={() => handleProviderToggle('gemini')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeProvider === 'gemini'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>☁️</span>
                  <span>Cloud AI (Gemini)</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When set to <strong>Local AI</strong>, AutoGuard AI runs 100% offline and privately on your machine using Ollama without sending video or vehicle telematics over the internet.
            </p>
          </div>

          {/* Model Configuration Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Text & Reasoning Model */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Forensic Text & Reasoning Model
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                  Primary
                </span>
              </div>
              <select
                value={selectedTextModel}
                onChange={(e) => handleTextModelChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-500 font-mono"
              >
                {ollamaStatus?.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.details?.parameter_size || Math.round(m.size / 1e9) + 'GB'})
                  </option>
                ))}
                {!ollamaStatus?.models.some((m) => m.name.includes('llama3.2:3b')) && (
                  <option value="llama3.2:3b">llama3.2:3b (Recommended)</option>
                )}
              </select>
              <p className="text-[11px] text-slate-400">
                Used for synthesizing GDVF forensic reports, risk decisions, cost tiers, and acoustic cross-referencing.
              </p>
            </div>

            {/* Vision Model */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Optical & Vision Model
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                  Multimodal
                </span>
              </div>
              <select
                value={selectedVisionModel}
                onChange={(e) => handleVisionModelChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 font-mono"
              >
                {ollamaStatus?.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
                {!ollamaStatus?.models.some((m) => m.name.includes('moondream')) && (
                  <option value="moondream">moondream (Recommended)</option>
                )}
              </select>
              <p className="text-[11px] text-slate-400">
                Used to scan vehicle photos for scratches, dents, paint orange-peel, rust, and frame misalignment.
              </p>
            </div>
          </div>

          {/* Live Ollama Diagnostic & Prompt Test Playground */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400">
                  Diagnostic Playground
                </span>
                <h3 className="text-lg font-black text-white">Live Ollama Inference Test</h3>
              </div>
              <button
                onClick={refreshOllama}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-all"
              >
                🔄 Refresh Status
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase text-slate-400 font-bold block">Test Prompt</label>
              <textarea
                rows={2}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-cyan-500 resize-none font-sans"
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-400">
                Target Model: <strong className="text-slate-200 font-mono">{selectedTextModel}</strong>
              </span>
              <button
                onClick={runTestInference}
                disabled={isTesting || !ollamaStatus?.isOnline}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                  isTesting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-900/30 active:scale-95'
                }`}
              >
                {isTesting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Running Inference...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Test Local AI Response</span>
                  </>
                )}
              </button>
            </div>

            {testError && (
              <div className="rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-xs text-rose-300 font-mono">
                ❌ Error: {testError}
              </div>
            )}

            {testResult && (
              <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/20 p-4 space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold uppercase">
                    ✅ Generation Complete · {testResult.model}
                  </span>
                  <span className="text-slate-400">{testResult.latencyMs} ms</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{testResult.response}</p>
              </div>
            )}
          </div>

          {/* Local AI System Info Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 text-xs text-slate-400">
            <h4 className="font-bold text-white text-sm">💡 Hardware & Performance Notes</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-300">GPU Offload:</strong> Models will automatically offload layers to your NVIDIA GPU (MX230) and system RAM for hybrid acceleration.
              </li>
              <li>
                <strong className="text-slate-300">Fast Lightweight Models:</strong> <code className="text-cyan-300 font-mono">llama3.2:3b</code> (~2GB) and <code className="text-cyan-300 font-mono">moondream</code> (~800MB) deliver rapid 1-3 second responses.
              </li>
              <li>
                <strong className="text-slate-300">Terminal CLI Test:</strong> You can also run <code className="text-emerald-300 font-mono">npm run test:ollama</code> anytime from the terminal.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      {activeSubTab === 'matrix' && <DiagnosticMatrix />}

      {activeSubTab === 'recalls' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              NHTSA Safety Recall Database Matches
            </h3>
          </div>
          {recalls.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400 text-sm">
              No active recalls recorded for audited fleet units.
            </div>
          ) : (
            <div className="space-y-3">
              {recalls.map(({ rec, report }) => (
                <div
                  key={rec.campaignNumber + report.id}
                  onClick={() => onOpenReport(report)}
                  className="cursor-pointer rounded-2xl border border-amber-800/80 bg-amber-950/20 hover:bg-amber-950/30 p-5 space-y-2 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                        Campaign #{rec.campaignNumber} · {rec.manufacturer}
                      </span>
                      <h4 className="font-black text-white text-base mt-0.5">{rec.subject}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Vehicle: <strong className="text-slate-200">{report.vehicle.makeModel}</strong> (VIN: {report.vehicle.vin || 'N/A'})
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 whitespace-nowrap">View Unit Report →</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">Component:</strong> {rec.component}
                  </p>
                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">Consequence:</strong> {rec.consequence}
                  </p>
                  <p className="text-xs text-cyan-300">
                    <strong className="text-slate-400">Remedy:</strong> {rec.remedy}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'social' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Automated Dealership & Customer Transparency Briefs
            </h3>
          </div>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400 text-sm">
              Perform inspections to auto-generate transparency briefs.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800">
                      {post.platform}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Auto-Generated</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{post.content}</p>
                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(post.content)
                        alert('Brief copied to clipboard!')
                      }}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      Copy Brief 📋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
