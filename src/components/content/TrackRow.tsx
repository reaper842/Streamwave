'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Heart, Play } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDuration } from '@/lib/utils/formatDuration'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { ContextMenuTrigger } from '@/components/ui/ContextMenu'
import type { TrackSummary } from '@/types/content'

const AddToPlaylistModal = dynamic(
  () =>
    import('@/components/library/AddToPlaylistModal').then((m) => ({
      default: m.AddToPlaylistModal,
    })),
  { ssr: false },
)

interface TrackRowProps {
  track: TrackSummary
  index: number
  /** All track IDs in the current list context — clicking loads the full list into the queue */
  allTrackIds?: string[]
  /** Show the album column (hidden on album pages since it's redundant) */
  showAlbum?: boolean
  className?: string
}

export function TrackRow({
  track,
  index,
  allTrackIds,
  showAlbum = true,
  className,
}: TrackRowProps) {
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false)

  const playTrack = usePlayerStore((s) => s.playTrack)
  const playFromTrackIds = usePlayerStore((s) => s.playFromTrackIds)
  const addTrackToQueue = usePlayerStore((s) => s.addTrackToQueue)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const liked = useLibraryStore((s) => s.likedSongIds.has(track.id))
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  const isCurrentTrack = currentTrack?.id === track.id
  const isCurrentlyPlaying = isCurrentTrack && isPlaying

  const handlePlay = () => {
    if (allTrackIds && allTrackIds.length > 1) {
      void playFromTrackIds(allTrackIds, index)
    } else {
      void playTrack(track.id)
    }
  }

  const contextItems = [
    {
      label: 'Add to queue',
      onClick: () => void addTrackToQueue(track.id),
    },
    {
      label: 'Add to playlist',
      onClick: () => setAddToPlaylistOpen(true),
    },
    {
      label: liked ? 'Remove from liked songs' : 'Save to liked songs',
      onClick: () => void toggleLike(track.id),
    },
    {
      label: 'Go to artist',
      onClick: () => {
        window.location.href = `/artist/${track.artist.id}`
      },
    },
    {
      label: 'Go to album',
      onClick: () => {
        window.location.href = `/album/${track.album.id}`
      },
    },
  ]

  return (
    <>
      <div
        className={cn(
          'group grid items-center gap-4 rounded px-4 py-2 transition-colors duration-150 hover:bg-bg-highlight',
          showAlbum
            ? 'grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]'
            : 'grid-cols-[16px_minmax(0,1fr)_auto_auto_auto]',
          isCurrentTrack && 'text-accent-primary',
          className,
        )}
        onDoubleClick={handlePlay}
      >
        {/* Index / Play icon */}
        <div className="flex items-center justify-center text-sm">
          <span
            className={cn(
              'group-hover:hidden',
              isCurrentlyPlaying ? 'hidden' : 'block',
              isCurrentTrack ? 'text-accent-primary' : 'text-text-secondary',
            )}
          >
            {isCurrentlyPlaying ? <span className="text-accent-primary">▶</span> : index + 1}
          </span>
          <button
            aria-label={`Play ${track.title}`}
            onClick={handlePlay}
            className={cn(
              'hidden group-hover:flex items-center justify-center text-text-primary hover:text-accent-primary',
              isCurrentlyPlaying && 'flex',
            )}
          >
            <Play size={14} fill="currentColor" />
          </button>
        </div>

        {/* Title + artist (with album art) */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
            {track.album.cover_url ? (
              <Image
                src={track.album.cover_url}
                alt={track.album.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-bg-press" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'truncate text-sm font-medium',
                isCurrentTrack ? 'text-accent-primary' : 'text-text-primary',
              )}
            >
              {track.title}
            </span>
            <Link
              href={`/artist/${track.artist.id}`}
              className="truncate text-xs text-text-secondary hover:text-text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist.name}
            </Link>
          </div>
        </div>

        {/* Album link (optional) */}
        {showAlbum && (
          <Link
            href={`/album/${track.album.id}`}
            className="truncate text-sm text-text-secondary hover:text-text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {track.album.title}
          </Link>
        )}

        {/* Duration */}
        <span className="text-sm tabular-nums text-text-secondary">
          {formatDuration(track.duration_ms)}
        </span>

        {/* Like button (hidden until hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            void toggleLike(track.id)
          }}
          aria-label={liked ? 'Remove from liked songs' : 'Save to liked songs'}
          className={cn(
            'opacity-0 transition-all group-hover:opacity-100',
            liked
              ? 'text-accent-primary hover:text-accent-hover opacity-100'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        {/* Three-dot context menu */}
        <div className="opacity-0 group-hover:opacity-100">
          <ContextMenuTrigger items={contextItems} />
        </div>
      </div>

      <AddToPlaylistModal
        open={addToPlaylistOpen}
        onClose={() => setAddToPlaylistOpen(false)}
        trackId={track.id}
        trackTitle={track.title}
      />
    </>
  )
}

/** Header row matching TrackRow column layout */
interface TrackListHeaderProps {
  showAlbum?: boolean
}

export function TrackListHeader({ showAlbum = true }: TrackListHeaderProps) {
  return (
    <div
      className={cn(
        'grid items-center gap-4 border-b border-border-default px-4 pb-2 text-xs font-medium uppercase tracking-wider text-text-subdued',
        showAlbum
          ? 'grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]'
          : 'grid-cols-[16px_minmax(0,1fr)_auto_auto_auto]',
      )}
    >
      <span className="text-center">#</span>
      <span>Title</span>
      {showAlbum && <span>Album</span>}
      <span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-label="Duration"
          className="ml-auto"
        >
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3.25a.75.75 0 0 1 .75.75v2.69l1.28 1.28a.75.75 0 1 1-1.06 1.06l-1.5-1.5A.75.75 0 0 1 7.25 8.5V5.5A.75.75 0 0 1 8 4.75z" />
        </svg>
      </span>
      <span />
      <span />
    </div>
  )
}
