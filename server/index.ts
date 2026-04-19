import './load-env' // Must be first — populates process.env before any other module reads it
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import redisPlugin from './plugins/redis'
import meilisearchPlugin from './plugins/meilisearch'
import rateLimitPlugin from './plugins/rate-limit'
import authPlugin from './plugins/auth'
import authRoutes from './routes/auth'
import tracksRoutes from './routes/tracks'
import albumsRoutes from './routes/albums'
import artistsRoutes from './routes/artists'
import playlistsRoutes from './routes/playlists'
import browseRoutes from './routes/browse'
import libraryRoutes from './routes/library'
import searchRoutes from './routes/search'
import { initializeIndexes } from './services/search-sync'

const PORT = parseInt(process.env['SERVER_PORT'] ?? '3001', 10)
const HOST = process.env['SERVER_HOST'] ?? '0.0.0.0'

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'info',
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // ── Plugins ────────────────────────────────────────────────────────────────

  await fastify.register(cors, {
    origin: process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })

  await fastify.register(cookie, {
    secret: process.env['NEXTAUTH_SECRET'] ?? 'dev-secret-change-in-production',
  })

  // Data-layer plugins (redis and meilisearch must come before rate-limit and auth)
  await fastify.register(redisPlugin)
  await fastify.register(meilisearchPlugin)

  // Initialize Meilisearch indexes (idempotent — safe to run on every start)
  await initializeIndexes(fastify.meili)

  // Cross-cutting concerns
  await fastify.register(rateLimitPlugin)
  await fastify.register(authPlugin)

  // ── Security headers ───────────────────────────────────────────────────────

  // Add security headers to every API response
  fastify.addHook('onSend', (_request, reply, _payload, done) => {
    // Prevent MIME-type sniffing
    reply.header('X-Content-Type-Options', 'nosniff')
    // Don't cache authenticated API responses by default;
    // individual routes can override with a more permissive directive
    reply.header('Cache-Control', 'no-store')
    // Prevent clickjacking from Fastify's own HTML error pages
    reply.header('X-Frame-Options', 'DENY')
    done()
  })

  // ── Health check ───────────────────────────────────────────────────────────

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // ── Routes ─────────────────────────────────────────────────────────────────

  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(tracksRoutes, { prefix: '/api/v1/tracks' })
  fastify.register(albumsRoutes, { prefix: '/api/v1/albums' })
  fastify.register(artistsRoutes, { prefix: '/api/v1/artists' })
  fastify.register(playlistsRoutes, { prefix: '/api/v1/playlists' })
  fastify.register(browseRoutes, { prefix: '/api/v1/browse' })
  fastify.register(libraryRoutes, { prefix: '/api/v1/library' })
  fastify.register(searchRoutes, { prefix: '/api/v1/search' })

  // ── Global error handler ───────────────────────────────────────────────────

  fastify.setErrorHandler((err, _request, reply) => {
    const error = err as Error & { statusCode?: number; code?: string }
    const statusCode = error.statusCode ?? 500
    const code = error.code ?? 'INTERNAL_ERROR'

    if (statusCode >= 500) {
      fastify.log.error(error)
    }

    reply.status(statusCode).send({
      error: {
        code,
        message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
      },
    })
  })

  // ── Start ──────────────────────────────────────────────────────────────────

  try {
    await fastify.listen({ port: PORT, host: HOST })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

bootstrap()
