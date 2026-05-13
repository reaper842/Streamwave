'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/components/ui/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Artist {
  id: string
  name: string
}

interface Album {
  id: string
  title: string
  artist: Artist
}

interface Track {
  id: string
  title: string
  track_number: number
  duration_ms: number
  audio_url: string
  artist: Artist
  album: { id: string; title: string; cover_url: string | null }
}

interface TrackForm {
  title: string
  artistId: string
  albumId: string
  trackNumber: string
  durationMs: string
  audioUrl: string
}

const EMPTY_FORM: TrackForm = {
  title: '',
  artistId: '',
  albumId: '',
  trackNumber: '1',
  durationMs: '180000',
  audioUrl: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminTracksPage() {
  const { showToast } = useToast()

  const [tracks, setTracks] = useState<Track[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  const [artists, setArtists] = useState<Artist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [filteredAlbums, setFilteredAlbums] = useState<Album[]>([])

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TrackForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadTracks = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await apiClient.get<{ items: Track[]; total: number }>(
          `/admin/tracks?page=${p}&limit=${limit}`,
        )
        setTracks(res.data.items)
        setTotal(res.data.total)
      } catch {
        showToast('Failed to load tracks', 'error')
      } finally {
        setLoading(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    loadTracks(page)
  }, [page, loadTracks])

  useEffect(() => {
    apiClient
      .get<Artist[]>('/admin/artists')
      .then((r) => setArtists(r.data))
      .catch(() => {})
    apiClient
      .get<Album[]>('/admin/albums')
      .then((r) => setAlbums(r.data))
      .catch(() => {})
  }, [])

  // Filter albums by selected artist
  useEffect(() => {
    if (!form.artistId) {
      setFilteredAlbums(albums)
    } else {
      setFilteredAlbums(albums.filter((a) => a.artist.id === form.artistId))
    }
  }, [form.artistId, albums])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(track: Track) {
    setEditingId(track.id)
    setForm({
      title: track.title,
      artistId: track.artist.id,
      albumId: track.album.id,
      trackNumber: String(track.track_number),
      durationMs: String(track.duration_ms),
      audioUrl: track.audio_url,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.title || !form.artistId || !form.albumId || !form.audioUrl) {
      showToast('Please fill all required fields', 'error')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title,
      artistId: form.artistId,
      albumId: form.albumId,
      trackNumber: parseInt(form.trackNumber, 10) || 1,
      durationMs: parseInt(form.durationMs, 10) || 0,
      audioUrl: form.audioUrl,
    }
    try {
      if (editingId) {
        await apiClient.patch(`/admin/tracks/${editingId}`, payload)
        showToast('Track updated', 'success')
      } else {
        await apiClient.post('/admin/tracks', payload)
        showToast('Track created', 'success')
      }
      closeForm()
      loadTracks(page)
    } catch {
      showToast('Failed to save track', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this track? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await apiClient.delete(`/admin/tracks/${id}`)
      showToast('Track deleted', 'success')
      loadTracks(page)
    } catch {
      showToast('Failed to delete track', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Tracks</h1>
          <p className="text-text-secondary mt-1">{total.toLocaleString()} total tracks</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-full text-sm transition-colors"
        >
          <Plus size={16} />
          Add Track
        </button>
      </div>

      {/* Table */}
      <div className="bg-bg-elevated rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-subdued">Loading…</div>
        ) : tracks.length === 0 ? (
          <div className="p-8 text-center text-text-subdued">No tracks yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-text-subdued text-left">
                <th className="px-4 py-3 font-medium w-8">#</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Artist</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Album</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Duration</th>
                <th className="px-4 py-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr
                  key={track.id}
                  className="border-b border-border-default last:border-0 hover:bg-bg-highlight transition-colors"
                >
                  <td className="px-4 py-3 text-text-subdued">{track.track_number}</td>
                  <td className="px-4 py-3 text-text-primary font-medium max-w-[200px] truncate">
                    {track.title}
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                    {track.artist.name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary hidden lg:table-cell max-w-[150px] truncate">
                    {track.album.title}
                  </td>
                  <td className="px-4 py-3 text-text-subdued hidden lg:table-cell">
                    {formatDuration(track.duration_ms)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(track)}
                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-press rounded transition-colors"
                        aria-label={`Edit ${track.title}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(track.id)}
                        disabled={deletingId === track.id}
                        className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-bg-press rounded transition-colors disabled:opacity-50"
                        aria-label={`Delete ${track.title}`}
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

      {/* Pagination */}
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

      {/* Create / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="bg-bg-elevated rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Edit Track' : 'Add Track'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded hover:bg-bg-highlight text-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <Field label="Title *">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder="Track title"
                  required
                />
              </Field>

              <Field label="Artist *">
                <select
                  value={form.artistId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, artistId: e.target.value, albumId: '' }))
                  }
                  className={inputCls}
                  required
                >
                  <option value="">Select artist…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Album *">
                <select
                  value={form.albumId}
                  onChange={(e) => setForm((f) => ({ ...f, albumId: e.target.value }))}
                  className={inputCls}
                  required
                  disabled={!form.artistId}
                >
                  <option value="">Select album…</option>
                  {filteredAlbums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Track #">
                  <input
                    type="number"
                    min={1}
                    value={form.trackNumber}
                    onChange={(e) => setForm((f) => ({ ...f, trackNumber: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Duration (ms)">
                  <input
                    type="number"
                    min={0}
                    value={form.durationMs}
                    onChange={(e) => setForm((f) => ({ ...f, durationMs: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Audio URL / Path *">
                <input
                  value={form.audioUrl}
                  onChange={(e) => setForm((f) => ({ ...f, audioUrl: e.target.value }))}
                  className={inputCls}
                  placeholder="/audio/filename.mp3"
                  required
                />
                <p className="text-text-subdued text-xs mt-1">
                  Place MP3 files in <code className="text-accent-primary">public/audio/</code> and
                  enter the path as <code className="text-accent-primary">/audio/filename.mp3</code>
                </p>
              </Field>

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
                      {editingId ? 'Save Changes' : 'Create Track'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-bg-base border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-subdued focus:outline-none focus:border-accent-primary transition-colors'
