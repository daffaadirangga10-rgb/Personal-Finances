import { memo, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { usePreferences } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'

const formatMonthLabel = (m) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('id-ID', {
    month: 'short',
    year: '2-digit',
  })
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = (d.getDay() + 6) % 7 // Monday = 0 ... Sunday = 6
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

// Chart tokens resolve through the app's CSS variables so they follow the
// active dark/light theme automatically.
const COLOR = {
  gold: 'rgb(var(--color-gold))',
  sage: 'rgb(var(--color-sage))',
  rust: 'rgb(var(--color-rust))',
  teal: 'rgb(var(--color-teal))',
  ink: 'rgb(var(--color-ink) / 0.45)',
  line: 'rgb(var(--color-line))',
  surface: 'rgb(var(--color-surface))',
}

const PALETTE = [COLOR.gold, COLOR.sage, COLOR.rust, COLOR.teal, 'rgb(var(--color-ink) / 0.4)', 'rgb(var(--color-ledger) / 0.55)']

const tooltipStyle = {
  background: COLOR.surface,
  border: `1px solid ${COLOR.line}`,
  borderRadius: 12,
  color: 'rgb(var(--color-ink))',
  fontSize: 12,
  padding: '10px 14px',
  boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)',
}

const legendStyle = { fontSize: 11, paddingTop: 8 }
const axisTick = { fontSize: 11, fill: COLOR.ink }
const axisLine = { stroke: COLOR.line }
const gridProps = { stroke: COLOR.line, vertical: false, strokeDasharray: '3 6' }

// Tailwind-friendly per-accent styling so each ChartCard can carry its own
// "hero" color without ad-hoc string concatenation.
const TINT = {
  gold: { text: 'text-gold', from: 'from-gold/25', to: 'to-gold/0', border: 'border-gold/25', glow: 'bg-gold' },
  sage: { text: 'text-sage', from: 'from-sage/25', to: 'to-sage/0', border: 'border-sage/25', glow: 'bg-sage' },
  rust: { text: 'text-rust', from: 'from-rust/25', to: 'to-rust/0', border: 'border-rust/25', glow: 'bg-rust' },
  teal: { text: 'text-teal', from: 'from-teal/25', to: 'to-teal/0', border: 'border-teal/25', glow: 'bg-teal' },
}

function TrendPill({ direction = 'flat' }) {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  const tone = direction === 'up' ? 'sage' : direction === 'down' ? 'rust' : 'ink'
  const cls = tone === 'ink' ? 'text-ink/40 bg-ink/5' : tone === 'sage' ? 'text-sage bg-sage/10' : 'text-rust bg-rust/10'
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${cls}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
    </span>
  )
}

const ChartCard = memo(function ChartCard({
  icon: Icon,
  title,
  subtitle,
  tint = 'gold',
  highlight,
  highlightLabel,
  trend,
  children,
  hasData,
  delay = 0,
}) {
  const t = TINT[tint] ?? TINT.gold

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group relative overflow-hidden bg-surface border border-line rounded-2xl
      p-5 sm:p-6 shadow-soft hover:shadow-elegant hover:-translate-y-0.5
      transition-all duration-200 ease-out motion-safe:animate-rise-in"
    >
      {/* Soft gradient glow tucked in the corner for a premium, lit feel */}
      <div
        className={`pointer-events-none absolute -top-14 -right-14 w-44 h-44 rounded-full
        blur-3xl opacity-[0.14] group-hover:opacity-[0.22] transition-opacity duration-300 ${t.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3 mb-4 pb-4 border-b border-line/60">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              bg-gradient-to-br ${t.from} ${t.to} border ${t.border} ${t.text} shadow-sm`}
            >
              <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-ink/50 truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-ink/35 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {highlight != null && (
          <div className="text-right shrink-0">
            <p className={`font-display text-lg tabular leading-tight ${t.text}`}>{highlight}</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              {trend && <TrendPill direction={trend} />}
              {highlightLabel && <p className="text-[10px] text-ink/35">{highlightLabel}</p>}
            </div>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="relative">{children}</div>
      ) : (
        <p className="relative text-xs text-ink/40 py-16 text-center italic font-display">Belum ada data</p>
      )}
    </div>
  )
})

