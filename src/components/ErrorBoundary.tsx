import React, { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[AutoGuard] Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
          <div className="bg-red-950/50 border border-red-500/30 rounded-3xl p-10 max-w-lg text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-white font-black text-2xl mb-3">System Error</h1>
            <p className="text-red-300 mb-2 font-mono text-sm">{this.state.error?.message}</p>
            <p className="text-slate-400 text-sm mb-8">
              AutoGuard has encountered an unexpected error. Your data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-500"
            >
              Reload AutoGuard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
