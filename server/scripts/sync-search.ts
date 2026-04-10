/**
 * One-shot Meilisearch full sync script.
 *
 * Reads all records from PostgreSQL and upserts them into the four Meilisearch
 * indexes (tracks, artists, albums, playlists).  Safe to re-run at any time —
 * documents are upserted, not replaced.
 *
 * Usage:
 *   npx tsx server/scripts/sync-search.ts
 *
 * Requires:
 *   - DATABASE_URL      — PostgreSQL connection string
 *   - MEILISEARCH_HOST  — e.g. http://localhost:7700
 *   - MEILISEARCH_API_KEY (optional for local dev)
 */
import 'dotenv/config'
import { Meilisearch } from 'meilisearch'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'
import { fullSync } from '../services/search-sync'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')

const meiliHost = process.env['MEILISEARCH_HOST']
if (!meiliHost) throw new Error('MEILISEARCH_HOST is not set')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const meili = new Meilisearch({
  host: meiliHost,
  apiKey: process.env['MEILISEARCH_API_KEY'],
})

async function main() {
  console.log('Starting Meilisearch full sync…')
  await fullSync(meili, prisma)
  console.log('Meilisearch sync complete.')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
