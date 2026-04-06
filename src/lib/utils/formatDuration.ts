/**
 * Formats a duration in milliseconds to mm:ss string.
 * e.g. 185000 → "3:05"
 */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
