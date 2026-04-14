import { Skeleton } from '@/components/ui/Skeleton'

/** Skeleton card matching AlbumCard / PlaylistCard dimensions */
function CardSkeleton() {
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

export default function HomeLoading() {
  return (
    <div className="px-6 py-8">
      {/* Greeting */}
      <Skeleton className="mb-8 h-9 w-48 rounded" />

      {/* Featured Playlists */}
      <section className="mb-10">
        <Skeleton className="mb-4 h-7 w-40 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* New Releases */}
      <section className="mb-10">
        <Skeleton className="mb-4 h-7 w-32 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Genre browse */}
      <section>
        <Skeleton className="mb-4 h-7 w-24 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  )
}
