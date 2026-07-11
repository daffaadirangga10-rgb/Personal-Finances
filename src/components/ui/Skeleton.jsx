// Skeleton dasar: blok abu-abu berdenyut mengikuti bentuk konten asli,
// dipakai selagi data dari Supabase masih dimuat supaya layout tidak
// "melompat" dan pengguna tahu sesuatu sedang terjadi.
export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-ink/10 ${className}`} />
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-line rounded-2xl p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="w-9 h-9 rounded-xl" />
            <SkeletonBlock className="w-10 h-3" />
          </div>
          <SkeletonBlock className="w-2/3 h-6" />
          <SkeletonBlock className="w-1/3 h-2.5" />
        </div>
      ))}
    </div>
  )
}

export function TransactionListSkeleton({ rows = 6 }) {
  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-soft">
      <div className="p-4 border-b border-line flex gap-3">
        <SkeletonBlock className="h-9 flex-1 rounded-xl" />
        <SkeletonBlock className="h-9 w-28 rounded-xl" />
        <SkeletonBlock className="h-9 w-28 rounded-xl" />
      </div>
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-3 flex-1 max-w-[200px]" />
            <SkeletonBlock className="h-3 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-surface border border-line rounded-2xl p-4 shadow-soft">
          <SkeletonBlock className="w-11 h-11 rounded-xl shrink-0" />
          <SkeletonBlock className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <SkeletonBlock className="h-4 w-32" />
      <StatCardsSkeleton />
    </div>
  )
}
