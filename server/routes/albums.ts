import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getAlbumById } from '../services/content'
import { requireUser } from '../plugins/auth'

const albumsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/albums/:id — album detail with full track list
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid album ID' } })
    }

    const album = await getAlbumById(id)
    if (!album) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Album not found' } })
    }

    return reply.send({ data: album })
  })
}

export default albumsRoutes
