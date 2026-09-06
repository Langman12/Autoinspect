import { useEffect, useState } from 'react'
import { voiceMechanicService, type VoiceMechanicMessage } from '../services/voiceMechanicService.ts'

export function VoiceMechanicCopilot({
  onNavigate,
}: {
  onNavigate: (targetView: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<VoiceMechanicMessage[]>(voiceMechanicService.getMessages())
  const [inputVal, setInputVal] = useState('')

  useEffect(() => {
    const unsub = voiceMechanicService.subscribe((msgs, listening) => {
      setMessages([...msgs])
      setIsListening(listening)
    })
    return unsub
  }, [])

  const handleToggleVoice = () => {
    voiceMechanicService.toggleListening((_, action) => {
      if (action) {
        if (action === 'NAVIGATE_CAMERA') onNavigate('inspect')
        else if (action === 'NAVIGATE_OBD') onNavigate('obd')
        else if (action === 'NAVIGATE_3D') onNavigate('digitaltwin')
        else if (action === 'NAVIGATE_PARTS') onNavigate('parts')
        else if (action === 'NAVIGATE_PASSPORT') onNavigate('passport')
        else if (action === 'NAVIGATE_BLACKBOX') onNavigate('guardian')
      }
    })
  }

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return
    voiceMechanicService.processUserVoiceInput(inputVal, (_, action) => {
      if (action) {
        if (action === 'NAVIGATE_CAMERA') onNavigate('inspect')
        else if (action === 'NAVIGATE_OBD') onNavigate('obd')
        else if (action === 'NAVIGATE_3D') onNavigate('digitaltwin')
        else if (action === 'NAVIGATE_PARTS') onNavigate('parts')
        else if (action === 'NAVIGATE_PASSPORT') onNavigate('passport')
      }
    })
    setInputVal('')
  }

  const quickCommands = [
    { label: '🔍 Inspect Engine', cmd: 'Inspect Engine Bay' },
    { label: '🔌 Read OBD DTCs', cmd: 'Read Fault Codes' },
    { label: '🌐 3D Digital Twin', cmd: 'Open 3D Digital Twin Model' },
    { label: '💰 Price Brakes', cmd: 'Calculate parts price for brakes' },
    { label: '📜 Verify Passport', cmd: 'Generate cryptographic passport' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-2xl shadow-cyan-500/50 border-2 border-cyan-300 flex items-center gap-2 hover:scale-105 transition-all group"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🎙️</span>
          <span className="text-xs font-bold uppercase tracking-wider pr-1">
            Voice Co-Pilot
          </span>
        </button>
      )}

      {/* Expanded Voice Copilot Drawer */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 border-2 border-cyan-500/50 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl shadow-cyan-950/80 flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  Tactical Voice Mechanic
                </h3>
                <div className="text-[10px] text-cyan-400 font-bold">
                  {isListening ? '● LISTENING FOR COMMANDS' : 'STANDBY READY'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {/* Audio Wave Visualizer */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-1.5 h-12">
            {[...Array(18)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isListening
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-slate-700'
                }`}
                style={{
                  height: isListening ? `${20 + Math.sin(i * 1.5) * 60}%` : '25%',
                }}
              />
            ))}
          </div>

          {/* Chat Transcript Log */}
          <div className="max-h-48 overflow-y-auto space-y-2.5 text-xs pr-1">
            {messages.slice(-5).map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-2xl ${
                  m.sender === 'USER'
                    ? 'bg-blue-600/30 border border-blue-500/40 text-blue-200 ml-6'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                }`}
              >
                <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">
                  {m.sender === 'USER' ? '👤 INCOMING VOICE' : '🤖 AI MECHANIC'}
                </div>
                <div className="leading-relaxed">{m.text}</div>
              </div>
            ))}
          </div>

          {/* Quick Command Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickCommands.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  voiceMechanicService.processUserVoiceInput(q.cmd, (_, action) => {
                    if (action) {
                      if (action === 'NAVIGATE_CAMERA') onNavigate('inspect')
                      else if (action === 'NAVIGATE_OBD') onNavigate('obd')
                      else if (action === 'NAVIGATE_3D') onNavigate('digitaltwin')
                      else if (action === 'NAVIGATE_PARTS') onNavigate('parts')
                      else if (action === 'NAVIGATE_PASSPORT') onNavigate('passport')
                    }
                  })
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-cyan-300 transition-all"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Voice Input Trigger & Text Form */}
          <form onSubmit={handleSubmitText} className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-3 rounded-2xl border transition-all ${
                isListening
                  ? 'bg-red-600 border-red-400 text-white animate-pulse'
                  : 'bg-cyan-500 border-cyan-400 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              🎙️
            </button>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Speak or type command..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </form>
        </div>
      )}
    </div>
  )
}
