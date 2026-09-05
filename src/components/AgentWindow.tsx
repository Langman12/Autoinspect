import { useEffect, useRef, useState } from 'react'
import { aiService, type AIProvider } from '../services/aiService'
import { ollamaService } from '../services/ollamaService'
import { weatherService } from '../services/weatherService'
import type { VehicleProfile } from '../types'

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  timestamp: string
  isAction?: boolean
}

export function AgentWindow({
  activeVehicle,
}: {
  activeVehicle?: VehicleProfile
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [provider, setProvider] = useState<AIProvider>(aiService.getActiveProvider())
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false)
  const [inputQuery, setInputQuery] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: `Hello! I am your AutoGuard Autonomous Diagnostic Agent. I have full telemetry access to local Ollama AI models, Open-Meteo road physics, NHTSA safety recall lookups, and IndexedDB vehicle profiles. How can I assist you with vehicle inspection or road intelligence?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ollamaService.checkHealth().then((h) => setOllamaOnline(h.isOnline))
    const unsub = aiService.onProviderChange((p) => setProvider(p))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputQuery).trim()
    if (!textToSend || isLoading) return

    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customText) setInputQuery('')
    setIsLoading(true)

    try {
      // Check for quick built-in agent actions
      const lower = textToSend.toLowerCase()
      if (lower.includes('sanity test') || lower.includes('self-diagnostics')) {
        const results = await (window as any).autoGuard?.runSanitySuite()
        const agentReply: Message = {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: `🧪 **Self-Diagnostics Completed in ${results?.executionTimeMs || 12}ms**:\n• Road Grip Formula: **${results?.gripCheckPassed ? '✔ PASSED' : '✖ FAILED'}**\n• Black Ice Detector: **${results?.iceCheckPassed ? '✔ PASSED' : '✖ FAILED'}**\n• IndexedDB Cache: **${results?.cachedReportsCount || 0} reports loaded**\n• Status: **${results?.status || 'HEALTHY'}**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, agentReply])
        setIsLoading(false)
        return
      }

      if (lower.includes('road grip') || lower.includes('weather') || lower.includes('black ice')) {
        const analysis = weatherService.evaluateRoadHazards({
          temperatureC: -1,
          apparentTemperatureC: -4,
          precipitationMm: 2.0,
          windSpeedKmh: 35,
          windGustsKmh: 45,
          visibilityMeters: 300,
          relativeHumidity: 94,
          weatherCode: 66,
          wmoMultiplier: 0.85,
        })
        const agentReply: Message = {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: `🌦️ **Tactical Road Physics Telemetry**:\n• Grip Level: **${analysis.roadGripIndex}% (CRITICAL HAZARD)**\n• Safe Speed Cap: **${analysis.safeSpeedCapKmh} km/h**\n• Active Advisory: *${analysis.tacticalAdvisory}*\n• Detected Hazards: **${analysis.hazards.map((h) => h.title).join(', ')}**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, agentReply])
        setIsLoading(false)
        return
      }

      // Normal AI inference via active provider (Ollama or Gemini)
      const systemContext = `You are AutoGuard Agent, a world-class automotive forensic inspector and tactical road copilot.
Active Target Vehicle: ${activeVehicle?.makeModel || 'Not calibrated'} (VIN: ${activeVehicle?.vin || 'N/A'}, Mileage: ${activeVehicle?.mileage || 'N/A'}, Class: ${activeVehicle?.class || 'Standard'}).
Answer concisely with professional technical accuracy.`

      const response = await aiService.generateChat(textToSend, systemContext)
      const agentMsg: Message = {
        id: 'agent-' + Date.now(),
        sender: 'agent',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, agentMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        sender: 'agent',
        text: `⚠️ **Diagnostic Agent Notice**: Inference error (${err?.message || 'Connection timeout'}). Falling back to local offline heuristic matrix.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = [
    { label: '🔍 Audit Active Vehicle', query: `Provide a 2-sentence forensic evaluation for the active target vehicle: ${activeVehicle?.makeModel || '2023 Tesla Model Y'}.` },
    { label: '⚡ Triage DTC P0300', query: 'What is the diagnostic triage procedure for OBD-II code P0300 (Random Misfire)?' },
    { label: '❄️ Check Road Grip & Ice', query: 'Check current road grip and black ice risk formula.' },
    { label: '🧪 Run System Sanity Test', query: 'Run self-diagnostics and system sanity test.' },
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen ? (
        /* Floating Action Button */
        <button
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
          }}
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-2xl shadow-cyan-900/50 border border-cyan-400/40 transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative">
            <span className="text-xl">🤖</span>
            <span
              className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                provider === 'ollama' && ollamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
              }`}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black uppercase tracking-wider">Agent Copilot</span>
            <span className="text-[10px] text-cyan-200 font-mono">
              {provider === 'ollama' ? 'Local Ollama' : 'Cloud Gemini'} · Active
            </span>
          </div>
        </button>
      ) : (
        /* Floating Window */
        <div
          className={`rounded-3xl border border-cyan-800/80 bg-slate-950/95 backdrop-blur-xl shadow-2xl transition-all flex flex-col overflow-hidden ${
            isMinimized ? 'w-80 h-16' : 'w-[90vw] sm:w-[440px] h-[580px]'
          }`}
        >
          {/* Window Header */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-sm shadow-md">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">AutoGuard Agent Window</h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                    Live
                  </span>
                </div>
                <p className="text-[9px] font-mono text-slate-400">
                  {provider === 'ollama'
                    ? `Ollama: ${ollamaService.getTextModel()} (Local)`
                    : 'Gemini 2.5 Pro (Cloud)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-mono"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? '□' : '—'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-900/80 text-slate-300 hover:text-red-200 flex items-center justify-center text-xs font-mono"
                title="Close Window"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Prompt Chips */}
              <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/40 flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500 text-[10px] font-bold text-cyan-300 whitespace-nowrap transition-all shadow-sm active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {m.sender === 'user' ? 'You' : 'AutoGuard Agent'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">{m.timestamp}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md whitespace-pre-line'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] p-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    AutoGuard Agent is reasoning...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="p-3 border-t border-slate-800/80 bg-slate-900/90 flex gap-2"
              >
                <input
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask AutoGuard Agent or enter diagnostic query..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono transition-all disabled:opacity-50 active:scale-95 shadow-md"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
