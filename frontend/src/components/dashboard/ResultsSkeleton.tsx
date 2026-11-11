function SkeletonLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function ResultsSkeleton() {
  return (
    <div className="mt-6 space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <SkeletonLine className="mb-3 h-3 w-24" />
            <SkeletonLine className="mb-2 h-7 w-16" />
            <SkeletonLine className="h-3 w-32" />
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-5 flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-56" />
            <SkeletonLine className="h-3 w-72 max-w-full" />
          </div>
        </div>

        <div className="space-y-3">
          <SkeletonLine className="h-3 w-full" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.2fr_1fr_1fr_1.4fr_0.6fr] items-center gap-4 border-b border-border/60 py-4"
            >
              <SkeletonLine className="h-4 w-28" />
              <SkeletonLine className="h-4 w-20" />
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mx-auto h-10 w-28 rounded-full" />
              <SkeletonLine className="ml-auto h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SkeletonLine className="mb-4 h-5 w-48" />
        <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
          <SkeletonLine className="mb-3 h-4 w-32" />
          <SkeletonLine className="mb-2 h-3 w-full" />
          <SkeletonLine className="h-3 w-3/4" />
        </div>
        <div className="mb-5 flex gap-4 border-b border-border pb-3">
          <SkeletonLine className="h-4 w-20" />
          <SkeletonLine className="h-4 w-40" />
          <SkeletonLine className="h-4 w-24" />
        </div>
        <SkeletonLine className="mb-2 h-4 w-40" />
        <SkeletonLine className="mb-2 h-3 w-full" />
        <SkeletonLine className="mb-2 h-3 w-11/12" />
        <SkeletonLine className="h-3 w-4/5" />
      </section>
    </div>
  );
}
