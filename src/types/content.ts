// Shared content types used by frontend components and API client

export interface TrackSummary {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
}

export interface AlbumDetail {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
  artist: { id: string; name: string; image_url: string | null }
  tracks: TrackSummary[]
  total_tracks: number
  total_duration_ms: number
}

export interface AlbumSummary {
  id: string
  title: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
  artist: { id: string; name: string }
}

export interface ArtistDetail {
  id: string
  name: string
  bio: string | null
  image_url: string | null
  genre: string | null
}

export interface PlaylistTrack extends TrackSummary {
  position: number
  added_at: string
}

export interface PlaylistDetail {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  owner: { id: string; display_name: string; avatar_url: string | null }
  tracks: PlaylistTrack[]
  total_tracks: number
  total_duration_ms: number
}

export interface PlaylistSummary {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  owner: { id: string; display_name: string }
}

export interface FeaturedResponse {
  playlists: PlaylistSummary[]
  albums: AlbumSummary[]
}

export interface GenreCard {
  label: string
  color: string
  slug: string
}
