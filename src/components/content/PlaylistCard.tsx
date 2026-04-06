'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePlayerStore } from '@/stores/player'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { PlaylistSummary } from '@/types/content'

interface PlaylistCardProps {
  playlist: PlaylistSummary
  className?: string
}

export function PlaylistCard({ playlist, className }: PlaylistCardProps) {
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void playPlaylist(playlist.id)
  }

  const contextItems = [{ label: 'Play playlist', onClick: () => void playPlaylist(playlist.id) }]

  return (
    <ContextMenu items={contextItems}>
      <Link
        href={`/playlist/${playlist.id}`}
        className={cn(
          'group flex flex-col gap-3 rounded-md bg-bg-elevated p-4 transition-colors duration-200 hover:bg-bg-highlight',
          className,
        )}
      >
        {/* Artwork */}
        <div className="relative aspect-square w-full overflow-hidden rounded">
          {playlist.cover_url ? (
            <Image
              src={playlist.cover_url}
              alt={playlist.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-press">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-text-subdued"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}

          {/* Hover play button */}
          <button
            aria-label={`Play ${playlist.name}`}
            onClick={handlePlay}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary text-bg-base opacity-0 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover group-hover:opacity-100"
          >
            <Play size={18} fill="currentColor" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1">
          <span className="truncate text-sm font-semibold text-text-primary">{playlist.name}</span>
          <span className="line-clamp-2 text-xs text-text-secondary">
            {playlist.description ?? `By ${playlist.owner.display_name}`}
          </span>
        </div>
      </Link>
    </ContextMenu>
  )
}
