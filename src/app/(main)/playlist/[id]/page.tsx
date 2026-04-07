import Image from 'next/image'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { fetchPlaylist } from '@/lib/data/content'
import { TrackList } from '@/components/content/TrackList'
import { PlaylistControls } from '@/components/library/PlaylistControls'
import { formatDuration } from '@/lib/utils/formatDuration'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params
  const [playlist, session] = await Promise.all([fetchPlaylist(id), auth()])

  if (!playlist) notFound()

  const isOwner = session?.user?.id === playlist.owner.id

  return (
    <div>
      {/* Hero header */}
      <div className="flex items-end gap-6 bg-gradient-to-b from-bg-highlight to-bg-base px-6 pb-6 pt-16">
        <div className="relative h-[232px] w-[232px] flex-shrink-0 overflow-hidden rounded shadow-2xl">
          {playlist.cover_url ? (
            <Image
              src={playlist.cover_url}
              alt={playlist.name}
              fill
              sizes="232px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-press">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-text-subdued"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-text-primary">Playlist</span>
          <h1 className="text-5xl font-bold text-text-primary leading-tight">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm text-text-secondary">{playlist.description}</p>
          )}
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{playlist.owner.display_name}</span>
            <span>• {playlist.total_tracks} songs,</span>
            <span>{formatDuration(playlist.total_duration_ms)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-6 py-4">
        <PlaylistControls
          playlistId={playlist.id}
          playlistName={playlist.name}
          playlistDescription={playlist.description}
          isOwner={isOwner}
        />
      </div>

      {/* Track list */}
      <div className="px-6 pb-8">
        <TrackList tracks={playlist.tracks} showAlbum />
      </div>
    </div>
  )
}
