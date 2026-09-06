import { useAutoGuardStore, type HudAlert } from '../store/useAutoGuardStore.ts'

export function HudAlertOverlay() {
  const { alerts, dismissAlert } = useAutoGuardStore()

  if (!alerts || alerts.length === 0) return null

  const getSeverityStyles = (severity: HudAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          border: 'border-red-500/80',
          bg: 'bg-red-950/90',
          text: 'text-red-300',
          title: 'text-red-400',
          glow: 'shadow-[0_0_25px_rgba(239,68,68,0.35)]',
          badge: 'bg-red-900/60 border-red-500/70 text-red-200',
          icon: '🚨 CRITICAL FAULT',
        }
      case 'WARNING':
        return {
          border: 'border-amber-500/80',
          bg: 'bg-amber-950/90',
          text: 'text-amber-300',
          title: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          badge: 'bg-amber-900/60 border-amber-500/70 text-amber-200',
          icon: '⚠️ FORENSIC WARNING',
        }
      case 'SUCCESS':
        return {
          border: 'border-emerald-500/80',
          bg: 'bg-emerald-950/90',
          text: 'text-emerald-300',
          title: 'text-emerald-400',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          badge: 'bg-emerald-900/60 border-emerald-500/70 text-emerald-200',
          icon: '✅ VERIFIED',
        }
      case 'INFO':
      default:
        return {
          border: 'border-cyan-500/80',
          bg: 'bg-slate-950/90',
          text: 'text-cyan-300',
          title: 'text-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
          badge: 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200',
          icon: '📡 TELEMETRY',
        }
    }
  }

  return (
    <aside aria-label="Tactical HUD Alerts" className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {alerts.map((alert) => {
        const style = getSeverityStyles(alert.severity)
        return (
          <div
            key={alert.id}
            role="status"
            className={`pointer-events-auto rounded-2xl border ${style.border} ${style.bg} ${style.glow} backdrop-blur-xl p-3.5 transition-all animate-in fade-in slide-in-from-top-3 duration-200 relative overflow-hidden`}
          >
            {/* Top Tactical Bar */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider border ${style.badge}`}>
                {style.icon}
              </span>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
                title="Dismiss alert"
              >
                ✕
              </button>
            </div>

            {/* Title & Body */}
            <h4 className={`text-xs font-black font-mono uppercase tracking-wide ${style.title}`}>
              {alert.title}
            </h4>
            <p className={`text-[11px] leading-relaxed mt-0.5 ${style.text}`}>
              {alert.message}
            </p>

            {/* Progress indicator bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/80">
              <div
                className={`h-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'WARNING' ? 'bg-amber-500' : 'bg-cyan-500'}`}
                style={{
                  animation: `shrinkWidth ${alert.durationMs}ms linear forwards`,
                }}
              />
            </div>
          </div>
        )
      })}
    </aside>
  )
}
