'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TrackRow } from './TrackRow'
import type { TrackSummary } from '@/types/content'

interface SortableTrackRowProps {
  track: TrackSummary
  index: number
  allTrackIds?: string[]
  showAlbum?: boolean
}

export function SortableTrackRow({ track, index, allTrackIds, showAlbum }: SortableTrackRowProps) {
  const [isRowHovered, setIsRowHovered] = useState(false)

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
    <div
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
      {/* flex-1 so TrackRow fills the remaining width */}
      <div className="min-w-0 flex-1">
        <TrackRow track={track} index={index} allTrackIds={allTrackIds} showAlbum={showAlbum} />
      </div>
    </div>
  )
}
