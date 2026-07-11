import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_CATEGORY_SEED, resolveIcon } from '../lib/categoryMeta'

/**
 * Mengelola kategori transaksi milik user di tabel `categories` Supabase.
 * User baru yang belum punya kategori sama sekali akan di-seed otomatis
 * dengan daftar kategori bawaan, supaya form transaksi & anggaran tidak
 * kosong saat pertama kali pakai aplikasi.
 */
export function useCategories(userId) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    let { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      const seedRows = DEFAULT_CATEGORY_SEED.map((c) => ({ ...c, user_id: userId }))
      const { data: seeded } = await supabase.from('categories').insert(seedRows).select()
      data = seeded || []
    }

    setCategories(data.sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function addCategory({ name, type, color, icon }) {
    const { data, error: err } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: name.trim(), type, color, icon })
      .select()
      .single()
    if (!err && data) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error: err }
  }

  async function updateCategory(id, { name, type, color, icon }) {
    const { data, error: err } = await supabase
      .from('categories')
      .update({ name: name.trim(), type, color, icon })
      .eq('id', id)
      .select()
      .single()
    if (!err && data) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name))
      )
    }
    return { data, error: err }
  }

  async function deleteCategory(id) {
    const { error: err } = await supabase.from('categories').delete().eq('id', id)
    if (!err) setCategories((prev) => prev.filter((c) => c.id !== id))
    return { error: err }
  }

  // Peta nama -> { icon: Component, color } untuk dipakai getCategoryMeta
  // di TransactionList / Analytics / Budget, supaya icon & warna custom
  // yang diatur di halaman Kategori langsung tampil konsisten di mana pun.
  const metaMap = useMemo(() => {
    const map = {}
    for (const c of categories) {
      map[c.name] = { icon: resolveIcon(c.icon), color: c.color }
    }
    return map
  }, [categories])

  const byType = useMemo(
    () => ({
      pemasukan: categories.filter((c) => c.type === 'pemasukan'),
      pengeluaran: categories.filter((c) => c.type === 'pengeluaran'),
    }),
    [categories]
  )

  return {
    categories,
    byType,
    metaMap,
    loading,
    error,
    reload: load,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
