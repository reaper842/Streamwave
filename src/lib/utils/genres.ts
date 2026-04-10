import type { GenreCard } from '@/types/content'

export function getStaticGenres(): GenreCard[] {
  return [
    { label: 'Pop', color: '#e91e8c', slug: 'Pop' },
    { label: 'Hip-Hop', color: '#e8821a', slug: 'Hip-Hop' },
    { label: 'Rock', color: '#ba0000', slug: 'Rock' },
    { label: 'Electronic', color: '#0d73ec', slug: 'Electronic' },
    { label: 'Jazz', color: '#8d67ab', slug: 'Jazz' },
    { label: 'Classical', color: '#509bf5', slug: 'Classical' },
    { label: 'R&B', color: '#1e3264', slug: 'R&B' },
    { label: 'Country', color: '#477d95', slug: 'Country' },
    { label: 'Latin', color: '#dc148c', slug: 'Latin' },
    { label: 'Indie', color: '#148a08', slug: 'Indie' },
    { label: 'Metal', color: '#7a2929', slug: 'Metal' },
    { label: 'Soul', color: '#503750', slug: 'Soul' },
  ]
}
