import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getTrackById, getTrackStreamUrl } from '../services/tracks'
import { requireUser } from '../plugins/auth'

// ── Route handlers ────────────────────────────────────────────────────────────

const tracksRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/tracks/:id — return track metadata
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    const uuidResult = z.uuid().safeParse(id)
    if (!uuidResult.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' } })
    }

    const track = await getTrackById(id)
    if (!track) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Track not found' } })
    }

    return reply.send({ data: track })
  })

  // GET /api/v1/tracks/:id/stream — return signed URL for audio
  fastify.get<{ Params: { id: string } }>('/:id/stream', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    const uuidResult = z.uuid().safeParse(id)
    if (!uuidResult.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid track ID' } })
    }

    const result = await getTrackStreamUrl(id)
    if (!result) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Track not found' } })
    }

    return reply.send({ data: result })
  })
}

export default tracksRoutes
