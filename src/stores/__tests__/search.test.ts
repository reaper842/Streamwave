import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock apiClient ────────────────────────────────────────────────────────────

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: mockGet },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// ── Import after mocking ──────────────────────────────────────────────────────

import { useSearchStore } from '../search'
import type { SearchResults } from '@/types/search'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPTY: SearchResults = { tracks: [], artists: [], albums: [], playlists: [] }

const MOCK_RESULTS: SearchResults = {
  tracks: [
    {
      id: 'track-1',
      title: 'Test Track',
      artist_name: 'Test Artist',
      artist_id: 'artist-1',
      album_title: 'Test Album',
      album_id: 'album-1',
      album_cover_url: null,
      duration_ms: 180_000,
      genre: 'Pop',
    },
  ],
  artists: [{ id: 'artist-1', name: 'Test Artist', genre: 'Pop', image_url: null }],
  albums: [
    {
      id: 'album-1',
      title: 'Test Album',
      artist_name: 'Test Artist',
      artist_id: 'artist-1',
      cover_url: null,
      release_date: null,
      genre: 'Pop',
    },
  ],
  playlists: [],
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGet.mockReset()
  localStorageMock.clear()
  useSearchStore.setState({
    query: '',
    results: EMPTY,
    searchHistory: [],
    isLoading: false,
    error: null,
  })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSearchStore — initial state', () => {
  it('starts with empty query, results, and history', () => {
    const { query, results, searchHistory, isLoading, error } = useSearchStore.getState()
    expect(query).toBe('')
    expect(results).toEqual(EMPTY)
    expect(searchHistory).toEqual([])
    expect(isLoading).toBe(false)
    expect(error).toBeNull()
  })
})

describe('useSearchStore — search()', () => {
  it('sets isLoading=true while the request is in-flight', async () => {
    let resolveRequest!: () => void
    mockGet.mockReturnValue(
      new Promise<{ data: SearchResults }>((res) => {
        resolveRequest = () => res({ data: MOCK_RESULTS })
      }),
    )

    const promise = useSearchStore.getState().search('test')
    expect(useSearchStore.getState().isLoading).toBe(true)
    resolveRequest()
    await promise
  })

  it('updates results and query on success', async () => {
    mockGet.mockResolvedValue({ data: MOCK_RESULTS })
    await useSearchStore.getState().search('test query')

    const state = useSearchStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.query).toBe('test query')
    expect(state.results).toEqual(MOCK_RESULTS)
    expect(state.error).toBeNull()
  })

  it('adds the query to search history on success', async () => {
    mockGet.mockResolvedValue({ data: MOCK_RESULTS })
    await useSearchStore.getState().search('my query')
    expect(useSearchStore.getState().searchHistory[0]).toBe('my query')
  })

  it('trims the query before using it', async () => {
    mockGet.mockResolvedValue({ data: MOCK_RESULTS })
    await useSearchStore.getState().search('  trimmed  ')
    expect(useSearchStore.getState().query).toBe('trimmed')
  })

  it('clears results and does NOT call apiClient for empty query', async () => {
    await useSearchStore.getState().search('   ')
    expect(mockGet).not.toHaveBeenCalled()
    expect(useSearchStore.getState().results).toEqual(EMPTY)
    expect(useSearchStore.getState().isLoading).toBe(false)
  })

  it('sets error state on API failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    await useSearchStore.getState().search('failing query')

    const state = useSearchStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeTruthy()
    expect(state.results).toEqual(EMPTY)
  })
})

describe('useSearchStore — clearResults()', () => {
  it('resets query, results, and error', async () => {
    mockGet.mockResolvedValue({ data: MOCK_RESULTS })
    await useSearchStore.getState().search('hello')

    useSearchStore.getState().clearResults()

    const state = useSearchStore.getState()
    expect(state.query).toBe('')
    expect(state.results).toEqual(EMPTY)
    expect(state.error).toBeNull()
  })
})

describe('useSearchStore — history management', () => {
  it('addToHistory prepends entries and deduplicates', () => {
    const { addToHistory } = useSearchStore.getState()
    addToHistory('alpha')
    addToHistory('beta')
    addToHistory('alpha') // duplicate — should move to front
    expect(useSearchStore.getState().searchHistory).toEqual(['alpha', 'beta'])
  })

  it('addToHistory caps history at 10 entries', () => {
    const { addToHistory } = useSearchStore.getState()
    for (let i = 0; i < 12; i++) addToHistory(`query${i}`)
    expect(useSearchStore.getState().searchHistory.length).toBe(10)
  })

  it('addToHistory persists to localStorage', () => {
    useSearchStore.getState().addToHistory('stored')
    const raw = localStorageMock.getItem('streamwave:search_history')
    expect(JSON.parse(raw!)).toContain('stored')
  })

  it('clearHistory empties the array and removes localStorage key', () => {
    useSearchStore.getState().addToHistory('to be cleared')
    useSearchStore.getState().clearHistory()
    expect(useSearchStore.getState().searchHistory).toEqual([])
    expect(localStorageMock.getItem('streamwave:search_history')).toBeNull()
  })

  it('loadHistory reads from localStorage', () => {
    localStorageMock.setItem('streamwave:search_history', JSON.stringify(['from-storage']))
    useSearchStore.getState().loadHistory()
    expect(useSearchStore.getState().searchHistory).toContain('from-storage')
  })

  it('loadHistory ignores corrupt localStorage data', () => {
    localStorageMock.setItem('streamwave:search_history', 'not-json{{{')
    expect(() => useSearchStore.getState().loadHistory()).not.toThrow()
    expect(useSearchStore.getState().searchHistory).toEqual([])
  })

  it('loadHistory ignores non-string entries', () => {
    localStorageMock.setItem(
      'streamwave:search_history',
      JSON.stringify(['valid', 42, null, 'also valid']),
    )
    useSearchStore.getState().loadHistory()
    expect(useSearchStore.getState().searchHistory).toEqual(['valid', 'also valid'])
  })
})

describe('useSearchStore — setQuery()', () => {
  it('updates the query field without triggering a search', () => {
    useSearchStore.getState().setQuery('typed text')
    expect(useSearchStore.getState().query).toBe('typed text')
    expect(mockGet).not.toHaveBeenCalled()
  })
})
