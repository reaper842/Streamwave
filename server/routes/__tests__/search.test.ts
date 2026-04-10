/**
 * Integration tests for:
 *   GET /api/v1/search?q=...&type=...&limit=...&offset=...
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 *  - Meilisearch running (docker compose up -d)
 *
 * Strategy: seed a few known records into Meilisearch via fullSync, then
 * assert the search endpoint returns them.  Each test file gets an isolated
 * Prisma+Meilisearch state seeded in beforeAll.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildSearchApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'
import { fullSync } from '../../services/search-sync'
import type { SearchResults } from '../../../src/types/search'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UNIQUE = `srch_${Date.now()}`

let app: FastifyInstance
let artistId: string
let albumId: string
let trackId: string
let playlistId: string
let userId: string

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  app = await buildSearchApp()

  // Seed minimal fixture data
  const artist = await prisma.artist.create({
    data: { name: `TestArtist_${UNIQUE}`, genre: 'TestGenre', bio: null, image_url: null },
  })
  artistId = artist.id

  const album = await prisma.album.create({
    data: {
      title: `TestAlbum_${UNIQUE}`,
      artist_id: artistId,
      genre: 'TestGenre',
      cover_url: null,
      release_date: null,
    },
  })
  albumId = album.id

  const track = await prisma.track.create({
    data: {
      title: `TestTrack_${UNIQUE}`,
      artist_id: artistId,
      album_id: albumId,
      duration_ms: 180_000,
      audio_url: '/audio/test.mp3',
      track_number: 1,
    },
  })
  trackId = track.id

  const user = await prisma.user.create({
    data: {
      email: `search_test_${UNIQUE}@test.streamwave.invalid`,
      password_hash: 'irrelevant',
      display_name: `SearchUser_${UNIQUE}`,
    },
  })
  userId = user.id

  const playlist = await prisma.playlist.create({
    data: {
      name: `TestPlaylist_${UNIQUE}`,
      user_id: userId,
      is_public: true,
      description: 'Integration test playlist',
    },
  })
  playlistId = playlist.id

  // Sync all fixture records to Meilisearch
  await fullSync(app.meili, prisma)

  // Give Meilisearch a moment to finish indexing tasks
  await new Promise((r) => setTimeout(r, 500))
})

afterAll(async () => {
  // Clean up DB fixtures (Meilisearch docs will be stale but that's fine for tests)
  await prisma.playlist.deleteMany({ where: { id: playlistId } })
  await prisma.track.deleteMany({ where: { id: trackId } })
  await prisma.album.deleteMany({ where: { id: albumId } })
  await prisma.artist.deleteMany({ where: { id: artistId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function searchRequest(query: string, extraParams = '') {
  return app.inject({
    method: 'GET',
    url: `/api/v1/search?q=${encodeURIComponent(query)}${extraParams}`,
  })
}

// ── Validation tests ─────────────────────────────────────────────────────────

describe('GET /api/v1/search — validation', () => {
  it('returns 400 when q is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/search' })
    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when q is empty string', async () => {
    const res = await searchRequest('')
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when type contains only unknown values', async () => {
    const res = await searchRequest('test', '&type=foo,bar')
    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when limit exceeds 50', async () => {
    const res = await searchRequest('test', '&limit=99')
    expect(res.statusCode).toBe(400)
  })
})

// ── Search results tests ──────────────────────────────────────────────────────

describe('GET /api/v1/search — results', () => {
  it('returns 200 with all four result arrays', async () => {
    const res = await searchRequest('test')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    expect(body.data).toHaveProperty('tracks')
    expect(body.data).toHaveProperty('artists')
    expect(body.data).toHaveProperty('albums')
    expect(body.data).toHaveProperty('playlists')
    expect(Array.isArray(body.data.tracks)).toBe(true)
    expect(Array.isArray(body.data.artists)).toBe(true)
    expect(Array.isArray(body.data.albums)).toBe(true)
    expect(Array.isArray(body.data.playlists)).toBe(true)
  })

  it('finds the seeded track by title', async () => {
    const res = await searchRequest(`TestTrack_${UNIQUE}`, '&type=tracks')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    expect(body.data.artists).toHaveLength(0)
    expect(body.data.albums).toHaveLength(0)
    expect(body.data.playlists).toHaveLength(0)
    const match = body.data.tracks.find((t) => t.id === trackId)
    expect(match).toBeDefined()
    expect(match?.title).toContain('TestTrack_')
    expect(match?.artist_id).toBe(artistId)
    expect(match?.album_id).toBe(albumId)
  })

  it('finds the seeded artist by name', async () => {
    const res = await searchRequest(`TestArtist_${UNIQUE}`, '&type=artists')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    const match = body.data.artists.find((a) => a.id === artistId)
    expect(match).toBeDefined()
    expect(match?.name).toContain('TestArtist_')
  })

  it('finds the seeded album by title', async () => {
    const res = await searchRequest(`TestAlbum_${UNIQUE}`, '&type=albums')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    const match = body.data.albums.find((a) => a.id === albumId)
    expect(match).toBeDefined()
    expect(match?.artist_id).toBe(artistId)
  })

  it('finds the seeded public playlist by name', async () => {
    const res = await searchRequest(`TestPlaylist_${UNIQUE}`, '&type=playlists')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    const match = body.data.playlists.find((p) => p.id === playlistId)
    expect(match).toBeDefined()
    expect(match?.is_public).toBe(true)
  })

  it('returns empty arrays for all types on a no-match query', async () => {
    const res = await searchRequest('zzz_nomatch_xyzzy_99999')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    expect(body.data.tracks).toHaveLength(0)
    expect(body.data.artists).toHaveLength(0)
    expect(body.data.albums).toHaveLength(0)
    expect(body.data.playlists).toHaveLength(0)
  })

  it('respects the type filter — tracks only', async () => {
    const res = await searchRequest(`TestArtist_${UNIQUE}`, '&type=tracks')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    expect(body.data.artists).toHaveLength(0)
    expect(body.data.albums).toHaveLength(0)
    expect(body.data.playlists).toHaveLength(0)
    // tracks may or may not match — just verify the other arrays are empty
  })

  it('accepts multiple valid types in the type param', async () => {
    const res = await searchRequest(`TestArtist_${UNIQUE}`, '&type=artists,albums')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    // tracks + playlists not requested → should be empty
    expect(body.data.tracks).toHaveLength(0)
    expect(body.data.playlists).toHaveLength(0)
    const match = body.data.artists.find((a) => a.id === artistId)
    expect(match).toBeDefined()
  })

  it('respects the limit param', async () => {
    const res = await searchRequest('test', '&limit=2')
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: SearchResults }>()
    expect(body.data.tracks.length).toBeLessThanOrEqual(2)
    expect(body.data.artists.length).toBeLessThanOrEqual(2)
    expect(body.data.albums.length).toBeLessThanOrEqual(2)
    expect(body.data.playlists.length).toBeLessThanOrEqual(2)
  })
})

// ── Cache tests ───────────────────────────────────────────────────────────────

describe('GET /api/v1/search — Redis cache', () => {
  beforeEach(async () => {
    // Clear any existing cache keys
    const keys = await app.redis.keys('search:*')
    if (keys.length) await app.redis.del(...keys)
  })

  it('returns the same result on two consecutive identical requests (cache hit)', async () => {
    const q = `TestTrack_${UNIQUE}`
    const res1 = await searchRequest(q, '&type=tracks')
    const res2 = await searchRequest(q, '&type=tracks')
    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(200)
    expect(res1.json()).toEqual(res2.json())
  })
})
