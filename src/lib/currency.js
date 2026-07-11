// Konversi mata uang terpusat.
//
// Sebelumnya, ganti preferensi mata uang (mis. IDR -> USD) cuma mengganti
// simbol/format tampilan — nilai transaksi lama TIDAK dikonversi, jadi
// "Rp50.000" bisa tiba-tiba tampil sebagai "$50.000" (jumlah sama, nilai
// riil beda ~230x lipat). Sekarang tiap transaksi menyimpan `currency`
// sendiri saat dibuat, dan setiap kali kita menjumlahkan/menampilkan
// gabungan transaksi dalam satu mata uang tampilan, nominalnya dikonversi
// dulu lewat convertAmount() di bawah.
//
// PENTING — SOAL KURS:
// Nilai di RATES_TO_IDR adalah kurs STATIS (perkiraan, per RATES_UPDATED_AT).
// Ini cukup untuk membuat perhitungan "benar secara struktur" (menghormati
// mata uang asli tiap transaksi), tapi TIDAK akurat untuk nilai riil
// harian karena kurs pasar bergerak terus. Untuk multi-currency yang benar-
// benar akurat di production, ganti RATES_TO_IDR dengan kurs live dari API
// (mis. https://www.exchangerate-api.com atau https://openexchangerates.org),
// di-fetch berkala (mis. sekali sehari) dan disimpan di state/cache — tanpa
// perlu mengubah kode manapun yang memanggil convertAmount(), karena semua
// pemanggil hanya bergantung pada fungsi ini, bukan pada RATES_TO_IDR
// langsung.

// Berapa Rupiah untuk 1 unit mata uang tsb (perkiraan).
export const RATES_TO_IDR = {
  IDR: 1,
  USD: 16300,
  EUR: 17700,
  SGD: 12100,
  MYR: 3500,
  JPY: 105,
}

export const RATES_UPDATED_AT = '2026-01-15'

// Konversi satu nominal dari satu mata uang ke mata uang lain.
// Mata uang yang tidak dikenali (mis. data lama / kosong) diperlakukan
// sebagai IDR, karena itu mata uang default aplikasi sebelum fitur ini ada.
export function convertAmount(amount, fromCurrency, toCurrency) {
  const value = Number(amount) || 0
  const from = RATES_TO_IDR[fromCurrency] ?? RATES_TO_IDR.IDR
  const to = RATES_TO_IDR[toCurrency] ?? RATES_TO_IDR.IDR
  if (from === to) return value
  const inIdr = value * from
  return inIdr / to
}

// Helper kecil: ambil currency sebuah transaksi/budget dengan fallback IDR
// untuk baris lama yang dibuat sebelum kolom `currency` ada.
export function rowCurrency(row) {
  return row?.currency || 'IDR'
}
