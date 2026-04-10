import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { search, type SearchType } from '../services/search'

const VALID_TYPES = ['tracks', 'artists', 'albums', 'playlists'] as const

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z
    .string()
    .optional()
    .transform((val): SearchType[] => {
      if (!val) return ['tracks', 'artists', 'albums', 'playlists']
      return val
        .split(',')
        .map((t) => t.trim())
        .filter((t): t is SearchType => (VALID_TYPES as readonly string[]).includes(t))
    }),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/search?q=...&type=tracks,artists&limit=20&offset=0
  // Auth is optional — unauthenticated users can search.
  fastify.get('/', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: parsed.error.issues,
        },
      })
    }

    const { q, type: types, limit, offset } = parsed.data

    // Return 400 if all types were filtered out (e.g. ?type=invalid,garbage)
    if (types.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type must contain at least one of: tracks, artists, albums, playlists',
        },
      })
    }

    const results = await search(fastify.meili, fastify.redis, q, types, limit, offset)

    return reply.send({ data: results })
  })
}

export default searchRoutes
