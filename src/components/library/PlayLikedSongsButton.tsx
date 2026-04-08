'use client'

import { Play, Shuffle } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'

interface PlayLikedSongsButtonProps {
  trackIds: string[]
}

export function PlayLikedSongsButton({ trackIds }: PlayLikedSongsButtonProps) {
  const playFromTrackIds = usePlayerStore((s) => s.playFromTrackIds)
  const setShuffle = usePlayerStore((s) => s.setShuffle)

  const handlePlay = () => {
    setShuffle(false)
    void playFromTrackIds(trackIds, 0)
  }

  const handleShuffle = () => {
    setShuffle(true)
    void playFromTrackIds(trackIds, 0)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handlePlay}
        aria-label="Play liked songs"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-bg-base shadow-lg transition-all hover:scale-105 hover:bg-accent-hover"
      >
        <Play size={24} fill="currentColor" />
      </button>
      <button
        onClick={handleShuffle}
        aria-label="Shuffle liked songs"
        className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
      >
        <Shuffle size={24} />
      </button>
    </div>
  )
}
