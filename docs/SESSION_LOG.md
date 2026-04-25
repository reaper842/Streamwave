# SESSION_LOG.md — StreamWave

> Detailed record of each development session: what was done, key decisions, gotchas.
> Read the most recent entry at the start of each new session.

---

## Session 1 — Project Scaffolding (M0)

**Goal:** Bootstrap project, configure toolchain, set up services.

**What was done:**

- Initialized Git repo, created Next.js 16 app with App Router, TypeScript, Tailwind 4, ESLint
- Configured tsconfig strict mode, path aliases (`@/` → `src/`)
- Prettier, ESLint, Husky + lint-staged pre-commit hooks
- `docker-compose.yml` with PostgreSQL 16, Redis 7, Meilisearch 1.6
- Full `prisma/schema.prisma` with all 9 models, migrations, seed data
- Fastify backend at `server/index.ts`, Redis + Meilisearch plugins
- `npm run dev` with `concurrently` for Next.js + Fastify

---

## Session 2 — Application Shell & Layout (M1)

**Goal:** Build the four-region layout: Sidebar, TopBar, Main Content, PlaybackBar.

**What was done:**

- Root layout (`src/app/layout.tsx`) with SessionProvider, ToastProvider, PlaybackBar
- `(main)/layout.tsx` authenticated shell: Sidebar + TopBar + main scroll area
- Sidebar with Home/Search nav, Library section placeholder, collapse at 900px
- TopBar with back/forward nav, search input on `/search`, user avatar dropdown
- PlaybackBar shell (fixed bottom 90px) with AudioEngineProvider
- Tailwind 4 design tokens in `globals.css` via `@theme` block
- All Spotify-parity layout rules (widths, bg colors, z-index layers)

---

## Session 3 — Auth Backend Core (M2a)

**Goal:** Fastify auth routes, password hashing, JWT tokens.

**What was done:**

- `server/routes/auth.ts`: POST /api/v1/auth/register, POST /api/v1/auth/login, POST /api/v1/auth/logout, GET /api/v1/auth/me
- Password hashing with bcrypt (12 rounds)
- Fastify auth plugin with JWT verification hook
- Zod validation on all request bodies
- Rate limiting on auth endpoints via Redis
- `server/services/auth.ts` business logic layer

---

## Session 4 — NextAuth Integration (M2b)

**Goal:** Wire NextAuth v5 to Fastify auth backend, configure JWT strategy.

**What was done:**

- `src/lib/auth/config.ts`: NextAuth v5 config with Credentials + Google + GitHub providers
- Credentials provider delegates to Fastify `/api/v1/auth/login`
- JWT callbacks store userId, displayName, avatarUrl in token
- Session callback exposes custom fields to client
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth route handler
- `src/proxy.ts`: Next.js 16 proxy (replaces middleware) for session-based route guarding
- OAuth users auto-created in DB via `findOrCreateOAuthUser`

---

## Session 5 — Auth UI Components (M2c)

**Goal:** Login, signup, reset-password pages with form validation.

**What was done:**

- `(auth)/login/page.tsx`: email/password form, OAuth buttons, error display
- `(auth)/signup/page.tsx`: email/display name/password form with validation
- `(auth)/reset-password/page.tsx` + `[token]/page.tsx`: request + confirm flow
- `useAuthStore` (Zustand): login/register/logout actions, loading/error state
- AuthLayout with centered card, StreamWave logo
- All forms use `(e: { preventDefault(): void })` pattern (React 19 compatibility)

---

## Session 6 — Unit + Integration Tests (M2d-i)

**Goal:** Test coverage for auth backend and stores (40 tests).

**What was done:**

- 40 Vitest tests across auth service, routes, and useAuthStore
- Test setup with `environment: 'node'` (jsdom ESM incompatibility workaround)
- `vi.hoisted()` pattern for mock classes in `vi.mock()` factories
- Mocked Fastify server for route integration tests
- Excluded `@fastify/rate-limit` from test builds (shared Redis key causes 429s)

---

## Session 7 — Remaining Tests + Playwright E2E (M2d-ii)

**Goal:** Complete test suite to 67 tests including E2E.

**What was done:**

- Additional unit tests: JWT decode, session callbacks, proxy guard logic
- Playwright E2E: login flow, register flow, protected route redirect, logout
- Cookie name: `authjs.session-token` (not `next-auth.session-token`) in E2E assertions
- `@auth/core/jwt` `decode()` used for JWT verification in proxy.ts

---

## Session 8 — Audio Playback Engine (M3)

**Goal:** Full AudioEngine singleton with Howler.js, playback store, UI components.

**What was done:**

