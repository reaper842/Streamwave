/**
 * Search business logic.
 *
 * Checks a Redis cache first (60s TTL), queries Meilisearch on miss, and
 * caches the result before returning.
 */
import { createHash } from 'crypto'
import type { Meilisearch } from 'meilisearch'
import type { Redis } from 'ioredis'
import { INDEX } from './search-sync'
import type {
  TrackSearchResult as TrackDocument,
  ArtistSearchResult as ArtistDocument,
  AlbumSearchResult as AlbumDocument,
  PlaylistSearchResult as PlaylistDocument,
} from '../../src/types/search'

const CACHE_TTL_SECONDS = 60

export type SearchType = 'tracks' | 'artists' | 'albums' | 'playlists'

export type { SearchResults } from '../../src/types/search'
import type { SearchResults } from '../../src/types/search'

function buildCacheKey(q: string, types: SearchType[], limit: number, offset: number): string {
  const payload = `${q.toLowerCase()}:${[...types].sort().join(',')}:${limit}:${offset}`
  const hash = createHash('sha1').update(payload).digest('hex')
  return `search:${hash}`
}

/**
 * Search across one or more entity types.
 *
 * @param meili  - Meilisearch client
 * @param redis  - ioredis client (for caching)
 * @param q      - search query (non-empty)
 * @param types  - which indexes to search
 * @param limit  - results per index (default 20, max 50)
 * @param offset - pagination offset (default 0)
 */
export async function search(
  meili: Meilisearch,
  redis: Redis,
  q: string,
  types: SearchType[],
  limit = 20,
  offset = 0,
): Promise<SearchResults> {
  const key = buildCacheKey(q, types, limit, offset)

  // ── Cache check ────────────────────────────────────────────────────────────
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as SearchResults
  }

  // ── Fan-out search ─────────────────────────────────────────────────────────
  const results: SearchResults = {
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
  }

  await Promise.all(
    types.map(async (type) => {
      switch (type) {
        case 'tracks': {
          const res = await meili.index(INDEX.TRACKS).search<TrackDocument>(q, { limit, offset })
          results.tracks = res.hits
          break
        }
        case 'artists': {
          const res = await meili.index(INDEX.ARTISTS).search<ArtistDocument>(q, { limit, offset })
          results.artists = res.hits
          break
        }
        case 'albums': {
          const res = await meili.index(INDEX.ALBUMS).search<AlbumDocument>(q, { limit, offset })
          results.albums = res.hits
          break
        }
        case 'playlists': {
          const res = await meili
            .index(INDEX.PLAYLISTS)
            .search<PlaylistDocument>(q, { limit, offset })
          results.playlists = res.hits
          break
        }
      }
    }),
  )

  // ── Cache result ───────────────────────────────────────────────────────────
  await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(results))

  return results
}
