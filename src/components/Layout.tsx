import { useEffect, useState, type ReactNode } from 'react'
import { aiService, type AIProvider } from '../services/aiService'
import { ollamaService } from '../services/ollamaService'
import { pwaSyncService } from '../services/pwaSyncService.ts'
import { HudAlertOverlay } from './HudAlertOverlay.tsx'
import type { PwaSyncStatus } from '../types.ts'

export type View =
  | 'inspect'
  | 'digitaltwin'
  | 'guardian'
  | 'obd'
  | 'evbattery'
  | 'matrix'
  | 'parts'
  | 'valuation'
  | 'passport'
  | 'tread'
  | 'ar'
  | 'insights'
  | 'hub'
  | 'testlab'

export function Layout({
  view,
  setView,
  children,
}: {
  view: View
  setView: (v: View) => void
  children: ReactNode
}) {
  const [provider, setProvider] = useState<AIProvider>(aiService.getActiveProvider())
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [activeModel, setActiveModel] = useState<string>(ollamaService.getTextModel())
  const [pwaStatus, setPwaStatus] = useState<PwaSyncStatus>(pwaSyncService.getStatus())
  const [pendingSync, setPendingSync] = useState<number>(pwaSyncService.getPendingCount())

  useEffect(() => {
    const unsub = aiService.onProviderChange((p) => setProvider(p))
    const unsubPwa = pwaSyncService.subscribe((status, pending) => {
      setPwaStatus(status)
      setPendingSync(pending)
    })
    const checkStatus = () => {
      ollamaService.checkHealth().then((h) => {
        setOllamaOnline(h.isOnline)
        setActiveModel(ollamaService.getTextModel())
      })
    }
    checkStatus()
    const interval = setInterval(checkStatus, 15000)
    return () => {
      unsub()
      unsubPwa()
      clearInterval(interval)
    }
  }, [])

  const toggleProvider = () => {
    const next: AIProvider = provider === 'ollama' ? 'gemini' : 'ollama'
    aiService.setActiveProvider(next)
    setProvider(next)
  }

  const tabs: { id: View; label: string; icon: string }[] = [
    { id: 'inspect', label: 'Inspect', icon: '🎥' },
    { id: 'digitaltwin', label: '3D Twin', icon: '🌐' },
    { id: 'guardian', label: 'Guardian GPS', icon: '🛡️' },
    { id: 'obd', label: 'OBD-II', icon: '🔌' },
    { id: 'evbattery', label: 'EV Diags', icon: '🔋' },
    { id: 'matrix', label: 'Matrix', icon: '🔬' },
    { id: 'parts', label: 'Parts', icon: '💰' },
    { id: 'valuation', label: 'Valuation', icon: '💵' },
    { id: 'passport', label: 'Passport', icon: '📜' },
    { id: 'tread', label: 'Tread/IR', icon: '🛞' },
    { id: 'ar', label: 'AR HUD', icon: '🕶️' },
    { id: 'insights', label: 'Fleet', icon: '📊' },
    { id: 'testlab', label: 'Test Lab', icon: '🧪' },
  ]


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50 px-4 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('inspect')}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-xl shadow-cyan-900/40 border border-cyan-400/30 group-hover:scale-105 transition-transform">
                AG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    AutoGuard AI
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-600/60 font-bold tracking-wider">
                      GDVF v2.5
                    </span>
                  </h1>
                </div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">
                  Vehicle Forensics & Tactical GPS
                </p>
              </div>
            </div>

            {/* AI Engine Switcher Badge (Mobile View) */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleProvider}
                title="Click to toggle AI Engine (Local Ollama vs Cloud Gemini)"
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                  provider === 'ollama'
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                    : 'bg-blue-950/60 border-blue-700/80 text-blue-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${ollamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {provider === 'ollama' ? 'Local Ollama' : 'Cloud Gemini'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto justify-between md:justify-end">
            {/* AI Engine Switcher Badge (Desktop View) */}
            <button
              onClick={toggleProvider}
              title="Click to toggle between Local Ollama and Cloud Gemini"
              className={`hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg ${
                provider === 'ollama'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40 shadow-emerald-950/30'
                  : 'bg-blue-950/50 border-blue-500/50 text-blue-300 hover:bg-blue-900/40 shadow-blue-950/30'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  provider === 'ollama'
                    ? ollamaOnline
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                      : 'bg-rose-500'
                    : 'bg-blue-400'
                }`}
              />
              <span className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                  {provider === 'ollama' ? '🤖 Local AI (Ollama)' : '☁️ Cloud AI (Gemini)'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {provider === 'ollama'
                    ? ollamaOnline
                      ? `${activeModel} · Online`
                      : 'Ollama Offline'
                    : 'Gemini 2.5 Pro Multimodal'}
                </span>
              </span>
            </button>

            {/* PWA Offline / Online Sync Indicator */}
            <div
              title={
                pwaStatus === 'ONLINE_SYNCED'
                  ? 'PWA Online · Real-Time Cloud Sync'
                  : pwaStatus === 'OFFLINE_CACHED'
                  ? 'PWA Offline · Local Caching Active'
                  : `Syncing ${pendingSync} pending inspection(s)`
              }
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold ${
                pwaStatus === 'ONLINE_SYNCED'
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : pwaStatus === 'OFFLINE_CACHED'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 animate-pulse'
                  : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  pwaStatus === 'ONLINE_SYNCED'
                    ? 'bg-emerald-400'
                    : pwaStatus === 'OFFLINE_CACHED'
                    ? 'bg-amber-400'
                    : 'bg-cyan-400 animate-ping'
                }`}
              />
              <span>{pwaStatus === 'ONLINE_SYNCED' ? 'PWA SYNCED' : 'PWA FIELD MODE'}</span>
            </div>


            <nav className="flex gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-inner overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    view === t.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <HudAlertOverlay />

      <main className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1">{children}</main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500 font-mono bg-slate-950/80">
        AutoGuard AI — Global Director of Vehicle Forensics & Reconditioning (GDVF) · Universal Vehicle Diagnostic Engine
      </footer>
    </div>
  )
}
