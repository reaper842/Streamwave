# Changelog

All notable changes to StreamWave are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-05-30

Initial production release of StreamWave — a web-based music streaming platform built with Next.js 16, Fastify 5, PostgreSQL 16, Redis 7, and Meilisearch 1.6.

### Added

#### Authentication (M2)

- Email/password registration and login with bcrypt (cost 12) password hashing
- Google OAuth and GitHub OAuth via NextAuth.js v5 (Credentials + OAuth providers)
- JWT sessions — 15-minute access tokens, 7-day refresh tokens, HttpOnly secure cookies
- Password reset via email (request → token → confirm)
- Redis-backed rate limiting: 5 failed login attempts per IP per 15-minute window → 429
- Session persistence with auto-refresh across page reloads

#### Audio Playback (M3)

- Play, pause, resume, seek, volume control, and mute via Howler.js singleton (`AudioEngine`)
- Full queue management — add, remove, reorder, clear
- Shuffle mode with full randomized order generation; re-shuffle on repeat-all cycle
- Repeat modes: off, repeat-all (loop queue), repeat-one (loop current track)
- Gapless pre-buffering — loads next track 10 s before current ends for seamless transitions
- Media Session API — OS-level transport controls (play/pause/skip/seek from lock screen / headphones)
- Playback persists across client-side navigation (singleton above the router)
- Keyboard shortcuts: Space (play/pause), ←/→ (seek ±5 s), ↑/↓ (volume ±5%), Shift+←/→ (prev/next)
- Queue panel (fixed right sidebar) with drag-to-reorder and click-to-play for upcoming tracks
- "Clear queue" button resets all queue and playback state

#### Content Pages (M4)

- Home page — featured playlists, new releases, genre browse grid with time-of-day greeting
- Artist page — hero banner, top tracks (up to 10), full discography
- Album page — cover art hero, full track list, total duration
- Playlist page — cover art hero, track list, owner info, total duration
- All pages fetch data via Prisma directly in React Server Components (no loopback HTTP)

#### Search & Discovery (M6)

- Real-time debounced search (300 ms) across tracks, artists, albums, and playlists
- Meilisearch-backed with typo tolerance (2 typos) and Redis result cache (60-second TTL)
- Categorized results: Top Result hero card, Songs rows, Artists/Albums/Playlists horizontal scroll
- Genre browse grid — colored cards linking to genre-filtered result pages
- Search history persisted to `localStorage`, max 10 entries, "Clear all" button

#### Library & Playlist Management (M5)

- Liked Songs — like/unlike tracks with optimistic toggle; dedicated page with play/shuffle buttons
- Saved Albums — save/unsave albums; Library Albums tab with instant updates
- Followed Artists — follow/unfollow artists; Sidebar "Following" section with recent releases notification bell
- Playlist CRUD — create, rename, edit description, delete with confirmation dialog
- Playlist track management — add (via context menu), remove, drag-to-reorder
- "Add to Playlist" submenu in context menus for tracks across all pages
- Library page with tabbed view (Playlists / Artists / Albums)
- Sidebar shows user playlists + Liked Songs, create playlist with "+" button

#### UI/UX (M1, M7)

- Pixel-perfect Spotify dark-theme design — `#121212` background, `#1DB954` accent
- Four fixed layout regions: Sidebar, TopBar, Main Content, Playback Bar (never unmounts)
- Sidebar: 280 px expanded → 72 px icon-only at < 1200 px → hidden at < 900 px
- Mobile layout (< 640 px): mini-player bar above bottom tab navigation (Home/Search/Library)
- Loading skeletons for all pages matching exact component dimensions
- Error boundary with "Try again" button; 404 page
- Empty states for Liked Songs, playlists, Library tabs, Artists/Albums tabs
- Context menus (right-click and three-dot) for tracks, albums, artists, playlists
- Toast notifications — bottom-center, 3-second auto-dismiss
- Modal dialogs with focus trap and ESC-to-close

#### Account & Settings (Sessions 32–39)

- Profile page — gradient hero, avatar, stats (liked songs, playlists, following, saved albums)
- Settings page — display name edit (saved instantly via API + session refresh), linked sections
- Notification preferences page — 4 toggles (new releases, playlist activity, account security, product updates) with optimistic updates
- Account tab bar to navigate between Profile and Settings directly

#### Admin Dashboard (Session 72)

- Admin-only panel at `/admin` (gated by JWT `is_admin` field + DB guard on every API call)
- Dashboard stats — user, artist, album, track, and playlist counts
- Track management — paginated list, create/edit with artist→album cascade dropdowns, delete
- Playlist management — paginated list, create/edit, track add/remove side panel

