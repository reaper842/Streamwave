import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchAlbum } from '@/lib/data/content'
import { TrackList } from '@/components/content/TrackList'
import { PlayAlbumButton } from '@/components/content/PlayButton'
import { SaveAlbumButton } from '@/components/content/SaveAlbumButton'
import { formatDuration } from '@/lib/utils/formatDuration'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params
  const album = await fetchAlbum(id)

  if (!album) notFound()

  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null

  return (
    <div>
      {/* Hero header */}
      <div className="flex items-end gap-6 bg-gradient-to-b from-bg-highlight to-bg-base px-6 pb-6 pt-16">
        <div className="relative h-[232px] w-[232px] flex-shrink-0 overflow-hidden rounded shadow-2xl">
          {album.cover_url ? (
            <Image
              src={album.cover_url}
              alt={album.title}
              fill
              sizes="232px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="h-full w-full bg-bg-press" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-text-primary">Album</span>
          <h1 className="text-5xl font-bold text-text-primary leading-tight">{album.title}</h1>
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            {album.artist.image_url && (
              <Image
                src={album.artist.image_url}
                alt={album.artist.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <Link
              href={`/artist/${album.artist.id}`}
              className="font-semibold text-text-primary hover:underline"
            >
              {album.artist.name}
            </Link>
            {releaseYear && <span>• {releaseYear}</span>}
            <span>• {album.total_tracks} songs,</span>
            <span>{formatDuration(album.total_duration_ms)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-6 py-4">
        <PlayAlbumButton albumId={album.id} />
        <SaveAlbumButton
          albumId={album.id}
          albumData={{
            id: album.id,
            title: album.title,
            cover_url: album.cover_url,
            artist: { id: album.artist.id, name: album.artist.name },
          }}
        />
      </div>

      {/* Track list */}
      <div className="px-6 pb-8">
        <TrackList tracks={album.tracks} showAlbum={false} />
      </div>
    </div>
  )
}
