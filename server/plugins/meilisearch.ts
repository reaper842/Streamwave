import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { Meilisearch } from 'meilisearch'

declare module 'fastify' {
  interface FastifyInstance {
    meili: Meilisearch
  }
}

const meilisearchPlugin: FastifyPluginAsync = async (fastify) => {
  const host = process.env['MEILISEARCH_HOST']
  const apiKey = process.env['MEILISEARCH_API_KEY']

  if (!host) {
    throw new Error('MEILISEARCH_HOST environment variable is not set')
  }

  const meili = new Meilisearch({ host, apiKey })

  // Verify connectivity
  await meili.health()

  fastify.decorate('meili', meili)
}

export default fp(meilisearchPlugin, { name: 'meilisearch' })
