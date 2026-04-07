/**
 * Test app factory.
 *
 * Creates a Fastify instance with the same plugins and routes as the production
 * server, with two intentional differences for test isolation:
 *
 *  1. No @fastify/rate-limit — the plugin uses a shared Redis key for 127.0.0.1.
 *     When test files run in parallel workers they accumulate the same counters
 *     and can trip the per-route limit mid-suite.  The custom auth-failure counter
 *     (auth_fail:<ip> in Redis, tested in login.test.ts) is unaffected.
 *
 *  2. No Meilisearch — auth routes don't use it.
 *
 * Usage:
 *   const app = await buildApp()
 *   const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {...} })
 *   await app.close()
 */
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import redisPlugin from '../plugins/redis'
import authPlugin from '../plugins/auth'
import authRoutes from '../routes/auth'
import libraryRoutes from '../routes/library'

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
