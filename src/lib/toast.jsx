import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const TONE = {
  success: {
    icon: CheckCircle2,
    classes: 'border-sage/25 bg-sage/10 text-sage',
  },
  error: {
    icon: AlertTriangle,
    classes: 'border-rust/25 bg-rust/10 text-rust',
  },
  info: {
    icon: Info,
    classes: 'border-gold/25 bg-gold/10 text-gold',
  },
}

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const showToast = useCallback(
    (message, { tone = 'info', duration = 4000, action = null } = {}) => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, tone, action }])
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  const toast = {
    success: (message, opts) => showToast(message, { ...opts, tone: 'success' }),
    error: (message, opts) => showToast(message, { ...opts, tone: 'error' }),
    info: (message, opts) => showToast(message, { ...opts, tone: 'info' }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const config = TONE[t.tone] ?? TONE.info
          const Icon = config.icon
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-elegant bg-surface animate-fade-in ${config.classes}`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink/80">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action.onClick?.()
                      dismiss(t.id)
                    }}
                    className="mt-1 text-xs font-semibold underline decoration-dotted underline-offset-2 hover:text-current"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup notifikasi"
                className="text-ink/30 hover:text-ink/60 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fail soft: app should not crash if provider is missing somewhere.
    return { success: () => {}, error: () => {}, info: () => {} }
  }
  return ctx
}
