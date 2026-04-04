import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import redisPlugin from './plugins/redis'
import meilisearchPlugin from './plugins/meilisearch'

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

  await fastify.register(redisPlugin)
  await fastify.register(meilisearchPlugin)

  // ── Health check ───────────────────────────────────────────────────────────

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // ── Routes (registered as milestones are completed) ────────────────────────
  // Routes will be added under /api/v1/ prefix in subsequent milestones

  // ── Start ──────────────────────────────────────────────────────────────────

  try {
    await fastify.listen({ port: PORT, host: HOST })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

bootstrap()
