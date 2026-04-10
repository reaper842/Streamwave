/**
 * Test app factories.
 *
 * `buildApp` — auth, library, playlists. No rate-limit, no Meilisearch.
 *   Rate-limit is excluded because it uses a shared Redis key for 127.0.0.1
 *   and cross-worker accumulation trips per-route limits mid-suite.
 *   Meilisearch is excluded for routes that don't need it.
 *
 * `buildSearchApp` — adds Meilisearch plugin + search routes on top of buildApp.
 *   Used only by search integration tests.
 *
 * Usage:
 *   const app = await buildApp()
 *   const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {...} })
 *   await app.close()
 */
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import redisPlugin from '../plugins/redis'
import meilisearchPlugin from '../plugins/meilisearch'
import authPlugin from '../plugins/auth'
import authRoutes from '../routes/auth'
import libraryRoutes from '../routes/library'
import playlistsRoutes from '../routes/playlists'
import searchRoutes from '../routes/search'

export async function buildApp() {
  const fastify = Fastify({ logger: false })

  await fastify.register(cookie, {
    secret: process.env['NEXTAUTH_SECRET'] ?? 'test-cookie-secret',
  })

  await fastify.register(redisPlugin)
  // rateLimitPlugin deliberately omitted — see file-level comment
  await fastify.register(authPlugin)

  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(libraryRoutes, { prefix: '/api/v1/library' })
  fastify.register(playlistsRoutes, { prefix: '/api/v1/playlists' })

  // Mirror the global error handler from server/index.ts so response shapes match
  fastify.setErrorHandler((err, _request, reply) => {
    const error = err as Error & { statusCode?: number; code?: string }
    const statusCode = error.statusCode ?? 500
    const code = error.code ?? 'INTERNAL_ERROR'

    reply.status(statusCode).send({
      error: {
        code,
        message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
      },
    })
  })

  await fastify.ready()
  return fastify
}

/** buildSearchApp — includes Meilisearch + search routes for search integration tests. */
export async function buildSearchApp() {
  const fastify = Fastify({ logger: false })

  await fastify.register(cookie, {
    secret: process.env['NEXTAUTH_SECRET'] ?? 'test-cookie-secret',
  })

  await fastify.register(redisPlugin)
  await fastify.register(meilisearchPlugin)
  // rateLimitPlugin deliberately omitted — see file-level comment
  await fastify.register(authPlugin)

  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(searchRoutes, { prefix: '/api/v1/search' })

  fastify.setErrorHandler((err, _request, reply) => {
    const error = err as Error & { statusCode?: number; code?: string }
    const statusCode = error.statusCode ?? 500
    const code = error.code ?? 'INTERNAL_ERROR'

    reply.status(statusCode).send({
      error: {
        code,
        message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
      },
    })
  })

  await fastify.ready()
  return fastify
}
