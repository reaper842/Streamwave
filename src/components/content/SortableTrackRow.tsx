'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TrackRow } from './TrackRow'
import type { TrackSummary } from '@/types/content'

interface SortableTrackRowProps {
  track: TrackSummary
  index: number
  allTrackIds?: string[]
  showAlbum?: boolean
}

export function SortableTrackRow({ track, index, allTrackIds, showAlbum }: SortableTrackRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    // Named group "row" so grip hover targets this container, not TrackRow's inner group
    <div ref={setNodeRef} style={style} className="group/row flex items-stretch">
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        className="flex w-5 flex-shrink-0 cursor-grab items-center justify-center text-text-subdued opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      {/* flex-1 so TrackRow fills the remaining width */}
      <div className="min-w-0 flex-1">
        <TrackRow track={track} index={index} allTrackIds={allTrackIds} showAlbum={showAlbum} />
      </div>
    </div>
  )
}
