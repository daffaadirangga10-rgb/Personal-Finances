import { useMemo, useState } from 'react'
import {
  Filter,
  RotateCcw,
  Wallet,
  TrendingUp,
  TrendingDown,
  ListChecks,
  FileText,
  FileSpreadsheet,
  Loader2,
  CalendarRange,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import AnimatedNumber from '../ui/AnimatedNumber'
import { getCategoryMeta, BADGE_COLOR_CLASSES, TILE_COLOR_CLASSES, TEXT_COLOR_CLASSES } from '../../lib/categoryMeta'
import { usePreferences } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'
import { useToast } from '../../lib/toast.jsx'

const formatMonthLabel = (m) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('id-ID', {
    month: 'short',
    year: '2-digit',
  })
}

// Chart tokens resolve through the app's CSS variables so they follow the
// active dark/light theme automatically, same convention as AnalyticsCharts.
const COLOR = {
  gold: 'rgb(var(--color-gold))',
  sage: 'rgb(var(--color-sage))',
  rust: 'rgb(var(--color-rust))',
  teal: 'rgb(var(--color-teal))',
  ink: 'rgb(var(--color-ink) / 0.45)',
  line: 'rgb(var(--color-line))',
  surface: 'rgb(var(--color-surface))',
}
const PALETTE = [COLOR.gold, COLOR.sage, COLOR.rust, COLOR.teal, '#8C9A8F', '#7A5C3E']

const tooltipStyle = {
  background: COLOR.surface,
  border: `1px solid ${COLOR.line}`,
  borderRadius: 8,
  color: 'rgb(var(--color-ink))',
  fontSize: 12,
  padding: '8px 12px',
}
const axisTick = { fontSize: 11, fill: COLOR.ink }
const axisLine = { stroke: COLOR.line }

const DATE_PRESETS = [
  { key: 'bulan-ini', label: 'Bulan Ini' },
  { key: 'bulan-lalu', label: 'Bulan Lalu' },
  { key: '3-bulan', label: '3 Bulan Terakhir' },
  { key: 'tahun-ini', label: 'Tahun Ini' },
  { key: 'semua', label: 'Semua' },
]

