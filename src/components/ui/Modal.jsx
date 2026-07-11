import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return

    function handleKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-line
        rounded-2xl shadow-elegant animate-modal-in"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-line bg-surface rounded-t-2xl">
          <h3 className="font-display text-lg text-ledger">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-paper transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
