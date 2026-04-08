'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Heart, Music, Plus } from 'lucide-react'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { cn } from '@/lib/utils/cn'

type Tab = 'playlists' | 'artists' | 'albums'

interface SavedAlbumItem {
  id: string
  title: string
  cover_url: string | null
  artist: { id: string; name: string }
  saved_at: string
}

interface FollowedArtistItem {
  id: string
  name: string
  image_url: string | null
  genre: string | null
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('playlists')
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbumItem[]>([])
  const [followedArtists, setFollowedArtists] = useState<FollowedArtistItem[]>([])

  const playlists = useLibraryStore((s) => s.playlists)
  const fetchPlaylists = useLibraryStore((s) => s.fetchPlaylists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)

  const playPlaylist = usePlayerStore((s) => s.playPlaylist)

  useEffect(() => {
    void fetchPlaylists()
  }, [fetchPlaylists])

  useEffect(() => {
    if (activeTab === 'albums' && savedAlbums.length === 0) {
      void (async () => {
        const res = await fetch('/api/v1/library/saved-albums?limit=100', {
          credentials: 'include',
        })
        if (res.ok) {
          const json = (await res.json()) as { data: SavedAlbumItem[] }
          setSavedAlbums(json.data)
        }
      })()
    }
    if (activeTab === 'artists' && followedArtists.length === 0) {
      void (async () => {
        const res = await fetch('/api/v1/library/followed-artists', { credentials: 'include' })
        if (res.ok) {
          const json = (await res.json()) as { data: FollowedArtistItem[] }
          setFollowedArtists(json.data)
        }
      })()
    }
  }, [activeTab, savedAlbums.length, followedArtists.length])

  const handleCreatePlaylist = async () => {
    const name = `My Playlist #${playlists.length + 1}`
    const result = await createPlaylist(name)
    if (result) {
      // Navigate to the new playlist
      window.location.href = `/playlist/${result.id}`
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'playlists', label: 'Playlists' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
  ]

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Your Library</h1>
        <button
          onClick={() => void handleCreatePlaylist()}
          aria-label="Create new playlist"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-text-primary text-bg-base'
                : 'bg-bg-highlight text-text-primary hover:bg-bg-press',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Playlists tab */}
      {activeTab === 'playlists' && (
        <div>
          {/* Liked Songs entry */}
          <Link
            href="/library/liked-songs"
            className="mb-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-bg-highlight"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-800 to-blue-400">
              <Heart size={20} className="text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-primary">Liked Songs</p>
              <p className="text-xs text-text-secondary">Playlist</p>
            </div>
          </Link>

          {playlists.length === 0 ? (
            <div className="mt-8 flex flex-col items-center py-12 text-center">
              <Music size={48} className="mb-4 text-text-subdued" />
              <p className="font-semibold text-text-primary">Create your first playlist</p>
              <p className="mt-2 text-sm text-text-secondary">
                It&apos;s easy — we&apos;ll help you.
              </p>
              <button
                onClick={() => void handleCreatePlaylist()}
                className="mt-6 rounded-full bg-text-primary px-8 py-3 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90"
              >
                Create playlist
              </button>
            </div>
          ) : (
            playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-bg-highlight"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
                  {playlist.cover_url ? (
                    <Image
                      src={playlist.cover_url}
                      alt={playlist.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-bg-press">
                      <Music size={20} className="text-text-subdued" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text-primary">{playlist.name}</p>
                  <p className="text-xs text-text-secondary">
                    Playlist • {playlist.total_tracks} songs
                  </p>
                </div>
                <button
                  aria-label={`Play ${playlist.name}`}
                  onClick={(e) => {
                    e.preventDefault()
                    void playPlaylist(playlist.id)
                  }}
                  className="hidden rounded-full p-2 text-text-secondary transition-colors hover:text-text-primary group-hover:flex"
                />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Artists tab */}
      {activeTab === 'artists' && (
        <div>
          {followedArtists.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="font-semibold text-text-primary">Follow your first artist</p>
              <p className="mt-2 text-sm text-text-secondary">
                Follow artists you like by visiting their profile pages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {followedArtists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.id}`}
                  className="flex flex-col items-center gap-3 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-full">
                    {artist.image_url ? (
                      <Image
                        src={artist.image_url}
                        alt={artist.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 180px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-bg-press">
                        <Music size={40} className="text-text-subdued" />
                      </div>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {artist.name}
                    </p>
                    <p className="truncate text-xs text-text-secondary">Artist</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Albums tab */}
      {activeTab === 'albums' && (
        <div>
          {savedAlbums.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="font-semibold text-text-primary">Save your first album</p>
              <p className="mt-2 text-sm text-text-secondary">
                Save albums you like by visiting their pages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {savedAlbums.map((album) => (
                <Link
                  key={album.id}
                  href={`/album/${album.id}`}
                  className="flex flex-col gap-3 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded">
                    {album.cover_url ? (
                      <Image
                        src={album.cover_url}
                        alt={album.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 180px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-bg-press">
                        <Music size={40} className="text-text-subdued" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {album.title}
                    </p>
                    <p className="truncate text-xs text-text-secondary">{album.artist.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
