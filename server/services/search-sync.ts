/**
 * Meilisearch index initialization and document sync helpers.
 *
 * Call `initializeIndexes` once on server startup to ensure indexes exist with
 * the correct settings.  The individual `sync*` helpers are called after any
 * DB write that affects a searchable entity.  `fullSync` is the one-shot
 * import used by `server/scripts/sync-search.ts` and after a fresh DB seed.
 */
import type { Meilisearch } from 'meilisearch'
import type { PrismaClient } from '../../src/generated/prisma/client'

// ── Index names ───────────────────────────────────────────────────────────────

export const INDEX = {
  TRACKS: 'tracks',
  ARTISTS: 'artists',
  ALBUMS: 'albums',
  PLAYLISTS: 'playlists',
} as const

// ── Document shapes ───────────────────────────────────────────────────────────
// Imported from the shared types file and re-exported with "Document" aliases
// so callers can `import type { TrackDocument } from './search-sync'`.

import type {
  TrackSearchResult,
  ArtistSearchResult,
  AlbumSearchResult,
  PlaylistSearchResult,
} from '../../src/types/search'

export type TrackDocument = TrackSearchResult
export type ArtistDocument = ArtistSearchResult
export type AlbumDocument = AlbumSearchResult
export type PlaylistDocument = PlaylistSearchResult

// ── Index settings ────────────────────────────────────────────────────────────

const TYPO_TOLERANCE = {
  enabled: true,
  minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
}

const STOP_WORDS = ['a', 'an', 'the', 'and', 'or', 'in', 'on', 'of', 'by', 'for']

const TRACK_SETTINGS = {
  searchableAttributes: ['title', 'artist_name', 'album_title'],
  filterableAttributes: ['genre', 'artist_id', 'album_id'],
  typoTolerance: TYPO_TOLERANCE,
  stopWords: STOP_WORDS,
}

const ARTIST_SETTINGS = {
  searchableAttributes: ['name', 'genre'],
  filterableAttributes: ['genre'],
  typoTolerance: TYPO_TOLERANCE,
  stopWords: STOP_WORDS,
}

const ALBUM_SETTINGS = {
  searchableAttributes: ['title', 'artist_name'],
  filterableAttributes: ['genre', 'artist_id'],
  typoTolerance: TYPO_TOLERANCE,
  stopWords: STOP_WORDS,
}

const PLAYLIST_SETTINGS = {
  searchableAttributes: ['name', 'description', 'owner_name'],
  filterableAttributes: ['is_public', 'owner_id'],
  typoTolerance: TYPO_TOLERANCE,
  stopWords: STOP_WORDS,
}

// ── Index initialization ──────────────────────────────────────────────────────

/**
 * Idempotent: creates indexes if missing and applies settings.
 * Safe to call on every server startup.
 */
export async function initializeIndexes(meili: Meilisearch): Promise<void> {
  const indexConfigs = [
    { uid: INDEX.TRACKS, primaryKey: 'id' },
    { uid: INDEX.ARTISTS, primaryKey: 'id' },
    { uid: INDEX.ALBUMS, primaryKey: 'id' },
    { uid: INDEX.PLAYLISTS, primaryKey: 'id' },
  ]

  for (const config of indexConfigs) {
    try {
      await meili.createIndex(config.uid, { primaryKey: config.primaryKey })
    } catch {
      // Index already exists — ignore error
    }
  }

  await Promise.all([
    meili.index(INDEX.TRACKS).updateSettings(TRACK_SETTINGS),
    meili.index(INDEX.ARTISTS).updateSettings(ARTIST_SETTINGS),
    meili.index(INDEX.ALBUMS).updateSettings(ALBUM_SETTINGS),
    meili.index(INDEX.PLAYLISTS).updateSettings(PLAYLIST_SETTINGS),
  ])
}

// ── Per-entity sync helpers ───────────────────────────────────────────────────

/** Fetch a track from DB and upsert it into the tracks index. */
export async function syncTrack(
  meili: Meilisearch,
  prisma: PrismaClient,
  trackId: string,
): Promise<void> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true, cover_url: true, genre: true } },
    },
  })

  if (!track) {
    await safeDelete(meili, INDEX.TRACKS, trackId)
    return
  }

  const doc: TrackDocument = {
    id: track.id,
    title: track.title,
    artist_name: track.artist.name,
    artist_id: track.artist_id,
    album_title: track.album.title,
    album_id: track.album_id,
    album_cover_url: track.album.cover_url,
    duration_ms: track.duration_ms,
    genre: track.album.genre,
  }

  await meili.index(INDEX.TRACKS).addDocuments([doc])
}

/** Fetch an artist from DB and upsert it into the artists index. */
export async function syncArtist(
  meili: Meilisearch,
  prisma: PrismaClient,
  artistId: string,
): Promise<void> {
  const artist = await prisma.artist.findUnique({ where: { id: artistId } })

  if (!artist) {
    await safeDelete(meili, INDEX.ARTISTS, artistId)
    return
  }

  const doc: ArtistDocument = {
    id: artist.id,
    name: artist.name,
    genre: artist.genre,
    image_url: artist.image_url,
  }

  await meili.index(INDEX.ARTISTS).addDocuments([doc])
}

