'use client'

import { useCallback, useRef, useState } from 'react'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/lib/utils/formatDuration'

export function ProgressBar() {
  const { positionMs, durationMs, seek } = usePlayerStore()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPercent, setDragPercent] = useState(0)

  const percent = durationMs > 0 ? (positionMs / durationMs) * 100 : 0
  const displayPercent = isDragging ? dragPercent : percent

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

      const handleMouseMove = (ev: MouseEvent) => {
        setDragPercent(getPercentFromEvent(ev))
      }

      const handleMouseUp = (ev: MouseEvent) => {
        const finalPercent = getPercentFromEvent(ev)
        seek((finalPercent / 100) * durationMs)
        setIsDragging(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [durationMs, getPercentFromEvent, seek],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return
      const p = getPercentFromEvent(e)
      seek((p / 100) * durationMs)
    },
    [isDragging, durationMs, getPercentFromEvent, seek],
  )

  return (
    <div
      className="flex w-full max-w-sm items-center gap-2"
      role="group"
      aria-label="Playback progress"
    >
      <span className="w-8 text-right text-xs tabular-nums text-text-subdued" aria-hidden="true">
        {formatDuration(positionMs)}
      </span>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={positionMs}
        aria-valuetext={`${formatDuration(positionMs)} of ${formatDuration(durationMs)}`}
        tabIndex={0}
        className="group relative flex h-4 flex-1 cursor-pointer items-center"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') seek(Math.max(0, positionMs - 5000))
          if (e.key === 'ArrowRight') seek(Math.min(durationMs, positionMs + 5000))
        }}
      >
        {/* Track background */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-press transition-all group-hover:h-1.5">
          {/* Filled portion */}
          <div
            className="h-full rounded-full bg-text-secondary transition-colors group-hover:bg-accent-primary"
            style={{ width: `${displayPercent}%` }}
          />
        </div>
        {/* Scrub handle — visible on hover or drag */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100 pointer-events-none"
          style={{ left: `calc(${displayPercent}% - 6px)` }}
          aria-hidden="true"
        />
      </div>

      <span className="w-8 text-xs tabular-nums text-text-subdued" aria-hidden="true">
        {formatDuration(durationMs)}
      </span>
    </div>
  )
}
