import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { fetchAlbumsByGenre, fetchArtistsByGenre } from '@/lib/data/content'
import { AlbumCard } from '@/components/content/AlbumCard'
import { ArtistCard } from '@/components/content/ArtistCard'
import { getStaticGenres } from '@/lib/utils/genres'

interface GenrePageProps {
  params: Promise<{ genre: string }>
}

export default async function GenrePage({ params }: GenrePageProps) {
  const { genre } = await params
  const decodedGenre = decodeURIComponent(genre)

  const genres = getStaticGenres()
  const genreConfig = genres.find((g) => g.slug.toLowerCase() === decodedGenre.toLowerCase())

  const [albums, artists] = await Promise.all([
    fetchAlbumsByGenre(decodedGenre, 20),
    fetchArtistsByGenre(decodedGenre, 20),
  ])

  return (
    <div className="pb-8">
      {/* Hero banner */}
      <div
        className="flex h-48 flex-col justify-end px-6 pb-6"
        style={{ backgroundColor: genreConfig?.color ?? '#333333' }}
      >
        <Link
          href="/search"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to search
        </Link>
        <h1 className="text-4xl font-bold text-white">{decodedGenre}</h1>
      </div>

      <div className="px-6 py-8 flex flex-col gap-10">
        {/* Artists */}
        {artists.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-text-primary">Artists</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-text-primary">Albums</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {albums.length === 0 && artists.length === 0 && (
          <div className="py-16 text-center text-text-secondary">
            <p className="text-lg font-semibold">
              No content found for &ldquo;{decodedGenre}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
