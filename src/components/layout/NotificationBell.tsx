'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface ArtistRelease {
  id: string
  title: string
  cover_url: string | null
  created_at: string
  artist: { id: string; name: string }
}

const STORAGE_KEY = 'sw_releases_last_seen'

function getLastSeen(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
}

function markSeen() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

export function NotificationBell() {
  const [releases, setReleases] = useState<ArtistRelease[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiClient
      .get<ArtistRelease[]>('/library/followed-artists/releases')
      .then((res) => {
        const data = res.data
        setReleases(data)
        const lastSeen = getLastSeen()
        const newCount = data.filter((r) => new Date(r.created_at).getTime() > lastSeen).length
        setUnreadCount(newCount)
      })
      .catch(() => {
        // Not following anyone or not logged in — silent
      })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open) {
      markSeen()
      setUnreadCount(0)
    }
  }

  if (releases.length === 0) return null

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg bg-bg-highlight shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <h2 className="text-sm font-bold text-text-primary">New from artists you follow</h2>
          </div>

          <ul className="max-h-80 overflow-y-auto py-1">
            {releases.map((release) => (
              <li key={release.id}>
                <Link
                  href={`/album/${release.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg-press"
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                    {release.cover_url ? (
                      <Image
                        src={release.cover_url}
                        alt={release.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-bg-press" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">{release.title}</p>
                    <p className="truncate text-xs text-text-secondary">
                      {release.artist.name} · Album
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