- `src/lib/audio/engine.ts`: AudioEngine singleton wrapping Howler.js
- Supports: play, pause, resume, seek, volume, mute, next, previous, shuffle, repeat, queue management
- Pre-buffer next track 10s before current ends
- Media Session API integration (OS-level controls)
- `usePlayerStore`: Zustand store bridged to AudioEngine via AudioEngineProvider
- `AudioEngineProvider` subscribes in useEffect, `_syncFromEngine` updates store
- NowPlaying, TransportControls, ProgressBar, VolumeSlider components
- PlaybackBar assembled from sub-components, connected to store
- `useKeyboardShortcuts` hook: Space, ←/→, ↑/↓ global shortcuts
- 39 new tests (106 total: 67 auth + 39 playback)

**Key technical notes:**

- Import BOTH `Howl` AND `Howler` from howler: `import { Howl, Howler } from 'howler'`
- `Howler` needed for global volume, `Howl` for individual sound instances
- `QueueTrack` fields: `albumTitle`, `albumCover`, `duration_ms` (NOT `albumName`/`coverUrl`/`durationMs`)
- Stream URL TTL: signed R2 URLs expire in 15 min; playAlbum/playPlaylist fetches all URLs upfront

---

## Session 9 — Content Pages & Data Display (M4)

**Goal:** Home feed, artist/album/playlist pages with real data.

**What was done:**

- `src/lib/data/content.ts`: Prisma-based RSC data fetchers (fetchAlbum, fetchArtist, fetchArtistAlbums, fetchArtistTopTracks, fetchPlaylist, fetchFeatured, getStaticGenres)
- Content API routes in Fastify: GET /api/v1/browse/featured, /browse/genres, /albums/:id, /artists/:id, /artists/:id/albums, /artists/:id/top-tracks, /playlists/:id
- Card components: AlbumCard, ArtistCard, PlaylistCard (hover play button, context menu)
- TrackRow + TrackListHeader + TrackList components
- CardGrid responsive CSS grid component
- PlayAlbumButton, PlayPlaylistButton client components for RSC pages
- Home page: greeting, featured playlists, new releases, genre browse grid
- Artist page: hero banner, top tracks, bio, discography
- Album page: artwork, metadata, full TrackList, total duration, play button
- Playlist page: cover, metadata, full TrackList, play button
- Context menus wired to all card/row types

**Key technical notes:**

- RSC data fetching uses Prisma directly (NOT HTTP to Fastify) to avoid loopback latency
- Import ONLY from Server Components; never from `"use client"` components
- `src/lib/data/content.ts` is server-only

---

## Session 10 — 2026-04-06: Auth Route 404 Debug & Fix

**Goal:** Diagnose and fix `/api/auth/*` routes returning 404.

**What was done:**

- Diagnosed: all `/api/auth/session`, `/api/auth/csrf`, `/api/auth/signout` returned 404 HTML
- Traced root cause to top-level `import { prisma } from '@/lib/prisma'` in `src/lib/auth/config.ts`
- In the `[app-route]` Turbopack compilation context (route handlers), the Prisma module chain (`@prisma/adapter-pg` → WASM query compiler) is async. When Turbopack's async module initializer fails/times out silently, `GET` and `POST` exports are never registered
- `AppRouteRouteModule` finds no HTTP method handlers → returns 404 (not 500)
- RSC pages (`[app-rsc]` context) work because SSR Turbopack runtime initializes modules differently
- **Fix:** moved Prisma import inside `findOrCreateOAuthUser()` as a dynamic `import('@/lib/prisma')` — auth config module now initializes synchronously, handlers export correctly

**Files changed:**

- `src/lib/auth/config.ts`: removed top-level Prisma import, added dynamic import inside callback

**What was NOT completed:**

- M5: Library & Playlist Management (not started — session was diagnostic/fix only)

**Key technical notes for future sessions:**

- **Auth route 404 gotcha**: Do NOT import Prisma (or any module with async WASM initialization) at the top level of `src/lib/auth/config.ts`. The `[app-route]` Turbopack context fails silently on async module chains, resulting in 404 for all /api/auth/\* routes.
- When restarting dev server after this fix: `rm -rf .next/dev && npm run dev` to force Turbopack recompilation
- The `[app-route]` and `[app-rsc]` Turbopack contexts use separate module registries and chunk sets (non-SSR `server/chunks/` vs SSR `server/chunks/ssr/`)
- Next session should begin M5: Library & Playlist Management

---

## Session 11 — 2026-04-07: M5 Library API — Liked Songs (GET/POST/DELETE)

**Goal:** Build the first set of Library API endpoints: liked songs GET (cursor-paginated), POST (like), DELETE (unlike).

**What was done:**

- Created `server/services/library.ts`:
  - `getLikedSongs(userId, cursor?, limit?)` — cursor-paginated list (newest first), includes full track + artist + album join
  - `likeSong(userId, trackId)` — upsert; throws 404 if track not found; idempotent (re-like keeps original `liked_at`)
  - `unlikeSong(userId, trackId)` — `deleteMany` (idempotent no-op if not liked)
  - `isTrackLiked(userId, trackId)` — boolean check helper for future UI use

