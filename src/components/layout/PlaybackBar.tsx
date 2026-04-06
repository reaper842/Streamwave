'use client'

import { cn } from '@/lib/utils/cn'
import { Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'

export function PlaybackBar() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 h-[90px] border-t border-border-default bg-bg-elevated px-4"
      aria-label="Playback controls"
    >
      <div className="grid h-full grid-cols-3 items-center">
        {/* Now Playing — left 30% */}
        <NowPlayingSection />

        {/* Transport Controls — center 40% */}
        <TransportControlsSection />

        {/* Volume / Queue — right 30% */}
        <VolumeSection />
      </div>
    </footer>
  )
}

function NowPlayingSection() {
  return (
    <div className="flex items-center gap-3">
      {/* Placeholder album art */}
      <div className="h-14 w-14 flex-shrink-0 rounded bg-bg-highlight" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">No track playing</p>
        <p className="truncate text-xs text-text-secondary">—</p>
      </div>
    </div>
  )
}

function TransportControlsSection() {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Buttons row */}
      <div className="flex items-center gap-4">
        <button
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle shuffle"
        >
          <Shuffle size={16} aria-hidden="true" />
        </button>
        <button
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Previous track"
        >
          <SkipBack size={20} aria-hidden="true" />
        </button>
        <button
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full bg-text-primary text-bg-base',
            'hover:scale-105 active:scale-100 transition-transform',
          )}
          aria-label="Play"
        >
          <Play size={16} className="translate-x-px" aria-hidden="true" />
        </button>
        <button
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Next track"
        >
          <SkipForward size={20} aria-hidden="true" />
        </button>
        <button
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle repeat"
        >
          <Repeat size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex w-full max-w-sm items-center gap-2">
        <span className="w-8 text-right text-xs text-text-subdued">0:00</span>
        <div
          role="slider"
          aria-label="Playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="group relative h-1 flex-1 cursor-pointer rounded-full bg-bg-highlight hover:h-1.5 transition-all"
        >
          <div
            className="h-full rounded-full bg-text-secondary group-hover:bg-accent-primary transition-colors"
            style={{ width: '0%' }}
          />
        </div>
        <span className="w-8 text-xs text-text-subdued">0:00</span>
      </div>
    </div>
  )
}

function VolumeSection() {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        className="text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Toggle mute"
      >
        <Volume2 size={16} aria-hidden="true" />
      </button>
      <div
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
        className="group relative h-1 w-20 cursor-pointer rounded-full bg-bg-highlight hover:h-1.5 transition-all"
      >
        <div
          className="h-full rounded-full bg-text-secondary group-hover:bg-accent-primary transition-colors"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}
