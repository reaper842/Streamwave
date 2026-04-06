'use client'

import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { cn } from '@/lib/utils/cn'
import { ProgressBar } from './ProgressBar'
import type { RepeatMode } from '@/lib/audio/engine'

export function TransportControls() {
  const {
    isPlaying,
    isLoading,
    shuffleEnabled,
    repeatMode,
    togglePlayPause,
    next,
    previous,
    setShuffle,
    setRepeat,
  } = usePlayerStore()

  function cycleRepeat(current: RepeatMode): void {
    const next: RepeatMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off'
    setRepeat(next)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Control buttons row */}
      <div className="flex items-center gap-4">
        {/* Shuffle */}
        <button
          onClick={() => setShuffle(!shuffleEnabled)}
          className={cn(
            'relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded',
            shuffleEnabled
              ? 'text-accent-primary hover:text-accent-hover'
              : 'text-text-secondary hover:text-text-primary',
          )}
          aria-label={shuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
          aria-pressed={shuffleEnabled}
        >
          <Shuffle size={16} aria-hidden="true" />
          {shuffleEnabled && (
            <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-primary" />
          )}
        </button>

        {/* Previous */}
        <button
          onClick={previous}
          className="text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
          aria-label="Previous track"
        >
          <SkipBack size={20} aria-hidden="true" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-text-primary text-bg-base',
            'hover:scale-105 active:scale-100 transition-transform',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={16} className="fill-bg-base" aria-hidden="true" />
          ) : (
            <Play size={16} className="translate-x-px fill-bg-base" aria-hidden="true" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={next}
          className="text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
          aria-label="Next track"
        >
          <SkipForward size={20} aria-hidden="true" />
        </button>

        {/* Repeat */}
        <button
          onClick={() => cycleRepeat(repeatMode)}
          className={cn(
            'relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded',
            repeatMode !== 'off'
              ? 'text-accent-primary hover:text-accent-hover'
              : 'text-text-secondary hover:text-text-primary',
          )}
          aria-label={
            repeatMode === 'off'
              ? 'Enable repeat'
              : repeatMode === 'all'
                ? 'Enable repeat one'
                : 'Disable repeat'
          }
          aria-pressed={repeatMode !== 'off'}
        >
          {repeatMode === 'one' ? (
            <Repeat1 size={16} aria-hidden="true" />
          ) : (
            <Repeat size={16} aria-hidden="true" />
          )}
          {repeatMode !== 'off' && (
            <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-primary" />
          )}
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar />
    </div>
  )
}
