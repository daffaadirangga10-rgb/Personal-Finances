import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { useTheme } from './hooks/useTheme'
import { useCategories } from './hooks/useCategories'
import { usePreferences } from './lib/preferences.jsx'
import { convertAmount, rowCurrency } from './lib/currency'
import { useToast } from './lib/toast.jsx'
import Auth from './components/auth/Auth'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Modal from './components/ui/Modal'
import TransactionForm from './components/transactions/TransactionForm'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { PageSkeleton } from './components/ui/Skeleton'

// Setiap halaman di-load terpisah (code-splitting) supaya bundle awal
// tidak perlu memuat kode Laporan/Analitik/dst. sebelum benar-benar dibuka
// user. Ini yang membuat build sebelumnya punya satu file JS raksasa
// (~930 kB) — sekarang tiap halaman jadi chunk sendiri, diambil browser
// hanya saat user pertama kali membuka halaman tsb.
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const TransactionList = lazy(() => import('./components/transactions/TransactionList'))
const Analytics = lazy(() => import('./components/analytics/Analytics'))
const Budget = lazy(() => import('./components/budget/Budget'))
const Kategori = lazy(() => import('./components/categories/Kategori'))
const Laporan = lazy(() => import('./components/reports/Laporan'))
const Settings = lazy(() => import('./components/settings/Settings'))

