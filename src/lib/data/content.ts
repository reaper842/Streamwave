// Server-only: import this only from Server Components or server actions
import { prisma } from '@/lib/prisma'
import type {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  FeaturedResponse,
  PlaylistDetail,
  TrackSummary,
} from '@/types/content'
export { getStaticGenres } from '@/lib/utils/genres'

// ── Album ─────────────────────────────────────────────────────────────────────

export async function fetchAlbum(albumId: string): Promise<AlbumDetail | null> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      artist: { select: { id: true, name: true, image_url: true } },
      tracks: {
        orderBy: { track_number: 'asc' },
        include: { artist: { select: { id: true, name: true } } },
      },
    },
  })

  if (!album) return null

  const tracks: TrackSummary[] = album.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    duration_ms: t.duration_ms,
    track_number: t.track_number,
    artist: { id: t.artist.id, name: t.artist.name },
    album: { id: album.id, title: album.title, cover_url: album.cover_url },
  }))

  return {
    id: album.id,
    title: album.title,
    cover_url: album.cover_url,
    release_date: album.release_date ? album.release_date.toISOString() : null,
    genre: album.genre,
    artist: { id: album.artist.id, name: album.artist.name, image_url: album.artist.image_url },
    tracks,
    total_tracks: tracks.length,
    total_duration_ms: tracks.reduce((sum, t) => sum + t.duration_ms, 0),
  }
}

// ── Artist ────────────────────────────────────────────────────────────────────

export async function fetchArtist(artistId: string): Promise<ArtistDetail | null> {
  return prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true, bio: true, image_url: true, genre: true },
  })
}

export async function fetchArtistAlbums(artistId: string, limit = 20): Promise<AlbumSummary[]> {
  const albums = await prisma.album.findMany({
    where: { artist_id: artistId },
    orderBy: { release_date: 'desc' },
    take: Math.min(limit, 50),
    include: { artist: { select: { id: true, name: true } } },
  })

  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    cover_url: a.cover_url,
    release_date: a.release_date ? a.release_date.toISOString() : null,
    genre: a.genre,
    artist: { id: a.artist.id, name: a.artist.name },
  }))
}

export async function fetchArtistTopTracks(artistId: string, limit = 10): Promise<TrackSummary[]> {
  const tracks = await prisma.track.findMany({
    where: { artist_id: artistId },
    take: Math.min(limit, 20),
    orderBy: { track_number: 'asc' },
    include: {
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true, cover_url: true } },
    },
  })

  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    duration_ms: t.duration_ms,
    track_number: t.track_number,
    artist: { id: t.artist.id, name: t.artist.name },
    album: { id: t.album.id, title: t.album.title, cover_url: t.album.cover_url },
  }))
}

// ── Playlist ──────────────────────────────────────────────────────────────────

export async function fetchPlaylist(playlistId: string): Promise<PlaylistDetail | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      user: { select: { id: true, display_name: true, avatar_url: true } },
      tracks: {
        orderBy: { position: 'asc' },
        include: {
          track: {
            include: {
              artist: { select: { id: true, name: true } },
              album: { select: { id: true, title: true, cover_url: true } },
            },
          },
        },
      },
    },
  })

  if (!playlist) return null

  const tracks = playlist.tracks.map((pt) => ({
    id: pt.track.id,
    title: pt.track.title,
    duration_ms: pt.track.duration_ms,
    track_number: pt.track.track_number,
    artist: { id: pt.track.artist.id, name: pt.track.artist.name },
    album: {
      id: pt.track.album.id,
      title: pt.track.album.title,
      cover_url: pt.track.album.cover_url,
    },
    position: pt.position,
    added_at: pt.added_at.toISOString(),
  }))

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    cover_url: playlist.cover_url,
    is_public: playlist.is_public,
    owner: {
      id: playlist.user.id,
      display_name: playlist.user.display_name,
      avatar_url: playlist.user.avatar_url,
    },
    tracks,
    total_tracks: tracks.length,
    total_duration_ms: tracks.reduce((sum, t) => sum + t.duration_ms, 0),
  }
}

// ── Browse ────────────────────────────────────────────────────────────────────

export async function fetchFeatured(): Promise<FeaturedResponse> {
  const [playlists, albums] = await Promise.all([
    prisma.playlist.findMany({
      where: { is_public: true },
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { user: { select: { id: true, display_name: true } } },
    }),
    prisma.album.findMany({
      take: 8,
      orderBy: { release_date: 'desc' },
      include: { artist: { select: { id: true, name: true } } },
    }),
  ])

  return {
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      cover_url: p.cover_url,
      owner: { id: p.user.id, display_name: p.user.display_name },
    })),
    albums: albums.map((a) => ({
      id: a.id,
      title: a.title,
      cover_url: a.cover_url,
      release_date: a.release_date ? a.release_date.toISOString() : null,
      genre: a.genre,
      artist: { id: a.artist.id, name: a.artist.name },
    })),
  }
}

// ── Genre browse ──────────────────────────────────────────────────────────────

export async function fetchAlbumsByGenre(genre: string, limit = 20): Promise<AlbumSummary[]> {
  const albums = await prisma.album.findMany({
    where: { genre: { equals: genre, mode: 'insensitive' } },
    take: Math.min(limit, 50),
    orderBy: { release_date: 'desc' },
    include: { artist: { select: { id: true, name: true } } },
  })

  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    cover_url: a.cover_url,
    release_date: a.release_date ? a.release_date.toISOString() : null,
    genre: a.genre,
    artist: { id: a.artist.id, name: a.artist.name },
  }))
}

export async function fetchArtistsByGenre(
  genre: string,
  limit = 20,
): Promise<Pick<ArtistDetail, 'id' | 'name' | 'image_url'>[]> {
  const artists = await prisma.artist.findMany({
    where: { genre: { equals: genre, mode: 'insensitive' } },
    take: Math.min(limit, 50),
    select: { id: true, name: true, image_url: true },
  })

  return artists
}
