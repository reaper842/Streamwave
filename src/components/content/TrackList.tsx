import { TrackRow, TrackListHeader } from './TrackRow'
import type { TrackSummary } from '@/types/content'

interface TrackListProps {
  tracks: TrackSummary[]
  showAlbum?: boolean
}

export function TrackList({ tracks, showAlbum = true }: TrackListProps) {
  return (
    <div className="flex flex-col">
      <TrackListHeader showAlbum={showAlbum} />
      <div className="mt-2 flex flex-col">
        {tracks.map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} showAlbum={showAlbum} />
        ))}
      </div>
    </div>
  )
}