// Format tanggal "bulan berjalan" ala kolom `month` di tabel budgets
// (selalu tanggal 1), dipakai untuk menghitung notifikasi anggaran tanpa
// query terpisah — cukup pakai `transactions` yang sudah dimuat di App.
function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}
function nextMonthKey() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
}

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan arus kas dan transaksi kamu' },
  transaksi: { title: 'Transaksi', subtitle: 'Catat dan kelola transaksi keuangan kamu' },
  kategori: { title: 'Kategori', subtitle: 'Kelompokkan transaksi berdasarkan kategori' },
  anggaran: { title: 'Anggaran', subtitle: 'Atur batas pengeluaran per kategori' },
  laporan: { title: 'Laporan', subtitle: 'Ringkasan keuangan dalam periode tertentu' },
  analitik: { title: 'Analitik', subtitle: 'Tren dan pola pengeluaran kamu' },
  pengaturan: { title: 'Pengaturan', subtitle: 'Preferensi akun dan aplikasi' },
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsVersion, setTransactionsVersion] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [formPrefill, setFormPrefill] = useState(null)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [currentMonthBudgets, setCurrentMonthBudgets] = useState([])
  const { theme, toggleTheme } = useTheme()
  const { currency } = usePreferences()
  const toast = useToast()
  const {
    categories,
    byType: categoriesByType,
    metaMap: categoryMetaMap,
    loading: categoriesLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(session?.user?.id)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadTransactions = useCallback(async () => {
    if (!session) return
    setTransactionsLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('occurred_on', { ascending: false })
    if (error) {
      toast.error('Gagal memuat transaksi. Periksa koneksi internet kamu dan coba lagi.')
    }
    setTransactions(data || [])
    setTransactionsLoading(false)
    setTransactionsVersion((v) => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Dipakai buat notifikasi bel di Topbar: target anggaran bulan berjalan
  // saja (bukan seluruh histori), jadi query-nya tetap ringan.
  const loadCurrentMonthBudgets = useCallback(async () => {
    if (!session) return
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('month', currentMonthKey())
    if (!error) setCurrentMonthBudgets(data || [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    loadCurrentMonthBudgets()
  }, [loadCurrentMonthBudgets])

  // Kategori pengeluaran yang sudah dekat (≥80%) atau melewati target
  // anggaran bulan ini, dihitung dari transaksi yang sudah ada di memori —
  // tidak perlu query tambahan tiap transaksi berubah.
  const budgetAlerts = useMemo(() => {
    if (!currentMonthBudgets.length) return []
    const key = currentMonthKey()
    const nextKey = nextMonthKey()
    const spentByCategory = {}
    for (const t of transactions) {
      if (t.type !== 'pengeluaran') continue
      if (!t.occurred_on || t.occurred_on < key || t.occurred_on >= nextKey) continue
      // Konversi ke mata uang tampilan aktif — transaksi & budget bisa
      // masing-masing dicatat dalam mata uang berbeda.
      spentByCategory[t.category] =
        (spentByCategory[t.category] || 0) + convertAmount(t.amount, rowCurrency(t), currency)
    }
    return currentMonthBudgets
      .map((b) => {
        const limit = convertAmount(b.limit_amount, rowCurrency(b), currency)
        if (limit <= 0) return null
        const spent = spentByCategory[b.category] || 0
        if (spent / limit < 0.8) return null
        return { category: b.category, spent, limit, over: spent > limit }
      })
      .filter(Boolean)
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  }, [currentMonthBudgets, transactions, currency])

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-6xl">
          <PageSkeleton />
        </div>
      </div>
    )
  }
  if (!session) return <Auth />

  const page = PAGE_TITLES[activePage] ?? PAGE_TITLES.dashboard

  function handleQuickAdd(type) {
    setEditingTransaction(null)
    setFormPrefill({ type, nonce: Date.now() })
    setTransactionModalOpen(true)
  }

  function openAddTransaction() {
    setEditingTransaction(null)
    setFormPrefill({ type: 'pengeluaran', nonce: Date.now() })
    setTransactionModalOpen(true)
  }

  function openEditTransaction(transaction) {
    setEditingTransaction(transaction)
    setTransactionModalOpen(true)
  }

  function closeTransactionModal() {
    setTransactionModalOpen(false)
    setEditingTransaction(null)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error('Gagal keluar. Coba lagi.')
  }

  return (
    <div className="min-h-screen bg-paper flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        active={activePage}
        onNavigate={setActivePage}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          userEmail={session.user.email}
          title={page.title}
          subtitle={page.subtitle}
          theme={theme}
          onToggleTheme={toggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={handleLogout}
          onGoToSettings={() => setActivePage('pengaturan')}
          notifications={budgetAlerts}
        />

        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8 space-y-8 max-w-6xl w-full mx-auto">
          {activePage === 'dashboard' && (
            <section className="scroll-mt-20">
              {transactionsLoading ? (
                <PageSkeleton />
              ) : (
                <ErrorBoundary label="Dashboard" resetKey={activePage}>
                  <Suspense fallback={<PageSkeleton />}>
                    <Dashboard
                      transactions={transactions}
                      onAddExpense={() => handleQuickAdd('pengeluaran')}
                      onAddIncome={() => handleQuickAdd('pemasukan')}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}
            </section>
          )}

          {activePage === 'transaksi' && (
            <section className="scroll-mt-20 space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={openAddTransaction}
                  className="flex items-center gap-2 bg-gold text-paper rounded-xl px-4 py-2.5 text-sm font-medium
                  hover:bg-ledger transition-colors shadow-soft"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Tambah Transaksi
                </button>
              </div>
              <ErrorBoundary label="Daftar transaksi" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <TransactionList
                    userId={session.user.id}
                    onDeleted={loadTransactions}
                    onEdit={openEditTransaction}
                    categoryMeta={categoryMetaMap}
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    refreshToken={transactionsVersion}
                  />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}

          {activePage === 'kategori' && (
            <section className="scroll-mt-20">
              <ErrorBoundary label="Kategori" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <Kategori
                    categories={categories}
                    loading={categoriesLoading}
                    addCategory={addCategory}
                    updateCategory={updateCategory}
                    deleteCategory={deleteCategory}
                  />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}

          {activePage === 'anggaran' && (
            <section className="scroll-mt-20">
              <ErrorBoundary label="Anggaran" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <Budget
                    userId={session.user.id}
                    transactions={transactions}
                    expenseCategories={categoriesByType.pengeluaran}
                    categoryMeta={categoryMetaMap}
                    onBudgetSaved={loadCurrentMonthBudgets}
                  />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}

          {activePage === 'laporan' && (
            <section className="scroll-mt-20">
              <ErrorBoundary label="Laporan" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <Laporan
                    transactions={transactions}
                    categories={categories}
                    categoryMeta={categoryMetaMap}
                  />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}

          {activePage === 'analitik' && (
            <section className="scroll-mt-20">
              <ErrorBoundary label="Analitik" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <Analytics transactions={transactions} categoryMeta={categoryMetaMap} />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}

          {activePage === 'pengaturan' && (
            <section className="scroll-mt-20">
              <ErrorBoundary label="Pengaturan" resetKey={activePage}>
                <Suspense fallback={<PageSkeleton />}>
                  <Settings session={session} theme={theme} onToggleTheme={toggleTheme} />
                </Suspense>
              </ErrorBoundary>
            </section>
          )}
        </main>
      </div>

      <Modal
        open={transactionModalOpen}
        onClose={closeTransactionModal}
        title={editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
      >
        <ErrorBoundary label="Form transaksi">
          <TransactionForm
            userId={session.user.id}
            onSaved={loadTransactions}
            prefill={formPrefill}
            transaction={editingTransaction}
            onClose={closeTransactionModal}
            categoriesByType={categoriesByType}
          />
        </ErrorBoundary>
      </Modal>
    </div>
  )
}
