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

const LOCAL_AUDIO_FILES = [
  'Cartoon, Jéja - On & On (feat. Daniel Levi)  Electronic Pop  NCS - Copyright Free Music.mp3',
  'Janji - Heroes Tonight (feat. Johnning)  Progressive House  NCS - Copyright Free Music.mp3',
  'Warriyo - Mortals (feat. Laura Brehm)  Future Trap  NCS - Copyright Free Music.mp3',
]

const MY_SONGS: { artist: string; album: string; title: string; genre: string; file: string }[] = [
  {
    artist: 'Cartoon, Jéja',
    album: 'Electronic Pop',
    title: 'On & On (feat. Daniel Levi)',
    genre: 'Electronic Pop',
    file: LOCAL_AUDIO_FILES[0],
  },
  {
    artist: 'Janji',
    album: 'Progressive House',
    title: 'Heroes Tonight (feat. Johnning)',
    genre: 'Progressive House',
    file: LOCAL_AUDIO_FILES[1],
  },
  {
    artist: 'Warriyo',
    album: 'Future Trap',
    title: 'Mortals (feat. Laura Brehm)',
    genre: 'Future Trap',
    file: LOCAL_AUDIO_FILES[2],
  },
]

function audioUrl(index: number): string {
  const filename = LOCAL_AUDIO_FILES[index % LOCAL_AUDIO_FILES.length]
  return `/audio/${filename}`
}

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
            audio_url: audioUrl(k),
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

  // ── Test Playlist (real metadata for local audio files) ───────────────────
  const mySongTrackIds: string[] = []
  for (const song of MY_SONGS) {
    const artist = await prisma.artist.create({
      data: {
        name: song.artist,
        genre: song.genre,
        bio: null,
        image_url: `https://picsum.photos/seed/${encodeURIComponent(song.artist)}/400/400`,
      },
    })
    const album = await prisma.album.create({
      data: {
        title: song.album,
        artist_id: artist.id,
        cover_url: `https://picsum.photos/seed/${encodeURIComponent(song.album)}/300/300`,
        release_date: new Date('2024-01-01'),
        genre: song.genre,
      },
    })
    const track = await prisma.track.create({
      data: {
        title: song.title,
        artist_id: artist.id,
        album_id: album.id,
        duration_ms: 210000,
        audio_url: `/audio/${song.file}`,
        track_number: 1,
      },
    })
    mySongTrackIds.push(track.id)
  }

  const testPlaylist = await prisma.playlist.create({
    data: {
      user_id: demoUser.id,
      name: 'My 3 Songs',
      description: 'Local audio test playlist.',
      is_public: true,
      cover_url: `https://picsum.photos/seed/testplaylist/300/300`,
    },
  })
  for (let t = 0; t < mySongTrackIds.length; t++) {
    await prisma.playlistTrack.create({
      data: {
        playlist_id: testPlaylist.id,
        track_id: mySongTrackIds[t],
        position: t + 1,
      },
    })
  }
  console.log(`✅ Created playlist: ${testPlaylist.name} (${mySongTrackIds.length} tracks)`)

  console.log('\n🎉 Seed complete!')
  console.log(`   Demo login: demo@streamwave.app / Demo1234`)
  console.log(`   Artists: ${ARTISTS.length}`)
  console.log(`   Albums: ${ARTISTS.length * 5}`)
  console.log(`   Tracks: ${ARTISTS.length * 50}`)
  console.log(`   Playlists: ${playlistDefs.length + 1}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
