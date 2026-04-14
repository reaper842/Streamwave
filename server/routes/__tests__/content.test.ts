/**
 * Integration tests for content API routes:
 *   GET /api/v1/tracks/:id
 *   GET /api/v1/tracks/:id/stream
 *   GET /api/v1/albums/:id
 *   GET /api/v1/artists/:id
 *   GET /api/v1/artists/:id/albums
 *   GET /api/v1/artists/:id/top-tracks
 *   GET /api/v1/browse/featured
 *   GET /api/v1/browse/genres
 *
 * Requires: PostgreSQL + Redis running (docker compose up -d)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

// ── Fixture data ───────────────────────────────────────────────────────────────

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `content_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'ContentTest1'
const DEMO_DISPLAY = 'Content Test User'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookieValue(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith(`${name}=`))
  return found?.split(';')[0]?.replace(`${name}=`, '')
}

async function registerAndGetToken(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: DEMO_DISPLAY },
    headers: { 'content-type': 'application/json' },
  })
  const token = getCookieValue(res, 'access_token')
  if (!token) throw new Error('No access_token cookie after register')
  return token
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance
let accessToken: string
let artistId: string
let albumId: string
let trackId: string

beforeAll(async () => {
  app = await buildApp()
  accessToken = await registerAndGetToken(app)

  // Create artist → album → track fixture for this test suite
  const ts = Date.now()
  const artist = await prisma.artist.create({
    data: {
      name: `ContentArtist_${ts}`,
      bio: 'A test artist',
      genre: 'Test',
    },
  })
  artistId = artist.id

  const album = await prisma.album.create({
    data: {
      title: `ContentAlbum_${ts}`,
      artist_id: artist.id,
      genre: 'Test',
    },
  })
  albumId = album.id

  const track = await prisma.track.create({
    data: {
      title: `ContentTrack_${ts}`,
      artist_id: artist.id,
      album_id: album.id,
      duration_ms: 200_000,
      track_number: 1,
      audio_url: '/audio/test.mp3', // local path — bypasses R2
    },
  })
  trackId = track.id
})

afterAll(async () => {
  // Clean up fixtures and demo user
  await prisma.track.deleteMany({ where: { id: trackId } })
  await prisma.album.deleteMany({ where: { id: albumId } })
  await prisma.artist.deleteMany({ where: { id: artistId } })
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })
  await app.close()
})

// ── GET /api/v1/tracks/:id ────────────────────────────────────────────────────

describe('GET /api/v1/tracks/:id', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/tracks/${trackId}` })
    expect(res.statusCode).toBe(401)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('UNAUTHORIZED')
  })

  it('400: returns VALIDATION_ERROR for a non-UUID id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tracks/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for a valid UUID with no matching track', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000010'
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${fakeId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND')
  })

  it('200: returns track metadata with artist and album', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${trackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: {
        id: string
        title: string
        duration_ms: number
        track_number: number
        artist: { id: string; name: string }
        album: { id: string; title: string; cover_url: string | null }
      }
    }>()
    expect(body.data.id).toBe(trackId)
    expect(typeof body.data.title).toBe('string')
    expect(body.data.duration_ms).toBe(200_000)
    expect(body.data.track_number).toBe(1)
    expect(body.data.artist).toMatchObject({ id: artistId, name: expect.any(String) })
    expect(body.data.album).toMatchObject({ id: albumId, title: expect.any(String) })
  })
})

// ── GET /api/v1/tracks/:id/stream ─────────────────────────────────────────────

describe('GET /api/v1/tracks/:id/stream', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/tracks/${trackId}/stream` })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tracks/bad-id/stream',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for a valid UUID with no matching track', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000011'
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${fakeId}/stream`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('200: returns streamUrl and expiresAt for a local-path track', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${trackId}/stream`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { streamUrl: string; expiresAt: string } }>()
    // Local paths bypass R2; streamUrl is the raw path stored in DB
    expect(body.data.streamUrl).toBe('/audio/test.mp3')
    expect(typeof body.data.expiresAt).toBe('string')
    // expiresAt should be a valid ISO-8601 date in the future
    expect(new Date(body.data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })
})

// ── GET /api/v1/albums/:id ────────────────────────────────────────────────────

describe('GET /api/v1/albums/:id', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/albums/${albumId}` })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/albums/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for a valid UUID with no matching album', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000012'
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/albums/${fakeId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('200: returns album detail with artist and track list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/albums/${albumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: {
        id: string
        title: string
        artist: { id: string; name: string }
        tracks: Array<{ id: string; title: string }>
        total_tracks: number
        total_duration_ms: number
      }
    }>()
    expect(body.data.id).toBe(albumId)
    expect(typeof body.data.title).toBe('string')
    expect(body.data.artist).toMatchObject({ id: artistId })
    expect(Array.isArray(body.data.tracks)).toBe(true)
    expect(body.data.tracks).toHaveLength(1)
    expect(body.data.tracks[0]!.id).toBe(trackId)
    expect(body.data.total_tracks).toBe(1)
    expect(body.data.total_duration_ms).toBe(200_000)
  })
})

// ── GET /api/v1/artists/:id ───────────────────────────────────────────────────

describe('GET /api/v1/artists/:id', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/artists/${artistId}` })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/artists/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for a valid UUID with no matching artist', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000013'
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${fakeId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('200: returns artist metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${artistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: { id: string; name: string; bio: string | null; genre: string | null }
    }>()
    expect(body.data.id).toBe(artistId)
    expect(typeof body.data.name).toBe('string')
    expect(body.data.bio).toBe('A test artist')
    expect(body.data.genre).toBe('Test')
  })
})

// ── GET /api/v1/artists/:id/albums ───────────────────────────────────────────

describe('GET /api/v1/artists/:id/albums', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/artists/${artistId}/albums` })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID artist id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/artists/bad-id/albums',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('200: returns albums list for artist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${artistId}/albums`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{ id: string; title: string; artist: { id: string } }>
      meta: { cursor?: string }
    }>()
    expect(Array.isArray(body.data)).toBe(true)
    // Our fixture has 1 album for this artist
    const ours = body.data.find((a) => a.id === albumId)
    expect(ours).toBeDefined()
    expect(ours!.artist).toMatchObject({ id: artistId })
  })

  it('200: empty list for artist with no albums (unknown UUID)', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000014'
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${fakeId}/albums`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    expect(body.data).toHaveLength(0)
  })
})

// ── GET /api/v1/artists/:id/top-tracks ───────────────────────────────────────

describe('GET /api/v1/artists/:id/top-tracks', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/artists/${artistId}/top-tracks` })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID artist id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/artists/bad-id/top-tracks',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('200: returns top tracks for artist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${artistId}/top-tracks`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{ id: string; title: string; duration_ms: number }>
    }>()
    expect(Array.isArray(body.data)).toBe(true)
    // Our fixture track should appear
    const ours = body.data.find((t) => t.id === trackId)
    expect(ours).toBeDefined()
    expect(ours!.duration_ms).toBe(200_000)
  })

  it('200: respects the limit query parameter', async () => {
    // Create a second track so we can test limit=1
    const extra = await prisma.track.create({
      data: {
        title: `LimitTrack_${Date.now()}`,
        artist_id: artistId,
        album_id: albumId,
        duration_ms: 100_000,
        track_number: 2,
        audio_url: '/audio/limit.mp3',
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/artists/${artistId}/top-tracks?limit=1`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    await prisma.track.delete({ where: { id: extra.id } })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    expect(body.data).toHaveLength(1)
  })
})

// ── GET /api/v1/browse/featured ───────────────────────────────────────────────

describe('GET /api/v1/browse/featured', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/browse/featured' })
    expect(res.statusCode).toBe(401)
  })

  it('200: returns playlists and albums arrays', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/browse/featured',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: { playlists: unknown[]; albums: unknown[] }
    }>()
    expect(Array.isArray(body.data.playlists)).toBe(true)
    expect(Array.isArray(body.data.albums)).toBe(true)
  })
})

// ── GET /api/v1/browse/genres ─────────────────────────────────────────────────

describe('GET /api/v1/browse/genres', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/browse/genres' })
    expect(res.statusCode).toBe(401)
  })

  it('200: returns an array of genre cards with label, color, and slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/browse/genres',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{ label: string; color: string; slug: string }>
    }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    const first = body.data[0]!
    expect(typeof first.label).toBe('string')
    expect(typeof first.color).toBe('string')
    expect(typeof first.slug).toBe('string')
    // Color should be a valid hex string
    expect(first.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})