function AnalyticsCharts({ transactions }) {
  const { formatCurrency, formatCompactCurrency, currency } = usePreferences()
  const { byCategory, byMonth, byWeek, totalExpense, netAll, weekTrend } = useMemo(() => {
    const catMap = {}
    const monthMap = {}
    const weekMap = {}

    for (const t of transactions) {
      // Konversi ke mata uang tampilan aktif dulu — transaksi bisa dicatat
      // dalam mata uang berbeda-beda (mis. sebagian IDR, sebagian USD).
      const amount = convertAmount(t.amount, rowCurrency(t), currency)

      // Pengeluaran per kategori
      if (t.type === 'pengeluaran') {
        catMap[t.category] = (catMap[t.category] || 0) + amount
      }

      // Cash flow bulanan & pemasukan vs pengeluaran
      const m = t.occurred_on.slice(0, 7)
      if (!monthMap[m]) monthMap[m] = { key: m, bulan: formatMonthLabel(m), pemasukan: 0, pengeluaran: 0 }
      monthMap[m][t.type] += amount

      // Trend mingguan
      const weekStart = startOfWeek(t.occurred_on)
      const wKey = weekStart.toISOString().slice(0, 10)
      if (!weekMap[wKey]) {
        weekMap[wKey] = {
          key: wKey,
          sortKey: weekStart.getTime(),
          minggu: weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          pemasukan: 0,
          pengeluaran: 0,
        }
      }
      weekMap[wKey][t.type] += amount
    }

    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    let running = 0
    const byMonth = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => {
        const net = row.pemasukan - row.pengeluaran
        running += net
        return { ...row, net, cumulative: running }
      })

    const byWeek = Object.values(weekMap)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-8)

    const totalExpense = byCategory.reduce((sum, c) => sum + c.value, 0)
    const netAll = running

    // Bandingkan dua minggu terakhir untuk indikator naik/turun sederhana.
    let weekTrend = { direction: 'flat', delta: 0 }
    if (byWeek.length >= 2) {
      const last = byWeek[byWeek.length - 1]
      const prev = byWeek[byWeek.length - 2]
      const netLast = last.pemasukan - last.pengeluaran
      const netPrev = prev.pemasukan - prev.pengeluaran
      const delta = netLast - netPrev
      weekTrend = { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', delta }
    }

    return { byCategory, byMonth, byWeek, totalExpense, netAll, weekTrend }
  }, [transactions, currency])

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold mb-1">Analitik</p>
        <h3 className="font-display text-xl text-ledger">Grafik Keuangan</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Cash Flow Bulanan */}
        <ChartCard
          icon={Activity}
          title="Cash Flow Bulanan"
          subtitle="Arus kas bersih & saldo kumulatif per bulan"
          tint="gold"
          hasData={byMonth.length > 0}
          highlight={formatCompactCurrency(netAll)}
          highlightLabel="Saldo berjalan"
          trend={netAll > 0 ? 'up' : netAll < 0 ? 'down' : 'flat'}
          delay={0}
        >
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={byMonth}>
              <defs>
                <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.gold} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLOR.gold} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNetPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.sage} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLOR.sage} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="gradNetNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.rust} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLOR.rust} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="bulan" tick={axisTick} axisLine={axisLine} tickLine={false} />
              <YAxis
                tick={axisTick}
                width={44}
                axisLine={axisLine}
                tickLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-ink) / 0.04)' }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Saldo kumulatif"
                fill="url(#gradCumulative)"
                stroke="none"
                legendType="none"
                tooltipType="none"
              />
              <Bar dataKey="net" name="Arus kas bersih" radius={[4, 4, 4, 4]} maxBarSize={26}>
                {byMonth.map((row, i) => (
                  <Cell key={i} fill={row.net >= 0 ? 'url(#gradNetPos)' : 'url(#gradNetNeg)'} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Saldo kumulatif"
                stroke={COLOR.gold}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.gold, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Pengeluaran per Kategori */}
        <ChartCard
          icon={PieChartIcon}
          title="Pengeluaran per Kategori"
          subtitle="Distribusi pengeluaran berdasarkan kategori"
          tint="rust"
          hasData={byCategory.length > 0}
          highlight={formatCompactCurrency(totalExpense)}
          highlightLabel="Total keluar"
          delay={60}
        >
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <defs>
                  {PALETTE.map((c, i) => (
                    <linearGradient key={i} id={`gradSlice${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={1} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.72} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke={COLOR.surface}
                  strokeWidth={2}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={`url(#gradSlice${i % PALETTE.length})`} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>

            {byCategory.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center -mt-4">
                <p className="text-[10px] uppercase tracking-widest text-ink/35">Total</p>
                <p className="font-display text-base text-rust tabular">{formatCompactCurrency(totalExpense)}</p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* 3. Pemasukan vs Pengeluaran */}
        <ChartCard
          icon={BarChart3}
          title="Pemasukan vs Pengeluaran"
          subtitle="Perbandingan per bulan"
          tint="sage"
          hasData={byMonth.length > 0}
          highlight={formatCompactCurrency(netAll)}
          highlightLabel="Selisih bersih"
          trend={netAll > 0 ? 'up' : netAll < 0 ? 'down' : 'flat'}
          delay={120}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMonth}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.sage} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLOR.sage} stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.rust} stopOpacity={1} />
                  <stop offset="100%" stopColor={COLOR.rust} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="bulan" tick={axisTick} axisLine={axisLine} tickLine={false} />
              <YAxis
                tick={axisTick}
                width={44}
                axisLine={axisLine}
                tickLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-ink) / 0.04)' }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              <Bar dataKey="pemasukan" name="Pemasukan" fill="url(#gradIncome)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="url(#gradExpense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Trend Mingguan */}
        <ChartCard
          icon={LineChartIcon}
          title="Trend Mingguan"
          subtitle="8 minggu terakhir (mulai Senin)"
          tint="teal"
          hasData={byWeek.length > 0}
          highlight={formatCompactCurrency(Math.abs(weekTrend.delta))}
          highlightLabel="vs minggu lalu"
          trend={weekTrend.direction}
          delay={180}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={byWeek}>
              <defs>
                <linearGradient id="gradWeekIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.sage} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLOR.sage} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWeekOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR.rust} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLOR.rust} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="minggu" tick={axisTick} axisLine={axisLine} tickLine={false} />
              <YAxis
                tick={axisTick}
                width={44}
                axisLine={axisLine}
                tickLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} cursor={{ stroke: COLOR.line }} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="pemasukan" fill="url(#gradWeekIn)" stroke="none" legendType="none" tooltipType="none" />
              <Area type="monotone" dataKey="pengeluaran" fill="url(#gradWeekOut)" stroke="none" legendType="none" tooltipType="none" />
              <Line
                type="monotone"
                dataKey="pemasukan"
                name="Pemasukan"
                stroke={COLOR.sage}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.sage, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="pengeluaran"
                name="Pengeluaran"
                stroke={COLOR.rust}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR.rust, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default memo(AnalyticsCharts)
