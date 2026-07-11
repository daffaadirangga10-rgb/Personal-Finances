import { useCallback, useMemo, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Pencil } from 'lucide-react'
import StatCard from '../ui/StatCard'
import QuickActions from './QuickActions'
import AnalyticsCharts from './AnalyticsCharts'
import { useSavingsTarget } from '../../hooks/useSavingsTarget'
import { usePreferences } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'

const inputClass =
  'w-full bg-paper border border-line rounded-xl px-3 py-1.5 text-xs text-ink' +
  ' focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal/40 transition-colors'

export default function Dashboard({ transactions, onAddExpense, onAddIncome }) {
  const { currency } = usePreferences()

  const { totalMasuk, totalKeluar, saldo } = useMemo(() => {
    let totalMasuk = 0
    let totalKeluar = 0

    for (const t of transactions) {
      // Setiap transaksi dikonversi dari mata uang aslinya ke mata uang
      // tampilan yang sedang dipilih user sebelum dijumlahkan. Tanpa ini,
      // transaksi $10 dan Rp10.000 akan dijumlah seolah nilainya sama.
      const amount = convertAmount(t.amount, rowCurrency(t), currency)
      if (t.type === 'pemasukan') totalMasuk += amount
      else totalKeluar += amount
    }

    return { totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar }
  }, [transactions, currency])

  const { target, setTarget } = useSavingsTarget()
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState(target)

  const progress = target > 0 ? Math.min(Math.max(saldo, 0) / target, 1) : 0
  const progressPct = Math.round(progress * 100)

  const openTargetEditor = useCallback(() => {
    setTargetInput(target)
    setEditingTarget(true)
  }, [target])

  const saveTarget = useCallback(() => {
    setTarget(targetInput)
    setEditingTarget(false)
  }, [setTarget, targetInput])

  return (
    <div className="space-y-8">
      <QuickActions transactions={transactions} onAddExpense={onAddExpense} onAddIncome={onAddIncome} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Saldo" value={saldo} icon={Wallet} color="gold" delay={0} />

        <StatCard label="Pemasukan" value={totalMasuk} icon={TrendingUp} color="sage" delay={60} />

        <StatCard label="Pengeluaran" value={totalKeluar} icon={TrendingDown} color="rust" delay={120} />

        <StatCard
          label="Target Tabungan"
          value={target}
          icon={PiggyBank}
          color="teal"
          delay={180}
          iconLabel="Ubah target tabungan"
          onIconClick={openTargetEditor}
          footer={
            editingTarget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
                  className={inputClass}
                />
                <button
                  onClick={saveTarget}
                  className="shrink-0 text-xs font-medium text-teal hover:text-ink transition-colors px-2 py-1.5"
                >
                  Simpan
                </button>
              </div>
            ) : (
              <div>
                <div className="h-1.5 w-full rounded-full bg-paper overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-ink/40">{progressPct}% tercapai</p>
                  <button
                    onClick={openTargetEditor}
                    className="flex items-center gap-1 text-[11px] text-ink/40 hover:text-teal transition-colors"
                  >
                    <Pencil className="w-3 h-3" strokeWidth={1.75} />
                    Ubah
                  </button>
                </div>
              </div>
            )
          }
        />
      </div>

      <AnalyticsCharts transactions={transactions} />
    </div>
  )
}
