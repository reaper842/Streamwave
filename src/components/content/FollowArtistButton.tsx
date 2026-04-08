'use client'

import { useLibraryStore } from '@/stores/library'
import { cn } from '@/lib/utils/cn'

interface FollowArtistButtonProps {
  artistId: string
}

export function FollowArtistButton({ artistId }: FollowArtistButtonProps) {
  const isFollowing = useLibraryStore((s) => s.isFollowing)
  const toggleFollowArtist = useLibraryStore((s) => s.toggleFollowArtist)

  const following = isFollowing(artistId)

  return (
    <button
      onClick={() => void toggleFollowArtist(artistId)}
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
