import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock apiClient ────────────────────────────────────────────────────────────
// vi.hoisted() ensures these are defined before the hoisted vi.mock() factory runs

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
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

// ── Import after mocking ──────────────────────────────────────────────────────

import { useLibraryStore } from '../library'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PlaylistData {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  total_tracks: number
  created_at: string
  updated_at: string
}

function makePlaylist(id: string, overrides: Partial<PlaylistData> = {}): PlaylistData {
  return {
    id,
    name: `Playlist ${id}`,
    description: null,
    cover_url: null,
    is_public: true,
    total_tracks: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function resetStore() {
  useLibraryStore.setState({
    likedSongIds: new Set(),
    savedAlbumIds: new Set(),
    savedAlbums: [],
    followedArtistIds: new Set(),
    followedArtists: [],
    playlists: [],
    isLoading: false,
    error: null,
  })
  vi.clearAllMocks()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLibraryStore — initial state', () => {
  beforeEach(resetStore)

  it('starts with empty Sets and empty playlists', () => {
    const s = useLibraryStore.getState()
    expect(s.likedSongIds.size).toBe(0)
    expect(s.savedAlbumIds.size).toBe(0)
    expect(s.followedArtistIds.size).toBe(0)
    expect(s.playlists).toEqual([])
    expect(s.isLoading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('isLiked returns false for unknown track', () => {
    expect(useLibraryStore.getState().isLiked('track-1')).toBe(false)
  })

  it('isSaved returns false for unknown album', () => {
    expect(useLibraryStore.getState().isSaved('album-1')).toBe(false)
  })

  it('isFollowing returns false for unknown artist', () => {
    expect(useLibraryStore.getState().isFollowing('artist-1')).toBe(false)
  })
})

// ── fetchLibrary ──────────────────────────────────────────────────────────────

describe('useLibraryStore — fetchLibrary', () => {
  beforeEach(resetStore)

  it('populates all four sets, savedAlbums array, and playlists on success', async () => {
    const albumData = {
      id: 'album-1',
      title: 'Album One',
      cover_url: null,
      artist: { id: 'artist-1', name: 'Artist One' },
    }
    mockGet.mockImplementation((path: string) => {
      if (path.includes('liked-songs'))
        return Promise.resolve({ data: [{ id: 'track-1' }, { id: 'track-2' }] })
      if (path.includes('saved-albums')) return Promise.resolve({ data: [albumData] })
      if (path.includes('followed-artists'))
        return Promise.resolve({ data: [{ id: 'artist-1', name: 'Artist One', image_url: null }] })
      // playlists
      return Promise.resolve({ data: [makePlaylist('pl-1')] })
    })

    await useLibraryStore.getState().fetchLibrary()

    const s = useLibraryStore.getState()
    expect(s.likedSongIds.has('track-1')).toBe(true)
    expect(s.likedSongIds.has('track-2')).toBe(true)
    expect(s.savedAlbumIds.has('album-1')).toBe(true)
    expect(s.savedAlbums).toHaveLength(1)
    expect(s.savedAlbums[0].id).toBe('album-1')
    expect(s.savedAlbums[0].title).toBe('Album One')
    expect(s.followedArtistIds.has('artist-1')).toBe(true)
    expect(s.playlists).toHaveLength(1)
    expect(s.playlists[0].id).toBe('pl-1')
    expect(s.isLoading).toBe(false)
  })

  it('sets error and clears loading on API failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    await useLibraryStore.getState().fetchLibrary()
    const s = useLibraryStore.getState()
    expect(s.isLoading).toBe(false)
    expect(s.error).toBeTruthy()
  })
})

// ── toggleLike ────────────────────────────────────────────────────────────────

describe('useLibraryStore — toggleLike', () => {
  beforeEach(resetStore)

  it('optimistically adds trackId on like and calls POST', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().toggleLike('track-1')
    expect(useLibraryStore.getState().isLiked('track-1')).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('/library/liked-songs/track-1')
  })

  it('optimistically removes trackId on unlike and calls DELETE', async () => {
    useLibraryStore.setState({ likedSongIds: new Set(['track-1']) })
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().toggleLike('track-1')
    expect(useLibraryStore.getState().isLiked('track-1')).toBe(false)
    expect(mockDelete).toHaveBeenCalledWith('/library/liked-songs/track-1')
  })

  it('rolls back like on API error', async () => {
    mockPost.mockRejectedValue(new Error('Server error'))
    await useLibraryStore.getState().toggleLike('track-1')
    expect(useLibraryStore.getState().isLiked('track-1')).toBe(false)
  })

  it('rolls back unlike on API error', async () => {
    useLibraryStore.setState({ likedSongIds: new Set(['track-1']) })
    mockDelete.mockRejectedValue(new Error('Server error'))
    await useLibraryStore.getState().toggleLike('track-1')
    expect(useLibraryStore.getState().isLiked('track-1')).toBe(true)
  })
})

// ── toggleSaveAlbum ───────────────────────────────────────────────────────────

describe('useLibraryStore — toggleSaveAlbum', () => {
  const albumData = {
    id: 'album-1',
    title: 'Album One',
    cover_url: null,
    artist: { id: 'a1', name: 'Artist' },
  }

  beforeEach(resetStore)

  it('optimistically saves album and calls POST', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().toggleSaveAlbum('album-1')
    expect(useLibraryStore.getState().isSaved('album-1')).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('/library/saved-albums/album-1')
  })

  it('prepends albumData to savedAlbums array when saving with data', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().toggleSaveAlbum('album-1', albumData)
    const s = useLibraryStore.getState()
    expect(s.savedAlbums).toHaveLength(1)
    expect(s.savedAlbums[0].id).toBe('album-1')
    expect(s.savedAlbums[0].title).toBe('Album One')
  })

  it('does not change savedAlbums array when saving without data', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().toggleSaveAlbum('album-1')
    expect(useLibraryStore.getState().savedAlbums).toHaveLength(0)
  })

  it('optimistically unsaves album, removes from savedAlbums array, and calls DELETE', async () => {
    useLibraryStore.setState({ savedAlbumIds: new Set(['album-1']), savedAlbums: [albumData] })
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().toggleSaveAlbum('album-1')
    const s = useLibraryStore.getState()
    expect(s.isSaved('album-1')).toBe(false)
    expect(s.savedAlbums).toHaveLength(0)
    expect(mockDelete).toHaveBeenCalledWith('/library/saved-albums/album-1')
  })

  it('rolls back savedAlbumIds and savedAlbums on API error', async () => {
    mockPost.mockRejectedValue(new Error('fail'))
    await useLibraryStore.getState().toggleSaveAlbum('album-1', albumData)
    const s = useLibraryStore.getState()
    expect(s.isSaved('album-1')).toBe(false)
    expect(s.savedAlbums).toHaveLength(0)
  })
})

