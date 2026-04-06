import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '../lib/prisma'

// ── R2 / S3 client ────────────────────────────────────────────────────────────

function getS3Client(): S3Client | null {
  const accountId = process.env['R2_ACCOUNT_ID']
  const accessKeyId = process.env['R2_ACCESS_KEY_ID']
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY']

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrackMetadata {
  id: string
  title: string
  duration_ms: number
  track_number: number
  artist: { id: string; name: string }
  album: { id: string; title: string; cover_url: string | null }
}

export interface TrackStreamResponse {
  streamUrl: string
  expiresAt: string
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getTrackById(trackId: string): Promise<TrackMetadata | null> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      artist: { select: { id: true, name: true } },
      album: { select: { id: true, title: true, cover_url: true } },
    },
  })

  if (!track) return null

  return {
    id: track.id,
    title: track.title,
    duration_ms: track.duration_ms,
    track_number: track.track_number,
    artist: { id: track.artist.id, name: track.artist.name },
    album: {
      id: track.album.id,
      title: track.album.title,
      cover_url: track.album.cover_url,
    },
  }
}

export async function getTrackStreamUrl(trackId: string): Promise<TrackStreamResponse | null> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, audio_url: true },
  })

  if (!track) return null

  const s3 = getS3Client()
  const bucketName = process.env['R2_BUCKET_NAME'] ?? 'streamwave-audio'

  // If R2 is configured, generate a signed URL
  if (s3) {
    const audioKey = track.audio_url.startsWith('http')
      ? new URL(track.audio_url).pathname.replace(/^\//, '')
      : track.audio_url

    const command = new GetObjectCommand({ Bucket: bucketName, Key: audioKey })
    const expiresInSeconds = 15 * 60 // 15 minutes

    const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    return { streamUrl: url, expiresAt }
  }

  // Fallback: return the audio_url directly (works for local /fixtures/ paths)
  return {
    streamUrl: track.audio_url,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }
}
