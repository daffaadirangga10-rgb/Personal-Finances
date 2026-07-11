// Helper bersama untuk field input nominal (dipakai di TransactionForm dan
// Budget). Menampilkan pemisah ribuan sesuai locale mata uang yang dipilih
// user di Pengaturan, sambil tetap mengirim angka mentah ke Supabase.

// Format angka mentah menjadi string dengan pemisah ribuan (mis. "5.000.000").
// Karakter non-digit di input pengguna dibuang dulu supaya paste/ketik bebas
// tidak merusak format.
export function formatThousands(raw, locale) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const n = Number(digits)
  return new Intl.NumberFormat(locale).format(n)
}

// Kebalikan dari formatThousands: ambil digit mentah saja untuk dikirim ke
// Supabase sebagai number, tidak peduli locale/pemisah yang dipakai untuk
// menampilkannya.
export function parseAmount(formatted) {
  const digits = String(formatted ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}
