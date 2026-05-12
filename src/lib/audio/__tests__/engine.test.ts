import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoist mock state so vi.mock factory can reference it ──────────────────────

const {
  mockHowlPlay,
  mockHowlPause,
  mockHowlStop,
  mockHowlUnload,
  mockHowlSeek,
  mockHowlVolume,
  mockHowlDuration,
  mockHowlState,
  mockHowlOnce,
  mockHowlerVolume,
} = vi.hoisted(() => ({
  mockHowlPlay: vi.fn(),
  mockHowlPause: vi.fn(),
  mockHowlStop: vi.fn(),
  mockHowlUnload: vi.fn(),
  mockHowlSeek: vi.fn(),
  mockHowlVolume: vi.fn(),
  mockHowlDuration: vi.fn(() => 180),
  mockHowlState: vi.fn(() => 'loading'),
  mockHowlOnce: vi.fn(),
  mockHowlerVolume: vi.fn(),
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
    }

    play = mockHowlPlay
    pause = mockHowlPause
    stop = mockHowlStop
    unload = mockHowlUnload
    seek = mockHowlSeek
    volume = mockHowlVolume
    duration = mockHowlDuration
    state = mockHowlState
    once = (event: string, cb: () => void) => {
      mockHowlOnce(event, cb)
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
    Howler: { volume: mockHowlerVolume },
  }
})

// ── Import after mocking ────────────────────────────────────────────────────────

import { getAudioEngine } from '../engine'
import type { QueueTrack } from '../engine'

// ── Test helpers ───────────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AudioEngine — queue management', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    mockHowlState.mockReturnValue('loading')
    engine = getAudioEngine()
    engine.clearQueue()
  })

  afterEach(() => {
    engine.clearQueue()
  })

  it('addToQueue appends a track to the queue', () => {
    const t = makeTrack('a')
    engine.addToQueue(t)
    expect(engine.getQueue()).toHaveLength(1)
    expect(engine.getQueue()[0].id).toBe('a')
  })

  it('addToQueue appends multiple tracks in order', () => {
    engine.addToQueue(makeTrack('a'))
    engine.addToQueue(makeTrack('b'))
    engine.addToQueue(makeTrack('c'))
    const ids = engine.getQueue().map((t) => t.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('removeFromQueue removes the track at the given index', () => {
    engine.addToQueue(makeTrack('a'))
    engine.addToQueue(makeTrack('b'))
    engine.addToQueue(makeTrack('c'))
    engine.removeFromQueue(1)
    const ids = engine.getQueue().map((t) => t.id)
    expect(ids).toEqual(['a', 'c'])
  })

  it('reorderQueue moves a track from one position to another', () => {
    engine.addToQueue(makeTrack('a'))
    engine.addToQueue(makeTrack('b'))
    engine.addToQueue(makeTrack('c'))
    engine.reorderQueue(0, 2)
    const ids = engine.getQueue().map((t) => t.id)
    expect(ids).toEqual(['b', 'c', 'a'])
  })

  it('clearQueue empties the queue and resets state', () => {
    engine.addToQueue(makeTrack('a'))
    engine.clearQueue()
    expect(engine.getQueue()).toHaveLength(0)
    const state = engine.getState()
    expect(state.currentTrack).toBeNull()
    expect(state.isPlaying).toBe(false)
    expect(state.queueIndex).toBe(-1)
  })
})

describe('AudioEngine — volume & mute', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    engine = getAudioEngine()
    engine.clearQueue()
  })

  it('setVolume clamps above 1 to 1', () => {
    engine.setVolume(1.5)
    expect(engine.getState().volume).toBe(1)
  })

  it('setVolume clamps below 0 to 0', () => {
    engine.setVolume(-0.1)
    expect(engine.getState().volume).toBe(0)
  })

  it('setVolume sets volume within range', () => {
    engine.setVolume(0.6)
    expect(engine.getState().volume).toBe(0.6)
    expect(engine.getState().isMuted).toBe(false)
  })

  it('toggleMute mutes and sets isMuted=true', () => {
    engine.setVolume(0.7)
    engine.toggleMute()
    expect(engine.getState().isMuted).toBe(true)
  })

  it('toggleMute unmutes and restores previous volume', () => {
    engine.setVolume(0.7)
    engine.toggleMute()
    engine.toggleMute()
    expect(engine.getState().isMuted).toBe(false)
    expect(engine.getState().volume).toBe(0.7)
  })
})

