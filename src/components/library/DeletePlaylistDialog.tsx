'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { useLibraryStore } from '@/stores/library'

interface DeletePlaylistDialogProps {
  open: boolean
  onClose: () => void
  playlistId: string
  playlistName: string
}

export function DeletePlaylistDialog({
  open,
  onClose,
  playlistId,
  playlistName,
}: DeletePlaylistDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)

  const handleDelete = async () => {
    setDeleting(true)
    await deletePlaylist(playlistId)
    setDeleting(false)
    onClose()
    router.push('/library')
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete playlist">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-text-primary">{playlistName}</span>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-highlight"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
