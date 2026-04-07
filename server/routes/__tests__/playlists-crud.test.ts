/**
 * Integration tests for playlist CRUD endpoints:
 *   GET    /api/v1/playlists
 *   POST   /api/v1/playlists
 *   PATCH  /api/v1/playlists/:id
 *   DELETE /api/v1/playlists/:id
 *   POST   /api/v1/playlists/:id/tracks
 *   DELETE /api/v1/playlists/:id/tracks/:trackId
 *   PATCH  /api/v1/playlists/:id/tracks/reorder
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const OWNER_EMAIL = `playlist_owner_${Date.now()}${TEST_DOMAIN}`
const OTHER_EMAIL = `playlist_other_${Date.now()}${TEST_DOMAIN}`
const PASSWORD = 'PlaylistTest1'

function getCookieValue(res: { headers: Record<string, unknown> }, name: string) {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith(`${name}=`))
  return found?.split(';')[0]?.replace(`${name}=`, '')
}

async function registerAndGetToken(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password: PASSWORD, displayName: email.split('@')[0] },
    headers: { 'content-type': 'application/json' },
  })
  const token = getCookieValue(res, 'access_token')
  if (!token) throw new Error(`No access_token after register for ${email}`)
  return token
}

let app: FastifyInstance
let ownerToken: string
let otherToken: string
let seedArtistId: string
let seedAlbumId: string
let seedTrackId1: string
let seedTrackId2: string
let seedTrackId3: string

beforeAll(async () => {
  app = await buildApp()
  ownerToken = await registerAndGetToken(app, OWNER_EMAIL)
  otherToken = await registerAndGetToken(app, OTHER_EMAIL)

  const artist = await prisma.artist.create({ data: { name: `PLArtist_${Date.now()}` } })
  seedArtistId = artist.id
  const album = await prisma.album.create({
    data: { title: `PLAlbum_${Date.now()}`, artist_id: artist.id },
  })
  seedAlbumId = album.id

  const [t1, t2, t3] = await Promise.all([
    prisma.track.create({
      data: {
        title: `PLTrack1_${Date.now()}`,
        artist_id: artist.id,
        album_id: album.id,
        duration_ms: 180000,
        track_number: 1,
        audio_url: 'https://example.com/t1.mp3',
      },
    }),
    prisma.track.create({
      data: {
        title: `PLTrack2_${Date.now()}`,
        artist_id: artist.id,
        album_id: album.id,
        duration_ms: 200000,
        track_number: 2,
        audio_url: 'https://example.com/t2.mp3',
      },
    }),
    prisma.track.create({
      data: {
        title: `PLTrack3_${Date.now()}`,
        artist_id: artist.id,
        album_id: album.id,
        duration_ms: 220000,
        track_number: 3,
        audio_url: 'https://example.com/t3.mp3',
      },
    }),
  ])
  seedTrackId1 = t1.id
  seedTrackId2 = t2.id
  seedTrackId3 = t3.id
})

afterAll(async () => {
  for (const email of [OWNER_EMAIL, OTHER_EMAIL]) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (user) {
      await prisma.playlist.deleteMany({ where: { user_id: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  }
  await prisma.track.deleteMany({ where: { album_id: seedAlbumId } })
  await prisma.album.delete({ where: { id: seedAlbumId } })
  await prisma.artist.delete({ where: { id: seedArtistId } })
  await app.close()
})

// ── GET /api/v1/playlists ─────────────────────────────────────────────────────

describe('GET /api/v1/playlists', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/playlists' })
    expect(res.statusCode).toBe(401)
  })

  it('200: returns empty array when user has no playlists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/playlists',
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ data: unknown[] }>().data).toEqual([])
  })
})

// ── POST /api/v1/playlists ────────────────────────────────────────────────────

describe('POST /api/v1/playlists', () => {
  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'My Playlist' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR when name is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: {},
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR')
  })

  it('400: returns VALIDATION_ERROR when name is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: '' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('201: creates a playlist and returns playlist data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'My Test Playlist', description: 'A test playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<{
      data: {
        id: string
        name: string
        description: string | null
        is_public: boolean
        total_tracks: number
      }
    }>()
    expect(body.data.name).toBe('My Test Playlist')
    expect(body.data.description).toBe('A test playlist')
    expect(body.data.is_public).toBe(true)
    expect(body.data.total_tracks).toBe(0)
    expect(typeof body.data.id).toBe('string')
  })

  it('200: GET returns the newly created playlist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/playlists',
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })
})

// ── PATCH /api/v1/playlists/:id ───────────────────────────────────────────────

describe('PATCH /api/v1/playlists/:id', () => {
  let playlistId: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'Patch Test Playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    playlistId = res.json<{ data: { id: string } }>().data.id
  })

  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}`,
      payload: { name: 'New Name' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for invalid playlist ID', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/playlists/not-a-uuid',
      payload: { name: 'New Name' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('403: returns FORBIDDEN when non-owner tries to update', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}`,
      payload: { name: 'Hijacked' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${otherToken}` },
    })
    expect(res.statusCode).toBe(403)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('FORBIDDEN')
  })

  it('200: updates name and description', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}`,
      payload: { name: 'Updated Name', description: 'Updated description' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { name: string; description: string | null } }>()
    expect(body.data.name).toBe('Updated Name')
    expect(body.data.description).toBe('Updated description')
  })

  it('200: updates is_public flag', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}`,
      payload: { is_public: false },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ data: { is_public: boolean } }>().data.is_public).toBe(false)
  })
})

// ── DELETE /api/v1/playlists/:id ──────────────────────────────────────────────

describe('DELETE /api/v1/playlists/:id', () => {
  let playlistId: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'Delete Test Playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    playlistId = res.json<{ data: { id: string } }>().data.id
  })

  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/v1/playlists/${playlistId}` })
    expect(res.statusCode).toBe(401)
  })

  it('403: returns FORBIDDEN when non-owner tries to delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}`,
      headers: { cookie: `access_token=${otherToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('204: deletes the playlist', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}`,
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
  })

  it('404: GET returns NOT_FOUND after deletion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/playlists/${playlistId}`,
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ── Track Management ──────────────────────────────────────────────────────────

describe('POST /api/v1/playlists/:id/tracks — add track', () => {
  let playlistId: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'Track Mgmt Playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    playlistId = res.json<{ data: { id: string } }>().data.id
  })

  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId1 },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for invalid trackId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: 'not-a-uuid' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('403: returns FORBIDDEN when non-owner tries to add track', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${otherToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('404: returns NOT_FOUND for valid UUID track that does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: '00000000-0000-4000-8000-000000000099' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('201: adds track1 at position 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { position: number } }>().data.position).toBe(1)
  })

  it('201: adds track2 at position 2 (appended)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId2 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { position: number } }>().data.position).toBe(2)
  })

  it('201: adding a track already in the playlist is idempotent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { position: number } }>().data.position).toBe(1)
  })

  it('201: inserts track3 at position 1, shifting existing tracks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/tracks`,
      payload: { trackId: seedTrackId3, position: 1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json<{ data: { position: number } }>().data.position).toBe(1)

    // Verify positions: track3=1, track1=2, track2=3
    const rows = await prisma.playlistTrack.findMany({
      where: { playlist_id: playlistId },
      orderBy: { position: 'asc' },
    })
    expect(rows[0]?.track_id).toBe(seedTrackId3)
    expect(rows[0]?.position).toBe(1)
    expect(rows[1]?.track_id).toBe(seedTrackId1)
    expect(rows[1]?.position).toBe(2)
    expect(rows[2]?.track_id).toBe(seedTrackId2)
    expect(rows[2]?.position).toBe(3)
  })
})

describe('DELETE /api/v1/playlists/:id/tracks/:trackId — remove track', () => {
  let playlistId: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'Remove Track Playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    playlistId = res.json<{ data: { id: string } }>().data.id

    // Add track1 and track2
    for (const tid of [seedTrackId1, seedTrackId2]) {
      await app.inject({
        method: 'POST',
        url: `/api/v1/playlists/${playlistId}/tracks`,
        payload: { trackId: tid },
        headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
      })
    }
  })

  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}/tracks/${seedTrackId1}`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('403: returns FORBIDDEN when non-owner tries to remove', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}/tracks/${seedTrackId1}`,
      headers: { cookie: `access_token=${otherToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('204: removes track1 and compacts positions', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}/tracks/${seedTrackId1}`,
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(204)

    // track2 should now be at position 1
    const rows = await prisma.playlistTrack.findMany({ where: { playlist_id: playlistId } })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.track_id).toBe(seedTrackId2)
    expect(rows[0]?.position).toBe(1)
  })

  it('204: removing a track not in the playlist is a no-op', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/playlists/${playlistId}/tracks/${seedTrackId1}`,
      headers: { cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(204)
  })
})

describe('PATCH /api/v1/playlists/:id/tracks/reorder — reorder tracks', () => {
  let playlistId: string

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      payload: { name: 'Reorder Playlist' },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    playlistId = res.json<{ data: { id: string } }>().data.id

    // Add tracks in order: track1(pos1), track2(pos2), track3(pos3)
    for (const tid of [seedTrackId1, seedTrackId2, seedTrackId3]) {
      await app.inject({
        method: 'POST',
        url: `/api/v1/playlists/${playlistId}/tracks`,
        payload: { trackId: tid },
        headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
      })
    }
  })

  it('401: returns UNAUTHORIZED without authentication', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: seedTrackId1, newPosition: 3 },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('400: returns VALIDATION_ERROR for missing body fields', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: seedTrackId1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('403: returns FORBIDDEN for non-owner', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: seedTrackId1, newPosition: 3 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${otherToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('404: returns NOT_FOUND when track is not in playlist', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: '00000000-0000-4000-8000-000000000088', newPosition: 1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('204: moves track1 from position 1 to position 3', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: seedTrackId1, newPosition: 3 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(204)

    // Expected: track2=1, track3=2, track1=3
    const rows = await prisma.playlistTrack.findMany({
      where: { playlist_id: playlistId },
      orderBy: { position: 'asc' },
    })
    expect(rows[0]?.track_id).toBe(seedTrackId2)
    expect(rows[1]?.track_id).toBe(seedTrackId3)
    expect(rows[2]?.track_id).toBe(seedTrackId1)
  })

  it('204: moves track1 back from position 3 to position 1', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/playlists/${playlistId}/tracks/reorder`,
      payload: { trackId: seedTrackId1, newPosition: 1 },
      headers: { 'content-type': 'application/json', cookie: `access_token=${ownerToken}` },
    })
    expect(res.statusCode).toBe(204)

    // Expected: track1=1, track2=2, track3=3
    const rows = await prisma.playlistTrack.findMany({
      where: { playlist_id: playlistId },
      orderBy: { position: 'asc' },
    })
    expect(rows[0]?.track_id).toBe(seedTrackId1)
    expect(rows[1]?.track_id).toBe(seedTrackId2)
    expect(rows[2]?.track_id).toBe(seedTrackId3)
  })
})
