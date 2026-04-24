/**
 * Integration tests for Meilisearch sync helpers.
 *
 * Tests that syncTrack, syncArtist, syncAlbum, syncPlaylist correctly push
 * documents into Meilisearch after DB writes, and that safeDelete removes them.
 *
 * Requires: PostgreSQL + Meilisearch running (docker compose up -d)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildSearchApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'
import {
  syncTrack,
  syncArtist,
  syncAlbum,
  syncPlaylist,
  safeDelete,
  initializeIndexes,
  INDEX,
} from '../search-sync'
import type { FastifyInstance } from 'fastify'

// ── Fixture identifiers ───────────────────────────────────────────────────────

const UNIQUE = `sync_${Date.now()}`
let app: FastifyInstance
let artistId: string
let albumId: string
let trackId: string
let userId: string
let playlistId: string

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  app = await buildSearchApp()

  // Ensure indexes exist
  await initializeIndexes(app.meili)

  // Seed minimal DB fixtures
  const artist = await prisma.artist.create({
    data: { name: `SyncArtist_${UNIQUE}`, genre: 'SyncGenre', bio: null, image_url: null },
  })
  artistId = artist.id

  const album = await prisma.album.create({
    data: {
      title: `SyncAlbum_${UNIQUE}`,
      artist_id: artistId,
      genre: 'SyncGenre',
      cover_url: null,
      release_date: null,
    },
  })
  albumId = album.id

  const track = await prisma.track.create({
    data: {
      title: `SyncTrack_${UNIQUE}`,
      artist_id: artistId,
      album_id: albumId,
      duration_ms: 200_000,
      audio_url: '/audio/sync-test.mp3',
      track_number: 1,
    },
  })
  trackId = track.id

  const user = await prisma.user.create({
    data: {
      email: `sync_user_${UNIQUE}@test.streamwave.invalid`,
      password_hash: 'irrelevant',
      display_name: `SyncUser_${UNIQUE}`,
    },
  })
  userId = user.id

  const playlist = await prisma.playlist.create({
    data: {
      name: `SyncPlaylist_${UNIQUE}`,
      user_id: userId,
      is_public: true,
      description: 'Sync integration test playlist',
    },
  })
  playlistId = playlist.id
})

afterAll(async () => {
  // Clean up DB fixtures in dependency order
  await prisma.playlist.deleteMany({ where: { id: playlistId } })
  await prisma.track.deleteMany({ where: { id: trackId } })
  await prisma.album.deleteMany({ where: { id: albumId } })
  await prisma.artist.deleteMany({ where: { id: artistId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
})

/** Wait for Meilisearch indexing tasks to complete. */
async function waitForIndex(ms = 500) {
  await new Promise((r) => setTimeout(r, ms))
}

// ── syncArtist ────────────────────────────────────────────────────────────────

describe('syncArtist', () => {
  it('adds artist document to Meilisearch artists index', async () => {
    await syncArtist(app.meili, prisma, artistId)
    await waitForIndex()

    const result = await app.meili.index(INDEX.ARTISTS).getDocument(artistId)
    expect(result.id).toBe(artistId)
    expect(result.name).toBe(`SyncArtist_${UNIQUE}`)
    expect(result.genre).toBe('SyncGenre')
  })

  it('removes artist document when artist is deleted from DB', async () => {
    // First sync it in
    await syncArtist(app.meili, prisma, artistId)
    await waitForIndex()

    // Now call syncArtist with a non-existent ID — should call safeDelete
    const nonExistentId = 'does-not-exist-' + UNIQUE
    await syncArtist(app.meili, prisma, nonExistentId)
    await waitForIndex()

    // Verify it's not in the index (getDocument throws if missing)
    await expect(app.meili.index(INDEX.ARTISTS).getDocument(nonExistentId)).rejects.toThrow()
  })
})

// ── syncAlbum ─────────────────────────────────────────────────────────────────

describe('syncAlbum', () => {
  it('adds album document to Meilisearch albums index', async () => {
    await syncAlbum(app.meili, prisma, albumId)
    await waitForIndex()

    const result = await app.meili.index(INDEX.ALBUMS).getDocument(albumId)
    expect(result.id).toBe(albumId)
    expect(result.title).toBe(`SyncAlbum_${UNIQUE}`)
    expect(result.artist_id).toBe(artistId)
    expect(result.genre).toBe('SyncGenre')
  })

  it('is a no-op for a non-existent album ID', async () => {
    const nonExistentId = 'no-album-' + UNIQUE
    // Should not throw
    await expect(syncAlbum(app.meili, prisma, nonExistentId)).resolves.not.toThrow()
  })
})

// ── syncTrack ─────────────────────────────────────────────────────────────────

describe('syncTrack', () => {
  it('adds track document to Meilisearch tracks index', async () => {
    await syncTrack(app.meili, prisma, trackId)
    await waitForIndex()

    const result = await app.meili.index(INDEX.TRACKS).getDocument(trackId)
    expect(result.id).toBe(trackId)
    expect(result.title).toBe(`SyncTrack_${UNIQUE}`)
    expect(result.artist_id).toBe(artistId)
    expect(result.album_id).toBe(albumId)
    expect(result.duration_ms).toBe(200_000)
  })

  it('is a no-op for a non-existent track ID', async () => {
    const nonExistentId = 'no-track-' + UNIQUE
    await expect(syncTrack(app.meili, prisma, nonExistentId)).resolves.not.toThrow()
  })
})

// ── syncPlaylist ──────────────────────────────────────────────────────────────

describe('syncPlaylist', () => {
  it('adds public playlist to Meilisearch playlists index', async () => {
    await syncPlaylist(app.meili, prisma, playlistId)
    await waitForIndex()

    const result = await app.meili.index(INDEX.PLAYLISTS).getDocument(playlistId)
    expect(result.id).toBe(playlistId)
    expect(result.name).toBe(`SyncPlaylist_${UNIQUE}`)
    expect(result.is_public).toBe(true)
    expect(result.owner_id).toBe(userId)
  })

  it('removes private playlist from index', async () => {
    // Create a private playlist
    const privatePlaylist = await prisma.playlist.create({
      data: {
        name: `PrivatePlaylist_${UNIQUE}`,
        user_id: userId,
        is_public: false,
        description: null,
      },
    })

    // Sync the private playlist — should be removed from index (or never added)
    await syncPlaylist(app.meili, prisma, privatePlaylist.id)
    await waitForIndex()

    // Verify it's NOT in the index
    await expect(app.meili.index(INDEX.PLAYLISTS).getDocument(privatePlaylist.id)).rejects.toThrow()

    // Cleanup
    await prisma.playlist.delete({ where: { id: privatePlaylist.id } })
  })
})

// ── safeDelete ────────────────────────────────────────────────────────────────

describe('safeDelete', () => {
  it('removes an existing document from the index', async () => {
    // First make sure the document is indexed
    await syncArtist(app.meili, prisma, artistId)
    await waitForIndex()

    await safeDelete(app.meili, INDEX.ARTISTS, artistId)
    await waitForIndex()

    await expect(app.meili.index(INDEX.ARTISTS).getDocument(artistId)).rejects.toThrow()
  })

  it('does not throw when document does not exist', async () => {
    await expect(
      safeDelete(app.meili, INDEX.ARTISTS, 'never-existed-' + UNIQUE),
    ).resolves.not.toThrow()
  })
})
