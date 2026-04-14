import { Skeleton } from '@/components/ui/Skeleton'

function TrackRowSkeleton({ showAlbum = false }: { showAlbum?: boolean }) {
  return (
    <div
      className={[
        'grid items-center gap-4 px-4 py-2',
        showAlbum
          ? 'grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]'
          : 'grid-cols-[16px_minmax(0,1fr)_auto_auto_auto]',
      ].join(' ')}
    >
      <Skeleton className="h-3 w-3 rounded" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 flex-shrink-0 rounded" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      {showAlbum && <Skeleton className="h-3 w-28 rounded" />}
      <Skeleton className="h-3 w-10 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  )
}

export default function AlbumLoading() {
  return (
    <div>
      {/* Hero header skeleton */}
      <div className="flex items-end gap-6 bg-gradient-to-b from-bg-highlight to-bg-base px-6 pb-6 pt-16">
        <Skeleton className="h-[232px] w-[232px] flex-shrink-0 rounded shadow-2xl" />
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-14 w-72 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="flex items-center gap-4 px-6 py-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-8 w-16 rounded" />
      </div>

      {/* Track list skeleton */}
      <div className="px-6 pb-8">
        <div className="mb-2 grid grid-cols-[16px_minmax(0,1fr)_auto_auto_auto] items-center gap-4 border-b border-border-default px-4 pb-2">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
          <span />
          <span />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <TrackRowSkeleton key={i} showAlbum={false} />
        ))}
      </div>
    </div>
  )
}
