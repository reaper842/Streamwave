export default function HomePage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold text-text-primary">{greeting}</h1>

      {/* Featured playlists placeholder */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-text-primary">Featured playlists</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded bg-bg-elevated hover:bg-bg-highlight transition-colors cursor-pointer"
            >
              <div className="h-16 w-16 flex-shrink-0 rounded-l bg-bg-press" />
              <span className="truncate text-sm font-semibold text-text-primary pr-2">
                Playlist {i + 1}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Genre grid placeholder */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-text-primary">Browse all</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[
            { label: 'Pop', color: 'bg-pink-600' },
            { label: 'Hip-Hop', color: 'bg-orange-600' },
            { label: 'Rock', color: 'bg-red-700' },
            { label: 'Electronic', color: 'bg-blue-600' },
            { label: 'Jazz', color: 'bg-yellow-700' },
            { label: 'Classical', color: 'bg-purple-700' },
            { label: 'R&B', color: 'bg-green-700' },
            { label: 'Country', color: 'bg-amber-700' },
            { label: 'Latin', color: 'bg-rose-600' },
            { label: 'Indie', color: 'bg-teal-700' },
          ].map(({ label, color }) => (
            <div
              key={label}
              className={`relative h-32 cursor-pointer overflow-hidden rounded-lg ${color} hover:opacity-90 transition-opacity`}
            >
              <span className="absolute left-3 top-3 text-base font-bold text-white">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
