import { prisma } from '../lib/prisma'

// ── Admin guard ───────────────────────────────────────────────────────────────

export async function assertAdmin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_admin: true },
  })
  if (!user?.is_admin) {
    throw Object.assign(new Error('Admin access required'), {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [users, artists, albums, tracks, playlists] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count(),
    prisma.album.count(),
    prisma.track.count(),
    prisma.playlist.count(),
  ])
  return { users, artists, albums, tracks, playlists }
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export async function adminListTracks(page: number, limit: number) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.track.findMany({
      skip,
      take: limit,
      orderBy: [{ artist: { name: 'asc' } }, { album: { title: 'asc' } }, { track_number: 'asc' }],
      select: {
        id: true,
        title: true,
        track_number: true,
        duration_ms: true,
        audio_url: true,
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, cover_url: true } },
      },
    }),
    prisma.track.count(),
  ])
  return { items, total, page, limit }
}

export async function adminCreateTrack(data: {
  title: string
  artistId: string
  albumId: string
  trackNumber: number
  durationMs: number
  audioUrl: string
}) {
  return prisma.track.create({
    data: {
      title: data.title,
      artist_id: data.artistId,
      album_id: data.albumId,
      track_number: data.trackNumber,
      duration_ms: data.durationMs,
      audio_url: data.audioUrl,
    },
    select: {
      id: true,
      title: true,
      track_number: true,
      duration_ms: true,
      audio_url: true,
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true } },
    },
  })
}

export async function adminUpdateTrack(
  id: string,
  data: Partial<{
    title: string
    artistId: string
    albumId: string
    trackNumber: number
    durationMs: number
    audioUrl: string
  }>,
) {
  const existing = await prisma.track.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw Object.assign(new Error('Track not found'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  return prisma.track.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.artistId !== undefined && { artist_id: data.artistId }),
      ...(data.albumId !== undefined && { album_id: data.albumId }),
      ...(data.trackNumber !== undefined && { track_number: data.trackNumber }),
      ...(data.durationMs !== undefined && { duration_ms: data.durationMs }),
      ...(data.audioUrl !== undefined && { audio_url: data.audioUrl }),
    },
    select: {
      id: true,
      title: true,
      track_number: true,
      duration_ms: true,
      audio_url: true,
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true } },
    },
  })
}

export async function adminDeleteTrack(id: string) {
  const existing = await prisma.track.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw Object.assign(new Error('Track not found'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  await prisma.track.delete({ where: { id } })
}

// ── Artists (read-only, for dropdowns) ───────────────────────────────────────

export async function adminListArtists() {
  return prisma.artist.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, genre: true, image_url: true },
  })
}

// ── Albums (read-only, for dropdowns) ────────────────────────────────────────

export async function adminListAlbums(artistId?: string) {
  return prisma.album.findMany({
    where: artistId ? { artist_id: artistId } : undefined,
    orderBy: [{ artist: { name: 'asc' } }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      cover_url: true,
      artist: { select: { id: true, name: true } },
    },
  })
}

// ── Playlists ─────────────────────────────────────────────────────────────────

export async function adminListPlaylists(page: number, limit: number) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.playlist.findMany({
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        cover_url: true,
        is_public: true,
        created_at: true,
        user: { select: { id: true, display_name: true } },
        _count: { select: { tracks: true } },
      },
    }),
    prisma.playlist.count(),
  ])
  return { items, total, page, limit }
}

export async function adminCreatePlaylist(data: {
  userId: string
  name: string
  description?: string
  isPublic?: boolean
}) {
  return prisma.playlist.create({
    data: {
      user_id: data.userId,
      name: data.name,
      description: data.description ?? null,
      is_public: data.isPublic ?? true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      cover_url: true,
      is_public: true,
      created_at: true,
      user: { select: { id: true, display_name: true } },
    },
  })
}

export async function adminUpdatePlaylist(
  id: string,
  data: Partial<{ name: string; description: string; isPublic: boolean; coverUrl: string }>,
) {
  const existing = await prisma.playlist.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw Object.assign(new Error('Playlist not found'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  return prisma.playlist.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isPublic !== undefined && { is_public: data.isPublic }),
      ...(data.coverUrl !== undefined && { cover_url: data.coverUrl }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      cover_url: true,
      is_public: true,
    },
  })
}

export async function adminDeletePlaylist(id: string) {
  const existing = await prisma.playlist.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw Object.assign(new Error('Playlist not found'), { statusCode: 404, code: 'NOT_FOUND' })
  }
  await prisma.playlist.delete({ where: { id } })
}

export async function adminAddTrackToPlaylist(playlistId: string, trackId: string) {
  const [playlist, track] = await Promise.all([
    prisma.playlist.findUnique({ where: { id: playlistId }, select: { id: true } }),
    prisma.track.findUnique({ where: { id: trackId }, select: { id: true } }),
  ])
  if (!playlist)
    throw Object.assign(new Error('Playlist not found'), { statusCode: 404, code: 'NOT_FOUND' })
  if (!track)
    throw Object.assign(new Error('Track not found'), { statusCode: 404, code: 'NOT_FOUND' })

  // Already in playlist?
  const existing = await prisma.playlistTrack.findUnique({
    where: { playlist_id_track_id: { playlist_id: playlistId, track_id: trackId } },
  })
  if (existing) return existing

  const maxPos = await prisma.playlistTrack.aggregate({
    where: { playlist_id: playlistId },
    _max: { position: true },
  })
  const position = (maxPos._max.position ?? 0) + 1

  return prisma.playlistTrack.create({
    data: { playlist_id: playlistId, track_id: trackId, position },
  })
}

export async function adminRemoveTrackFromPlaylist(playlistId: string, trackId: string) {
  await prisma.playlistTrack.deleteMany({
    where: { playlist_id: playlistId, track_id: trackId },
  })
}

export async function adminGetPlaylistTracks(playlistId: string) {
  return prisma.playlistTrack.findMany({
    where: { playlist_id: playlistId },
    orderBy: { position: 'asc' },
    select: {
      position: true,
      track: {
        select: {
          id: true,
          title: true,
          duration_ms: true,
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true, cover_url: true } },
        },
      },
    },
  })
}
