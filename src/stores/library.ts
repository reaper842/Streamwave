'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { apiClient, ApiRequestError } from '@/lib/api/client'

// ── API response shapes ────────────────────────────────────────────────────────

interface PlaylistSummary {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  total_tracks: number
  created_at: string
  updated_at: string
}

export interface ArtistSummary {
  id: string
  name: string
  image_url: string | null
}

// ── Store state ────────────────────────────────────────────────────────────────

interface LibraryState {
  likedSongIds: Set<string>
  savedAlbumIds: Set<string>
  followedArtistIds: Set<string>
  followedArtists: ArtistSummary[]
  playlists: PlaylistSummary[]
  isLoading: boolean
  error: string | null

  // Bootstrap
  fetchLibrary: () => Promise<void>

  // Liked songs
  isLiked: (trackId: string) => boolean
  toggleLike: (trackId: string) => Promise<void>

  // Saved albums
  isSaved: (albumId: string) => boolean
  toggleSaveAlbum: (albumId: string) => Promise<void>

  // Followed artists
  isFollowing: (artistId: string) => boolean
  toggleFollowArtist: (artistId: string, artistData?: ArtistSummary) => Promise<void>

  // Playlists
  fetchPlaylists: () => Promise<void>
  createPlaylist: (name: string, description?: string) => Promise<PlaylistSummary | null>
  updatePlaylist: (
    id: string,
    data: {
      name?: string
      description?: string | null
      cover_url?: string | null
      is_public?: boolean
    },
  ) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  addTrackToPlaylist: (playlistId: string, trackId: string, position?: number) => Promise<void>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  reorderPlaylistTracks: (playlistId: string, trackId: string, newPosition: number) => Promise<void>

