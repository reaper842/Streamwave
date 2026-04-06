import Image from 'next/image'
import { notFound } from 'next/navigation'
import { fetchArtist, fetchArtistAlbums, fetchArtistTopTracks } from '@/lib/data/content'
import { AlbumCard } from '@/components/content/AlbumCard'
import { TrackList } from '@/components/content/TrackList'
import { CardGrid } from '@/components/content/CardGrid'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params

  const [artist, albums, topTracks] = await Promise.all([
    fetchArtist(id),
    fetchArtistAlbums(id, 20),
    fetchArtistTopTracks(id, 10),
  ])

  if (!artist) notFound()

  return (
    <div>
      {/* Hero banner */}
      <div className="relative h-60 overflow-hidden">
        {artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.name}
            fill
            sizes="100vw"
            className="object-cover object-top"
            priority
          />
        ) : (
          <div className="h-full w-full bg-bg-highlight" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/60 to-transparent" />
        <div className="absolute bottom-4 left-6">
          <p className="mb-1 text-xs font-semibold uppercase text-text-primary">Verified Artist</p>
          <h1 className="text-6xl font-bold text-text-primary">{artist.name}</h1>
        </div>
      </div>

      <div className="px-6 py-6 flex flex-col gap-10">
        {/* Top tracks */}
        {topTracks.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-text-primary">Popular</h2>
            <TrackList tracks={topTracks.slice(0, 5)} showAlbum />
          </section>
        )}

        {/* Bio */}
        {artist.bio && (
          <section>
            <h2 className="mb-3 text-xl font-bold text-text-primary">About</h2>
            <p className="max-w-2xl text-sm text-text-secondary leading-relaxed">{artist.bio}</p>
          </section>
        )}

        {/* Discography */}
        {albums.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-text-primary">Discography</h2>
            <CardGrid>
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </CardGrid>
          </section>
        )}
      </div>
    </div>
  )
}
