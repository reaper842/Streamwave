import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import {
  getLikedSongs,
  likeSong,
  unlikeSong,
  getSavedAlbums,
  saveAlbum,
  unsaveAlbum,
  getFollowedArtists,
  followArtist,
  unfollowArtist,
} from '../services/library'
import { requireUser } from '../plugins/auth'

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const libraryRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Liked Songs ─────────────────────────────────────────────────────────────

  // GET /api/v1/library/liked-songs?cursor=<iso>&limit=<n>
  fastify.get('/liked-songs', async (request, reply) => {
    const user = requireUser(request)

    const parsed = paginationSchema.safeParse(request.query)
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

  // ── Saved Albums ─────────────────────────────────────────────────────────────

  // GET /api/v1/library/saved-albums?cursor=<iso>&limit=<n>
  fastify.get('/saved-albums', async (request, reply) => {
    const user = requireUser(request)

    const parsed = paginationSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
      })
    }

    const result = await getSavedAlbums(user.id, parsed.data.cursor, parsed.data.limit)

    return reply.send({
      data: result.items,
      meta: { nextCursor: result.nextCursor, total: result.total },
    })
  })

  // POST /api/v1/library/saved-albums/:albumId — save an album
  fastify.post<{ Params: { albumId: string } }>(
    '/saved-albums/:albumId',
    async (request, reply) => {
      const user = requireUser(request)

      const { albumId } = request.params

      if (!z.uuid().safeParse(albumId).success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid album ID' },
        })
      }

      await saveAlbum(user.id, albumId)

      return reply.status(201).send({ data: { saved: true } })
    },
  )

  // DELETE /api/v1/library/saved-albums/:albumId — unsave an album
  fastify.delete<{ Params: { albumId: string } }>(
    '/saved-albums/:albumId',
    async (request, reply) => {
      const user = requireUser(request)

      const { albumId } = request.params

      if (!z.uuid().safeParse(albumId).success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid album ID' },
        })
      }

      await unsaveAlbum(user.id, albumId)

      return reply.status(204).send()
    },
  )

  // ── Followed Artists ──────────────────────────────────────────────────────────

  // GET /api/v1/library/followed-artists
  fastify.get('/followed-artists', async (request, reply) => {
    const user = requireUser(request)
    const artists = await getFollowedArtists(user.id)
    return reply.send({ data: artists })
  })

  // POST /api/v1/library/followed-artists/:artistId — follow an artist
  fastify.post<{ Params: { artistId: string } }>(
    '/followed-artists/:artistId',
    async (request, reply) => {
      const user = requireUser(request)

      const { artistId } = request.params

      if (!z.uuid().safeParse(artistId).success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid artist ID' },
        })
      }

      await followArtist(user.id, artistId)

      return reply.status(201).send({ data: { following: true } })
    },
  )

  // DELETE /api/v1/library/followed-artists/:artistId — unfollow an artist
  fastify.delete<{ Params: { artistId: string } }>(
    '/followed-artists/:artistId',
    async (request, reply) => {
      const user = requireUser(request)

      const { artistId } = request.params

      if (!z.uuid().safeParse(artistId).success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid artist ID' },
        })
      }

      await unfollowArtist(user.id, artistId)

      return reply.status(204).send()
    },
  )
}

export default libraryRoutes
