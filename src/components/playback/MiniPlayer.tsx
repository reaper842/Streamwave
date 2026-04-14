'use client'

import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLoading = usePlayerStore((s) => s.isLoading)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)

  if (!currentTrack) return null

  return (
    <div className="flex h-full items-center gap-3 px-3">
      {/* Album art */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
        {currentTrack.albumCover ? (
          <Image
            src={currentTrack.albumCover}
            alt={`${currentTrack.albumTitle} cover`}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-bg-highlight" />
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-text-primary">
          {currentTrack.title}
        </p>
        <p className="truncate text-xs leading-tight text-text-secondary">
          {currentTrack.artistName}
        </p>
      </div>

      {/* Play / Pause */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-text-primary text-bg-base transition-opacity hover:opacity-90 active:opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={14} className="fill-bg-base" aria-hidden="true" />
        ) : (
          <Play size={14} className="translate-x-px fill-bg-base" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
