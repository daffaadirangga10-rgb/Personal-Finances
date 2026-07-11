import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Catches render/lifecycle errors anywhere in its subtree so one broken
 * component (e.g. a chart choking on unexpected data) can't blank out the
 * entire app. Must be a class component — React only supports error
 * boundaries via getDerivedStateFromError / componentDidCatch, there's no
 * hook equivalent (yet).
 *
 * Usage:
 *   <ErrorBoundary>...</ErrorBoundary>                     — generic fallback
 *   <ErrorBoundary label="Dashboard">...</ErrorBoundary>    — named fallback
 *   <ErrorBoundary resetKey={activePage}>...</ErrorBoundary> — auto-recovers
 *     when resetKey changes (e.g. navigating to a different page), so the
 *     boundary doesn't stay stuck in its error state forever.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Centralized place to wire up error reporting (e.g. Sentry) later.
    console.error('[ErrorBoundary]', this.props.label || '', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }
      return (
        <div className="bg-surface border border-line rounded-2xl p-10 shadow-soft flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-rust/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rust" strokeWidth={1.5} />
          </div>
          <p className="text-ink/70 text-sm font-display">
            {this.props.label ? `${this.props.label} gagal dimuat` : 'Terjadi kesalahan'}
          </p>
          <p className="text-ink/40 text-xs max-w-sm">
            Ada masalah saat menampilkan bagian ini. Data kamu aman — coba muat ulang bagian ini,
            atau pindah ke halaman lain lalu kembali lagi.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-gold hover:text-ledger font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
