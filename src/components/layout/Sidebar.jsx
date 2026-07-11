import { useState } from 'react'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Wallet,
  FileBarChart,
  BarChart3,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'kategori', label: 'Kategori', icon: Tags },
  { id: 'anggaran', label: 'Anggaran', icon: Wallet },
  { id: 'laporan', label: 'Laporan', icon: FileBarChart },
  { id: 'analitik', label: 'Analitik', icon: BarChart3 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar({ open, onClose, onLogout, active, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Overlay backdrop — mobile only, closes the drawer on tap */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-surface border-r border-line
        flex flex-col transition-all duration-200 ease-out
        lg:static lg:translate-x-0
        ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="relative px-6 py-7 border-b border-line overflow-hidden">
          <p
            className={`font-mono text-[11px] uppercase tracking-[0.25em] text-gold mb-1 transition-opacity duration-150
            ${collapsed ? 'lg:opacity-0 lg:h-0 lg:mb-0' : 'opacity-100'}`}
          >
            Personal Finances
          </p>
          <h1 className="font-display italic text-3xl text-ledger">
            {collapsed ? <span className="hidden lg:inline">F</span> : null}
            <span className={collapsed ? 'lg:hidden' : ''}>Finances</span>
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate?.(item.id)
                  onClose?.()
                }}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                transition-all duration-150 ease-out
                hover:translate-x-0.5
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                ${
                  isActive
                    ? 'bg-paper text-ink shadow-soft'
                    : 'text-ink/70 hover:text-ink hover:bg-paper'
                }`}
              >
                {/* Active indicator bar */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gold
                  transition-all duration-200 ease-out
                  ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`}
                  aria-hidden="true"
                />

                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150
                  ${isActive ? 'text-gold' : 'text-ink/50 group-hover:text-gold'}`}
                  strokeWidth={1.75}
                />

                <span
                  className={`truncate transition-all duration-150
                  ${collapsed ? 'lg:hidden' : ''}`}
                >
                  {item.label}
                </span>

                {/* Tooltip when collapsed (desktop only) */}
                {collapsed && (
                  <span
                    className="pointer-events-none absolute left-full ml-3 hidden lg:group-hover:block
                    whitespace-nowrap rounded-lg bg-ink text-paper text-xs font-medium px-2.5 py-1.5
                    shadow-elegant z-50"
                  >
                    {item.label}
                  </span>
                )}
              </a>
            )
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block px-3 pb-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/50
            hover:text-ink hover:bg-paper transition-colors duration-150
            ${collapsed ? 'justify-center' : ''}`}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
            ) : (
              <>
                <ChevronsLeft className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                <span>Ciutkan</span>
              </>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="px-3 py-5 border-t border-line">
          <button
            onClick={onLogout}
            title={collapsed ? 'Keluar' : undefined}
            className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/60
            hover:text-rust hover:bg-paper transition-all duration-150 hover:translate-x-0.5
            ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <LogOut
              className="w-[18px] h-[18px] shrink-0 transition-colors duration-150 group-hover:text-rust"
              strokeWidth={1.75}
            />
            <span className={collapsed ? 'lg:hidden' : ''}>Keluar</span>
          </button>
        </div>

        {/* Copyright */}
        <div className={`px-6 pb-4 text-[11px] text-ink/30 ${collapsed ? 'lg:hidden' : ''}`}>
          © {new Date().getFullYear()} Daffa Adirangga
        </div>
      </aside>
    </>
  )
}
