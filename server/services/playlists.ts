import { prisma } from '../lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaylistSummary {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  total_tracks: number
  created_at: string
  updated_at: string
}

export interface PlaylistTrackItem {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
  position: number
  added_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function notFound(msg: string): never {
  throw Object.assign(new Error(msg), { statusCode: 404, code: 'NOT_FOUND' })
}

function forbidden(msg: string): never {
  throw Object.assign(new Error(msg), { statusCode: 403, code: 'FORBIDDEN' })
}

/**
 * Verify that a playlist exists and is owned by `userId`.
 * Throws 404 if missing, 403 if owned by someone else.
 */
async function assertOwnership(playlistId: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { user_id: true },
  })

  if (!playlist) notFound('Playlist not found')
  if (playlist.user_id !== userId) forbidden('You do not own this playlist')
}

// ── Create / Update / Delete ──────────────────────────────────────────────────

/**
 * Create a new empty playlist owned by `userId`.
 */
export async function createPlaylist(
  userId: string,
  name: string,
  description?: string,
): Promise<PlaylistSummary> {
  const playlist = await prisma.playlist.create({
    data: { user_id: userId, name, description: description ?? null },
    include: { _count: { select: { tracks: true } } },
  })

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    cover_url: playlist.cover_url,
    is_public: playlist.is_public,
    total_tracks: playlist._count.tracks,
    created_at: playlist.created_at.toISOString(),
    updated_at: playlist.updated_at.toISOString(),
  }
}

/**
 * Update playlist metadata (name, description, cover_url, is_public).
 * Throws 404/403 on missing or unowned playlist.
 */
export async function updatePlaylist(
  playlistId: string,
  userId: string,
  data: {
    name?: string
    description?: string | null
    cover_url?: string | null
    is_public?: boolean
  },
): Promise<PlaylistSummary> {
  await assertOwnership(playlistId, userId)

  const playlist = await prisma.playlist.update({
    where: { id: playlistId },
    data,
    include: { _count: { select: { tracks: true } } },
  })

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    cover_url: playlist.cover_url,
    is_public: playlist.is_public,
    total_tracks: playlist._count.tracks,
    created_at: playlist.created_at.toISOString(),
    updated_at: playlist.updated_at.toISOString(),
  }
}

/**
 * Delete a playlist and all its PlaylistTrack join rows (cascade in schema).
 * Throws 404/403 on missing or unowned playlist.
 */
export async function deletePlaylist(playlistId: string, userId: string): Promise<void> {
  await assertOwnership(playlistId, userId)
  await prisma.playlist.delete({ where: { id: playlistId } })
}

// ── Track Management ──────────────────────────────────────────────────────────

/**
 * Add a track to a playlist at the specified position.
 * If `position` is omitted, appends to the end.
 * Throws 404/403 if playlist is missing or not owned by user.
 * Throws 404 if the track does not exist.
 * Idempotent: if the track is already in the playlist, no-op (returns existing position).
 */
export async function addTrackToPlaylist(
  playlistId: string,
  userId: string,
  trackId: string,
  position?: number,
): Promise<{ position: number }> {
  await assertOwnership(playlistId, userId)

  const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } })
  if (!track) notFound('Track not found')

  // Check if already in playlist
  const existing = await prisma.playlistTrack.findUnique({
    where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
    select: { position: true },
  })
  if (existing) return { position: existing.position }

  return await prisma.$transaction(async (tx) => {
    const count = await tx.playlistTrack.count({ where: { playlist_id: playlistId } })
    const insertAt = position !== undefined ? Math.min(Math.max(position, 1), count + 1) : count + 1

    // Shift tracks at insertAt and above up by 1
    if (insertAt <= count) {
      await tx.playlistTrack.updateMany({
        where: { playlist_id: playlistId, position: { gte: insertAt } },
        data: { position: { increment: 1 } },
      })
    }

    await tx.playlistTrack.create({
      data: { playlist_id: playlistId, track_id: trackId, position: insertAt },
    })

    return { position: insertAt }
  })
}

/**
 * Remove a track from a playlist and compact remaining positions.
 * Throws 404/403 if playlist is missing or not owned by user.
 * Idempotent: removing a track not in the playlist is a no-op.
 */
export async function removeTrackFromPlaylist(
  playlistId: string,
  userId: string,
  trackId: string,
): Promise<void> {
  await assertOwnership(playlistId, userId)

  await prisma.$transaction(async (tx) => {
    const row = await tx.playlistTrack.findUnique({
      where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
      select: { position: true },
    })

    if (!row) return // already not in playlist — no-op

    await tx.playlistTrack.delete({
      where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
    })

    // Compact: shift all tracks above the removed position down by 1
    await tx.playlistTrack.updateMany({
      where: { playlist_id: playlistId, position: { gt: row.position } },
      data: { position: { decrement: 1 } },
    })
  })
}

/**
 * Move a track to a new position within the playlist.
 * Positions are 1-based and contiguous. After reorder all positions are still
 * 1..N with no gaps.
 *
 * Throws 404/403 if playlist is missing or not owned by user.
 * Throws 404 if the track is not currently in the playlist.
 */
export async function reorderPlaylistTracks(
  playlistId: string,
  userId: string,
  trackId: string,
  newPosition: number,
): Promise<void> {
  await assertOwnership(playlistId, userId)

  await prisma.$transaction(async (tx) => {
    const row = await tx.playlistTrack.findUnique({
      where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
      select: { position: true },
    })

    if (!row) notFound('Track is not in this playlist')

    const oldPos = row.position
    const count = await tx.playlistTrack.count({ where: { playlist_id: playlistId } })
    const newPos = Math.min(Math.max(newPosition, 1), count)

    if (oldPos === newPos) return // nothing to do

    if (newPos < oldPos) {
      // Moving up: shift tracks between [newPos, oldPos-1] down by 1
      await tx.playlistTrack.updateMany({
        where: {
          playlist_id: playlistId,
          position: { gte: newPos, lt: oldPos },
          track_id: { not: trackId },
        },
        data: { position: { increment: 1 } },
      })
    } else {
      // Moving down: shift tracks between [oldPos+1, newPos] up by 1
      await tx.playlistTrack.updateMany({
        where: {
          playlist_id: playlistId,
          position: { gt: oldPos, lte: newPos },
          track_id: { not: trackId },
        },
        data: { position: { decrement: 1 } },
      })
    }

    await tx.playlistTrack.update({
      where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
      data: { position: newPos },
    })
  })
}

/**
 * Return all playlists owned by a user, ordered by updated_at desc.
 */
export async function getUserPlaylists(userId: string): Promise<PlaylistSummary[]> {
  const playlists = await prisma.playlist.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' },
    include: { _count: { select: { tracks: true } } },
  })

  return playlists.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    cover_url: p.cover_url,
    is_public: p.is_public,
    total_tracks: p._count.tracks,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }))
}
