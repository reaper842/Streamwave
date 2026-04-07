/**
 * Integration tests for the liked-songs library endpoints:
 *   GET    /api/v1/library/liked-songs
 *   POST   /api/v1/library/liked-songs/:trackId
 *   DELETE /api/v1/library/liked-songs/:trackId
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `library_liked_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'LibraryTest1'
const DEMO_DISPLAY = 'Library Test User'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the raw value of a named cookie from a set-cookie response header. */
function getCookieValue(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith(`${name}=`))
  return found?.split(';')[0]?.replace(`${name}=`, '')
}

/** Register the demo user and return the raw access_token cookie value. */
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
let seedTrackId: string

beforeAll(async () => {
  app = await buildApp()
  accessToken = await registerAndGetToken(app)

  // Create a minimal artist → album → track fixture for this test suite.
  // Using Prisma directly avoids dependency on the seed script being run.
  const artist = await prisma.artist.create({
    data: { name: `TestArtist_${Date.now()}`, genre: 'Test' },
  })
  const album = await prisma.album.create({
    data: { title: `TestAlbum_${Date.now()}`, artist_id: artist.id },
  })
  const track = await prisma.track.create({
    data: {
      title: `TestTrack_${Date.now()}`,
      artist_id: artist.id,
      album_id: album.id,
      duration_ms: 180000,
      track_number: 1,
      audio_url: 'https://example.com/test.mp3',
    },
  })
  seedTrackId = track.id
})

afterAll(async () => {
  // Clean up: remove test fixtures and the test user (cascade handles liked songs)
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  })
  if (user) {
    await prisma.likedSong.deleteMany({ where: { user_id: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  // Remove the test track → album → artist created in beforeAll
  const track = await prisma.track.findUnique({
    where: { id: seedTrackId },
    select: { album_id: true, artist_id: true },
  })
  if (track) {
    await prisma.track.delete({ where: { id: seedTrackId } })
    await prisma.album.delete({ where: { id: track.album_id } })
    await prisma.artist.delete({ where: { id: track.artist_id } })
  }
  await app.close()
})

// ── GET /api/v1/library/liked-songs ──────────────────────────────────────────

describe('GET /api/v1/library/liked-songs', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs',
    })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('200: returns empty list when user has no liked songs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; meta: { total: number; nextCursor: string | null } }>()
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('200: returns liked songs sorted newest first after liking tracks', async () => {
    // Like the seed track first
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{
        id: string
        title: string
        duration_ms: number
        track_number: number
        artist: { id: string; name: string }
        album: { id: string; title: string; cover_url: string | null }
        liked_at: string
      }>
      meta: { total: number; nextCursor: string | null }
    }>()

    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()

    const track = body.data[0]!
    expect(track.id).toBe(seedTrackId)
    expect(typeof track.title).toBe('string')
    expect(typeof track.duration_ms).toBe('number')
    expect(typeof track.track_number).toBe('number')
    expect(track.artist).toMatchObject({ id: expect.any(String), name: expect.any(String) })
    expect(track.album).toMatchObject({ id: expect.any(String), title: expect.any(String) })
    expect(typeof track.liked_at).toBe('string')
    // ISO-8601 date
    expect(new Date(track.liked_at).toISOString()).toBe(track.liked_at)
  })

  it('200: respects the limit query parameter and returns a nextCursor', async () => {
    // Create and like a second track inline so we have 2 liked songs total
    const artist = await prisma.artist.create({ data: { name: `LimitArtist_${Date.now()}` } })
    const album = await prisma.album.create({
      data: { title: `LimitAlbum_${Date.now()}`, artist_id: artist.id },
    })
    const secondTrack = await prisma.track.create({
      data: {
        title: `LimitTrack_${Date.now()}`,
        artist_id: artist.id,
        album_id: album.id,
        duration_ms: 120000,
        track_number: 1,
        audio_url: 'https://example.com/limit-test.mp3',
      },
    })

    await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${secondTrack.id}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs?limit=1',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: unknown[]
      meta: { total: number; nextCursor: string | null }
    }>()
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(2)
    expect(body.meta.nextCursor).not.toBeNull()

    // Clean up second track fixture
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/liked-songs/${secondTrack.id}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    await prisma.track.delete({ where: { id: secondTrack.id } })
    await prisma.album.delete({ where: { id: album.id } })
    await prisma.artist.delete({ where: { id: artist.id } })
  })

  it('400: returns VALIDATION_ERROR for an invalid limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs?limit=abc',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

// ── POST /api/v1/library/liked-songs/:trackId ─────────────────────────────────

describe('POST /api/v1/library/liked-songs/:trackId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
    })

    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID track ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/library/liked-songs/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for a valid UUID that has no matching track', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000001'

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${fakeId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(404)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('201: likes a track and returns { liked: true }', async () => {
    // Unlike first to start fresh
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ data: { liked: boolean } }>()
    expect(body.data.liked).toBe(true)
  })

  it('201: liking an already-liked track is idempotent (no error)', async () => {
    // Track is already liked from previous test
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(201)
  })
})

// ── DELETE /api/v1/library/liked-songs/:trackId ───────────────────────────────

describe('DELETE /api/v1/library/liked-songs/:trackId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
    })

    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for a non-UUID track ID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/library/liked-songs/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('204: unlikes a liked track', async () => {
    // Ensure track is liked
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
  })

  it('204: unliking a track that was never liked is a no-op (idempotent)', async () => {
    // Track was just unliked in previous test
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/liked-songs/${seedTrackId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(204)
  })

  it('204: GET confirms track is removed after unlike', async () => {
    // Track is currently not liked — verify GET returns empty
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/liked-songs',
      headers: { cookie: `access_token=${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; meta: { total: number } }>()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })
})