// ── toggleFollowArtist ────────────────────────────────────────────────────────

describe('useLibraryStore — toggleFollowArtist', () => {
  beforeEach(resetStore)

  it('optimistically follows artist and calls POST', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().toggleFollowArtist('artist-1')
    expect(useLibraryStore.getState().isFollowing('artist-1')).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('/library/followed-artists/artist-1')
  })

  it('optimistically unfollows artist and calls DELETE', async () => {
    useLibraryStore.setState({ followedArtistIds: new Set(['artist-1']) })
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().toggleFollowArtist('artist-1')
    expect(useLibraryStore.getState().isFollowing('artist-1')).toBe(false)
    expect(mockDelete).toHaveBeenCalledWith('/library/followed-artists/artist-1')
  })

  it('rolls back follow on API error', async () => {
    mockDelete.mockRejectedValue(new Error('fail'))
    useLibraryStore.setState({ followedArtistIds: new Set(['artist-1']) })
    await useLibraryStore.getState().toggleFollowArtist('artist-1')
    expect(useLibraryStore.getState().isFollowing('artist-1')).toBe(true)
  })
})

// ── createPlaylist ────────────────────────────────────────────────────────────

describe('useLibraryStore — createPlaylist', () => {
  beforeEach(resetStore)

  it('adds new playlist to the start of the array and returns it', async () => {
    const pl = makePlaylist('pl-new')
    mockPost.mockResolvedValue({ data: pl })
    const result = await useLibraryStore.getState().createPlaylist('New playlist')
    expect(result).toEqual(pl)
    expect(useLibraryStore.getState().playlists[0]).toEqual(pl)
  })

  it('returns null and sets error on failure', async () => {
    mockPost.mockRejectedValue(new Error('fail'))
    const result = await useLibraryStore.getState().createPlaylist('oops')
    expect(result).toBeNull()
    expect(useLibraryStore.getState().error).toBeTruthy()
  })
})

// ── updatePlaylist ────────────────────────────────────────────────────────────

