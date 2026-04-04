import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── Data Definitions ─────────────────────────────────────────────────────────

const ARTISTS = [
  { name: 'Aurora Skies', genre: 'Indie Pop', bio: 'Dream-pop duo from Oslo.' },
  { name: 'The Midnight', genre: 'Synthwave', bio: 'Nostalgic 80s-inspired synth duo.' },
  { name: 'Neon Pulse', genre: 'Electronic', bio: 'Berlin-based electronic producer.' },
  { name: 'Velvet Echo', genre: 'R&B', bio: 'Soulful vocals over lush production.' },
  { name: 'Crimson Tide', genre: 'Rock', bio: 'Guitar-driven alt-rock from Chicago.' },
  { name: 'Solar Drift', genre: 'Ambient', bio: 'Meditative soundscapes for focus.' },
  { name: 'Jazz Collective', genre: 'Jazz', bio: 'Contemporary jazz quartet.' },
  { name: 'BeatForge', genre: 'Hip-Hop', bio: 'Underground hip-hop producer.' },
  { name: 'Luna Vera', genre: 'Latin Pop', bio: 'Latin pop star from Buenos Aires.' },
  { name: 'Frost & Fire', genre: 'Folk', bio: 'Acoustic folk storytellers.' },
]

const ALBUM_TITLES = [
  ['First Light', 'Echoes', 'Neon Dreams', 'After Dark', 'Horizon'],
  ['Days of Thunder', 'Monsters', 'Kids', 'Nocturnal', 'Horror Show'],
  ['Pulse One', 'Circuit Break', 'Data Stream', 'Overload', 'Frequency'],
  ['Silk Road', 'Midnight Blue', 'Velvet Hours', 'Soul Deep', 'Amber'],
  ['Red Sky', 'Static', 'Undertow', 'Wavelength', 'Crossfire'],
  ['Drift Vol. 1', 'Nebula', 'Still Water', 'Ether', 'Cosmos'],
  ['Quartet Sessions', 'Blue Mode', 'Standards', 'Improvised', 'Late Night'],
  ['Sample Pack 1', 'Boom Bap', 'Lo-Fi Tape', 'Street Codes', 'Block Party'],
  ['Sol y Luna', 'Corazón', 'Verano', 'Ritmo', 'Fuego'],
  ['Woodsmoke', 'River Songs', 'The Long Road', 'Campfire', 'Seasons'],
]

const TRACK_TITLE_PREFIXES = [
  'Morning',
  'Night',
  'City',
  'Golden',
  'Silver',
  'Dark',
  'Bright',
  'Lost',
  'Found',
  'New',
]

const TRACK_TITLE_SUFFIXES = [
  'Light',
  'Dream',
  'Road',
  'Sky',
  'Wave',
  'Echo',
  'Fire',
  'Rain',
  'Wind',
  'Star',
]

function trackTitle(prefix: string, suffix: string): string {
  return `${prefix} ${suffix}`
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await prisma.playlistTrack.deleteMany()
  await prisma.likedSong.deleteMany()
  await prisma.followedArtist.deleteMany()
  await prisma.savedAlbum.deleteMany()
  await prisma.playlist.deleteMany()
  await prisma.track.deleteMany()
  await prisma.album.deleteMany()
  await prisma.artist.deleteMany()
  await prisma.user.deleteMany()

  // ── Demo user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234', 12)
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@streamwave.app',
      password_hash: passwordHash,
      display_name: 'Demo User',
      avatar_url: null,
    },
  })
  console.log(`✅ Created demo user: ${demoUser.email}`)

  // ── Artists, Albums, Tracks ────────────────────────────────────────────────
  const allTracks: { id: string; artistId: string }[] = []

  for (let i = 0; i < ARTISTS.length; i++) {
    const artistDef = ARTISTS[i]
    const artist = await prisma.artist.create({
      data: {
        name: artistDef.name,
        genre: artistDef.genre,
        bio: artistDef.bio,
        image_url: `https://picsum.photos/seed/${artistDef.name.replace(/\s+/g, '')}/400/400`,
      },
    })

    const albumTitles = ALBUM_TITLES[i]
    for (let j = 0; j < albumTitles.length; j++) {
      const albumTitle = albumTitles[j]
      const releaseYear = 2018 + j
      const album = await prisma.album.create({
        data: {
          title: albumTitle,
          artist_id: artist.id,
          cover_url: `https://picsum.photos/seed/${albumTitle.replace(/\s+/g, '')}${i}/300/300`,
          release_date: new Date(`${releaseYear}-0${(j % 9) + 1}-01`),
          genre: artistDef.genre,
        },
      })

      for (let k = 0; k < 10; k++) {
        const prefix = TRACK_TITLE_PREFIXES[k]
        const suffix = TRACK_TITLE_SUFFIXES[(k + j) % 10]
        const track = await prisma.track.create({
          data: {
            title: trackTitle(prefix, suffix),
            artist_id: artist.id,
            album_id: album.id,
            duration_ms: 180000 + Math.floor(Math.random() * 120000),
            // Placeholder audio URL — replace with real R2 URLs in production
            audio_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(k % 16) + 1}.mp3`,
            track_number: k + 1,
          },
        })
        allTracks.push({ id: track.id, artistId: artist.id })
      }
    }
    console.log(`✅ Seeded artist: ${artist.name} (5 albums, 50 tracks)`)
  }

  // ── Curated Playlists ──────────────────────────────────────────────────────
  const playlistDefs = [
    { name: 'Chill Vibes', description: 'Relaxing tracks for any time of day.' },
    { name: 'Workout Fuel', description: 'High-energy beats to keep you moving.' },
    { name: 'Late Night Drive', description: 'Atmospheric sounds for night drives.' },
    { name: 'Focus Mode', description: 'Ambient and lo-fi for deep work.' },
    { name: 'Party Starters', description: 'Crowd-pleasers for any party.' },
  ]

  for (let p = 0; p < playlistDefs.length; p++) {
    const def = playlistDefs[p]
    const playlist = await prisma.playlist.create({
      data: {
        user_id: demoUser.id,
        name: def.name,
        description: def.description,
        is_public: true,
        cover_url: `https://picsum.photos/seed/playlist${p}/300/300`,
      },
    })

    // Add 20 tracks per playlist, picking from allTracks
    const selectedTracks = allTracks.slice(p * 20, p * 20 + 20)
    for (let t = 0; t < selectedTracks.length; t++) {
      await prisma.playlistTrack.create({
        data: {
          playlist_id: playlist.id,
          track_id: selectedTracks[t].id,
          position: t + 1,
        },
      })
    }
    console.log(`✅ Created playlist: ${playlist.name} (20 tracks)`)
  }

  console.log('\n🎉 Seed complete!')
  console.log(`   Demo login: demo@streamwave.app / Demo1234`)
  console.log(`   Artists: ${ARTISTS.length}`)
  console.log(`   Albums: ${ARTISTS.length * 5}`)
  console.log(`   Tracks: ${ARTISTS.length * 50}`)
  console.log(`   Playlists: ${playlistDefs.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
