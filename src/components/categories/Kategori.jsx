import { useEffect, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  ICON_NAMES,
  COLOR_NAMES,
  resolveIcon,
  TILE_COLOR_CLASSES,
  SWATCH_CLASSES,
} from '../../lib/categoryMeta'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../../lib/toast.jsx'
import { CardGridSkeleton } from '../ui/Skeleton'
import { INPUT_CLASS, LABEL_CLASS } from '../../lib/styles'

const EMPTY_FORM = { name: '', type: 'pengeluaran', color: 'gold', icon: 'Tag' }

function CategoryForm({ initial, onCancel, onSubmit, saving, errorMessage, onNameEmpty }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)

  useEffect(() => {
    setForm(initial || EMPTY_FORM)
  }, [initial])

  const Icon = resolveIcon(form.icon)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.name.trim()) {
          onNameEmpty?.()
          return
        }
        onSubmit(form)
      }}
      className="space-y-4"
    >
      {/* Pratinjau */}
      <div className="flex items-center gap-3 bg-paper border border-line rounded-xl p-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TILE_COLOR_CLASSES[form.color]}`}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <p className="text-sm text-ink/60 truncate">
          {form.name.trim() || 'Nama kategori'}
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS}>Nama kategori</label>
        <input
          type="text"
          required
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="mis. Langganan"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Tipe</label>
        <div className="flex gap-2">
          {['pengeluaran', 'pemasukan'].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize transition-colors ${
                form.type === t
                  ? t === 'pemasukan'
                    ? 'bg-sage text-paper'
                    : 'bg-rust text-paper'
                  : 'bg-paper text-ink/50 border border-line'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1.5">Warna</label>
        <div className="flex gap-2.5">
          {COLOR_NAMES.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => setForm((f) => ({ ...f, color }))}
              aria-label={`Warna ${color}`}
              className={`w-8 h-8 rounded-full ${SWATCH_CLASSES[color]} transition-transform ${
                form.color === color ? 'ring-2 ring-offset-2 ring-offset-surface ring-gold scale-110' : 'hover:scale-105'
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1.5">Icon</label>
        <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
          {ICON_NAMES.map((name) => {
            const OptionIcon = resolveIcon(name)
            const active = form.icon === name
            return (
              <button
                type="button"
                key={name}
                onClick={() => setForm((f) => ({ ...f, icon: name }))}
                aria-label={name}
                className={`aspect-square rounded-xl flex items-center justify-center border transition-colors ${
                  active
                    ? `${TILE_COLOR_CLASSES[form.color]} border-transparent`
                    : 'bg-paper border-line text-ink/50 hover:text-ink hover:border-ink/30'
                }`}
              >
                <OptionIcon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </button>
            )
          })}
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-rust flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          {errorMessage}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl py-2 text-sm font-medium text-ink/60 border border-line hover:bg-paper transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="flex-1 bg-gold text-paper rounded-xl py-2 text-sm font-medium hover:bg-ledger transition-colors disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

export default function Kategori({ categories, loading, addCategory, updateCategory, deleteCategory }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = tambah baru, object = edit
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  function openAdd() {
    setEditing(null)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(cat) {
    setEditing(cat)
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(form) {
    setSaving(true)
    setFormError('')

    const { error } = editing
      ? await updateCategory(editing.id, form)
      : await addCategory(form)

    setSaving(false)
    if (error) {
      setFormError(
        error.code === '23505'
          ? 'Kategori dengan nama & tipe yang sama sudah ada.'
          : 'Gagal menyimpan kategori. Coba lagi.'
      )
      return
    }
    setModalOpen(false)
    toast.success(editing ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteCategory(deleteTarget.id)
    setDeleting(false)

    if (error) {
      toast.error('Gagal menghapus kategori. Coba lagi.')
      return
    }
    setDeleteTarget(null)
    toast.success('Kategori berhasil dihapus.')
  }

  const groups = [
    { type: 'pengeluaran', label: 'Pengeluaran', accent: 'text-rust' },
    { type: 'pemasukan', label: 'Pemasukan', accent: 'text-sage' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-gold text-paper rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-ledger transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Tambah Kategori
        </button>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div>
            <div className="h-3 w-24 rounded bg-ink/10 animate-pulse mb-3" />
            <CardGridSkeleton count={3} />
          </div>
          <div>
            <div className="h-3 w-24 rounded bg-ink/10 animate-pulse mb-3" />
            <CardGridSkeleton count={3} />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const items = categories.filter((c) => c.type === group.type)
            return (
              <div key={group.type}>
                <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${group.accent}`}>
                  {group.label}
                </h3>

                {items.length === 0 ? (
                  <p className="text-sm text-ink/40">Belum ada kategori {group.label.toLowerCase()}.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((cat) => {
                      const Icon = resolveIcon(cat.icon)
                      return (
                        <div
                          key={cat.id}
                          className="group flex items-center gap-3 bg-surface border border-line rounded-2xl p-4 shadow-soft hover:shadow-elegant transition-shadow duration-200"
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TILE_COLOR_CLASSES[cat.color]}`}>
                            <Icon className="w-5 h-5" strokeWidth={1.75} />
                          </div>
                          <p className="flex-1 min-w-0 text-sm font-medium text-ink truncate">{cat.name}</p>

                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(cat)}
                              aria-label={`Edit ${cat.name}`}
                              className="p-2 rounded-lg text-ink/50 hover:text-ink hover:bg-paper transition-colors"
                            >
                              <Pencil className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(cat)}
                              aria-label={`Hapus ${cat.name}`}
                              className="p-2 rounded-lg text-ink/50 hover:text-rust hover:bg-rust/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal tambah/edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
      >
        <CategoryForm
          initial={editing}
          saving={saving}
          errorMessage={formError}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onNameEmpty={() => setFormError('Nama kategori tidak boleh kosong.')}
        />
      </Modal>

      {/* Konfirmasi hapus */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        loading={deleting}
        description={
          <>
            Hapus kategori <span className="font-medium text-ink">{deleteTarget?.name}</span>?
            Transaksi lama yang sudah memakai kategori ini tidak akan terhapus, tapi kategorinya
            tidak akan muncul lagi di pilihan.
          </>
        }
      />
    </div>
  )
}