const TYPE_FILTERS = [
  { key: 'semua', label: 'Semua Jenis' },
  { key: 'pemasukan', label: 'Pemasukan' },
  { key: 'pengeluaran', label: 'Pengeluaran' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function getPresetRange(key) {
  const now = new Date()
  switch (key) {
    case 'bulan-ini':
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    case 'bulan-lalu':
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    case '3-bulan':
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    case 'tahun-ini':
      return {
        from: toDateStr(new Date(now.getFullYear(), 0, 1)),
        to: toDateStr(new Date(now.getFullYear(), 11, 31)),
      }
    case 'semua':
    default:
      return { from: '', to: '' }
  }
}

function SummaryTile({ label, value, icon: Icon, color, sub }) {
  const { formatCurrency } = usePreferences()
  const tile = TILE_COLOR_CLASSES[color] ?? TILE_COLOR_CLASSES.gold
  const text = TEXT_COLOR_CLASSES[color] ?? TEXT_COLOR_CLASSES.gold
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-xs uppercase tracking-widest text-ink/50">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      </div>
      <p className={`font-display text-2xl tabular ${text}`}>
        {typeof value === 'number' && sub === undefined ? (
          <AnimatedNumber value={value} formatter={formatCurrency} />
        ) : (
          <AnimatedNumber value={value} formatter={(n) => Math.round(n).toLocaleString('id-ID')} />
        )}
      </p>
      {sub && <p className="text-[11px] text-ink/40 mt-2">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, hasData }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-shadow duration-200">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest text-ink/50">{title}</p>
        {subtitle && <p className="text-[11px] text-ink/35 mt-0.5">{subtitle}</p>}
      </div>
      {hasData ? (
        children
      ) : (
        <p className="text-xs text-ink/40 py-16 text-center italic font-display">Belum ada data</p>
      )}
    </div>
  )
}

// Halaman Laporan bersifat read-only: hanya membaca `transactions` yang
// sudah dimuat App.jsx dan tidak pernah menulis/mengubah data transaksi.
export default function Laporan({ transactions, categories, categoryMeta }) {
  const { formatCurrency, formatDate, formatCompactCurrency, currency } = usePreferences()
  const toast = useToast()
  const [preset, setPreset] = useState('bulan-ini')
  const initialRange = getPresetRange('bulan-ini')
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [typeFilter, setTypeFilter] = useState('semua')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [exporting, setExporting] = useState(null) // 'pdf' | 'excel' | null

  function applyPreset(key) {
    setPreset(key)
    const range = getPresetRange(key)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  function handleDateChange(which, value) {
    setPreset('kustom')
    if (which === 'from') setDateFrom(value)
    else setDateTo(value)
  }

  function toggleCategory(name) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    )
  }

  function resetFilters() {
    setPreset('bulan-ini')
    const range = getPresetRange('bulan-ini')
    setDateFrom(range.from)
    setDateTo(range.to)
    setTypeFilter('semua')
    setSelectedCategories([])
  }

  const availableCategories = useMemo(() => {
    const names =
      categories && categories.length
        ? categories
            .filter((c) => typeFilter === 'semua' || c.type === typeFilter)
            .map((c) => c.name)
        : Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))).sort()
    return names
  }, [categories, transactions, typeFilter])

  // Buang kategori yang sudah tidak relevan (mis. ganti filter jenis)
  // dari daftar terpilih, tanpa menyentuh data transaksi itu sendiri.
  const activeSelectedCategories = useMemo(
    () => selectedCategories.filter((c) => availableCategories.includes(c)),
    [selectedCategories, availableCategories]
  )

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (dateFrom && t.occurred_on < dateFrom) return false
      if (dateTo && t.occurred_on > dateTo) return false
      if (typeFilter !== 'semua' && t.type !== typeFilter) return false
      if (activeSelectedCategories.length > 0 && !activeSelectedCategories.includes(t.category)) return false
      return true
    })
  }, [transactions, dateFrom, dateTo, typeFilter, activeSelectedCategories])

  const summary = useMemo(() => {
    let pemasukan = 0
    let pengeluaran = 0
    for (const t of filtered) {
      const amount = convertAmount(t.amount, rowCurrency(t), currency)
      if (t.type === 'pemasukan') pemasukan += amount
      else pengeluaran += amount
    }
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, count: filtered.length }
  }, [filtered, currency])

  const { byMonth, byCategory } = useMemo(() => {
    const monthMap = {}
    const catMap = {}
    for (const t of filtered) {
      const amount = convertAmount(t.amount, rowCurrency(t), currency)
      const m = t.occurred_on.slice(0, 7)
      if (!monthMap[m]) monthMap[m] = { key: m, bulan: formatMonthLabel(m), pemasukan: 0, pengeluaran: 0 }
      monthMap[m][t.type] += amount

      if (t.type === 'pengeluaran') {
        catMap[t.category] = (catMap[t.category] || 0) + amount
      }
    }

    let running = 0
    const byMonth = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => {
        const net = row.pemasukan - row.pengeluaran
        running += net
        return { ...row, net, cumulative: running }
      })

    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { byMonth, byCategory }
  }, [filtered, currency])

  async function handleExportPDF() {
    if (filtered.length === 0) return
    setExporting('pdf')
    try {
      const { exportTransactionsToPDF } = await import('../../lib/exportUtils')
      exportTransactionsToPDF(filtered, formatCurrency, currency)
    } catch {
      toast.error('Gagal membuat PDF. Coba lagi.')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportExcel() {
    if (filtered.length === 0) return
    setExporting('excel')
    try {
      const { exportTransactionsToExcel } = await import('../../lib/exportUtils')
      exportTransactionsToExcel(filtered, currency)
    } catch {
      toast.error('Gagal membuat file Excel. Coba lagi.')
    } finally {
      setExporting(null)
    }
  }

  const hasActiveFilters =
    preset !== 'bulan-ini' || typeFilter !== 'semua' || activeSelectedCategories.length > 0

  const rangeLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatDate(dateFrom) : '…'} – ${dateTo ? formatDate(dateTo) : '…'}`
      : 'Seluruh periode'

  return (
    <div className="space-y-8">
      {/* Panel Filter */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-soft space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gold" strokeWidth={1.75} />
            <p className="text-xs uppercase tracking-widest text-ink/50">Filter Laporan</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              Reset Filter
            </button>
          )}
        </div>

        {/* Filter tanggal */}
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wider text-ink/40">Periode</p>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  preset === p.key
                    ? 'bg-gold text-paper border-gold'
                    : 'bg-paper text-ink/60 border-line hover:text-ink hover:border-gold/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <label className="flex items-center gap-2 text-xs text-ink/50">
              Dari
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="bg-paper border border-line rounded-xl px-3 py-1.5 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink/50">
              Sampai
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="bg-paper border border-line rounded-xl px-3 py-1.5 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
              />
            </label>
          </div>
        </div>

        {/* Filter jenis */}
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wider text-ink/40">Jenis Transaksi</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTypeFilter(t.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  typeFilter === t.key
                    ? 'bg-ledger text-paper border-ledger'
                    : 'bg-paper text-ink/60 border-line hover:text-ink hover:border-gold/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter kategori */}
        <div className="space-y-2.5">
          <p className="text-[11px] uppercase tracking-wider text-ink/40">
            Kategori {activeSelectedCategories.length > 0 && `(${activeSelectedCategories.length} dipilih)`}
          </p>
          {availableCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((name) => {
                const meta = getCategoryMeta(name, categoryMeta)
                const Icon = meta.icon
                const active = activeSelectedCategories.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCategory(name)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                      active
                        ? BADGE_COLOR_CLASSES[meta.color]
                        : 'bg-paper text-ink/50 border-line hover:text-ink hover:border-gold/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    {name}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink/40 italic font-display">Belum ada kategori</p>
          )}
        </div>
      </div>

      {/* Ringkasan */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="w-4 h-4 text-gold" strokeWidth={1.75} />
          <p className="text-xs uppercase tracking-widest text-gold">Ringkasan · {rangeLabel}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryTile label="Pemasukan" value={summary.pemasukan} icon={TrendingUp} color="sage" />
          <SummaryTile label="Pengeluaran" value={summary.pengeluaran} icon={TrendingDown} color="rust" />
          <SummaryTile label="Saldo Bersih" value={summary.saldo} icon={Wallet} color="gold" />
          <SummaryTile
            label="Jumlah Transaksi"
            value={summary.count}
            icon={ListChecks}
            color="teal"
            sub="transaksi sesuai filter"
          />
        </div>
      </div>

      {/* Export */}
      <div className="space-y-2.5">
        <p className="text-xs uppercase tracking-widest text-ink/50">Ekspor Laporan</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filtered.length === 0 || exporting !== null}
            className="inline-flex items-center gap-2 bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-medium text-ink/80
            hover:text-ink hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-200 ease-out
            disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none shadow-soft"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin text-gold" strokeWidth={1.75} />
            ) : (
              <FileText className="w-4 h-4 text-gold" strokeWidth={1.75} />
            )}
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filtered.length === 0 || exporting !== null}
            className="inline-flex items-center gap-2 bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-medium text-ink/80
            hover:text-ink hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-200 ease-out
            disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none shadow-soft"
          >
            {exporting === 'excel' ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal" strokeWidth={1.75} />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-teal" strokeWidth={1.75} />
            )}
            Export Excel
          </button>
        </div>
        {filtered.length === 0 && (
          <p className="text-[11px] text-ink/40 italic">Tidak ada transaksi pada filter ini untuk diekspor.</p>
        )}
      </div>

      {/* Grafik */}
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest text-ink/50">Grafik</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Pemasukan vs Pengeluaran"
            subtitle="Arus kas bersih & saldo kumulatif per bulan sesuai filter"
            hasData={byMonth.length > 0}
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={byMonth}>
                <CartesianGrid stroke={COLOR.line} vertical={false} />
                <XAxis dataKey="bulan" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis
                  tick={axisTick}
                  width={44}
                  axisLine={axisLine}
                  tickLine={false}
                  tickFormatter={formatCompactCurrency}
                />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pemasukan" name="Pemasukan" fill={COLOR.sage} radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill={COLOR.rust} radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Saldo kumulatif"
                  stroke={COLOR.gold}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLOR.gold, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Pengeluaran per Kategori"
            subtitle="Distribusi pengeluaran sesuai filter yang aktif"
            hasData={byCategory.length > 0}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke={COLOR.surface}
                  strokeWidth={2}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
