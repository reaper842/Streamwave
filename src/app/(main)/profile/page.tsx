import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { User, Heart, Music, Users, Disc, Settings, ChevronRight } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { fetchUserProfileStats } from '@/lib/data/profile'

interface StatCardProps {
  label: string
  value: number
  href: string
  icon: ReactNode
}

function StatCard({ label, value, href, icon }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl bg-bg-elevated p-5 transition-colors hover:bg-bg-highlight"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-highlight transition-colors group-hover:bg-bg-press">
          {icon}
        </div>
        <ChevronRight
          size={16}
          className="text-text-subdued opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
      <div>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{label}</p>
      </div>
    </Link>
  )
}

interface QuickLinkProps {
  href: string
  icon: ReactNode
  iconBg: string
  title: string
  subtitle: string
}

function QuickLink({ href, icon, iconBg, title, subtitle }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-md bg-bg-elevated p-4 transition-colors hover:bg-bg-highlight"
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{subtitle}</p>
      </div>
      <ChevronRight
        size={16}
        className="flex-shrink-0 text-text-subdued opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
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
    <div>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-900 to-bg-base">
        {/* Layered gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-indigo-800/30 to-transparent" />

        <div className="relative px-6 pb-8 pt-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            {/* Avatar */}
            <div className="relative h-36 w-36 flex-shrink-0 overflow-hidden rounded-full shadow-2xl ring-4 ring-white/10 sm:h-44 sm:w-44">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="176px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
                  <User size={72} className="text-text-subdued" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Profile
              </span>
              <h1 className="mt-1 truncate text-4xl font-bold leading-tight text-text-primary sm:text-5xl md:text-6xl">
                {displayName}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">{profile.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="font-semibold text-text-primary">{profile.likedSongsCount}</span>{' '}
                  <span className="text-text-secondary">liked songs</span>
                </span>
                <span>
                  <span className="font-semibold text-text-primary">{profile.playlistsCount}</span>{' '}
                  <span className="text-text-secondary">playlists</span>
                </span>
                <span>
                  <span className="font-semibold text-text-primary">
                    {profile.followedArtistsCount}
                  </span>{' '}
                  <span className="text-text-secondary">following</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-text-subdued">Member since {joinedDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center gap-3 px-6 py-5">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-full border border-border-default px-5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-text-secondary hover:bg-bg-elevated"
        >
          <Settings size={15} aria-hidden="true" />
          Edit Profile
        </Link>
      </div>

      {/* ── Stats Grid ── */}
      <section className="px-6 pb-8">
        <h2 className="mb-4 text-xl font-bold text-text-primary">Your Library</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Liked Songs"
            value={profile.likedSongsCount}
            href="/library/liked-songs"
            icon={<Heart size={18} className="text-text-secondary" aria-hidden="true" />}
          />
          <StatCard
            label="Playlists"
            value={profile.playlistsCount}
            href="/library"
            icon={<Music size={18} className="text-text-secondary" aria-hidden="true" />}
          />
          <StatCard
            label="Following"
            value={profile.followedArtistsCount}
            href="/library"
            icon={<Users size={18} className="text-text-secondary" aria-hidden="true" />}
          />
          <StatCard
            label="Saved Albums"
            value={profile.savedAlbumsCount}
            href="/library"
            icon={<Disc size={18} className="text-text-secondary" aria-hidden="true" />}
          />
        </div>
      </section>

      {/* ── Quick Access ── */}
      <section className="px-6 pb-10">
        <h2 className="mb-4 text-xl font-bold text-text-primary">Quick Access</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <QuickLink
            href="/library/liked-songs"
            iconBg="bg-gradient-to-br from-indigo-800 to-blue-400"
            icon={<Heart size={20} className="text-white" aria-hidden="true" />}
            title="Liked Songs"
            subtitle={`${profile.likedSongsCount} songs`}
          />
          <QuickLink
            href="/library"
            iconBg="bg-bg-press"
            icon={<Music size={20} className="text-text-primary" aria-hidden="true" />}
            title="My Playlists"
            subtitle={`${profile.playlistsCount} playlists`}
          />
          <QuickLink
            href="/library"
            iconBg="bg-bg-press"
            icon={<Users size={20} className="text-text-primary" aria-hidden="true" />}
            title="Artists I Follow"
            subtitle={`${profile.followedArtistsCount} artists`}
          />
          <QuickLink
            href="/library"
            iconBg="bg-bg-press"
            icon={<Disc size={20} className="text-text-primary" aria-hidden="true" />}
            title="Saved Albums"
            subtitle={`${profile.savedAlbumsCount} albums`}
          />
        </div>
      </section>
    </div>
  )
}
