'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { Heart, Home, Library, Music, Plus, Search, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const pathname = usePathname()
  const playlists = useLibraryStore((s) => s.playlists)
  const followedArtists = useLibraryStore((s) => s.followedArtists)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const handleCreatePlaylist = async () => {
    const name = `My Playlist #${playlists.length + 1}`
    const result = await createPlaylist(name)
    if (result) {
      window.location.href = `/playlist/${result.id}`
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-shrink-0 flex-col bg-bg-elevated transition-all duration-300',
        sidebarOpen ? 'w-[280px]' : 'w-[72px]',
      )}
      aria-label="Navigation"
    >
      {/* Logo */}
      <div
        className={cn('flex items-center px-6 pb-2 pt-6', !sidebarOpen && 'justify-center px-0')}
      >
        <span className="text-xl font-bold text-text-primary">
          {sidebarOpen ? 'StreamWave' : 'SW'}
        </span>
      </div>

      {/* Nav links */}
      <nav className="mt-2 px-3">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex h-10 items-center gap-4 rounded px-3 text-sm font-semibold transition-colors',
              isActive(href) ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
              !sidebarOpen && 'justify-center px-0',
            )}
            aria-current={isActive(href) ? 'page' : undefined}
          >
            <Icon size={24} aria-hidden="true" />
            {sidebarOpen && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Following artists — shown below Search when sidebar is open */}
      {sidebarOpen && followedArtists.length > 0 && (
        <nav className="mt-1 px-3">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-subdued">
            Following
          </p>
          {followedArtists.slice(0, 8).map((artist) => (
            <Link
              key={artist.id}
              href={`/artist/${artist.id}`}
              className={cn(
                'flex h-10 items-center gap-3 rounded px-3 text-sm transition-colors',
                pathname === `/artist/${artist.id}`
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-bg-press">
                {artist.image_url ? (
                  <Image
                    src={artist.image_url}
                    alt={artist.name}
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserRound size={12} className="text-text-subdued" aria-hidden="true" />
                  </div>
                )}
              </div>
              <span className="truncate">{artist.name}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="mx-3 mt-2 border-t border-border-default" />

      {/* Library section */}
      <div className="flex flex-1 flex-col overflow-hidden px-3 pt-2">
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2',
            !sidebarOpen && 'justify-center px-0',
          )}
        >
          <Link
            href="/library"
            className={cn(
              'flex items-center gap-3 text-sm font-semibold transition-colors',
              pathname.startsWith('/library')
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary',
              !sidebarOpen && 'justify-center',
            )}
            aria-label="Your Library"
          >
            <Library size={24} aria-hidden="true" />
            {sidebarOpen && <span>Your Library</span>}
          </Link>
          {sidebarOpen && (
            <button
              onClick={() => void handleCreatePlaylist()}
              className="rounded-full p-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Create playlist"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Library list */}
        <div className="flex-1 overflow-y-auto">
          {sidebarOpen && (
            <>
              {/* Liked Songs */}
              <Link
                href="/library/liked-songs"
                className={cn(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                  pathname === '/library/liked-songs'
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-800 to-blue-400">
                  <Heart size={16} className="text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary">Liked Songs</p>
                  <p className="truncate text-xs text-text-secondary">Playlist</p>
                </div>
              </Link>

              {/* User playlists */}
              {playlists.map((playlist) => (
                <div key={playlist.id} className="group flex items-center gap-3 rounded px-3 py-2">
                  <Link
                    href={`/playlist/${playlist.id}`}
                    className={cn(
                      'flex flex-1 items-center gap-3 min-w-0 text-sm transition-colors',
                      pathname === `/playlist/${playlist.id}`
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                      {playlist.cover_url ? (
                        <Image
                          src={playlist.cover_url}
                          alt={playlist.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg-press">
                          <Music size={16} className="text-text-subdued" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-primary">{playlist.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        Playlist • {playlist.total_tracks} songs
                      </p>
                    </div>
                  </Link>
                  <button
                    aria-label={`Play ${playlist.name}`}
                    onClick={() => void playPlaylist(playlist.id)}
                    className="hidden rounded-full p-1 text-text-secondary transition-colors hover:text-text-primary group-hover:block"
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
