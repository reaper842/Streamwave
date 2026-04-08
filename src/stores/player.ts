'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getAudioEngine } from '@/lib/audio/engine'
import type { QueueTrack, RepeatMode } from '@/lib/audio/engine'
import { apiClient } from '@/lib/api/client'

// ── API response shapes ────────────────────────────────────────────────────────

interface TrackMetadataResponse {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
}

interface TrackStreamResponse {
  streamUrl: string
  expiresAt: string
}

// ── Store state ────────────────────────────────────────────────────────────────

interface PlayerState {
  currentTrack: QueueTrack | null
  isPlaying: boolean
  isLoading: boolean
  positionMs: number
  durationMs: number
  volume: number
  isMuted: boolean
  queue: QueueTrack[]
  queueIndex: number
  shuffleEnabled: boolean
  repeatMode: RepeatMode
  error: string | null

  // Actions
  playTrack: (trackId: string) => Promise<void>
  playAlbum: (albumId: string, startIndex?: number) => Promise<void>
  playPlaylist: (playlistId: string, startIndex?: number) => Promise<void>
  playFromTrackIds: (trackIds: string[], startIndex?: number) => Promise<void>
  pause: () => void
  resume: () => void
  togglePlayPause: () => void
  next: () => void
  previous: () => void
  seek: (positionMs: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  setShuffle: (enabled: boolean) => void
  setRepeat: (mode: RepeatMode) => void
  addToQueue: (track: QueueTrack) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  clearQueue: () => void

  // Internal — called by AudioEngine state sync
  _syncFromEngine: (engineState: {
    currentTrack: QueueTrack | null
    isPlaying: boolean
    isLoading: boolean
    positionMs: number
    durationMs: number
    volume: number
    isMuted: boolean
    queue: QueueTrack[]
    queueIndex: number
    shuffleEnabled: boolean
    repeatMode: RepeatMode
    error: string | null
  }) => void
}

// ── Helper: fetch track + stream URL, build QueueTrack ───────────────────────

async function fetchQueueTrack(trackId: string): Promise<QueueTrack> {
  const [metaRes, streamRes] = await Promise.all([
    apiClient.get<TrackMetadataResponse>(`/tracks/${trackId}`),
    apiClient.get<TrackStreamResponse>(`/tracks/${trackId}/stream`),
  ])

  const meta = metaRes.data
  const stream = streamRes.data

  return {
    id: meta.id,
    title: meta.title,
    artistName: meta.artist.name,
    albumTitle: meta.album.title,
    albumCover: meta.album.cover_url,
    duration_ms: meta.duration_ms,
    streamUrl: stream.streamUrl,
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set) => ({
      // Initial state mirrors AudioEngine defaults
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      positionMs: 0,
      durationMs: 0,
      volume: 0.8,
      isMuted: false,
      queue: [],
      queueIndex: -1,
      shuffleEnabled: false,
      repeatMode: 'off',
      error: null,

      // ── Sync ──────────────────────────────────────────────────────────────────
      _syncFromEngine: (engineState) => set(engineState),

      // ── Playback ──────────────────────────────────────────────────────────────

      playTrack: async (trackId) => {
        set({ isLoading: true, error: null })
        try {
          const track = await fetchQueueTrack(trackId)
          getAudioEngine().play([track], 0)
        } catch (err) {
          console.error('[PlayerStore] playTrack failed:', err)
          set({ isLoading: false, error: 'Failed to load track' })
        }
      },

      playAlbum: async (albumId, startIndex = 0) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiClient.get<{
            tracks: Array<{ id: string }>
          }>(`/albums/${albumId}`)

          const trackIds = res.data.tracks.map((t) => t.id)
          const tracks = await Promise.all(trackIds.map(fetchQueueTrack))
          getAudioEngine().play(tracks, startIndex)
        } catch (err) {
          console.error('[PlayerStore] playAlbum failed:', err)
          set({ isLoading: false, error: 'Failed to load album' })
        }
      },

      playPlaylist: async (playlistId, startIndex = 0) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiClient.get<{
            tracks: Array<{ id: string }>
          }>(`/playlists/${playlistId}`)

          const trackIds = res.data.tracks.map((t) => t.id)
          const tracks = await Promise.all(trackIds.map(fetchQueueTrack))
          getAudioEngine().play(tracks, startIndex)
        } catch (err) {
          console.error('[PlayerStore] playPlaylist failed:', err)
          set({ isLoading: false, error: 'Failed to load playlist' })
        }
      },

      playFromTrackIds: async (trackIds, startIndex = 0) => {
        if (trackIds.length === 0) return
        set({ isLoading: true, error: null })
        try {
          const tracks = await Promise.all(trackIds.map(fetchQueueTrack))
          getAudioEngine().play(tracks, startIndex)
        } catch (err) {
          console.error('[PlayerStore] playFromTrackIds failed:', err)
          set({ isLoading: false, error: 'Failed to load tracks' })
        }
      },

      pause: () => getAudioEngine().pause(),
      resume: () => getAudioEngine().resume(),
      togglePlayPause: () => getAudioEngine().togglePlayPause(),
      next: () => getAudioEngine().next(),
      previous: () => getAudioEngine().previous(),
      seek: (positionMs) => getAudioEngine().seek(positionMs),
      setVolume: (value) => getAudioEngine().setVolume(value),
      toggleMute: () => getAudioEngine().toggleMute(),
      setShuffle: (enabled) => getAudioEngine().setShuffle(enabled),
      setRepeat: (mode) => getAudioEngine().setRepeat(mode),
      addToQueue: (track) => getAudioEngine().addToQueue(track),
      removeFromQueue: (index) => getAudioEngine().removeFromQueue(index),
      reorderQueue: (fromIndex, toIndex) => getAudioEngine().reorderQueue(fromIndex, toIndex),
      clearQueue: () => getAudioEngine().clearQueue(),
    }),
    { name: 'PlayerStore' },
  ),
)

// ── Engine → Store bridge (initialised once in AudioEngineProvider) ───────────

export function connectEngineToStore() {
  return getAudioEngine().subscribe((engineState) => {
    usePlayerStore.getState()._syncFromEngine(engineState)
  })
}
