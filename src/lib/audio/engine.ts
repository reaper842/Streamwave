'use client'

import { Howl, Howler } from 'howler'

// ── Types ──────────────────────────────────────────────────────────────────────

export type RepeatMode = 'off' | 'all' | 'one'

export interface QueueTrack {
  id: string
  title: string
  artistName: string
  albumTitle: string
  albumCover: string | null
  duration_ms: number
  streamUrl: string
}

export interface AudioEngineState {
  currentTrack: QueueTrack | null
  isPlaying: boolean
  isLoading: boolean
  positionMs: number
  durationMs: number
  volume: number // 0–1
  isMuted: boolean
  queue: QueueTrack[]
  queueIndex: number
  shuffleEnabled: boolean
  repeatMode: RepeatMode
  error: string | null
}

type StateListener = (state: AudioEngineState) => void

// ── Constants ──────────────────────────────────────────────────────────────────

const PROGRESS_INTERVAL_MS = 250
const PREBUFFER_THRESHOLD_MS = 10_000
const MAX_RETRIES = 3

// ── AudioEngine ────────────────────────────────────────────────────────────────

/**
 * Singleton audio engine wrapping Howler.js.
 * All state changes are emitted to registered listeners (consumed by usePlayerStore).
 * Components NEVER interact with Howler directly.
 */
class AudioEngine {
  private howl: Howl | null = null
  private nextHowl: Howl | null = null // pre-buffered track
  private nextHowlIndex: number = -1 // queue index of the pre-buffered track
  private state: AudioEngineState = {
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    positionMs: 0,
    durationMs: 0,
    volume: 0.8,
    isMuted: false,
    queue: [],
    queueIndex: -1,
    shuffleEnabled: false,
    repeatMode: 'off',
    error: null,
  }
  private shuffleOrder: number[] = [] // shuffled indices into queue
  private listeners: Set<StateListener> = new Set()
  private progressTimer: ReturnType<typeof setInterval> | null = null
  private retryCount = 0
  private prevVolume = 0.8 // stored before mute

