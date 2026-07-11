import { memo } from 'react'
import AnimatedNumber from './AnimatedNumber'
import { usePreferences } from '../../lib/preferences.jsx'

const COLOR_MAP = {
  gold: { text: 'text-gold', bg: 'bg-gold/10', bar: 'bg-gold' },
  sage: { text: 'text-sage', bg: 'bg-sage/10', bar: 'bg-sage' },
  rust: { text: 'text-rust', bg: 'bg-rust/10', bar: 'bg-rust' },
  teal: { text: 'text-teal', bg: 'bg-teal/10', bar: 'bg-teal' },
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'gold',
  footer,
  onIconClick,
  iconLabel,
  delay = 0,
}) {
  const { formatCurrency } = usePreferences()
  const c = COLOR_MAP[color] ?? COLOR_MAP.gold

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group relative overflow-hidden bg-surface border border-line rounded-2xl
      p-5 sm:p-6 shadow-soft hover:shadow-elegant hover:-translate-y-0.5
      transition-all duration-200 ease-out motion-safe:animate-rise-in"
    >
      {/* Faint oversized icon watermark for depth */}
      <Icon
        className={`pointer-events-none absolute -right-4 -bottom-4 w-28 h-28 ${c.text} opacity-[0.05]`}
        strokeWidth={1.25}
      />

      <div className="relative flex items-start justify-between gap-3 mb-5">
        <p className="text-xs uppercase tracking-widest text-ink/50">{label}</p>

        <button
          type="button"
          onClick={onIconClick}
          disabled={!onIconClick}
          aria-label={iconLabel || label}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0
          ${c.bg} ${c.text} transition-transform duration-200
          ${onIconClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.75} />
        </button>
      </div>

      <p className={`relative font-display text-2xl sm:text-3xl tabular ${c.text}`}>
        <AnimatedNumber value={value} formatter={formatCurrency} />
      </p>

      {footer && <div className="relative mt-4">{footer}</div>}
    </div>
  )
}

export default memo(StatCard)
