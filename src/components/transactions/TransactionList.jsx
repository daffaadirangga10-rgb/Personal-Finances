import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Pencil,
  Inbox,
  SearchX,
  AlertTriangle,
} from 'lucide-react'
import { getCategoryMeta, BADGE_COLOR_CLASSES } from '../../lib/categoryMeta'
import { usePreferences } from '../../lib/preferences.jsx'
import { convertAmount, rowCurrency } from '../../lib/currency'
import { useToast } from '../../lib/toast.jsx'
import ConfirmDialog from '../ui/ConfirmDialog'
import { TransactionListSkeleton } from '../ui/Skeleton'

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]
const SEARCH_DEBOUNCE_MS = 350

function CategoryBadge({ category, categoryMeta }) {
  const meta = getCategoryMeta(category, categoryMeta)
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${BADGE_COLOR_CLASSES[meta.color]}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      {category || 'Lainnya'}
    </span>
  )
}

function SortHeader({ label, sortKey, activeKey, dir, onSort, align = 'left' }) {
  const active = activeKey === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider text-xs transition-colors hover:text-ink ${
        active ? 'text-ink' : 'text-ink/40'
      } ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
      )}
    </button>
  )
}

// Escape characters that would otherwise break Supabase's `.or()` filter
// syntax (which uses `,`, `(`, `)` as structural characters) or the
// `ilike` wildcard (`%`, `_`).
function sanitizeSearchTerm(term) {
  return term.replace(/[%_,()]/g, ' ').trim()
}

/**
 * Transaction list backed by server-side pagination.
 *
 * Instead of receiving the full transactions array from App.jsx (which
 * would mean loading a user's *entire* transaction history into memory
 * just to show 10 rows), this component owns its own Supabase query and
 * only fetches the current page. Filtering, sorting, and search are all
 * pushed down to Postgres via `.eq()` / `.ilike()` / `.order()` / `.range()`,
 * so performance stays flat no matter how many transactions a user has.
 *
 * Dashboard/Analytics/Budget/Laporan still use the full in-memory
 * `transactions` array from App.jsx, since they need the complete dataset
 * to compute aggregates — only this raw list view needed pagination.
 */