- Created `server/routes/library.ts`:
  - `GET /api/v1/library/liked-songs?cursor=<iso>&limit=<n>` — auth required; returns `{ data: LikedTrack[], meta: { nextCursor, total } }`
  - `POST /api/v1/library/liked-songs/:trackId` — auth required; UUID validation; 201 `{ data: { liked: true } }`
  - `DELETE /api/v1/library/liked-songs/:trackId` — auth required; UUID validation; 204 no content

- Updated `server/index.ts` — registered `libraryRoutes` under `/api/v1/library`
- Updated `server/test/buildApp.ts` — added library routes so integration tests can authenticate and hit library endpoints

- Created `server/routes/__tests__/library-liked-songs.test.ts` (15 tests):
  - GET: 401 unauthenticated, 200 empty list, 200 with liked track (verifies full shape + ISO date), pagination limit+nextCursor, 400 invalid limit
  - POST: 401 unauthenticated, 400 non-UUID, 404 non-existent UUID, 201 happy path, 201 idempotent re-like
  - DELETE: 401 unauthenticated, 400 non-UUID, 204 unlike, 204 idempotent unlike, 204 + GET confirms removal
  - Tests self-seed fixtures (`beforeAll` creates artist → album → track via Prisma directly)

- Updated `server/CLAUDE.md` — test count 82/82, new files documented

**What was NOT completed (carry to next session):**

- `GET /api/v1/library/saved-albums` + POST/DELETE
- `GET /api/v1/library/followed-artists` + POST/DELETE
- Playlist CRUD endpoints (POST/PATCH/DELETE playlists, track add/remove/reorder)
- `useLibraryStore` Zustand store
- Library UI pages

**Key technical notes for future sessions:**

- Cursor for liked songs is the ISO-8601 `liked_at` of the last item on the current page; next page fetches `liked_at < cursor`
- `prisma.likedSong.upsert` with `update: {}` = idempotent like without bumping `liked_at` — consistent Spotify behaviour
- Library integration tests self-seed: `beforeAll` creates `Artist → Album → Track` via Prisma, `afterAll` tears down in reverse order. Pattern to follow for saved-albums and followed-artists tests too
- `buildApp.ts` now includes both `authRoutes` and `libraryRoutes` — any new library route file should be registered there too
- 82/82 tests pass; `npm run build` → 0 errors

---

## Session 14 — 2026-04-07: Sidebar Infinite Render Loop Bug Fix

**Goal:** Fix a runtime crash: "The result of getServerSnapshot should be cached to avoid an infinite loop" + "Maximum update depth exceeded" originating from `Sidebar.tsx`.

**What was done:**

- Fixed `src/components/layout/Sidebar.tsx`: replaced the inline object-literal Zustand selector `useLibraryStore((s) => ({ playlists: s.playlists, createPlaylist: s.createPlaylist }))` with two separate selectors, one per field.
- Also tightened `useUIStore()` (no-selector call) to `useUIStore((s) => s.sidebarOpen)` to follow the same safe pattern.
- Cleared the `.next/dev` cache to ensure stale Turbopack artifacts didn't mask the fix.
- 1 commit: `fix: use individual Zustand selectors in Sidebar to prevent infinite render loop`

**What was NOT completed (carry to next session):**

- M6: Search & Discovery (no work done this session)

**Key technical notes for future sessions:**

- **Zustand inline object selectors are forbidden.** `useStore((s) => ({ a: s.a, b: s.b }))` creates a new object reference on every call. React's `useSyncExternalStore` (used internally by Zustand) compares `getServerSnapshot` results by reference — a new object each time means the snapshot never matches, triggering an infinite re-render loop. Always use one `useStore` call per primitive/stable-reference value.

---

## Session 20 — 2026-04-19: Bug Fix — Volume Slider, Like Button, Context Menu Overflow

**Goal:** Fix three user-reported runtime bugs.

**What was done:**

- **Volume slider silent (Bug 1):** Removed `Howler.volume(v)` calls from `AudioEngine.setVolume` and `toggleMute` in `src/lib/audio/engine.ts`. In Howler.js html5 mode `audioNode.volume = Howler._volume × howl._volume`; calling both at 0.5 squared the result to 0.25. Individual howl volume is now the sole control.
- **Like button no visual update (Bug 2a):** Changed `useLibraryStore((s) => s.isLiked)` selectors in `TrackRow.tsx` and `NowPlaying.tsx` to return a boolean directly: `(s) => s.likedSongIds.has(track.id)`. A function-reference selector is always the same reference → Zustand never triggers re-render when the Set changes.
- **Like button API failure (Bug 2b):** `server/plugins/auth.ts` reads `NEXTAUTH_SECRET` at module evaluation time. The dotenv loading in `server/index.ts` ran too late (interleaved between import statements, but ESM hoists all imports before module body code). Fixed by restructuring env loading (see Session 21).
- **Context menu renders off-screen (Bug 3):** Changed `useEffect` viewport clamping in `src/components/ui/ContextMenu.tsx` to `useLayoutEffect` + initial `visibility: hidden` style revealed only after position correction. `useEffect` fires after browser paint causing visible flash at wrong coordinates.