/** Fetch an album from DB and upsert it into the albums index. */
export async function syncAlbum(
  meili: Meilisearch,
  prisma: PrismaClient,
  albumId: string,
): Promise<void> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: { artist: { select: { id: true, name: true } } },
  })

  if (!album) {
    await safeDelete(meili, INDEX.ALBUMS, albumId)
    return
  }

  const doc: AlbumDocument = {
    id: album.id,
    title: album.title,
    artist_name: album.artist.name,
    artist_id: album.artist_id,
    cover_url: album.cover_url,
    release_date: album.release_date ? album.release_date.toISOString() : null,
    genre: album.genre,
  }

  await meili.index(INDEX.ALBUMS).addDocuments([doc])
}

/**
 * Fetch a playlist from DB and upsert it into the playlists index.
 * Private playlists are removed from the index (not discoverable via search).
 */
export async function syncPlaylist(
  meili: Meilisearch,
  prisma: PrismaClient,
  playlistId: string,
): Promise<void> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: { user: { select: { id: true, display_name: true } } },
  })

  if (!playlist || !playlist.is_public) {
    await safeDelete(meili, INDEX.PLAYLISTS, playlistId)
    return
  }

  const doc: PlaylistDocument = {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    cover_url: playlist.cover_url,
    owner_name: playlist.user.display_name,
    owner_id: playlist.user_id,
    is_public: true,
  }

  await meili.index(INDEX.PLAYLISTS).addDocuments([doc])
}

/** Remove a document from an index without throwing if it doesn't exist. */
export async function safeDelete(meili: Meilisearch, indexName: string, id: string): Promise<void> {
  try {
    await meili.index(indexName).deleteDocument(id)
  } catch {
    // Document not in index — ignore
  }
}

// ── Full sync ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500

/**
 * Full one-shot sync from Postgres to all Meilisearch indexes.
 * Used by `server/scripts/sync-search.ts` and after `npx prisma db seed`.
 */
export async function fullSync(meili: Meilisearch, prisma: PrismaClient): Promise<void> {
  await initializeIndexes(meili)

  // ── Tracks (cursor-paginated to handle large catalogs) ────────────────────
  let trackCursor: string | undefined
  do {
    const tracks = await prisma.track.findMany({
      take: BATCH_SIZE,
      ...(trackCursor ? { skip: 1, cursor: { id: trackCursor } } : {}),
      orderBy: { id: 'asc' },
      include: {
        artist: { select: { id: true, name: true } },
        album: { select: { id: true, title: true, cover_url: true, genre: true } },
      },
    })

    if (tracks.length === 0) break

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docs: TrackDocument[] = (tracks as any[])
      .filter((t) => t.album != null && t.artist != null)
      .map((t) => ({
        id: t.id,
        title: t.title,
        artist_name: t.artist.name,
        artist_id: t.artist_id,
        album_title: t.album.title,
        album_id: t.album_id,
        album_cover_url: t.album.cover_url,
        duration_ms: t.duration_ms,
        genre: t.album.genre,
      }))

    await meili.index(INDEX.TRACKS).addDocuments(docs)
    trackCursor =
      tracks.length === BATCH_SIZE ? (tracks[tracks.length - 1]?.id ?? undefined) : undefined
  } while (trackCursor)

  // ── Artists ────────────────────────────────────────────────────────────────
  const artists = await prisma.artist.findMany({})
  if (artists.length > 0) {
    const docs: ArtistDocument[] = artists.map((a) => ({
      id: a.id,
      name: a.name,
      genre: a.genre,
      image_url: a.image_url,
    }))
    await meili.index(INDEX.ARTISTS).addDocuments(docs)
  }

  // ── Albums ─────────────────────────────────────────────────────────────────
  const albums = await prisma.album.findMany({
    include: { artist: { select: { id: true, name: true } } },
  })
  if (albums.length > 0) {
    const docs: AlbumDocument[] = albums.map((a) => ({
      id: a.id,
      title: a.title,
      artist_name: a.artist.name,
      artist_id: a.artist_id,
      cover_url: a.cover_url,
      release_date: a.release_date ? a.release_date.toISOString() : null,
      genre: a.genre,
    }))
    await meili.index(INDEX.ALBUMS).addDocuments(docs)
  }

  // ── Public playlists ───────────────────────────────────────────────────────
  const playlists = await prisma.playlist.findMany({
    where: { is_public: true },
    include: { user: { select: { id: true, display_name: true } } },
  })
  if (playlists.length > 0) {
    const docs: PlaylistDocument[] = playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      cover_url: p.cover_url,
      owner_name: p.user.display_name,
      owner_id: p.user_id,
      is_public: true,
    }))
    await meili.index(INDEX.PLAYLISTS).addDocuments(docs)
  }
}
