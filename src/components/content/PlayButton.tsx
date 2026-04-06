'use client'

import { Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'

interface PlayAlbumButtonProps {
  albumId: string
}

export function PlayAlbumButton({ albumId }: PlayAlbumButtonProps) {
  const playAlbum = usePlayerStore((s) => s.playAlbum)

  const handleClick = () => void playAlbum(albumId)

  return (
    <button
      onClick={handleClick}
      aria-label="Play album"
      className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-bg-base shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover"
    >
      <Play size={24} fill="currentColor" className="translate-x-0.5" />
    </button>
  )
}

interface PlayPlaylistButtonProps {
  playlistId: string
}

export function PlayPlaylistButton({ playlistId }: PlayPlaylistButtonProps) {
  const { playPlaylist } = usePlayerStore((s) => ({ playPlaylist: s.playPlaylist }))

  const handleClick = () => void playPlaylist(playlistId)

  return (
    <button
      onClick={handleClick}
      aria-label="Play playlist"
      className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-bg-base shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover"
    >
      <Play size={24} fill="currentColor" className="translate-x-0.5" />
    </button>
  )
}
