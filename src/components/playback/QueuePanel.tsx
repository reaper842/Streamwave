'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/lib/utils/formatDuration'
import { cn } from '@/lib/utils/cn'

interface QueuePanelProps {
  isOpen: boolean
  onClose: () => void
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)

  const currentTrack = queue[queueIndex] ?? null
  const upcomingTracks = queue.slice(queueIndex + 1)

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-[90px] right-0 z-30 flex w-[340px] flex-col border-l border-border-default bg-bg-elevated"
      style={{ top: '64px' }}
      role="complementary"
      aria-label="Queue"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <h2 className="text-base font-bold text-text-primary">Queue</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Close queue"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!currentTrack && queue.length === 0 && (
          <p className="mt-8 text-center text-sm text-text-secondary">
            Add tracks to the queue to see them here.
          </p>
        )}

        {/* Now Playing */}
        {currentTrack && (
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
              Now playing
            </h3>
            <QueueTrackRow
              title={currentTrack.title}
              artistName={currentTrack.artistName}
              albumCover={currentTrack.albumCover}
              albumTitle={currentTrack.albumTitle}
              durationMs={currentTrack.duration_ms}
              isActive={true}
              onRemove={null}
            />
          </section>
        )}

        {/* Next in queue */}
        {upcomingTracks.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
              Next in queue
            </h3>
            <ul className="space-y-1">
              {upcomingTracks.map((track, i) => (
                <li key={`${track.id}-${i}`}>
                  <QueueTrackRow
                    title={track.title}
                    artistName={track.artistName}
                    albumCover={track.albumCover}
                    albumTitle={track.albumTitle}
                    durationMs={track.duration_ms}
                    isActive={false}
                    onRemove={() => removeFromQueue(queueIndex + 1 + i)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

interface QueueTrackRowProps {
  title: string
  artistName: string
  albumCover: string | null
  albumTitle: string
  durationMs: number
  isActive: boolean
  onRemove: (() => void) | null
}

function QueueTrackRow({
  title,
  artistName,
  albumCover,
  albumTitle,
  durationMs,
  isActive,
  onRemove,
}: QueueTrackRowProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded px-2 py-2 transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-highlight',
      )}
    >
      {/* Album art */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
        {albumCover ? (
          <Image
            src={albumCover}
            alt={`${albumTitle} cover`}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-bg-press" />
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-semibold leading-tight',
            isActive ? 'text-accent-primary' : 'text-text-primary',
          )}
        >
          {title}
        </p>
        <p className="truncate text-xs leading-tight text-text-secondary">{artistName}</p>
      </div>

      {/* Duration + remove */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <span className="text-xs text-text-secondary">{formatDuration(durationMs)}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 rounded p-0.5 text-text-secondary opacity-0 transition-opacity hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Remove ${title} from queue`}
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
