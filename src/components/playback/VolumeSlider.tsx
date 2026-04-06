'use client'

import { useCallback, useRef, useState } from 'react'
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'

function VolumeIcon({ volume, isMuted }: { volume: number; isMuted: boolean }) {
  if (isMuted || volume === 0) return <VolumeX size={16} aria-hidden="true" />
  if (volume < 0.33) return <Volume size={16} aria-hidden="true" />
  if (volume < 0.67) return <Volume1 size={16} aria-hidden="true" />
  return <Volume2 size={16} aria-hidden="true" />
}

export function VolumeSlider() {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPercent, setDragPercent] = useState(0)

  const displayPercent = isMuted ? 0 : isDragging ? dragPercent : volume * 100

  const getPercentFromEvent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(100, (x / rect.width) * 100))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const p = getPercentFromEvent(e)
      setIsDragging(true)
      setDragPercent(p)

      const handleMouseMove = (ev: MouseEvent) => setDragPercent(getPercentFromEvent(ev))

      const handleMouseUp = (ev: MouseEvent) => {
        const finalPercent = getPercentFromEvent(ev)
        setVolume(finalPercent / 100)
        setIsDragging(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [getPercentFromEvent, setVolume],
  )

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={toggleMute}
        className="text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        aria-pressed={isMuted}
      >
        <VolumeIcon volume={volume} isMuted={isMuted} />
      </button>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayPercent)}
        tabIndex={0}
        className="group relative flex h-4 w-20 cursor-pointer items-center"
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setVolume(Math.max(0, volume - 0.05))
          if (e.key === 'ArrowRight') setVolume(Math.min(1, volume + 0.05))
        }}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-press transition-all group-hover:h-1.5">
          <div
            className="h-full rounded-full bg-text-secondary transition-colors group-hover:bg-accent-primary"
            style={{ width: `${displayPercent}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100 pointer-events-none"
          style={{ left: `calc(${displayPercent}% - 6px)` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
