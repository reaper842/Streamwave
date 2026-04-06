'use client'

import Image from 'next/image'
import { Heart } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { cn } from '@/lib/utils/cn'

export function NowPlaying() {
  const { currentTrack } = usePlayerStore()

  if (!currentTrack) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 flex-shrink-0 rounded bg-bg-highlight" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-secondary">—</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Album art */}
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded">
        {currentTrack.albumCover ? (
          <Image
            src={currentTrack.albumCover}
            alt={`${currentTrack.albumTitle} cover`}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-bg-highlight" />
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary leading-tight">
          {currentTrack.title}
        </p>
        <p className="truncate text-xs text-text-secondary leading-tight mt-0.5">
          {currentTrack.artistName}
        </p>
      </div>

      {/* Like button — placeholder for M5 library integration */}
      <button
        className={cn(
          'flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded',
        )}
        aria-label="Like track"
      >
        <Heart size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
