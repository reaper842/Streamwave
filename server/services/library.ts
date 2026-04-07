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

// ── Saved Albums ──────────────────────────────────────────────────────────────

export interface SavedAlbumItem {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
  artist: { id: string; name: string; image_url: string | null }
  total_tracks: number
  saved_at: string
}

export interface SavedAlbumsPage {
  items: SavedAlbumItem[]
  nextCursor: string | null
  total: number
}

/**
 * Return a cursor-paginated page of the user's saved albums, newest first.
 */
export async function getSavedAlbums(
  userId: string,
  cursor?: string,
  limit: number = 20,
): Promise<SavedAlbumsPage> {
  const take = Math.min(Math.max(limit, 1), 100)

  const where = cursor
    ? { user_id: userId, saved_at: { lt: new Date(cursor) } }
    : { user_id: userId }

  const [rows, total] = await Promise.all([
    prisma.savedAlbum.findMany({
      where,
      orderBy: { saved_at: 'desc' },
      take: take + 1,
      include: {
        album: {
          include: {
            artist: { select: { id: true, name: true, image_url: true } },
            _count: { select: { tracks: true } },
          },
        },
      },
    }),
    prisma.savedAlbum.count({ where: { user_id: userId } }),
  ])

  const hasMore = rows.length > take
  if (hasMore) rows.pop()

  const items: SavedAlbumItem[] = rows.map((row) => ({
    id: row.album.id,
    title: row.album.title,
    cover_url: row.album.cover_url,
    release_date: row.album.release_date?.toISOString() ?? null,
    genre: row.album.genre,
    artist: row.album.artist,
    total_tracks: row.album._count.tracks,
    saved_at: row.saved_at.toISOString(),
  }))

  const nextCursor =
    hasMore && rows.length > 0 ? rows[rows.length - 1]!.saved_at.toISOString() : null

  return { items, nextCursor, total }
}

/**
 * Save an album to the user's library.
 * Idempotent — saving an already-saved album is a no-op.
 * Throws 404 if the album does not exist.
 */
export async function saveAlbum(userId: string, albumId: string): Promise<void> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true },
  })

  if (!album) {
    throw Object.assign(new Error('Album not found'), {
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  }

  await prisma.savedAlbum.upsert({
    where: { user_id_album_id: { user_id: userId, album_id: albumId } },
    create: { user_id: userId, album_id: albumId },
    update: {},
  })
}

/**
 * Remove an album from the user's saved albums.
 * Idempotent — unsaving an album that was never saved is a no-op.
 */
export async function unsaveAlbum(userId: string, albumId: string): Promise<void> {
  await prisma.savedAlbum.deleteMany({
    where: { user_id: userId, album_id: albumId },
  })
}

// ── Followed Artists ──────────────────────────────────────────────────────────

export interface FollowedArtistItem {
  id: string
  name: string
  bio: string | null
  image_url: string | null
  genre: string | null
  followed_at: string
}

/**
 * Return all artists followed by the user, newest first.
 */
export async function getFollowedArtists(userId: string): Promise<FollowedArtistItem[]> {
  const rows = await prisma.followedArtist.findMany({
    where: { user_id: userId },
    orderBy: { followed_at: 'desc' },
    include: {
      artist: {
        select: { id: true, name: true, bio: true, image_url: true, genre: true },
      },
    },
  })

  return rows.map((row) => ({
    ...row.artist,
    followed_at: row.followed_at.toISOString(),
  }))
}

/**
 * Follow an artist.
 * Idempotent — following an already-followed artist is a no-op.
 * Throws 404 if the artist does not exist.
 */
export async function followArtist(userId: string, artistId: string): Promise<void> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true },
  })

  if (!artist) {
    throw Object.assign(new Error('Artist not found'), {
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  }

  await prisma.followedArtist.upsert({
    where: { user_id_artist_id: { user_id: userId, artist_id: artistId } },
    create: { user_id: userId, artist_id: artistId },
    update: {},
  })
}

/**
 * Unfollow an artist.
 * Idempotent — unfollowing an artist that was never followed is a no-op.
 */
export async function unfollowArtist(userId: string, artistId: string): Promise<void> {
  await prisma.followedArtist.deleteMany({
    where: { user_id: userId, artist_id: artistId },
  })
}