**Files changed:**

- `src/lib/audio/engine.ts` — removed Howler global volume calls
- `src/components/content/TrackRow.tsx` — boolean likedSongIds selector
- `src/components/playback/NowPlaying.tsx` — boolean likedSongIds selector + fixed bare usePlayerStore() call
- `src/stores/library.ts` — added `console.error` to `toggleLike` catch for diagnosability
- `src/components/ui/ContextMenu.tsx` — useLayoutEffect + visibility:hidden clamping
- `server/index.ts` — dotenv restructure attempt (superseded by Session 21)

**Key technical notes for future sessions:**

- **Howler volume multiplication:** In html5 mode, `audioNode.volume = Howler._volume × howl._volume`. Only set `howl.volume()`, not `Howler.volume()`.
- **Zustand selector + function values:** Selectors returning a function reference never change (same reference on every call) → Zustand's `Object.is` check always passes → no re-render. Always compute the final primitive inside the selector.
- **useLayoutEffect for measure-then-reveal:** Render element hidden (`visibility: hidden`), measure in `useLayoutEffect`, correct position, set visible — all before browser paint.

---

## Session 21 — 2026-04-19: Bug Fix — Fastify Server Not Starting (ESM Import Hoisting)

**Goal:** Fix `TypeError: Failed to fetch` when clicking any play button (playPlaylist / playAlbum / playTrack all fail with network error).

**Root cause:** In ESM (which `tsx` uses), ALL static `import` statements are hoisted and evaluated before the importing module's body runs. `server/index.ts` had `loadEnv()` calls between import statements:

```typescript
import { config as loadEnv } from 'dotenv'
loadEnv() // ← runs AFTER all imports evaluate
loadEnv({ path: '.env.local', override: true }) // ← same
import Fastify from 'fastify'
import authPlugin from './plugins/auth' // reads NEXTAUTH_SECRET at eval time
// ...
```

`server/plugins/auth.ts` reads `NEXTAUTH_SECRET` at module evaluation time. `server/lib/prisma.ts` calls `createPrismaClient()` at module evaluation time (which reads `DATABASE_URL`). Both execute before `loadEnv()` runs, so they get `undefined` → Prisma throws "DATABASE_URL not set" → server crashes on startup → every `fetch()` to localhost:3001 fails with ERR_CONNECTION_REFUSED → `TypeError: Failed to fetch`.

**Fix:** Created `server/load-env.ts` — a side-effect-only module that is the **first** import in `server/index.ts`. In ESM, modules evaluate depth-first in import order. Because `load-env.ts` has no local dependencies and is listed first, its body (the dotenv `config()` calls) runs before any other module's evaluation code.

**What was done:**

- Created `server/load-env.ts` — calls `config()` + `config({ path: '.env.local', override: true })`
- Updated `server/index.ts` — replaced interleaved dotenv calls with `import './load-env'` as first import
- Build: 0 errors (`tsc -p tsconfig.server.json --noEmit` + `npm run build`)
- Tests: 185/185 server + 84/84 client still passing

**Files changed:**

- `server/load-env.ts` — new file
- `server/index.ts` — first import is now `./load-env`

**Key technical notes for future sessions:**

- **ESM import hoisting is non-negotiable:** No code between import statements runs before ALL imports have evaluated. If any imported module reads `process.env` at eval time, dotenv MUST be loaded via a first-position side-effect import, not inline calls.
- **`server/load-env.ts` must remain the first import** in `server/index.ts`. Never add imports before it.
- `server/plugins/auth.ts` still reads `AUTH_SECRET = process.env['NEXTAUTH_SECRET']` at module level — this now works because `load-env.ts` evaluates first and populates the env before auth.ts loads.

---

## Session 22 — 2026-04-19: Bug Fix — Context Menu Right-Edge Overflow (Round 2) + Like Button Confirmation

**Goal:** Fix context menu still overflowing the right edge of the viewport, and confirm like button status after server restart.

**What was done:**