export default function TransactionList({
  userId,
  onDeleted,
  onEdit,
  categoryMeta,
  search = '',
  onSearchChange,
  refreshToken,
}) {
  const { formatCurrency, formatDate, currency } = usePreferences()
  const toast = useToast()

  // Tiap transaksi menyimpan mata uang aslinya sendiri (mis. dicatat dalam
  // USD). Supaya total/tampilan tetap konsisten walau user ganti preferensi
  // mata uang, kita konversi ke mata uang tampilan aktif sebelum diformat —
  // bukan cuma ganti simbolnya seperti sebelumnya.
  const displayAmount = useCallback(
    (t) => convertAmount(t.amount, rowCurrency(t), currency),
    [currency]
  )

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('semua')
  const [categoryFilter, setCategoryFilter] = useState('semua')
  const [sortKey, setSortKey] = useState('occurred_on')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasAnyTransactions, setHasAnyTransactions] = useState(null) // null = unknown yet
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const requestIdRef = useRef(0)

  const categories = useMemo(
    () => Object.keys(categoryMeta || {}).sort((a, b) => a.localeCompare(b)),
    [categoryMeta]
  )

  const hasActiveFilters =
    search.trim() !== '' || typeFilter !== 'semua' || categoryFilter !== 'semua'

  // Debounce free-text search so we don't fire a query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  // Any filter/sort/page-size change should snap back to page 1.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, categoryFilter, sortKey, sortDir, pageSize])

  const fetchPage = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    if (typeFilter !== 'semua') query = query.eq('type', typeFilter)
    if (categoryFilter !== 'semua') query = query.eq('category', categoryFilter)

    const term = sanitizeSearchTerm(debouncedSearch)
    if (term) {
      query = query.or(`category.ilike.%${term}%,note.ilike.%${term}%`)
    }

    // Catatan: sort by "amount" ini terjadi di Postgres pada nominal MENTAH
    // (belum dikonversi lintas mata uang), karena data diambil per halaman
    // (paginated) — konversi baru bisa dilakukan setelah data sampai di
    // client. Untuk sebagian besar user (satu mata uang dominan) ini tidak
    // masalah; kalau transaksi tercampur banyak mata uang dengan nilai
    // tukar jauh berbeda, urutannya bisa terasa kurang pas. Perbaikan penuh
    // butuh generated column / view di Postgres yang menyimpan nominal
    // terkonversi — di luar cakupan perubahan ini.
    query = query.order(sortKey, { ascending: sortDir === 'asc' })
    if (sortKey !== 'occurred_on') {
      query = query.order('occurred_on', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    // Ignore stale responses from a superseded request (e.g. user typed
    // again before the previous query resolved).
    if (requestId !== requestIdRef.current) return

    if (error) {
      setLoadError(true)
      setRows([])
      setTotalCount(0)
      toast.error('Gagal memuat transaksi. Periksa koneksi internet kamu dan coba lagi.')
    } else {
      setRows(data || [])
      setTotalCount(count || 0)
      if (hasAnyTransactions === null) setHasAnyTransactions((count || 0) > 0)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, typeFilter, categoryFilter, debouncedSearch, sortKey, sortDir, page, pageSize, refreshToken])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const refresh = useCallback(() => {
    fetchPage()
  }, [fetchPage])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function resetFilters() {
    onSearchChange?.('')
    setDebouncedSearch('')
    setTypeFilter('semua')
    setCategoryFilter('semua')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    // Simpan salinan lengkap baris ini sebelum dihapus, supaya "Urungkan"
    // bisa mengembalikan persis transaksi yang sama (termasuk id-nya).
    const snapshot = deleteTarget
    const id = snapshot.id
    setDeletingId(id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    setDeletingId(null)
    setDeleteTarget(null)

    if (error) {
      toast.error('Gagal menghapus transaksi. Coba lagi.')
      return
    }
    toast.success('Transaksi berhasil dihapus.', {
      duration: 6000,
      action: { label: 'Urungkan', onClick: () => restoreTransaction(snapshot) },
    })

    // If we just deleted the last row on a page beyond the first, step
    // back a page instead of showing an empty page.
    if (rows.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      refresh()
    }
    // Let App.jsx refresh its full in-memory dataset too, so
    // Dashboard/Analytics/Budget/Laporan stay accurate.
    onDeleted?.()
  }

  async function restoreTransaction(snapshot) {
    // Insert ulang dengan id yang sama persis (kolom id di Postgres tidak
    // dibatasi harus auto-generate, RLS insert cuma mengecek user_id) supaya
    // ini benar-benar "mengurungkan", bukan membuat duplikat baru.
    const { id, user_id, type, amount, currency: txCurrency, category, note, occurred_on, created_at } =
      snapshot
    const { error } = await supabase
      .from('transactions')
      .insert({ id, user_id, type, amount, currency: txCurrency || 'IDR', category, note, occurred_on, created_at })

    if (error) {
      toast.error('Gagal mengurungkan penghapusan. Transaksi tetap terhapus.')
      return
    }
    toast.success('Transaksi berhasil dikembalikan.')
    refresh()
    onDeleted?.()
  }

  // Truly empty: user has zero transactions in the whole table (not just
  // this filtered page).
  if (hasAnyTransactions === false) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-12 shadow-soft flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
          <Inbox className="w-6 h-6 text-gold" strokeWidth={1.5} />
        </div>
        <p className="text-ink/70 text-sm font-display">Belum ada transaksi</p>
        <p className="text-ink/40 text-xs max-w-xs">
          Tambahkan transaksi pertamamu lewat tombol "Tambah Transaksi" di atas untuk mulai mencatat arus kas.
        </p>
      </div>
    )
  }

  if (loading && hasAnyTransactions === null) {
    return <TransactionListSkeleton />
  }

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-soft">
      {/* Toolbar: search + filters */}
      <div className="p-4 border-b border-line flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Cari kategori atau catatan..."
            className="w-full bg-paper border border-line rounded-xl pl-3 pr-8 py-2 text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-paper border border-line rounded-xl px-3 py-2 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
          >
            <option value="semua">Semua tipe</option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-paper border border-line rounded-xl px-3 py-2 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
          >
            <option value="semua">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-ink/40 hover:text-rust px-2 py-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loadError ? (
        <div className="p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-rust/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rust" strokeWidth={1.5} />
          </div>
          <p className="text-ink/60 text-sm font-display">Gagal memuat transaksi</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-1 text-xs text-gold hover:text-ledger font-medium transition-colors"
          >
            Coba lagi
          </button>
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center">
            <SearchX className="w-6 h-6 text-ink/30" strokeWidth={1.5} />
          </div>
          <p className="text-ink/60 text-sm font-display">Tidak ada transaksi yang cocok</p>
          <p className="text-ink/40 text-xs max-w-xs">
            Coba ubah kata kunci pencarian atau filter yang kamu pakai.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-1 text-xs text-gold hover:text-ledger font-medium transition-colors"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: kartu per transaksi (tabel di layar sempit sulit dibaca &
              butuh scroll horizontal). Aksi Edit/Hapus selalu terlihat di
              sini karena tidak ada "hover" di layar sentuh. */}
          <div className={`md:hidden divide-y divide-line/60 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {rows.map((t) => (
              <div key={t.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <CategoryBadge category={t.category} categoryMeta={categoryMeta} />
                  <span
                    className={`font-mono tabular text-sm font-medium whitespace-nowrap ${
                      t.type === 'pemasukan' ? 'text-sage' : 'text-rust'
                    }`}
                  >
                    {t.type === 'pemasukan' ? '+' : '−'}
                    {formatCurrency(displayAmount(t))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-ink/50">
                  <span className="font-mono whitespace-nowrap">
                    {formatDate(t.occurred_on)}
                    {rowCurrency(t) !== currency && (
                      <span className="ml-1.5 text-ink/35">· asli {rowCurrency(t)}</span>
                    )}
                  </span>
                  {t.note && <span className="truncate">{t.note}</span>}
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onEdit?.(t)}
                    className="inline-flex items-center gap-1 text-ink/40 hover:text-gold text-xs transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    disabled={deletingId === t.id}
                    className="inline-flex items-center gap-1 text-ink/40 hover:text-rust text-xs transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === t.id ? 'Menghapus…' : 'Hapus'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabel penuh dengan sort per kolom */}
          <div className={`hidden md:block overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="px-4 py-3">
                    <SortHeader
                      label="Tanggal"
                      sortKey="occurred_on"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortHeader
                      label="Kategori"
                      sortKey="category"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-ink/40">
                    Catatan
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <SortHeader
                        label="Jumlah"
                        sortKey="amount"
                        activeKey={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="group border-b border-line/60 last:border-0 hover:bg-paper/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-ink/60 font-mono text-xs whitespace-nowrap">
                      {formatDate(t.occurred_on)}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={t.category} categoryMeta={categoryMeta} />
                    </td>
                    <td className="px-4 py-3 text-ink/40 max-w-[240px] truncate">
                      {t.note || '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular whitespace-nowrap ${
                        t.type === 'pemasukan' ? 'text-sage' : 'text-rust'
                      }`}
                    >
                      {t.type === 'pemasukan' ? '+' : '−'}
                      {formatCurrency(displayAmount(t))}
                      {rowCurrency(t) !== currency && (
                        <span className="block text-[10px] font-sans font-normal text-ink/35 -mt-0.5">
                          asli {rowCurrency(t)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={() => onEdit?.(t)}
                          className="inline-flex items-center gap-1 text-ink/25 hover:text-gold text-xs transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          disabled={deletingId === t.id}
                          className="inline-flex items-center gap-1 text-ink/25 hover:text-rust text-xs transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === t.id ? 'Menghapus…' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-line flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-ink/50">
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap">
                Menampilkan {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalCount)} dari {totalCount}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-paper border border-line rounded-lg px-2 py-1 text-xs text-ink/60 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / halaman
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-line disabled:opacity-30 hover:bg-paper transition-colors"
                aria-label="Halaman pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-line disabled:opacity-30 hover:bg-paper transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono tabular">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-line disabled:opacity-30 hover:bg-paper transition-colors"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-line disabled:opacity-30 hover:bg-paper transition-colors"
                aria-label="Halaman terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Transaksi"
        loading={deletingId === deleteTarget?.id}
        description={
          deleteTarget ? (
            <>
              Hapus transaksi <span className="font-medium text-ink">{deleteTarget.category || 'Lainnya'}</span>
              {' '}sebesar{' '}
              <span className="font-medium text-ink">{formatCurrency(displayAmount(deleteTarget))}</span>
              {' '}pada {formatDate(deleteTarget.occurred_on)}? Kamu masih bisa mengurungkannya
              sesaat setelah dihapus.
            </>
          ) : null
        }
      />
    </div>
  )
}
