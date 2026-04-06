import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'

/**
 * Global rate-limit plugin.
 *
 * Default: 100 requests / minute per IP (for general API protection).
 * Auth routes apply a stricter window via per-route config defined in the
 * route handlers themselves (using the `config.rateLimit` option on each route).
 *
 * The auth-failure per-IP counters (5 failed logins / 15 min) are managed
 * manually in `server/services/auth.ts` using Redis, so we get proper
 * failed-attempt semantics (only count failures, not all requests).
 */
const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = fastify.redis

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => {
      // Prefer X-Forwarded-For when behind a reverse proxy
      const forwarded = request.headers['x-forwarded-for']
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0]?.trim() ?? request.ip
      }
      return request.ip
    },
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    }),
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit', dependencies: ['redis'] })