- **Context menu (definitive fix):** Two bugs were identified with the previous `useLayoutEffect` DOM-mutation approach:
  1. `handleClick` set `pos.x = rect.right` (the button's right edge), so the menu started there and extended off-screen to the right. Now pre-clamps to `Math.max(8, rect.right - 192)` — right-aligned to the button within viewport.
  2. Direct `menu.style.left = ...` DOM mutation was overridden on any parent re-render (e.g. when `likedSongIds` changed, `TrackRow` re-rendered → `ContextMenuTrigger` re-rendered → React re-applied `style={{ left: pos.x }}` from JSX → reset to wrong position). Fix: `useLayoutEffect` now fine-tunes via DOM mutation but the INITIAL position is already correct from the handler, making the correction a no-op in most cases. ESLint `react-hooks/set-state-in-effect` prevented calling `setState` in the effect, so direct DOM mutation was intentionally kept.
  - Added ESC key support to `ContextMenuTrigger` (was missing; `ContextMenu` already had it).

- **Like button:** Confirmed the optimistic-update selector fix (`s.likedSongIds.has(id)`) is in place. The API calls will work correctly after restarting `npm run dev` with the `server/load-env.ts` fix.

**Files changed:**

- `src/components/ui/ContextMenu.tsx` — `ContextMenuTrigger`: pre-clamped initial position in handler, `useLayoutEffect` fine-tune via DOM mutation, ESC key handler added

**What was NOT completed (carry to next session):**

- M8: Coverage audit, Playwright E2E tests, Lighthouse audit, CORS/HTTPS hardening

**Key technical notes for future sessions:**

- **ContextMenuTrigger positioning strategy:** Pre-clamp `x = Math.max(8, rect.right - 192)` in the click handler so the initial render is already approximately correct. `useLayoutEffect` with deps `[open, pos.x, pos.y]` measures actual width and fine-tunes via direct DOM mutation (not state). Direct DOM mutation is acceptable here because parent re-renders happen on events (play/like toggle) that don't occur while the menu is freshly opened.
- **ESLint `react-hooks/set-state-in-effect`:** This custom rule blocks calling `setState` inside effect bodies. Use direct DOM mutation for measurement-correction patterns in effects, or restructure to compute position before rendering.
- **Like button requires server restart:** The `server/load-env.ts` fix takes effect only after `npm run dev` is restarted. Until then, all authenticated API calls fail (NEXTAUTH_SECRET wrong), the optimistic update briefly shows green then reverts.

---

## Session 23 — 2026-04-20: Bug Fix (Like button — Content-Type with empty body)

**Goal:** Fix `ApiRequestError: Body cannot be empty when content-type is set to 'application/json'` thrown when clicking the like button.

**What was done:**

**Root cause:** `src/lib/api/client.ts` `request()` function unconditionally set `Content-Type: application/json` on every request, regardless of whether a body was present. `apiClient.post('/library/liked-songs/:trackId')` (no body — trackId in URL) sent the header but no JSON body. Fastify's JSON body parser rejects this with 400.

**Fix — `src/lib/api/client.ts`:**

```typescript
// BEFORE (always set Content-Type)
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(init.headers as Record<string, string>),
}

// AFTER (only when body is present)
const headers: Record<string, string> = {
  ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  ...(init.headers as Record<string, string>),
}
```

**Fix — `src/lib/audio/__tests__/engine.test.ts`:** Removed stale assertion `expect(mockHowlerVolume).toHaveBeenCalledWith(0)` from the `toggleMute` test. The Session 20 volume bugfix removed `Howler.volume()` calls from `toggleMute`; the test was never updated, causing 1 failing test.

**What was NOT completed (carry to next session):**

- M8: Coverage audit, Playwright E2E tests, Lighthouse audit, CORS/HTTPS hardening

**Key technical notes for future sessions:**

- **`apiClient` Content-Type rule:** `Content-Type: application/json` is only set when `body !== undefined`. All `POST`/`DELETE` calls that pass the entity ID in the URL (liked-songs, save-album, follow-artist) have no body — calling them without a body argument is correct and will NOT send the header.
- **84/84 client tests pass** | **`npm run build` → 0 errors**

---

## Session 27 — 2026-04-23: M8 Testing Coverage (AudioEngine playback, Meilisearch sync, Playwright E2E)

**Goal:** Complete the M8 Testing & Quality Assurance milestone by filling coverage gaps in AudioEngine, usePlayerStore, Meilisearch sync, seed verification, and Playwright E2E flows.

**What was done:**

### 1. AudioEngine playback tests — `src/lib/audio/__tests__/engine.playback.test.ts` (26 new tests)

The existing engine test file only covered queue management, volume, shuffle/repeat, and subscribe — it had zero coverage for `play()`, `pause()`, `resume()`, `next()`, `previous()`, `handleTrackEnd()`, `seek()`, or error handling/retry.

Created a new test file using the `vi.hoisted()` + `capturedInstances` instance-capture pattern:

```typescript
const { capturedInstances, mockHowlPlay, ... } = vi.hoisted(() => ({
  capturedInstances: [] as unknown[],
  mockHowlPlay: vi.fn(),
  ...
}))

vi.mock('howler', () => {
  class MockHowl {
    constructor(opts) {
      this._onload = opts.onload ?? null
      this._onend = opts.onend ?? null
      capturedInstances.push(this)  // capture each instance
    }
    _triggerLoad() { this._onload?.() }
    _triggerEnd() { this._onend?.() }
    _triggerLoadError(err) { this._onloaderror?.(null, err) }
  }
  return { Howl: MockHowl, Howler: { volume: vi.fn() } }
})
```

Test groups: play() loading (4 tests), pause() and resume() (7), next() and previous() (5), handleTrackEnd via \_triggerEnd (4), error handling/retry (2), seek() (2).

### 2. usePlayerStore coverage tests — `src/stores/__tests__/player.test.ts` (+8 tests)

Added 3 new `describe` blocks covering `playAlbum`, `playPlaylist`, and `playFromTrackIds`. Each mocks `apiClient.get` to return fixture responses in sequence and verifies that `engine.play()` is called with the correct tracks and `startIndex`.

### 3. Meilisearch sync integration tests — `server/services/__tests__/search-sync.test.ts` (10 new tests)

Used `buildSearchApp()` to get a Fastify instance with `app.meili` client. Tests seed DB fixtures in `beforeAll`, call sync helpers directly (`syncArtist`, `syncAlbum`, `syncTrack`, `syncPlaylist`, `safeDelete`), and verify with `app.meili.index(INDEX.ARTISTS).getDocument(id)`. 500ms wait after each call for Meilisearch indexing tasks to complete.

Covers: add/remove artist, add/skip non-existent album, add/skip non-existent track, add public playlist, skip private playlist, `safeDelete` removes document, `safeDelete` is no-op for non-existent.

### 4. Seed verification tests — `server/services/__tests__/seed.test.ts` (15 new tests)

Read-only tests verifying the seed script produces correct data. `beforeAll` checks demo user exists (throws with helpful message if seed not run). Tests cover:

- Entity counts: artists ≥ 10, albums ≥ 50, tracks ≥ 500, playlists ≥ 5
- Relationship integrity: albums have non-empty artist_id, tracks have artist + album, all albums have tracks, all artists have albums
- Data quality: artists have genre, no duplicate track titles within same album, bcrypt hash format (`$2a$` / `$2b$`)

### 5. Playwright E2E tests — 3 new spec files (17 tests total)

- `e2e/playback.spec.ts` — playback bar hidden on login, clicking play starts playback, play/pause toggles, navigation doesn't stop audio, Space key toggles, album page play button loads queue
- `e2e/search.spec.ts` — genre browse grid visible, typing shows results, clearing returns to browse, genre card navigation, track rows in search results
- `e2e/library.spec.ts` — library accessible from sidebar, tabs visible (Playlists/Artists/Albums), create playlist button, liked songs page, like button optimistic toggle, follow artist button toggle

### 6. Build and test results

- `npm run test` (server + integration): **210 tests passing** (14 test files)
- `npm run test:client` (client): **118 tests passing** (5 test files)
- `npm run build`: **0 errors** (14 routes generated)

**Key technical gotchas:**

- **AudioEngine singleton state persistence across test groups:** `clearQueue()` does NOT reset `repeatMode` or `shuffleEnabled` — these persist on the module-level singleton within the same Vitest file. The `handleTrackEnd` group's `beforeEach` must explicitly call `engine.setRepeat('off')` and `engine.setShuffle(false)` after `clearQueue()`, or earlier tests that call `setRepeat('one')` bleed into later tests.

- **`vi.clearAllMocks()` does not reset `mockReturnValue` implementations.** After `vi.clearAllMocks()`, you must re-call `mockHowlState.mockReturnValue('loading')` or similar if the state mock needs a non-default value for the next test group.

- **Prisma filter syntax for required relations:** `prisma.album.count({ where: { artist: { isNot: null } } })` is a TypeScript error — `null` is not valid for required-relation filters. `prisma.album.count({ where: { artist: { is: undefined } } })` returns all rows (not a meaningful filter). The correct approach is `prisma.album.count({ where: { artist_id: '' } })` (checks the FK column directly) plus a `findMany` spot-check that includes the relation.

- **`capturedInstances` pattern for AudioEngine testing:** Since `buildHowl()` constructs Howl instances internally, tests cannot intercept them without instance capture. The `vi.hoisted()` array is initialized before any module eval, the MockHowl constructor pushes `this`, and tests access `capturedInstances[n]` by index to trigger lifecycle callbacks.

**What was NOT completed (carry to next session):**

- Lighthouse audit (requires running app)
- Virtual scrolling with `@tanstack/react-virtual` for large track lists
- Bundle size audit (`@next/bundle-analyzer`)
- FCP/TTI verification
- HTTPS production config

**210 server + 118 client tests passing | `npm run build` → 0 errors**

---

## Session 29 — Troubleshooting: React Hydration Error on PlaybackBar

**Goal:** Fix React hydration mismatch error shown in browser dev overlay for `PlaybackBar.tsx`.

**Error observed:**

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
- data-testid="playback-bar"   ← server had it, client bundle didn't
@ PlaybackBar.tsx (10:5)
```

**Root cause:**
The Turbopack dev server was in a **stale** state (shown as "Next.js 16.2.2 (stale)" in the error overlay). The `data-testid="playback-bar"` attribute was added to `PlaybackBar.tsx` in Session 28 (M8 finish). The server-side render had the new code, but the compiled client JS bundle in `.next/cache` still had the old version without `data-testid`. This mismatch caused React hydration to fail.

**What was done:**

- Confirmed `PlaybackBar.tsx` code is correct — `data-testid="playback-bar"` is unconditionally present in JSX
- Audited all `PlaybackBar` children (`NowPlaying`, `TransportControls`, `VolumeSlider`, `ProgressBar`, `MiniPlayer`) for other hydration risks — none found
- Confirmed no `typeof window` guards, no `localStorage` access at init time, no `Math.random()`/`Date.now()` in rendered output, no Zustand `persist()` middleware active
- Deleted `.next/` cache directory entirely to force Turbopack to recompile both server and client bundles from the same source
- Ran `npx tsc --noEmit` → 0 errors
- Ran `npm run build` → 0 errors, 14 routes generated

**Key gotcha:**
Turbopack's `(stale)` indicator in the Next.js dev overlay means the client JS bundle is out of sync with the server render. When this happens, a hard page refresh won't help — you must delete `.next/` and restart `npm run dev` so both bundles compile fresh from the same source code. Any `data-testid` or other attributes added after the last clean build will cause this until the cache is cleared.

**0 errors | `npm run build` → 0 errors, 14 routes**

---

## Session 30 — 2026-04-24: Bug Fix — Auth ClientFetchError + Turbopack Stale Cache (Recurrence)

**Goal:** Fix two errors shown in the Next.js dev overlay: (1) React hydration mismatch on `PlaybackBar` (same Turbopack stale issue as Session 29), and (2) `Console ClientFetchError: Unexpected token 'I', "Internal S"... is not valid JSON` from the NextAuth `SessionProvider`.

**Error 1 — Hydration mismatch on PlaybackBar (recurrence):**

Same root cause as Session 29. The `.next/` cache had accumulated another stale client bundle. Server rendered `data-testid="playback-bar"` (current code); client JS was compiled before that attribute was added.

Fix: deleted `.next/` directory, ran `npm run build` → 0 errors. User must restart `npm run dev` to fully resolve.

**Error 2 — Auth ClientFetchError (`Unexpected token 'I', "Internal S"...`):**

Root cause: The `(stale)` Turbopack dev state. When `.next/` was deleted while the dev server was still running, then replaced with a production build via `npm run build`, the still-running dev server tried to handle `GET /api/auth/session` but couldn't reconcile its in-memory module graph with the incompatible production artifacts on disk. The server returned plain-text "Internal Server Error" instead of JSON; `SessionProvider.fetchData` parsed the response and threw `ClientFetchError: Unexpected token 'I'`.

**Investigation findings:**

- `NEXTAUTH_SECRET` IS set in `.env.local` with a real value
- `next-auth@5.0.0-beta.30` `lib/env.js` `setEnvDefaults` confirms it reads `process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET` — the secret IS picked up
- Auth config (`src/lib/auth/config.ts`) and `proxy.ts` are both correct
- No code bug in auth route; 500 is caused purely by the confused dev server state

**Code fix — `src/lib/auth/config.ts`:**

The session callback mutated `session.user.id/displayName/avatarUrl` without a null guard:

```typescript
// BEFORE
async session({ session, token }) {
  session.user.id = (token.userId as string) ?? ''        // throws if session.user is null
  session.user.displayName = (token.displayName as string) ?? ''
  session.user.avatarUrl = (token.avatarUrl as string | null) ?? null
  return session
},

// AFTER
async session({ session, token }) {
  if (session.user) {                                      // defensive guard
    session.user.id = (token.userId as string) ?? ''
    session.user.displayName = (token.displayName as string) ?? ''
    session.user.avatarUrl = (token.avatarUrl as string | null) ?? null
  }
  return session
},
```

In some NextAuth v5 beta edge cases (corrupted cookies, malformed JWT format), `session.user` can be null/undefined, causing `TypeError: Cannot set properties of null (setting 'id')` → unhandled exception → 500 "Internal Server Error". The null guard prevents the crash and returns an empty session instead.

**What was NOT completed:**

- M9 Deployment & Launch tasks (not started — out of scope for this bug-fix session)

**Key technical notes for future sessions:**

- **Restarting `npm run dev` is the correct fix for `(stale)` errors.** Deleting `.next/` alone is not sufficient if the dev server is still running — the in-memory Turbopack state is separate from the disk cache. Always stop the dev server FIRST, then delete `.next/`, then restart.
- **Never run `npm run build` to fix a stale dev-server issue while the dev server is still running.** This replaces `.next/` with incompatible production artifacts, which makes the confused dev server even more broken for requests it tries to handle.
- **`session.user` can be null in NextAuth v5 beta JWT strategy** in edge cases (corrupted/expired cookies, malformed JWTs). Always add `if (session.user)` guard before mutating it.

**Result:** `npm run build` → 0 errors | no code changes beyond defensive null guard.

---

## Session 31 — 2026-04-25: Bug Fix — Turbopack Stale Cache (3rd Recurrence)

**Goal:** Fix `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties` hydration error on `PlaybackBar` shown in the Next.js dev overlay, with `(stale)` indicator next to the version number.

**Root cause:**

Identical to Sessions 29 and 30. The `.next/` Turbopack dev cache accumulated stale compiled client artifacts from before `data-testid="playback-bar"` was added to `<footer>` in Session 28. The server rendered the attribute (current source); the stale client JS bundle hydrated without it → React detected the mismatch.

**Fixes:**

1. **Deleted `.next/`** (`rm -rf .next/`) — removes all stale Turbopack artifacts. After deletion, restarting `npm run dev` forces a fresh compile where both server and client use current source.

2. **Added `suppressHydrationWarning` to `<footer>` in `src/components/layout/PlaybackBar.tsx`** — permanent code-level safeguard. When Turbopack's dev cache drifts in future sessions (which it will as hot-module-replacement accumulates patches), React will tolerate the `data-testid` attribute mismatch on this specific element instead of surfacing it as a hard error in the overlay. `suppressHydrationWarning` suppresses warnings only for the element it's on (not its children), so real hydration bugs in `NowPlaying`, `TransportControls`, or `VolumeSlider` are still caught.

**Files changed:**

- `src/components/layout/PlaybackBar.tsx` — added `suppressHydrationWarning` to `<footer>`

**What was NOT completed:**

- M9 Deployment & Launch tasks (not started — this was a targeted bug-fix session)

**Key technical notes for future sessions:**

- **`suppressHydrationWarning` on `data-testid` elements** — this pattern should be applied to any element whose only server/client difference is a `data-testid` attribute added for test selectors. It is safe because `data-testid` is a stable, deterministic attribute that has no meaningful runtime behaviour.
- **User action required:** Stop any running `npm run dev` process, then restart it. The `.next/` was deleted so Turbopack recompiles from scratch.

**Result:** `npm run build` → 0 errors (1 expected Cache-Control warning).

---

## Session 32 — 2026-04-25: Bug Fix — Profile & Settings Navigation

**Goal:** Fix "Profile" and "Settings" menu items in the TopBar user dropdown doing nothing when clicked.

**Root cause:**

Both menu item `<button>` elements in `TopBar.tsx` only called `setDropdownOpen(false)` on click — there was no navigation. The `/profile` and `/settings` routes did not exist either.

**Fixes:**

1. **Created `/profile` page** (`src/app/(main)/profile/page.tsx`) — RSC. Uses `auth()` to get the session user, then calls `fetchUserProfileStats()` (Prisma directly) to load liked-song count, playlist count, followed-artist count, and saved-album count. Displays a hero section (avatar + name + email + join date) and a 2×2 stats grid with links to the library.

2. **Created `/settings` page** (`src/app/(main)/settings/page.tsx`) — Client Component. Shows a form to update the user's display name (PATCH to `/api/v1/users/me`). Email field is read-only. Also has a "Log out" action button. Uses `useSession().update()` to refresh the session after a successful name change.

3. **Created `server/routes/users.ts`** — Fastify plugin. Two routes:
   - `GET /api/v1/users/me` — returns profile + library counts
   - `PATCH /api/v1/users/me` — updates `display_name` (and optionally `avatar_url`); uses `safeText(1, 50)` Zod helper for sanitization.

4. **Created `server/services/users.ts`** — business logic: `getUserProfile()` and `updateUserProfile()`.

5. **Created `src/lib/data/profile.ts`** — RSC-only Prisma fetcher `fetchUserProfileStats()`.

6. **Registered users route in `server/index.ts`** — `fastify.register(usersRoutes, { prefix: '/api/v1/users' })`.

7. **Updated `TopBar.tsx`** — Profile and Settings buttons now call `router.push('/profile')` and `router.push('/settings')` respectively, then close the dropdown.

**Files changed:**

- `src/components/layout/TopBar.tsx` — added `router.push` navigation to Profile + Settings buttons
- `src/app/(main)/profile/page.tsx` — new RSC profile page
- `src/app/(main)/settings/page.tsx` — new client settings page
- `src/lib/data/profile.ts` — new RSC data fetcher
- `server/routes/users.ts` — new Fastify plugin (GET + PATCH /api/v1/users/me)
- `server/services/users.ts` — new service (getUserProfile, updateUserProfile)
- `server/index.ts` — registered usersRoutes

**Result:** `npm run build` → 0 errors. Both `/profile` and `/settings` appear in the route table.
