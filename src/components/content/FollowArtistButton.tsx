'use client'

import { useLibraryStore, type ArtistSummary } from '@/stores/library'
import { cn } from '@/lib/utils/cn'

interface FollowArtistButtonProps {
  artistId: string
  artistName?: string
  artistImageUrl?: string | null
}

export function FollowArtistButton({
  artistId,
  artistName,
  artistImageUrl,
}: FollowArtistButtonProps) {
  const following = useLibraryStore((s) => s.followedArtistIds.has(artistId))
  const toggleFollowArtist = useLibraryStore((s) => s.toggleFollowArtist)

  const handleClick = () => {
    const artistData: ArtistSummary | undefined = artistName
      ? { id: artistId, name: artistName, image_url: artistImageUrl ?? null }
      : undefined
    void toggleFollowArtist(artistId, artistData)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={following ? 'Unfollow artist' : 'Follow artist'}
      className={cn(
        'rounded-full border px-6 py-1.5 text-sm font-semibold transition-colors',
        following
          ? 'border-text-secondary text-text-primary hover:border-text-primary'
          : 'border-text-secondary text-text-secondary hover:border-text-primary hover:text-text-primary',
      )}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
