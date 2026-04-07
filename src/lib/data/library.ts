// Server-only: import this only from Server Components or server actions
import { prisma } from '@/lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LikedSongItem {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
  liked_at: string
}

// ── Liked Songs ────────────────────────────────────────────────────────────────

/**
 * Fetch all liked songs for the given user, newest first.
 * Uses Prisma directly (RSC only — do not call from client components).
 */
export async function fetchLikedSongs(userId: string): Promise<LikedSongItem[]> {
  const rows = await prisma.likedSong.findMany({
    where: { user_id: userId },
    orderBy: { liked_at: 'desc' },
    include: {
      track: {
        include: {
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true, cover_url: true } },
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.track.id,
    title: row.track.title,
    duration_ms: row.track.duration_ms,
    track_number: row.track.track_number,
    artist: row.track.artist,
    album: row.track.album,
    liked_at: row.liked_at.toISOString(),
  }))
}
