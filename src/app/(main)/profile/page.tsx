import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { User, Heart, Music, Users, Disc } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { fetchUserProfileStats } from '@/lib/data/profile'

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-lg bg-bg-elevated p-5 transition-colors hover:bg-bg-highlight"
    >
      <span className="text-3xl font-bold text-text-primary">{value}</span>
      <span className="text-sm text-text-secondary">{label}</span>
    </Link>
  )
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await fetchUserProfileStats(session.user.id)
  if (!profile) redirect('/login')

  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const displayName = profile.display_name || session.user.name || 'StreamWave User'
  const avatarUrl = profile.avatar_url ?? session.user.image ?? null

  return (
    <div className="px-6 py-8">
      {/* Hero */}
      <div className="mb-8 flex items-end gap-6">
        <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-full bg-bg-elevated shadow-2xl">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="160px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User size={64} className="text-text-subdued" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase text-text-secondary">Profile</span>
          <h1 className="mt-1 truncate text-5xl font-bold text-text-primary">{displayName}</h1>
          <p className="mt-2 text-sm text-text-secondary">{profile.email}</p>
          <p className="text-xs text-text-subdued">Member since {joinedDate}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Liked Songs" value={profile.likedSongsCount} href="/library/liked-songs" />
        <StatCard label="Playlists" value={profile.playlistsCount} href="/library" />
        <StatCard label="Following" value={profile.followedArtistsCount} href="/library" />
        <StatCard label="Saved Albums" value={profile.savedAlbumsCount} href="/library" />
      </div>

      {/* Quick links */}
      <h2 className="mb-4 text-xl font-bold text-text-primary">Your Collection</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/library/liked-songs"
          className="flex items-center gap-4 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-800 to-blue-400">
            <Heart size={20} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Liked Songs</p>
            <p className="text-sm text-text-secondary">{profile.likedSongsCount} songs</p>
          </div>
        </Link>
        <Link
          href="/library"
          className="flex items-center gap-4 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-bg-press">
            <Music size={20} className="text-text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Playlists</p>
            <p className="text-sm text-text-secondary">{profile.playlistsCount} playlists</p>
          </div>
        </Link>
        <Link
          href="/library"
          className="flex items-center gap-4 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-bg-press">
            <Users size={20} className="text-text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Following</p>
            <p className="text-sm text-text-secondary">{profile.followedArtistsCount} artists</p>
          </div>
        </Link>
        <Link
          href="/library"
          className="flex items-center gap-4 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-bg-press">
            <Disc size={20} className="text-text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Saved Albums</p>
            <p className="text-sm text-text-secondary">{profile.savedAlbumsCount} albums</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
