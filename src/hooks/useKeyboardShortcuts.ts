'use client'

import { useEffect } from 'react'
import { usePlayerStore } from '@/stores/player'

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Global keyboard shortcuts for playback control.
 * Mounted once in the root layout. Shortcuts are suppressed when focus is in an input field.
 *
 * Space          → Toggle play/pause
 * ← / →          → Seek ±5 seconds
 * ↑ / ↓          → Volume ±5%
 * Shift+← / →    → Previous / Next track
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      // Suppress shortcuts when focus is inside a text input
      if (target && INPUT_TAGS.has(target.tagName)) return
      if (target?.isContentEditable) return

      const store = usePlayerStore.getState()

      switch (true) {
        case e.code === 'Space': {
          e.preventDefault()
          store.togglePlayPause()
          break
        }
        case e.code === 'ArrowLeft' && e.shiftKey: {
          e.preventDefault()
          store.previous()
          break
        }
        case e.code === 'ArrowRight' && e.shiftKey: {
          e.preventDefault()
          store.next()
          break
        }
        case e.code === 'ArrowLeft': {
          e.preventDefault()
          store.seek(Math.max(0, store.positionMs - 5000))
          break
        }
        case e.code === 'ArrowRight': {
          e.preventDefault()
          store.seek(Math.min(store.durationMs, store.positionMs + 5000))
          break
        }
        case e.code === 'ArrowUp': {
          e.preventDefault()
          store.setVolume(Math.min(1, store.volume + 0.05))
          break
        }
        case e.code === 'ArrowDown': {
          e.preventDefault()
          store.setVolume(Math.max(0, store.volume - 0.05))
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
