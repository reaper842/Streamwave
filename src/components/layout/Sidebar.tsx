'use client'

import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui'
import { Heart, Home, Library, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

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

      <div className="mx-3 mt-2 border-t border-border-default" />

      {/* Library section */}
      <div className="flex flex-1 flex-col overflow-hidden px-3 pt-2">
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2',
            !sidebarOpen && 'justify-center px-0',
          )}
        >
          <button
            className={cn(
              'flex items-center gap-3 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors',
              !sidebarOpen && 'justify-center',
            )}
            aria-label="Your Library"
          >
            <Library size={24} aria-hidden="true" />
            {sidebarOpen && <span>Your Library</span>}
          </button>
          {sidebarOpen && (
            <button
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
              <Link
                href="/library/liked-songs"
                className={cn(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                  pathname.startsWith('/library/liked-songs')
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
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
