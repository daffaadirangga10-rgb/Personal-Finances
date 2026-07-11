-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- Versi idempotent: aman dijalankan berkali-kali tanpa error "already exists".
-- CREATE TABLE / CREATE INDEX sudah pakai IF NOT EXISTS bawaan Postgres.
-- CREATE POLICY tidak punya IF NOT EXISTS, jadi tiap policy kita DROP dulu
-- (jika sudah ada) sebelum dibuat ulang.

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('pemasukan', 'pengeluaran')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'IDR',
  category text not null,
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Migrasi untuk project yang tabelnya sudah ada sebelum kolom `currency`
-- ditambahkan di atas — aman dijalankan ulang (idempotent). Baris lama
-- otomatis dianggap IDR karena itu mata uang default aplikasi sebelumnya.
alter table transactions add column if not exists currency text not null default 'IDR';

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_occurred_on_idx on transactions(occurred_on);

-- Aktifkan Row Level Security agar user hanya bisa mengakses data miliknya sendiri
alter table transactions enable row level security;

drop policy if exists "Users can view their own transactions" on transactions;
create policy "Users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own transactions" on transactions;
create policy "Users can insert their own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own transactions" on transactions;
create policy "Users can update their own transactions"
  on transactions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on transactions;
create policy "Users can delete their own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- (Opsional) tabel budget per kategori per bulan, untuk fitur lanjutan
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month date not null, -- gunakan tanggal 1 di bulan terkait, mis. 2026-07-01
  limit_amount numeric(14, 2) not null check (limit_amount >= 0),
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);

-- Migrasi untuk project yang tabel budgets-nya sudah dibuat sebelum kolom
-- created_at / currency ditambahkan di atas — aman dijalankan ulang (idempotent).
alter table budgets add column if not exists created_at timestamptz not null default now();
alter table budgets add column if not exists currency text not null default 'IDR';

alter table budgets enable row level security;

drop policy if exists "Users can manage their own budgets" on budgets;
create policy "Users can manage their own budgets"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kategori transaksi custom milik masing-masing user (nama, tipe, warna, icon).
-- Nilai `color` mengacu ke token warna tema (gold/sage/rust/teal/ink) dan
-- `icon` menyimpan nama komponen lucide-react (mis. "Wallet", "Car").
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('pemasukan', 'pengeluaran')),
  color text not null default 'gold',
  icon text not null default 'Tag',
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create index if not exists categories_user_id_idx on categories(user_id);

alter table categories enable row level security;

drop policy if exists "Users can manage their own categories" on categories;
create policy "Users can manage their own categories"
  on categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
