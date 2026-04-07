import { Heart } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { fetchLikedSongs } from '@/lib/data/library'
import { TrackList } from '@/components/content/TrackList'
import { PlayLikedSongsButton } from '@/components/library/PlayLikedSongsButton'
import { formatDuration } from '@/lib/utils/formatDuration'

export default async function LikedSongsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const songs = await fetchLikedSongs(session.user.id)

  if (!songs) notFound()

  const totalDuration = songs.reduce((sum, s) => sum + s.duration_ms, 0)
  const trackIds = songs.map((s) => s.id)

  return (
    <div>
      {/* Hero header — gradient purple like Spotify */}
      <div className="flex items-end gap-6 bg-gradient-to-b from-indigo-800 to-bg-base px-6 pb-6 pt-16">
        <div className="flex h-[232px] w-[232px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-800 to-blue-400 shadow-2xl">
          <Heart size={80} className="text-white" aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-text-primary">Playlist</span>
          <h1 className="text-5xl font-bold text-text-primary leading-tight">Liked Songs</h1>
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{songs.length} songs</span>
            {songs.length > 0 && <span>• {formatDuration(totalDuration)}</span>}
          </div>
        </div>
      </div>

      {/* Controls */}
      {songs.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-4">
          <PlayLikedSongsButton trackIds={trackIds} />
        </div>
      )}

      {/* Track list */}
      <div className="px-6 pb-8">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart size={48} className="mb-4 text-text-subdued" />
            <p className="text-lg font-semibold text-text-primary">
              Songs you like will appear here
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Save songs by tapping the heart icon.
            </p>
          </div>
        ) : (
          <TrackList tracks={songs} showAlbum={true} />
        )}
      </div>
    </div>
  )
}
