import { createClient } from '@supabase/supabase-js'

// Isi kedua nilai ini di file .env (lihat .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase belum dikonfigurasi. Salin .env.example ke .env dan isi kredensial project Supabase kamu.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
