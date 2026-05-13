'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Music,
} from 'lucide-react'
import Image from 'next/image'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlaylistItem {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  created_at: string
  user: { id: string; display_name: string }
  _count: { tracks: number }
}

interface TrackOption {
  id: string
  title: string
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
}

interface PlaylistTrack {
  position: number
  track: TrackOption & { duration_ms: number }
}

interface PlaylistForm {
  name: string
  description: string
  isPublic: boolean
}

const EMPTY_FORM: PlaylistForm = { name: '', description: '', isPublic: true }

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPlaylistsPage() {
  const { showToast } = useToast()

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlaylistForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Track management panel
  const [managingPlaylist, setManagingPlaylist] = useState<PlaylistItem | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([])
  const [allTracks, setAllTracks] = useState<TrackOption[]>([])
  const [addTrackId, setAddTrackId] = useState('')
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [removingTrackId, setRemovingTrackId] = useState<string | null>(null)
  const [addingTrack, setAddingTrack] = useState(false)

  const loadPlaylists = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await apiClient.get<{ items: PlaylistItem[]; total: number }>(
          `/admin/playlists?page=${p}&limit=${limit}`,
        )
        setPlaylists(res.data.items)
        setTotal(res.data.total)
      } catch {
        showToast('Failed to load playlists', 'error')
      } finally {
        setLoading(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    loadPlaylists(page)
  }, [page, loadPlaylists])

  // Load all tracks for the add-track dropdown when manage panel opens
  useEffect(() => {
    if (!managingPlaylist) return
    apiClient
      .get<TrackOption[]>('/admin/tracks?limit=500')
      .then((r) => {
        // r.data is actually { items, total } here
        const raw = r.data as unknown as { items: TrackOption[] }
        setAllTracks(raw.items ?? [])
      })
      .catch(() => {})
  }, [managingPlaylist])

  async function openManage(playlist: PlaylistItem) {
    setManagingPlaylist(playlist)
    setAddTrackId('')
    setLoadingTracks(true)
    try {
      const res = await apiClient.get<PlaylistTrack[]>(`/admin/playlists/${playlist.id}/tracks`)
      setPlaylistTracks(res.data)
    } catch {
      showToast('Failed to load playlist tracks', 'error')
    } finally {
      setLoadingTracks(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(pl: PlaylistItem) {
    setEditingId(pl.id)
    setForm({ name: pl.name, description: pl.description ?? '', isPublic: pl.is_public })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('Playlist name is required', 'error')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || undefined,
      isPublic: form.isPublic,
    }
    try {
      if (editingId) {
        await apiClient.patch(`/admin/playlists/${editingId}`, payload)
        showToast('Playlist updated', 'success')
      } else {
        await apiClient.post('/admin/playlists', payload)
        showToast('Playlist created', 'success')
      }
      closeForm()
      loadPlaylists(page)
    } catch {
      showToast('Failed to save playlist', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this playlist? All track associations will be removed.')) return
    setDeletingId(id)
    try {
      await apiClient.delete(`/admin/playlists/${id}`)
      showToast('Playlist deleted', 'success')
      if (managingPlaylist?.id === id) setManagingPlaylist(null)
      loadPlaylists(page)
    } catch {
      showToast('Failed to delete playlist', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAddTrack() {
    if (!managingPlaylist || !addTrackId) return
    setAddingTrack(true)
    try {
      await apiClient.post(`/admin/playlists/${managingPlaylist.id}/tracks`, {
        trackId: addTrackId,
      })
      showToast('Track added', 'success')
      setAddTrackId('')
      const res = await apiClient.get<PlaylistTrack[]>(
        `/admin/playlists/${managingPlaylist.id}/tracks`,
      )
      setPlaylistTracks(res.data)
    } catch {
      showToast('Failed to add track', 'error')
    } finally {
      setAddingTrack(false)
    }
  }

  async function handleRemoveTrack(trackId: string) {
    if (!managingPlaylist) return
    setRemovingTrackId(trackId)
    try {
      await apiClient.delete(`/admin/playlists/${managingPlaylist.id}/tracks/${trackId}`)
      showToast('Track removed', 'success')
      setPlaylistTracks((prev) => prev.filter((pt) => pt.track.id !== trackId))
    } catch {
      showToast('Failed to remove track', 'error')
    } finally {
      setRemovingTrackId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // Already-added track IDs for filtering the dropdown
  const addedIds = new Set(playlistTracks.map((pt) => pt.track.id))

  return (
    <div className="flex gap-6 min-h-0">
      {/* Left — playlist list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Playlists</h1>
            <p className="text-text-secondary mt-1">{total.toLocaleString()} total playlists</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-full text-sm transition-colors"
          >
            <Plus size={16} />
            New Playlist
          </button>
        </div>

        <div className="bg-bg-elevated rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-subdued">Loading…</div>
          ) : playlists.length === 0 ? (
            <div className="p-8 text-center text-text-subdued">No playlists yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-text-subdued text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Owner</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell w-16 text-center">
                    Tracks
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell w-16 text-center">
                    Public
                  </th>
                  <th className="px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {playlists.map((pl) => (
                  <tr
                    key={pl.id}
                    className="border-b border-border-default last:border-0 hover:bg-bg-highlight transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {pl.cover_url ? (
                          <Image
                            src={pl.cover_url}
                            alt={pl.name}
                            width={36}
                            height={36}
                            className="rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-bg-press flex items-center justify-center flex-shrink-0">
                            <ListMusic size={16} className="text-text-subdued" />
                          </div>
                        )}
                        <span className="text-text-primary font-medium truncate max-w-[180px]">
                          {pl.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                      {pl.user.display_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell text-center">
                      {pl._count.tracks}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${pl.is_public ? 'bg-accent-primary' : 'bg-text-subdued'}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openManage(pl)}
                          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-press rounded transition-colors"
                          title="Manage tracks"
                        >
                          <Music size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(pl)}
                          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-press rounded transition-colors"
                          aria-label={`Edit ${pl.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(pl.id)}
                          disabled={deletingId === pl.id}
                          className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-bg-press rounded transition-colors disabled:opacity-50"
                          aria-label={`Delete ${pl.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-text-subdued text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-bg-highlight disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-bg-highlight disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right — track management panel */}
      {managingPlaylist && (
        <div className="w-80 flex-shrink-0 bg-bg-elevated rounded-lg flex flex-col h-fit sticky top-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <div className="min-w-0">
              <p className="text-xs text-text-subdued">Managing tracks</p>
              <p className="font-semibold text-text-primary truncate">{managingPlaylist.name}</p>
            </div>
            <button
              onClick={() => setManagingPlaylist(null)}
              className="p-1.5 rounded hover:bg-bg-highlight text-text-secondary flex-shrink-0 ml-2 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Add track */}
          <div className="px-4 py-3 border-b border-border-default">
            <p className="text-xs font-medium text-text-secondary mb-2">Add track</p>
            <div className="flex gap-2">
              <select
                value={addTrackId}
                onChange={(e) => setAddTrackId(e.target.value)}
                className="flex-1 min-w-0 bg-bg-base border border-border-default rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              >
                <option value="">Select track…</option>
                {allTracks
                  .filter((t) => !addedIds.has(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.artist.name} — {t.title}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAddTrack}
                disabled={!addTrackId || addingTrack}
                className="flex-shrink-0 px-3 py-1.5 bg-accent-primary hover:bg-accent-hover text-black text-xs font-semibold rounded disabled:opacity-50 transition-colors"
              >
                {addingTrack ? '…' : 'Add'}
              </button>
            </div>
          </div>

          {/* Track list */}
          <div className="overflow-y-auto max-h-[60vh]">
            {loadingTracks ? (
              <p className="px-4 py-6 text-center text-text-subdued text-sm">Loading…</p>
            ) : playlistTracks.length === 0 ? (
              <p className="px-4 py-6 text-center text-text-subdued text-sm">
                No tracks added yet.
              </p>
            ) : (
              <ul>
                {playlistTracks.map((pt) => (
                  <li
                    key={pt.track.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default last:border-0 hover:bg-bg-highlight group"
                  >
                    <span className="text-text-subdued text-xs w-5 flex-shrink-0 text-right">
                      {pt.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-xs font-medium truncate">
                        {pt.track.title}
                      </p>
                      <p className="text-text-subdued text-xs truncate">{pt.track.artist.name}</p>
                    </div>
                    <span className="text-text-subdued text-xs flex-shrink-0">
                      {formatDuration(pt.track.duration_ms)}
                    </span>
                    <button
                      onClick={() => handleRemoveTrack(pt.track.id)}
                      disabled={removingTrackId === pt.track.id}
                      className="flex-shrink-0 p-1 rounded text-text-subdued hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      aria-label={`Remove ${pt.track.title}`}
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="bg-bg-elevated rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Edit Playlist' : 'New Playlist'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded hover:bg-bg-highlight text-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Playlist name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isPublic}
                  onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublic ? 'bg-accent-primary' : 'bg-bg-press'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublic ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-sm text-text-secondary">Public playlist</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-full text-sm text-text-secondary hover:text-text-primary hover:bg-bg-highlight transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-black font-semibold text-sm disabled:opacity-60 transition-colors"
                >
                  {saving ? (
                    'Saving…'
                  ) : (
                    <>
                      <Check size={15} />
                      {editingId ? 'Save Changes' : 'Create Playlist'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls =
  'w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-subdued focus:outline-none focus:border-accent-primary transition-colors'
