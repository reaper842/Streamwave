import Link from 'next/link'
import { fetchFeatured, getStaticGenres } from '@/lib/data/content'

export const dynamic = 'force-dynamic'
import { AlbumCard } from '@/components/content/AlbumCard'
import { PlaylistCard } from '@/components/content/PlaylistCard'
import { CardGrid } from '@/components/content/CardGrid'

export default async function HomePage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const featured = await fetchFeatured()
  const genres = getStaticGenres()

  return (
    <div className="px-6 py-8">
      <h1 className="mb-8 text-3xl font-bold text-text-primary">{greeting}</h1>

      {/* Featured Playlists */}
      {featured.playlists.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Featured playlists</h2>
          <CardGrid>
            {featured.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </CardGrid>
        </section>
      )}

      {/* New Releases */}
      {featured.albums.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-text-primary">New releases</h2>
          <CardGrid>
            {featured.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </CardGrid>
        </section>
      )}

      {/* Genre Browse */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-text-primary">Browse all</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {genres.map(({ label, color, slug }) => (
            <Link
              key={slug}
              href={`/search?genre=${encodeURIComponent(slug)}`}
              className="relative h-32 overflow-hidden rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              <span className="absolute left-3 top-3 text-base font-bold text-white">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
