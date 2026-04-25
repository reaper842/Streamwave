import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div>
      {/* Tab bar skeleton */}
      <div className="flex gap-2 px-6 pt-5 pb-1">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      {/* Hero skeleton */}
      <div className="bg-gradient-to-b from-indigo-900 to-bg-base px-6 pb-8 pt-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Skeleton className="h-36 w-36 flex-shrink-0 rounded-full sm:h-44 sm:w-44" />
          <div className="flex flex-col gap-3 pb-2">
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="h-12 w-64 rounded sm:w-80 md:w-96" />
            <Skeleton className="h-4 w-48 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Action bar skeleton */}
      <div className="flex items-center gap-3 px-6 py-5">
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="px-6 pb-8">
        <Skeleton className="mb-4 h-7 w-36 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl bg-bg-elevated p-5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick access skeleton */}
      <div className="px-6 pb-10">
        <Skeleton className="mb-4 h-7 w-36 rounded" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md bg-bg-elevated p-4">
              <Skeleton className="h-12 w-12 flex-shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
