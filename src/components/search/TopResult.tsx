'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import type {
  TrackSearchResult,
  ArtistSearchResult,
  AlbumSearchResult,
  PlaylistSearchResult,
} from '@/types/search'

type TopResultItem =
  | { type: 'track'; data: TrackSearchResult }
  | { type: 'artist'; data: ArtistSearchResult }
  | { type: 'album'; data: AlbumSearchResult }
  | { type: 'playlist'; data: PlaylistSearchResult }

interface TopResultProps {
  item: TopResultItem
}

export function TopResult({ item }: TopResultProps) {
  const playTrack = usePlayerStore((s) => s.playTrack)
  const playAlbum = usePlayerStore((s) => s.playAlbum)
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (item.type === 'track') void playTrack(item.data.id)
    else if (item.type === 'album') void playAlbum(item.data.id)
    else if (item.type === 'playlist') void playPlaylist(item.data.id)
  }

  const href =
    item.type === 'track'
      ? `/album/${item.data.album_id}`
      : item.type === 'artist'
        ? `/artist/${item.data.id}`
        : item.type === 'album'
          ? `/album/${item.data.id}`
          : `/playlist/${item.data.id}`

  const imageUrl =
    item.type === 'track'
      ? item.data.album_cover_url
      : item.type === 'artist'
        ? item.data.image_url
        : item.type === 'album'
          ? item.data.cover_url
          : item.data.cover_url

  const title =
    item.type === 'track'
      ? item.data.title
      : item.type === 'artist'
        ? item.data.name
        : item.type === 'album'
          ? item.data.title
          : item.data.name

  const subtitle =
    item.type === 'track'
      ? `Song • ${item.data.artist_name}`
      : item.type === 'artist'
        ? 'Artist'
        : item.type === 'album'
          ? `Album • ${item.data.artist_name}`
          : `Playlist • ${item.data.owner_name}`

  const isCircular = item.type === 'artist'
  const canPlay = item.type !== 'artist'

  return (
    <Link
      href={href}
      className="group relative flex h-60 flex-col justify-end overflow-hidden rounded-lg bg-bg-elevated p-5 transition-colors duration-200 hover:bg-bg-highlight"
    >
      {/* Background art */}
      <div
        className={`absolute left-5 top-5 h-28 w-28 overflow-hidden shadow-2xl ${isCircular ? 'rounded-full' : 'rounded'}`}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes="112px" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-bg-press" />
        )}
      </div>

      {/* Text */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-text-primary leading-tight">{title}</span>
          <span className="text-sm text-text-secondary">{subtitle}</span>
        </div>

        {canPlay && (
          <button
            aria-label={`Play ${title}`}
            onClick={handlePlay}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary text-bg-base opacity-0 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-accent-hover group-hover:opacity-100"
          >
            <Play size={20} fill="currentColor" />
          </button>
        )}
      </div>
    </Link>
  )
}
