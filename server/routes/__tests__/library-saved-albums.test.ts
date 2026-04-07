/**
 * Integration tests for the saved-albums library endpoints:
 *   GET    /api/v1/library/saved-albums
 *   POST   /api/v1/library/saved-albums/:albumId
 *   DELETE /api/v1/library/saved-albums/:albumId
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `library_albums_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'AlbumTest1'
const DEMO_DISPLAY = 'Album Test User'

function getCookieValue(res: { headers: Record<string, unknown> }, name: string) {
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

let app: FastifyInstance
let accessToken: string
let seedArtistId: string
let seedAlbumId: string

beforeAll(async () => {
  app = await buildApp()
  accessToken = await registerAndGetToken(app)

  const artist = await prisma.artist.create({
    data: { name: `AlbumArtist_${Date.now()}`, genre: 'Test' },
  })
  seedArtistId = artist.id

  const album = await prisma.album.create({
    data: { title: `TestAlbum_${Date.now()}`, artist_id: artist.id },
  })
  seedAlbumId = album.id
})

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } })
  if (user) {
    await prisma.savedAlbum.deleteMany({ where: { user_id: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  await prisma.album.deleteMany({ where: { artist_id: seedArtistId } })
  await prisma.artist.delete({ where: { id: seedArtistId } })
  await app.close()
})

// ── GET /api/v1/library/saved-albums ─────────────────────────────────────────

describe('GET /api/v1/library/saved-albums', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/library/saved-albums' })
    expect(res.statusCode).toBe(401)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('UNAUTHORIZED')
  })

  it('200: returns empty list when user has no saved albums', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/saved-albums',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; meta: { total: number; nextCursor: null } }>()
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('200: returns saved album with correct shape after saving', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/saved-albums',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{
        id: string
        title: string
        artist: { id: string; name: string }
        saved_at: string
      }>
      meta: { total: number }
    }>()
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
    const item = body.data[0]!
    expect(item.id).toBe(seedAlbumId)
    expect(item.artist.id).toBe(seedArtistId)
    expect(new Date(item.saved_at).toISOString()).toBe(item.saved_at)
  })

  it('400: returns VALIDATION_ERROR for invalid limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/saved-albums?limit=bad',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })
})

// ── POST /api/v1/library/saved-albums/:albumId ────────────────────────────────

describe('POST /api/v1/library/saved-albums/:albumId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for non-UUID album ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/library/saved-albums/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for valid UUID with no matching album', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/library/saved-albums/00000000-0000-4000-8000-000000000002',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND')
  })

  it('201: saves an album and returns { saved: true }', async () => {
    // Unsave first to start fresh
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { saved: boolean } }>().data.saved).toBe(true)
  })

  it('201: saving an already-saved album is idempotent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(201)
  })
})

// ── DELETE /api/v1/library/saved-albums/:albumId ──────────────────────────────

describe('DELETE /api/v1/library/saved-albums/:albumId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for non-UUID album ID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/library/saved-albums/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('204: unsaves a saved album', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
  })

  it('204: unsaving an album never saved is a no-op', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/saved-albums/${seedAlbumId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('204: GET confirms album is removed after unsave', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/saved-albums',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; meta: { total: number } }>()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })
})
