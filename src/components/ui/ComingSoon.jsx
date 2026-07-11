import { Sparkles } from 'lucide-react'

export default function ComingSoon({ title, description }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-soft">
      <div className="w-11 h-11 mx-auto mb-4 rounded-full bg-paper border border-line flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-xl text-ledger mb-1.5">{title}</h3>
      <p className="text-sm text-ink/50 max-w-sm mx-auto">{description}</p>
    </div>
  )
}
