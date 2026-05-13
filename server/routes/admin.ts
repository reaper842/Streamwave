import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { requireUser } from '../plugins/auth'
import {
  assertAdmin,
  getAdminStats,
  adminListTracks,
  adminCreateTrack,
  adminUpdateTrack,
  adminDeleteTrack,
  adminListArtists,
  adminListAlbums,
  adminListPlaylists,
  adminCreatePlaylist,
  adminUpdatePlaylist,
  adminDeletePlaylist,
  adminAddTrackToPlaylist,
  adminRemoveTrackFromPlaylist,
  adminGetPlaylistTracks,
} from '../services/admin'

const safeText = (min: number, max: number) =>
  z
    .string()
    .transform((s) =>
      s
        .trim()
        .replace(/<[^>]*>/g, '')
        .trim(),
    )
    .pipe(z.string().min(min).max(max))

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes require authentication + admin role.
  // Individual handlers call requireUser then assertAdmin.

  // ── Stats ─────────────────────────────────────────────────────────────────

  fastify.get('/stats', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)
    const stats = await getAdminStats()
    return reply.send({ data: stats })
  })

  // ── Artists (read-only list for form dropdowns) ───────────────────────────

  fastify.get('/artists', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)
    const artists = await adminListArtists()
    return reply.send({ data: artists })
  })

  // ── Albums (read-only list for form dropdowns) ────────────────────────────

  fastify.get('/albums', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)
    const artistId = (request.query as Record<string, string | undefined>)['artistId']
    const albums = await adminListAlbums(artistId)
    return reply.send({ data: albums })
  })

  // ── Tracks ────────────────────────────────────────────────────────────────

  fastify.get('/tracks', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)
    const q = request.query as Record<string, string | undefined>
    const page = Math.max(1, parseInt(q['page'] ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(q['limit'] ?? '50', 10)))
    const result = await adminListTracks(page, limit)
    return reply.send({
      data: result.items,
      meta: { page: result.page, limit: result.limit, total: result.total },
    })
  })

  fastify.post('/tracks', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    const body = z
      .object({
        title: safeText(1, 200),
        artistId: z.uuid(),
        albumId: z.uuid(),
        trackNumber: z.number().int().min(1),
        durationMs: z.number().int().min(0),
        audioUrl: z.string().min(1).max(500),
      })
      .safeParse(request.body ?? {})

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.issues,
        },
      })
    }

    const track = await adminCreateTrack(body.data)
    return reply.status(201).send({ data: track })
  })

  fastify.patch<{ Params: { id: string } }>('/tracks/:id', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' } })
    }

    const body = z
      .object({
        title: safeText(1, 200).optional(),
        artistId: z.uuid().optional(),
        albumId: z.uuid().optional(),
        trackNumber: z.number().int().min(1).optional(),
        durationMs: z.number().int().min(0).optional(),
        audioUrl: z.string().min(1).max(500).optional(),
      })
      .safeParse(request.body ?? {})

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.issues,
        },
      })
    }

    const track = await adminUpdateTrack(request.params.id, body.data)
    return reply.send({ data: track })
  })

  fastify.delete<{ Params: { id: string } }>('/tracks/:id', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' } })
    }

    await adminDeleteTrack(request.params.id)
    return reply.status(204).send()
  })

  // ── Playlists ─────────────────────────────────────────────────────────────

  fastify.get('/playlists', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)
    const q = request.query as Record<string, string | undefined>
    const page = Math.max(1, parseInt(q['page'] ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(q['limit'] ?? '50', 10)))
    const result = await adminListPlaylists(page, limit)
    return reply.send({
      data: result.items,
      meta: { page: result.page, limit: result.limit, total: result.total },
    })
  })

  fastify.post('/playlists', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    const body = z
      .object({
        name: safeText(1, 100),
        description: safeText(0, 300).optional(),
        isPublic: z.boolean().optional(),
      })
      .safeParse(request.body ?? {})

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.issues,
        },
      })
    }

    const playlist = await adminCreatePlaylist({ userId: user.id, ...body.data })
    return reply.status(201).send({ data: playlist })
  })

  fastify.patch<{ Params: { id: string } }>('/playlists/:id', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const body = z
      .object({
        name: safeText(1, 100).optional(),
        description: safeText(0, 300).optional(),
        isPublic: z.boolean().optional(),
        coverUrl: z.string().url().max(500).optional(),
      })
      .safeParse(request.body ?? {})

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.issues,
        },
      })
    }

    const playlist = await adminUpdatePlaylist(request.params.id, body.data)
    return reply.send({ data: playlist })
  })

  fastify.delete<{ Params: { id: string } }>('/playlists/:id', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    await adminDeletePlaylist(request.params.id)
    return reply.status(204).send()
  })

  // ── Playlist tracks ───────────────────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>('/playlists/:id/tracks', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const tracks = await adminGetPlaylistTracks(request.params.id)
    return reply.send({ data: tracks })
  })

  fastify.post<{ Params: { id: string } }>('/playlists/:id/tracks', async (request, reply) => {
    const user = requireUser(request)
    await assertAdmin(user.id)

    if (!z.uuid().safeParse(request.params.id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const body = z.object({ trackId: z.uuid() }).safeParse(request.body ?? {})
    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'trackId is required',
          details: body.error.issues,
        },
      })
    }

    await adminAddTrackToPlaylist(request.params.id, body.data.trackId)
    return reply.status(201).send({ data: { ok: true } })
  })

  fastify.delete<{ Params: { id: string; trackId: string } }>(
    '/playlists/:id/tracks/:trackId',
    async (request, reply) => {
      const user = requireUser(request)
      await assertAdmin(user.id)

      if (
        !z.uuid().safeParse(request.params.id).success ||
        !z.uuid().safeParse(request.params.trackId).success
      ) {
        return reply
          .status(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } })
      }

      await adminRemoveTrackFromPlaylist(request.params.id, request.params.trackId)
      return reply.status(204).send()
    },
  )
}

export default adminRoutes
