import { convertAmount, rowCurrency } from './currency'
import { CURRENCIES } from './preferences.jsx'

export const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

// Format nominal dalam mata uang ASLI transaksi (bukan mata uang tampilan
// aplikasi) — dipakai di kolom "Jumlah Asli" pada laporan supaya jejak audit
// tetap jelas: user bisa lihat persis berapa & dalam mata uang apa transaksi
// itu dicatat, terpisah dari nilai konversinya.
export function formatNative(amount, currencyCode) {
  const code = currencyCode || 'IDR'
  const meta = CURRENCIES[code] ?? CURRENCIES.IDR
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount ?? 0)
  } catch {
    return `${code} ${amount ?? 0}`
  }
}

// Total pemasukan/pengeluaran, dikonversi ke satu mata uang tampilan
// (displayCurrency) supaya penjumlahan lintas transaksi valid — sebelumnya
// fungsi ini menjumlah t.amount mentah tanpa peduli mata uang asalnya.
export function summarize(transactions, displayCurrency) {
  let pemasukan = 0
  let pengeluaran = 0
  for (const t of transactions) {
    const amount = convertAmount(t.amount, rowCurrency(t), displayCurrency)
    if (t.type === 'pemasukan') pemasukan += amount
    else pengeluaran += amount
  }
  return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
}

export function sortedRows(transactions) {
  return [...transactions].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
}
