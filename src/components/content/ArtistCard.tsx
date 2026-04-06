'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { ArtistDetail } from '@/types/content'

interface ArtistCardProps {
  artist: Pick<ArtistDetail, 'id' | 'name' | 'image_url'>
  className?: string
}

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const router = useRouter()

  const contextItems = [
    { label: 'Go to artist page', onClick: () => router.push(`/artist/${artist.id}`) },
  ]

  return (
    <ContextMenu items={contextItems}>
      <Link
        href={`/artist/${artist.id}`}
        className={cn(
          'group flex flex-col items-center gap-3 rounded-md bg-bg-elevated p-4 transition-colors duration-200 hover:bg-bg-highlight',
          className,
        )}
      >
        {/* Circular artwork */}
        <div className="relative aspect-square w-full overflow-hidden rounded-full">
          {artist.image_url ? (
            <Image
              src={artist.image_url}
              alt={artist.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-bg-press" />
          )}
        </div>

        {/* Name */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="truncate text-sm font-semibold text-text-primary">{artist.name}</span>
          <span className="text-xs text-text-secondary">Artist</span>
        </div>
      </Link>
    </ContextMenu>
  )
}
