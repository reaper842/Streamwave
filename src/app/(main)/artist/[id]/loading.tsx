import { Skeleton } from '@/components/ui/Skeleton'

function TrackRowSkeleton() {
  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-4 py-2">
      <Skeleton className="h-3 w-3 rounded" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 flex-shrink-0 rounded" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-36 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
      <Skeleton className="h-3 w-28 rounded" />
      <Skeleton className="h-3 w-10 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  )
}

function AlbumCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-bg-elevated p-4">
      <Skeleton className="aspect-square w-full rounded" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-4/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
      </div>
    </div>
  )
}

export default function ArtistLoading() {
  return (
    <div>
      {/* Hero banner skeleton */}
      <div className="relative h-60 overflow-hidden bg-bg-highlight">
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/60 to-transparent" />
        <div className="absolute bottom-4 left-6 flex flex-col gap-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-16 w-80 rounded" />
        </div>
        <div className="absolute bottom-4 right-6">
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-10 px-6 py-6">
        {/* Popular section */}
        <section>
          <Skeleton className="mb-4 h-7 w-24 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </section>

        {/* Discography section */}
        <section>
          <Skeleton className="mb-4 h-7 w-32 rounded" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
