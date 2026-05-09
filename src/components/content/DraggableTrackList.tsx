'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { TrackListHeader } from './TrackRow'
import { SortableTrackRow } from './SortableTrackRow'
import { useLibraryStore } from '@/stores/library'
import type { TrackSummary } from '@/types/content'

interface DraggableTrackListProps {
  initialTracks: TrackSummary[]
  playlistId: string
  showAlbum?: boolean
  emptyMessage?: string
}

export function DraggableTrackList({
  initialTracks,
  playlistId,
  showAlbum = true,
  emptyMessage,
}: DraggableTrackListProps) {
  const [tracks, setTracks] = useState<TrackSummary[]>(initialTracks)
  const reorderPlaylistTracks = useLibraryStore((s) => s.reorderPlaylistTracks)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px movement before activating drag — prevents accidental drags on click
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = tracks.findIndex((t) => t.id === active.id)
      const newIndex = tracks.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      setTracks((prev) => arrayMove(prev, oldIndex, newIndex))
      void reorderPlaylistTracks(playlistId, String(active.id), newIndex)
    },
    [tracks, playlistId, reorderPlaylistTracks],
  )

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

  const allTrackIds = tracks.map((t) => t.id)

  return (
    <div className="flex flex-col">
      {/* 20px spacer matches the grip button width in SortableTrackRow */}
      <div className="flex">
        <div className="w-5 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <TrackListHeader showAlbum={showAlbum} />
        </div>
      </div>
      <DndContext
        id={`dnd-playlist-${playlistId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allTrackIds} strategy={verticalListSortingStrategy}>
          <div className="mt-2 flex flex-col">
            {tracks.map((track, index) => (
              <SortableTrackRow
                key={track.id}
                track={track}
                index={index}
                allTrackIds={allTrackIds}
                showAlbum={showAlbum}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
