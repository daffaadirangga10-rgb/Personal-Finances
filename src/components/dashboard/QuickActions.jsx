import { memo, useState } from 'react'
import { MinusCircle, PlusCircle, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useToast } from '../../lib/toast.jsx'
import { usePreferences } from '../../lib/preferences.jsx'

const COLOR = {
  rust: { text: 'text-rust', bg: 'bg-rust/10' },
  sage: { text: 'text-sage', bg: 'bg-sage/10' },
  gold: { text: 'text-gold', bg: 'bg-gold/10' },
  teal: { text: 'text-teal', bg: 'bg-teal/10' },
}

const ActionCard = memo(function ActionCard({ icon: Icon, label, color, onClick, loading, delay = 0 }) {
  const c = COLOR[color] ?? COLOR.gold

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{ animationDelay: `${delay}ms` }}
      className="group flex items-center gap-3 w-full text-left bg-surface border border-line
      rounded-2xl px-4 py-3.5 shadow-soft hover:shadow-elegant hover:-translate-y-0.5
      transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-wait disabled:translate-y-0
      motion-safe:animate-rise-in"
    >
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        transition-transform duration-200 group-hover:scale-105 ${c.bg} ${c.text}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.75} />
        ) : (
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        )}
      </span>
      <span className="text-sm font-medium text-ink/80 group-hover:text-ink transition-colors truncate">
        {label}
      </span>
    </button>
  )
})

function QuickActions({ transactions, onAddExpense, onAddIncome }) {
  const [exporting, setExporting] = useState(null) // 'pdf' | 'excel' | null
  const toast = useToast()
  const { formatCurrency, currency } = usePreferences()

  async function handleExportPDF() {
    if (!transactions.length) {
      toast.info('Belum ada transaksi untuk diekspor.')
      return
    }
    setExporting('pdf')
    try {
      const { exportTransactionsToPDF } = await import('../../lib/exportPdf')
      exportTransactionsToPDF(transactions, formatCurrency, currency)
      toast.success('Laporan PDF berhasil diunduh.')
    } catch {
      toast.error('Gagal membuat PDF. Coba lagi.')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportExcel() {
    if (!transactions.length) {
      toast.info('Belum ada transaksi untuk diekspor.')
      return
    }
    setExporting('excel')
    try {
      const { exportTransactionsToExcel } = await import('../../lib/exportExcel')
      exportTransactionsToExcel(transactions, currency)
      toast.success('Laporan Excel berhasil diunduh.')
    } catch {
      toast.error('Gagal membuat file Excel. Coba lagi.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-ink/50">Aksi Cepat</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard icon={MinusCircle} label="Tambah Pengeluaran" color="rust" onClick={onAddExpense} delay={0} />
        <ActionCard icon={PlusCircle} label="Tambah Pemasukan" color="sage" onClick={onAddIncome} delay={40} />
        <ActionCard
          icon={FileText}
          label="Export PDF"
          color="gold"
          onClick={handleExportPDF}
          loading={exporting === 'pdf'}
          delay={80}
        />
        <ActionCard
          icon={FileSpreadsheet}
          label="Export Excel"
          color="teal"
          onClick={handleExportExcel}
          loading={exporting === 'excel'}
          delay={120}
        />
      </div>
    </div>
  )
}

export default memo(QuickActions)
