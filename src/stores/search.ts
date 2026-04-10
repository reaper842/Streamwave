'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import type { SearchResults } from '@/types/search'

export type { SearchResults }
export type {
  TrackSearchResult,
  ArtistSearchResult,
  AlbumSearchResult,
  PlaylistSearchResult,
} from '@/types/search'

// ── Constants ──────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'streamwave:search_history'
const MAX_HISTORY = 10

const EMPTY_RESULTS: SearchResults = {
  tracks: [],
  artists: [],
  albums: [],
  playlists: [],
}

// ── Store state ────────────────────────────────────────────────────────────────

interface SearchState {
  query: string
  results: SearchResults
  searchHistory: string[]
  isLoading: boolean
  error: string | null

  search: (query: string) => Promise<void>
  clearResults: () => void
  addToHistory: (query: string) => void
  clearHistory: () => void
  loadHistory: () => void
  setQuery: (query: string) => void
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      query: '',
      results: EMPTY_RESULTS,
      searchHistory: [],
      isLoading: false,
      error: null,

      search: async (query: string) => {
        const trimmed = query.trim()
        if (!trimmed) {
          set({ results: EMPTY_RESULTS, isLoading: false, error: null }, false, 'search/clear')
          return
        }

        set({ isLoading: true, error: null }, false, 'search/start')

        try {
          const res = await apiClient.get<SearchResults>(
            `/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          )
          set({ results: res.data, isLoading: false, query: trimmed }, false, 'search/success')
          get().addToHistory(trimmed)
        } catch {
          set(
            { isLoading: false, error: 'Search failed. Please try again.' },
            false,
            'search/error',
          )
        }
      },

      clearResults: () => {
        set({ results: EMPTY_RESULTS, query: '', error: null }, false, 'search/clearResults')
      },

      addToHistory: (query: string) => {
        const trimmed = query.trim()
        if (!trimmed) return
        const current = get().searchHistory.filter((q) => q !== trimmed)
        const updated = [trimmed, ...current].slice(0, MAX_HISTORY)
        set({ searchHistory: updated }, false, 'search/addHistory')
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
        } catch {
          // localStorage unavailable (SSR / private mode)
        }
      },

      clearHistory: () => {
        set({ searchHistory: [] }, false, 'search/clearHistory')
        try {
          localStorage.removeItem(HISTORY_KEY)
        } catch {
          // ignore
        }
      },

      loadHistory: () => {
        try {
          const raw = localStorage.getItem(HISTORY_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as unknown
            if (Array.isArray(parsed)) {
              set(
                {
                  searchHistory: parsed
                    .filter((x): x is string => typeof x === 'string')
                    .slice(0, MAX_HISTORY),
                },
                false,
                'search/loadHistory',
              )
            }
          }
        } catch {
          // ignore parse / storage errors
        }
      },

      setQuery: (query: string) => {
        set({ query }, false, 'search/setQuery')
      },
    }),
    { name: 'SearchStore' },
  ),
)
