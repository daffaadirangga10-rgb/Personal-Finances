import * as XLSX from 'xlsx'
import { convertAmount, rowCurrency } from './currency'
import { summarize, sortedRows } from './exportShared'

/** Builds and downloads an Excel workbook (summary + transaction detail). */
export function exportTransactionsToExcel(transactions, displayCurrency = 'IDR') {
  const { pemasukan, pengeluaran, saldo } = summarize(transactions, displayCurrency)

  const ringkasan = [
    { Ringkasan: `Saldo (${displayCurrency})`, Nilai: saldo },
    { Ringkasan: `Pemasukan (${displayCurrency})`, Nilai: pemasukan },
    { Ringkasan: `Pengeluaran (${displayCurrency})`, Nilai: pengeluaran },
  ]

  // Kolom "Jumlah" & "Mata Uang" menyimpan nominal ASLI transaksi (angka
  // mentah, bukan string terformat) supaya tetap bisa dihitung ulang di
  // Excel. Kolom `Setara (<displayCurrency>)` adalah hasil konversinya,
  // dipakai kalau user mau menjumlah semua baris dalam satu mata uang yang
  // sama tanpa menghitung manual.
  const detail = sortedRows(transactions).map((t) => ({
    Tanggal: t.occurred_on,
    Jenis: t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
    Kategori: t.category,
    Catatan: t.note || '',
    Jumlah: t.amount,
    'Mata Uang': rowCurrency(t),
    [`Setara (${displayCurrency})`]: Number(
      convertAmount(t.amount, rowCurrency(t), displayCurrency).toFixed(2)
    ),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Transaksi')

  XLSX.writeFile(wb, `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
