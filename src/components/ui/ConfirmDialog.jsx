import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

// Dialog konfirmasi generik sebelum aksi yang tidak bisa dibatalkan
// (mis. hapus transaksi/kategori). Dibangun di atas komponen Modal yang
// sudah ada supaya tampilannya tetap konsisten dengan UI lain.
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
  tone = 'rust',
}) {
  // Tailwind JIT butuh nama kelas literal, bukan hasil interpolasi string,
  // jadi tone dipetakan ke kelas lengkap di sini.
  const toneClasses =
    tone === 'gold' ? 'bg-gold/10 text-gold' : 'bg-rust/10 text-rust'

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${toneClasses} flex items-center justify-center shrink-0`}>
            <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-ink/70">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl py-2 text-sm font-medium text-ink/60 border border-line hover:bg-paper transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rust text-paper rounded-xl py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Memproses…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
