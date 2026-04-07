import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getLikedSongs, likeSong, unlikeSong } from '../services/library'
import { requireUser } from '../plugins/auth'

const libraryRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Liked Songs ─────────────────────────────────────────────────────────────

  // GET /api/v1/library/liked-songs?cursor=<iso>&limit=<n>
  fastify.get('/liked-songs', async (request, reply) => {
    const user = requireUser(request)

    const querySchema = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
      })
    }

    const result = await getLikedSongs(user.id, parsed.data.cursor, parsed.data.limit)

    return reply.send({
      data: result.items,
      meta: { nextCursor: result.nextCursor, total: result.total },
    })
  })

  // POST /api/v1/library/liked-songs/:trackId — add track to liked songs
  fastify.post<{ Params: { trackId: string } }>('/liked-songs/:trackId', async (request, reply) => {
    const user = requireUser(request)

    const { trackId } = request.params

    if (!z.uuid().safeParse(trackId).success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' },
      })
    }

    await likeSong(user.id, trackId)

    return reply.status(201).send({ data: { liked: true } })
  })

  // DELETE /api/v1/library/liked-songs/:trackId — remove track from liked songs
  fastify.delete<{ Params: { trackId: string } }>(
    '/liked-songs/:trackId',
    async (request, reply) => {
      const user = requireUser(request)

      const { trackId } = request.params

      if (!z.uuid().safeParse(trackId).success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' },
        })
      }

      await unlikeSong(user.id, trackId)

      return reply.status(204).send()
    },
  )
}

export default libraryRoutes
