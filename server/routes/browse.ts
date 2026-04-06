import type { FastifyPluginAsync } from 'fastify'
import { getFeatured, getGenres } from '../services/content'
import { requireUser } from '../plugins/auth'

const browseRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/browse/featured — curated featured playlists and albums
  fastify.get('/featured', async (request, reply) => {
    requireUser(request)
    const featured = await getFeatured()
    return reply.send({ data: featured })
  })

  // GET /api/v1/browse/genres — genre list with colors
  fastify.get('/genres', async (request, reply) => {
    requireUser(request)
    return reply.send({ data: getGenres() })
  })
}

export default browseRoutes
