'use client'

import { useLibraryStore } from '@/stores/library'
import { cn } from '@/lib/utils/cn'

interface SaveAlbumButtonProps {
  albumId: string
}

export function SaveAlbumButton({ albumId }: SaveAlbumButtonProps) {
  const isSaved = useLibraryStore((s) => s.isSaved)
  const toggleSaveAlbum = useLibraryStore((s) => s.toggleSaveAlbum)

  const saved = isSaved(albumId)

  return (
    <button
      onClick={() => void toggleSaveAlbum(albumId)}
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
