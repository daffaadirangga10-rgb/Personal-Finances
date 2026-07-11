import { useState } from 'react'
import {
  User,
  Lock,
  Sun,
  Moon,
  Wallet,
  CalendarDays,
  Check,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { usePreferences, CURRENCIES, DATE_FORMATS } from '../../lib/preferences.jsx'
import { INPUT_CLASS, LABEL_CLASS } from '../../lib/styles'

const inputClass = INPUT_CLASS
const labelClass = LABEL_CLASS

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-soft">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-paper border border-line flex items-center justify-center shrink-0 text-gold">
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-ledger leading-tight">{title}</h3>
          {description && <p className="text-xs text-ink/45 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Banner({ tone = 'sage', children }) {
  const toneClasses =
    tone === 'rust'
      ? 'text-rust bg-rust/10 border-rust/20'
      : 'text-sage bg-sage/10 border-sage/20'
  const Icon = tone === 'rust' ? AlertTriangle : Check
  return (
    <p className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${toneClasses}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      {children}
    </p>
  )
}

function ProfileSection({ session }) {
  const [fullName, setFullName] = useState(session.user.user_metadata?.full_name || '')
  const [email, setEmail] = useState(session.user.email || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // { tone, message }

  const emailChanged = email.trim() !== session.user.email
  const initial = (fullName || email || '?').trim()[0]?.toUpperCase() || '?'

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!fullName.trim()) {
      setStatus({ tone: 'rust', message: 'Nama tidak boleh kosong.' })
      return
    }

    setSaving(true)
    const payload = { data: { full_name: fullName.trim() } }
    if (emailChanged) payload.email = email.trim()

    const { error } = await supabase.auth.updateUser(payload)
    setSaving(false)

    if (error) {
      setStatus({ tone: 'rust', message: error.message })
      return
    }

    setStatus({
      tone: 'sage',
      message: emailChanged
        ? 'Profil tersimpan. Cek email baru kamu untuk konfirmasi perubahan email.'
        : 'Profil berhasil diperbarui.',
    })
  }

  return (
    <SectionCard icon={User} title="Edit Profil" description="Perbarui informasi akun kamu">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 bg-paper border border-line rounded-xl p-3">
          <span className="w-11 h-11 rounded-full bg-gold text-paper text-base font-medium flex items-center justify-center shrink-0">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink truncate">{fullName || 'Belum ada nama'}</p>
            <p className="text-xs text-ink/40 truncate">{session.user.email}</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nama lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama kamu"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            className={inputClass}
          />
          {emailChanged && (
            <p className="text-[11px] text-ink/40 mt-1">
              Mengganti email memerlukan konfirmasi lewat tautan yang dikirim ke email baru.
            </p>
          )}
        </div>

        {status && <Banner tone={status.tone}>{status.message}</Banner>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-gold text-paper rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-ledger transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
          {saving ? 'Menyimpan…' : 'Simpan Profil'}
        </button>
      </form>
    </SectionCard>
  )
}

function PasswordSection({ session }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)

    if (newPassword.length < 6) {
      setStatus({ tone: 'rust', message: 'Kata sandi baru minimal 6 karakter.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus({ tone: 'rust', message: 'Konfirmasi kata sandi tidak cocok.' })
      return
    }

    setSaving(true)

    // Verifikasi kata sandi lama dengan mencoba sign-in ulang, supaya
    // orang lain yang kebetulan memakai sesi aktif tidak bisa mengganti
    // password tanpa tahu kata sandi saat ini.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    })

    if (verifyError) {
      setSaving(false)
      setStatus({ tone: 'rust', message: 'Kata sandi saat ini salah.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (error) {
      setStatus({ tone: 'rust', message: error.message })
      return
    }

    setStatus({ tone: 'sage', message: 'Kata sandi berhasil diganti.' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <SectionCard icon={Lock} title="Ganti Password" description="Gunakan kata sandi yang kuat dan unik">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Kata sandi saat ini</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Kata sandi baru</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Konfirmasi kata sandi baru</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPasswords((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-gold transition-colors"
        >
          {showPasswords ? (
            <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />
          ) : (
            <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
          {showPasswords ? 'Sembunyikan' : 'Tampilkan'} kata sandi
        </button>

        {status && <Banner tone={status.tone}>{status.message}</Banner>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-gold text-paper rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-ledger transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
          {saving ? 'Memproses…' : 'Ganti Password'}
        </button>
      </form>
    </SectionCard>
  )
}

function ThemeSection({ theme, onToggleTheme }) {
  const isDark = theme !== 'light'

  return (
    <SectionCard icon={isDark ? Moon : Sun} title="Tema" description="Pilih tampilan yang nyaman untuk kamu">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => isDark && onToggleTheme()}
          className={`flex-1 flex flex-col items-center gap-2 rounded-xl border py-4 text-sm font-medium transition-colors ${
            !isDark ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line text-ink/50 hover:text-ink'
          }`}
        >
          <Sun className="w-5 h-5" strokeWidth={1.75} />
          Terang
        </button>
        <button
          type="button"
          onClick={() => !isDark && onToggleTheme()}
          className={`flex-1 flex flex-col items-center gap-2 rounded-xl border py-4 text-sm font-medium transition-colors ${
            isDark ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line text-ink/50 hover:text-ink'
          }`}
        >
          <Moon className="w-5 h-5" strokeWidth={1.75} />
          Gelap
        </button>
      </div>
    </SectionCard>
  )
}

function CurrencySection() {
  const { currency, setCurrency, formatCurrency } = usePreferences()

  return (
    <SectionCard
      icon={Wallet}
      title="Mata Uang"
      description="Mata uang tampilan aplikasi — nominal transaksi lain otomatis dikonversi ke mata uang ini"
    >
      <div className="space-y-3">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={inputClass}
        >
          {Object.entries(CURRENCIES).map(([code, meta]) => (
            <option key={code} value={code}>
              {code} — {meta.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink/45">
          Contoh tampilan: <span className="text-ink/70 font-mono">{formatCurrency(1250000)}</span>
        </p>
        <p className="text-xs text-ink/35">
          Setiap transaksi menyimpan mata uang aslinya sendiri (bisa diatur saat mencatat
          transaksi). Total & grafik di seluruh aplikasi otomatis dikonversi ke mata uang di atas
          memakai kurs perkiraan — bukan kurs pasar real-time.
        </p>
      </div>
    </SectionCard>
  )
}

function DateFormatSection() {
  const { dateFormat, setDateFormat, formatDate } = usePreferences()

  return (
    <SectionCard icon={CalendarDays} title="Format Tanggal" description="Cara tanggal ditampilkan di seluruh aplikasi">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(DATE_FORMATS).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setDateFormat(key)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-mono transition-colors ${
                dateFormat === key
                  ? 'border-gold/50 bg-gold/10 text-gold'
                  : 'border-line text-ink/60 hover:text-ink'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/45">
          Contoh tampilan: <span className="text-ink/70 font-mono">{formatDate(new Date())}</span>
        </p>
      </div>
    </SectionCard>
  )
}

export default function Settings({ session, theme, onToggleTheme }) {
  const [activeSection, setActiveSection] = useState('profil')
  const menuItems = [
    { key: 'profil', label: 'Profil', icon: User },
    { key: 'password', label: 'Kata Sandi', icon: Lock },
    { key: 'tampilan', label: 'Tampilan', icon: Sun },
    { key: 'preferensi', label: 'Preferensi', icon: Wallet },
  ]

  const sectionContent = {
    profil: <ProfileSection session={session} />,
    password: <PasswordSection session={session} />,
    tampilan: <ThemeSection theme={theme} onToggleTheme={onToggleTheme} />,
    preferensi: (
      <div className="space-y-5">
        <CurrencySection />
        <DateFormatSection />
      </div>
    ),
  }

  const activeLabel = menuItems.find((item) => item.key === activeSection)?.label
  const fullName = session.user.user_metadata?.full_name || 'Akun Saya'
  const initial = (fullName || session.user.email || '?').trim()[0]?.toUpperCase() || '?'

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <aside className="bg-surface border border-line rounded-2xl p-3 shadow-soft lg:sticky lg:top-6">
        <div className="hidden px-3 pt-3 pb-5 lg:block">
          <p className="font-display text-xl text-ledger">Pengaturan</p>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-paper text-sm font-medium">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-ink">{fullName}</p>
              <p className="truncate text-[11px] text-ink/40">{session.user.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Menu pengaturan">
          {menuItems.map(({ key, label, icon: Icon }) => {
            const active = activeSection === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors lg:w-full lg:text-sm ${
                  active
                    ? 'bg-gold/10 text-gold'
                    : 'text-ink/50 hover:bg-paper hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 px-1 lg:hidden">
          <p className="text-xs uppercase tracking-widest text-gold">Pengaturan</p>
          <h2 className="mt-1 font-display text-2xl text-ledger">{activeLabel}</h2>
        </div>
        {sectionContent[activeSection]}
      </section>
    </div>
  )
}