describe('useLibraryStore — updatePlaylist', () => {
  beforeEach(() => {
    resetStore()
    useLibraryStore.setState({ playlists: [makePlaylist('pl-1', { name: 'Old Name' })] })
  })

  it('replaces the playlist in the array with server response', async () => {
    const updated = makePlaylist('pl-1', { name: 'New Name' })
    mockPatch.mockResolvedValue({ data: updated })
    await useLibraryStore.getState().updatePlaylist('pl-1', { name: 'New Name' })
    expect(useLibraryStore.getState().playlists[0].name).toBe('New Name')
  })

  it('sets error on failure', async () => {
    mockPatch.mockRejectedValue(new Error('fail'))
    await useLibraryStore.getState().updatePlaylist('pl-1', { name: 'x' })
    expect(useLibraryStore.getState().error).toBeTruthy()
  })
})

// ── deletePlaylist ────────────────────────────────────────────────────────────

describe('useLibraryStore — deletePlaylist', () => {
  beforeEach(() => {
    resetStore()
    useLibraryStore.setState({ playlists: [makePlaylist('pl-1'), makePlaylist('pl-2')] })
  })

  it('removes playlist optimistically', async () => {
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().deletePlaylist('pl-1')
    const playlists = useLibraryStore.getState().playlists
    expect(playlists).toHaveLength(1)
    expect(playlists[0].id).toBe('pl-2')
  })

  it('rolls back deletion on API error', async () => {
    mockDelete.mockRejectedValue(new Error('fail'))
    await useLibraryStore.getState().deletePlaylist('pl-1')
    expect(useLibraryStore.getState().playlists).toHaveLength(2)
    expect(useLibraryStore.getState().error).toBeTruthy()
  })
})

// ── addTrackToPlaylist ────────────────────────────────────────────────────────

describe('useLibraryStore — addTrackToPlaylist', () => {
  beforeEach(() => {
    resetStore()
    useLibraryStore.setState({ playlists: [makePlaylist('pl-1', { total_tracks: 3 })] })
  })

  it('bumps total_tracks on success', async () => {
    mockPost.mockResolvedValue({})
    await useLibraryStore.getState().addTrackToPlaylist('pl-1', 'track-x')
    expect(useLibraryStore.getState().playlists[0].total_tracks).toBe(4)
  })

  it('does not change state on error', async () => {
    mockPost.mockRejectedValue(new Error('fail'))
    await useLibraryStore.getState().addTrackToPlaylist('pl-1', 'track-x')
    expect(useLibraryStore.getState().playlists[0].total_tracks).toBe(3)
    expect(useLibraryStore.getState().error).toBeTruthy()
  })
})

// ── removeTrackFromPlaylist ───────────────────────────────────────────────────

describe('useLibraryStore — removeTrackFromPlaylist', () => {
  beforeEach(() => {
    resetStore()
    useLibraryStore.setState({ playlists: [makePlaylist('pl-1', { total_tracks: 3 })] })
  })

  it('decrements total_tracks on success', async () => {
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().removeTrackFromPlaylist('pl-1', 'track-x')
    expect(useLibraryStore.getState().playlists[0].total_tracks).toBe(2)
  })

  it('does not go below 0', async () => {
    useLibraryStore.setState({ playlists: [makePlaylist('pl-1', { total_tracks: 0 })] })
    mockDelete.mockResolvedValue({})
    await useLibraryStore.getState().removeTrackFromPlaylist('pl-1', 'track-x')
    expect(useLibraryStore.getState().playlists[0].total_tracks).toBe(0)
  })
})

// ── reorderPlaylistTracks ─────────────────────────────────────────────────────

describe('useLibraryStore — reorderPlaylistTracks', () => {
  beforeEach(resetStore)

  it('calls PATCH reorder endpoint with correct payload', async () => {
    mockPatch.mockResolvedValue({})
    await useLibraryStore.getState().reorderPlaylistTracks('pl-1', 'track-1', 2)
    expect(mockPatch).toHaveBeenCalledWith('/playlists/pl-1/tracks/reorder', {
      trackId: 'track-1',
      newPosition: 2,
    })
  })

  it('sets error on failure', async () => {
    mockPatch.mockRejectedValue(new Error('fail'))
    await useLibraryStore.getState().reorderPlaylistTracks('pl-1', 'track-1', 2)
    expect(useLibraryStore.getState().error).toBeTruthy()
  })
})

// ── clearError ────────────────────────────────────────────────────────────────

describe('useLibraryStore — clearError', () => {
  it('resets error to null', () => {
    useLibraryStore.setState({ error: 'something went wrong' })
    useLibraryStore.getState().clearError()
    expect(useLibraryStore.getState().error).toBeNull()
  })
})
