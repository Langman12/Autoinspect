import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any | null
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo })
    console.error('[AutoGuard ErrorBoundary] Trapped uncaught component exception:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  handleCopyDiagnostics = () => {
    const payload = JSON.stringify(
      {
        errorMessage: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
      null,
      2
    )

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 3000)
    }
  }

  handleResetState = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null })
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (_) {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-red-500 selection:text-slate-950">
          <div className="bg-slate-900/90 border border-red-500/40 rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6 text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl mx-auto text-red-400">
              ⚠️
            </div>

            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-red-400">
                SYSTEM FAULT TRAP &bull; ERROR BOUNDARY
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">
                AutoGuard Subsystem Exception
              </h1>
              <p className="text-slate-400 text-xs mt-2">
                An isolated component error occurred. System telemetry state has been preserved safely.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left font-mono text-xs space-y-2 overflow-x-auto max-h-48">
              <div className="text-red-400 font-bold">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown exception'}
              </div>
              {this.state.error?.stack && (
                <div className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                  {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={this.handleResetState}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-bold text-xs uppercase shadow-lg shadow-red-950/40 active:scale-95 transition-all"
              >
                🔄 Reset & Return Home
              </button>
              <button
                onClick={this.handleCopyDiagnostics}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase font-bold border border-slate-700 active:scale-95 transition-all"
              >
                {this.state.copied ? '✅ Copied Diagnostics' : '📋 Copy Diagnostic Log'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-mono text-xs uppercase font-bold border border-slate-800 active:scale-95 transition-all"
              >
                Hard Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
