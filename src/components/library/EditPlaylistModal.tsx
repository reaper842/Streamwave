'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useLibraryStore } from '@/stores/library'

interface EditPlaylistModalProps {
  open: boolean
  onClose: () => void
  playlistId: string
  initialName: string
  initialDescription: string | null
}

export function EditPlaylistModal({
  open,
  onClose,
  playlistId,
  initialName,
  initialDescription,
}: EditPlaylistModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [saving, setSaving] = useState(false)

  const updatePlaylist = useLibraryStore((s) => s.updatePlaylist)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await updatePlaylist(playlistId, {
      name: name.trim(),
      description: description.trim() || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit playlist details">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="playlist-name" className="text-sm font-semibold text-text-primary">
            Name
          </label>
          <input
            id="playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="rounded bg-bg-press px-3 py-2 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-accent-primary"
            placeholder="Playlist name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="playlist-description" className="text-sm font-semibold text-text-primary">
            Description
          </label>
          <textarea
            id="playlist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            className="resize-none rounded bg-bg-press px-3 py-2 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-accent-primary"
            placeholder="Add an optional description"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-highlight"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-full bg-accent-primary px-5 py-2 text-sm font-semibold text-bg-base transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
