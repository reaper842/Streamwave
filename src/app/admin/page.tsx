import { Users, Music, Disc3, ListMusic, MicVocal } from 'lucide-react'
import { prisma } from '@/lib/prisma'

async function fetchStats() {
  const [users, artists, albums, tracks, playlists] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count(),
    prisma.album.count(),
    prisma.track.count(),
    prisma.playlist.count(),
  ])
  return { users, artists, albums, tracks, playlists }
}

const STAT_CARDS = [
  { key: 'users' as const, label: 'Users', icon: Users, color: 'text-blue-400' },
  { key: 'artists' as const, label: 'Artists', icon: MicVocal, color: 'text-purple-400' },
  { key: 'albums' as const, label: 'Albums', icon: Disc3, color: 'text-pink-400' },
  { key: 'tracks' as const, label: 'Tracks', icon: Music, color: 'text-accent-primary' },
  { key: 'playlists' as const, label: 'Playlists', icon: ListMusic, color: 'text-yellow-400' },
]

export default async function AdminDashboardPage() {
  const stats = await fetchStats()

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-1">Dashboard</h1>
      <p className="text-text-secondary mb-8">StreamWave content overview</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-bg-elevated rounded-lg p-5 flex flex-col gap-2">
            <Icon size={22} className={color} />
            <p className="text-3xl font-bold text-text-primary">{stats[key].toLocaleString()}</p>
            <p className="text-text-secondary text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
        <a
          href="/admin/tracks"
          className="bg-bg-elevated hover:bg-bg-highlight transition-colors rounded-lg p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
            <Music size={20} className="text-accent-primary" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Manage Tracks</p>
            <p className="text-text-secondary text-xs mt-0.5">Add, edit, or delete tracks</p>
          </div>
        </a>

        <a
          href="/admin/playlists"
          className="bg-bg-elevated hover:bg-bg-highlight transition-colors rounded-lg p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <ListMusic size={20} className="text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Manage Playlists</p>
            <p className="text-text-secondary text-xs mt-0.5">Create and curate playlists</p>
          </div>
        </a>
      </div>
    </div>
  )
}
