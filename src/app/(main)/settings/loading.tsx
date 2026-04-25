import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="border-b border-border-default px-6 pb-6 pt-8">
        <Skeleton className="h-8 w-28 rounded" />
        <Skeleton className="mt-2 h-4 w-56 rounded" />
      </div>

      <div className="px-6 py-8">
        {/* Profile summary skeleton */}
        <div className="mb-8 flex items-center gap-4 rounded-xl bg-bg-elevated p-5">
          <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3.5 w-48 rounded" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        {/* Account section skeleton */}
        <div className="mb-8">
          <Skeleton className="mb-4 h-3 w-16 rounded" />
          <div className="overflow-hidden rounded-xl bg-bg-elevated">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 border-b border-border-default px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
              >
                <Skeleton className="h-4 w-24 flex-shrink-0 rounded" />
                <Skeleton className="h-9 w-full rounded-md sm:max-w-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy section skeleton */}
        <div className="mb-8">
          <Skeleton className="mb-4 h-3 w-28 rounded" />
          <div className="overflow-hidden rounded-xl bg-bg-elevated">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border-default px-5 py-4 last:border-b-0"
              >
                <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-44 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account actions skeleton */}
        <div>
          <Skeleton className="mb-4 h-3 w-28 rounded" />
          <div className="overflow-hidden rounded-xl bg-bg-elevated">
            <div className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
