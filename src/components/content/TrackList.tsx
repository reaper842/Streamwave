import { TrackRow, TrackListHeader } from './TrackRow'
import type { TrackSummary } from '@/types/content'

interface TrackListProps {
  tracks: TrackSummary[]
  showAlbum?: boolean
  emptyMessage?: string
}

export function TrackList({ tracks, showAlbum = true, emptyMessage }: TrackListProps) {
  if (tracks.length === 0 && emptyMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-text-primary">{emptyMessage}</p>
        <p className="mt-2 text-sm text-text-secondary">
          Add songs using the search or context menus.
        </p>
      </div>
    )
  }

  // Pre-compute IDs so clicking any row loads the full list into the queue.
  const allTrackIds = tracks.map((t) => t.id)

  return (
    <div className="flex flex-col">
      <TrackListHeader showAlbum={showAlbum} />
      <div className="mt-2 flex flex-col">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            showAlbum={showAlbum}
            allTrackIds={allTrackIds}
          />
        ))}
      </div>
    </div>
  )
}
