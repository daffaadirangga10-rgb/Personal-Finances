import {
  Wallet,
  Gift,
  TrendingUp,
  UtensilsCrossed,
  Car,
  Receipt,
  Clapperboard,
  ShoppingBag,
  HeartPulse,
  Tag,
  Home,
  Briefcase,
  Coffee,
  Plane,
  BookOpen,
  Music,
  Smartphone,
  PawPrint,
  GraduationCap,
  Dumbbell,
  Fuel,
  CreditCard,
  PiggyBank,
  Landmark,
  Shirt,
  Film,
  Gamepad2,
  Droplet,
  Baby,
  Gem,
} from 'lucide-react'

// Semua icon yang bisa dipilih di halaman Kategori. Key-nya (string) inilah
// yang disimpan ke kolom `icon` di Supabase, sehingga bisa di-resolve balik
// menjadi komponen lucide-react di mana pun kategori itu ditampilkan.
export const ICON_LIBRARY = {
  Wallet,
  Gift,
  TrendingUp,
  UtensilsCrossed,
  Car,
  Receipt,
  Clapperboard,
  ShoppingBag,
  HeartPulse,
  Tag,
  Home,
  Briefcase,
  Coffee,
  Plane,
  BookOpen,
  Music,
  Smartphone,
  PawPrint,
  GraduationCap,
  Dumbbell,
  Fuel,
  CreditCard,
  PiggyBank,
  Landmark,
  Shirt,
  Film,
  Gamepad2,
  Droplet,
  Baby,
  Gem,
}

export const ICON_NAMES = Object.keys(ICON_LIBRARY)

// Warna kategori terbatas pada token tema (gold / sage / rust / teal / ink)
// supaya apa pun yang dipilih user tetap serasi di light & dark mode, alih-
// alih memakai hex bebas yang bisa pecah dari palet ledger.
export const COLOR_NAMES = ['gold', 'sage', 'rust', 'teal', 'ink']

export function resolveIcon(name) {
  return ICON_LIBRARY[name] || Tag
}

// Default bawaan (dipakai untuk fallback & untuk seed kategori awal user
// baru). Colors reuse the app's existing ledger tokens so anything built
// from this map stays on-palette in both light and dark mode.
export const CATEGORY_META = {
  Gaji: { icon: Wallet, color: 'gold' },
  Bonus: { icon: Gift, color: 'teal' },
  Investasi: { icon: TrendingUp, color: 'sage' },
  Makanan: { icon: UtensilsCrossed, color: 'rust' },
  Transportasi: { icon: Car, color: 'teal' },
  Tagihan: { icon: Receipt, color: 'gold' },
  Hiburan: { icon: Clapperboard, color: 'sage' },
  Belanja: { icon: ShoppingBag, color: 'rust' },
  Kesehatan: { icon: HeartPulse, color: 'teal' },
  Lainnya: { icon: Tag, color: 'ink' },
}

// Bentuk yang sama seperti CATEGORY_META, tapi dengan nama icon (string)
// bukan komponen — dipakai untuk seed baris awal ke tabel `categories`.
export const DEFAULT_CATEGORY_SEED = [
  { name: 'Gaji', type: 'pemasukan', color: 'gold', icon: 'Wallet' },
  { name: 'Bonus', type: 'pemasukan', color: 'teal', icon: 'Gift' },
  { name: 'Investasi', type: 'pemasukan', color: 'sage', icon: 'TrendingUp' },
  { name: 'Makanan', type: 'pengeluaran', color: 'rust', icon: 'UtensilsCrossed' },
  { name: 'Transportasi', type: 'pengeluaran', color: 'teal', icon: 'Car' },
  { name: 'Tagihan', type: 'pengeluaran', color: 'gold', icon: 'Receipt' },
  { name: 'Hiburan', type: 'pengeluaran', color: 'sage', icon: 'Clapperboard' },
  { name: 'Belanja', type: 'pengeluaran', color: 'rust', icon: 'ShoppingBag' },
  { name: 'Kesehatan', type: 'pengeluaran', color: 'teal', icon: 'HeartPulse' },
  { name: 'Lainnya', type: 'pengeluaran', color: 'ink', icon: 'Tag' },
]

export const FALLBACK_CATEGORY_META = { icon: Tag, color: 'ink' }

// Nama kategori default per tipe, diturunkan otomatis dari DEFAULT_CATEGORY_SEED
// di atas. Dipakai sebagai fallback di form transaksi & anggaran saat kategori
// custom milik user belum termuat dari Supabase (mis. baru login / masih loading).
// Kalau suatu saat mau menambah/mengubah kategori default, cukup edit
// DEFAULT_CATEGORY_SEED — tidak perlu ubah komponen lain satu-satu lagi.
export const DEFAULT_CATEGORY_NAMES = {
  pemasukan: DEFAULT_CATEGORY_SEED.filter((c) => c.type === 'pemasukan').map((c) => c.name),
  pengeluaran: DEFAULT_CATEGORY_SEED.filter((c) => c.type === 'pengeluaran').map((c) => c.name),
}

// `dynamicMap`, jika diberikan, berisi metadata kategori milik user dari
// Supabase (dibangun di App.jsx lewat useCategories) dan selalu diprioritaskan
// di atas daftar bawaan, supaya kategori yang ditambah/diedit user langsung
// konsisten tampil di seluruh halaman (Transaksi, Anggaran, Analitik, dst).
export function getCategoryMeta(category, dynamicMap) {
  if (dynamicMap && dynamicMap[category]) return dynamicMap[category]
  return CATEGORY_META[category] || FALLBACK_CATEGORY_META
}

export const BADGE_COLOR_CLASSES = {
  gold: 'bg-gold/10 text-gold border-gold/25',
  teal: 'bg-teal/10 text-teal border-teal/25',
  sage: 'bg-sage/10 text-sage border-sage/25',
  rust: 'bg-rust/10 text-rust border-rust/25',
  ink: 'bg-ink/5 text-ink/60 border-ink/15',
}

// Same palette, meant for solid icon tiles (e.g. stat cards) rather than
// outlined pill badges.
export const TILE_COLOR_CLASSES = {
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/10 text-teal',
  sage: 'bg-sage/10 text-sage',
  rust: 'bg-rust/10 text-rust',
  ink: 'bg-ink/5 text-ink/60',
}

// Plain text color, for numbers/labels that need to match a category's
// accent without any background.
export const TEXT_COLOR_CLASSES = {
  gold: 'text-gold',
  teal: 'text-teal',
  sage: 'text-sage',
  rust: 'text-rust',
  ink: 'text-ink/60',
}

// Solid swatch (dipakai di color picker halaman Kategori).
export const SWATCH_CLASSES = {
  gold: 'bg-gold',
  teal: 'bg-teal',
  sage: 'bg-sage',
  rust: 'bg-rust',
  ink: 'bg-ink/60',
}
