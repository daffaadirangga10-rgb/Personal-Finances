// Kelas Tailwind yang dipakai berulang di banyak form (TransactionForm, Auth,
// Settings, Kategori). Disatukan di sini supaya kalau suatu saat mau ubah
// tampilan input di seluruh aplikasi, cukup edit satu tempat.
//
// Catatan: Dashboard.jsx punya varian input yang sengaja beda (lebih ringkas,
// dipakai inline di kartu target tabungan) — itu tetap didefinisikan lokal di
// sana karena bukan duplikat, melainkan gaya yang memang berbeda.
export const INPUT_CLASS =
  'w-full bg-paper border border-line rounded-xl px-3 py-2 text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-colors'

export const LABEL_CLASS = 'block text-xs font-medium text-ink/60 mb-1'
