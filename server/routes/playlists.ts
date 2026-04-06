import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getPlaylistById } from '../services/content'
import { requireUser } from '../plugins/auth'

const playlistsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/playlists/:id — playlist detail with paginated track list
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
}

export default playlistsRoutes
