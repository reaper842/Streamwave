import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getArtistById, getArtistAlbums, getArtistTopTracks } from '../services/content'
import { requireUser } from '../plugins/auth'

const artistsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/artists/:id — artist metadata
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid artist ID' } })
    }

    const artist = await getArtistById(id)
    if (!artist) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Artist not found' } })
    }

    return reply.send({ data: artist })
  })

  // GET /api/v1/artists/:id/albums — paginated albums by artist
  fastify.get<{
    Params: { id: string }
    Querystring: { cursor?: string; limit?: string }
  }>('/:id/albums', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid artist ID' } })
    }

    const limit = Math.min(parseInt(request.query.limit ?? '20', 10) || 20, 50)
    const { albums, nextCursor } = await getArtistAlbums(id, request.query.cursor, limit)

    return reply.send({ data: albums, meta: { cursor: nextCursor ?? undefined } })
  })

  // GET /api/v1/artists/:id/top-tracks — top tracks by artist
  fastify.get<{
    Params: { id: string }
    Querystring: { limit?: string }
  }>('/:id/top-tracks', async (request, reply) => {
    requireUser(request)

    const { id } = request.params

    if (!z.uuid().safeParse(id).success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid artist ID' } })
    }

    const limit = Math.min(parseInt(request.query.limit ?? '10', 10) || 10, 20)
    const tracks = await getArtistTopTracks(id, limit)

    return reply.send({ data: tracks })
  })
}

export default artistsRoutes
