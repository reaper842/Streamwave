/**
 * Integration tests for the followed-artists library endpoints:
 *   GET    /api/v1/library/followed-artists
 *   POST   /api/v1/library/followed-artists/:artistId
 *   DELETE /api/v1/library/followed-artists/:artistId
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `library_artists_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'ArtistTest1'
const DEMO_DISPLAY = 'Artist Test User'

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

beforeAll(async () => {
  app = await buildApp()
  accessToken = await registerAndGetToken(app)

  const artist = await prisma.artist.create({
    data: { name: `FollowArtist_${Date.now()}`, genre: 'Test' },
  })
  seedArtistId = artist.id
})

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } })
  if (user) {
    await prisma.followedArtist.deleteMany({ where: { user_id: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  await prisma.artist.delete({ where: { id: seedArtistId } })
  await app.close()
})

// ── GET /api/v1/library/followed-artists ─────────────────────────────────────

describe('GET /api/v1/library/followed-artists', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/library/followed-artists' })
    expect(res.statusCode).toBe(401)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('UNAUTHORIZED')
  })

  it('200: returns empty array when user follows no artists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/followed-artists',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ data: unknown[] }>().data).toEqual([])
  })

  it('200: returns followed artist with correct shape after following', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/followed-artists',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{
      data: Array<{
        id: string
        name: string
        bio: string | null
        image_url: string | null
        genre: string | null
        followed_at: string
      }>
    }>()
    expect(body.data).toHaveLength(1)
    const item = body.data[0]!
    expect(item.id).toBe(seedArtistId)
    expect(typeof item.name).toBe('string')
    expect(new Date(item.followed_at).toISOString()).toBe(item.followed_at)
  })
})

// ── POST /api/v1/library/followed-artists/:artistId ──────────────────────────

describe('POST /api/v1/library/followed-artists/:artistId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for non-UUID artist ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/library/followed-artists/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('404: returns NOT_FOUND for valid UUID with no matching artist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/library/followed-artists/00000000-0000-4000-8000-000000000003',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND')
  })

  it('201: follows an artist and returns { following: true }', async () => {
    // Unfollow first to start fresh
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { following: boolean } }>().data.following).toBe(true)
  })

  it('201: following an already-followed artist is idempotent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(201)
  })
})

// ── DELETE /api/v1/library/followed-artists/:artistId ────────────────────────

describe('DELETE /api/v1/library/followed-artists/:artistId', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for non-UUID artist ID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/library/followed-artists/not-a-uuid',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('204: unfollows an artist', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
  })

  it('204: unfollowing an artist never followed is a no-op', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/library/followed-artists/${seedArtistId}`,
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('200: GET confirms artist is removed after unfollow', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/library/followed-artists',
      headers: { cookie: `access_token=${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ data: unknown[] }>().data).toHaveLength(0)
  })
})
