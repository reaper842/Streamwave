'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { EditPlaylistModal } from '@/components/library/EditPlaylistModal'
import { DeletePlaylistDialog } from '@/components/library/DeletePlaylistDialog'

interface PlaylistControlsProps {
  playlistId: string
  playlistName: string
  playlistDescription: string | null
  isOwner: boolean
}

export function PlaylistControls({
  playlistId,
  playlistName,
  playlistDescription,
  isOwner,
}: PlaylistControlsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const playPlaylist = usePlayerStore((s) => s.playPlaylist)

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Play button */}
        <button
          onClick={() => void playPlaylist(playlistId)}
          aria-label="Play playlist"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-bg-base shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover"
        >
          <Play size={24} fill="currentColor" className="translate-x-0.5" />
        </button>

        {/* More options (owner only) */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              aria-haspopup="menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary"
            >
              <MoreHorizontal size={24} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-1 min-w-44 rounded bg-bg-highlight py-1 shadow-xl"
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setEditOpen(true)
                    }}
                    className="flex h-9 w-full items-center gap-3 px-3 text-left text-sm text-text-primary transition-colors hover:bg-bg-press"
                  >
                    <Pencil size={14} />
                    Edit details
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    }}
                    className="flex h-9 w-full items-center gap-3 px-3 text-left text-sm text-red-400 transition-colors hover:bg-bg-press hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Delete playlist
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <EditPlaylistModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        playlistId={playlistId}
        initialName={playlistName}
        initialDescription={playlistDescription}
      />

      <DeletePlaylistDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        playlistId={playlistId}
        playlistName={playlistName}
      />
    </>
  )
}
