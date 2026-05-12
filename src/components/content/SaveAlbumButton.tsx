'use client'

import { useLibraryStore } from '@/stores/library'
import type { SavedAlbumSummary } from '@/stores/library'
import { cn } from '@/lib/utils/cn'

interface SaveAlbumButtonProps {
  albumId: string
  albumData?: SavedAlbumSummary
}

export function SaveAlbumButton({ albumId, albumData }: SaveAlbumButtonProps) {
  const saved = useLibraryStore((s) => s.savedAlbumIds.has(albumId))
  const toggleSaveAlbum = useLibraryStore((s) => s.toggleSaveAlbum)

  return (
    <button
      onClick={() => void toggleSaveAlbum(albumId, albumData)}
      aria-label={saved ? 'Remove from library' : 'Save to library'}
      className={cn(
        'rounded-full border px-6 py-1.5 text-sm font-semibold transition-colors',
        saved
          ? 'border-text-secondary text-text-primary hover:border-text-primary'
          : 'border-text-secondary text-text-secondary hover:border-text-primary hover:text-text-primary',
      )}
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
