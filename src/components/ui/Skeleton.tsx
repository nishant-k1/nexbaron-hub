export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-bg rounded ${className}`} />
  );
}

export function SkeletonCard({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-neutral-surface border border-border p-6 animate-pulse ${className}`}>
      {children ?? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-full rounded mt-4" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      )}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden animate-pulse">
      <div className="bg-neutral-bg border-b border-border p-3">
        <div className="flex gap-4">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <ul className="space-y-2 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <li key={i} className="flex justify-between text-sm py-2 px-3 rounded-lg bg-neutral-bg">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonProgress({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-3 h-2 bg-emerald-500/10 rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-emerald-500" style={{ width: "60%" }} />
    </div>
  );
}

export function SkeletonSection({ title = true, children }: { title?: boolean; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-surface border border-border p-6 animate-pulse space-y-4">
      {title && <Skeleton className="h-6 w-1/3 rounded" />}
      {children}
    </div>
  );
}