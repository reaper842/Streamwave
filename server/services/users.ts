import { prisma } from '../lib/prisma'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  created_at: string
  likedSongsCount: number
  playlistsCount: number
  followedArtistsCount: number
  savedAlbumsCount: number
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [user, likedSongsCount, playlistsCount, followedArtistsCount, savedAlbumsCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, display_name: true, avatar_url: true, created_at: true },
      }),
      prisma.likedSong.count({ where: { user_id: userId } }),
      prisma.playlist.count({ where: { user_id: userId } }),
      prisma.followedArtist.count({ where: { user_id: userId } }),
      prisma.savedAlbum.count({ where: { user_id: userId } }),
    ])

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    created_at: user.created_at.toISOString(),
    likedSongsCount,
    playlistsCount,
    followedArtistsCount,
    savedAlbumsCount,
  }
}

export async function updateUserProfile(
  userId: string,
  data: { display_name?: string; avatar_url?: string | null },
): Promise<{ id: string; email: string; display_name: string; avatar_url: string | null }> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, display_name: true, avatar_url: true },
  })
  return updated
}
