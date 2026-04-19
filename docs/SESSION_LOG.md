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
