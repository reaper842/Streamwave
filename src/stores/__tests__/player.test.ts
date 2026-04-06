import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueueTrack } from '@/lib/audio/engine'

// ── Mock the AudioEngine module ────────────────────────────────────────────────

const mockPlay = vi.fn()
const mockPause = vi.fn()
const mockResume = vi.fn()
const mockTogglePlayPause = vi.fn()
const mockNext = vi.fn()
const mockPrevious = vi.fn()
const mockSeek = vi.fn()
const mockSetVolume = vi.fn()
const mockToggleMute = vi.fn()
const mockSetShuffle = vi.fn()
const mockSetRepeat = vi.fn()
const mockAddToQueue = vi.fn()
const mockRemoveFromQueue = vi.fn()
const mockReorderQueue = vi.fn()
const mockClearQueue = vi.fn()
const mockSubscribe = vi.fn(() => vi.fn())

const mockEngine = {
  play: mockPlay,
  pause: mockPause,
  resume: mockResume,
  togglePlayPause: mockTogglePlayPause,
  next: mockNext,
  previous: mockPrevious,
  seek: mockSeek,
  setVolume: mockSetVolume,
  toggleMute: mockToggleMute,
  setShuffle: mockSetShuffle,
  setRepeat: mockSetRepeat,
  addToQueue: mockAddToQueue,
  removeFromQueue: mockRemoveFromQueue,
  reorderQueue: mockReorderQueue,
  clearQueue: mockClearQueue,
  subscribe: mockSubscribe,
  getState: vi.fn(() => ({
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
  })),
}

vi.mock('@/lib/audio/engine', () => ({
  getAudioEngine: () => mockEngine,
}))

// ── Mock next-auth (not needed in these tests) ────────────────────────────────

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

// ── Mock apiClient ─────────────────────────────────────────────────────────────

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message)
    }
  },
}))

// ── Import after mocking ────────────────────────────────────────────────────────

import { usePlayerStore } from '../player'
import { apiClient } from '@/lib/api/client'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTrack(id: string): QueueTrack {
  return {
    id,
    title: `Track ${id}`,
    artistName: 'Artist',
    albumTitle: 'Album',
    albumCover: null,
    duration_ms: 180_000,
    streamUrl: `https://cdn.example.com/${id}.mp3`,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('usePlayerStore — engine delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store to initial state
    usePlayerStore.setState({
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
    })
  })

  it('pause() delegates to engine', () => {
    usePlayerStore.getState().pause()
    expect(mockPause).toHaveBeenCalledTimes(1)
  })

  it('resume() delegates to engine', () => {
    usePlayerStore.getState().resume()
    expect(mockResume).toHaveBeenCalledTimes(1)
  })

  it('togglePlayPause() delegates to engine', () => {
    usePlayerStore.getState().togglePlayPause()
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1)
  })

  it('next() delegates to engine', () => {
    usePlayerStore.getState().next()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('previous() delegates to engine', () => {
    usePlayerStore.getState().previous()
    expect(mockPrevious).toHaveBeenCalledTimes(1)
  })

  it('seek() delegates to engine with correct value', () => {
    usePlayerStore.getState().seek(30_000)
    expect(mockSeek).toHaveBeenCalledWith(30_000)
  })

  it('setVolume() delegates to engine with clamped value', () => {
    usePlayerStore.getState().setVolume(0.5)
    expect(mockSetVolume).toHaveBeenCalledWith(0.5)
  })

  it('toggleMute() delegates to engine', () => {
    usePlayerStore.getState().toggleMute()
    expect(mockToggleMute).toHaveBeenCalledTimes(1)
  })

  it('setShuffle(true) delegates to engine', () => {
    usePlayerStore.getState().setShuffle(true)
    expect(mockSetShuffle).toHaveBeenCalledWith(true)
  })

  it('setRepeat("all") delegates to engine', () => {
    usePlayerStore.getState().setRepeat('all')
    expect(mockSetRepeat).toHaveBeenCalledWith('all')
  })

  it('addToQueue() delegates to engine', () => {
    const track = makeTrack('t1')
    usePlayerStore.getState().addToQueue(track)
    expect(mockAddToQueue).toHaveBeenCalledWith(track)
  })

  it('removeFromQueue() delegates to engine', () => {
    usePlayerStore.getState().removeFromQueue(2)
    expect(mockRemoveFromQueue).toHaveBeenCalledWith(2)
  })

  it('reorderQueue() delegates to engine', () => {
    usePlayerStore.getState().reorderQueue(0, 3)
    expect(mockReorderQueue).toHaveBeenCalledWith(0, 3)
  })

  it('clearQueue() delegates to engine', () => {
    usePlayerStore.getState().clearQueue()
    expect(mockClearQueue).toHaveBeenCalledTimes(1)
  })
})

describe('usePlayerStore — state sync from engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      volume: 0.8,
      isMuted: false,
      queue: [],
      queueIndex: -1,
      shuffleEnabled: false,
      repeatMode: 'off',
      isLoading: false,
      error: null,
    })
  })

  it('_syncFromEngine updates store state', () => {
    const track = makeTrack('x1')
    usePlayerStore.getState()._syncFromEngine({
      currentTrack: track,
      isPlaying: true,
      isLoading: false,
      positionMs: 45_000,
      durationMs: 180_000,
      volume: 0.6,
      isMuted: false,
      queue: [track],
      queueIndex: 0,
      shuffleEnabled: false,
      repeatMode: 'off',
      error: null,
    })

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe('x1')
    expect(state.isPlaying).toBe(true)
    expect(state.positionMs).toBe(45_000)
    expect(state.volume).toBe(0.6)
  })
})

describe('usePlayerStore — playTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlayerStore.setState({ isLoading: false, error: null })
  })

  it('sets isLoading=true then calls engine.play on success', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet
      .mockResolvedValueOnce({
        data: {
          id: 'track1',
          title: 'Song',
          duration_ms: 200_000,
          track_number: 1,
          artist: { id: 'a1', name: 'Artist' },
          album: { id: 'al1', title: 'Album', cover_url: null },
        },
      })
      .mockResolvedValueOnce({
        data: { streamUrl: 'https://cdn.example.com/track1.mp3', expiresAt: '' },
      })

    await usePlayerStore.getState().playTrack('track1')

    expect(mockPlay).toHaveBeenCalledTimes(1)
    const [tracks, startIndex] = mockPlay.mock.calls[0] as [QueueTrack[], number]
    expect(tracks[0].id).toBe('track1')
    expect(startIndex).toBe(0)
  })

  it('sets error state when API fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

    await usePlayerStore.getState().playTrack('bad-id')

    expect(usePlayerStore.getState().error).toBe('Failed to load track')
    expect(usePlayerStore.getState().isLoading).toBe(false)
  })
})
