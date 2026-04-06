/**
 * Global test setup — runs before each test file in a worker.
 *
 * Responsibilities:
 *  1. Load DATABASE_URL and REDIS_URL from .env.local (does NOT override values
 *     already set by vitest.config.ts `env` block, e.g. JWT_SECRET, BCRYPT_COST).
 *  2. Supply sensible defaults so tests run against the standard local stack
 *     started with `docker compose up -d`.
 *
 * Prerequisites for integration tests:
 *  - PostgreSQL reachable at DATABASE_URL  (default: localhost:5432/streamwave_dev)
 *  - Redis reachable at REDIS_URL          (default: localhost:6379)
 */
import { config } from 'dotenv'
import { resolve } from 'path'

const root = resolve(process.cwd(), '..')

// Try to load from streamwave/.env.local first, then fall back to .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(root, '.env.local') })

// Fallback defaults so tests work out-of-the-box with docker compose
if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] = 'postgresql://streamwave:streamwave@localhost:5432/streamwave_dev'
}
if (!process.env['REDIS_URL']) {
  process.env['REDIS_URL'] = 'redis://localhost:6379'
}
if (!process.env['MEILISEARCH_HOST']) {
  process.env['MEILISEARCH_HOST'] = 'http://localhost:7700'
}
