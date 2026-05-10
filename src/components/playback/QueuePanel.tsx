'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { X, GripVertical, Play } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const jumpToIndex = usePlayerStore((s) => s.jumpToIndex)

  const currentTrack = queue[queueIndex] ?? null
  const upcomingTracks = queue.slice(queueIndex + 1)

  // Use absolute queue indices as sortable IDs — unique even when the same track
  // appears multiple times in the queue
  const sortableIds = upcomingTracks.map((_, i) => String(queueIndex + 1 + i))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      reorderQueue(Number(active.id), Number(over.id))
    },
    [reorderQueue],
  )

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
              onPlay={null}
            />
          </section>
        )}

        {/* Next in queue — drag to reorder */}
        {upcomingTracks.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
              Next in queue
            </h3>
            <DndContext
              id="dnd-queue"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {upcomingTracks.map((track, i) => {
                    const absoluteIndex = queueIndex + 1 + i
                    return (
                      <SortableQueueRow
                        key={`${track.id}-${absoluteIndex}`}
                        sortableId={String(absoluteIndex)}
                        title={track.title}
                        artistName={track.artistName}
                        albumCover={track.albumCover}
                        albumTitle={track.albumTitle}
                        durationMs={track.duration_ms}
                        onRemove={() => removeFromQueue(absoluteIndex)}
                        onPlay={() => jumpToIndex(absoluteIndex)}
                      />
                    )
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </section>
        )}
      </div>
    </div>
  )
}

// ── Sortable queue row ────────────────────────────────────────────────────────

interface SortableQueueRowProps {
  sortableId: string
  title: string
  artistName: string
  albumCover: string | null
  albumTitle: string
  durationMs: number
  onRemove: () => void
  onPlay: () => void
}

function SortableQueueRow({
  sortableId,
  title,
  artistName,
  albumCover,
  albumTitle,
  durationMs,
  onRemove,
  onPlay,
}: SortableQueueRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-stretch"
      onMouseEnter={() => setIsRowHovered(true)}
      onMouseLeave={() => setIsRowHovered(false)}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        className={cn(
          'flex w-5 flex-shrink-0 cursor-grab items-center justify-center text-text-subdued transition-opacity active:cursor-grabbing',
          isRowHovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <QueueTrackRow
          title={title}
          artistName={artistName}
          albumCover={albumCover}
          albumTitle={albumTitle}
          durationMs={durationMs}
          isActive={false}
          onRemove={onRemove}
          onPlay={onPlay}
        />
      </div>
    </li>
  )
}

// ── Static queue row ──────────────────────────────────────────────────────────

interface QueueTrackRowProps {
  title: string
  artistName: string
  albumCover: string | null
  albumTitle: string
  durationMs: number
  isActive: boolean
  onRemove: (() => void) | null
  onPlay: (() => void) | null
}

function QueueTrackRow({
  title,
  artistName,
  albumCover,
  albumTitle,
  durationMs,
  isActive,
  onRemove,
  onPlay,
}: QueueTrackRowProps) {
  return (
    <div
      onClick={onPlay ?? undefined}
      role={onPlay != null ? 'button' : undefined}
      tabIndex={onPlay != null ? 0 : undefined}
      onKeyDown={
        onPlay != null
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPlay()
              }
            }
          : undefined
      }
      aria-label={onPlay != null ? `Play ${title}` : undefined}
      className={cn(
        'group flex items-center gap-3 rounded px-2 py-2 transition-colors',
        isActive ? 'bg-bg-highlight' : 'hover:bg-bg-highlight',
        onPlay != null && 'cursor-pointer',
      )}
    >
      {/* Album art with optional play overlay */}
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
        {onPlay != null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Play size={14} fill="currentColor" className="text-white" />
          </div>
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
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
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
