'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePlayerStore } from '@/stores/player'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { AlbumSummary } from '@/types/content'

interface AlbumCardProps {
  album: AlbumSummary
  className?: string
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  const router = useRouter()
  const playAlbum = usePlayerStore((s) => s.playAlbum)

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void playAlbum(album.id)
  }

  const contextItems = [
    { label: 'Play album', onClick: () => void playAlbum(album.id) },
    { label: 'Go to artist', onClick: () => router.push(`/artist/${album.artist.id}`) },
  ]

  return (
    <ContextMenu items={contextItems}>
      <Link
        href={`/album/${album.id}`}
        className={cn(
          'group flex flex-col gap-3 rounded-md bg-bg-elevated p-4 transition-colors duration-200 hover:bg-bg-highlight',
          className,
        )}
      >
        {/* Artwork */}
        <div className="relative aspect-square w-full overflow-hidden rounded">
          {album.cover_url ? (
            <Image
              src={album.cover_url}
              alt={album.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-bg-press" />
          )}

          {/* Hover play button */}
          <button
            aria-label={`Play ${album.title}`}
            onClick={handlePlay}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary text-bg-base opacity-0 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover group-hover:opacity-100"
          >
            <Play size={18} fill="currentColor" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1">
          <span className="truncate text-sm font-semibold text-text-primary">{album.title}</span>
          <span className="truncate text-xs text-text-secondary">{album.artist.name}</span>
        </div>
      </Link>
    </ContextMenu>
  )
}