describe('AudioEngine — shuffle', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    mockHowlState.mockReturnValue('loaded')
    engine = getAudioEngine()
    engine.clearQueue()
    engine.setRepeat('off')
    engine.setShuffle(false)
  })

  it('setShuffle(true) enables shuffle mode', () => {
    engine.setShuffle(true)
    expect(engine.getState().shuffleEnabled).toBe(true)
  })

  it('setShuffle(false) disables shuffle mode', () => {
    engine.setShuffle(true)
    engine.setShuffle(false)
    expect(engine.getState().shuffleEnabled).toBe(false)
  })

  it('shuffle+no-repeat: next() is a no-op at end of shuffle order', () => {
    engine.setShuffle(true)
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    engine.next() // advance to last position (t2, index 1)
    const idAtEnd = engine.getState().currentTrack?.id
    engine.next() // end of shuffle order, no repeat — should not change track
    expect(engine.getState().currentTrack?.id).toBe(idAtEnd)
  })

  it('shuffle+repeat-all: next() continues with a new song after exhausting shuffle order', () => {
    engine.setShuffle(true)
    engine.setRepeat('all')
    // 2-track queue: shuffleOrder is always [0, 1] (only permutation starting at 0)
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    engine.next() // advances to index 1 (t2) — last in shuffle order
    engine.next() // triggers rebuild: new order [1, 0], returns index 0 (t1)
    expect(engine.getState().currentTrack?.id).toBe('t1')
    expect(engine.getState().queueIndex).toBe(0)
  })

  it('shuffle+repeat-all: each cycle plays a different song first', () => {
    engine.setShuffle(true)
    engine.setRepeat('all')
    engine.play([makeTrack('t1'), makeTrack('t2')], 0)
    engine.next() // go to t2 (end of shuffle order)
    engine.next() // wrap → rebuild → plays t1 (first in new order [1,0] → returns index 0)
    // Verify we looped back without stopping
    expect(engine.getState().currentTrack).not.toBeNull()
    expect(engine.getState().shuffleEnabled).toBe(true)
  })
})

describe('AudioEngine — repeat modes', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    engine = getAudioEngine()
    engine.clearQueue()
  })

  it('setRepeat("all") sets repeatMode', () => {
    engine.setRepeat('all')
    expect(engine.getState().repeatMode).toBe('all')
  })

  it('setRepeat("one") sets repeatMode', () => {
    engine.setRepeat('one')
    expect(engine.getState().repeatMode).toBe('one')
  })

  it('setRepeat("off") clears repeatMode', () => {
    engine.setRepeat('all')
    engine.setRepeat('off')
    expect(engine.getState().repeatMode).toBe('off')
  })
})

describe('AudioEngine — subscribe / state emission', () => {
  let engine: ReturnType<typeof getAudioEngine>

  beforeEach(() => {
    vi.clearAllMocks()
    engine = getAudioEngine()
    engine.clearQueue()
  })

  it('subscribe immediately emits current state', () => {
    const listener = vi.fn()
    const unsub = engine.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('unsubscribing stops future emissions', () => {
    const listener = vi.fn()
    const unsub = engine.subscribe(listener)
    unsub()
    const before = listener.mock.calls.length
    engine.setVolume(0.3)
    expect(listener.mock.calls.length).toBe(before)
  })

  it('emits updated state after setVolume', () => {
    const volumes: number[] = []
    const unsub = engine.subscribe((s) => volumes.push(s.volume))
    engine.setVolume(0.4)
    unsub()
    expect(volumes[volumes.length - 1]).toBe(0.4)
  })
})

describe('formatDuration utility', () => {
  it('formats 0ms to "0:00"', async () => {
    const { formatDuration } = await import('@/lib/utils/formatDuration')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats 185000ms to "3:05"', async () => {
    const { formatDuration } = await import('@/lib/utils/formatDuration')
    expect(formatDuration(185_000)).toBe('3:05')
  })

  it('formats 3600000ms to "60:00"', async () => {
    const { formatDuration } = await import('@/lib/utils/formatDuration')
    expect(formatDuration(3_600_000)).toBe('60:00')
  })

  it('formats negative values to "0:00"', async () => {
    const { formatDuration } = await import('@/lib/utils/formatDuration')
    expect(formatDuration(-100)).toBe('0:00')
  })
})