  // ── Listener API ─────────────────────────────────────────────────────────────

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    // Immediately emit current state to new subscriber
    listener({ ...this.state })
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const snapshot = { ...this.state, queue: [...this.state.queue] }
    this.listeners.forEach((l) => l(snapshot))
  }

  private setState(patch: Partial<AudioEngineState>) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  // ── Internal playback helpers ─────────────────────────────────────────────────

  private stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
  }

  private startProgressTimer() {
    this.stopProgressTimer()
    this.progressTimer = setInterval(() => {
      if (!this.howl || !this.state.isPlaying) return
      const pos = (this.howl.seek() as number) * 1000
      const dur = this.howl.duration() * 1000
      this.setState({ positionMs: pos, durationMs: dur })

      // Pre-buffer next track when within threshold of the end
      const remaining = dur - pos
      if (remaining > 0 && remaining <= PREBUFFER_THRESHOLD_MS && !this.nextHowl) {
        this.prebufferNext()
      }
    }, PROGRESS_INTERVAL_MS)
  }

  private buildHowl(url: string, onLoad?: () => void): Howl {
    const howl = new Howl({
      src: [url],
      html5: true, // enables streaming and byte-range support
      volume: this.state.isMuted ? 0 : this.state.volume,
      onload: () => onLoad?.(),
      onloaderror: (_id, err) => {
        if (this.retryCount < MAX_RETRIES) {
          this.retryCount++
          howl.load()
        } else {
          const message = typeof err === 'string' ? err : 'Failed to load audio'
          this.setState({ isLoading: false, isPlaying: false, error: message })
        }
      },
      onplayerror: (_id, err) => {
        const message = typeof err === 'string' ? err : 'Playback error'
        this.setState({ isPlaying: false, error: message })
      },
      onend: () => {
        console.error(
          '[AUDIO] onend — repeatMode:',
          this.state.repeatMode,
          'queueIndex:',
          this.state.queueIndex,
          'queueLen:',
          this.state.queue.length,
        )
        this.handleTrackEnd()
      },
    })
    return howl
  }

  private handleTrackEnd() {
    this.stopProgressTimer()

    if (this.state.repeatMode === 'one') {
      // Defer out of the onend callback so Howler.js finishes its own cleanup
      // before we unload the current Howl and create a fresh one.
      const index = this.state.queueIndex
      queueMicrotask(() => this.playAtIndex(index))
      return
    }

    // Advance queue
    const nextIndex = this.getNextIndex()
    console.error('[AUDIO] handleTrackEnd — nextIndex:', nextIndex)
    if (nextIndex === -1) {
      // End of queue, no repeat
      this.setState({ isPlaying: false, positionMs: 0 })
      return
    }

    // Defer for the same reason as repeat-one: calling unload() on this.howl
    // from within its own onend callback leaves Howler.js in a state where
    // the replacement Howl silently fails to start.
    queueMicrotask(() => this.playAtIndex(nextIndex))
  }

  private getNextIndex(): number {
    const { queue, queueIndex, repeatMode, shuffleEnabled } = this.state

    if (shuffleEnabled && this.shuffleOrder.length > 0) {
      const shufflePos = this.shuffleOrder.indexOf(queueIndex)
      const nextShufflePos = shufflePos + 1
      if (nextShufflePos >= this.shuffleOrder.length) {
        return repeatMode === 'all' ? this.shuffleOrder[0] : -1
      }
      return this.shuffleOrder[nextShufflePos]
    }

    const next = queueIndex + 1
    if (next >= queue.length) {
      return repeatMode === 'all' ? 0 : -1
    }
    return next
  }

  private getPrevIndex(): number {
    const { queueIndex, shuffleEnabled } = this.state

    if (shuffleEnabled && this.shuffleOrder.length > 0) {
      const shufflePos = this.shuffleOrder.indexOf(queueIndex)
      if (shufflePos <= 0) return this.shuffleOrder[this.shuffleOrder.length - 1]
      return this.shuffleOrder[shufflePos - 1]
    }

    return queueIndex > 0 ? queueIndex - 1 : 0
  }

  private playAtIndex(index: number) {
    const track = this.state.queue[index]
    if (!track) return

    this.retryCount = 0
    this.stopProgressTimer()

    // Use pre-buffered howl if available and it matches this track
    let newHowl: Howl
    if (this.nextHowl && this.nextHowlIndex === index) {
      newHowl = this.nextHowl
      this.nextHowl = null
      this.nextHowlIndex = -1
    } else {
      if (this.nextHowl) {
        this.nextHowl.unload()
        this.nextHowl = null
        this.nextHowlIndex = -1
      }
      newHowl = this.buildHowl(track.streamUrl)
    }

    this.howl?.unload()
    this.howl = newHowl

    this.setState({
      currentTrack: track,
      queueIndex: index,
      isLoading: true,
      isPlaying: false,
      positionMs: 0,
      durationMs: track.duration_ms,
      error: null,
    })

    // Single callback for both the already-loaded and the still-loading cases.
    // Guard: bail if this howl was superseded by a newer playAtIndex call.
    const onReady = () => {
      if (this.howl !== newHowl) return
      newHowl.play()
      this.setState({
        isLoading: false,
        isPlaying: true,
        durationMs: newHowl.duration() * 1000,
      })
      this.startProgressTimer()
      this.updateMediaSession(track)
    }

    if (newHowl.state() === 'loaded') {
      onReady()
    } else {
      newHowl.once('load', onReady)
    }
  }

  private prebufferNext() {
    // For repeat-one, pre-buffer the current track so it restarts seamlessly.
    // For all other modes, pre-buffer the upcoming next track.
    const targetIndex =
      this.state.repeatMode === 'one' ? this.state.queueIndex : this.getNextIndex()
    if (targetIndex === -1) return
    const nextTrack = this.state.queue[targetIndex]
    if (!nextTrack) return

    this.nextHowl = this.buildHowl(nextTrack.streamUrl)
    this.nextHowlIndex = targetIndex
  }

  // ── Media Session API ─────────────────────────────────────────────────────────

  private updateMediaSession(track: QueueTrack) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artistName,
      album: track.albumTitle,
      artwork: track.albumCover ? [{ src: track.albumCover }] : undefined,
    })

    navigator.mediaSession.setActionHandler('play', () => this.resume())
    navigator.mediaSession.setActionHandler('pause', () => this.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous())
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime * 1000)
    })
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  getState(): AudioEngineState {
    return { ...this.state, queue: [...this.state.queue] }
  }

  play(tracks: QueueTrack[], startIndex = 0) {
    if (this.nextHowl) {
      this.nextHowl.unload()
      this.nextHowl = null
      this.nextHowlIndex = -1
    }

    const queue = [...tracks]
    const shuffleOrder = this.state.shuffleEnabled
      ? buildShuffleOrder(queue.length, startIndex)
      : []

    this.setState({
      queue,
      shuffleEnabled: this.state.shuffleEnabled,
      shuffleOrder,
    } as Partial<AudioEngineState> & { shuffleOrder: number[] })
    ;(this.state as unknown as { shuffleOrder: number[] }).shuffleOrder = shuffleOrder
    this.shuffleOrder = shuffleOrder

    this.playAtIndex(startIndex)
  }

  pause() {
    if (!this.howl || !this.state.isPlaying) return
    this.howl.pause()
    this.stopProgressTimer()
    this.setState({ isPlaying: false })
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
  }

  resume() {
    if (!this.howl || this.state.isPlaying) return
    this.howl.play()
    this.startProgressTimer()
    this.setState({ isPlaying: true })
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
    }
  }

  togglePlayPause() {
    if (this.state.isPlaying) this.pause()
    else this.resume()
  }

  seek(positionMs: number) {
    if (!this.howl) return
    const seconds = positionMs / 1000
    this.howl.seek(seconds)
    this.setState({ positionMs })
  }

  setVolume(value: number) {
    const clamped = Math.max(0, Math.min(1, value))
    this.prevVolume = clamped
    this.howl?.volume(clamped)
    this.setState({ volume: clamped, isMuted: false })
  }

  toggleMute() {
    if (this.state.isMuted) {
      this.howl?.volume(this.prevVolume)
      this.setState({ isMuted: false, volume: this.prevVolume })
    } else {
      this.prevVolume = this.state.volume
      this.howl?.volume(0)
      this.setState({ isMuted: true })
    }
  }

  next() {
    const nextIndex = this.getNextIndex()
    if (nextIndex === -1) return
    this.playAtIndex(nextIndex)
  }

  previous() {
    // If more than 3s in, restart current track; otherwise go to previous
    if (this.state.positionMs > 3000) {
      this.seek(0)
      return
    }
    this.playAtIndex(this.getPrevIndex())
  }

  setShuffle(enabled: boolean) {
    const shuffleOrder = enabled
      ? buildShuffleOrder(this.state.queue.length, this.state.queueIndex)
      : []
    this.shuffleOrder = shuffleOrder
    this.setState({ shuffleEnabled: enabled })
  }

  setRepeat(mode: RepeatMode) {
    this.setState({ repeatMode: mode })
  }

  // ── Queue management ──────────────────────────────────────────────────────────

  getQueue(): QueueTrack[] {
    return [...this.state.queue]
  }

  addToQueue(track: QueueTrack) {
    const queue = [...this.state.queue, track]
    this.setState({ queue })
    if (this.state.shuffleEnabled) {
      this.shuffleOrder = buildShuffleOrder(queue.length, this.state.queueIndex)
    }
  }

  removeFromQueue(index: number) {
    const queue = this.state.queue.filter((_, i) => i !== index)
    let queueIndex = this.state.queueIndex
    if (index < queueIndex) queueIndex--
    else if (index === queueIndex) queueIndex = Math.min(queueIndex, queue.length - 1)
    this.setState({ queue, queueIndex })
    if (this.state.shuffleEnabled) {
      this.shuffleOrder = buildShuffleOrder(queue.length, queueIndex)
    }
  }

  reorderQueue(fromIndex: number, toIndex: number) {
    const queue = [...this.state.queue]
    const [moved] = queue.splice(fromIndex, 1)
    queue.splice(toIndex, 0, moved)

    let queueIndex = this.state.queueIndex
    if (fromIndex === queueIndex) {
      queueIndex = toIndex
    } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
      queueIndex--
    } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
      queueIndex++
    }

    this.setState({ queue, queueIndex })
  }

  clearQueue() {
    this.howl?.stop()
    this.howl?.unload()
    this.howl = null
    if (this.nextHowl) {
      this.nextHowl.unload()
      this.nextHowl = null
      this.nextHowlIndex = -1
    }
    this.stopProgressTimer()
    this.shuffleOrder = []
    this.setState({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      positionMs: 0,
      durationMs: 0,
    })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildShuffleOrder(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i).filter((i) => i !== currentIndex)
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return [currentIndex, ...indices]
}

// ── Singleton export ──────────────────────────────────────────────────────────

let engineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine()
  }
  return engineInstance
}
