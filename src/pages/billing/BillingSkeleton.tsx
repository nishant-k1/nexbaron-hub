import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonProgress, SkeletonSection } from "@/components/ui/Skeleton";
import { Receipt } from "lucide-react";

export function BillingDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-32 rounded mt-1" />
        </div>
      </div>

      <SkeletonSection>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-48 rounded mt-1" />
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
      </SkeletonSection>

      <SkeletonSection>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <SkeletonList items={3} />
      </SkeletonSection>

      <SkeletonSection>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <SkeletonTable rows={12} />
        <SkeletonList items={4} />
      </SkeletonSection>

      <SkeletonSection title={false}>
        <Skeleton className="h-12 w-full rounded-xl" />
      </SkeletonSection>
    </div>
  );
}

export function ErrorContent({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-neutral-surface p-6 text-sm text-red-500">{error}</div>
  );
}

export function NotFoundContent() {
  return (
    <div className="rounded-xl bg-neutral-surface p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-neutral-bg text-muted flex items-center justify-center mb-4">
        <Receipt className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-heading mb-1">Invoice not found</h3>
      <p className="text-sm text-muted max-w-[320px]">The requested invoice could not be found.</p>
    </div>
  );
}
