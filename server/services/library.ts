import { prisma } from '../lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LikedTrack {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
  liked_at: string
}

export interface LikedSongsPage {
  items: LikedTrack[]
  nextCursor: string | null
  total: number
}

// ── Liked Songs ───────────────────────────────────────────────────────────────

/**
 * Return a cursor-paginated page of the user's liked tracks, newest first.
 *
 * Cursor is the ISO-8601 string of the `liked_at` timestamp of the last item
 * from the previous page. Pass `undefined` to start from the beginning.
 */
export async function getLikedSongs(
  userId: string,
  cursor?: string,
  limit: number = 20,
): Promise<LikedSongsPage> {
  const take = Math.min(Math.max(limit, 1), 100)

  const where = cursor
    ? { user_id: userId, liked_at: { lt: new Date(cursor) } }
    : { user_id: userId }

  const [rows, total] = await Promise.all([
    prisma.likedSong.findMany({
      where,
      orderBy: { liked_at: 'desc' },
      take: take + 1, // one extra to detect whether a next page exists
      include: {
        track: {
          include: {
            artist: { select: { id: true, name: true } },
            album: { select: { id: true, title: true, cover_url: true } },
          },
        },
      },
    }),
    prisma.likedSong.count({ where: { user_id: userId } }),
  ])

  const hasMore = rows.length > take
  if (hasMore) rows.pop()

  const items: LikedTrack[] = rows.map((row) => ({
    id: row.track.id,
    title: row.track.title,
    duration_ms: row.track.duration_ms,
    track_number: row.track.track_number,
    artist: row.track.artist,
    album: row.track.album,
    liked_at: row.liked_at.toISOString(),
  }))

  const nextCursor =
    hasMore && rows.length > 0 ? rows[rows.length - 1]!.liked_at.toISOString() : null

  return { items, nextCursor, total }
}

/**
 * Add a track to the user's liked songs.
 * Idempotent — liking an already-liked track is a no-op (no error thrown).
 * Throws 404 if the track does not exist.
 */
export async function likeSong(userId: string, trackId: string): Promise<void> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true },
  })

  if (!track) {
    throw Object.assign(new Error('Track not found'), {
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  }

  await prisma.likedSong.upsert({
    where: { user_id_track_id: { user_id: userId, track_id: trackId } },
    create: { user_id: userId, track_id: trackId },
    update: {}, // already liked — keep existing liked_at
  })
}

/**
 * Remove a track from the user's liked songs.
 * Idempotent — unlike a track that was never liked is a no-op.
 */
export async function unlikeSong(userId: string, trackId: string): Promise<void> {
  await prisma.likedSong.deleteMany({
    where: { user_id: userId, track_id: trackId },
  })
}

/**
 * Check whether a specific track is in the user's liked songs.
 */
export async function isTrackLiked(userId: string, trackId: string): Promise<boolean> {
  const row = await prisma.likedSong.findUnique({
    where: { user_id_track_id: { user_id: userId, track_id: trackId } },
    select: { user_id: true },
  })
  return row !== null
}
