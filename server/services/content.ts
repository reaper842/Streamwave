import { prisma } from '../lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrackSummary {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
}

export interface AlbumDetail {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
  artist: { id: string; name: string; image_url: string | null }
  tracks: TrackSummary[]
  total_tracks: number
  total_duration_ms: number
}

export interface AlbumSummary {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
  artist: { id: string; name: string }
}

export interface ArtistDetail {
  id: string
  name: string
  bio: string | null
  image_url: string | null
  genre: string | null
}

export interface PlaylistDetail {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  owner: { id: string; display_name: string; avatar_url: string | null }
  tracks: Array<TrackSummary & { position: number; added_at: string }>
  total_tracks: number
  total_duration_ms: number
}

export interface PlaylistSummary {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  owner: { id: string; display_name: string }
}

export interface FeaturedResponse {
  playlists: PlaylistSummary[]
  albums: AlbumSummary[]
}

export interface GenreCard {
  label: string
  color: string
  slug: string
}

// ── Album service ─────────────────────────────────────────────────────────────

export async function getAlbumById(albumId: string): Promise<AlbumDetail | null> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      artist: { select: { id: true, name: true, image_url: true } },
      tracks: {
        orderBy: { track_number: 'asc' },
        include: {
          artist: { select: { id: true, name: true } },
        },
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

// ── Artist service ────────────────────────────────────────────────────────────

export async function getArtistById(artistId: string): Promise<ArtistDetail | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true, bio: true, image_url: true, genre: true },
  })
  return artist ?? null
}

export async function getArtistAlbums(
  artistId: string,
  cursor?: string,
  limit = 20,
): Promise<{ albums: AlbumSummary[]; nextCursor: string | null }> {
  const take = Math.min(limit, 50)
  const albums = await prisma.album.findMany({
    where: { artist_id: artistId },
    orderBy: { release_date: 'desc' },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { artist: { select: { id: true, name: true } } },
  })

  const hasMore = albums.length > take
  const page = hasMore ? albums.slice(0, take) : albums
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  return {
    albums: page.map((a) => ({
      id: a.id,
      title: a.title,
      cover_url: a.cover_url,
      release_date: a.release_date ? a.release_date.toISOString() : null,
      genre: a.genre,
      artist: { id: a.artist.id, name: a.artist.name },
    })),
    nextCursor,
  }
}

export async function getArtistTopTracks(artistId: string, limit = 10): Promise<TrackSummary[]> {
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

// ── Playlist service ──────────────────────────────────────────────────────────

export async function getPlaylistById(playlistId: string): Promise<PlaylistDetail | null> {
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

// ── Browse service ────────────────────────────────────────────────────────────

export async function getFeatured(): Promise<FeaturedResponse> {
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

export function getGenres(): GenreCard[] {
  return [
    { label: 'Pop', color: '#e91e8c', slug: 'Pop' },
    { label: 'Hip-Hop', color: '#e8821a', slug: 'Hip-Hop' },
    { label: 'Rock', color: '#ba0000', slug: 'Rock' },
    { label: 'Electronic', color: '#0d73ec', slug: 'Electronic' },
    { label: 'Jazz', color: '#8d67ab', slug: 'Jazz' },
    { label: 'Classical', color: '#509bf5', slug: 'Classical' },
    { label: 'R&B', color: '#1e3264', slug: 'R&B' },
    { label: 'Country', color: '#477d95', slug: 'Country' },
    { label: 'Latin', color: '#dc148c', slug: 'Latin' },
    { label: 'Indie', color: '#148a08', slug: 'Indie' },
    { label: 'Metal', color: '#7a2929', slug: 'Metal' },
    { label: 'Soul', color: '#503750', slug: 'Soul' },
  ]
}