  clearError: () => void
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useLibraryStore = create<LibraryState>()(
  devtools(
    (set, get) => ({
      likedSongIds: new Set<string>(),
      savedAlbumIds: new Set<string>(),
      followedArtistIds: new Set<string>(),
      followedArtists: [],
      playlists: [],
      isLoading: false,
      error: null,

      // ── Bootstrap ────────────────────────────────────────────────────────────

      fetchLibrary: async () => {
        set({ isLoading: true, error: null })
        try {
          const [likedRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
            apiClient.get<{ id: string }[]>('/library/liked-songs?limit=100'),
            apiClient.get<{ id: string }[]>('/library/saved-albums?limit=100'),
            apiClient.get<ArtistSummary[]>('/library/followed-artists'),
            apiClient.get<PlaylistSummary[]>('/playlists'),
          ])

          const likedIds = new Set(likedRes.data.map((t) => t.id))
          const albumIds = new Set(albumsRes.data.map((a) => a.id))
          const artistIds = new Set(artistsRes.data.map((a) => a.id))

          set({
            likedSongIds: likedIds,
            savedAlbumIds: albumIds,
            followedArtistIds: artistIds,
            followedArtists: artistsRes.data,
            playlists: playlistsRes.data,
            isLoading: false,
          })
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to load library'
          set({ error: msg, isLoading: false })
        }
      },

      // ── Liked songs ──────────────────────────────────────────────────────────

      isLiked: (trackId) => get().likedSongIds.has(trackId),

      toggleLike: async (trackId) => {
        const { likedSongIds } = get()
        const wasLiked = likedSongIds.has(trackId)

        // Optimistic update
        const next = new Set(likedSongIds)
        if (wasLiked) {
          next.delete(trackId)
        } else {
          next.add(trackId)
        }
        set({ likedSongIds: next })

        try {
          if (wasLiked) {
            await apiClient.delete(`/library/liked-songs/${trackId}`)
          } else {
            await apiClient.post(`/library/liked-songs/${trackId}`)
          }
        } catch (err) {
          console.error('[LibraryStore] toggleLike failed:', err)
          set({ likedSongIds: new Set(likedSongIds) })
        }
      },

      // ── Saved albums ─────────────────────────────────────────────────────────

      isSaved: (albumId) => get().savedAlbumIds.has(albumId),

      toggleSaveAlbum: async (albumId) => {
        const { savedAlbumIds } = get()
        const wasSaved = savedAlbumIds.has(albumId)

        const next = new Set(savedAlbumIds)
        if (wasSaved) {
          next.delete(albumId)
        } else {
          next.add(albumId)
        }
        set({ savedAlbumIds: next })

        try {
          if (wasSaved) {
            await apiClient.delete(`/library/saved-albums/${albumId}`)
          } else {
            await apiClient.post(`/library/saved-albums/${albumId}`)
          }
        } catch {
          set({ savedAlbumIds: new Set(savedAlbumIds) })
        }
      },

      // ── Followed artists ─────────────────────────────────────────────────────

      isFollowing: (artistId) => get().followedArtistIds.has(artistId),

      toggleFollowArtist: async (artistId, artistData?) => {
        const { followedArtistIds, followedArtists } = get()
        const wasFollowing = followedArtistIds.has(artistId)

        const nextIds = new Set(followedArtistIds)
        if (wasFollowing) {
          nextIds.delete(artistId)
        } else {
          nextIds.add(artistId)
        }

        const nextArtists = wasFollowing
          ? followedArtists.filter((a) => a.id !== artistId)
          : artistData
            ? [artistData, ...followedArtists]
            : followedArtists

        set({ followedArtistIds: nextIds, followedArtists: nextArtists })

        try {
          if (wasFollowing) {
            await apiClient.delete(`/library/followed-artists/${artistId}`)
          } else {
            await apiClient.post(`/library/followed-artists/${artistId}`)
          }
        } catch {
          set({ followedArtistIds: new Set(followedArtistIds), followedArtists })
        }
      },

      // ── Playlists ────────────────────────────────────────────────────────────

      fetchPlaylists: async () => {
        try {
          const res = await apiClient.get<PlaylistSummary[]>('/playlists')
          set({ playlists: res.data })
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to load playlists'
          set({ error: msg })
        }
      },

      createPlaylist: async (name, description) => {
        try {
          const res = await apiClient.post<PlaylistSummary>('/playlists', { name, description })
          set((s) => ({ playlists: [res.data, ...s.playlists] }))
          return res.data
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to create playlist'
          set({ error: msg })
          return null
        }
      },

      updatePlaylist: async (id, data) => {
        try {
          const res = await apiClient.patch<PlaylistSummary>(`/playlists/${id}`, data)
          set((s) => ({
            playlists: s.playlists.map((p) => (p.id === id ? res.data : p)),
          }))
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to update playlist'
          set({ error: msg })
        }
      },

      deletePlaylist: async (id) => {
        // Optimistic removal
        const prev = get().playlists
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }))
        try {
          await apiClient.delete(`/playlists/${id}`)
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to delete playlist'
          set({ playlists: prev, error: msg })
        }
      },

      addTrackToPlaylist: async (playlistId, trackId, position) => {
        try {
          await apiClient.post(`/playlists/${playlistId}/tracks`, { trackId, position })
          // Bump total_tracks optimistically
          set((s) => ({
            playlists: s.playlists.map((p) =>
              p.id === playlistId ? { ...p, total_tracks: p.total_tracks + 1 } : p,
            ),
          }))
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to add track'
          set({ error: msg })
        }
      },

      removeTrackFromPlaylist: async (playlistId, trackId) => {
        try {
          await apiClient.delete(`/playlists/${playlistId}/tracks/${trackId}`)
          set((s) => ({
            playlists: s.playlists.map((p) =>
              p.id === playlistId ? { ...p, total_tracks: Math.max(0, p.total_tracks - 1) } : p,
            ),
          }))
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to remove track'
          set({ error: msg })
        }
      },

      reorderPlaylistTracks: async (playlistId, trackId, newPosition) => {
        try {
          await apiClient.patch(`/playlists/${playlistId}/tracks/reorder`, {
            trackId,
            newPosition,
          })
        } catch (err) {
          const msg = err instanceof ApiRequestError ? err.message : 'Failed to reorder tracks'
          set({ error: msg })
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'LibraryStore' },
  ),
)
