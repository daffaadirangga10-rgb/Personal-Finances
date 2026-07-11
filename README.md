# Personal Finances

Starter project: React + Vite + Tailwind CSS + Supabase (auth & database) + Recharts (grafik).

## Fitur yang sudah ada
- Login & daftar akun (email/password via Supabase Auth)
- Tambah transaksi pemasukan/pengeluaran dengan kategori, tanggal, catatan
- Daftar transaksi + hapus
- Dashboard: saldo, total pemasukan/pengeluaran, grafik kategori (pie) dan tren bulanan (bar)
- Kategori kustom (kelola lewat `components/categories/Kategori.jsx`, tabel `categories`)
- Budget per kategori (`components/budget/Budget.jsx`, tabel `budgets`)
- Multi-currency: tiap transaksi & budget menyimpan mata uang aslinya sendiri (kolom `currency`), dikonversi otomatis ke mata uang tampilan pilihan user (`lib/currency.js`) saat dijumlahkan di Dashboard, Analitik, Anggaran, dan Laporan
- Analytics lanjutan (`components/analytics/Analytics.jsx`)
- Laporan dengan filter serta export ke PDF & Excel (`components/reports/Laporan.jsx`, `lib/exportUtils.js`)
- Quick actions untuk export cepat dari Dashboard
- Dark/light theme (tersimpan di localStorage)
- Row Level Security — setiap user hanya bisa melihat datanya sendiri

## Cara menjalankan

### 1. Siapkan Supabase
1. Buat project baru di [supabase.com](https://supabase.com) (gratis).
2. Buka **SQL Editor**, jalankan isi file `supabase-schema.sql` untuk membuat tabel `transactions`, `budgets`, dan `categories` beserta policy keamanannya.
3. Buka **Project Settings > API**, salin `Project URL` dan `anon public key`.

### 2. Konfigurasi environment
```bash
cp .env.example .env
```
Isi `.env` dengan URL dan anon key dari Supabase kamu.

### 3. Install & jalankan
```bash
npm install
npm run dev
```
Buka `http://localhost:5173`.

## Struktur project
```
src/
  components/
    ui/            -> Modal, ConfirmDialog, Skeleton, StatCard, AnimatedNumber (komponen umum)
    layout/        -> Sidebar, Topbar
    auth/          -> Auth.jsx (login & daftar)
    dashboard/     -> Dashboard, AnalyticsCharts, QuickActions
    transactions/  -> TransactionForm, TransactionList
    categories/    -> Kategori.jsx
    budget/        -> Budget.jsx
    analytics/     -> Analytics.jsx
    reports/       -> Laporan.jsx
    settings/      -> Settings.jsx
  hooks/           -> useCategories, useSavingsTarget, useTheme
  lib/             -> supabaseClient, toast, preferences, currency, exportUtils, categoryMeta
  App.jsx          -> layout utama & state management
supabase-schema.sql -> skema database + RLS policy
```

## Catatan keamanan
- **Jangan pernah commit file `.env`** — sudah dimasukkan ke `.gitignore`. File ini berisi kredensial Supabase asli project kamu.
- `.env.example` hanya berisi placeholder, aman untuk di-commit sebagai contoh format.
- Semua tabel (`transactions`, `budgets`, `categories`) sudah mengaktifkan **Row Level Security** — pastikan setiap tabel baru yang kamu tambahkan juga diberi RLS policy sebelum dipakai di production.
- `anon key` di Supabase memang didesain untuk dipakai di browser (bukan rahasia seperti `service_role key`), tapi tetap sebaiknya tidak disebar sembarangan — keamanan data sepenuhnya bergantung pada RLS policy yang benar.
- Jika kamu curiga kredensial pernah bocor (mis. sempat ter-push ke repo publik), segera generate ulang anon key lewat **Supabase Dashboard > Project Settings > API**.
- Disarankan mengaktifkan **Leaked Password Protection** dan **email confirmation** di Supabase Dashboard > Authentication > Settings.

## Ide pengembangan lanjutan
- Multi-akun/dompet (mis. rekening bank vs e-wallet)
- Recurring transaction (transaksi berulang, mis. langganan bulanan)
- Notifikasi/reminder saat budget mendekati limit
- Import transaksi dari CSV/mutasi bank
- PWA / mode offline
- Multi-currency
- Berbagi akun (misal keuangan keluarga/bersama)

## Deploy
Push ke GitHub lalu hubungkan ke [Vercel](https://vercel.com) atau [Netlify](https://netlify.com) — keduanya gratis untuk proyek personal. Jangan lupa set environment variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard hosting.

## Lisensi
© 2026 Daffa Adirangga. All Rights Reserved.

Project ini bersifat privat — lihat file [`LICENSE`](./LICENSE) untuk detail lengkap. Library pihak ketiga yang dipakai (React, Supabase, Recharts, dll.) tetap berada di bawah lisensi masing-masing.

## Catatan maintenance
- Dependency `xlsx` (dipakai untuk export Excel) diarahkan ke CDN resmi SheetJS (`cdn.sheetjs.com`), bukan npm registry — karena versi di npm registry publik (0.18.5) punya kerentanan *prototype pollution* yang sudah diperbaiki di rilis terbaru, tapi SheetJS tidak lagi publish fix-nya ke npm. `package-lock.json` sudah dihapus supaya ter-generate ulang bersih; jalankan `npm install` sekali sebelum `npm run dev`.
