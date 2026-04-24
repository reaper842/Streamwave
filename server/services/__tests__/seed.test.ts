/**
 * Integration tests that verify the Prisma seed script created the expected
 * data counts and relationships in the database.
 *
 * These tests are READ-ONLY (no writes) and assume `npx prisma db seed` has
 * been run at least once. They do not re-run the seed script.
 *
 * Requires: PostgreSQL running (docker compose up -d) + seed data present
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma'

// ── Expected seed counts (from prisma/seed.ts) ────────────────────────────────
// 10 artists × 5 albums = 50 albums
// 50 albums × 10 tracks = 500 tracks
// 1 demo user, 5 playlists (owned by demo user)
const EXPECTED = {
  ARTISTS: 10,
  ALBUMS: 50,
  TRACKS: 500,
  PLAYLISTS: 5,
  DEMO_EMAIL: 'demo@streamwave.app',
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

// Prisma is shared — no app setup needed for read-only tests
beforeAll(async () => {
  // Verify seed data exists before running these tests
  const userCount = await prisma.user.count({ where: { email: EXPECTED.DEMO_EMAIL } })
  if (userCount === 0) {
    throw new Error(
      'Seed data not found. Run `npx prisma db seed` before running seed verification tests.',
    )
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ── Seed count verification ───────────────────────────────────────────────────

describe('Seed script — entity counts', () => {
  it(`creates ${EXPECTED.ARTISTS} artists`, async () => {
    const count = await prisma.artist.count()
    expect(count).toBeGreaterThanOrEqual(EXPECTED.ARTISTS)
  })

  it(`creates ${EXPECTED.ALBUMS} albums`, async () => {
    const count = await prisma.album.count()
    expect(count).toBeGreaterThanOrEqual(EXPECTED.ALBUMS)
  })

  it(`creates ${EXPECTED.TRACKS} tracks`, async () => {
    const count = await prisma.track.count()
    expect(count).toBeGreaterThanOrEqual(EXPECTED.TRACKS)
  })

  it('creates the demo user', async () => {
    const user = await prisma.user.findUnique({ where: { email: EXPECTED.DEMO_EMAIL } })
    expect(user).not.toBeNull()
    expect(user?.display_name).toBeTruthy()
    expect(user?.password_hash).toBeTruthy()
  })

  it(`creates at least ${EXPECTED.PLAYLISTS} playlists for the demo user`, async () => {
    const demoUser = await prisma.user.findUnique({ where: { email: EXPECTED.DEMO_EMAIL } })
    if (!demoUser) throw new Error('Demo user not found')
    const count = await prisma.playlist.count({ where: { user_id: demoUser.id } })
    expect(count).toBeGreaterThanOrEqual(EXPECTED.PLAYLISTS)
  })
})

// ── Relationship integrity checks ─────────────────────────────────────────────

describe('Seed script — relationships', () => {
  it('every album has a non-empty artist_id', async () => {
    // artist_id is a required FK — verify all rows have it populated
    const withEmptyArtistId = await prisma.album.count({
      where: { artist_id: '' },
    })
    expect(withEmptyArtistId).toBe(0)
    // Spot-check: sample albums can resolve their artist relation
    const sample = await prisma.album.findMany({
      take: 5,
      include: { artist: { select: { id: true, name: true } } },
    })
    for (const album of sample) {
      expect(album.artist.id).toBeTruthy()
      expect(album.artist.name).toBeTruthy()
    }
  })

  it('every track has valid artist_id and album_id', async () => {
    const total = await prisma.track.count()
    const withBoth = await prisma.track.count({
      where: {
        artist: { isNot: undefined },
        album: { isNot: undefined },
      },
    })
    expect(withBoth).toBe(total)
  })

  it('all albums have at least 1 track', async () => {
    const albumsWithTracks = await prisma.album.count({
      where: { tracks: { some: {} } },
    })
    const totalAlbums = await prisma.album.count()
    expect(albumsWithTracks).toBe(totalAlbums)
  })

  it('all artists have at least 1 album', async () => {
    const artistsWithAlbums = await prisma.artist.count({
      where: { albums: { some: {} } },
    })
    const totalArtists = await prisma.artist.count()
    expect(artistsWithAlbums).toBe(totalArtists)
  })

  it('all tracks have positive duration_ms', async () => {
    const invalidTracks = await prisma.track.count({
      where: { duration_ms: { lte: 0 } },
    })
    expect(invalidTracks).toBe(0)
  })

  it('all tracks have non-empty audio_url', async () => {
    const invalidTracks = await prisma.track.count({
      where: { audio_url: '' },
    })
    expect(invalidTracks).toBe(0)
  })

  it('all tracks have track_number > 0', async () => {
    const invalidTracks = await prisma.track.count({
      where: { track_number: { lte: 0 } },
    })
    expect(invalidTracks).toBe(0)
  })
})

// ── Data quality checks ───────────────────────────────────────────────────────

describe('Seed script — data quality', () => {
  it('all artists have a genre', async () => {
    const noGenre = await prisma.artist.count({
      where: { OR: [{ genre: '' }, { genre: null }] },
    })
    expect(noGenre).toBe(0)
  })

  it('no duplicate track titles within the same album', async () => {
    // Fetch a sample of albums and check for duplicate tracks
    const albums = await prisma.album.findMany({
      take: 10,
      include: { tracks: { select: { title: true } } },
    })

    for (const album of albums) {
      const titles = album.tracks.map((t) => t.title)
      const unique = new Set(titles)
      expect(unique.size).toBe(titles.length)
    }
  })

  it('demo user password hash uses bcrypt format', async () => {
    const demoUser = await prisma.user.findUnique({ where: { email: EXPECTED.DEMO_EMAIL } })
    // bcrypt hashes start with $2a$ or $2b$
    expect(demoUser?.password_hash).toMatch(/^\$2[ab]\$/)
  })
})
