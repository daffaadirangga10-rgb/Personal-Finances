import { useEffect, useRef, useState } from 'react'
import { Menu, Search, Sun, Moon, Bell, ChevronDown, LogOut, Settings } from 'lucide-react'
import { usePreferences } from '../../lib/preferences.jsx'

export default function Topbar({
  onMenuClick,
  userEmail,
  title = 'Dashboard',
  subtitle,
  theme,
  onToggleTheme,
  searchQuery = '',
  onSearchChange,
  onLogout,
  onGoToSettings,
  notifications = [],
}) {
  const { formatCurrency } = usePreferences()
  const initial = userEmail ? userEmail[0].toUpperCase() : '?'
  const isDark = theme !== 'light'

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)

  const notifRef = useRef(null)
  const profileRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-5 py-4 lg:px-8">
        {/* Mobile menu + page title */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-ink/70 hover:text-ink hover:bg-surface transition-colors shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <div className={`min-w-0 ${searchExpanded ? 'hidden sm:block' : ''}`}>
          <h2 className="font-display text-xl text-ledger leading-tight truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs text-ink/40 hidden sm:block truncate">{subtitle}</p>
          )}
        </div>

        {/* Search */}
        <div className={`flex-1 flex ${searchExpanded ? '' : 'justify-end sm:justify-center'}`}>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/35" strokeWidth={1.75} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => setSearchExpanded(true)}
              onBlur={() => setSearchExpanded(false)}
              placeholder="Cari transaksi, kategori..."
              className={`w-full bg-surface border border-line rounded-full pl-9 pr-3 py-2 text-sm text-ink
              placeholder-ink/35 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40
              transition-all duration-150
              ${searchExpanded ? '' : 'hidden sm:block'}`}
            />
            {!searchExpanded && (
              <button
                onClick={() => setSearchExpanded(true)}
                className="sm:hidden p-2 rounded-xl text-ink/70 hover:text-ink hover:bg-surface transition-colors"
                aria-label="Cari"
              >
                <Search className="w-5 h-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleTheme}
            className="relative p-2 rounded-xl text-ink/70 hover:text-ink hover:bg-surface transition-colors"
            aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} />
            ) : (
              <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((o) => !o)
                setProfileOpen(false)
              }}
              className="relative p-2 rounded-xl text-ink/70 hover:text-ink hover:bg-surface transition-colors"
              aria-label="Notifikasi"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rust ring-2 ring-paper" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-surface border border-line rounded-2xl shadow-elegant overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-sm font-medium text-ink">Notifikasi</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-ink/40">Belum ada notifikasi baru</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-line/60">
                    {notifications.map((n) => (
                      <div key={n.category} className="px-4 py-3">
                        <p className="text-xs text-ink/80">
                          <span className="font-medium">{n.category}</span>{' '}
                          {n.over ? 'sudah melewati' : 'mendekati'} target anggaran bulan ini
                        </p>
                        <p className="text-[11px] text-ink/40 font-mono mt-1">
                          {formatCurrency(n.spent)} / {formatCurrency(n.limit)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((o) => !o)
                setNotifOpen(false)
              }}
              className="flex items-center gap-2 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1 hover:border-gold/40 transition-colors"
            >
              <span className="text-xs text-ink/60 hidden sm:inline max-w-[140px] truncate">
                {userEmail}
              </span>
              <span className="w-7 h-7 rounded-full bg-gold text-paper text-xs font-medium flex items-center justify-center shrink-0">
                {initial}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-ink/40 mr-1 transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`}
                strokeWidth={2}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-2xl shadow-elegant overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-sm text-ink truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    onGoToSettings?.()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:text-ink hover:bg-paper transition-colors"
                >
                  <Settings className="w-4 h-4" strokeWidth={1.75} />
                  Pengaturan
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    onLogout?.()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/60 hover:text-rust hover:bg-paper transition-colors border-t border-line"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
