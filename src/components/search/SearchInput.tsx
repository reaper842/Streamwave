'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchStore } from '@/stores/search'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchInputProps {
  autoFocus?: boolean
}

export function SearchInput({ autoFocus = true }: SearchInputProps) {
  const query = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)
  const search = useSearchStore((s) => s.search)
  const clearResults = useSearchStore((s) => s.clearResults)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Fire search when debounced value settles
  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery)
    } else {
      clearResults()
    }
  }, [debouncedQuery, search, clearResults])

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleClear() {
    setQuery('')
    clearResults()
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <div className="relative flex items-center">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-text-secondary"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="What do you want to listen to?"
        aria-label="Search"
        className="h-10 w-64 rounded-full bg-white pl-9 pr-9 text-sm text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-white/80 lg:w-80"
      />
      {query && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
