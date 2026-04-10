// Shared search result types used by both the frontend (store, components)
// and the backend (search-sync service imports these shapes).

export interface TrackSearchResult {
  id: string
  title: string
  artist_name: string
  artist_id: string
  album_title: string
  album_id: string
  album_cover_url: string | null
  duration_ms: number
  genre: string | null
}

export interface ArtistSearchResult {
  id: string
  name: string
  genre: string | null
  image_url: string | null
}

export interface AlbumSearchResult {
  id: string
  title: string
  artist_name: string
  artist_id: string
  cover_url: string | null
  release_date: string | null
  genre: string | null
}

export interface PlaylistSearchResult {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  owner_name: string
  owner_id: string
  is_public: boolean
}

export interface SearchResults {
  tracks: TrackSearchResult[]
  artists: ArtistSearchResult[]
  albums: AlbumSearchResult[]
  playlists: PlaylistSearchResult[]
}