#### API (M2–M6, M8)

- REST JSON API at `/api/v1/` — 35+ endpoints with Zod validation on all request/response bodies
- Structured request logging — `requestId`, `userId`, `method`, `url`, `statusCode`, `responseTime`
- Dual liveness/readiness health endpoints: `GET /health` (always 200) and `GET /api/v1/health` (checks Postgres + Redis + Meilisearch)
- Input sanitization via `safeText(min, max)` Zod helper (trim + strip HTML tags)
- CORS explicitly configured for all HTTP methods including OPTIONS preflight

#### Security (M8)

- HTTPS enforced via HSTS header (`max-age=63072000; includeSubDomains; preload`)
- Content Security Policy — `default-src 'self'`, locked-down `script-src`, `img-src`, `media-src`, `connect-src`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store` on all `/api/*` routes to prevent CDN caching of auth responses
- HttpOnly, Secure, SameSite=Lax cookies; cross-subdomain `COOKIE_DOMAIN` support
- OWASP Top 10 audit — Prisma parameterized queries (SQL injection), React JSX escaping + CSP (XSS), SameSite cookies (CSRF)

#### Infrastructure & Deployment (M9)

- Multi-stage Docker builds — `Dockerfile` (Next.js standalone) + `Dockerfile.server` (Fastify with `tsx`)
- `docker-compose.prod.yml` — full production stack (Next.js, Fastify, PostgreSQL, Redis, Meilisearch)
- Cloudflare Tunnel integration — no open router ports; HTTPS termination at the Cloudflare edge
- `deploy.sh` — subcommands: `deploy` (git pull + build + migrate + restart), `migrate`, `seed`, `logs`, `status`, `restart`
- GitHub Actions CI: `ci.yml` (lint + type-check + tests + build), `e2e.yml` (Docker + Playwright), `deploy.yml` workflow stub
- Production `Cache-Control` headers for static assets; `no-store` on API routes
- Prisma migrations tracked in git; `prisma migrate deploy` in production (non-interactive)

#### Testing (M2d, M8)

- 219 server-side integration tests (Vitest + Supertest) — auth, library, playlists, search, content, admin, users, notifications
- 129 client-side unit tests (Vitest) — AudioEngine, usePlayerStore, useLibraryStore, useSearchStore
- 5 Playwright e2e test suites — auth, playback, search, library, responsive layout
- Test factory `buildApp()` isolates rate-limiting for parallel test execution

### Fixed (Notable Bugs)

- **Turbopack stale dev cache** — `Cache-Control: immutable` and `max-age=86400` rules in `next.config.ts` now apply in production only; `npm run dev:clean` added to clear the server-side Turbopack disk cache
- **Howler.js repeat modes** — `repeat-one` uses `playAtIndex` (fresh Howl) instead of `seek+play` on an ended html5 audio element; `repeat-all` deferred via `queueMicrotask` to avoid corrupting Howler internal state
- **Zustand selector pattern** — all toggle buttons (like, save, follow) use `s.mySet.has(id)` direct boolean selectors, not function references, to trigger re-renders
- **CORS preflight for DELETE/PUT/PATCH** — `@fastify/cors` configured with explicit `methods` array; avoids `TypeError: Failed to fetch` on non-simple HTTP methods
- **Fastify strict JSON parser** — replaced default parser with lenient version that returns `null` for empty bodies, resolving bodyless POST/DELETE 400 errors
- **Queue click-to-play silent audio** — `buildHowl` `onend` now guards with `if (this.howl === howl)` to prevent a Howler-internal data URI `ended` event from advancing the queue
- **TrackRow 1-song queue** — `TrackList` now passes `allTrackIds` to each `TrackRow`; `handlePlay` uses `playFromTrackIds` to build full album/playlist queue, fixing repeat-all appearing broken
- **`addToQueue` empty stream URL** — context-menu "Add to queue" uses `addTrackToQueue(trackId)` which fetches the signed stream URL before enqueueing
- **Cloudflare caching error responses** — explicit `Cache-Control: no-store` on `/api/*` routes prevents CDN from caching auth 500 errors for 24 hours
- **NextAuth UntrustedHost** — `trustHost: true` required behind Cloudflare Tunnel (reverse proxy)
- **ESM import hoisting** — `server/load-env.ts` is the first import in `server/index.ts`; dotenv loads before any module eval that reads `process.env`
- **`token.sub` fallback** — session callback uses `token.userId || token.sub || ''` (`||` not `??`) so empty-string userId falls through to `token.sub`
- **NextAuth `update()` trigger** — jwt callback includes `trigger === 'update'` branch to propagate display name changes without a re-sign-in
