import { useMemo, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Flame,
  Crown,
  ListChecks,
  Calculator,
  CalendarRange,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import AnimatedNumber from '../ui/AnimatedNumber'
import {
  getCategoryMeta,
  TILE_COLOR_CLASSES,
  TEXT_COLOR_CLASSES,
  BADGE_COLOR_CLASSES,
} from '../../lib/categoryMeta'
import { usePreferences } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'

const MONTH_LABELS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

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

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null // null = "baru dimulai", no baseline
  return ((current - previous) / previous) * 100
}

function ChangeBadge({ value, goodDirection = 'up' }) {
  if (value === null) {
    return <span className="text-[11px] text-ink/35">Belum ada data bulan lalu</span>
  }
  const flat = Math.abs(value) < 0.5
  const up = value > 0
  const isGood = flat ? null : goodDirection === 'up' ? up : !up
  const color = flat ? 'text-ink/40' : isGood ? 'text-sage' : 'text-rust'
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`}>
      <Icon className="w-3 h-3" strokeWidth={2.25} />
      {flat ? 'Sama dengan' : `${Math.abs(value).toFixed(0)}%`} vs bulan lalu
    </span>
  )
}

function SummaryTile({ label, value, icon: Icon, color, change, goodDirection }) {
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
        <AnimatedNumber value={value} formatter={formatCurrency} />
      </p>
      <div className="mt-2">
        <ChangeBadge value={change} goodDirection={goodDirection} />
      </div>
    </div>
  )
}

function HighlightCard({ label, icon: Icon, color, children }) {
  const tile = TILE_COLOR_CLASSES[color] ?? TILE_COLOR_CLASSES.gold
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-shadow duration-200">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <p className="text-xs uppercase tracking-widest text-ink/50">{label}</p>
      </div>
      {children}
    </div>
  )
}

export default function Analytics({ transactions, categoryMeta }) {
  const { formatCurrency, formatCompactCurrency, currency } = usePreferences()
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const years = useMemo(() => {
    const set = new Set(transactions.map((t) => t.occurred_on.slice(0, 4)))
    set.add(String(now.getFullYear()))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [transactions])

  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))

  const monthly = useMemo(() => {
    function summarize(monthKey) {
      const rows = transactions.filter((t) => t.occurred_on.slice(0, 7) === monthKey)
      let pemasukan = 0
      let pengeluaran = 0
      const catMap = {}
      let biggestExpense = null

      let biggestExpenseAmount = 0
      for (const t of rows) {
        // Konversi ke mata uang tampilan aktif — transaksi bisa dicatat
        // dalam mata uang berbeda-beda.
        const amount = convertAmount(t.amount, rowCurrency(t), currency)
        if (t.type === 'pemasukan') {
          pemasukan += amount
        } else {
          pengeluaran += amount
          catMap[t.category] = (catMap[t.category] || 0) + amount
          // Dibandingkan dengan nilai yang SUDAH dikonversi, supaya $50
          // tidak kalah "besar" dari Rp50.000 hanya karena angka mentahnya
          // lebih kecil.
          if (!biggestExpense || amount > biggestExpenseAmount) {
            biggestExpense = t
            biggestExpenseAmount = amount
          }
        }
      }

      const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] || null
      const expenseCount = rows.filter((t) => t.type === 'pengeluaran').length
      const avgExpense = expenseCount > 0 ? pengeluaran / expenseCount : 0

      return {
        rows,
        pemasukan,
        pengeluaran,
        saldo: pemasukan - pengeluaran,
        totalCount: rows.length,
        expenseCount,
        incomeCount: rows.length - expenseCount,
        avgExpense,
        biggestExpense,
        topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
        categoryShare: topCategory && pengeluaran > 0 ? (topCategory[1] / pengeluaran) * 100 : 0,
      }
    }

    return { current: summarize(currentMonthKey), previous: summarize(prevMonthKey) }
  }, [transactions, currentMonthKey, prevMonthKey, currency])

  const { current, previous } = monthly

  const yearlyData = useMemo(() => {
    const map = {}
    for (let m = 0; m < 12; m++) {
      map[m] = { month: m, bulan: MONTH_LABELS_ID[m], pemasukan: 0, pengeluaran: 0 }
    }
    for (const t of transactions) {
      if (t.occurred_on.slice(0, 4) !== selectedYear) continue
      const m = Number(t.occurred_on.slice(5, 7)) - 1
      map[m][t.type] += convertAmount(t.amount, rowCurrency(t), currency)
    }
    let running = 0
    return Object.values(map).map((row) => {
      const net = row.pemasukan - row.pengeluaran
      running += net
      return { ...row, net, cumulative: running }
    })
  }, [transactions, selectedYear, currency])

  const yearHasData = yearlyData.some((row) => row.pemasukan > 0 || row.pengeluaran > 0)
  const yearTotals = yearlyData.reduce(
    (acc, row) => ({
      pemasukan: acc.pemasukan + row.pemasukan,
      pengeluaran: acc.pengeluaran + row.pengeluaran,
    }),
    { pemasukan: 0, pengeluaran: 0 }
  )

  const topCatMeta = current.topCategory ? getCategoryMeta(current.topCategory.name, categoryMeta) : null
  const biggestMeta = current.biggestExpense ? getCategoryMeta(current.biggestExpense.category, categoryMeta) : null

  return (
    <div className="space-y-8">
      {/* Ringkasan bulan ini */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="w-4 h-4 text-gold" strokeWidth={1.75} />
          <p className="text-xs uppercase tracking-widest text-gold">Ringkasan Bulan Ini</p>
        </div>
        <h3 className="font-display text-xl text-ledger mb-4">
          {MONTH_NAMES_ID[now.getMonth()]} {now.getFullYear()}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <SummaryTile
            label="Pemasukan"
            value={current.pemasukan}
            icon={TrendingUp}
            color="sage"
            change={pctChange(current.pemasukan, previous.pemasukan)}
            goodDirection="up"
          />
          <SummaryTile
            label="Pengeluaran"
            value={current.pengeluaran}
            icon={TrendingDown}
            color="rust"
            change={pctChange(current.pengeluaran, previous.pengeluaran)}
            goodDirection="down"
          />
          <SummaryTile
            label="Saldo Bersih"
            value={current.saldo}
            icon={Wallet}
            color="gold"
            change={pctChange(current.saldo, previous.saldo)}
            goodDirection="up"
          />
        </div>
      </div>

      {/* Highlights: pengeluaran terbesar, kategori terbesar, total transaksi, rata-rata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <HighlightCard label="Pengeluaran Terbesar" icon={Flame} color="rust">
          {current.biggestExpense ? (
            <div className="space-y-2">
              <p className="font-display text-xl text-rust tabular">
                {formatCurrency(
                  convertAmount(current.biggestExpense.amount, rowCurrency(current.biggestExpense), currency)
                )}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                  biggestMeta ? BADGE_COLOR_CLASSES[biggestMeta.color] : ''
                }`}
              >
                {biggestMeta && <biggestMeta.icon className="w-3.5 h-3.5" strokeWidth={2} />}
                {current.biggestExpense.category}
              </span>
              <p className="text-[11px] text-ink/40 truncate">
                {current.biggestExpense.note || 'Tanpa catatan'} ·{' '}
                {new Date(current.biggestExpense.occurred_on).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink/40 italic font-display py-4">Belum ada pengeluaran</p>
          )}
        </HighlightCard>

        <HighlightCard label="Kategori Terbesar" icon={Crown} color="gold">
          {current.topCategory ? (
            <div className="space-y-2">
              <p className="font-display text-xl text-gold tabular">
                {formatCurrency(current.topCategory.amount)}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                  topCatMeta ? BADGE_COLOR_CLASSES[topCatMeta.color] : ''
                }`}
              >
                {topCatMeta && <topCatMeta.icon className="w-3.5 h-3.5" strokeWidth={2} />}
                {current.topCategory.name}
              </span>
              <p className="text-[11px] text-ink/40">
                {current.categoryShare.toFixed(0)}% dari total pengeluaran bulan ini
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink/40 italic font-display py-4">Belum ada pengeluaran</p>
          )}
        </HighlightCard>

        <HighlightCard label="Total Transaksi" icon={ListChecks} color="teal">
          <p className="font-display text-2xl text-teal tabular mb-2">
            <AnimatedNumber value={current.totalCount} formatter={(n) => Math.round(n).toLocaleString('id-ID')} />
          </p>
          <p className="text-[11px] text-ink/40">
            {current.incomeCount} pemasukan · {current.expenseCount} pengeluaran
          </p>
        </HighlightCard>

        <HighlightCard label="Rata-rata Pengeluaran" icon={Calculator} color="rust">
          <p className="font-display text-xl text-rust tabular mb-2">
            <AnimatedNumber value={current.avgExpense} formatter={formatCurrency} />
          </p>
          <p className="text-[11px] text-ink/40">per transaksi pengeluaran bulan ini</p>
        </HighlightCard>
      </div>

      {/* Grafik tahunan */}
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-shadow duration-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink/50">Grafik Tahunan</p>
            <p className="text-[11px] text-ink/35 mt-0.5">
              Pemasukan, pengeluaran, dan saldo kumulatif per bulan
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-paper border border-line rounded-xl px-3 py-1.5 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="text-right">
              <p className="text-[11px] text-ink/40">Total {selectedYear}</p>
              <p className="text-xs font-mono tabular text-ink/70">
                <span className="text-sage">+{formatCompactCurrency(yearTotals.pemasukan)}</span>{' '}
                <span className="text-rust">−{formatCompactCurrency(yearTotals.pengeluaran)}</span>
              </p>
            </div>
          </div>
        </div>

        {yearHasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={yearlyData}>
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
              <Bar dataKey="pemasukan" name="Pemasukan" fill={COLOR.sage} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill={COLOR.rust} radius={[3, 3, 0, 0]} maxBarSize={20} />
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
        ) : (
          <p className="text-xs text-ink/40 py-16 text-center italic font-display">
            Belum ada data transaksi di tahun {selectedYear}
          </p>
        )}
      </div>
    </div>
  )
}
