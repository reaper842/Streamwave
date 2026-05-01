/**
 * Playback-focused AudioEngine tests.
 * Tests play(), pause(), resume(), next(), previous(), handleTrackEnd(),
 * and error handling. Uses instance capture to trigger Howl lifecycle events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mocks + instance capture ──────────────────────────────────────────

const {
  capturedInstances,
  mockHowlPlay,
  mockHowlPause,
  mockHowlStop,
  mockHowlUnload,
  mockHowlLoad,
  mockHowlSeek,
  mockHowlVolume,
  mockHowlDuration,
  mockHowlState,
} = vi.hoisted(() => ({
  capturedInstances: [] as unknown[],
  mockHowlPlay: vi.fn(),
  mockHowlPause: vi.fn(),
  mockHowlStop: vi.fn(),
  mockHowlUnload: vi.fn(),
  mockHowlLoad: vi.fn(),
  mockHowlSeek: vi.fn(),
  mockHowlVolume: vi.fn(),
  mockHowlDuration: vi.fn(() => 180),
  mockHowlState: vi.fn(() => 'loading'),
}))

vi.mock('howler', () => {
  class MockHowl {
    private _onend: (() => void) | null = null
    private _onloaderror: ((id: unknown, err: unknown) => void) | null = null
    private _onload: (() => void) | null = null

    constructor(opts: {
      src: string[]
      html5: boolean
      volume: number
      onload?: () => void
      onloaderror?: (id: unknown, err: unknown) => void
      onplayerror?: (id: unknown, err: unknown) => void
      onend?: () => void
    }) {
      this._onload = opts.onload ?? null
      this._onloaderror = opts.onloaderror ?? null
      this._onend = opts.onend ?? null
      capturedInstances.push(this)
    }

    play = mockHowlPlay
    pause = mockHowlPause
    stop = mockHowlStop
    unload = mockHowlUnload
    load = mockHowlLoad
    seek = mockHowlSeek
    volume = mockHowlVolume
    duration = mockHowlDuration
    state = mockHowlState

    once = (event: string, cb: () => void) => {
      if (event === 'load') this._onload = cb
    }

    _triggerLoad() {
      this._onload?.()
    }
    _triggerEnd() {
      this._onend?.()
    }
    _triggerLoadError(err: string) {
      this._onloaderror?.(null, err)
    }
  }

  return {
    Howl: MockHowl,
    Howler: { volume: vi.fn() },
  }
})

// ── Import after mocking ────────────────────────────────────────────────────────

import { getAudioEngine } from '../engine'
import type { QueueTrack } from '../engine'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTrack(id: string, overrides: Partial<QueueTrack> = {}): QueueTrack {
  return {
    id,
    title: `Track ${id}`,
    artistName: 'Artist',
    albumTitle: 'Album',
    albumCover: null,
    duration_ms: 180_000,
    streamUrl: `https://cdn.example.com/${id}.mp3`,
    ...overrides,
  }
}

function getInstance(index: number) {
  return capturedInstances[index] as {
    _triggerLoad(): void
    _triggerEnd(): void
    _triggerLoadError(err: string): void
  }
}

function clearInstances() {
  capturedInstances.splice(0)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AudioEngine — play() loading', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loading')
    engine = getAudioEngine()
    engine.clearQueue()
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('sets queue, currentTrack, and isLoading=true before load', () => {
    engine.play([makeTrack('t1')], 0)
    const state = engine.getState()
    expect(state.queue).toHaveLength(1)
    expect(state.currentTrack?.id).toBe('t1')
    expect(state.isLoading).toBe(true)
    expect(state.isPlaying).toBe(false)
  })

  it('triggers play and sets isPlaying=true on load event', () => {
    engine.play([makeTrack('t1')], 0)
    expect(capturedInstances).toHaveLength(1)
    getInstance(0)._triggerLoad()
    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
    const state = engine.getState()
    expect(state.isPlaying).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('respects startIndex', () => {
    engine.play([makeTrack('a'), makeTrack('b'), makeTrack('c')], 1)
    expect(engine.getState().currentTrack?.id).toBe('b')
    expect(engine.getState().queueIndex).toBe(1)
  })

  it('immediately plays when howl is already loaded', () => {
    mockHowlState.mockReturnValue('loaded')
    engine.play([makeTrack('t1')], 0)
    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
    expect(engine.getState().isPlaying).toBe(true)
    expect(engine.getState().isLoading).toBe(false)
  })

  it('replaces existing howl when a new play() is called', () => {
    engine.play([makeTrack('t1')], 0)
    vi.clearAllMocks()
    clearInstances()
    engine.play([makeTrack('t2')], 0)
    expect(mockHowlUnload).toHaveBeenCalledTimes(1) // previous howl unloaded
    expect(capturedInstances).toHaveLength(1)
    expect(engine.getState().currentTrack?.id).toBe('t2')
  })
})

describe('AudioEngine — pause() and resume()', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loaded') // immediate playback
    engine = getAudioEngine()
    engine.clearQueue()
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('pause() calls howl.pause() and sets isPlaying=false', () => {
    engine.play([makeTrack('t1')], 0)
    expect(engine.getState().isPlaying).toBe(true)
    engine.pause()
    expect(mockHowlPause).toHaveBeenCalledTimes(1)
    expect(engine.getState().isPlaying).toBe(false)
  })

  it('pause() is a no-op when already paused', () => {
    engine.play([makeTrack('t1')], 0)
    engine.pause()
    vi.clearAllMocks()
    engine.pause()
    expect(mockHowlPause).not.toHaveBeenCalled()
  })

  it('pause() is a no-op when no howl exists', () => {
    engine.pause()
    expect(mockHowlPause).not.toHaveBeenCalled()
  })

  it('resume() calls howl.play() and sets isPlaying=true', () => {
    engine.play([makeTrack('t1')], 0)
    engine.pause()
    vi.clearAllMocks()
    engine.resume()
    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
    expect(engine.getState().isPlaying).toBe(true)
  })

  it('resume() is a no-op when already playing', () => {
    engine.play([makeTrack('t1')], 0)
    expect(engine.getState().isPlaying).toBe(true)
    vi.clearAllMocks()
    engine.resume()
    expect(mockHowlPlay).not.toHaveBeenCalled()
  })

  it('togglePlayPause() pauses when playing', () => {
    engine.play([makeTrack('t1')], 0)
    engine.togglePlayPause()
    expect(engine.getState().isPlaying).toBe(false)
  })

  it('togglePlayPause() resumes when paused', () => {
    engine.play([makeTrack('t1')], 0)
    engine.pause()
    engine.togglePlayPause()
    expect(engine.getState().isPlaying).toBe(true)
  })
})

describe('AudioEngine — next() and previous()', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loaded') // immediate playback
    engine = getAudioEngine()
    engine.clearQueue()
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('next() advances to the next track', () => {
    engine.play([makeTrack('t1'), makeTrack('t2'), makeTrack('t3')], 0)
    engine.next()
    expect(engine.getState().currentTrack?.id).toBe('t2')
    expect(engine.getState().queueIndex).toBe(1)
  })

  it('next() is a no-op at end of queue with no repeat', () => {
    engine.play([makeTrack('t1')], 0)
    engine.next()
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().queueIndex).toBe(0)
  })

  it('next() wraps to start with repeat=all', () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1)
    engine.setRepeat('all')
    engine.next()
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().queueIndex).toBe(0)
  })

  it('previous() restarts current track when positionMs > 3000', () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1)
    engine.seek(5000) // sets positionMs = 5000
    vi.clearAllMocks()
    engine.previous()
    // seek(0) should be called to restart
    expect(mockHowlSeek).toHaveBeenCalledWith(0)
    expect(engine.getState().queueIndex).toBe(1) // still on t2
  })

  it('previous() goes to previous track when positionMs <= 3000', () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1)
    // positionMs starts at 0 (no real timer running)
    engine.previous()
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().queueIndex).toBe(0)
  })

  it('previous() stays on first track if already at start', () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    engine.previous()
    // getPrevIndex() when queueIndex=0 → returns 0
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
  })
})

describe('AudioEngine — handleTrackEnd (via _triggerEnd)', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loading')
    engine = getAudioEngine()
    engine.clearQueue()
    // Reset repeat/shuffle — clearQueue() does NOT reset these; they persist on the singleton
    engine.setRepeat('off')
    engine.setShuffle(false)
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('repeat-one: restarts track on end', async () => {
    engine.setRepeat('one')
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    const howl = getInstance(0)
    howl._triggerLoad()
    vi.clearAllMocks()
    clearInstances()
    howl._triggerEnd()
    // playAtIndex is deferred via queueMicrotask — drain before asserting
    await Promise.resolve()
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(capturedInstances).toHaveLength(1) // new Howl created for same track
    expect(mockHowlUnload).toHaveBeenCalledTimes(1) // old howl unloaded
    expect(mockHowlSeek).not.toHaveBeenCalled() // no seek on old howl
  })

  it('no repeat: stops at end of single-track queue', () => {
    engine.play([makeTrack('t1')], 0)
    const howl = getInstance(0)
    howl._triggerLoad()
    howl._triggerEnd()
    // setState is called synchronously (no playAtIndex, no queueMicrotask)
    expect(engine.getState().isPlaying).toBe(false)
  })

  it('advances to next track at end (no repeat)', async () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    const howl = getInstance(0)
    howl._triggerLoad()
    howl._triggerEnd()
    // playAtIndex is deferred via queueMicrotask — drain before asserting
    await Promise.resolve()
    expect(engine.getState().currentTrack?.id).toBe('t2')
    expect(engine.getState().queueIndex).toBe(1)
  })

  it('repeat-all: wraps from last track to first', async () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1) // start at t2
    engine.setRepeat('all')
    const howl = getInstance(0)
    howl._triggerLoad()
    howl._triggerEnd()
    // playAtIndex is deferred via queueMicrotask — drain before asserting
    await Promise.resolve()
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().queueIndex).toBe(0)
  })

  it('repeat-one: full lifecycle — play() called after new howl loads', async () => {
    engine.setRepeat('one')
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    const initialHowl = getInstance(0)
    initialHowl._triggerLoad()
    expect(engine.getState().isPlaying).toBe(true)

    vi.clearAllMocks()
    clearInstances()

    initialHowl._triggerEnd()
    await Promise.resolve() // drain queueMicrotask → playAtIndex(0) runs

    // State updated: new Howl for t1, waiting for load
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().isLoading).toBe(true)
    expect(engine.getState().isPlaying).toBe(false)
    expect(capturedInstances).toHaveLength(1) // one new Howl created

    // Trigger load on the new Howl → onReady fires → play() called
    getInstance(0)._triggerLoad()

    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
    expect(engine.getState().isPlaying).toBe(true)
    expect(engine.getState().isLoading).toBe(false)
  })

  it('repeat-all: full lifecycle — play() called after new howl loads', async () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1) // start at last track
    engine.setRepeat('all')
    const initialHowl = getInstance(0)
    initialHowl._triggerLoad()
    expect(engine.getState().isPlaying).toBe(true)

    vi.clearAllMocks()
    clearInstances()

    initialHowl._triggerEnd()
    await Promise.resolve() // drain queueMicrotask → playAtIndex(0) runs

    // State updated: new Howl for t1 (wrapped from last to first), waiting for load
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().isLoading).toBe(true)
    expect(engine.getState().isPlaying).toBe(false)
    expect(capturedInstances).toHaveLength(1) // one new Howl created

    // Trigger load on the new Howl → onReady fires → play() called
    getInstance(0)._triggerLoad()

    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
    expect(engine.getState().isPlaying).toBe(true)
    expect(engine.getState().isLoading).toBe(false)
  })

  it('repeat-one: plays immediately when new howl is already loaded (pre-buffer path)', async () => {
    engine.setRepeat('one')
    engine.play([makeTrack('t1')], 0)
    const initialHowl = getInstance(0)
    initialHowl._triggerLoad()
    expect(engine.getState().isPlaying).toBe(true)

    vi.clearAllMocks()
    clearInstances()
    // Simulate pre-buffered howl in loaded state
    mockHowlState.mockReturnValue('loaded')

    initialHowl._triggerEnd()
    await Promise.resolve()

    // onReady() called immediately (state==='loaded' path) — play() already fired
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().isPlaying).toBe(true)
    expect(engine.getState().isLoading).toBe(false)
    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
  })

  it('repeat-all: plays immediately when new howl is already loaded (pre-buffer path)', async () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 1)
    engine.setRepeat('all')
    const initialHowl = getInstance(0)
    initialHowl._triggerLoad()
    expect(engine.getState().isPlaying).toBe(true)

    vi.clearAllMocks()
    clearInstances()
    // Simulate pre-buffered howl in loaded state
    mockHowlState.mockReturnValue('loaded')

    initialHowl._triggerEnd()
    await Promise.resolve()

    // onReady() called immediately (state==='loaded' path) — play() already fired
    expect(engine.getState().queueIndex).toBe(0)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().isPlaying).toBe(true)
    expect(engine.getState().isLoading).toBe(false)
    expect(mockHowlPlay).toHaveBeenCalledTimes(1)
  })

  it('stale-howl guard: onReady is a no-op if a newer playAtIndex supersedes it', async () => {
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    engine.setRepeat('all')
    const initialHowl = getInstance(0)
    initialHowl._triggerLoad()

    vi.clearAllMocks()
    clearInstances()

    initialHowl._triggerEnd()
    await Promise.resolve() // playAtIndex(1) runs, this.howl = newHowl1

    const newHowl1 = getInstance(0)
    // Supersede: start a completely new play() before newHowl1 loads
    engine.play([makeTrack('t3')], 0)
    clearInstances()
    vi.clearAllMocks()

    // Now trigger load on the superseded newHowl1 — onReady guard should fire
    newHowl1._triggerLoad()

    // play() should NOT have been called for the superseded howl
    expect(mockHowlPlay).not.toHaveBeenCalled()
    expect(engine.getState().currentTrack?.id).toBe('t3')
  })
})

describe('AudioEngine — error handling', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loading')
    engine = getAudioEngine()
    engine.clearQueue()
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('retries up to MAX_RETRIES on load error', () => {
    engine.play([makeTrack('t1')], 0)
    const howl = getInstance(0)
    // 3 retries: retryCount goes 0→1, 1→2, 2→3
    howl._triggerLoadError('Network error')
    howl._triggerLoadError('Network error')
    howl._triggerLoadError('Network error')
    // mockHowlLoad is called on each retry
    expect(mockHowlLoad).toHaveBeenCalledTimes(3)
    // Error not yet set (still retrying)
    expect(engine.getState().error).toBeNull()
  })

  it('sets error state after MAX_RETRIES exceeded', () => {
    engine.play([makeTrack('t1')], 0)
    const howl = getInstance(0)
    // 4 errors: 3 retries + 1 that exceeds MAX_RETRIES
    howl._triggerLoadError('Network error')
    howl._triggerLoadError('Network error')
    howl._triggerLoadError('Network error')
    howl._triggerLoadError('Network error')
    const state = engine.getState()
    expect(state.error).toBe('Network error')
    expect(state.isPlaying).toBe(false)
    expect(state.isLoading).toBe(false)
  })
})

describe('AudioEngine — seek()', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    clearInstances()
    mockHowlState.mockReturnValue('loaded')
    engine = getAudioEngine()
    engine.clearQueue()
    clearInstances()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('seek() calls howl.seek with value in seconds', () => {
    engine.play([makeTrack('t1')], 0)
    engine.seek(60_000)
    expect(mockHowlSeek).toHaveBeenCalledWith(60)
    expect(engine.getState().positionMs).toBe(60_000)
  })

  it('seek() is a no-op when no howl exists', () => {
    engine.seek(30_000) // no track playing
    expect(mockHowlSeek).not.toHaveBeenCalled()
  })
})
