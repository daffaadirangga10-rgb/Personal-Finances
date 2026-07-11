import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PiggyBank,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { getCategoryMeta, TILE_COLOR_CLASSES, DEFAULT_CATEGORY_NAMES } from '../../lib/categoryMeta'
import StatCard from '../ui/StatCard'
import { usePreferences, CURRENCIES } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'
import { useToast } from '../../lib/toast.jsx'
import { CardGridSkeleton } from '../ui/Skeleton'
import { formatThousands, parseAmount } from '../../lib/amountInput'

// Fallback jika kategori pengeluaran dari Supabase belum termuat. Diambil
// dari sumber tunggal di lib/categoryMeta.js supaya selalu sinkron dengan
// kategori bawaan yang di-seed ke akun baru.
const DEFAULT_EXPENSE_CATEGORIES = DEFAULT_CATEGORY_NAMES.pengeluaran

const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function progressTone(pct) {
  if (pct >= 100) return { bar: 'bg-rust', text: 'text-rust' }
  if (pct >= 80) return { bar: 'bg-gold', text: 'text-gold' }
  return { bar: 'bg-sage', text: 'text-sage' }
}

export default function Budget({ userId, transactions, expenseCategories, categoryMeta, onBudgetSaved }) {
  const { formatCurrency, currency } = usePreferences()
  const currencyMeta = CURRENCIES[currency] ?? CURRENCIES.IDR
  const EXPENSE_CATEGORIES = useMemo(
    () =>
      expenseCategories?.length
        ? expenseCategories.map((c) => c.name)
        : DEFAULT_EXPENSE_CATEGORIES,
    [expenseCategories]
  )

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [savingCategory, setSavingCategory] = useState(null)
  const toast = useToast()

  const key = useMemo(() => monthKey(cursor), [cursor])
  const nextKey = useMemo(
    () => monthKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)),
    [cursor]
  )

  const loadBudgets = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', key)
    setBudgets(data || [])
    setDrafts({})
    setLoading(false)
  }, [userId, key])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  // Total pengeluaran per kategori pada bulan yang sedang dilihat, dihitung
  // dari data transaksi yang sudah dimuat di App (tidak perlu query ulang).
  const spentByCategory = useMemo(() => {
    const map = {}
    for (const t of transactions) {
      if (t.type !== 'pengeluaran') continue
      if (!t.occurred_on || t.occurred_on < key || t.occurred_on >= nextKey) continue
      map[t.category] = (map[t.category] || 0) + convertAmount(t.amount, rowCurrency(t), currency)
    }
    return map
  }, [transactions, key, nextKey, currency])

  // budgetByCategory selalu dikembalikan dalam mata uang TAMPILAN aktif
  // (limit_amount aslinya dikonversi dari currency budget itu sendiri),
  // supaya perbandingan dengan spentByCategory (juga sudah dikonversi) apel
  // ke apel — tidak peduli budget-nya dulu diisi dalam mata uang apa.
  const budgetByCategory = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      map[b.category] = {
        ...b,
        limit_amount: convertAmount(b.limit_amount, rowCurrency(b), currency),
      }
    }
    return map
  }, [budgets, currency])

  const totals = useMemo(() => {
    let target = 0
    let spent = 0
    for (const cat of EXPENSE_CATEGORIES) {
      target += Number(budgetByCategory[cat]?.limit_amount || 0)
      spent += Number(spentByCategory[cat] || 0)
    }
    return { target, spent, remaining: target - spent }
  }, [budgetByCategory, spentByCategory, EXPENSE_CATEGORIES])

  const overBudgetCategories = useMemo(
    () =>
      EXPENSE_CATEGORIES.filter((cat) => {
        const limit = Number(budgetByCategory[cat]?.limit_amount || 0)
        const spent = Number(spentByCategory[cat] || 0)
        return limit > 0 && spent > limit
      }),
    [budgetByCategory, spentByCategory, EXPENSE_CATEGORIES]
  )

  function goToMonth(delta) {
    setCursor((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + delta, 1)))
  }

  function updateDraft(category, value) {
    setDrafts((prev) => ({ ...prev, [category]: value }))
  }

  async function saveBudget(category) {
    if (!userId) return
    const raw = drafts[category]
    if (raw === undefined) return
    const amount = Math.max(0, parseAmount(raw))

    setSavingCategory(category)
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, category, month: key, limit_amount: amount, currency },
        { onConflict: 'user_id,category,month' }
      )
      .select()
    setSavingCategory(null)

    if (error) {
      toast.error(`Gagal menyimpan target ${category}. Coba lagi.`)
      return
    }

    setBudgets((prev) => {
      const others = prev.filter((b) => b.category !== category)
      return data?.length ? [...others, ...data] : others
    })
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
    toast.success(`Target ${category} tersimpan.`)
    onBudgetSaved?.()
  }

  const isCurrentMonth = isSameMonth(cursor, new Date())

  return (
    <div className="space-y-6">
      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-3 bg-surface border border-line rounded-2xl px-4 py-3 shadow-soft">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          className="p-2 rounded-xl text-ink/60 hover:text-ink hover:bg-paper transition-colors"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <div className="text-center">
          <p className="font-display text-lg text-ledger capitalize">
            {monthFormatter.format(cursor)}
          </p>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="text-xs text-gold hover:underline"
            >
              Kembali ke bulan ini
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goToMonth(1)}
          className="p-2 rounded-xl text-ink/60 hover:text-ink hover:bg-paper transition-colors"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Notifikasi kategori yang melebihi target */}
      {overBudgetCategories.length > 0 && (
        <div className="flex items-start gap-3 bg-rust/10 border border-rust/25 rounded-2xl px-4 py-3.5">
          <AlertTriangle className="w-5 h-5 text-rust shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="text-sm text-rust">
            <p className="font-medium">
              {overBudgetCategories.length === 1
                ? `Anggaran ${overBudgetCategories[0]} sudah melebihi target.`
                : `${overBudgetCategories.length} kategori sudah melebihi target anggaran.`}
            </p>
            <p className="text-rust/80 mt-0.5">
              {overBudgetCategories
                .map((cat) => {
                  const over =
                    Number(spentByCategory[cat] || 0) -
                    Number(budgetByCategory[cat]?.limit_amount || 0)
                  return `${cat} (+${formatCurrency(over)})`
                })
                .join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Ringkasan total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Target" value={totals.target} icon={Wallet} color="gold" />
        <StatCard label="Total Terpakai" value={totals.spent} icon={TrendingDown} color="rust" />
        <StatCard
          label={totals.remaining >= 0 ? 'Sisa Anggaran' : 'Kelebihan Anggaran'}
          value={Math.abs(totals.remaining)}
          icon={PiggyBank}
          color={totals.remaining >= 0 ? 'sage' : 'rust'}
        />
      </div>

      {/* Daftar target per kategori */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPENSE_CATEGORIES.map((cat) => {
            const meta = getCategoryMeta(cat, categoryMeta)
            const Icon = meta.icon
            const limit = Number(budgetByCategory[cat]?.limit_amount || 0)
            const spent = Number(spentByCategory[cat] || 0)
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
            const tone = progressTone(pct)
            const draftValue = drafts[cat] ?? (limit ? formatThousands(limit, currencyMeta.locale) : '')
            const isDirty = drafts[cat] !== undefined
            const isSaving = savingCategory === cat
            const isOver = limit > 0 && spent > limit

            return (
              <div
                key={cat}
                className="bg-surface border border-line rounded-2xl p-5 shadow-soft hover:shadow-elegant transition-shadow duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TILE_COLOR_CLASSES[meta.color]}`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{cat}</p>
                    <p className="text-xs text-ink/50">
                      {limit > 0 ? `${formatCurrency(spent)} dari ${formatCurrency(limit)}` : 'Target belum diatur'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="h-2.5 w-full rounded-full bg-paper overflow-hidden border border-line">
                    <div
                      className={`h-full rounded-full ${tone.bar} transition-all duration-300`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-medium tabular ${limit > 0 ? tone.text : 'text-ink/30'}`}>
                      {limit > 0 ? `${pct}% terpakai` : '—'}
                    </span>
                    {isOver && (
                      <span className="flex items-center gap-1 text-xs font-medium text-rust">
                        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Melebihi target
                      </span>
                    )}
                  </div>
                </div>

                {/* Input target */}
                <div className="flex items-center gap-2 mt-4">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">
                      {currencyMeta.symbol}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={draftValue}
                      onChange={(e) => updateDraft(cat, formatThousands(e.target.value, currencyMeta.locale))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          saveBudget(cat)
                        }
                      }}
                      placeholder="0"
                      className="w-full bg-paper border border-line rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveBudget(cat)}
                    disabled={!isDirty || isSaving}
                    className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gold text-paper hover:bg-ledger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`Simpan target ${cat}`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
