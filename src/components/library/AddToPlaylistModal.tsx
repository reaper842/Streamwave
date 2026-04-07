'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Music, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLibraryStore } from '@/stores/library'

interface AddToPlaylistModalProps {
  open: boolean
  onClose: () => void
  trackId: string
  trackTitle: string
}

export function AddToPlaylistModal({
  open,
  onClose,
  trackId,
  trackTitle,
}: AddToPlaylistModalProps) {
  const [adding, setAdding] = useState<string | null>(null)

  const { playlists, addTrackToPlaylist, createPlaylist } = useLibraryStore((s) => ({
    playlists: s.playlists,
    addTrackToPlaylist: s.addTrackToPlaylist,
    createPlaylist: s.createPlaylist,
  }))

  const handleAdd = async (playlistId: string) => {
    setAdding(playlistId)
    await addTrackToPlaylist(playlistId, trackId)
    setAdding(null)
    onClose()
  }

  const handleCreateAndAdd = async () => {
    const name = `My Playlist #${playlists.length + 1}`
    const result = await createPlaylist(name)
    if (result) {
      await addTrackToPlaylist(result.id, trackId)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add "${trackTitle}" to playlist`}>
      <div className="flex flex-col gap-1">
        {/* Create new playlist */}
        <button
          onClick={() => void handleCreateAndAdd()}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-highlight"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-bg-press">
            <Plus size={18} className="text-text-secondary" />
          </div>
          <span className="font-semibold">New playlist</span>
        </button>

        <div className="my-1 border-t border-border-default" />

        {playlists.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-text-subdued">
            No playlists yet. Create one above.
          </p>
        )}

        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => void handleAdd(playlist.id)}
            disabled={adding === playlist.id}
            className="flex items-center gap-3 rounded px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-highlight disabled:opacity-60"
          >
            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
              {playlist.cover_url ? (
                <Image
                  src={playlist.cover_url}
                  alt={playlist.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-bg-press">
                  <Music size={16} className="text-text-subdued" />
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate font-medium">{playlist.name}</p>
              <p className="text-xs text-text-secondary">{playlist.total_tracks} songs</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
