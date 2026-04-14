import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getPlaylistById } from '../services/content'
import {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  getUserPlaylists,
} from '../services/playlists'
import { requireUser } from '../plugins/auth'

// Strip HTML tags from user-supplied text (defense-in-depth against stored XSS).
// Also trims leading/trailing whitespace before and after stripping.
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

const playlistsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Read (public/authenticated) ──────────────────────────────────────────────

  // GET /api/v1/playlists/:id — playlist detail with track list
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const playlist = await getPlaylistById(id)
    if (!playlist) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Playlist not found' } })
    }

    return reply.send({ data: playlist })
  })

  // ── Create ────────────────────────────────────────────────────────────────────

  // POST /api/v1/playlists — create a new playlist
  fastify.post('/', async (request, reply) => {
    const user = requireUser(request)

    const bodySchema = z.object({
      name: safeText(1, 100),
      description: safeText(0, 300).optional(),
    })

    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    const playlist = await createPlaylist(user.id, parsed.data.name, parsed.data.description)

    return reply.status(201).send({ data: playlist })
  })

  // ── Update ────────────────────────────────────────────────────────────────────

  // PATCH /api/v1/playlists/:id — update playlist metadata
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const bodySchema = z.object({
      name: safeText(1, 100).optional(),
      description: safeText(0, 300).nullable().optional(),
      cover_url: z.url().nullable().optional(),
      is_public: z.boolean().optional(),
    })

    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    const playlist = await updatePlaylist(id, user.id, parsed.data)

    return reply.send({ data: playlist })
  })

  // ── Delete ────────────────────────────────────────────────────────────────────

  // DELETE /api/v1/playlists/:id — delete a playlist
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    await deletePlaylist(id, user.id)

    return reply.status(204).send()
  })

  // ── Track Management ──────────────────────────────────────────────────────────

  // POST /api/v1/playlists/:id/tracks — add a track to a playlist
  fastify.post<{ Params: { id: string } }>('/:id/tracks', async (request, reply) => {
    const user = requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const bodySchema = z.object({
      trackId: z.uuid(),
      position: z.number().int().min(1).optional(),
    })

    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    const result = await addTrackToPlaylist(id, user.id, parsed.data.trackId, parsed.data.position)

    return reply.status(201).send({ data: result })
  })

  // DELETE /api/v1/playlists/:id/tracks/:trackId — remove a track from a playlist
  fastify.delete<{ Params: { id: string; trackId: string } }>(
    '/:id/tracks/:trackId',
    async (request, reply) => {
      const user = requireUser(request)

      const { id, trackId } = request.params

      if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(trackId).success) {
        return reply
          .status(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } })
      }

      await removeTrackFromPlaylist(id, user.id, trackId)

      return reply.status(204).send()
    },
  )

  // PATCH /api/v1/playlists/:id/tracks/reorder — change a track's position
  fastify.patch<{ Params: { id: string } }>('/:id/tracks/reorder', async (request, reply) => {
    const user = requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid playlist ID' } })
    }

    const bodySchema = z.object({
      trackId: z.uuid(),
      newPosition: z.number().int().min(1),
    })

    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    await reorderPlaylistTracks(id, user.id, parsed.data.trackId, parsed.data.newPosition)

    return reply.status(204).send()
  })

  // ── User's playlists ─────────────────────────────────────────────────────────

  // GET /api/v1/playlists — return all playlists owned by the current user
  fastify.get('/', async (request, reply) => {
    const user = requireUser(request)
    const playlists = await getUserPlaylists(user.id)
    return reply.send({ data: playlists })
  })
}

export default playlistsRoutes
