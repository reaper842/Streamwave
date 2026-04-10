'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { Clock, X } from 'lucide-react'
import { useSearchStore } from '@/stores/search'
import { TopResult } from '@/components/search/TopResult'
import { AlbumCard } from '@/components/content/AlbumCard'
import { ArtistCard } from '@/components/content/ArtistCard'
import { PlaylistCard } from '@/components/content/PlaylistCard'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/lib/utils/formatDuration'
import { getStaticGenres } from '@/lib/utils/genres'
import type { AlbumSummary, PlaylistSummary } from '@/types/content'
import type { TrackSearchResult, ArtistSearchResult } from '@/types/search'

// ── Genre browse grid ─────────────────────────────────────────────────────────

function GenreBrowse() {
  const genres = getStaticGenres()
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-text-primary">Browse all</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {genres.map((genre) => (
          <Link
            key={genre.slug}
            href={`/search/genre/${encodeURIComponent(genre.slug)}`}
            className="relative h-32 overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: genre.color }}
          >
            <span className="absolute left-3 top-3 text-base font-bold text-white drop-shadow">
              {genre.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── Search history ────────────────────────────────────────────────────────────

function SearchHistory() {
  const searchHistory = useSearchStore((s) => s.searchHistory)
  const clearHistory = useSearchStore((s) => s.clearHistory)
  const search = useSearchStore((s) => s.search)
  const setQuery = useSearchStore((s) => s.setQuery)

  if (searchHistory.length === 0) return null

  function handleClickHistory(q: string) {
    setQuery(q)
    void search(q)
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Recent searches</h2>
        <button
          onClick={clearHistory}
          className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {searchHistory.map((q) => (
          <button
            key={q}
            onClick={() => handleClickHistory(q)}
            className="flex items-center gap-3 rounded px-3 py-2 text-left hover:bg-bg-elevated transition-colors"
          >
            <Clock size={16} className="flex-shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="text-sm text-text-primary">{q}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Songs results section ─────────────────────────────────────────────────────

function SongsSection({ tracks }: { tracks: TrackSearchResult[] }) {
  const playTrack = usePlayerStore((s) => s.playTrack)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  if (tracks.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-text-primary">Songs</h2>
      <div className="flex flex-col">
        {tracks.slice(0, 4).map((track) => {
          const isCurrent = currentTrack?.id === track.id
          const isCurrentlyPlaying = isCurrent && isPlaying
          return (
            <button
              key={track.id}
              onClick={() => void playTrack(track.id)}
              className={`group flex items-center gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-bg-elevated ${isCurrent ? 'text-accent-primary' : ''}`}
            >
              {/* Album art */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                {track.album_cover_url ? (
                  <Image
                    src={track.album_cover_url}
                    alt={track.album_title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-bg-press" />
                )}
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="h-3 w-3 rounded-full bg-accent-primary" />
                  </div>
                )}
              </div>

              {/* Title + artist */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-text-primary">
                  {track.title}
                </span>
                <span className="truncate text-xs text-text-secondary">{track.artist_name}</span>
              </div>

              {/* Duration */}
              <span className="flex-shrink-0 text-xs text-text-secondary">
                {formatDuration(track.duration_ms)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Artists section ────────────────────────────────────────────────────────────

function ArtistsSection({ artists }: { artists: ArtistSearchResult[] }) {
  if (artists.length === 0) return null

  // Map to the shape ArtistCard expects
  const mapped = artists.map((a) => ({
    id: a.id,
    name: a.name,
    image_url: a.image_url,
    bio: null,
    genre: a.genre,
  }))

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Artists</h2>
        {artists.length >= 4 && (
          <Link
            href={`?type=artists`}
            className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            See all
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {mapped.map((artist) => (
          <div key={artist.id} className="w-44 flex-shrink-0">
            <ArtistCard artist={artist} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Albums section ────────────────────────────────────────────────────────────

function AlbumsSection({ albums }: { albums: ReturnType<typeof mapAlbums> }) {
  if (albums.length === 0) return null

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Albums</h2>
        {albums.length >= 4 && (
          <Link
            href={`?type=albums`}
            className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            See all
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {albums.map((album) => (
          <div key={album.id} className="w-44 flex-shrink-0">
            <AlbumCard album={album} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Playlists section ─────────────────────────────────────────────────────────

function PlaylistsSection({ playlists }: { playlists: ReturnType<typeof mapPlaylists> }) {
  if (playlists.length === 0) return null

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Playlists</h2>
        {playlists.length >= 4 && (
          <Link
            href={`?type=playlists`}
            className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            See all
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {playlists.map((pl) => (
          <div key={pl.id} className="w-44 flex-shrink-0">
            <PlaylistCard playlist={pl} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Shape adapters ────────────────────────────────────────────────────────────

function mapAlbums(albums: import('@/types/search').AlbumSearchResult[]): AlbumSummary[] {
  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    cover_url: a.cover_url,
    release_date: a.release_date,
    genre: a.genre,
    artist: { id: a.artist_id, name: a.artist_name },
  }))
}

function mapPlaylists(
  playlists: import('@/types/search').PlaylistSearchResult[],
): PlaylistSummary[] {
  return playlists.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    cover_url: p.cover_url,
    owner: { id: p.owner_id, display_name: p.owner_name },
  }))
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <X size={48} className="text-text-subdued" aria-hidden="true" />
      <p className="text-xl font-bold text-text-primary">
        No results found for &ldquo;{query}&rdquo;
      </p>
      <p className="text-sm text-text-secondary">
        Please make sure your words are spelled correctly, or use fewer or different keywords.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const query = useSearchStore((s) => s.query)
  const results = useSearchStore((s) => s.results)
  const isLoading = useSearchStore((s) => s.isLoading)
  const loadHistory = useSearchStore((s) => s.loadHistory)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const hasResults =
    results.tracks.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0

  const mappedAlbums = mapAlbums(results.albums)
  const mappedPlaylists = mapPlaylists(results.playlists)

  // Determine the top result (best match across all types)
  const topResultItem = (() => {
    if (results.tracks.length > 0) return { type: 'track' as const, data: results.tracks[0]! }
    if (results.artists.length > 0) return { type: 'artist' as const, data: results.artists[0]! }
    if (results.albums.length > 0) return { type: 'album' as const, data: results.albums[0]! }
    if (results.playlists.length > 0)
      return { type: 'playlist' as const, data: results.playlists[0]! }
    return null
  })()

  return (
    <div className="px-6 py-8">
      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-secondary border-t-accent-primary" />
        </div>
      )}

      {/* ── No query yet: history + browse ── */}
      {!isLoading && !query && (
        <>
          <SearchHistory />
          <GenreBrowse />
        </>
      )}

      {/* ── Has query, no results ── */}
      {!isLoading && query && !hasResults && <EmptyState query={query} />}

      {/* ── Has query + results ── */}
      {!isLoading && query && hasResults && (
        <div className="flex flex-col gap-8">
          {/* Top two columns: TopResult + Songs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {topResultItem && (
              <div>
                <h2 className="mb-4 text-xl font-bold text-text-primary">Top result</h2>
                <TopResult item={topResultItem} />
              </div>
            )}
            {results.tracks.length > 0 && (
              <div>
                <SongsSection tracks={results.tracks} />
              </div>
            )}
          </div>

          {/* Horizontal scroll sections */}
          {results.artists.length > 0 && <ArtistsSection artists={results.artists} />}
          {mappedAlbums.length > 0 && <AlbumsSection albums={mappedAlbums} />}
          {mappedPlaylists.length > 0 && <PlaylistsSection playlists={mappedPlaylists} />}
        </div>
      )}
    </div>
  )
}
