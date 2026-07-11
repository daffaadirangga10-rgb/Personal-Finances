import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../lib/toast.jsx'
import { DEFAULT_CATEGORY_NAMES } from '../../lib/categoryMeta'
import { INPUT_CLASS, LABEL_CLASS } from '../../lib/styles'
import { usePreferences, CURRENCIES } from '../../lib/preferences.jsx'
import { formatThousands, parseAmount } from '../../lib/amountInput'

// Fallback dipakai saat kategori custom milik user belum termuat dari
// Supabase. Nama-nama diambil dari sumber tunggal di lib/categoryMeta.js;
// 'Lainnya' ditambahkan untuk pemasukan di sini karena secara sengaja tidak
// termasuk kategori pemasukan bawaan yang di-seed ke akun baru.
const DEFAULT_KATEGORI = {
  pemasukan: [...DEFAULT_CATEGORY_NAMES.pemasukan, 'Lainnya'],
  pengeluaran: DEFAULT_CATEGORY_NAMES.pengeluaran,
}

const inputClass = INPUT_CLASS

export default function TransactionForm({
  userId,
  onSaved,
  prefill,
  transaction, // jika ada, form berjalan dalam mode edit untuk transaksi ini
  onClose,
  categoriesByType,
}) {
  const isEditing = Boolean(transaction)
  const { currency } = usePreferences()
  // Mata uang transaksi ini sendiri — BUKAN mata uang tampilan aplikasi.
  // Transaksi baru default ke preferensi aktif saat ini; transaksi yang
  // sedang diedit tetap memakai mata uang aslinya supaya nominal yang
  // sudah tersimpan tidak "berubah arti" tanpa disengaja. Baris lama
  // (dibuat sebelum fitur ini ada) dianggap IDR.
  const [mataUang, setMataUang] = useState(transaction?.currency || currency)
  const currencyMeta = CURRENCIES[mataUang] ?? CURRENCIES.IDR

  // Kategori dinamis dari halaman Kategori (Supabase). Jika belum ada data
  // (mis. saat masih loading), pakai daftar bawaan supaya form tetap bisa
  // dipakai.
  const KATEGORI = useMemo(() => {
    const pemasukan = categoriesByType?.pemasukan?.length
      ? categoriesByType.pemasukan.map((c) => c.name)
      : DEFAULT_KATEGORI.pemasukan
    const pengeluaran = categoriesByType?.pengeluaran?.length
      ? categoriesByType.pengeluaran.map((c) => c.name)
      : DEFAULT_KATEGORI.pengeluaran
    return { pemasukan, pengeluaran }
  }, [categoriesByType])

  const [jenis, setJenis] = useState(transaction?.type || 'pengeluaran')
  const [jumlah, setJumlah] = useState(
    transaction ? formatThousands(transaction.amount, currencyMeta.locale) : ''
  )
  const [kategori, setKategori] = useState(
    transaction?.category || KATEGORI[transaction?.type || 'pengeluaran'][0]
  )
  const [catatan, setCatatan] = useState(transaction?.note || '')
  const [tanggal, setTanggal] = useState(
    transaction?.occurred_on || new Date().toISOString().slice(0, 10)
  )
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const amountRef = useRef(null)
  const toast = useToast()

  // Quick Action di Dashboard mengirim { type, nonce } untuk membuka form ini
  // dengan jenis transaksi yang sudah dipilih dan fokus siap ketik. Tidak
  // berlaku saat mode edit karena field sudah diisi dari transaksi yang ada.
  useEffect(() => {
    if (isEditing || !prefill) return
    switchJenis(prefill.type)
    amountRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce])

  // Kalau daftar kategori dinamis berubah (baru dimuat, atau kategori yang
  // sedang dipilih dihapus/di-rename di halaman Kategori), pastikan opsi
  // yang terpilih tetap valid.
  useEffect(() => {
    if (!KATEGORI[jenis].includes(kategori)) {
      setKategori(KATEGORI[jenis][0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KATEGORI, jenis])

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return // cegah klik ganda / submit dobel

    setErrorMessage('')

    const amountValue = parseAmount(jumlah)
    if (!amountValue || amountValue <= 0) {
      setErrorMessage('Jumlah harus lebih dari 0.')
      amountRef.current?.focus()
      return
    }
    if (!tanggal) {
      setErrorMessage('Tanggal transaksi wajib diisi.')
      return
    }

    setSaving(true)

    const payload = {
      type: jenis,
      amount: amountValue,
      currency: mataUang,
      category: kategori,
      note: catatan,
      occurred_on: tanggal,
    }

    const { error } = isEditing
      ? await supabase.from('transactions').update(payload).eq('id', transaction.id)
      : await supabase.from('transactions').insert({ ...payload, user_id: userId })

    setSaving(false)

    if (error) {
      setErrorMessage(
        isEditing
          ? 'Gagal memperbarui transaksi. Periksa koneksi internet kamu dan coba lagi.'
          : 'Gagal menyimpan transaksi. Periksa koneksi internet kamu dan coba lagi.'
      )
      toast.error(isEditing ? 'Transaksi gagal diperbarui.' : 'Transaksi gagal disimpan.')
      return
    }

    if (!isEditing) {
      setJumlah('')
      setCatatan('')
    }
    toast.success(
      isEditing
        ? 'Perubahan transaksi berhasil disimpan.'
        : jenis === 'pemasukan'
        ? 'Pemasukan berhasil dicatat.'
        : 'Pengeluaran berhasil dicatat.'
    )
    onSaved?.()
    onClose?.()
  }

  function switchJenis(next) {
    setJenis(next)
    setKategori(KATEGORI[next][0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {['pengeluaran', 'pemasukan'].map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => switchJenis(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize transition-colors ${
              jenis === t
                ? t === 'pemasukan'
                  ? 'bg-sage text-paper'
                  : 'bg-rust text-paper'
                : 'bg-paper text-ink/50 border border-line'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label className={LABEL_CLASS}>Jumlah</label>
          <select
            value={mataUang}
            onChange={(e) => {
              // Ganti mata uang transaksi ini saja (bukan preferensi
              // tampilan global) — angka yang sudah diketik TIDAK
              // dikonversi, karena user memang sedang menyatakan ulang
              // "nominal ini dalam mata uang apa", bukan minta konversi.
              setMataUang(e.target.value)
            }}
            className="text-xs bg-transparent text-ink/50 border-none focus:outline-none cursor-pointer hover:text-ink/80"
          >
            {Object.entries(CURRENCIES).map(([code, meta]) => (
              <option key={code} value={code} className="bg-surface text-ink">
                {code} — {meta.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/40 font-mono">
            {currencyMeta.symbol}
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            ref={amountRef}
            value={jumlah}
            onChange={(e) => {
              setJumlah(formatThousands(e.target.value, currencyMeta.locale))
              if (errorMessage) setErrorMessage('')
            }}
            className={`${inputClass} font-mono pl-9`}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Kategori</label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className={inputClass}
          >
            {KATEGORI[jenis].map((k) => (
              <option key={k} value={k} className="bg-surface text-ink">
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Catatan (opsional)</label>
        <input
          type="text"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          className={inputClass}
          placeholder="mis. makan siang tim"
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-rust flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-gold text-paper rounded-xl py-2 text-sm font-medium hover:bg-ledger transition-colors disabled:opacity-50"
      >
        {saving ? 'Menyimpan…' : isEditing ? 'Simpan perubahan' : 'Simpan transaksi'}
      </button>
    </form>
  )
}
